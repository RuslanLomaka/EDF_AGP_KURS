// Bewerbungshelfer: turns the rows of Bewerbungsliste.xlsx into ready-made application letters.
//
// The program sits in one folder with Bewerbungsliste.xlsx and Anschreiben_Vorlage.docx. A double-click
// creates the folder "Bewerbungen" with one Word file per open application. Existing letters are never
// overwritten, so the sentences a person wrote into them are safe.
package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/xuri/excelize/v2"
)

const (
	listeName   = "Bewerbungsliste.xlsx"
	vorlageName = "Anschreiben_Vorlage.docx"
	ordnerName  = "Bewerbungen"
	blattDaten  = "Meine Daten"
	blattListe  = "Bewerbungen"
)

// Rows on the "Meine Daten" sheet (column A) and the placeholder each one fills.
var meineDaten = []struct{ zeile, platzhalter string }{
	{"Vorname und Nachname", "Mein Name"},
	{"Straße und Hausnummer", "Meine Straße"},
	{"PLZ und Wohnort", "Meine PLZ und Ort"},
	{"Telefon", "Mein Telefon"},
	{"E-Mail", "Meine E-Mail"},
}

func main() {
	konsoleVorbereiten()
	err := lauf()
	if err != nil {
		fmt.Println()
		m := []rune(err.Error())
		m[0] = unicode.ToUpper(m[0]) // Go error texts start small; a German sentence starts big
		fmt.Println("FEHLER: " + string(m))
	}
	fmt.Println()
	fmt.Print("Drücken Sie die Eingabetaste (Enter), um das Fenster zu schließen.")
	bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil {
		os.Exit(1)
	}
}

func lauf() error {
	ordner, err := programmOrdner()
	if err != nil {
		return err
	}
	liste := filepath.Join(ordner, listeName)
	vorlage := filepath.Join(ordner, vorlageName)
	ziel := filepath.Join(ordner, ordnerName)

	fmt.Println("Bewerbungshelfer")
	fmt.Println("================")
	fmt.Println()
	for _, d := range []string{liste, vorlage} {
		if _, err := os.Stat(d); err != nil {
			return fmt.Errorf("die Datei %q fehlt. Legen Sie das Programm in den Ordner mit %s und %s.",
				filepath.Base(d), listeName, vorlageName)
		}
	}

	xl, err := excelize.OpenFile(liste)
	if err != nil {
		return fmt.Errorf("%s lässt sich nicht lesen (%v). Ist die Datei in Excel gespeichert?", listeName, err)
	}
	defer xl.Close()

	ich, err := leseMeineDaten(xl)
	if err != nil {
		return err
	}
	zeilen, err := leseBewerbungen(xl)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(ziel, 0o755); err != nil {
		return fmt.Errorf("der Ordner %q lässt sich nicht anlegen: %w", ordnerName, err)
	}

	heute := time.Now().Format("02.01.2006")
	var neu, vorhanden, uebersprungen int
	for _, z := range zeilen {
		if !z.offen() {
			uebersprungen++
			continue
		}
		datei := filepath.Join(ziel, dateiname(ich["Mein Name"], z))
		if _, err := os.Stat(datei); err == nil {
			fmt.Printf("  schon da:  %s\n", filepath.Base(datei))
			vorhanden++
			continue
		}
		werte := map[string]string{
			"Firma":           z.firma,
			"Ansprechpartner": z.ansprechpartner(),
			"Strasse":         z.strasse,
			"PLZ":             z.plz,
			"Ort":             z.ort,
			"Stelle":          z.stelle,
			"Briefanrede":     z.briefanrede(),
			"Datum":           heute,
			"Mein Wohnort":    wohnort(ich["Meine PLZ und Ort"]),
		}
		for k, v := range ich {
			werte[k] = v
		}
		if err := schreibeBrief(vorlage, datei, werte); err != nil {
			return fmt.Errorf("der Brief an %s ließ sich nicht schreiben: %w", z.firma, err)
		}
		fmt.Printf("  NEU:       %s\n", filepath.Base(datei))
		neu++
	}

	fmt.Println()
	fmt.Printf("Fertig: %d neue %s im Ordner %q.\n", neu, mehrzahl(neu, "Bewerbung", "Bewerbungen"), ordnerName)
	if vorhanden > 0 {
		fmt.Printf("%d %s gab es schon – sie wurden nicht verändert.\n", vorhanden, mehrzahl(vorhanden, "Brief", "Briefe"))
	}
	if uebersprungen > 0 {
		fmt.Printf("%d %s übersprungen, weil der Status nicht „offen“ ist.\n", uebersprungen, mehrzahl(uebersprungen, "Firma", "Firmen"))
	}
	if neu > 0 {
		fmt.Println()
		fmt.Println("Jetzt: Öffnen Sie jeden neuen Brief und ersetzen Sie den gelb markierten Text durch Ihre eigenen Sätze.")
		ordnerZeigen(ziel)
	}
	return nil
}

func programmOrdner() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return "", err
	}
	return filepath.Dir(exe), nil
}

func leseMeineDaten(xl *excelize.File) (map[string]string, error) {
	rows, err := xl.GetRows(blattDaten)
	if err != nil {
		return nil, fmt.Errorf("in %s fehlt das Blatt %q", listeName, blattDaten)
	}
	gefunden := map[string]string{}
	for _, r := range rows {
		if len(r) >= 2 {
			gefunden[strings.TrimSpace(r[0])] = strings.TrimSpace(r[1])
		}
	}
	ich := map[string]string{}
	var fehlt []string
	for _, d := range meineDaten {
		v := gefunden[d.zeile]
		if v == "" {
			fehlt = append(fehlt, d.zeile)
		}
		ich[d.platzhalter] = v
	}
	if len(fehlt) > 0 {
		return nil, fmt.Errorf("bitte füllen Sie zuerst das Blatt %q aus. Es fehlt: %s.\n"+
			"Speichern Sie Excel danach und starten Sie das Programm noch einmal.", blattDaten, strings.Join(fehlt, ", "))
	}
	return ich, nil
}

type zeile struct {
	firma, anrede, vorname, nachname, strasse, plz, ort, stelle, status string
}

func (z zeile) offen() bool {
	s := strings.ToLower(strings.TrimSpace(z.status))
	return s == "" || s == "offen"
}

func (z zeile) ansprechpartner() string {
	return strings.Join(strings.Fields(z.anrede+" "+z.vorname+" "+z.nachname), " ")
}

func (z zeile) briefanrede() string {
	switch strings.ToLower(z.anrede) {
	case "frau":
		if z.nachname != "" {
			return "Sehr geehrte Frau " + z.nachname
		}
	case "herr":
		if z.nachname != "" {
			return "Sehr geehrter Herr " + z.nachname
		}
	}
	return "Sehr geehrte Damen und Herren"
}

func leseBewerbungen(xl *excelize.File) ([]zeile, error) {
	rows, err := xl.GetRows(blattListe)
	if err != nil {
		return nil, fmt.Errorf("in %s fehlt das Blatt %q", listeName, blattListe)
	}
	if len(rows) == 0 {
		return nil, errors.New("das Blatt „Bewerbungen“ ist leer")
	}
	spalte := map[string]int{}
	for i, kopf := range rows[0] {
		spalte[strings.TrimSpace(kopf)] = i
	}
	for _, pflicht := range []string{"Firma", "Strasse", "PLZ", "Ort", "Stelle"} {
		if _, ok := spalte[pflicht]; !ok {
			return nil, fmt.Errorf("im Blatt „Bewerbungen“ fehlt die Spalte %q in Zeile 1", pflicht)
		}
	}
	feld := func(r []string, name string) string {
		i, ok := spalte[name]
		if !ok || i >= len(r) {
			return ""
		}
		return strings.TrimSpace(r[i])
	}
	var zeilen []zeile
	for _, r := range rows[1:] {
		z := zeile{
			firma: feld(r, "Firma"), anrede: feld(r, "Anrede"), vorname: feld(r, "Vorname"),
			nachname: feld(r, "Nachname"), strasse: feld(r, "Strasse"), plz: plz(feld(r, "PLZ")),
			ort: feld(r, "Ort"), stelle: feld(r, "Stelle"), status: feld(r, "Status"),
		}
		if z.firma == "" {
			continue
		}
		zeilen = append(zeilen, z)
	}
	return zeilen, nil
}

// plz restores a lost leading zero (01067 typed into a number cell becomes 1067).
func plz(s string) string {
	if len(s) == 4 && strings.IndexFunc(s, func(r rune) bool { return !unicode.IsDigit(r) }) < 0 {
		return "0" + s
	}
	return s
}

// wohnort takes "25813 Husum" and returns "Husum" for the date line.
func wohnort(plzOrt string) string {
	teile := strings.Fields(plzOrt)
	if len(teile) > 1 && strings.IndexFunc(teile[0], func(r rune) bool { return !unicode.IsDigit(r) }) < 0 {
		return strings.Join(teile[1:], " ")
	}
	return plzOrt
}

var verboten = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)

// dateiname: "Anschreiben Max Mustermann – Muster Logistik GmbH (Lagerhelfer).docx". The applicant's
// name is what the company sees; firm and position keep two applications to one firm apart.
func dateiname(bewerber string, z zeile) string {
	name := "Anschreiben " + bewerber + " – " + z.firma
	if z.stelle != "" {
		name += " (" + z.stelle + ")"
	}
	name = verboten.ReplaceAllString(name, "")
	name = strings.Join(strings.Fields(name), " ")
	if r := []rune(name); len(r) > 120 {
		name = string(r[:120])
	}
	return strings.TrimRight(name, ". ") + ".docx"
}

func mehrzahl(n int, eins, viele string) string {
	if n == 1 {
		return eins
	}
	return viele
}
