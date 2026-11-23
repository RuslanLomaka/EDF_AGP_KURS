# Printouts: Das Vorstellungsgespräch

Four A4 PDFs for the article `site/content/artikel/vorstellungsgespraech.md`, which offers them in its
"Zum Ausdrucken" box (front matter `dateien`). German, simple language (B1). All names and companies are invented.

| File | Pages | Purpose |
|---|---|---|
| `checkliste.pdf` | 1 | Tick list: a few days before, the day before, the day itself, afterwards; fields for time, address, contact |
| `fragenkarten.pdf` | 3 | 24 cards to cut out: 12 company questions (blue), 4 jokers with forbidden questions (red), 6 own questions + 2 empty (green) |
| `arbeitsblatt-pitch.pdf` | 2 | Task A: 60-second pitch (today – before – goal), strengths, one weakness, one STAR story, own questions |
| `beobachtungsbogen.pdf` | 1 | Task C: observation sheet for the role play (one per round) |

## Rebuilding

The PDFs are generated, not drawn by hand. Edit the texts in `generator/erstellen.cjs`, then run from the
repository root (needs Node and Playwright with Chromium):

```bash
node materials/vorstellungsgespraech/generator/erstellen.cjs
```

Check that the page counts above still hold (`pdfinfo <file>.pdf`), and commit the PDFs: the site build copies them
as they are.
