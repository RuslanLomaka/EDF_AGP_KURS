package main

import (
	"regexp"
	"strings"
	"testing"
)

func TestPlatzhalterUeberMehrereTextteile(t *testing.T) {
	// Word split "[Firma]" into three runs and "[Stelle]" sits next to plain text
	absatz := `<w:p><w:r><w:t>An [Fir</w:t></w:r><w:r><w:t>m</w:t></w:r><w:r><w:t>a] als [Stelle], [Hier schreiben Sie]</w:t></w:r></w:p>`
	neu, gefunden, leer := fuelleAbsatz(absatz, map[string]string{"Firma": "Bäckerei & Co", "Stelle": "Verkäufer"})
	if !gefunden || leer {
		t.Fatalf("gefunden=%v leer=%v", gefunden, leer)
	}
	text := strings.Join(reText.FindAllString(neu, -1), "")
	for _, soll := range []string{"An Bäckerei &amp; Co", "als Verkäufer, [Hier schreiben Sie]"} {
		if !strings.Contains(stripTags(text), soll) {
			t.Errorf("%q fehlt in %q", soll, stripTags(text))
		}
	}
}

func TestLeereZeileVerschwindet(t *testing.T) {
	xml := `<w:body><w:p><w:r><w:t>[Firma]</w:t></w:r></w:p><w:p><w:r><w:t>[Ansprechpartner]</w:t></w:r></w:p><w:p><w:r><w:t>Text</w:t></w:r></w:p></w:body>`
	neu := fuelleXML(xml, map[string]string{"Firma": "Muster GmbH", "Ansprechpartner": ""})
	if strings.Count(neu, "<w:p>") != 2 || !strings.Contains(neu, "Muster GmbH") {
		t.Errorf("unerwartet: %s", neu)
	}
}

func TestBriefanredeUndPLZ(t *testing.T) {
	if got := (zeile{anrede: "Frau", nachname: "Petersen"}).briefanrede(); got != "Sehr geehrte Frau Petersen" {
		t.Error(got)
	}
	if got := (zeile{anrede: "Herr"}).briefanrede(); got != "Sehr geehrte Damen und Herren" {
		t.Error(got)
	}
	if plz("1067") != "01067" || plz("25813") != "25813" || wohnort("25813 Husum") != "Husum" {
		t.Error("plz/wohnort")
	}
	if d := dateiname("Max Mustermann", zeile{firma: "A/B: GmbH?", stelle: "Lager*helfer"}); d != "Anschreiben Max Mustermann – AB GmbH (Lagerhelfer).docx" {
		t.Error(d)
	}
}

func stripTags(s string) string { return regexp.MustCompile(`<[^>]+>`).ReplaceAllString(s, "") }
