# Bewerbungshelfer (lesson 2)

A small Windows program that turns an Excel list into ready-made application letters. The lesson page is
`site/content/edv-kurs/bewerbungshelfer.md`; the download is one ZIP with these four files:

| File | What it is |
|---|---|
| `Bewerbungen_erstellen.exe` | the program; **not in git**, built by `build_exe.sh` (CI runs it before the site build) |
| `Bewerbungsliste.xlsx` | sheet "Meine Daten" (the applicant, filled in once) and sheet "Bewerbungen" (one company per row, fictional samples) |
| `Anschreiben_Vorlage.docx` | the letter with `[Platzhalter]`; same DIN 5008 layout as lesson 1 |
| `LIES_MICH.txt` | four steps in German, Windows line endings |

## What the program does

- Reads `Bewerbungsliste.xlsx` next to the exe (not the working directory), checks that "Meine Daten" is complete.
- One letter per row with a company and Status empty or "offen", written to `Bewerbungen/` as
  `Anschreiben <Name> – <Firma> (<Stelle>).docx`. Existing files are never overwritten.
- Fills `[Firma] [Ansprechpartner] [Strasse] [PLZ] [Ort] [Stelle] [Briefanrede] [Datum]` and
  `[Mein Name] [Meine Straße] [Meine PLZ und Ort] [Mein Wohnort] [Mein Telefon] [Meine E-Mail]` in body, headers
  and footers, also when Word has split a placeholder across text runs. Unknown brackets (the yellow
  "[Hier schreiben Sie …]") stay. A paragraph that only held an empty placeholder is removed (no contact person).
- Works out salutation and contact line itself, so the list needs no formulas; restores a lost leading zero of a PLZ.
- Works offline, writes nothing else, opens the folder in Explorer when new letters exist.
- Unsigned: Windows SmartScreen asks once ("Trotzdem ausführen"); the lesson explains this.

## Rebuilding

- Program: `./build_exe.sh` (Go ≥ 1.21; runs vet and the unit tests, then cross-compiles for Windows x64).
- Excel list: `python3 generator/make_liste.py Bewerbungsliste.xlsx` (`--beispiel` fills "Meine Daten" for tests).
  The labels in column A of "Meine Daten" must match `meineDaten` in `programm/main.go`.
- Template: `materials/serienbrief/generator/build_docs.js` writes it (mode `vorlage`) together with the lesson 1 files.

Test every change end to end on a real Windows PC with Word before publishing.
