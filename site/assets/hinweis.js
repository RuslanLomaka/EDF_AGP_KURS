// Notice about privacy and purpose, shown once per visit. "Visit" = until the browser tab is closed
// (sessionStorage); nothing is sent anywhere. Without JavaScript the same text is at /hinweis/.
(function () {
  const dialog = document.getElementById('hinweis-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  let gesehen = false;
  try { gesehen = sessionStorage.getItem('hinweis-gesehen') === '1'; } catch (e) { /* storage blocked */ }
  if (gesehen) return;
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    try { sessionStorage.setItem('hinweis-gesehen', '1'); } catch (e) { /* storage blocked */ }
  });
  dialog.showModal();
  // focus the button without scrolling the heading out of view on small screens
  dialog.querySelector('button').focus({ preventScroll: true });
  dialog.scrollTop = 0;
})();
