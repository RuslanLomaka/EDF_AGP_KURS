// Article list: search over title, keywords and full text, topic filter, grouped by class day.
(function () {
  const { artikel, themen } = JSON.parse(document.getElementById('daten').textContent);
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
  const markiere = (s, begriffe) => s.split(/(\s+)/).map(w =>
    begriffe.some(b => norm(w).includes(b)) ? '<mark>' + esc(w) + '</mark>' : esc(w)).join('');
  const ausschnitt = (text, begriffe) => {
    const w = text.split(/\s+/);
    const i = w.findIndex(x => begriffe.some(b => norm(x).includes(b)));
    if (i < 0) return '';
    const von = Math.max(0, i - 10), bis = Math.min(w.length, i + 14);
    return (von > 0 ? '… ' : '') + markiere(w.slice(von, bis).join(' '), begriffe) + (bis < w.length ? ' …' : '');
  };
  const eintrag = (a, begriffe) => {
    const imText = begriffe.length && !begriffe.every(b => norm(a.title + ' ' + a.kurz).includes(b));
    return '<li><a href="' + a.url + '">' + markiere(a.title, begriffe) + '</a> <span class="badge">' + esc(a.thema) + '</span>'
      + '<br><span class="hinweis">' + markiere(a.kurz, begriffe) + '</span>'
      + (imText ? '<br><span class="snippet">' + ausschnitt(a.text, begriffe) + '</span>' : '') + '</li>';
  };

  let thema = new URLSearchParams(location.search).get('thema') || '';
  if (!themen.includes(thema)) thema = '';
  feld.value = new URLSearchParams(location.search).get('q') || '';

  function zeige() {
    const begriffe = norm(feld.value).split(/\s+/).filter(Boolean);
    const treffer = [];
    for (const a of artikel) {
      if (thema && a.thema !== thema) continue;
      const t = norm(a.title), s = norm(a.stichwoerter.join(' ')), k = norm(a.kurz), x = norm(a.text);
      let punkte = 0;
      const alle = begriffe.every(b => {
        const p = (t.includes(b) ? 5 : 0) + (s.includes(b) ? 3 : 0) + (k.includes(b) ? 2 : 0) + (x.includes(b) ? 1 : 0);
        punkte += p;
        return p > 0;
      });
      if (alle) treffer.push({ a, punkte });
    }
    zahl.textContent = (treffer.length === 1 ? '1 Artikel' : treffer.length + ' Artikel')
      + (begriffe.length ? ' gefunden' : '') + (thema ? ' zum Thema „' + thema + '“' : '');
    if (!treffer.length) {
      liste.innerHTML = '<p class="empty">Nichts gefunden. Versuchen Sie ein anderes Wort.</p>';
    } else if (begriffe.length) {
      // search: best matches first
      treffer.sort((x, y) => y.punkte - x.punkte);
      liste.innerHTML = '<ul class="liste">' + treffer.map(t => eintrag(t.a, begriffe)).join('') + '</ul>';
    } else {
      // browsing: grouped by class day, newest first
      let html = '', tag = null;
      for (const { a } of treffer) {
        if (a.datum !== tag) {
          if (tag !== null) html += '</ul>';
          tag = a.datum;
          html += '<h2 class="tag">' + esc(a.datumLang || 'Ohne Datum') + '</h2><ul class="liste">';
        }
        html += eintrag(a, []);
      }
      liste.innerHTML = html + '</ul>';
    }
    const params = new URLSearchParams();
    if (feld.value.trim()) params.set('q', feld.value.trim());
    if (thema) params.set('thema', thema);
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
  }

  chips.innerHTML = ['', ...themen].map(t => {
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
  feld.addEventListener('input', zeige);
  zeige();
})();
