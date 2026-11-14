// Gentle animations: content below the first screen slides in when it scrolls into view.
// Also a small confetti helper for quizzes and exercises. Nothing happens with "reduce motion".
(function () {
  const ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.kursKonfetti = function (ziel) {
    if (ruhig || !ziel) return;
    const box = document.createElement('div');
    box.className = 'konfetti';
    box.setAttribute('aria-hidden', 'true');
    const farben = ['#4338ca', '#7c3aed', '#db2777', '#f59e0b', '#16a34a', '#0ea5e9'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = farben[i % farben.length];
      s.style.animationDelay = (Math.random() * 0.3) + 's';
      s.style.animationDuration = (1.2 + Math.random() * 0.9) + 's';
      s.style.setProperty('--x', Math.round(Math.random() * 80 - 40) + 'px');
      s.style.setProperty('--dreh', Math.round(Math.random() * 720 - 360) + 'deg');
      box.append(s);
    }
    ziel.append(box);
    setTimeout(() => box.remove(), 2600);
  };

  if (ruhig || !('IntersectionObserver' in window)) return;
  const auswahl = 'main .bild, main .card, main .bereich, main .kurz, main .info, main .achtung, main .ergaenzung, ' +
    'main .uebung, main .prompt, main .profi, main .liste, main table, main .schritte li, main .blaettern a, main dl';
  // only what is still below the first screen: nothing visible ever disappears
  const unten = [...document.querySelectorAll(auswahl)].filter(e => e.getBoundingClientRect().top > window.innerHeight);
  if (!unten.length) return;
  const io = new IntersectionObserver(eintraege => eintraege.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('sichtbar');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -6% 0px' });
  unten.forEach(e => { e.classList.add('einblenden'); io.observe(e); });
})();
