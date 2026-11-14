// Example prompts ('::: prompt' boxes): a button copies the prompt, so nobody has to type it.
(function () {
  document.querySelectorAll('.prompt').forEach(box => {
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

// Quick navigation: highlights the section being read and keeps its number visible in the bar.
(function () {
  const nav = document.querySelector('.schnellnav');
  if (!nav) return;
  const liste = nav.querySelector('ol');
  const links = [...nav.querySelectorAll('a')];
  const ziele = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  if (!ziele.length) return;
  let aktiv = null;
  const setze = id => {
    if (id === aktiv) return;
    aktiv = id;
    links.forEach(a => {
      if (a.hash.slice(1) !== id) { a.removeAttribute('aria-current'); return; }
      a.setAttribute('aria-current', 'true');
      if (liste.scrollWidth > liste.clientWidth) {  // phone bar: keep the active number in view
        const li = a.parentElement;
        liste.scrollTo({ left: li.offsetLeft - liste.offsetLeft - (liste.clientWidth - li.offsetWidth) / 2, behavior: 'smooth' });
      }
    });
  };
  // the active section is the last heading above the upper third of the screen
  const pruefe = () => {
    const grenze = window.innerHeight * 0.3;
    let id = ziele[0].id;
    for (const z of ziele) {
      if (z.getBoundingClientRect().top <= grenze) id = z.id;
      else break;
    }
    setze(id);
  };
  let geplant = false;
  window.addEventListener('scroll', () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; pruefe(); });
  }, { passive: true });
  pruefe();
})();

// Lesson pages: every step in a `::: schritte` list becomes a tappable card with a checkbox.
// Progress is kept in this browser, keyed by section and step text, so editing the lesson
// does not move ticks to the wrong steps.
(function () {
  const box = document.querySelector('.fortschritt');
  const schritte = [...document.querySelectorAll('.schritte li')];
  if (!box || !schritte.length) return;
  const speicher = 'lektion-v2:' + box.dataset.lektion;
  const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.codePointAt(0)) >>> 0; return h.toString(36); };
  const abschnitt = li => {
    let el = li.closest('.schritte');
    while (el && !(el.tagName === 'H2' && el.id)) el = el.previousElementSibling;
    return el ? el.id : '';
  };
  const schluessel = schritte.map(li => abschnitt(li) + ':' + hash(li.textContent.replace(/\s+/g, ' ').trim()));

  let erledigt = new Set();
  try { erledigt = new Set(JSON.parse(localStorage.getItem(speicher) || '[]')); } catch (e) { /* storage unavailable */ }
  const speichern = () => { try { localStorage.setItem(speicher, JSON.stringify([...erledigt])); } catch (e) { /* ignore */ } };

  const balken = box.querySelector('.balken span');
  const zahl = box.querySelector('.zahl');
  const anzeigen = () => {
    const n = schluessel.filter(k => erledigt.has(k)).length;
    balken.style.width = (100 * n / schritte.length) + '%';
    zahl.textContent = n + ' von ' + schritte.length + ' Schritten erledigt' + (n === schritte.length ? ' – super!' : '');
  };

  schritte.forEach((li, i) => {
    // the whole card is the label, so tapping the text ticks the step; its text is the checkbox's name
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'haken';
    cb.checked = erledigt.has(schluessel[i]);
    label.append(cb, ...li.childNodes);
    li.append(label);
    li.classList.toggle('erledigt', cb.checked);
    cb.addEventListener('change', () => {
      cb.checked ? erledigt.add(schluessel[i]) : erledigt.delete(schluessel[i]);
      li.classList.toggle('erledigt', cb.checked);
      speichern();
      anzeigen();
    });
  });

  const reset = document.querySelector('.reset');
  if (reset) {
    reset.addEventListener('click', () => {
      if (!window.confirm('Alle Haken in dieser Lektion entfernen?')) return;
      erledigt.clear();
      schritte.forEach(li => { li.classList.remove('erledigt'); li.querySelector('.haken').checked = false; });
      speichern();
      anzeigen();
    });
    reset.parentElement.hidden = false;
  }
  box.hidden = false;
  anzeigen();
})();
