#!/usr/bin/env bash
# Rebuilds every file of the Serienbrief lesson kit into materials/serienbrief/.
# Needs: Python 3 with openpyxl and Pillow, Node 18+ with npm, LibreOffice (soffice).
set -euo pipefail
cd "$(dirname "$0")"
KIT=..
TN="$KIT/1_Fuer_Teilnehmende_auf_jeden_PC"

npm install --no-audit --no-fund --silent
python3 make_xlsx.py "$TN/Bewerbungsliste.xlsx" >/dev/null
python3 smileys.py
node build_docs.js "$KIT" >/dev/null
python3 complex_fields.py "$TN/Anschreiben_Uebung.docx" "$TN/Anschreiben_Loesung.docx" >/dev/null
soffice --headless --convert-to pdf --outdir "$KIT/2_Zum_Ausdrucken" \
  "$KIT/2_Zum_Ausdrucken/Anleitung_Serienbrief.docx" "$KIT/2_Zum_Ausdrucken/Feedbackbogen.docx" >/dev/null
soffice --headless --convert-to pdf --outdir "$KIT/3_Fuer_Trainer" \
  "$KIT/3_Fuer_Trainer/Ablaufplan_EDV-Tag.docx" Beispiel_Ergebnis.docx >/dev/null
rm -f Beispiel_Ergebnis.docx smiley_*.png
echo "Kit rebuilt in materials/serienbrief/. Check every file in real Word and Excel before committing."
