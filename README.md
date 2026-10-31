# Kursmaterial

Unterlagen und Übungen aus unserem Kurs – einfach erklärt: **https://edv.ruslanlomaka.org**

- **EDV-Kurs:** Lektionen zum Mitmachen am Computer, mit Übungsdateien. Lektion 1: „Bewerbung auf Knopfdruck“
  (Serienbrief mit Excel und Word). Texte in [`site/content/edv-kurs`](site/content/edv-kurs), Dateien in
  [`materials/serienbrief`](materials/serienbrief).
- **Artikel:** Arbeitsblätter aus dem Kurs als kurze Artikel, mit Suche. Texte in
  [`site/content/artikel`](site/content/artikel).

## Website bauen

```bash
python3 site/build.py   # braucht pandoc und PyYAML; Ergebnis in site/dist/
```

Jeder Push auf `main` baut die Seite und veröffentlicht sie automatisch.
