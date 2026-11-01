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
