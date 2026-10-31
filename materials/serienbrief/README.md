# Lesson kit: Bewerbung auf Knopfdruck (Excel list + Word mail merge)

Files for lesson 1 of the EDV-Kurs (`site/content/edv-kurs/bewerbung-auf-knopfdruck.md` publishes them).
Participants build an address list of job offers in Excel and turn it into cover letters with Word's
*Serienbrief* (mail merge). Principle taught: **what stays the same → Word, what changes → Excel.**

## Files

| Folder | File | Purpose |
|---|---|---|
| `1_Fuer_Teilnehmende_auf_jeden_PC/` | `Bewerbungsliste.xlsx` | data source, 5 fictional sample rows |
| | `Anschreiben_Uebung.docx` | letter with `[placeholders]` participants replace by merge fields |
| | `Anschreiben_Loesung.docx` | same letter, merge fields already inserted (demo, fallback) |
| `2_Zum_Ausdrucken/` | `Anleitung_Serienbrief` (.docx/.pdf) | 3-page handout |
| | `Feedbackbogen` (.docx/.pdf) | 1-page evaluation by participants |
| `3_Fuer_Trainer/` | `Ablaufplan_EDV-Tag` (.docx/.pdf) | day plan, preparation checklist, pitfalls |
| | `Beispiel_Ergebnis.pdf` | the 5 merged letters |

All companies and people are fictional. The three files in folder 1 must stay in one folder.

## Excel list: rules that keep the mail merge reliable

- **One sheet only** (`Bewerbungen`, shown in Word as `Bewerbungen$`), headers in row 1, no spaces or umlauts in
  headers (they become field names: `Firma, Anrede, Vorname, Nachname, Strasse, PLZ, Ort, Stelle, Ansprechpartner,
  Briefanrede, Quelle, Beworben_am, Status`). No print titles or other defined names: they appear as extra
  tables in Word's picker.
- **Never format or pre-fill empty rows.** Word reads Excel's used range; formatted or formula rows below the data
  become blank letters. Formats for new rows sit on the column (PLZ as text `@`, Beworben_am as date).
- **Formula columns** (grey headers): `Ansprechpartner = TRIM(Anrede Vorname Nachname)` (one column, so Word drops
  the line when it is empty); `Briefanrede = IF(Firma="","",IF(Frau…,IF(Herr…,"Sehr geehrte Damen und Herren")))`.
- **Cached values are written into the file.** Word reads stored results and never recalculates; openpyxl
  writes none, so `make_xlsx.py` injects them.
- Dropdowns: Anrede (`Frau,Herr`), Status (`offen,Einladung,Absage,Zusage`).

## Word letters

- DIN 5008 form B on A4: margins top 45 mm, left 25 mm, right 20 mm; a fixed 17.7 mm empty line puts the address
  at 62.7 mm (window envelope). Sender in the header, phone/e-mail in the footer, date as `DATE \@ "dd.MM.yyyy"`.
- Merge fields are complex fields (`fldChar`), the form Word saves. The templates are **not connected** to a
  data source: Word would store an absolute path that breaks on other PCs. Fields bind by name once the
  participant picks the list.
- Placeholders are not highlighted: highlighting would be inherited by the inserted fields and printed.

## Office behaviour participants meet (also in the lesson's help section)

- Connecting the list shows no visible change; the Mailings buttons just become active.
- Reopening a connected letter asks about an "SQL-Befehl": answer **Ja**.
- Files from the internet open in Protected View; the Mailings buttons stay grey until "Bearbeitung aktivieren".
- Excel must be saved and closed before Word reads the list.
- DATE fields keep updating in merged letters; Strg+A, Strg+Umschalt+F9 turns them into text.

## Rebuilding the files

`generator/build_kit.sh` regenerates every file into this folder. It needs Python 3 with openpyxl and Pillow,
Node 18+ with npm, and LibreOffice (`soffice`) for the PDFs. It is not part of CI. Open every regenerated file in
real Word and Excel and do one full mail merge before committing.
