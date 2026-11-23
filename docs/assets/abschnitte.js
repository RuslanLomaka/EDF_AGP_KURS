// Every page with a quick navigation (lessons, numbered articles): on phones the bar of numbers sits at the bottom
// and can have several rows. The page keeps exactly that much room below its end, so the last lines and the footer
// never hide behind the bar.
(function () {
  const nav = document.querySelector('.schnellnav');
  if (!nav) return;
  const merke = () => document.documentElement.style.setProperty('--schnellnav-h', Math.ceil(nav.getBoundingClientRect().height) + 'px');
  if ('ResizeObserver' in window) new ResizeObserver(merke).observe(nav);
  else window.addEventListener('resize', merke, { passive: true });
  merke();
})();

// Articles with numbered sections ('abschnittsnummern: true'): the quick navigation marks the section on the screen,
// and the slim bar at the top names it – like in lessons, but without progress (lektion.js does that there).
(function () {
  const nav = document.querySelector('.schnellnav');
  const leiste = document.querySelector('.fortschritt.nur-abschnitt');
  if (!nav || !leiste) return;
  const links = [...nav.querySelectorAll('a')];
  const ziele = links.map(l => ({ l, h: document.getElementById(l.hash.slice(1)) })).filter(z => z.h);
  if (!ziele.length) return;
  const fsNr = leiste.querySelector('.fs-nr');
  const fsTitel = leiste.querySelector('.fs-titel');
  const liste = nav.querySelector('ol');
  let aktiv = null;

  // the section on the screen: the last heading above the upper third
  function setze() {
    const grenze = window.innerHeight * 0.3;
    let neu = ziele[0];
    for (const z of ziele) {
      if (z.h.getBoundingClientRect().top <= grenze) neu = z;
      else break;
    }
    if (neu === aktiv) return;
    aktiv = neu;
    links.forEach(l => {
      if (l === neu.l) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
    fsNr.textContent = neu.l.querySelector('.nr').textContent;
    fsTitel.textContent = neu.l.querySelector('.titel').textContent;
    if (liste.scrollWidth > liste.clientWidth) {  // a bar that scrolls sideways: keep the active number in view
      const li = neu.l.parentElement;
      const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
      liste.scrollTo({ left: li.offsetLeft - liste.offsetLeft - (liste.clientWidth - li.offsetWidth) / 2, behavior: ruhig ? 'auto' : 'smooth' });
    }
  }

  let geplant = false;
  window.addEventListener('scroll', () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; setze(); });
  }, { passive: true });
  window.addEventListener('resize', setze, { passive: true });
  leiste.hidden = false;
  setze();
})();
