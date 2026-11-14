// Read glossary words aloud. First choice: the MP3 rendered by Piper during the build (served from our own
// server). Fallback: a German voice that runs locally on the visitor's device; voices that work over the
// internet are never used, so no text leaves the browser. Buttons stay hidden if neither is available.
(function () {
  const knoepfe = [...document.querySelectorAll('button.vorlesen')];
  if (!knoepfe.length) return;
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let stimme = null;
  let audio = null;

  const findeStimme = () => {
    if (!synth) return null;
    return synth.getVoices().find(v => /^de([-_]|$)/i.test(v.lang) && v.localService) || null;
  };
  const anzeigen = () => {
    stimme = findeStimme();
    knoepfe.forEach(b => { b.hidden = !(b.dataset.audio || stimme); });
  };
  const fertig = () => knoepfe.forEach(b => b.classList.remove('spielt'));
  const stopp = () => {
    if (audio) { audio.pause(); audio = null; }
    if (synth) synth.cancel();
    fertig();
  };
  const browserStimme = b => {
    if (!stimme) { fertig(); return; }
    const u = new SpeechSynthesisUtterance(b.dataset.text);
    u.lang = stimme.lang;
    u.voice = stimme;
    u.rate = 0.9;
    u.onend = fertig;
    u.onerror = fertig;
    b.classList.add('spielt');
    synth.speak(u);
  };
  const sprich = b => {
    stopp();
    b.classList.add('spielt');
    if (!b.dataset.audio) { browserStimme(b); return; }
    audio = new Audio(b.dataset.audio);
    audio.addEventListener('ended', fertig);
    audio.play().catch(() => browserStimme(b)); // e.g. file missing: try the device's own voice
  };

  knoepfe.forEach(b => b.addEventListener('click', () => sprich(b)));
  anzeigen();
  if (synth) synth.addEventListener('voiceschanged', anzeigen);
})();

// Read whole sections aloud (articles and lessons): a speaker button at every section heading. Only a German voice
// that runs on the visitor's own device is used, so no text leaves the browser; without one, no buttons appear.
// Teacher notes, exercises and pictures are skipped. Tap again to stop.
(function () {
  const inhalt = document.querySelector('article.inhalt');
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  if (!inhalt || !synth) return;
  const AUSLASSEN = ['woerter', 'fragen', 'quellen', 'hilfe'];
  const ueberschriften = [...inhalt.querySelectorAll(':scope > h2[id]')].filter(h => !AUSLASSEN.includes(h.id));
  if (!ueberschriften.length) return;
  const OHNE = '.notiz, .uebung, .bild, .kopieren, .abschnitt-fertig, .ue-geloest, script, style, button, details > :not(summary)';
  const ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" '
    + 'd="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 '
    + '0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  let stimme = null, aktiv = null;

  const textVon = h => {
    const teile = [h.textContent.replace(/^\s*[\d?]+\s+/, '').trim() + '.'];
    for (let el = h.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
      if (el.matches(OHNE)) continue;
      const kopie = el.cloneNode(true);
      kopie.querySelectorAll(OHNE).forEach(x => x.remove());
      kopie.querySelectorAll('li, p, tr, dt, dd, summary, h3').forEach(x => x.append(' . '));
      teile.push(kopie.textContent);
    }
    return teile.join(' ').replace(/\s+/g, ' ').replace(/(\s\.)+/g, '.').replace(/\.\./g, '.').trim();
  };
  // short pieces: some browsers stop long utterances after a few hundred characters
  const stuecke = text => {
    const saetze = text.match(/[^.!?…]+[.!?…]*/g) || [text];
    const raus = [];
    let s = '';
    saetze.forEach(x => {
      if ((s + x).length > 220 && s) { raus.push(s); s = ''; }
      s += x;
    });
    if (s.trim()) raus.push(s);
    return raus;
  };
  const stopp = () => {
    synth.cancel();
    if (aktiv) { aktiv.classList.remove('spielt'); aktiv.setAttribute('aria-pressed', 'false'); }
    aktiv = null;
  };
  const knoepfe = ueberschriften.map(h => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vorlesen abschnitt-vorlesen';
    b.hidden = true;
    b.innerHTML = ICON;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Abschnitt vorlesen');
    b.title = 'Abschnitt vorlesen';
    b.addEventListener('click', () => {
      const war = aktiv === b;
      stopp();
      if (war || !stimme) return;
      aktiv = b;
      b.classList.add('spielt');
      b.setAttribute('aria-pressed', 'true');
      const liste = stuecke(textVon(h));
      liste.forEach((t, i) => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = stimme.lang;
        u.voice = stimme;
        u.rate = 0.9;
        if (i === liste.length - 1) u.onend = () => { if (aktiv === b) stopp(); };
        synth.speak(u);
      });
    });
    h.append(' ', b);
    return b;
  });
  const anzeigen = () => {
    stimme = synth.getVoices().find(v => /^de([-_]|$)/i.test(v.lang) && v.localService) || null;
    knoepfe.forEach(b => { b.hidden = !stimme; });
  };
  anzeigen();
  synth.addEventListener('voiceschanged', anzeigen);
  window.addEventListener('pagehide', stopp);
})();
