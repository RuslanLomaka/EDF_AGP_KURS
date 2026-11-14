// Example prompts ('::: prompt' boxes): a button copies the prompt, so nobody has to type it.
(function () {
  document.querySelectorAll('.prompt, .vorlage').forEach(box => {
    const text = box.innerText.trim();
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'kopieren';
    knopf.textContent = 'Kopieren';
    knopf.addEventListener('click', () => {
      const fertig = () => { knopf.textContent = 'Kopiert ✓'; setTimeout(() => { knopf.textContent = 'Kopieren'; }, 2000); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(fertig, () => { knopf.textContent = 'Bitte markieren und kopieren'; });
      } else {
        const r = document.createRange();
        r.selectNodeContents(box.firstElementChild || box);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        knopf.textContent = 'Markiert – jetzt Strg + C';
      }
    });
    box.append(knopf);
  });
})();

// Lesson progress, per section: ticked steps, solved exercises, the test, and an "Abschnitt erledigt" button
// for sections without any of these. Kept only in this browser (localStorage, keyed by section and text, so
// editing a lesson does not move ticks). The bar at the top shows the section on the screen and the whole lesson;
// the quick navigation shows a ring per section that turns green when it is done.
(function () {
  const box = document.querySelector('.fortschritt');
  const inhalt = document.querySelector('.inhalt.lektion');
  if (!box || !inhalt) return;
  const speicher = 'lektion-v2:' + box.dataset.lektion;
  const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.codePointAt(0)) >>> 0; return h.toString(36); };
  let erledigt = new Set();
  try { erledigt = new Set(JSON.parse(localStorage.getItem(speicher) || '[]')); } catch (e) { /* storage unavailable */ }
  const speichern = () => { try { localStorage.setItem(speicher, JSON.stringify([...erledigt])); } catch (e) { /* ignore */ } };

  // sections: every h2 of the lesson, plus the test below it
  const ohneNr = h => [...h.childNodes].filter(n => !(n.classList && n.classList.contains('nr'))).map(n => n.textContent).join('').trim();
  const abschnitte = [...inhalt.querySelectorAll(':scope > h2[id]')].map(h => ({ id: h.id, h, posten: [] }));
  const quizH2 = document.getElementById('quiz');
  if (quizH2) abschnitte.push({ id: 'quiz', h: quizH2, posten: [] });
  abschnitte.forEach(a => {
    a.nr = (a.h.querySelector('.nr') || {}).textContent || '';
    a.titel = ohneNr(a.h);
  });
  const abschnittVon = el => {
    let gefunden = null;
    for (const a of abschnitte) if (a.h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) gefunden = a;
    return gefunden;
  };
  const zaehlt = a => a && a.id !== 'hilfe';

  // 1. steps: the whole card is the label, so tapping the text ticks the step
  inhalt.querySelectorAll('.schritte li').forEach(li => {
    const a = abschnittVon(li);
    if (!zaehlt(a)) return;
    const key = a.id + ':' + hash(li.textContent.replace(/\s+/g, ' ').trim());
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'haken';
    label.append(cb, ...li.childNodes);
    li.append(label);
    const zeige = () => { cb.checked = erledigt.has(key); li.classList.toggle('erledigt', cb.checked); };
    cb.addEventListener('change', () => { cb.checked ? erledigt.add(key) : erledigt.delete(key); speichern(); zeige(); anzeigen(); });
    a.posten.push({ key, zeige });
  });

  // 2. exercises: solved once = done (they can always be played again)
  const zaehler = {};
  inhalt.querySelectorAll('.uebung').forEach(ue => {
    const a = abschnittVon(ue);
    if (!zaehlt(a)) return;
    zaehler[a.id] = (zaehler[a.id] || 0) + 1;
    const key = 'ue:' + a.id + ':' + zaehler[a.id];
    const marke = document.createElement('span');
    marke.className = 'ue-geloest';
    marke.textContent = 'gelöst ✓';
    ue.querySelector('.ue-kopf').append(marke);
    const zeige = () => { marke.hidden = !erledigt.has(key); };
    ue.addEventListener('uebung-geloest', () => { erledigt.add(key); speichern(); zeige(); anzeigen(); });
    a.posten.push({ key, zeige });
  });

  // 3. the test: done when it has been evaluated once
  if (quizH2) {
    const a = abschnitte[abschnitte.length - 1];
    document.addEventListener('quiz-fertig', () => { erledigt.add('quiz'); speichern(); anzeigen(); });
    a.posten.push({ key: 'quiz', zeige: () => {} });
  }

  // 4. sections without anything to tick get a button at their end
  abschnitte.forEach((a, i) => {
    if (!zaehlt(a) || a.posten.length) return;
    const key = 'fertig:' + a.id;
    const p = document.createElement('p');
    p.className = 'abschnitt-fertig';
    const knopf = document.createElement('button');
    knopf.type = 'button';
    p.append(knopf);
    const folgt = abschnitte.slice(i + 1).find(zaehlt);
    const naechster = abschnitte[i + 1] && abschnitte[i + 1].h.parentElement === inhalt ? abschnitte[i + 1].h : null;
    inhalt.insertBefore(p, naechster);
    const zeige = () => {
      const an = erledigt.has(key);
      knopf.setAttribute('aria-pressed', String(an));
      knopf.textContent = an ? 'Erledigt ✓' : '✓ Geschafft' + (folgt ? ' – weiter zu ' + folgt.nr : '');
      knopf.title = an ? 'Noch einmal tippen: wieder als offen markieren' : '';
    };
    knopf.addEventListener('click', () => {
      const an = !erledigt.has(key);
      an ? erledigt.add(key) : erledigt.delete(key);
      speichern(); zeige(); anzeigen();
      if (an && folgt) setTimeout(() => folgt.h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 350);
    });
    a.posten.push({ key, zeige });
  });

  const nav = document.querySelector('.schnellnav');
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  const fsNr = box.querySelector('.fs-nr'), fsTitel = box.querySelector('.fs-titel'), fsZahl = box.querySelector('.fs-zahl');
  const balken = box.querySelector('.balken span'), gesamtText = box.querySelector('.zahl');
  let aktiv = abschnitte[0];

  const stand = a => {
    const n = a.posten.length, fertig = a.posten.filter(p => erledigt.has(p.key)).length;
    return { n, fertig };
  };
  function anzeigen() {
    let n = 0, fertig = 0;
    abschnitte.forEach(a => {
      const s = stand(a);
      n += s.n;
      fertig += s.fertig;
      const link = links.find(l => l.hash.slice(1) === a.id);
      if (!link || !s.n) return;
      link.style.setProperty('--p', Math.round(100 * s.fertig / s.n));
      link.classList.toggle('fertig', s.fertig === s.n);
      link.title = a.titel + ' – ' + s.fertig + ' von ' + s.n + ' erledigt';
    });
    const s = stand(aktiv);
    fsNr.textContent = aktiv.nr;
    fsTitel.textContent = aktiv.titel;
    fsZahl.textContent = s.n ? s.fertig + ' von ' + s.n + (s.n === 1 ? ' Aufgabe' : ' Aufgaben') + (s.fertig === s.n ? ' ✓' : '') : '';
    balken.style.width = (s.n ? 100 * s.fertig / s.n : 0) + '%';
    gesamtText.textContent = 'Ganze Lektion: ' + fertig + ' von ' + n + ' Aufgaben erledigt' + (n && fertig === n ? ' – alles gesammelt!' : '');
    // short summary for "Weiter bei Abschnitt n" on the start page and the lesson list
    const weiter = abschnitte.find(a => { const x = stand(a); return x.n && x.fertig < x.n; });
    try {
      if (fertig) localStorage.setItem('lektion-stand:' + box.dataset.lektion,
        JSON.stringify({ fertig, n, nr: weiter ? weiter.nr : '', id: weiter ? weiter.id : '' }));
      else localStorage.removeItem('lektion-stand:' + box.dataset.lektion);
    } catch (e) { /* storage unavailable */ }
  }

  // the section on the screen: the last heading above the upper third
  const setzeAktiv = () => {
    const grenze = window.innerHeight * 0.3;
    let neu = abschnitte[0];
    for (const a of abschnitte) {
      if (a.h.getBoundingClientRect().top <= grenze) neu = a;
      else break;
    }
    if (neu === aktiv && box.dataset.bereit) return;
    aktiv = neu;
    box.dataset.bereit = 'ja';
    box.dataset.nr = aktiv.nr;  // for the Hilfe-Ampel
    links.forEach(l => {
      if (l.hash.slice(1) !== aktiv.id) { l.removeAttribute('aria-current'); return; }
      l.setAttribute('aria-current', 'true');
      const liste = nav.querySelector('ol');
      if (liste.scrollWidth > liste.clientWidth) {  // phone bar: keep the active number in view
        const li = l.parentElement;
        liste.scrollTo({ left: li.offsetLeft - liste.offsetLeft - (liste.clientWidth - li.offsetWidth) / 2, behavior: 'smooth' });
      }
    });
    anzeigen();
  };
  let geplant = false;
  window.addEventListener('scroll', () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; setzeAktiv(); });
  }, { passive: true });

  const reset = document.querySelector('.reset');
  if (reset) {
    reset.addEventListener('click', () => {
      if (!window.confirm('Den ganzen Fortschritt in dieser Lektion zurücksetzen?')) return;
      erledigt.clear();
      speichern();
      try { localStorage.removeItem('lektion-stand:' + box.dataset.lektion); } catch (e) { /* ignore */ }
      abschnitte.forEach(a => a.posten.forEach(p => p.zeige()));
      anzeigen();
    });
    reset.parentElement.hidden = false;
  }
  abschnitte.forEach(a => a.posten.forEach(p => p.zeige()));
  box.hidden = false;
  const legende = document.querySelector('.fs-legende');
  if (legende) legende.hidden = false;
  setzeAktiv();
})();

// Hilfe-Ampel: one tap turns the whole screen green ("7 ✓ fertig") or red ("7 ? Hilfe"). Learners hold up their
// phone, and the teacher sees at a glance who is stuck. Nothing is stored or sent.
(function () {
  const knopf = document.querySelector('.ampel-knopf');
  if (!knopf) return;
  const el = (tag, klasse, text) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  };
  const nummer = () => {
    const box = document.querySelector('.fortschritt');
    const aktiv = document.querySelector('.schnellnav a[aria-current="true"] .nr');
    return (box && box.dataset.nr) || (aktiv ? aktiv.textContent : '');
  };
  const ampel = el('div', 'ampel');
  ampel.setAttribute('role', 'dialog');
  ampel.setAttribute('aria-modal', 'true');
  ampel.setAttribute('aria-label', 'Hilfe-Ampel');
  ampel.hidden = true;
  const wahl = el('div', 'ampel-wahl');
  const frage = el('p', 'ampel-frage');
  const gruen = el('button', 'ampel-gruen', '✓ Ich bin fertig');
  const rot = el('button', 'ampel-rot', '? Ich brauche Hilfe');
  const zu = el('button', 'ampel-zu', 'Schließen');
  [gruen, rot, zu].forEach(b => { b.type = 'button'; });
  wahl.append(frage, gruen, rot, zu);
  const anzeige = el('button', 'ampel-anzeige');
  anzeige.type = 'button';
  ampel.append(wahl, anzeige);
  document.body.append(ampel);

  const schliessen = () => {
    ampel.hidden = true;
    ampel.className = 'ampel';
    document.documentElement.classList.remove('ampel-offen');
    knopf.focus();
  };
  const zeige = farbe => {
    const nr = nummer();
    ampel.className = 'ampel ' + farbe;
    anzeige.textContent = '';
    anzeige.append(el('span', 'ampel-nr', nr || (farbe === 'gruen' ? '✓' : '?')),
      el('span', 'ampel-wort', farbe === 'gruen' ? '✓ fertig' : '? Hilfe'),
      el('span', 'ampel-tipp', 'Handy hochhalten. Tippen zum Schließen.'));
    anzeige.setAttribute('aria-label', (farbe === 'gruen' ? 'Fertig' : 'Hilfe') + (nr ? ' bei Abschnitt ' + nr : '') + '. Tippen zum Schließen.');
    anzeige.focus();
  };
  knopf.addEventListener('click', () => {
    const nr = nummer();
    frage.textContent = (nr ? 'Abschnitt ' + nr + ': ' : '') + 'Wie geht es Ihnen?';
    ampel.className = 'ampel';
    ampel.hidden = false;
    document.documentElement.classList.add('ampel-offen');
    gruen.focus();
  });
  gruen.addEventListener('click', () => zeige('gruen'));
  rot.addEventListener('click', () => zeige('rot'));
  zu.addEventListener('click', schliessen);
  anzeige.addEventListener('click', schliessen);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ampel.hidden) schliessen(); });
  knopf.hidden = false;
})();
