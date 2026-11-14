// Start page and lesson list: "Weiter bei Abschnitt n" for lessons someone has started on this device.
// lektion.js keeps a short summary of the lesson progress in localStorage; nothing leaves the browser.
(function () {
  document.querySelectorAll('[data-stand]').forEach(el => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('lektion-stand:' + el.dataset.stand) || 'null'); } catch (e) { return; }
    if (!s || !(s.fertig > 0) || !(s.n > 0)) return;
    if (s.fertig >= s.n) {
      el.textContent = '✓ Alles gesammelt: ' + s.n + ' von ' + s.n + ' Aufgaben';
      el.classList.add('fertig');
    } else {
      const a = document.createElement('a');
      a.href = el.dataset.url + (/^[a-z0-9-]+$/.test(s.id || '') ? '#' + s.id : '');
      a.textContent = 'Weiter bei Abschnitt ' + String(s.nr || '').slice(0, 3) + ' →';
      el.append(a, ' ' + s.fertig + ' von ' + s.n + ' Aufgaben erledigt');
    }
    el.hidden = false;
  });
})();
