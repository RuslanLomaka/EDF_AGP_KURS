// Article list: topic filter, foldable class days, search over title, keywords, summary and full text.
// The full texts are a separate file, loaded on the first search only.
(function () {
  const daten = JSON.parse(document.getElementById('daten').textContent);
  const feld = document.getElementById('suche');
  const liste = document.getElementById('liste');
  const zahl = document.getElementById('anzahl');
  const chips = document.getElementById('themen');

  // Same transform for text and query: lower case, umlauts and their ae/oe/ue spellings folded
  // together, so "abzuge", "abzüge" and "abzuege" all find "Abzüge".
  const norm = s => s.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const artikel = daten.artikel.map(a => ({
    ...a, t: norm(a.title), s: norm(a.stichwoerter.join(' ')), k: norm(a.kurz), text: '', x: '',
  }));
  let volltext = 'offen'; // offen -> laedt -> da | fehler
  function ladeVolltext() {
    if (volltext !== 'offen') return;
    volltext = 'laedt';
    fetch(daten.volltext).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(texte => {
      for (const a of artikel) { a.text = texte[a.url] || ''; a.x = norm(a.text); }
      volltext = 'da';
      zeige();
    }).catch(() => { volltext = 'fehler'; });
  }

  const markiere = (s, begriffe) => s.split(/(\s+)/).map(w =>
    begriffe.some(b => norm(w).includes(b)) ? '<mark>' + esc(w) + '</mark>' : esc(w)).join('');
  const ausschnitt = (text, begriffe) => {
    const w = text.split(/\s+/);
    const i = w.findIndex(x => begriffe.some(b => norm(x).includes(b)));
    if (i < 0) return '';
    const von = Math.max(0, i - 10), bis = Math.min(w.length, i + 14);
    return (von > 0 ? '… ' : '') + markiere(w.slice(von, bis).join(' '), begriffe) + (bis < w.length ? ' …' : '');
  };
  const badge = a => ' <span class="badge">' + esc(a.thema) + '</span>';

  let thema = new URLSearchParams(location.search).get('thema') || '';
  if (!daten.themen.includes(thema)) thema = '';
  feld.value = new URLSearchParams(location.search).get('q') || '';

  function tage(treffer, alleOffen) {
    let html = '', tag = null, n = 0, offen = 0;
    const schliessen = () => { if (tag !== null) html += tag ? '</ul></details>' : '</ul>'; };
    for (const a of treffer) {
      if (a.datum !== tag) {
        schliessen();
        tag = a.datum;
        n = treffer.filter(b => b.datum === tag).length;
        const auf = alleOffen || offen < 2;
        if (!tag) {
          html += '<ul class="liste">'; // undated articles: no date label at all
        } else {
          if (auf) offen++;
          html += '<details class="tag"' + (auf ? ' open' : '') + '><summary>' + esc(a.datumLang)
            + ' <span class="zahl">(' + n + ')</span></summary><ul class="liste">';
        }
      }
      html += '<li><a href="' + a.url + '">' + esc(a.title) + '</a>' + (thema ? '' : badge(a)) + '</li>';
    }
    schliessen();
    return html;
  }

  function zeige() {
    const begriffe = norm(feld.value).split(/\s+/).filter(Boolean);
    if (begriffe.length) ladeVolltext();
    const treffer = [];
    for (const a of artikel) {
      if (thema && a.thema !== thema) continue;
      let punkte = 0;
      const alle = begriffe.every(b => {
        const p = (a.t.includes(b) ? 5 : 0) + (a.s.includes(b) ? 3 : 0) + (a.k.includes(b) ? 2 : 0) + (a.x.includes(b) ? 1 : 0);
        punkte += p;
        return p > 0;
      });
      if (alle) treffer.push({ a, punkte });
    }
    zahl.textContent = (treffer.length === 1 ? '1 Artikel' : treffer.length + ' Artikel')
      + (begriffe.length ? ' gefunden' : '') + (thema ? ' zum Thema „' + thema + '“' : '')
      + (begriffe.length && volltext === 'laedt' ? ' – Volltext wird geladen …' : '');
    if (!treffer.length) {
      liste.innerHTML = '<p class="empty">Nichts gefunden. Versuchen Sie ein anderes Wort.</p>';
    } else if (begriffe.length) {
      treffer.sort((p, q) => q.punkte - p.punkte);
      liste.innerHTML = '<ul class="liste">' + treffer.map(({ a }) => {
        const imText = !begriffe.every(b => (a.t + ' ' + a.k).includes(b));
        return '<li><a href="' + a.url + '">' + markiere(a.title, begriffe) + '</a>' + badge(a)
          + '<br><span class="hinweis">' + markiere(a.kurz, begriffe) + '</span>'
          + (imText && a.text ? '<br><span class="snippet">' + ausschnitt(a.text, begriffe) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    } else {
      liste.innerHTML = tage(treffer.map(t => t.a), Boolean(thema));
    }
    const params = new URLSearchParams();
    if (feld.value.trim()) params.set('q', feld.value.trim());
    if (thema) params.set('thema', thema);
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
  }

  // the server renders the topics as links to topic pages; with JavaScript they become filter buttons
  chips.innerHTML = ['', ...daten.themen].map(t => {
    const n = t ? artikel.filter(a => a.thema === t).length : artikel.length;
    return '<li><button type="button" data-thema="' + esc(t) + '" aria-pressed="' + (t === thema) + '">'
      + (t ? esc(t) : 'Alle Themen') + ' (' + n + ')</button></li>';
  }).join('');
  chips.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    thema = b.dataset.thema;
    chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    zeige();
  });
  let warte;
  feld.addEventListener('input', () => { clearTimeout(warte); warte = setTimeout(zeige, 150); });
  zeige();
})();
