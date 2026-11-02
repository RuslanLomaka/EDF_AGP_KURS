// Article quiz (Quiz Forger JSON format). Questions and answers are shuffled on every load and on
// "Neu mischen", so nobody sees the same order twice. Nothing is stored or sent anywhere.
(function () {
  const box = document.querySelector('[data-quiz]');
  const datenEl = document.getElementById('quiz-daten');
  if (!box || !datenEl) return;
  const quiz = JSON.parse(datenEl.textContent);
  const BUCHSTABEN = 'ABCD';

  // Fisher–Yates shuffle on a copy
  const mische = liste => {
    const neu = liste.slice();
    for (let i = neu.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neu[i], neu[j]] = [neu[j], neu[i]];
    }
    return neu;
  };
  const el = (tag, klasse, text) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function starte() {
    box.textContent = '';
    const fragen = mische(quiz.questions);
    let beantwortet = 0, richtig = 0;
    const stand = el('p', 'quiz-stand');
    stand.setAttribute('aria-live', 'polite');
    const zeigeStand = () => {
      stand.textContent = beantwortet < fragen.length
        ? beantwortet + ' von ' + fragen.length + ' Fragen beantwortet, ' + richtig + ' richtig.'
        : 'Fertig: ' + richtig + ' von ' + fragen.length + ' richtig.' + (richtig === fragen.length ? ' Super!' : '');
    };

    fragen.forEach((frage, n) => {
      const feld = el('fieldset', 'quiz-frage');
      feld.append(el('legend', '', (n + 1) + '. ' + frage.question));
      const antworten = mische(frage.answers);
      const rueck = el('div', 'quiz-rueckmeldung');
      rueck.setAttribute('aria-live', 'polite');
      // buttons, not radio buttons: arrow keys move between radio buttons and would answer by accident
      const knoepfe = antworten.map((antwort, i) => {
        const knopf = el('button', 'quiz-antwort');
        knopf.type = 'button';
        knopf.append(el('span', 'quiz-buchstabe', BUCHSTABEN[i]), el('span', '', antwort.text));
        knopf.addEventListener('click', () => {
          if (feld.dataset.fertig) return;
          feld.dataset.fertig = 'ja';
          const k = antworten.findIndex(a => a.correct);
          knoepfe.forEach(x => x.setAttribute('aria-disabled', 'true'));
          knopf.setAttribute('aria-pressed', 'true');
          knoepfe[k].classList.add('ist-richtig');
          if (antwort.correct) {
            richtig++;
            rueck.append(el('p', 'ok', 'Richtig!'));
          } else {
            knopf.classList.add('gewaehlt-falsch');
            rueck.append(el('p', 'falsch', 'Leider falsch. Richtig ist ' + BUCHSTABEN[k] + ': ' + antworten[k].text));
          }
          if (frage.explanation) rueck.append(el('p', 'quiz-erklaerung', frage.explanation));
          (frage.sources || []).forEach(q => {
            const p = el('p', 'quiz-quelle', 'Quelle: ');
            const a = el('a', '', q.title || q.url);
            a.href = q.url;
            a.rel = 'noopener';
            p.append(a);
            rueck.append(p);
          });
          beantwortet++;
          zeigeStand();
        });
        return knopf;
      });
      feld.append(...knoepfe, rueck);
      box.append(feld);
    });

    const neu = el('button', 'quiz-neu', 'Neu mischen und noch einmal');
    neu.type = 'button';
    neu.addEventListener('click', () => {
      starte();
      box.scrollIntoView({ block: 'start' });
    });
    box.append(stand, neu);
    zeigeStand();
  }
  starte();
})();
