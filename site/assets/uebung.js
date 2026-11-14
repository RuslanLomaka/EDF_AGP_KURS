// Exercises built from ```uebung blocks:
//   "zuordnen"    cards into boxes          "luecken"    words into the gaps of a text (some words do not fit)
//   "reihenfolge" steps into the right order "markieren"  tap the right words in a text
// Works with mouse and finger (drag), by tapping (card, then box or gap) and with arrow buttons.
// A solved exercise sends the event "uebung-geloest" (lessons count it as progress). Nothing is sent anywhere.
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
  const melden = (el, text) => {
    const ergebnis = el.querySelector('.ue-ergebnis');
    ergebnis.textContent = '';
    ergebnis.append(absatz('falsch', text));
  };
  // all right: explanation, confetti and the event for the lesson progress
  const geloest = el => {
    const ergebnis = el.querySelector('.ue-ergebnis');
    ergebnis.textContent = '';
    ergebnis.append(absatz('ok', 'Alles richtig – super!'));
    if (el.dataset.erklaerung) ergebnis.append(absatz('ue-erklaerung', el.dataset.erklaerung));
    if (window.kursKonfetti) window.kursKonfetti(el);
    el.dispatchEvent(new CustomEvent('uebung-geloest', { bubbles: true }));
  };

  // a short message for screen readers (and nobody else)
  const ansage = (el, text) => {
    let s = el.querySelector('.ue-status');
    if (!s) {
      s = document.createElement('p');
      s.className = 'ue-status vh';
      s.setAttribute('aria-live', 'polite');
      el.append(s);
    }
    s.textContent = text;
  };
  // while dragging near the top or bottom edge of the screen, the page scrolls by itself
  const randScroll = () => {
    let y = -1, laeuft = false, beiBewegung = null;
    const schritt = () => {
      if (y < 0) { laeuft = false; return; }
      const unten = window.innerHeight - (document.querySelector('.schnellnav') && window.innerWidth < 1280 ? 140 : 70);
      const v = y < 80 ? -Math.ceil((80 - y) / 6) : y > unten ? Math.ceil((y - unten) / 6) : 0;
      if (v) { window.scrollBy(0, v); if (beiBewegung) beiBewegung(); }
      requestAnimationFrame(schritt);
    };
    return {
      setze(neuY, fn) { y = neuY; beiBewegung = fn; if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } },
      stopp() { y = -1; },
    };
  };

  // "zuordnen" and "luecken": cards that go into places (boxes hold many cards, gaps hold one)
  function karten(el, luecken) {
    const pool = el.querySelector('.ue-pool');
    const karten = [...el.querySelectorAll('.ue-karte')];
    const plaetze = [...el.querySelectorAll(luecken ? '.ue-luecke' : '.ue-ziel')];
    const ablage = platz => (luecken ? platz : platz.querySelector('.ue-ablage'));
    const ergebnis = el.querySelector('.ue-ergebnis');
    const loesung = luecken ? null : JSON.parse(el.dataset.loesung);
    let gewaehlt = null;

    const waehle = k => {
      if (gewaehlt) gewaehlt.setAttribute('aria-pressed', 'false');
      gewaehlt = k && k !== gewaehlt ? k : null;
      if (gewaehlt) gewaehlt.setAttribute('aria-pressed', 'true');
      el.classList.toggle('ue-waehlt', Boolean(gewaehlt));
      pool.tabIndex = gewaehlt && gewaehlt.parentElement !== pool ? 0 : -1;
      if (gewaehlt) ansage(el, '„' + gewaehlt.textContent.trim() + '“ gewählt. Jetzt ' + (luecken ? 'eine Lücke' : 'einen Kasten') + ' wählen.');
    };
    const name = platz => luecken ? 'Lücke ' + (plaetze.indexOf(platz) + 1) : 'Kasten „' + platz.querySelector('.ue-ziel-titel').textContent + '“';
    const zuruecksetzen = () => {
      karten.forEach(k => k.classList.remove('richtig', 'falsch'));
      plaetze.forEach(p => p.classList.remove('richtig', 'falsch'));
      ergebnis.textContent = '';
    };
    const lege = (k, ziel) => {
      if (luecken && ziel !== pool) {  // a gap holds one word: the old one swaps places with the new one
        const alt = ziel.querySelector('.ue-karte');
        const herkunft = k.parentElement;
        if (alt && alt !== k) (herkunft && herkunft !== ziel ? herkunft : pool).append(alt);
      }
      ziel.append(k);
      k.classList.remove('ue-gelandet');
      void k.offsetWidth;  // restart the landing animation
      k.classList.add('ue-gelandet');
      waehle(null);
      zuruecksetzen();
      const platz = ziel === pool ? null : ziel.closest('.ue-luecke, .ue-ziel');
      ansage(el, '„' + k.textContent.trim() + '“ ' + (platz ? 'liegt jetzt in ' + name(platz) : 'liegt wieder im Stapel') + '.');
    };
    const zielUnter = (x, y) => {
      const t = document.elementFromPoint(x, y);
      if (!t) return null;
      const platz = t.closest(luecken ? '.ue-luecke' : '.ue-ziel');
      if (platz && el.contains(platz)) return ablage(platz);
      return t.closest('.ue-pool') === pool ? pool : null;
    };

    karten.forEach(k => {
      k.setAttribute('aria-pressed', 'false');
      k.addEventListener('click', e => {
        e.stopPropagation();
        if (k.dataset.gezogen) return;
        // another card is selected and this one already sits in a box or gap: the selected card goes there
        const platz = k.parentElement !== pool && k.closest(luecken ? '.ue-luecke' : '.ue-ziel');
        if (gewaehlt && gewaehlt !== k && platz) return lege(gewaehlt, ablage(platz));
        waehle(k);
      });
      // mouse: drag at once. Finger: hold for a moment, then drag (a quick swipe scrolls the page as usual)
      k.addEventListener('contextmenu', e => { if (k.dataset.greift) e.preventDefault(); });
      k.addEventListener('touchmove', e => { if (k.dataset.greift) e.preventDefault(); }, { passive: false });
      k.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const finger = e.pointerType !== 'mouse';
        const start = { x: e.clientX, y: e.clientY };
        let geist = null, letzte = start;
        const rand = randScroll();
        let warte = null;
        if (finger) {
          warte = setTimeout(() => {
            warte = null;
            k.dataset.greift = 'ja';
            k.classList.add('ue-greift');
            if (navigator.vibrate) navigator.vibrate(15);
          }, 220);
        }
        const markiere = () => {
          const z = zielUnter(letzte.x, letzte.y);
          plaetze.forEach(p => p.classList.toggle('ue-drueber', Boolean(z) && (p === z || p.contains(z))));
        };
        const bewege = ev => {
          letzte = { x: ev.clientX, y: ev.clientY };
          const weg = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
          if (!geist) {
            if (finger && !k.dataset.greift) { if (weg > 8) ende(ev); return; }  // a swipe: let the page scroll
            if (!finger && weg < 6) return;
            geist = k.cloneNode(true);
            geist.classList.add('ue-geist');
            geist.removeAttribute('aria-pressed');
            document.body.append(geist);
            k.classList.add('ue-zieht');
          }
          ev.preventDefault();
          geist.style.left = ev.clientX + 'px';
          geist.style.top = ev.clientY + 'px';
          markiere();
          rand.setze(ev.clientY, markiere);
        };
        const ende = ev => {
          document.removeEventListener('pointermove', bewege);
          document.removeEventListener('pointerup', ende);
          document.removeEventListener('pointercancel', ende);
          if (warte) clearTimeout(warte);
          rand.stopp();
          k.classList.remove('ue-greift');
          setTimeout(() => { delete k.dataset.greift; }, 0);
          if (!geist) return;  // just a tap: the click handler selects the card
          geist.remove();
          k.classList.remove('ue-zieht');
          plaetze.forEach(p => p.classList.remove('ue-drueber'));
          k.dataset.gezogen = 'ja';  // swallow the click that may follow the drop
          setTimeout(() => { delete k.dataset.gezogen; }, 0);
          const z = ev.type === 'pointerup' ? zielUnter(ev.clientX, ev.clientY) : null;
          if (z) lege(k, z);
        };
        document.addEventListener('pointermove', bewege);
        document.addEventListener('pointerup', ende);
        document.addEventListener('pointercancel', ende);
      });
    });
    plaetze.forEach(p => {
      p.addEventListener('click', () => { if (gewaehlt) lege(gewaehlt, ablage(p)); });
      p.tabIndex = 0;  // keyboard: Tab to a box or gap, Enter puts the chosen card there
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', name(p));
      p.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === p) { e.preventDefault(); if (gewaehlt) lege(gewaehlt, ablage(p)); }
      });
    });
    pool.addEventListener('click', () => { if (gewaehlt && gewaehlt.parentElement !== pool) lege(gewaehlt, pool); });
    pool.setAttribute('aria-label', 'Stapel: hierhin zurücklegen');
    pool.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === pool) { e.preventDefault(); pool.click(); }
    });

    el.querySelector('.ue-pruefen').addEventListener('click', () => {
      if (luecken) {
        const leer = plaetze.filter(p => !p.querySelector('.ue-karte')).length;
        if (leer) return melden(el, 'Noch ' + leer + (leer === 1 ? ' Lücke' : ' Lücken') + ' leer. Bitte erst alle füllen.');
        let ok = 0;
        plaetze.forEach(p => {
          const k = p.querySelector('.ue-karte');
          const richtig = k.textContent.trim() === p.dataset.wort;
          k.classList.toggle('richtig', richtig);
          k.classList.toggle('falsch', !richtig);
          if (richtig) ok++;
        });
        return ok === plaetze.length ? geloest(el)
          : melden(el, ok + ' von ' + plaetze.length + ' Lücken richtig. Die roten Wörter passen nicht – tauschen und erneut prüfen.');
      }
      const rest = pool.querySelectorAll('.ue-karte').length;
      if (rest) return melden(el, 'Noch ' + rest + (rest === 1 ? ' Karte' : ' Karten') + ' übrig. Bitte erst alle verteilen.');
      let ok = 0;
      karten.forEach(k => {
        const z = k.closest('.ue-ziel');
        const richtig = Boolean(z) && Number(z.dataset.g) === loesung[Number(k.dataset.i)];
        k.classList.toggle('richtig', richtig);
        k.classList.toggle('falsch', !richtig);
        if (richtig) ok++;
      });
      return ok === karten.length ? geloest(el)
        : melden(el, ok + ' von ' + karten.length + ' richtig. Die rot markierten noch einmal verschieben und erneut prüfen.');
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
        const rand = randScroll();
        let y = e.clientY;
        const ordne = () => {
          const andere = [...liste.children].filter(x => x !== s);
          const vor = andere.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
          if (vor) { if (s.nextElementSibling !== vor) liste.insertBefore(s, vor); }
          else if (liste.lastElementChild !== s) liste.append(s);
        };
        const bewege = ev => {
          ev.preventDefault();
          y = ev.clientY;
          ordne();
          rand.setze(y, ordne);
        };
        const ende = () => {
          rand.stopp();
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
      return ok === schritte.length ? geloest(el)
        : melden(el, ok + ' von ' + schritte.length + ' an der richtigen Stelle. Die roten noch einmal verschieben und erneut prüfen.');
    });
    el.querySelector('.ue-neu').addEventListener('click', neu);
    neu();
  }

  function markieren(el) {
    const woerter = [...el.querySelectorAll('.ue-wort')];
    const ergebnis = el.querySelector('.ue-ergebnis');
    const zuruecksetzen = () => {
      woerter.forEach(w => w.classList.remove('richtig', 'falsch', 'verpasst'));
      ergebnis.textContent = '';
    };
    woerter.forEach(w => {
      w.setAttribute('aria-pressed', 'false');
      w.addEventListener('click', () => {
        w.setAttribute('aria-pressed', String(w.getAttribute('aria-pressed') !== 'true'));
        zuruecksetzen();
      });
    });
    // words of one answer form a group: one tapped word finds the whole answer
    const gruppen = {};
    woerter.forEach(w => { if (w.dataset.z === '1') (gruppen[w.dataset.g] = gruppen[w.dataset.g] || []).push(w); });
    const an = w => w.getAttribute('aria-pressed') === 'true';
    el.querySelector('.ue-pruefen').addEventListener('click', () => {
      let gefunden = 0, zuviel = 0;
      const gesamt = Object.keys(gruppen).length;
      zuruecksetzen();
      Object.values(gruppen).forEach(g => {
        const ok = g.some(an);
        if (ok) gefunden++;
        g.forEach(w => w.classList.add(ok ? 'richtig' : 'verpasst'));
      });
      woerter.forEach(w => {
        if (w.dataset.z !== '1' && an(w)) { zuviel++; w.classList.add('falsch'); }
      });
      if (gefunden === gesamt && !zuviel) return geloest(el);
      return melden(el, gefunden + ' von ' + gesamt + ' gefunden' + (zuviel ? ', ' + zuviel + ' zu viel markiert' : '')
        + '. Gestrichelt: noch nicht gefunden. Rot: passt nicht.');
    });
    el.querySelector('.ue-neu').addEventListener('click', () => {
      woerter.forEach(w => w.setAttribute('aria-pressed', 'false'));
      zuruecksetzen();
    });
  }

  document.querySelectorAll('.uebung').forEach(el => {
    el.classList.add('ue-aktiv');
    const typ = el.dataset.typ;
    if (typ === 'reihenfolge') reihenfolge(el);
    else if (typ === 'markieren') markieren(el);
    else karten(el, typ === 'luecken');
  });
})();
