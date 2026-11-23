// Builds the four printable PDFs for the article "Das Vorstellungsgespräch" (A4, German, B1).
// Usage (from the repository root): node materials/vorstellungsgespraech/generator/erstellen.cjs
// Needs Playwright with Chromium (require('playwright')). All names and companies are invented.
const path = require('path');
const { chromium } = require('playwright');

const ZIEL = path.join(__dirname, '..');
const ADRESSE = 'edv.ruslanlomaka.org/artikel/vorstellungsgespraech/';

const CSS = `
@page { size: A4; margin: 12mm 13mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, "Liberation Sans", Helvetica, sans-serif; color: #1d232b; font-size: 12pt; line-height: 1.4; }
h1 { font-size: 20pt; color: #1f4e79; margin: 0 0 1mm; }
h2 { font-size: 13pt; color: #1f4e79; margin: 4mm 0 1.5mm; }
.unter { color: #5b6672; margin: 0 0 3mm; }
.kasten { border: 1.5px solid #cfe0f1; background: #f5f9fd; border-radius: 3mm; padding: 2.5mm 4mm; margin-bottom: 3mm; }
.rot { border-color: #f1b8b1; background: #fdecea; }
ul.haken { list-style: none; padding: 0; margin: 0; }
ul.haken li { position: relative; padding: 1mm 0 1mm 8mm; }
ul.haken li::before { content: ""; position: absolute; left: 0; top: 1.4mm; width: 4.2mm; height: 4.2mm; border: 1.5px solid #1f4e79; border-radius: 1mm; background: #fff; }
.spalten { display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm; }
.zeile { display: flex; gap: 3mm; align-items: flex-end; margin: 3mm 0; }
.zeile span { white-space: nowrap; }
.zeile i { flex: 1; border-bottom: 1px solid #8a94a0; height: 5mm; }
.linie { border-bottom: 1px solid #8a94a0; height: 10mm; }
.hilfe { font-size: 9.5pt; color: #5b6672; margin: 0.5mm 0 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #8a94a0; padding: 2.6mm 2.5mm; vertical-align: top; text-align: left; }
th { background: #e8f0f8; font-size: 10.5pt; }
.seite { page-break-after: always; }
.seite:last-child { page-break-after: auto; }
`;

function seite(titel, inhalt) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${titel}</title><style>${CSS}</style></head>
<body>${inhalt}</body></html>`;
}

const haken = (punkte) => `<ul class="haken">${punkte.map((p) => `<li>${p}</li>`).join('')}</ul>`;
const zeile = (label) => `<div class="zeile"><span>${label}</span><i></i></div>`;
const linien = (n) => '<div class="linie"></div>'.repeat(n);

// 1 -- checklist, one page
const checkliste = seite('Checkliste Vorstellungsgespräch', `
<style>body { font-size: 11.5pt; } ul.haken li { padding: 0.7mm 0 0.7mm 8mm; } h2 { margin-top: 3mm; }</style>
<h1>Checkliste: Mein Vorstellungsgespräch</h1>
<p class="unter">Haken Sie ab, was Sie erledigt haben.</p>
<div class="kasten">
  <div class="spalten">
    <div>${zeile('Firma:')}${zeile('Stelle:')}${zeile('Datum, Uhrzeit:')}${zeile('Ansprechperson:')}</div>
    <div>${zeile('Adresse:')}${zeile('Telefon der Firma:')}${zeile('Bus/Bahn, Abfahrt:')}${zeile('Vor Ort / Video / Telefon:')}</div>
  </div>
</div>
<div class="spalten">
<div>
<h2>Ein paar Tage vorher</h2>
${haken(['Stellenanzeige gelesen: Was <b>muss</b> ich können?', 'Website der Firma angesehen', 'Pitch geübt – 60 Sekunden, ohne Zettel', '3 Stärken – jede mit einem Beispiel', '1 kleine Schwäche – und mein Plan dagegen', '2 oder 3 STAR-Geschichten vorbereitet', '3 eigene Fragen an die Firma notiert', 'Gehalt im Entgeltatlas nachgesehen (brutto)', 'Fahrtkosten: Firma gefragt – oder <b>vor</b> der Fahrt bei Agentur für Arbeit / Jobcenter beantragt'])}
<h2>Am Tag davor</h2>
${haken(['Weg geplant – mit 30 Minuten Puffer', 'Mappe: Lebenslauf, Anschreiben, Zeugnisse (Kopien)', 'Übersetzungen und Bescheid über die Anerkennung', 'Ausweis und Aufenthaltstitel', 'Notizzettel und Stift', 'Kleidung bereitgelegt', 'Handy geladen, Wecker gestellt', 'Video: Link, Kamera, Mikrofon getestet'])}
</div>
<div>
<h2>Am Tag selbst</h2>
${haken(['Etwa 10 Minuten vor dem Termin da', 'Zu spät? <b>Sofort anrufen</b>', 'Handy lautlos und in der Tasche', 'Freundlich zu allen – auch am Empfang', 'Begrüßung: Name sagen, Blickkontakt', 'Nachfragen, wenn ich etwas nicht verstehe', 'Am Ende: eigene Fragen stellen', 'Fragen: Wie geht es weiter? Bis wann?'])}
<h2>Danach</h2>
${haken(['Notizen: Welche Fragen kamen? Was lief gut?', 'Danke-E-Mail geschrieben (am selben oder nächsten Tag)', 'Fahrkarten aufgehoben', 'Probearbeit? Mit Bürgergeld oder Arbeitslosengeld <b>vorher</b> genehmigen lassen', 'Zusage? Vertrag in Ruhe lesen – und Agentur für Arbeit / Jobcenter informieren'])}
<div class="kasten rot" style="margin-top:3mm">
<b>Verbotene Frage gehört?</b> (z. B. „Sind Sie schwanger?“)<br>
Sie müssen nicht antworten. Schreiben Sie auf: Datum, Uhrzeit, wer gefragt hat, die genaue Frage, wer dabei war.
Bei einer Absage: <b>2 Monate</b> Zeit, sich schriftlich zu beschweren. Beratung ist kostenlos.
</div>
</div>
</div>`);

// 2 -- 24 cards to cut out: 12 interview questions, 4 jokers, 6 own questions, 2 empty
const KARTEN = [
  ['firma', 'Erzählen Sie etwas über sich.', 'heute – früher – Ziel, 1 bis 2 Minuten'],
  ['firma', 'Warum möchten Sie bei uns arbeiten?', 'Eine Sache über die Firma nennen'],
  ['firma', 'Was sind Ihre Stärken?', '2 oder 3 Stärken – jede mit Beispiel'],
  ['firma', 'Was sind Ihre Schwächen?', 'Eine kleine Schwäche und Ihr Plan dagegen'],
  ['firma', 'Warum haben Sie eine Lücke im Lebenslauf?', 'Kurz, ehrlich: Was haben Sie in der Zeit gemacht?'],
  ['firma', 'Wie gut ist Ihr Deutsch?', 'Niveau, Zertifikat, wie Sie weiterlernen'],
  ['firma', 'Dürfen Sie in Deutschland arbeiten?', 'Erlaubte Frage – Aufenthaltstitel nennen'],
  ['firma', 'Was möchten Sie verdienen?', 'Betrag brutto, pro Monat oder Stunde'],
  ['firma', 'Erzählen Sie von einem Problem bei der Arbeit. Was haben Sie gemacht?', 'STAR: Situation, Aufgabe, Aktion, Resultat'],
  ['firma', 'Wann können Sie anfangen?', 'Ein genaues Datum nennen'],
  ['firma', 'Können Sie im Schichtdienst oder am Wochenende arbeiten?', 'Ehrlich antworten, Grenzen klar sagen'],
  ['firma', 'Warum haben Sie Ihre letzte Stelle verlassen?', 'Nicht schlecht über alte Chefs sprechen'],
  ['joker', 'Sind Sie schwanger?', 'Ruhig bleiben – höflich zur Arbeit zurück'],
  ['joker', 'Planen Sie, bald Kinder zu bekommen?', 'Ruhig bleiben – höflich zur Arbeit zurück'],
  ['joker', 'Welche Religion haben Sie?', 'Ruhig bleiben – höflich zur Arbeit zurück'],
  ['joker', 'Woher kommen Ihre Eltern?', 'Ruhig bleiben – höflich zur Arbeit zurück'],
  ['eigen', 'Wie sieht ein normaler Arbeitstag aus?', ''],
  ['eigen', 'Wie werde ich eingearbeitet?', ''],
  ['eigen', 'Wie groß ist das Team?', ''],
  ['eigen', 'Wie sind die Arbeitszeiten? Gibt es Schichten?', ''],
  ['eigen', 'Gibt es Weiterbildungen?', ''],
  ['eigen', 'Wie geht es nach dem Gespräch weiter?', ''],
  ['eigen', '', 'Meine eigene Frage'],
  ['eigen', '', 'Meine eigene Frage'],
];
const ART = {
  firma: ['Frage der Firma', '#1f4e79', '#e8f0f8'],
  joker: ['JOKER: Verbotene Frage!', '#c0392b', '#fdecea'],
  eigen: ['Ihre Frage an die Firma', '#2e7d32', '#e6f4ea'],
};
const KARTEN_CSS = `
.blatt { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 63mm); border-top: 1px dashed #8a94a0; border-left: 1px dashed #8a94a0; }
.karte { border-right: 1px dashed #8a94a0; border-bottom: 1px dashed #8a94a0; padding: 5mm 6mm; display: flex; flex-direction: column; }
.art { font-size: 9.5pt; font-weight: 700; letter-spacing: 0.02em; padding: 1mm 3mm; border-radius: 2mm; align-self: flex-start; }
.frage { font-size: 15.5pt; font-weight: 700; margin: auto 0; line-height: 1.25; }
.tipp { font-size: 9.5pt; color: #5b6672; }
.leer { border-bottom: 1px solid #8a94a0; height: 9mm; }
.schere { font-size: 9pt; color: #5b6672; margin: 0 0 2mm; }`;
let blaetter = '';
for (let i = 0; i < KARTEN.length; i += 8) {
  const karten = KARTEN.slice(i, i + 8).map(([art, frage, tipp]) => {
    const [name, farbe, hell] = ART[art];
    const mitte = frage ? `<div class="frage">„${frage}“</div>` : '<div style="margin:auto 0"><div class="leer"></div><div class="leer"></div></div>';
    return `<div class="karte"><div class="art" style="color:${farbe};background:${hell}">${name}</div>${mitte}<div class="tipp">${tipp ? (art === 'joker' ? 'Bewerber/in: ' : art === 'eigen' ? '' : 'Tipp: ') + tipp : '&nbsp;'}</div></div>`;
  }).join('');
  blaetter += `<div class="seite"><p class="schere">✂ Entlang der gestrichelten Linien ausschneiden · Blatt ${i / 8 + 1} von 3</p><div class="blatt">${karten}</div></div>`;
}
const fragenkarten = seite('Fragenkarten', `<style>${KARTEN_CSS}</style>${blaetter}`);

// 3 -- worksheet: pitch, strengths, weakness, one STAR story, own questions (two pages)
const arbeitsblatt = seite('Arbeitsblatt Pitch', `
<div class="seite">
<h1>Mein 60-Sekunden-Pitch</h1>
<p class="unter">Für die Frage „Erzählen Sie etwas über sich.“ – beruflich, nicht privat. Namen und Firmen dürfen erfunden sein.</p>
<h2>1 · Heute: Was mache ich gerade?</h2>
<p class="hilfe">Zurzeit mache ich … / Zurzeit arbeite ich als … / Ich habe gerade … abgeschlossen.</p>
${linien(4)}
<h2>2 · Früher: Was habe ich gelernt und gearbeitet?</h2>
<p class="hilfe">In … habe ich … Jahre als … gearbeitet. Dort habe ich … gemacht. Ich habe eine Ausbildung / ein Studium als … .</p>
${linien(5)}
<h2>3 · Ziel: Was möchte ich jetzt – und warum passe ich?</h2>
<p class="hilfe">Jetzt möchte ich als … arbeiten, weil … . Meine Stärken sind … .</p>
${linien(4)}
<h2>Üben</h2>
${haken(['Dreimal laut gelesen', 'Ohne Zettel gesprochen', 'Zu zweit geübt – Zeit: ______ Sekunden (Ziel: 60)'])}
<div class="kasten" style="margin-top:3mm">${zeile('Gut war:')}${zeile('Mein Tipp:')}</div>
</div>
<div class="seite">
<h1>Meine Antworten</h1>
<h2>Meine Stärken – mit Beispiel</h2>
<table><tr><th style="width:32%">Stärke</th><th>Beispiel aus meiner Arbeit oder meinem Leben</th></tr>
<tr><td style="height:14mm"></td><td></td></tr><tr><td style="height:14mm"></td><td></td></tr><tr><td style="height:14mm"></td><td></td></tr></table>
<h2>Eine Schwäche – und mein Plan dagegen</h2>
<p class="hilfe">Eine echte, kleine Schwäche. Nicht: „Ich bin zu perfekt.“</p>
${linien(2)}
<h2>Warum diese Firma?</h2>
<p class="hilfe">Eine Sache, die ich über die Firma weiß – und warum sie zu mir passt.</p>
${linien(2)}
<h2>Eine Geschichte nach der STAR-Methode</h2>
<table>
<tr><th style="width:32%">S – Situation<br><span class="hilfe">Was war los?</span></th><td style="height:14mm"></td></tr>
<tr><th>T – Aufgabe<br><span class="hilfe">Was sollte ich tun?</span></th><td style="height:14mm"></td></tr>
<tr><th>A – Aktion<br><span class="hilfe">Was habe <b>ich</b> gemacht?</span></th><td style="height:24mm"></td></tr>
<tr><th>R – Resultat<br><span class="hilfe">Wie ist es ausgegangen?</span></th><td style="height:14mm"></td></tr>
</table>
<h2>Meine Fragen an die Firma</h2>
${zeile('1.')}${zeile('2.')}${zeile('3.')}
</div>`);

// 4 -- observation sheet for the role play, one page per round
const KRITERIEN = [
  ['Begrüßung', 'Name gesagt, Blickkontakt, freundlich'],
  ['Pitch', 'heute – früher – Ziel, nicht länger als 2 Minuten'],
  ['Stärken', 'mit einem Beispiel'],
  ['Schwäche', 'klein und ehrlich, mit Plan'],
  ['STAR-Beispiel', 'klare Geschichte, „ich“ statt „wir“'],
  ['Joker', 'verbotene Frage erkannt, ruhig reagiert'],
  ['Sprache', 'deutlich, nicht zu schnell, nachgefragt wenn nötig'],
  ['Körpersprache', 'aufrecht, Blickkontakt, ruhige Hände'],
  ['Eigene Fragen', 'mindestens 2 Fragen gestellt'],
  ['Abschluss', 'bedankt und verabschiedet'],
];
const beobachtung = seite('Beobachtungsbogen', `
<h1>Beobachtungsbogen: Rollenspiel</h1>
<p class="unter">Sie beobachten und sagen während des Gesprächs nichts. Machen Sie in jeder Zeile ein Kreuz.</p>
<div class="spalten" style="margin-bottom:2mm"><div>${zeile('Runde:')}</div><div>${zeile('Bewerber/in (Vorname):')}</div></div>
<table>
<tr><th style="width:24%">Was?</th><th>Darauf achten Sie</th><th style="width:11%;text-align:center">gut</th><th style="width:11%;text-align:center">geht so</th><th style="width:11%;text-align:center">üben</th></tr>
${KRITERIEN.map(([was, worauf]) => `<tr><td><b>${was}</b></td><td>${worauf}</td><td></td><td></td><td></td></tr>`).join('')}
</table>
<h2>2 Dinge waren gut</h2>
${zeile('1.')}${zeile('2.')}
<h2>1 Tipp für das nächste Mal</h2>
${linien(3)}
<div class="kasten" style="margin-top:4mm"><b>Feedback-Regel:</b> Erst 2 gute Dinge, dann 1 Tipp. Sagen Sie genau, was Sie gesehen oder gehört haben –
zum Beispiel „Ihr Beispiel mit dem Lager war sehr klar.“ Nie: „Das war schlecht.“</div>`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, html] of [['checkliste', checkliste], ['fragenkarten', fragenkarten],
    ['arbeitsblatt-pitch', arbeitsblatt], ['beobachtungsbogen', beobachtung]]) {
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: path.join(ZIEL, `${name}.pdf`), format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;margin:0 13mm;font:8px Arial,'Liberation Sans',sans-serif;color:#5b6672;display:flex;justify-content:space-between">
        <span>Kursmaterial: Das Vorstellungsgespräch – gut vorbereitet</span><span>${ADRESSE} · Seite <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
    });
    console.log(`${name}.pdf`);
  }
  await browser.close();
})();
