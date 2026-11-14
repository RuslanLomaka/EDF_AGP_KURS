// Quizzes (Quiz Forger JSON format). Questions and answers are shuffled on every load and on
// "Neu mischen", so nobody sees the same order twice. Nothing is stored or sent anywhere.
// Two modes: articles give feedback after each answer; "mode": "test" (lessons) shows everything at the end:
// score, a title, strengths and weak areas (each question has an "area"), and every mistake explained.
(function () {
  const box = document.querySelector('[data-quiz]');
  const datenEl = document.getElementById('quiz-daten');
  if (!box || !datenEl) return;
  const quiz = JSON.parse(datenEl.textContent);
  const test = quiz.mode === 'test';
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
  const quellen = (frage, ziel) => (frage.sources || []).forEach(q => {
    const p = el('p', 'quiz-quelle', 'Quelle: ');
    const a = el('a', '', q.title || q.url);
    a.href = q.url;
    a.rel = 'noopener';
    p.append(a);
    ziel.append(p);
  });
  const balken = anteil => {
    const b = el('div', 'quiz-balken');
    const s = el('span');
    s.style.width = '0%';
    // grows from zero once it is on the page
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.width = Math.round(anteil * 100) + '%'; }));
    b.append(s);
    return b;
  };

  // warm-up: "auswahl" questions, each from a different article
  const waehleAus = liste => {
    if (!quiz.auswahl) return mische(liste);
    const gesehen = new Set(), raus = [];
    for (const f of mische(liste)) {
      const k = f.artikel ? f.artikel.url : f.question;
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      raus.push(f);
      if (raus.length === quiz.auswahl) break;
    }
    return raus;
  };

  function starte() {
    box.textContent = '';
    // the test keeps its order, so the class can talk about "Frage 7"; answers are always shuffled
    const fragen = (test ? quiz.questions : waehleAus(quiz.questions)).map((frage, n) => ({ frage, nr: n + 1, antworten: mische(frage.answers), wahl: -1 }));
    let beantwortet = 0, richtig = 0;
    const stand = el('p', 'quiz-stand');
    stand.setAttribute('aria-live', 'polite');
    const zeigeStand = () => {
      if (test) {
        stand.textContent = beantwortet + ' von ' + fragen.length + ' Fragen beantwortet.';
        return;
      }
      stand.textContent = beantwortet < fragen.length
        ? beantwortet + ' von ' + fragen.length + ' Fragen beantwortet, ' + richtig + ' richtig.'
        : 'Fertig: ' + richtig + ' von ' + fragen.length + ' richtig.' + (richtig === fragen.length ? ' Super!' : '');
    };

    // shows the right answer (and the chosen wrong one) in a question
    const loese = (f, feld, knoepfe, rueck) => {
      feld.dataset.fertig = 'ja';
      const k = f.antworten.findIndex(a => a.correct);
      knoepfe.forEach(x => x.setAttribute('aria-disabled', 'true'));
      knoepfe[k].classList.add('ist-richtig');
      if (f.wahl === k) {
        rueck.append(el('p', 'ok', 'Richtig!'));
      } else {
        if (f.wahl >= 0) knoepfe[f.wahl].classList.add('gewaehlt-falsch');
        rueck.append(el('p', 'falsch', (f.wahl >= 0 ? 'Leider falsch. ' : 'Nicht beantwortet. ')
          + 'Richtig ist ' + BUCHSTABEN[k] + ': ' + f.antworten[k].text));
      }
      if (f.frage.explanation) rueck.append(el('p', 'quiz-erklaerung', f.frage.explanation));
      quellen(f.frage, rueck);
      const art = f.frage.artikel;
      if (art && /^\/artikel\/[a-z0-9-]+\/$/.test(art.url)) {
        const p = el('p', 'quiz-quelle', 'Aus dem Artikel: ');
        const a = el('a', '', art.title);
        a.href = art.url;
        p.append(a);
        rueck.append(p);
      }
    };

    const felder = fragen.map((f, n) => {
      const feld = el('fieldset', 'quiz-frage');
      feld.append(el('legend', '', (test ? 'Frage ' : '') + (n + 1) + (test ? ': ' : '. ') + f.frage.question));
      const rueck = el('div', 'quiz-rueckmeldung');
      rueck.setAttribute('aria-live', 'polite');
      // buttons, not radio buttons: arrow keys move between radio buttons and would answer by accident
      const knoepfe = f.antworten.map((antwort, i) => {
        const knopf = el('button', 'quiz-antwort');
        knopf.type = 'button';
        knopf.setAttribute('aria-pressed', 'false');
        knopf.append(el('span', 'quiz-buchstabe', BUCHSTABEN[i]), el('span', '', antwort.text));
        knopf.addEventListener('click', () => {
          if (feld.dataset.fertig) return;
          if (test) {  // choose (and change your mind) until "Auswerten"
            if (f.wahl < 0) beantwortet++;
            f.wahl = i;
            knoepfe.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
            feld.classList.add('beantwortet');
            zeigeStand();
            return;
          }
          f.wahl = i;
          knopf.setAttribute('aria-pressed', 'true');
          if (antwort.correct) richtig++;
          beantwortet++;
          loese(f, feld, knoepfe, rueck);
          zeigeStand();
          if (beantwortet === fragen.length) box.dispatchEvent(new CustomEvent('quiz-fertig', { bubbles: true }));
        });
        return knopf;
      });
      feld.append(...knoepfe, rueck);
      box.append(feld);
      return { feld, knoepfe, rueck };
    });

    const neu = el('button', 'quiz-neu', 'Neu mischen und noch einmal');
    neu.type = 'button';
    neu.addEventListener('click', () => {
      starte();
      box.scrollIntoView({ block: 'start' });
    });

    if (!test) {
      box.append(stand, neu);
      zeigeStand();
      return;
    }

    const auswerten = el('button', 'quiz-neu', 'Auswerten');
    auswerten.type = 'button';
    const warnung = el('p', 'quiz-warnung');
    warnung.setAttribute('aria-live', 'polite');
    auswerten.addEventListener('click', () => {
      const offen = fragen.findIndex(f => f.wahl < 0);
      if (offen >= 0 && !warnung.dataset.gewarnt) {
        warnung.dataset.gewarnt = 'ja';
        const zahl = fragen.filter(f => f.wahl < 0).length;
        warnung.textContent = 'Noch ' + zahl + (zahl === 1 ? ' Frage' : ' Fragen') + ' ohne Antwort. Beantworten Sie sie – oder klicken Sie noch einmal auf „Auswerten“.';
        felder[offen].feld.scrollIntoView({ block: 'center' });
        return;
      }
      warnung.textContent = '';
      fragen.forEach((f, n) => loese(f, felder[n].feld, felder[n].knoepfe, felder[n].rueck));
      auswerten.remove();
      const ergebnis = auswertung(fragen);
      box.prepend(ergebnis);
      ergebnis.scrollIntoView({ block: 'start' });
      ergebnis.focus({ preventScroll: true });
      if (ergebnis.dataset.anteil >= 0.8 && window.kursKonfetti) window.kursKonfetti(ergebnis);
      box.dispatchEvent(new CustomEvent('quiz-fertig', { bubbles: true }));
    });
    box.append(stand, warnung, auswerten, neu);
    zeigeStand();
  }

  function auswertung(fragen) {
    const r = fragen.filter(f => f.wahl >= 0 && f.antworten[f.wahl].correct).length;
    const anteil = r / fragen.length;
    const e = el('section', 'quiz-ergebnis');
    e.dataset.anteil = String(anteil);
    e.tabIndex = -1;
    e.setAttribute('aria-label', 'Ihr Ergebnis');
    const stufe = anteil >= 0.8 ? ['KI-Profi', 'Stark! Sie haben heute gezeigt, dass Sie KI sicher und klug nutzen.']
      : anteil >= 0.5 ? ['KI-Entdeckerin / KI-Entdecker', 'Gut gemacht! Sie kennen die wichtigsten Regeln. Ein paar Dinge können Sie noch üben.']
      : ['KI-Neuling', 'Ein guter Anfang! Lesen Sie die Erklärungen unten – beim zweiten Versuch klappt es besser.'];
    e.append(el('p', 'quiz-titel', stufe[0]),
      el('p', 'quiz-punkte', r + ' von ' + fragen.length + ' richtig (' + Math.round(anteil * 100) + ' %)'),
      balken(anteil), el('p', '', stufe[1]));

    // per area: strong (>= 75 %), practise (< 60 %)
    const bereiche = Object.keys(quiz.areas);
    const liste = el('div', 'quiz-bereiche');
    const stark = [], ueben = [];
    bereiche.forEach(name => {
      const fs = fragen.filter(f => f.frage.area === name);
      if (!fs.length) return;
      const ok = fs.filter(f => f.wahl >= 0 && f.antworten[f.wahl].correct).length;
      const zeile = el('div', 'quiz-bereich');
      zeile.append(el('span', '', name), el('span', 'quiz-bereich-zahl', ok + ' / ' + fs.length), balken(ok / fs.length));
      liste.append(zeile);
      if (ok / fs.length >= 0.75) stark.push(name);
      else if (ok / fs.length < 0.6) ueben.push(name);
    });
    e.append(el('h3', '', 'Ihre Bereiche'), liste);
    if (stark.length) e.append(el('p', 'quiz-stark', 'Das können Sie schon gut: ' + stark.join(', ') + '.'));
    if (ueben.length) {
      e.append(el('p', 'quiz-ueben', 'Hier können Sie noch üben: ' + ueben.join(', ') + '.'));
      const tipps = el('ul', 'quiz-tipps');
      ueben.forEach(name => tipps.append(el('li', '', name + ': ' + quiz.areas[name])));
      e.append(tipps);
    }

    const falsch = fragen.filter(f => !(f.wahl >= 0 && f.antworten[f.wahl].correct));
    if (falsch.length) {
      e.append(el('h3', '', 'Ihre Fehler – kurz erklärt'));
      const ol = el('ol', 'quiz-fehler');
      falsch.forEach(f => {
        const li = el('li');
        const k = f.antworten.findIndex(a => a.correct);
        li.append(el('p', 'quiz-fehler-frage', 'Frage ' + f.nr + ': ' + f.frage.question),
          el('p', 'falsch', 'Ihre Antwort: ' + (f.wahl >= 0 ? f.antworten[f.wahl].text : 'keine')),
          el('p', 'ok', 'Richtig: ' + f.antworten[k].text));
        if (f.frage.explanation) li.append(el('p', 'quiz-erklaerung', f.frage.explanation));
        const n = f.frage.nachlesen;
        if (n && /^\/edv-kurs\/[a-z0-9-]+\/#[a-z0-9-]+$/.test(n.url)) {
          const p = el('p', 'quiz-nachlesen', 'Nachlesen: ');
          const a = el('a', '', n.text + ' →');
          const lehrer = /\/teacher\/$/.test(location.pathname);  // the teacher view stays in the teacher view
          const url = lehrer ? n.url.replace('/#', '/teacher/#') : n.url;
          a.href = url.startsWith(location.pathname + '#') ? url.slice(location.pathname.length) : url;
          p.append(a);
          li.append(p);
        }
        ol.append(li);
      });
      e.append(ol);
    } else {
      e.append(el('p', 'ok', 'Keine Fehler – alles richtig!'));
    }
    return e;
  }
  starte();
})();
