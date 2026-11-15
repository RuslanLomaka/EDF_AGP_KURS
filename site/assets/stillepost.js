// Stille Post with several AIs. 1. Learners pick a suggested sentence or write their own (at least "mindestens"
// characters; a bar fills while they type). 2. One click copies the prompt for the game leader (Gemini) with the
// sentence and three languages, one from each family in a random order. 3. Then the link to Gemini appears.
// Everything happens in this browser; nothing is stored or sent.
(function () {
  document.querySelectorAll('.stillepost').forEach(box => {
    const vorlage = box.dataset.vorlage;
    let gruppen, saetze;
    try { gruppen = JSON.parse(box.dataset.gruppen); saetze = JSON.parse(box.dataset.saetze); } catch (e) { return; }
    // "|" marks the parts of long words: shown as soft hyphens (break only there), removed for the prompt
    const sauber = s => s.replace(/\|/g, '');
    const anzeige = s => s.replace(/\|/g, '\u00AD');
    const min = Number(box.dataset.mindestens) || 50;
    const $ = sel => box.querySelector(sel);
    const knopf = $('.sp-kopieren'), wuerfel = $('.sp-wuerfeln'), liste = $('.sp-liste'), pre = $('.sp-text');
    const feld = $('.sp-satz'), zaehler = $('.sp-zaehler'), balken = $('.sp-balken span');
    const vorschlaege = $('.sp-vorschlaege'), andere = $('.sp-andere');
    const zufall = n => Math.floor(Math.random() * n);
    const mische = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = zufall(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let sprachen = [], text = '', gezeigt = [];

    // the sentence must be long enough and must not look like personal data
    const satz = () => feld.value.replace(/\s+/g, ' ').trim();
    const persoenlich = s => /@|\d[\d /-]{5,}\d|[a-zäöüß](straße|str\.|weg|platz|allee|gasse) *\d/i.test(s);
    const bereit = () => satz().length >= min && !persoenlich(satz());

    const prompt = () => {
      text = vorlage.split('{satz}').join(satz() || sauber(saetze[0]));
      sprachen.forEach((s, i) => { text = text.split('{' + (i + 1) + '}').join(s); });
      pre.textContent = text;
    };
    const neuKopieren = () => {  // something changed: the prompt must be copied again
      box.classList.remove('sp-kopiert');
      knopf.textContent = bereit() ? 'Prompt kopieren – hier klicken' : '🔒 Erst Satz wählen (mind. ' + min + ' Zeichen)';
      knopf.disabled = !bereit();
    };
    const pruefe = () => {
      const n = satz().length;
      balken.style.width = Math.min(100, Math.round(100 * n / min)) + '%';
      box.classList.toggle('sp-satz-ok', n >= min);
      if (persoenlich(satz())) zaehler.textContent = '⚠ Bitte keine Adressen, E-Mail-Adressen oder Telefonnummern.';
      else if (n >= min) zaehler.textContent = '✓ ' + n + ' Zeichen – lang genug! Jetzt weiter mit Schritt 2.';
      else if (n === 0) zaehler.textContent = 'Mindestens ' + min + ' Zeichen – längere Sätze verändern sich mehr.';
      else zaehler.textContent = n + ' von ' + min + ' Zeichen – noch ' + (min - n) + '.';
      vorschlaege.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.satz === satz())));
      prompt();
      neuKopieren();
    };
    // the first sentence (the Eierschalensollbruchstellenverursacher) is always among the first suggestions
    let erstesMal = true;
    const zeigeVorschlaege = () => {
      const rest = saetze.filter(s => !gezeigt.includes(s));
      gezeigt = erstesMal ? [saetze[0], ...mische(saetze.slice(1)).slice(0, 2)] : mische(rest.length >= 3 ? rest : saetze).slice(0, 3);
      erstesMal = false;
      vorschlaege.textContent = '';
      gezeigt.forEach(s => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sp-vorschlag';
        b.textContent = anzeige(s);
        b.dataset.satz = sauber(s);
        b.addEventListener('click', () => { feld.value = sauber(s); pruefe(); knopf.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
        vorschlaege.append(b);
      });
      pruefe();
    };
    const wuerfeln = () => {
      const alt = sprachen.join();
      do { sprachen = mische(gruppen.map(g => g[zufall(g.length)])); } while (sprachen.join() === alt);
      liste.textContent = 'Deutsch → ' + sprachen.join(' → ') + ' → Deutsch';
      prompt();
      neuKopieren();
    };

    const geschafft = () => {
      box.classList.add('sp-kopiert');
      knopf.textContent = '✓ Kopiert!';
      if (window.kursKonfetti) window.kursKonfetti(knopf.closest('.sp-schritt'));
      const weiter = $('.sp-start');
      weiter.focus({ preventScroll: true });
      weiter.closest('.sp-schritt').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const altmodisch = () => {  // older browsers: copy through a hidden text field
      const f = document.createElement('textarea');
      f.value = text;
      f.setAttribute('readonly', '');
      f.style.position = 'fixed';
      f.style.opacity = '0';
      document.body.append(f);
      f.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      f.remove();
      return ok;
    };
    const vonHand = () => {  // last resort: show and select the prompt
      $('.sp-ganz').open = true;
      const r = document.createRange();
      r.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      knopf.textContent = 'Bitte jetzt Strg + C drücken';
      box.classList.add('sp-kopiert');
    };
    knopf.addEventListener('click', () => {
      if (!bereit()) { feld.focus(); return; }
      prompt();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(geschafft, () => (altmodisch() ? geschafft() : vonHand()));
      } else if (altmodisch()) {
        geschafft();
      } else {
        vonHand();
      }
    });
    feld.addEventListener('input', pruefe);
    andere.addEventListener('click', zeigeVorschlaege);
    wuerfel.addEventListener('click', wuerfeln);
    box.classList.add('sp-aktiv');
    $('.sp-satz-schritt').hidden = false;
    knopf.hidden = false;
    wuerfel.hidden = false;
    wuerfeln();
    zeigeVorschlaege();
  });
})();
