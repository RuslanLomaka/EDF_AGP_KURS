package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"html"
	"io"
	"os"
	"regexp"
	"strings"
)

// Word stores the text of a paragraph in one or more <w:t> elements. When a person edits the template,
// Word often splits a placeholder like "[Firma]" across several of them ("[Fir" + "ma]"). So placeholders
// are found in the joined text of each paragraph and the replacement is written back into those elements.

var (
	reParagraph = regexp.MustCompile(`(?s)<w:p[ >].*?</w:p>`)
	reText      = regexp.MustCompile(`(?s)<w:t(?: [^>]*)?>(.*?)</w:t>`)
	rePlatz     = regexp.MustCompile(`\[[^\[\]]{1,40}\]`)
)

// textTeil is one <w:t> element inside a paragraph: its position in the paragraph XML and its text.
type textTeil struct {
	start, ende int // byte range of the whole <w:t …>…</w:t> element
	text        string
}

// fuelleAbsatz replaces the known placeholders in one paragraph. It returns the new XML, whether a
// placeholder was found, and whether the paragraph is empty afterwards.
func fuelleAbsatz(absatz string, werte map[string]string) (string, bool, bool) {
	treffer := reText.FindAllStringSubmatchIndex(absatz, -1)
	if len(treffer) == 0 {
		return absatz, false, false
	}
	teile := make([]textTeil, len(treffer))
	var gesamt strings.Builder
	for i, m := range treffer {
		teile[i] = textTeil{start: m[0], ende: m[1], text: html.UnescapeString(absatz[m[2]:m[3]])}
		gesamt.WriteString(teile[i].text)
	}
	text := gesamt.String()

	// owner[i] = index of the <w:t> element that holds byte i of the joined text
	owner := make([]int, 0, len(text))
	for i, t := range teile {
		for range len(t.text) {
			owner = append(owner, i)
		}
	}

	neu := make([]string, len(teile))
	for i, t := range teile {
		neu[i] = t.text
	}
	gefunden := false
	orte := rePlatz.FindAllStringIndex(text, -1)
	// right to left, so earlier positions stay valid while later ones change
	for k := len(orte) - 1; k >= 0; k-- {
		von, bis := orte[k][0], orte[k][1]
		name := text[von+1 : bis-1]
		wert, bekannt := werte[name]
		if !bekannt {
			continue // e.g. "[Hier schreiben Sie …]" stays for the person to fill in
		}
		gefunden = true
		erster, letzter := owner[von], owner[bis-1]
		// offsets of the placeholder inside its first and last element
		vorErstem := 0
		for i := 0; i < erster; i++ {
			vorErstem += len(teile[i].text)
		}
		vorLetztem := 0
		for i := 0; i < letzter; i++ {
			vorLetztem += len(teile[i].text)
		}
		if erster == letzter {
			s := neu[erster]
			// neu[erster] may already be shorter at its end (later placeholders), never at its start
			neu[erster] = s[:von-vorErstem] + wert + s[bis-vorErstem:]
			continue
		}
		neu[erster] = neu[erster][:von-vorErstem] + wert
		for i := erster + 1; i < letzter; i++ {
			neu[i] = ""
		}
		neu[letzter] = neu[letzter][bis-vorLetztem:]
	}
	if !gefunden {
		return absatz, false, false
	}

	var b strings.Builder
	letzteStelle := 0
	leer := true
	for i, t := range teile {
		b.WriteString(absatz[letzteStelle:t.start])
		b.WriteString(`<w:t xml:space="preserve">`)
		b.WriteString(escapeXML(neu[i]))
		b.WriteString(`</w:t>`)
		letzteStelle = t.ende
		if strings.TrimSpace(neu[i]) != "" {
			leer = false
		}
	}
	b.WriteString(absatz[letzteStelle:])
	return b.String(), true, leer
}

// fuelleXML fills every paragraph of one Word XML part (body, header or footer). A paragraph that held
// placeholders and is empty afterwards is removed, like Word does with an empty mail-merge line
// (for example the contact person when the job ad names nobody).
func fuelleXML(xml string, werte map[string]string) string {
	return reParagraph.ReplaceAllStringFunc(xml, func(absatz string) string {
		neu, gefunden, leer := fuelleAbsatz(absatz, werte)
		if gefunden && leer {
			return ""
		}
		return neu
	})
}

func escapeXML(s string) string {
	var b bytes.Buffer
	for _, r := range s {
		switch r {
		case '&':
			b.WriteString("&amp;")
		case '<':
			b.WriteString("&lt;")
		case '>':
			b.WriteString("&gt;")
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

func istTextTeil(name string) bool {
	if name == "word/document.xml" {
		return true
	}
	return strings.HasPrefix(name, "word/header") || strings.HasPrefix(name, "word/footer")
}

// schreibeBrief copies the template to ziel and fills in the placeholders.
func schreibeBrief(vorlage, ziel string, werte map[string]string) error {
	r, err := zip.OpenReader(vorlage)
	if err != nil {
		return fmt.Errorf("die Vorlage %q lässt sich nicht öffnen: %w", vorlage, err)
	}
	defer r.Close()

	// write to a temporary file first, so a half-written letter never appears
	tmp := ziel + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	w := zip.NewWriter(f)
	for _, datei := range r.File {
		rc, err := datei.Open()
		if err != nil {
			f.Close()
			os.Remove(tmp)
			return err
		}
		inhalt, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			f.Close()
			os.Remove(tmp)
			return err
		}
		if istTextTeil(datei.Name) {
			inhalt = []byte(fuelleXML(string(inhalt), werte))
		}
		kopf := datei.FileHeader
		kopf.Method = zip.Deflate
		out, err := w.CreateHeader(&kopf)
		if err != nil {
			f.Close()
			os.Remove(tmp)
			return err
		}
		if _, err := out.Write(inhalt); err != nil {
			f.Close()
			os.Remove(tmp)
			return err
		}
	}
	if err := w.Close(); err != nil {
		f.Close()
		os.Remove(tmp)
		return err
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, ziel)
}
