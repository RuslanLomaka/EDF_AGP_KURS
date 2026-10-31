#!/usr/bin/env python3
"""Builds the static site into site/dist/ (served at the domain root).

    python3 site/build.py

Content:
  site/content/artikel/*.md     articles (one per course handout)
  site/content/edv-kurs/*.md    interactive EDV lessons
  site/content/edv-kurs/bilder/ images used by lessons (served at /edv-kurs/bilder/)
  site/themen.yaml              allowed article topics, in display order
Needs: pandoc, PyYAML.
"""
import html
import json
import math
import re
import shutil
import subprocess
import zipfile
from datetime import date
from pathlib import Path
from urllib.parse import quote

import yaml

SITE = Path(__file__).resolve().parent
REPO = SITE.parent
CONTENT = SITE / "content"
DIST = SITE / "dist"
BRAND = "Kursmaterial"
NAV = [("start", "/", "Start"), ("kurs", "/edv-kurs/", "EDV-Kurs"), ("artikel", "/artikel/", "Artikel")]
WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober",
          "November", "Dezember"]
TYP = {".xlsx": "Excel", ".docx": "Word", ".pdf": "PDF", ".zip": "ZIP"}

esc = html.escape


# ---------------------------------------------------------------- helpers

def read_meta(path):
    m = re.match(r"^---\n(.*?)\n---\n", path.read_text(encoding="utf-8"), re.S)
    if not m:
        raise SystemExit(f"{path}: missing YAML front matter")
    return yaml.safe_load(m.group(1)) or {}


def require(path, meta, *keys):
    for key in keys:
        if meta.get(key) in (None, ""):
            raise SystemExit(f"{path}: front matter needs '{key}'")
    if meta["slug"] != path.stem:
        raise SystemExit(f"{path}: slug '{meta['slug']}' must equal the file name")


def pandoc(path, to):
    return subprocess.run(["pandoc", str(path), "--from", "markdown", "--to", to, "--wrap=none"],
                          capture_output=True, text=True, check=True).stdout


def toc(body_html):
    found = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body_html)
    items = "".join(f'<li><a href="#{i}">{re.sub(r"<[^>]+>", "", t)}</a></li>' for i, t in found)
    if not items:
        return ""
    return f'<nav class="toc" aria-label="Inhalt"><details><summary>Inhalt</summary><ul>{items}</ul></details></nav>'


def datum_lang(iso):
    if not iso:
        return ""
    d = date.fromisoformat(iso)
    return f"{WOCHENTAGE[d.weekday()]}, {d.day}. {MONATE[d.month - 1]} {d.year}"


def datum_kurz(iso):
    return date.fromisoformat(iso).strftime("%d.%m.%Y") if iso else ""


def groesse(n):
    return f"{max(1, round(n / 1024))} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.1f} MB".replace(".", ",")


def anzahl(n, eins, mehr):
    return f"1 {eins}" if n == 1 else f"{n} {mehr}"


def lesson_meta(lesson):
    parts = ["Lektion " + str(lesson["nummer"]), lesson.get("dauer", ""), lesson.get("niveau", "")]
    return " · ".join(esc(x) for x in parts if x)


def thema_link(thema):
    return f"/artikel/?thema={quote(thema)}"


def blaettern(label, prev, nxt, prev_small, next_small):
    if not (prev or nxt):
        return ""
    left = f'<a class="zurueck" href="{prev["url"]}"><small>{prev_small}</small>{esc(prev["title"])}</a>' if prev else "<span></span>"
    right = f'<a class="weiter" href="{nxt["url"]}"><small>{next_small}</small>{esc(nxt["title"])}</a>' if nxt else "<span></span>"
    return f'<nav class="blaettern" aria-label="{label}">{left}{right}</nav>'


def write(rel, text):
    out = DIST / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")


def layout(title, active, main, description="", scripts=""):
    current = ' aria-current="page"'
    links = "".join(f'<a href="{href}"{current if key == active else ""}>{label}</a>' for key, href, label in NAV)
    full_title = BRAND if title == BRAND else f"{title} – {BRAND}"
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full_title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="/">{BRAND}</a>
  <nav aria-label="Hauptmenü">{links}</nav>
</header>
<main>
{main}
</main>
<footer class="site-footer"><a href="/">{BRAND}</a> · <a href="/edv-kurs/">EDV-Kurs</a> · <a href="/artikel/">Artikel</a></footer>
{scripts}
</body>
</html>
"""


# ---------------------------------------------------------------- articles

def load_articles():
    themen = yaml.safe_load((SITE / "themen.yaml").read_text(encoding="utf-8"))
    articles = []
    for path in sorted((CONTENT / "artikel").glob("*.md")):
        meta = read_meta(path)
        require(path, meta, "title", "slug", "thema", "kurz", "quelle")
        if meta["thema"] not in themen:
            raise SystemExit(f"{path}: thema '{meta['thema']}' is not in site/themen.yaml (add it there first)")
        datum = str(meta.get("datum") or "")
        if datum:
            date.fromisoformat(datum)  # raises on a malformed date
        text = " ".join(re.sub(r"[-=+|]{3,}|\|", " ", pandoc(path, "plain")).split())  # drop ASCII table borders
        articles.append({**meta, "datum": datum, "body": pandoc(path, "html5"), "text": text,
                         "url": f"/artikel/{meta['slug']}/", "minuten": max(1, math.ceil(len(text.split()) / 180))})
    slugs = [a["slug"] for a in articles]
    if len(slugs) != len(set(slugs)):
        raise SystemExit("duplicate article slugs")
    articles.sort(key=lambda a: (a["datum"] == "", a["datum"], a["title"]))  # course order, undated last
    return articles, themen


def build_article_pages(articles):
    for i, a in enumerate(articles):
        related = [b for b in articles if b["thema"] == a["thema"] and b is not a][:5]
        mehr = ""
        if related:
            items = "".join(f'<li><a href="{b["url"]}">{esc(b["title"])}</a></li>' for b in related)
            mehr = (f'<section class="mehr"><h2>Mehr zum Thema „{esc(a["thema"])}“</h2><ul class="liste">{items}</ul>'
                    f'<p><a href="{thema_link(a["thema"])}">Alle Artikel zum Thema</a></p></section>')
        chips = "".join(f'<li><a href="/artikel/?q={quote(k)}">{esc(k)}</a></li>' for k in a.get("stichwoerter") or [])
        meta_line = " · ".join(x for x in [esc(a["thema"]), datum_kurz(a["datum"]), f"ca. {a['minuten']} Min. Lesezeit"] if x)
        nav = blaettern("Weitere Artikel", articles[i - 1] if i else None, articles[i + 1] if i + 1 < len(articles) else None,
                        "Vorheriger Artikel", "Nächster Artikel")
        main = f"""<p class="crumbs"><a href="/artikel/">Artikel</a> › <a href="{thema_link(a['thema'])}">{esc(a['thema'])}</a></p>
<h1>{esc(a['title'])}</h1>
<p class="meta">{meta_line}</p>
{toc(a['body'])}
<article class="inhalt">
{a['body']}
</article>
<h2>Stichwörter</h2>
<ul class="chips">{chips}</ul>
{mehr}
{nav}
<p class="quelle">Grundlage: {esc(a['quelle'])}. Der Inhalt ist in eigenen Worten erklärt. Kästen mit „Ergänzung“ enthalten zusätzliche Informationen (Stand 2026, ohne Gewähr).</p>"""
        write(f"artikel/{a['slug']}/index.html", layout(a["title"], "artikel", main, a["kurz"]))


def build_article_index(articles, themen):
    data = [{"title": a["title"], "url": a["url"], "datum": a["datum"], "datumLang": datum_lang(a["datum"]),
             "thema": a["thema"], "kurz": a["kurz"], "stichwoerter": a.get("stichwoerter") or [], "text": a["text"]}
            for a in reversed(articles)]  # newest first
    used = [t for t in themen if any(a["thema"] == t for a in articles)]
    payload = json.dumps({"artikel": data, "themen": used}, ensure_ascii=False).replace("</", "<\\/")
    fallback = "".join(f'<li><a href="{a["url"]}">{esc(a["title"])}</a></li>' for a in reversed(articles))
    main = f"""<h1>Artikel</h1>
<p class="lead">Arbeitsblätter aus dem Kurs – in eigenen Worten erklärt. {anzahl(len(articles), "Artikel", "Artikel")}.</p>
<input id="suche" class="search" type="search" placeholder="Suchen: Titel, Stichwort oder Text …" aria-label="Artikel durchsuchen" autocomplete="off">
<ul id="themen" class="chips" aria-label="Themen"></ul>
<p id="anzahl" class="count" aria-live="polite"></p>
<div id="liste"><ul class="liste">{fallback}</ul></div>
<script id="daten" type="application/json">{payload}</script>"""
    write("artikel/index.html", layout("Artikel", "artikel", main, "Alle Arbeitsblätter aus dem Kurs, mit Suche.",
                                       '<script src="/assets/suche.js"></script>'))


# ---------------------------------------------------------------- lessons

def load_lessons():
    lessons = []
    for path in sorted((CONTENT / "edv-kurs").glob("*.md")):
        meta = read_meta(path)
        require(path, meta, "title", "slug", "nummer", "kurz")
        files = [x["datei"] for x in (meta.get("dateien") or []) + (meta.get("lehrkraft") or [])]
        files += (meta.get("paket") or {}).get("dateien", [])
        for f in files:
            if not (REPO / f).is_file():
                raise SystemExit(f"{path}: file not found: {f}")
        lessons.append({**meta, "body": pandoc(path, "html5"), "url": f"/edv-kurs/{meta['slug']}/"})
    lessons.sort(key=lambda l: l["nummer"])
    return lessons


def file_list(lesson, items):
    rows = []
    for item in items:
        src = REPO / item["datei"]
        dest = DIST / "edv-kurs" / lesson["slug"] / "dateien" / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dest)
        rows.append(f'<li><a href="dateien/{esc(src.name)}" download>{esc(item["titel"])}</a> '
                    f'<span class="typ">{TYP.get(src.suffix, src.suffix)} · {groesse(src.stat().st_size)}</span>'
                    f'<br><span class="hinweis">{esc(item.get("text", ""))}</span></li>')
    return f'<ul class="dateiliste">{"".join(rows)}</ul>'


def zip_button(lesson):
    p = lesson.get("paket")
    if not p:
        return ""
    zpath = DIST / "edv-kurs" / lesson["slug"] / "dateien" / p["name"]
    zpath.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in p["dateien"]:
            z.write(REPO / f, Path(f).name)
    return (f'<a class="btn" href="dateien/{esc(p["name"])}" download>{esc(p["titel"])} '
            f'<span>ZIP · {groesse(zpath.stat().st_size)}</span></a>')


def build_lessons(lessons):
    for i, l in enumerate(lessons):
        ziele = "".join(f"<li>{esc(z)}</li>" for z in l.get("ziele") or [])
        ziele = f'<section class="ziele"><h2>Das lernen Sie</h2><ul>{ziele}</ul></section>' if ziele else ""
        lehrkraft = ""
        if l.get("lehrkraft"):
            lehrkraft = f'<section class="lehrkraft"><h2>Für Lehrkräfte</h2>{file_list(l, l["lehrkraft"])}</section>'
        nav = blaettern("Weitere Lektionen", lessons[i - 1] if i else None, lessons[i + 1] if i + 1 < len(lessons) else None,
                        "Vorherige Lektion", "Nächste Lektion")
        main = f"""<p class="crumbs"><a href="/edv-kurs/">EDV-Kurs</a> › Lektion {l['nummer']}</p>
<h1>{esc(l['title'])}</h1>
<p class="untertitel">{esc(l.get('untertitel', ''))}</p>
<p class="meta">{lesson_meta(l)}</p>
<p class="lead">{esc(l['kurz'])}</p>
{ziele}
<section class="downloads"><h2>Dateien</h2>
{zip_button(l)}
{file_list(l, l.get('dateien') or [])}
</section>
<div class="fortschritt" data-lektion="{esc(l['slug'])}" hidden>
  <div class="balken"><span></span></div>
  <p><span class="zahl"></span> <button type="button" class="reset">Zurücksetzen</button></p>
</div>
{toc(l['body'])}
<article class="inhalt lektion">
{l['body']}
</article>
{lehrkraft}
{nav}"""
        write(f"edv-kurs/{l['slug']}/index.html",
              layout(l["title"], "kurs", main, l["kurz"], '<script src="/assets/lektion.js"></script>'))
    bilder = CONTENT / "edv-kurs" / "bilder"
    if bilder.is_dir():
        shutil.copytree(bilder, DIST / "edv-kurs" / "bilder")


def build_lesson_index(lessons):
    cards = "".join(
        f'<article class="card"><p class="meta">{lesson_meta(l)}</p>'
        f'<h2><a href="{l["url"]}">{esc(l["title"])}</a></h2>'
        f'<p><strong>{esc(l.get("untertitel", ""))}</strong></p><p>{esc(l["kurz"])}</p></article>'
        for l in lessons)
    main = f"""<h1>EDV-Kurs</h1>
<p class="lead">Lektionen zum Mitmachen am Computer – Schritt für Schritt, mit Übungsdateien.</p>
{cards}"""
    write("edv-kurs/index.html", layout("EDV-Kurs", "kurs", main, "Lektionen zum Mitmachen am Computer."))


# ---------------------------------------------------------------- start + 404

def build_start(articles, lessons):
    items = "".join(f'<li><a href="{a["url"]}">{esc(a["title"])}</a> <span class="badge">{esc(a["thema"])}</span></li>'
                    for a in list(reversed(articles))[:5])
    main = f"""<h1>{BRAND}</h1>
<p class="lead">Unterlagen, Übungen und Anleitungen aus unserem Kurs – einfach erklärt.</p>
<form class="startsuche" action="/artikel/" method="get" role="search">
  <input class="search" type="search" name="q" placeholder="Artikel durchsuchen …" aria-label="Artikel durchsuchen">
</form>
<div class="bereiche">
  <a class="bereich" href="/edv-kurs/"><strong>EDV-Kurs</strong><span>Lektionen zum Mitmachen am Computer</span><small>{anzahl(len(lessons), "Lektion", "Lektionen")}</small></a>
  <a class="bereich" href="/artikel/"><strong>Artikel</strong><span>Arbeitsblätter aus dem Kurs, einfach erklärt</span><small>{anzahl(len(articles), "Artikel", "Artikel")}</small></a>
</div>
<h2>Neueste Artikel</h2>
<ul class="liste">{items}</ul>
<p><a href="/artikel/">Alle Artikel</a></p>"""
    write("index.html", layout(BRAND, "start", main, "Unterlagen und Übungen aus unserem Kurs."))
    write("404.html", layout("Seite nicht gefunden", "", """<h1>Seite nicht gefunden</h1>
<p class="lead">Diese Seite gibt es nicht.</p>
<p><a href="/">Startseite</a> · <a href="/edv-kurs/">EDV-Kurs</a> · <a href="/artikel/">Artikel</a></p>"""))


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SITE / "assets", DIST / "assets")
    articles, themen = load_articles()
    lessons = load_lessons()
    build_article_pages(articles)
    build_article_index(articles, themen)
    build_lessons(lessons)
    build_lesson_index(lessons)
    build_start(articles, lessons)
    print(f"built {len(articles)} article(s) and {len(lessons)} lesson(s) into {DIST}")


if __name__ == "__main__":
    main()
