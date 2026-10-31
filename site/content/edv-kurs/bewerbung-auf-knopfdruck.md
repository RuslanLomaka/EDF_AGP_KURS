---
title: "Bewerbung auf Knopfdruck"
untertitel: "Serienbrief mit Excel und Word"
slug: bewerbung-auf-knopfdruck
nummer: 1
dauer: "ca. 5 Stunden"
niveau: "Einsteiger"
kurz: "Sie legen in Excel eine Liste mit Firmen an. Word macht daraus mit einem Klick fertige Bewerbungsanschreiben."
ziele:
  - "eine Adressliste in Excel anlegen und pflegen"
  - "einen Brief in Word mit Kopf- und Fußzeile an Ihre Daten anpassen"
  - "Excel und Word zu einem Serienbrief verbinden"
  - "mit einem Klick alle Briefe erzeugen und als PDF speichern"
paket:
  name: Serienbrief-Uebungsdateien.zip
  titel: "Alle Übungsdateien herunterladen"
  dateien:
    - materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Bewerbungsliste.xlsx
    - materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Anschreiben_Uebung.docx
    - materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Anschreiben_Loesung.docx
dateien:
  - datei: materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Bewerbungsliste.xlsx
    titel: "Bewerbungsliste"
    text: "Excel-Liste mit 5 Beispiel-Firmen. Hier tragen Sie Ihre Stellen ein."
  - datei: materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Anschreiben_Uebung.docx
    titel: "Anschreiben zum Üben"
    text: "Ihr Brief mit Platzhaltern in [eckigen Klammern]."
  - datei: materials/serienbrief/1_Fuer_Teilnehmende_auf_jeden_PC/Anschreiben_Loesung.docx
    titel: "Anschreiben mit Lösung"
    text: "Der gleiche Brief – die Seriendruckfelder sind schon eingefügt."
  - datei: materials/serienbrief/2_Zum_Ausdrucken/Anleitung_Serienbrief.pdf
    titel: "Anleitung zum Ausdrucken"
    text: "Alle Schritte dieser Seite auf 3 Seiten."
  - datei: materials/serienbrief/3_Fuer_Trainer/Beispiel_Ergebnis.pdf
    titel: "Beispiel-Ergebnis"
    text: "So sehen die 5 fertigen Briefe aus."
lehrkraft:
  - datei: materials/serienbrief/3_Fuer_Trainer/Ablaufplan_EDV-Tag.pdf
    titel: "Ablaufplan für den Kurstag"
    text: "Zeitplan, Lernziele, Vorbereitung und typische Stolperfallen."
  - datei: materials/serienbrief/2_Zum_Ausdrucken/Feedbackbogen.pdf
    titel: "Feedbackbogen"
    text: "Bewertung durch die Teilnehmenden am Ende des Tages."
  - datei: materials/serienbrief/2_Zum_Ausdrucken/Anleitung_Serienbrief.docx
    titel: "Anleitung als Word-Datei"
    text: "Zum Anpassen und Ausdrucken."
---

::: kurz
**Die Idee**

- Was in **jedem Brief gleich** ist – Ihr Name, Ihre Adresse, der Gruß – schreiben Sie **einmal in Word**.
- Was sich **ändert** – Firma, Adresse, Ansprechperson, Stelle – steht **in Excel**, eine Zeile pro Firma.
- Word holt die Daten aus Excel und macht daraus **fertige Briefe**. Das heißt **Serienbrief**.
:::

<div class="prinzip">
<div><strong>Excel</strong>Firma, Ansprechperson, Adresse, Stelle<em>ändert sich</em></div>
<div class="zeichen">+</div>
<div><strong>Word</strong>Ihr Name, Ihre Adresse, Text, Gruß<em>bleibt gleich</em></div>
<div class="zeichen">=</div>
<div><strong>Fertige Briefe</strong>eine Seite pro Firma<em>mit einem Klick</em></div>
</div>

[![Ausschnitt aus einem fertigen Brief: Absender, Anschrift der Firma, Datum, Betreff „Bewerbung als Lagerhelfer“ und Anrede „Sehr geehrte Frau Petersen“](/edv-kurs/bilder/serienbrief-ergebnis.png)](dateien/Beispiel_Ergebnis.pdf)

So sieht ein fertiger Brief aus. Kopf, Anschrift, Betreff und Anrede kommen automatisch – den Text in der Mitte schreiben Sie selbst.

## Vorbereitung {#vorbereitung}

::: schritte
1. Laden Sie oben die **Übungsdateien** herunter (ZIP).
2. Rechtsklick auf die ZIP-Datei → **Alle extrahieren** → z. B. in den Ordner **Dokumente\\Bewerbung**.
3. Die drei Dateien müssen im **gleichen Ordner** bleiben. Verschieben oder umbenennen Sie sie später nicht.
:::

## Teil 1 – Excel: die Adressliste {#excel}

::: schritte
1. Öffnen Sie **Bewerbungsliste.xlsx** mit einem Doppelklick.
2. Steht oben ein gelber Balken **Geschützte Ansicht**? Klicken Sie auf **Bearbeitung aktivieren**.
3. Schauen Sie die Liste an: Jede **Zeile** ist eine Firma. Jede **Spalte** ist eine Information.
4. Überschreiben Sie die Beispiel-Firmen mit **Ihren** Stellenanzeigen. Füllen Sie nur die Spalten mit **blauer** Überschrift aus.
5. **Anrede:** In die Zelle klicken → kleiner Pfeil → **Frau** oder **Herr**. Kein Name in der Anzeige? Dann Anrede, Vorname und Nachname leer lassen.
6. Die Spalten mit **grauer** Überschrift (Ansprechpartner, Briefanrede) füllen sich **von selbst**. Bitte nicht hineinschreiben.
7. Mehr als 5 Firmen? Markieren Sie die zwei grauen Zellen der letzten Zeile. Ziehen Sie das **kleine Quadrat unten rechts** (Ausfüllkästchen) nach unten – nur so weit, wie Firmen da sind.
8. Speichern mit **Strg + S**. Dann **Excel schließen** (X oben rechts).
:::

::: info
**Die 5 goldenen Regeln für eine Adressliste**

1. In **Zeile 1** stehen die Überschriften – kurz und ohne Leerzeichen.
2. **Eine Zeile = eine Firma.**
3. **Keine leeren Zeilen** zwischen den Firmen.
4. **Keine verbundenen Zellen.**
5. Die **PLZ als Text** speichern, sonst wird aus 01067 → 1067. In der Bewerbungsliste ist das schon eingestellt.
:::

<details>
<summary>Für Neugierige: Wie funktionieren die grauen Spalten?</summary>

In den grauen Spalten stehen **Formeln**. Klicken Sie in eine graue Zelle – oben in der Bearbeitungsleiste sehen Sie die Formel.

- **Ansprechpartner:** `=GLÄTTEN(B2&" "&C2&" "&D2)` – verbindet Anrede, Vorname und Nachname zu „Frau Anna Petersen“. GLÄTTEN entfernt überflüssige Leerzeichen.
- **Briefanrede:** `=WENN(B2="Frau";"Sehr geehrte Frau "&D2;WENN(B2="Herr";"Sehr geehrter Herr "&D2;"Sehr geehrte Damen und Herren"))` – WENN prüft die Anrede und wählt den passenden Text.

</details>

::: info
**Tipp für Ihre Bewerbungen:** Die Spalten **Beworben_am** und **Status** helfen beim Nachweis Ihrer Bewerbungen, z. B. für das Jobcenter. Mit **Daten → Filtern** sehen Sie zum Beispiel nur die offenen Bewerbungen.
:::

## Teil 2 – Word: Ihr Brief {#word}

::: schritte
1. Öffnen Sie **Anschreiben_Uebung.docx** (wenn nötig: **Bearbeitung aktivieren**).
2. Machen Sie einen **Doppelklick oben** auf den Briefkopf (**Kopfzeile**). Ersetzen Sie **[Ihr Vorname Nachname]** und **[Ihre …]** durch Ihre Daten.
3. Unten auf der Seite (**Fußzeile**): Telefon und E-Mail eintragen. Mit einem Doppelklick in den Brief kommen Sie zurück.
4. Ersetzen Sie **[Ihr Wohnort]** vor dem Datum und **[Ihr Vorname Nachname]** unter dem Gruß.
5. Speichern mit **Strg + S**.
:::

::: info
**Eckige Klammern – was mache ich?**

- **[Ihr …] / [Ihre …]** → tippen Sie **selbst** ein.
- **[Firma], [Stelle], [Briefanrede] …** → **nicht abtippen!** Diese Daten kommen gleich aus Excel (Teil 3).
:::

## Teil 3 – Word mit Excel verbinden {#verbinden}

::: schritte
1. Oben im Menüband: Registerkarte **Sendungen** → **Seriendruck starten** → **Briefe**.
2. **Sendungen** → **Empfänger auswählen** → **Vorhandene Liste verwenden …**
3. Wählen Sie **Bewerbungsliste.xlsx** → **Öffnen**.
4. Fenster **Tabelle auswählen**: **Bewerbungen$** anklicken. Der Haken bei **Erste Datenzeile enthält Spaltenüberschriften** muss gesetzt sein → **OK**.
5. Jetzt passiert scheinbar nichts – **das ist richtig!** Word hat sich die Liste gemerkt. Der Test: Die Knöpfe **Seriendruckfeld einfügen** und **Vorschau Ergebnisse** sind nicht mehr grau.
6. Markieren Sie im Brief **[Firma]** (mit den Klammern). Klicken Sie auf den **unteren Teil** des Knopfs **Seriendruckfeld einfügen** (kleiner Pfeil) → **Firma**. Jetzt steht dort **«Firma»**.
7. Machen Sie das Gleiche für **[Ansprechpartner]**, **[Strasse]**, **[PLZ]**, **[Ort]**, **[Stelle]** (zweimal: im Betreff und im Text) und **[Briefanrede]**.
8. **Sendungen** → **Vorschau Ergebnisse**. Mit den Pfeilen **◄ ►** blättern Sie durch Ihre Firmen. Prüfen Sie: Leerzeichen da? Komma nach der Anrede?
9. **Datei** → **Speichern unter** → Name **Anschreiben_Serienbrief** – im **gleichen Ordner** wie die Excel-Liste.
:::

## Teil 4 – Alle Briefe mit einem Klick {#fertig}

::: schritte
1. **Sendungen** → **Fertig stellen und zusammenführen** → **Einzelne Dokumente bearbeiten …**
2. **Alle** → **OK**. Word öffnet ein **neues Dokument** mit allen Briefen – ein Brief pro Seite.
3. Speichern Sie es: **Datei** → **Speichern unter** → z. B. **Meine_Bewerbungen**.
4. Schreiben Sie jetzt in **jedem** Brief Ihren eigenen Text – dort, wo **[Hier schreiben Sie …]** steht.
5. Für eine E-Mail-Bewerbung: **Datei** → **Speichern unter** → Dateityp **PDF**.
:::

::: info
**Später: nur ein Brief für eine neue Stelle**

1. Neue Firma in Excel eintragen → speichern → Excel schließen.
2. **Anschreiben_Serienbrief** öffnen. Kommt eine Frage mit **SQL-Befehl**? → **Ja**.
3. **Vorschau Ergebnisse** → mit **►** zur neuen Firma blättern.
4. **Fertig stellen und zusammenführen** → **Einzelne Dokumente bearbeiten** → **Aktueller Datensatz** → **OK**.
:::

## Wenn etwas nicht klappt {#hilfe}

<details>
<summary>Beim Öffnen kommt eine Frage mit „SQL-Befehl“.</summary>

**Ja** klicken. Das ist normal: Word lädt die Excel-Liste.

</details>

<details>
<summary>Die Knöpfe unter „Sendungen“ sind grau.</summary>

Oben steht **Geschützte Ansicht** → **Bearbeitung aktivieren**. Oder Sie haben Teil 3, Schritt 1–4 noch nicht gemacht.

</details>

<details>
<summary>Word findet die Excel-Liste nicht.</summary>

Die Datei wurde verschoben oder umbenannt. **Sendungen** → **Empfänger auswählen** → **Vorhandene Liste verwenden** → Liste neu auswählen.

</details>

<details>
<summary>Neue Firmen aus Excel fehlen.</summary>

Excel **speichern und schließen**. In Word: **Empfängerliste bearbeiten** → Datenquelle anklicken → **Aktualisieren**.

</details>

<details>
<summary>Am Ende kommen leere Briefe.</summary>

In Excel stehen leere Zeilen mit Formeln. Ganze Zeilen löschen: Rechtsklick auf die Zeilennummer → **Zellen löschen**. Oder in Word: **Empfängerliste bearbeiten** → Pfeil bei **Firma** → **(Nicht leere)**.

</details>

<details>
<summary>Die 0 am Anfang der PLZ fehlt.</summary>

PLZ-Zelle: Rechtsklick → **Zellen formatieren** → **Text**. Dann die PLZ neu eintippen.

</details>

<details>
<summary>Im Brief steht «Firma» statt dem Namen der Firma.</summary>

**Vorschau Ergebnisse** anklicken.

</details>

<details>
<summary>Wörter kleben zusammen.</summary>

Leerzeichen zwischen den Feldern einfügen, z. B. zwischen «PLZ» und «Ort».

</details>

<details>
<summary>Das Datum im Brief ändert sich jeden Tag.</summary>

In den fertigen Briefen: **Strg + A**, dann **Strg + Umschalt + F9**. Jetzt ist das Datum fester Text.

</details>

## Testen Sie sich {#test}

<details>
<summary>Wo beginnt ein Serienbrief – in Excel oder in Word?</summary>

In **Word**: Registerkarte **Sendungen** → **Seriendruck starten**. Excel liefert nur die Daten.

</details>

<details>
<summary>Was gehört in die Excel-Liste und was in den Word-Brief?</summary>

Excel: alles, was sich **ändert** (Firma, Adresse, Ansprechperson, Stelle). Word: alles, was **gleich bleibt** (Ihr Name, Ihre Adresse, Gruß).

</details>

<details>
<summary>Warum muss Excel geschlossen sein, bevor Sie in Word arbeiten?</summary>

Word liest die **gespeicherte** Datei. Was in einem offenen Excel noch nicht gespeichert ist, sieht Word nicht.

</details>

<details>
<summary>Warum ist die PLZ als Text gespeichert?</summary>

Sonst verschwindet die **0 am Anfang**, z. B. wird aus 01067 die Zahl 1067.

</details>

<details>
<summary>Sie haben eine neue Stelle gefunden. Wie bekommen Sie nur einen neuen Brief?</summary>

Firma in Excel eintragen, speichern, schließen. In Word mit **Vorschau Ergebnisse** zur Firma blättern → **Fertig stellen und zusammenführen** → **Einzelne Dokumente bearbeiten** → **Aktueller Datensatz**.

</details>

## Ihre Daten {#datenschutz}

::: achtung
Speichern Sie Ihre Dateien auf **Ihrem USB-Stick** oder schicken Sie sie **per E-Mail an sich selbst**. Löschen Sie am Ende Ihre persönlichen Dateien vom Schulungs-PC.
:::
