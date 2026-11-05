"""Builds Bewerbungsliste.xlsx for the Bewerbungshelfer program.

Two sheets: "Meine Daten" (filled in once) and "Bewerbungen" (one company per row). The program
reads the cells directly and works out salutations itself, so this list needs no formulas.
Usage: python3 make_liste.py <out.xlsx> [--beispiel]   (--beispiel fills "Meine Daten" with Max Mustermann)
"""
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

OUT = sys.argv[1]
BEISPIEL = "--beispiel" in sys.argv[2:]
FONT = "Arial"
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
blue = PatternFill("solid", fgColor="1F4E79")
green = PatternFill("solid", fgColor="548235")
input_fill = PatternFill("solid", fgColor="FFF2CC")

# Labels must match the program (main.go, meineDaten).
MEINE_DATEN = [
    ("Vorname und Nachname", "Max Mustermann"),
    ("Straße und Hausnummer", "Musterweg 1"),
    ("PLZ und Wohnort", "25813 Husum"),
    ("Telefon", "0123 456789"),
    ("E-Mail", "max.mustermann@example.com"),
]

HEADERS = [
    ("Firma", 34, blue, "Name der Firma, genau wie in der Stellenanzeige."),
    ("Anrede", 10, blue, "Frau oder Herr auswählen (Pfeil rechts in der Zelle).\nLeer lassen, wenn kein Name in der Anzeige steht."),
    ("Vorname", 12, blue, "Vorname der Ansprechperson (kann leer bleiben)."),
    ("Nachname", 14, blue, "Nachname der Ansprechperson (kann leer bleiben)."),
    ("Strasse", 24, blue, "Straße und Hausnummer der Firma."),
    ("PLZ", 8, blue, "Postleitzahl der Firma."),
    ("Ort", 14, blue, "Ort der Firma."),
    ("Stelle", 22, blue, "Name der Stelle, z. B. Lagerhelfer.\nErscheint im Betreff: Bewerbung als ..."),
    ("Quelle", 26, green, "Wo haben Sie die Stelle gefunden?\n(Nur für Ihre Übersicht, nicht im Brief.)"),
    ("Beworben_am", 13, green, "Datum der Bewerbung.\nHilft beim Nachweis für das Jobcenter."),
    ("Status", 12, green, "offen = Brief wird erstellt.\nbeworben, Einladung, Absage, Zusage = kein neuer Brief."),
]

# Fictional sample data (no real companies, no real people), as in the Serienbrief lesson.
ROWS = [
    ["Muster Logistik GmbH", "Frau", "Anna", "Petersen", "Am Musterhafen 12", "25813", "Husum", "Lagerhelfer", "Jobbörse Arbeitsagentur", None, "offen"],
    ["Bäckerei Beispiel KG", "Herr", "Jens", "Hansen", "Beispielweg 3", "25821", "Bredstedt", "Verkäufer", "Aushang im Laden", None, "offen"],
    ["Pflegedienst Muster gGmbH", "Frau", "Maria", "Jensen", "Musterstraße 45", "25899", "Niebüll", "Pflegehelfer", "Firmen-Website", None, "offen"],
    ["Hotel Beispiel am Hafen", None, None, None, "Probeallee 7", "25832", "Tönning", "Küchenhilfe", "Zeitung", None, "offen"],
    ["Muster Gebäudeservice GmbH", "Herr", "Thomas", "Möller", "Beispielring 21", "24937", "Flensburg", "Hausmeister", "Jobbörse Arbeitsagentur", date(2026, 10, 28), "beworben"],
]


def meine_daten(ws):
    ws.title = "Meine Daten"
    ws["A1"] = "Meine Daten – einmal ausfüllen"
    ws["A1"].font = Font(name=FONT, bold=True, size=14, color="1F4E79")
    ws["A2"] = "Diese Angaben stehen in jedem Brief oben und unten. Schreiben Sie in die gelben Felder."
    ws["A2"].font = Font(name=FONT, italic=True, color="595959")
    for col, text in (("A", "Angabe"), ("B", "Ihre Daten"), ("C", "Beispiel")):
        c = ws[f"{col}4"]
        c.value = text
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = blue
        c.border = border
    for i, (label, beispiel) in enumerate(MEINE_DATEN, start=5):
        ws[f"A{i}"] = label
        ws[f"B{i}"] = beispiel if BEISPIEL else None
        ws[f"C{i}"] = beispiel
        ws[f"A{i}"].font = Font(name=FONT, bold=True)
        ws[f"B{i}"].font = Font(name=FONT)
        ws[f"B{i}"].fill = input_fill
        ws[f"C{i}"].font = Font(name=FONT, color="8C8C8C")
        for col in "ABC":
            ws[f"{col}{i}"].border = border
            ws[f"{col}{i}"].alignment = Alignment(vertical="center")
        ws.row_dimensions[i].height = 22
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 36
    ws.column_dimensions["C"].width = 30
    ws.sheet_view.zoomScale = 120


def bewerbungen(ws):
    letters = "ABCDEFGHIJK"
    for i, (name, width, fill, note) in enumerate(HEADERS):
        c = ws.cell(row=1, column=i + 1, value=name)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = fill
        c.border = border
        c.comment = Comment(note, "Bewerbungshelfer")
        c.comment.width, c.comment.height = 260, 90
        dim = ws.column_dimensions[letters[i]]
        dim.width = width
        dim.font = Font(name=FONT)
        if name == "PLZ":
            dim.number_format = "@"
        if name == "Beworben_am":
            dim.number_format = "DD.MM.YYYY"
    for r, row in enumerate(ROWS, start=2):
        for i, v in enumerate(row):
            c = ws.cell(row=r, column=i + 1, value=v)
            c.font = Font(name=FONT)
            c.border = border
            if HEADERS[i][0] == "PLZ":
                c.number_format = "@"
            if HEADERS[i][0] == "Beworben_am":
                c.number_format = "DD.MM.YYYY"
    dv = DataValidation(type="list", formula1='"Frau,Herr"', allow_blank=True, showErrorMessage=True,
                        errorTitle="Anrede", error="Bitte Frau oder Herr auswählen – oder leer lassen.")
    dv.add("B2:B500")
    st = DataValidation(type="list", formula1='"offen,beworben,Einladung,Absage,Zusage"', allow_blank=True)
    st.add("K2:K500")
    ws.add_data_validation(dv)
    ws.add_data_validation(st)
    ws.freeze_panes = "B2"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_view.zoomScale = 110


wb = Workbook()
meine_daten(wb.active)
bewerbungen(wb.create_sheet("Bewerbungen"))
wb.save(OUT)
print("wrote", OUT)
