// '::: prompt' and '::: vorlage' boxes (lessons and articles): a button copies the text, so nobody has to type it.
(function () {
  document.querySelectorAll('.prompt, .vorlage').forEach(box => {
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
