// Short notice about privacy and purpose, shown once a day: the browser remembers only today's date
// (localStorage), nothing is sent anywhere. It is a small bar at the bottom, not a modal: the page stays usable.
// Without JavaScript the full text is at /hinweis/.
(function () {
  const leiste = document.getElementById('hinweis-dialog');
  if (!leiste || typeof leiste.show !== 'function') return;
  const d = new Date();
  const heute = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  let gesehen = '';
  try { gesehen = localStorage.getItem('hinweis-gesehen') || ''; } catch (e) { /* storage blocked */ }
  if (gesehen === heute) return;
  leiste.querySelector('button').addEventListener('click', () => {
    leiste.close();
    try { localStorage.setItem('hinweis-gesehen', heute); } catch (e) { /* storage blocked */ }
  });
  // Non-modal bar: do not steal keyboard focus (Decision: stop notice focus).
  leiste.show();
})();
