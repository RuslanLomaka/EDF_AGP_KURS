#!/usr/bin/env python3
"""Builds the static site into site/dist/.

    python3 site/build.py                 # normal build (pages link assets/style.css)
    python3 site/build.py --inline-css    # every page self-contained (for previews)

Articles: site/content/unterlagen/*.md (YAML front matter + pandoc Markdown).
Needs: pandoc, PyYAML.
"""
import html
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content" / "unterlagen"
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"
DIST = ROOT / "dist"

NAV = [
    ("start", "index.html", "Start"),
    ("lektion", "bewerbung-auf-knopfdruck/index.html", "Bewerbung auf Knopfdruck"),
    ("unterlagen", "unterlagen/index.html", "Unterlagen"),
]


def front_matter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise SystemExit(f"{path}: missing YAML front matter")
    meta = yaml.safe_load(m.group(1)) or {}
    for key in ("title", "slug", "thema", "kurz", "quelle"):
        if not meta.get(key):
            raise SystemExit(f"{path}: front matter needs '{key}'")
    if meta["slug"] != path.stem:
        raise SystemExit(f"{path}: slug '{meta['slug']}' must equal the file name")
    return meta


def german_date(iso):
    if not iso:
        return ""
    y, mth, d = str(iso).split("-")
    return f"{d}.{mth}.{y}"


def pandoc(*args, stdin=None):
    return subprocess.run(["pandoc", *args], input=stdin, capture_output=True, text=True, check=True).stdout


def page(title, active, body, depth, description=""):
    """Wrapper for the hand-built pages (start, lesson, list)."""
    up = "../" * depth
    current = ' aria-current="page"'
    links = "\n".join(
        f'    <a href="{up}{href}"{current if key == active else ""}>{label}</a>'
        for key, href, label in NAV)
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}">
<link rel="stylesheet" href="{up}assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="{up}index.html">Kursmaterial</a>
  <nav>
{links}
  </nav>
</header>
<main>
{body}
</main>
</body>
</html>
"""


def build_articles():
    entries = []
    out_dir = DIST / "unterlagen"
    out_dir.mkdir(parents=True, exist_ok=True)
    for md in sorted(CONTENT.glob("*.md")):
        meta = front_matter(md)
        text = pandoc(str(md), "--from", "markdown", "--to", "plain", "--wrap=none")
        words = len(text.split())
        minutes = max(1, math.ceil(words / 180))
        pandoc(str(md), "--from", "markdown", "--to", "html5", "--standalone",
               "--template", str(TEMPLATES / "artikel.html"), "--toc", "--toc-depth=2",
               "-M", f"lesezeit={minutes}", "-M", f"datum_anzeige={german_date(meta.get('datum'))}",
               "-o", str(out_dir / f"{meta['slug']}.html"))
        entries.append({
            "slug": meta["slug"],
            "titel": meta["title"],
            "datum": str(meta.get("datum") or ""),
            "datumAnzeige": german_date(meta.get("datum")),
            "thema": meta["thema"],
            "stichwoerter": meta.get("stichwoerter") or [],
            "kurz": meta["kurz"],
            # drop the ASCII table borders pandoc draws in plain text (----, ====, |)
            "text": " ".join(re.sub(r"[-=+|]{3,}|\|", " ", text).split()),
        })
    entries.sort(key=lambda e: (e["datum"], e["titel"]), reverse=True)
    return entries


LIST_SCRIPT = r"""
const daten = JSON.parse(document.getElementById('daten').textContent);
const feld = document.getElementById('suche');
const liste = document.getElementById('liste');
const zahl = document.getElementById('anzahl');
const themen = document.getElementById('themen');
// Same transform for text and query: lower case, umlauts and their ae/oe/ue spellings
// folded together, so "abzuge", "abzüge" and "abzuege" all find "Abzüge".
const norm = s => s.toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const markiere = (s, begriffe) => s.split(/(\s+)/).map(w =>
  begriffe.length && begriffe.some(b => norm(w).includes(b)) ? '<mark>' + esc(w) + '</mark>' : esc(w)).join('');
function ausschnitt(text, begriffe) {
  const w = text.split(/\s+/);
  const i = w.findIndex(x => begriffe.some(b => norm(x).includes(b)));
  if (i < 0) return '';
  const von = Math.max(0, i - 10), bis = Math.min(w.length, i + 14);
  return (von > 0 ? '… ' : '') + markiere(w.slice(von, bis).join(' '), begriffe) + (bis < w.length ? ' …' : '');
}
let thema = '';
function zeige() {
  const begriffe = norm(feld.value).split(/\s+/).filter(Boolean);
  const treffer = [];
  for (const d of daten) {
    if (thema && d.thema !== thema) continue;
    const t = norm(d.titel), k = norm(d.kurz), s = norm(d.stichwoerter.join(' ')), x = norm(d.text);
    let punkte = 0, alle = true;
    for (const b of begriffe) {
      const p = (t.includes(b) ? 5 : 0) + (s.includes(b) ? 3 : 0) + (k.includes(b) ? 2 : 0) + (x.includes(b) ? 1 : 0);
      if (!p) { alle = false; break; }
      punkte += p;
    }
    if (alle) treffer.push([punkte, d]);
  }
  if (begriffe.length) treffer.sort((a, b) => b[0] - a[0]);
  zahl.textContent = treffer.length === 1 ? '1 Artikel' : treffer.length + ' Artikel';
  liste.innerHTML = treffer.length ? treffer.map(([, d]) => {
    const imText = begriffe.length && !begriffe.every(b => norm(d.titel + ' ' + d.kurz).includes(b));
    return '<article class="card"><h2><a href="' + d.slug + '.html">' + markiere(d.titel, begriffe) + '</a></h2>'
      + '<p class="meta">' + esc(d.thema) + (d.datumAnzeige ? ' · ' + d.datumAnzeige : '') + '</p>'
      + '<p>' + markiere(d.kurz, begriffe) + '</p>'
      + (imText ? '<p class="snippet">' + ausschnitt(d.text, begriffe) + '</p>' : '')
      + '</article>';
  }).join('') : '<p class="empty">Nichts gefunden. Versuchen Sie ein anderes Wort.</p>';
}
const alleThemen = [...new Set(daten.map(d => d.thema))].sort();
themen.innerHTML = ['', ...alleThemen].map(t =>
  '<li><button type="button" data-thema="' + esc(t) + '" aria-pressed="' + (t === '' ) + '">' + (t ? esc(t) : 'Alle Themen') + '</button></li>').join('');
themen.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  thema = b.dataset.thema;
  themen.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  zeige();
});
feld.addEventListener('input', zeige);
const q = new URLSearchParams(location.search).get('q');
if (q) feld.value = q;
zeige();
"""


def build_list(entries):
    data = json.dumps(entries, ensure_ascii=False).replace("</", "<\\/")
    body = f"""  <h1>Unterlagen</h1>
  <p class="meta">Alle Arbeitsblätter aus dem Kurs – in eigenen Worten erklärt.</p>
  <input id="suche" class="search" type="search" placeholder="Suchen: Titel, Stichwort oder Text …" aria-label="Unterlagen durchsuchen" autocomplete="off">
  <ul id="themen" class="chips" aria-label="Thema"></ul>
  <p id="anzahl" class="count"></p>
  <div id="liste"></div>
  <noscript><ul>{"".join(f'<li><a href="{e["slug"]}.html">{html.escape(e["titel"])}</a></li>' for e in entries)}</ul></noscript>
  <script id="daten" type="application/json">{data}</script>
  <script>{LIST_SCRIPT}</script>"""
    (DIST / "unterlagen" / "index.html").write_text(
        page("Unterlagen – Kursmaterial", "unterlagen", body, 1, "Alle Arbeitsblätter aus dem Kurs, mit Suche."),
        encoding="utf-8")


def build_static_pages(entries):
    count = "1 Artikel" if len(entries) == 1 else f"{len(entries)} Artikel"
    start = f"""  <h1>Kursmaterial</h1>
  <p class="meta">Unterlagen und Übungen aus unserem Kurs – einfach erklärt.</p>
  <article class="card"><h2><a href="bewerbung-auf-knopfdruck/index.html">Bewerbung auf Knopfdruck</a></h2>
    <p>Serienbrief mit Excel und Word: Aus einer Liste werden mit einem Klick fertige Bewerbungsanschreiben.</p></article>
  <article class="card"><h2><a href="unterlagen/index.html">Unterlagen</a></h2>
    <p>Alle Arbeitsblätter aus dem Kurs als kurze Artikel – mit Suche. ({count})</p></article>"""
    (DIST / "index.html").write_text(page("Kursmaterial", "start", start, 0), encoding="utf-8")

    lesson = """  <h1>Bewerbung auf Knopfdruck</h1>
  <p class="meta">Serienbrief mit Excel und Word</p>
  <p>Diese Seite wird gerade aufgebaut. Bald finden Sie hier die Anleitung und alle Dateien zum Herunterladen.</p>"""
    (DIST / "bewerbung-auf-knopfdruck").mkdir(parents=True, exist_ok=True)
    (DIST / "bewerbung-auf-knopfdruck" / "index.html").write_text(
        page("Bewerbung auf Knopfdruck – Kursmaterial", "lektion", lesson, 1), encoding="utf-8")


def inline_css():
    css = (ASSETS / "style.css").read_text(encoding="utf-8")
    for f in DIST.rglob("*.html"):
        s = f.read_text(encoding="utf-8")
        s = re.sub(r'<link rel="stylesheet" href="[^"]*style\.css">', lambda _: f"<style>\n{css}</style>", s)
        f.write_text(s, encoding="utf-8")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    shutil.copy(ASSETS / "style.css", DIST / "assets" / "style.css")
    entries = build_articles()
    build_list(entries)
    build_static_pages(entries)
    if "--inline-css" in sys.argv:
        inline_css()
    print(f"built {len(entries)} article(s) into {DIST}")


if __name__ == "__main__":
    main()
