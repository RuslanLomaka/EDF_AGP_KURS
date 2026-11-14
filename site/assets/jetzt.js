// Teacher view only: the "Jetzt" bar. It reads the timetable of the lesson plan and shows what is planned right now
// and how many minutes are left, plus a countdown timer (15 or 5 minutes). Plans that start at "0:00" begin with
// "▶ Start". Uses only the device clock; nothing is stored or sent.
(function () {
  const leiste = document.querySelector('.jetzt');
  if (!leiste) return;
  let plan;
  try { plan = JSON.parse(leiste.dataset.plan); } catch (e) { return; }
  const text = leiste.querySelector('.jetzt-text');
  const start = leiste.querySelector('.jetzt-start');
  const min = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const zeiten = plan.map(([t]) => min(t));
  const relativ = zeiten[0] === 0;
  // the last row lasts 15 minutes, unless it is the end itself
  const ende = zeiten[zeiten.length - 1] + (/^Ende/.test(plan[plan.length - 1][1]) ? 0 : 15);
  let beginn = null;  // relative plans: the minute "▶ Start" was tapped
  const uhr = d => d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  const kurz = s => s.length > 70 ? s.slice(0, 68) + ' …' : s;

  function zeige() {
    const d = new Date();
    const jetzt = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    let t;
    if (relativ) {
      if (beginn === null) { text.textContent = 'Zeitplan: Tippen Sie auf „Start“, wenn die Stunde beginnt.'; return; }
      t = jetzt - beginn;
    } else {
      t = jetzt;
    }
    if (t < zeiten[0]) { text.textContent = uhr(d) + ' · Beginn laut Plan um ' + plan[0][0] + ': ' + kurz(plan[0][1]); return; }
    if (t >= ende) { text.textContent = uhr(d) + ' · Der Plan ist zu Ende.'; return; }
    let i = 0;
    while (i + 1 < zeiten.length && t >= zeiten[i + 1]) i++;
    const bis = i + 1 < zeiten.length ? zeiten[i + 1] : ende;
    const rest = Math.max(0, Math.ceil(bis - t));
    text.textContent = uhr(d) + ' · Laut Plan: ' + kurz(plan[i][1]) + ' · noch ' + rest + ' Min.'
      + (i + 1 < plan.length ? ' · Danach: ' + kurz(plan[i + 1][1]) : '');
  }
  if (relativ) {
    start.hidden = false;
    start.addEventListener('click', () => {
      const d = new Date();
      beginn = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      start.textContent = '↺ Neu starten';
      zeige();
    });
  }

  // countdown timer
  let timer = null, endeTimer = 0, aktiverKnopf = null;
  const stoppTimer = () => {
    clearInterval(timer);
    timer = null;
    leiste.classList.remove('um');
    if (aktiverKnopf) aktiverKnopf.textContent = (aktiverKnopf.dataset.min === '15' ? '⏱ ' : '') + aktiverKnopf.dataset.min + ' Min.';
    aktiverKnopf = null;
  };
  leiste.querySelectorAll('.jetzt-timer').forEach(k => k.addEventListener('click', () => {
    const war = aktiverKnopf;
    stoppTimer();
    if (war === k) return;  // tapping the running timer stops it
    aktiverKnopf = k;
    endeTimer = Date.now() + Number(k.dataset.min) * 60000;
    const tick = () => {
      const s = Math.round((endeTimer - Date.now()) / 1000);
      if (s <= 0) {
        k.textContent = 'Zeit um!';
        leiste.classList.add('um');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        clearInterval(timer);
        return;
      }
      k.textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    };
    tick();
    timer = setInterval(tick, 1000);
  }));
  zeige();
  setInterval(zeige, 20000);
})();
