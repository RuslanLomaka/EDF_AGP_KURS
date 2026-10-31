// Lesson pages: every step in a `::: schritte` list gets a checkbox; progress is kept in this browser.
(function () {
  const box = document.querySelector('.fortschritt');
  const schritte = [...document.querySelectorAll('.schritte li')];
  if (!box || !schritte.length) return;
  const key = 'lektion:' + box.dataset.lektion;
  let erledigt = new Set();
  try { erledigt = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { /* storage unavailable */ }

  const balken = box.querySelector('.balken span');
  const zahl = box.querySelector('.zahl');
  const speichern = () => { try { localStorage.setItem(key, JSON.stringify([...erledigt])); } catch (e) { /* ignore */ } };
  const anzeigen = () => {
    const n = schritte.filter((li, i) => erledigt.has(i)).length;
    balken.style.width = (100 * n / schritte.length) + '%';
    zahl.textContent = n + ' von ' + schritte.length + ' Schritten erledigt' + (n === schritte.length ? ' – super!' : '');
  };

  schritte.forEach((li, i) => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'haken';
    cb.setAttribute('aria-label', 'Schritt erledigt');
    cb.checked = erledigt.has(i);
    li.classList.toggle('erledigt', cb.checked);
    cb.addEventListener('change', () => {
      cb.checked ? erledigt.add(i) : erledigt.delete(i);
      li.classList.toggle('erledigt', cb.checked);
      speichern();
      anzeigen();
    });
    li.prepend(cb);
  });
  box.querySelector('.reset').addEventListener('click', () => {
    erledigt.clear();
    schritte.forEach(li => { li.classList.remove('erledigt'); li.querySelector('.haken').checked = false; });
    speichern();
    anzeigen();
  });
  box.hidden = false;
  anzeigen();
})();
