// Exercises built from ```uebung blocks: "zuordnen" (cards into boxes) and "reihenfolge" (steps in order).
// Works with mouse and finger (drag), and by tapping (card, then box) or with the arrow buttons.
// Nothing is stored or sent anywhere.
(function () {
  const mische = liste => {
    const neu = liste.slice();
    for (let i = neu.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neu[i], neu[j]] = [neu[j], neu[i]];
    }
    return neu;
  };
  const absatz = (klasse, text) => {
    const p = document.createElement('p');
    if (klasse) p.className = klasse;
    p.textContent = text;
    return p;
  };
  // result line under an exercise; all right: explanation + confetti
  const auswerten = (el, ok, gesamt) => {
    const ergebnis = el.querySelector('.ue-ergebnis');
    ergebnis.textContent = '';
    if (ok === gesamt) {
      ergebnis.append(absatz('ok', 'Alles richtig – super!'));
      if (el.dataset.erklaerung) ergebnis.append(absatz('ue-erklaerung', el.dataset.erklaerung));
      if (window.kursKonfetti) window.kursKonfetti(el);
    } else {
      ergebnis.append(absatz('falsch', ok + ' von ' + gesamt + ' richtig. Die rot markierten noch einmal verschieben und erneut prüfen.'));
    }
  };

  function zuordnen(el) {
    const loesung = JSON.parse(el.dataset.loesung);
    const pool = el.querySelector('.ue-pool');
    const ziele = [...el.querySelectorAll('.ue-ziel')];
    const karten = [...el.querySelectorAll('.ue-karte')];
    const ergebnis = el.querySelector('.ue-ergebnis');
    let gewaehlt = null;

    const waehle = k => {
      if (gewaehlt) gewaehlt.setAttribute('aria-pressed', 'false');
      gewaehlt = k && k !== gewaehlt ? k : null;
      if (gewaehlt) gewaehlt.setAttribute('aria-pressed', 'true');
      el.classList.toggle('ue-waehlt', Boolean(gewaehlt));
    };
    const zuruecksetzen = () => {
      karten.forEach(k => k.classList.remove('richtig', 'falsch'));
      ergebnis.textContent = '';
    };
    const lege = (k, ablage) => {
      ablage.append(k);
      k.classList.remove('ue-gelandet');
      void k.offsetWidth;  // restart the landing animation
      k.classList.add('ue-gelandet');
      waehle(null);
      zuruecksetzen();
    };
    const ablageUnter = (x, y) => {
      const t = document.elementFromPoint(x, y);
      if (!t) return null;
      const z = t.closest('.ue-ziel');
      if (z && el.contains(z)) return z.querySelector('.ue-ablage');
      const p = t.closest('.ue-pool');
      return p === pool ? pool : null;
    };

    karten.forEach(k => {
      k.setAttribute('aria-pressed', 'false');
      k.addEventListener('click', e => {
        e.stopPropagation();
        if (k.dataset.gezogen) return;
        waehle(k);
      });
      k.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const start = { x: e.clientX, y: e.clientY };
        let geist = null;
        const bewege = ev => {
          if (!geist) {
            if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
            geist = k.cloneNode(true);
            geist.classList.add('ue-geist');
            geist.removeAttribute('aria-pressed');
            document.body.append(geist);
            k.classList.add('ue-zieht');
          }
          ev.preventDefault();
          geist.style.left = ev.clientX + 'px';
          geist.style.top = ev.clientY + 'px';
          const a = ablageUnter(ev.clientX, ev.clientY);
          ziele.forEach(z => z.classList.toggle('ue-drueber', Boolean(a) && z.contains(a)));
        };
        const ende = ev => {
          document.removeEventListener('pointermove', bewege);
          document.removeEventListener('pointerup', ende);
          document.removeEventListener('pointercancel', ende);
          if (!geist) return;  // just a tap: the click handler selects the card
          geist.remove();
          k.classList.remove('ue-zieht');
          ziele.forEach(z => z.classList.remove('ue-drueber'));
          k.dataset.gezogen = 'ja';  // swallow the click that may follow the drop
          setTimeout(() => { delete k.dataset.gezogen; }, 0);
          const a = ev.type === 'pointerup' ? ablageUnter(ev.clientX, ev.clientY) : null;
          if (a) lege(k, a);
        };
        document.addEventListener('pointermove', bewege);
        document.addEventListener('pointerup', ende);
        document.addEventListener('pointercancel', ende);
      });
    });
    ziele.forEach(z => z.addEventListener('click', () => { if (gewaehlt) lege(gewaehlt, z.querySelector('.ue-ablage')); }));
    pool.addEventListener('click', () => { if (gewaehlt && gewaehlt.parentElement !== pool) lege(gewaehlt, pool); });

    el.querySelector('.ue-pruefen').addEventListener('click', () => {
      const rest = pool.querySelectorAll('.ue-karte').length;
      if (rest) {
        ergebnis.textContent = '';
        ergebnis.append(absatz('falsch', 'Noch ' + rest + (rest === 1 ? ' Karte' : ' Karten') + ' übrig. Bitte erst alle verteilen.'));
        return;
      }
      let ok = 0;
      karten.forEach(k => {
        const z = k.closest('.ue-ziel');
        const richtig = Boolean(z) && Number(z.dataset.g) === loesung[Number(k.dataset.i)];
        k.classList.toggle('richtig', richtig);
        k.classList.toggle('falsch', !richtig);
        if (richtig) ok++;
      });
      auswerten(el, ok, karten.length);
    });
    const neu = () => {
      waehle(null);
      mische(karten).forEach(k => pool.append(k));
      zuruecksetzen();
    };
    el.querySelector('.ue-neu').addEventListener('click', neu);
    neu();
  }

  function reihenfolge(el) {
    const liste = el.querySelector('.ue-liste');
    const ergebnis = el.querySelector('.ue-ergebnis');
    const schritte = [...liste.children];
    const zuruecksetzen = () => {
      schritte.forEach(s => s.classList.remove('richtig', 'falsch'));
      ergebnis.textContent = '';
    };
    const neu = () => {
      let folge;
      do { folge = mische(schritte); } while (folge.every((s, i) => Number(s.dataset.i) === i));
      folge.forEach(s => liste.append(s));
      zuruecksetzen();
    };

    schritte.forEach(s => {
      s.querySelector('.ue-hoch').addEventListener('click', e => {
        if (s.previousElementSibling) liste.insertBefore(s, s.previousElementSibling);
        e.currentTarget.focus();
        zuruecksetzen();
      });
      s.querySelector('.ue-runter').addEventListener('click', e => {
        if (s.nextElementSibling) liste.insertBefore(s.nextElementSibling, s);
        e.currentTarget.focus();
        zuruecksetzen();
      });
      // mouse: drag the whole step; finger: drag the grip (so the page still scrolls over the text)
      s.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('button')) return;
        if (e.pointerType !== 'mouse' && !e.target.closest('.ue-griff')) return;
        e.preventDefault();
        s.classList.add('ue-zieht');
        const bewege = ev => {
          ev.preventDefault();
          const andere = [...liste.children].filter(x => x !== s);
          const vor = andere.find(x => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          if (vor) { if (s.nextElementSibling !== vor) liste.insertBefore(s, vor); }
          else if (liste.lastElementChild !== s) liste.append(s);
        };
        const ende = () => {
          document.removeEventListener('pointermove', bewege);
          document.removeEventListener('pointerup', ende);
          document.removeEventListener('pointercancel', ende);
          s.classList.remove('ue-zieht');
          zuruecksetzen();
        };
        document.addEventListener('pointermove', bewege);
        document.addEventListener('pointerup', ende);
        document.addEventListener('pointercancel', ende);
      });
    });

    el.querySelector('.ue-pruefen').addEventListener('click', () => {
      let ok = 0;
      [...liste.children].forEach((s, i) => {
        const richtig = Number(s.dataset.i) === i;
        s.classList.toggle('richtig', richtig);
        s.classList.toggle('falsch', !richtig);
        if (richtig) ok++;
      });
      auswerten(el, ok, schritte.length);
    });
    el.querySelector('.ue-neu').addEventListener('click', neu);
    neu();
  }

  document.querySelectorAll('.uebung').forEach(el => {
    el.classList.add('ue-aktiv');
    (el.dataset.typ === 'reihenfolge' ? reihenfolge : zuordnen)(el);
  });
})();
