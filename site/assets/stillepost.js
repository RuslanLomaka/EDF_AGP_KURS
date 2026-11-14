// Stille Post with several AIs: one click copies the prompt for the game leader (Gemini), with three languages
// picked at random, one from each language family, in a random order. Then the link to Gemini appears.
// Everything happens in this browser; nothing is stored or sent.
(function () {
  document.querySelectorAll('.stillepost').forEach(box => {
    const vorlage = box.dataset.vorlage;
    let gruppen;
    try { gruppen = JSON.parse(box.dataset.gruppen); } catch (e) { return; }
    const knopf = box.querySelector('.sp-kopieren');
    const wuerfel = box.querySelector('.sp-wuerfeln');
    const liste = box.querySelector('.sp-liste');
    const pre = box.querySelector('.sp-text');
    const zufall = n => Math.floor(Math.random() * n);
    let sprachen = [], text = '';

    const wuerfeln = () => {
      const alt = sprachen.join();
      do {
        sprachen = gruppen.map(g => g[zufall(g.length)]);
        for (let i = sprachen.length - 1; i > 0; i--) {  // random order of the three families
          const j = zufall(i + 1);
          [sprachen[i], sprachen[j]] = [sprachen[j], sprachen[i]];
        }
      } while (sprachen.join() === alt);
      text = vorlage;
      sprachen.forEach((s, i) => { text = text.split('{' + (i + 1) + '}').join(s); });
      liste.textContent = 'Deutsch → ' + sprachen.join(' → ') + ' → Deutsch';
      pre.textContent = text;
      box.classList.remove('sp-kopiert');
      knopf.textContent = 'Prompt kopieren – hier klicken';
    };

    const geschafft = () => {
      box.classList.add('sp-kopiert');
      knopf.textContent = '✓ Kopiert!';
      if (window.kursKonfetti) window.kursKonfetti(knopf.closest('.sp-schritt'));
      const weiter = box.querySelector('.sp-start');
      weiter.focus({ preventScroll: true });
      weiter.closest('.sp-schritt').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const altmodisch = () => {  // older browsers: copy through a hidden text field
      const feld = document.createElement('textarea');
      feld.value = text;
      feld.setAttribute('readonly', '');
      feld.style.position = 'fixed';
      feld.style.opacity = '0';
      document.body.append(feld);
      feld.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      feld.remove();
      return ok;
    };
    const vonHand = () => {  // last resort: show and select the prompt
      const det = box.querySelector('.sp-ganz');
      det.open = true;
      const r = document.createRange();
      r.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      knopf.textContent = 'Bitte jetzt Strg + C drücken';
      box.classList.add('sp-kopiert');
    };
    knopf.addEventListener('click', () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(geschafft, () => (altmodisch() ? geschafft() : vonHand()));
      } else if (altmodisch()) {
        geschafft();
      } else {
        vonHand();
      }
    });
    wuerfel.addEventListener('click', wuerfeln);
    box.classList.add('sp-aktiv');
    knopf.hidden = false;
    wuerfel.hidden = false;
    wuerfeln();
  });
})();
