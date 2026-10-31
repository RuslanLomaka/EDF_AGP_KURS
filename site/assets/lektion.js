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
