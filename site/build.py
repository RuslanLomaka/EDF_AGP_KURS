#!/usr/bin/env python3
"""Builds the static site into site/dist/ (served at the domain root).

    python3 site/build.py

Content:
  site/content/artikel/*.md       articles (one per course handout); images in site/content/artikel/bilder/
  site/content/edv-kurs/*.md      interactive EDV lessons; images in site/content/edv-kurs/bilder/
  site/themen.yaml                allowed article topics, in display order
The build stops with "ERROR in <file>: <reason>" on any content mistake and checks every link and anchor
in the finished site. Needs: pandoc, PyYAML.
"""
import hashlib
import html
import json
import math
import os
import posixpath
import re
import shutil
import subprocess
import wave
import zipfile
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

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
BOXES = {"kurz", "ergaenzung", "info", "achtung", "schritte", "prinzip", "zeichen"}
SLUG = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
DATUM = re.compile(r"\d{4}-\d{2}-\d{2}")
DATEINAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
ASSET_VERSION = {}

esc = html.escape


# ---------------------------------------------------------------- reading and checking content

def fail(path, msg):
    raise SystemExit(f"ERROR in {path.relative_to(REPO)}: {msg}")


def read_source(path):
    """Returns (front matter dict, Markdown body)."""
    m = re.match(r"---\n(.*?)\n---\n(.*)", path.read_text(encoding="utf-8"), re.S)
    if not m:
        fail(path, "the file must start with front matter between two '---' lines")
    try:
        meta = yaml.safe_load(m.group(1))
    except yaml.YAMLError as e:
        fail(path, f"front matter is not valid YAML: {e}")
    if not isinstance(meta, dict):
        fail(path, "front matter must be 'key: value' lines")
    return meta, m.group(2)


def text(path, meta, key, required=True):
    value = meta.get(key)
    if value in (None, ""):
        if required:
            fail(path, f"'{key}' is missing")
        return ""
    if not isinstance(value, str):
        fail(path, f"'{key}' must be text (put it in quotes)")
    return value.strip()


def text_list(path, meta, key):
    value = meta.get(key) or []
    if not isinstance(value, list) or not all(isinstance(x, str) and x.strip() for x in value):
        fail(path, f"'{key}' must be a list with one entry per line, each starting with '- '")
    return [x.strip() for x in value]


def slug_of(path, meta):
    slug = text(path, meta, "slug")
    if slug != path.stem:
        fail(path, f"slug '{slug}' must equal the file name '{path.stem}'")
    if not SLUG.fullmatch(slug):
        fail(path, f"slug '{slug}' may only contain a-z, 0-9 and single hyphens (no umlauts, no spaces)")
    return slug


def datum_of(path, meta):
    value = meta.get("datum")
    if value in (None, ""):
        return ""
    value = str(value)  # YAML may already have parsed an unquoted date
    try:
        if not DATUM.fullmatch(value):
            raise ValueError
        date.fromisoformat(value)
    except ValueError:
        fail(path, f"datum '{value}' must be a real date written as YYYY-MM-DD, e.g. \"2026-10-30\"")
    return value


def pandoc(path, body, to):
    # yaml_metadata_block is off: a '---' block inside the text must stay text, not vanish as metadata
    r = subprocess.run(["pandoc", "--from", "markdown-yaml_metadata_block", "--to", to, "--wrap=none",
                        "--fail-if-warnings"], input=body, capture_output=True, text=True)
    if r.returncode != 0:
        fail(path, "pandoc: " + (r.stderr.strip() or f"exit code {r.returncode}"))
    return r.stdout


def check_body(path, body):
    if ":::" in body:
        fail(path, "a '::: box' is not closed or not written correctly (':::' would appear on the page)")
    if re.search(r"<script\b|\son[a-z]+\s*=|javascript:", body, re.I):
        fail(path, "scripts, on...= attributes and javascript: links are not allowed in content")
    for classes in re.findall(r'<div class="([^"]*)"', body):
        for c in classes.split():
            if c not in BOXES:
                fail(path, f"unknown box '{c}'; allowed: {', '.join(sorted(BOXES))}")


# ---------------------------------------------------------------- read-aloud buttons for glossary words

# With PIPER_MODEL pointing to a Piper voice (open source, runs offline), every glossary word is pre-rendered as an
# MP3 and served from our own server. Without it (e.g. a quick local build) the buttons use the browser's own voice.
AUDIO_CACHE = SITE / ".audio-cache"
SPRECHTEMPO = 1.15  # Piper length_scale: a little slower than normal speech, for learners
LAUTSPRECHER = ('<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" '
                'd="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 '
                '0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>')


class Vorleser:
    def __init__(self):
        self.voice, self.files = None, {}
        model = os.environ.get("PIPER_MODEL")
        if not model:
            return
        if not shutil.which("ffmpeg"):
            raise SystemExit("ERROR: PIPER_MODEL is set but ffmpeg is missing (needed to make MP3 files)")
        from piper import PiperVoice, SynthesisConfig  # pip install piper-tts
        self.voice = PiperVoice.load(model)
        self.config = SynthesisConfig(length_scale=SPRECHTEMPO)
        self.model_name = Path(model).name

    def audio(self, text):
        """URL of the MP3 for this text, rendered once and kept in site/.audio-cache/; None without a voice."""
        if not self.voice:
            return None
        key = hashlib.sha256(f"{self.model_name}|{SPRECHTEMPO}|{text}".encode()).hexdigest()[:16]
        mp3 = AUDIO_CACHE / f"{key}.mp3"
        if not mp3.is_file():
            AUDIO_CACHE.mkdir(parents=True, exist_ok=True)
            wav = mp3.with_suffix(".wav")
            with wave.open(str(wav), "wb") as wf:
                self.voice.synthesize_wav(text, wf, syn_config=self.config)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-codec:a", "libmp3lame",
                            "-b:a", "48k", str(mp3)], check=True)
            wav.unlink()
        self.files[key] = mp3
        return f"/audio/{key}.mp3"

    def copy_to_dist(self):
        for key, mp3 in self.files.items():
            (DIST / "audio").mkdir(exist_ok=True)
            shutil.copy(mp3, DIST / "audio" / f"{key}.mp3")


def sprechtext(term_html):
    """What is read aloud for a glossary term: the words without grammar notes in brackets."""
    text = html.unescape(re.sub(r"<[^>]+>", "", term_html))
    text = re.sub(r"\([^)]*\)", "", text).replace("/", ",")
    return " ".join(text.split()).strip(" ,")


def add_vorlesen(body, vorleser):
    def button(m):
        text = sprechtext(m.group(1))
        if not text:
            return m.group(0)
        url = vorleser.audio(text)
        audio = f' data-audio="{url}"' if url else ""
        # hidden until vorlesen.js knows it can play something (an MP3 or a German voice in the browser)
        return (f'<dt>{m.group(1)} <button type="button" class="vorlesen" data-text="{esc(text)}"{audio} '
                f'aria-label="{esc(text)} vorlesen" title="Vorlesen" hidden>{LAUTSPRECHER}</button></dt>')
    return re.sub(r"<dt>(.*?)</dt>", button, body, flags=re.S)


def repo_file(path, rel):
    """A download listed in front matter: must be a plain file inside the repository."""
    if not isinstance(rel, str) or rel.startswith("/") or "\\" in rel:
        fail(path, f"download path must be relative to the repository root: {rel!r}")
    src = (REPO / rel).resolve()
    if REPO not in src.parents or not src.is_file():
        fail(path, f"download file not found in the repository: {rel}")
    if not DATEINAME.fullmatch(src.name):
        fail(path, f"download file name '{src.name}' may only contain letters, digits, '.', '_' and '-'")
    return src


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


def thema_slug(thema):
    s = thema.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("&", " und ")):
        s = s.replace(a, b)
    return "-".join(re.findall(r"[a-z0-9]+", s))


def thema_link(thema):
    return f"/artikel/thema/{thema_slug(thema)}/"


def tag_kurz(iso):
    d = date.fromisoformat(iso)
    return f"{WOCHENTAGE[d.weekday()][:2]} {d.strftime('%d.%m.')}"


def asset(name):
    return f"/assets/{name}?v={ASSET_VERSION[name]}"  # new URL whenever the file changes, so caches never serve old JS


# ---------------------------------------------------------------- page frame

def toc(body_html, extra=()):
    found = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body_html) + list(extra)
    items = "".join(f'<li><a href="#{i}">{re.sub(r"<[^>]+>", "", t)}</a></li>' for i, t in found)
    if not items:
        return ""
    return f'<nav class="toc" aria-label="Inhalt"><details><summary>Inhalt</summary><ul>{items}</ul></details></nav>'


def blaettern(label, prev, nxt, prev_small="", next_small=""):
    if not (prev or nxt):
        return ""
    left = f'<a class="zurueck" href="{prev["url"]}"><small>{prev_small}</small>{esc(prev["title"])}</a>' if prev else "<span></span>"
    right = f'<a class="weiter" href="{nxt["url"]}"><small>{next_small}</small>{esc(nxt["title"])}</a>' if nxt else "<span></span>"
    return f'<nav class="blaettern" aria-label="{label}">{left}{right}</nav>'


def write(rel, content):
    out = DIST / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content, encoding="utf-8")


def layout(title, active, main, description="", scripts=()):
    current = ' aria-current="page"'
    links = "".join(f'<a href="{href}"{current if key == active else ""}>{label}</a>' for key, href, label in NAV)
    full_title = BRAND if title == BRAND else f"{title} – {BRAND}"
    script_tags = "".join(f'<script src="{asset(s)}"></script>' for s in ("hinweis.js", *scripts))
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full_title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="stylesheet" href="{asset('style.css')}">
</head>
<body>
<header class="site-header">
  <a class="brand" href="/">{BRAND}</a>
  <nav aria-label="Hauptmenü">{links}</nav>
</header>
<main>
{main}
</main>
<footer class="site-footer"><a href="/">{BRAND}</a> · <a href="/edv-kurs/">EDV-Kurs</a> · <a href="/artikel/">Artikel</a> · <a href="/hinweis/">Hinweise &amp; Datenschutz</a></footer>
{HINWEIS_DIALOG}
{script_tags}
</body>
</html>
"""


# The same promises appear in the dialog (every visit) and on /hinweis/. They must stay true:
# no accounts, forms, cookies, analytics or external scripts; nginx keeps no access logs.
HINWEIS_PUNKTE = [
    "Diese Website ist nur zum Lesen und Lernen da.",
    "Sie brauchen kein Konto. Wir sammeln und speichern keine persönlichen Daten, setzen keine Cookies, "
    "nutzen kein Tracking und schicken keine E-Mails oder Werbung.",
    "Was Sie hier tun – Suche, Quiz, Haken in Lektionen –, bleibt in Ihrem Browser und wird nicht an uns gesendet.",
    "Die Inhalte erklären öffentlich zugängliche Informationen, zum Beispiel Gesetze, in einfacher Sprache. "
    "Sie ersetzen keine Rechtsberatung.",
    "Die Website enthält keine persönlichen oder vertraulichen Daten über Menschen, Firmen oder andere "
    "Organisationen. Namen in Beispielen sind erfunden.",
]
HINWEIS_DIALOG = f"""<dialog id="hinweis-dialog" class="hinweis-dialog" aria-labelledby="hinweis-titel">
<h2 id="hinweis-titel">Hinweis zu dieser Website</h2>
<ul>{"".join(f"<li>{esc(t)}</li>" for t in HINWEIS_PUNKTE)}</ul>
<div class="aktionen"><a href="/hinweis/">Mehr dazu</a><button type="button">Verstanden</button></div>
</dialog>"""


def build_hinweis():
    punkte = "".join(f"<li>{esc(t)}</li>" for t in HINWEIS_PUNKTE)
    main = f"""<h1>Hinweise &amp; Datenschutz</h1>
<ul>{punkte}</ul>
<h2>Was in Ihrem Browser bleibt</h2>
<ul>
<li><strong>Haken in Lektionen:</strong> Ihr Fortschritt wird nur auf Ihrem Gerät gespeichert (im Speicher Ihres Browsers). Sie können ihn mit „Alle Haken entfernen“ oder über die Einstellungen Ihres Browsers löschen.</li>
<li><strong>Dieser Hinweis:</strong> Bis Sie den Tab schließen, merkt sich Ihr Browser, dass Sie ihn gelesen haben. Danach erscheint er wieder.</li>
<li><strong>Suche und Quiz:</strong> Es wird nichts gespeichert.</li>
</ul>
<h2>Technik</h2>
<ul>
<li>Die Seiten werden über Cloudflare ausgeliefert. Dabei werden technisch nötige Verbindungsdaten, zum Beispiel die IP-Adresse, verarbeitet. Nur wenn Cloudflare eine Sicherheitsprüfung zeigt, kann Cloudflare dafür ein technisch nötiges Cookie setzen.</li>
<li>Unser Webserver speichert keine Zugriffsprotokolle.</li>
<li>Vorlesen: Die Wörter wurden vorab aufgenommen und kommen von unserem Server. Fehlt eine Aufnahme, liest eine Stimme vor, die auf Ihrem Gerät installiert ist. Es werden keine Texte an andere Dienste geschickt.</li>
<li>Links zu anderen Websites, zum Beispiel zu Gesetzestexten, führen zu Angeboten mit eigenen Datenschutzregeln.</li>
</ul>
<h2>Inhalte</h2>
<p>Alle Angaben ohne Gewähr. Die Texte erklären allgemeine Regeln und ersetzen keine Beratung im Einzelfall.</p>"""
    write("hinweis/index.html", layout("Hinweise & Datenschutz", "", main, "Hinweise zu dieser Website und zum Datenschutz."))


# ---------------------------------------------------------------- articles

def load_themen():
    path = SITE / "themen.yaml"
    try:
        themen = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        fail(path, f"not valid YAML: {e}")
    if not isinstance(themen, list) or not themen or not all(isinstance(t, str) and t.strip() for t in themen):
        fail(path, "must be a non-empty list of topics, one per line starting with '- '")
    return themen


def load_articles(themen, vorleser):
    articles = []
    for path in sorted((CONTENT / "artikel").glob("*.md")):
        meta, body = read_source(path)
        a = {
            "slug": slug_of(path, meta),
            "title": text(path, meta, "title"),
            "thema": text(path, meta, "thema"),
            "kurz": text(path, meta, "kurz"),
            "quelle": text(path, meta, "quelle"),
            "datum": datum_of(path, meta),
            "stichwoerter": text_list(path, meta, "stichwoerter"),
            "reihenfolge": meta.get("reihenfolge", 0),
        }
        if a["thema"] not in themen:
            fail(path, f"thema '{a['thema']}' is not in site/themen.yaml (add it there first)")
        if not isinstance(a["reihenfolge"], int) or isinstance(a["reihenfolge"], bool):
            fail(path, "'reihenfolge' must be a whole number (position of the handout within its class day)")
        a["body"] = pandoc(path, body, "html5")
        check_body(path, a["body"])
        a["body"] = add_vorlesen(a["body"], vorleser)
        plain = pandoc(path, body, "plain")
        a["text"] = " ".join(re.sub(r"[-=+|]{3,}|\|", " ", plain).split())  # drop ASCII table borders
        a["url"] = f"/artikel/{a['slug']}/"
        a["minuten"] = max(1, math.ceil(len(a["text"].split()) / 180))
        a["quiz"] = load_quiz(path.with_name(f"{a['slug']}.quiz.json"))
        articles.append(a)
    return articles


def load_quiz(path):
    """Every article has a quiz in Quiz Forger's JSON format (quiz.ruslanlomaka.org), one correct answer per question."""
    if not path.is_file():
        fail(path, "missing: every article needs a quiz file <slug>.quiz.json (see CLAUDE.md)")
    try:
        quiz = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(path, f"not valid JSON: {e}")
    if not isinstance(quiz, dict) or not isinstance(quiz.get("title"), str) or not isinstance(quiz.get("questions"), list):
        fail(path, "needs 'title' (text) and 'questions' (list)")
    if not 5 <= len(quiz["questions"]) <= 30:
        fail(path, "needs between 5 and 30 questions")
    for n, q in enumerate(quiz["questions"], start=1):
        if not isinstance(q, dict) or not isinstance(q.get("question"), str) or not q["question"].strip():
            fail(path, f"question {n}: 'question' must be text")
        answers = q.get("answers")
        if not isinstance(answers, list) or not 3 <= len(answers) <= 4:
            fail(path, f"question {n}: needs 3 or 4 'answers'")
        for a in answers:
            if not isinstance(a, dict) or not isinstance(a.get("text"), str) or not a["text"].strip() \
                    or not isinstance(a.get("correct"), bool):
                fail(path, f"question {n}: every answer needs 'text' and 'correct': true/false")
        if sum(a["correct"] for a in answers) != 1:
            fail(path, f"question {n}: exactly one answer must be correct")
        if not isinstance(q.get("explanation", ""), str):
            fail(path, f"question {n}: 'explanation' must be text")
        for s in q.get("sources") or []:
            if not isinstance(s, dict) or not re.fullmatch(r"https?://[^\s<>\"']+", str(s.get("url", ""))):
                fail(path, f"question {n}: every source needs an http(s) 'url'")
    return quiz


def quiz_section(quiz):
    data = json.dumps(quiz, ensure_ascii=False).replace("<", "\\u003c")
    return f"""<section class="quiz" aria-labelledby="quiz">
<h2 id="quiz">Quiz</h2>
<p class="hinweis">{len(quiz['questions'])} Fragen mit je einer richtigen Antwort. Fragen und Antworten werden jedes Mal neu gemischt. Ihre Antworten werden nirgends gespeichert.</p>
<div class="quiz-box" data-quiz></div>
<noscript><p class="hinweis">Für das Quiz muss JavaScript eingeschaltet sein.</p></noscript>
<script id="quiz-daten" type="application/json">{data}</script>
</section>"""


def tag(a):
    return date.fromisoformat(a["datum"]).toordinal()


def build_article_pages(articles):
    # previous/next follow the course: dated articles in class order; undated ones stand alone
    dated = sorted((a for a in articles if a["datum"]), key=lambda a: (a["datum"], a["reihenfolge"], a["title"]))
    for a in articles:
        others = [b for b in articles if b["thema"] == a["thema"] and b is not a]
        others.sort(key=lambda b: (abs(tag(b) - tag(a)) if a["datum"] and b["datum"] else 10 ** 6, b["title"]))
        mehr = ""
        if others:
            items = "".join(f'<li><a href="{b["url"]}">{esc(b["title"])}</a></li>' for b in others[:5])
            mehr = (f'<section class="mehr"><h2>Mehr zum Thema „{esc(a["thema"])}“</h2><ul class="liste">{items}</ul>'
                    f'<p><a href="{thema_link(a["thema"])}">Alle Artikel zum Thema</a></p></section>')
        nav = ""
        if a in dated:
            i = dated.index(a)
            prev = dated[i - 1] if i else None
            nxt = dated[i + 1] if i + 1 < len(dated) else None
            nav = blaettern("Weitere Artikel", prev, nxt,
                            f"Vorheriger Artikel · {tag_kurz(prev['datum'])}" if prev else "",
                            f"Nächster Artikel · {tag_kurz(nxt['datum'])}" if nxt else "")
        chips = "".join(f'<li><a href="/artikel/?q={quote(k)}">{esc(k)}</a></li>' for k in a["stichwoerter"])
        stand = a["datum"][:4] if a["datum"] else str(date.today().year)
        meta_line = " · ".join(x for x in [esc(a["thema"]), datum_kurz(a["datum"]), f"ca. {a['minuten']} Min. Lesezeit"] if x)
        main = f"""<p class="crumbs"><a href="/artikel/">Artikel</a> › <a href="{thema_link(a['thema'])}">{esc(a['thema'])}</a></p>
<h1>{esc(a['title'])}</h1>
<p class="meta">{meta_line}</p>
{toc(a['body'], [("quiz", "Quiz")])}
<article class="inhalt">
{a['body']}
</article>
{quiz_section(a['quiz'])}
{f'<h2>Stichwörter</h2><ul class="chips">{chips}</ul>' if chips else ''}
{mehr}
{nav}
<p class="quelle">Grundlage: {esc(a['quelle'])}. Der Inhalt ist in eigenen Worten erklärt. Kästen mit „Ergänzung“ enthalten zusätzliche Informationen (Stand {stand}, ohne Gewähr). Keine Rechtsberatung.</p>"""
        write(f"artikel/{a['slug']}/index.html", layout(a["title"], "artikel", main, a["kurz"], ["quiz.js", "vorlesen.js"]))
    bilder = CONTENT / "artikel" / "bilder"
    if bilder.is_dir():
        shutil.copytree(bilder, DIST / "artikel" / "bilder")


def newest_first(articles):
    """Latest class day first, handouts of one day in their order; undated articles at the very end."""
    dated = sorted((a for a in articles if a["datum"]), key=lambda a: (-tag(a), a["reihenfolge"], a["title"]))
    return dated + sorted((a for a in articles if not a["datum"]), key=lambda a: a["title"])


def grouped_list(ordered, open_days, show_topic=True):
    """Articles grouped by class day, each day foldable; the first `open_days` dated days start open."""
    groups = []
    for a in ordered:
        if not groups or groups[-1][0] != a["datum"]:
            groups.append((a["datum"], []))
        groups[-1][1].append(a)
    parts = []
    for i, (datum, items) in enumerate(groups):
        rows = "".join(f'<li><a href="{a["url"]}">{esc(a["title"])}</a>'
                       + (f' <span class="badge">{esc(a["thema"])}</span>' if show_topic else "") + "</li>" for a in items)
        if not datum:  # undated articles: a plain list, no date label at all
            parts.append(f'<ul class="liste">{rows}</ul>')
            continue
        offen = " open" if open_days is None or i < open_days else ""
        parts.append(f'<details class="tag"{offen}><summary>{esc(datum_lang(datum))} '
                     f'<span class="zahl">({len(items)})</span></summary><ul class="liste">{rows}</ul></details>')
    return "".join(parts)


def topic_chips(articles, themen):
    used = [t for t in themen if any(a["thema"] == t for a in articles)]
    return used, "".join(f'<li><a href="{thema_link(t)}">{esc(t)} ({sum(a["thema"] == t for a in articles)})</a></li>'
                         for t in used)


def build_article_index(articles, themen):
    ordered = newest_first(articles)
    # full texts live in their own file, loaded only when someone searches
    volltext = json.dumps({a["url"]: a["text"] for a in ordered}, ensure_ascii=False)
    write("artikel/suchindex.json", volltext)
    volltext_url = f"/artikel/suchindex.json?v={hashlib.sha256(volltext.encode()).hexdigest()[:8]}"
    data = [{"title": a["title"], "url": a["url"], "datum": a["datum"], "datumLang": datum_lang(a["datum"]),
             "thema": a["thema"], "kurz": a["kurz"], "stichwoerter": a["stichwoerter"]} for a in ordered]
    used, chips = topic_chips(articles, themen)
    # every "<" escaped: no text can end the <script> element or switch the parser into script-escape mode
    payload = json.dumps({"artikel": data, "themen": used, "volltext": volltext_url},
                         ensure_ascii=False).replace("<", "\\u003c")
    main = f"""<h1>Artikel</h1>
<p class="lead">Arbeitsblätter aus dem Kurs – einfach erklärt. {anzahl(len(articles), "Artikel", "Artikel")}.</p>
<input id="suche" class="search" type="search" placeholder="Suchen: Titel, Stichwort oder Text …" aria-label="Artikel durchsuchen" autocomplete="off">
<ul id="themen" class="chips themen" aria-label="Themen">{chips}</ul>
<p id="anzahl" class="count" aria-live="polite"></p>
<div id="liste">{grouped_list(ordered, open_days=2)}</div>
<script id="daten" type="application/json">{payload}</script>"""
    write("artikel/index.html", layout("Artikel", "artikel", main, "Alle Arbeitsblätter aus dem Kurs, mit Suche.",
                                       ["suche.js"]))


def build_topic_pages(articles, themen):
    """One page per topic; works without JavaScript and is where article breadcrumbs point."""
    for t in topic_chips(articles, themen)[0]:
        items = [a for a in newest_first(articles) if a["thema"] == t]
        main = f"""<p class="crumbs"><a href="/artikel/">Artikel</a> › Thema</p>
<h1>{esc(t)}</h1>
<p class="lead">{anzahl(len(items), "Artikel", "Artikel")} zu diesem Thema.</p>
{grouped_list(items, open_days=None, show_topic=False)}
<p><a href="/artikel/">Alle Artikel und Suche</a></p>"""
        write(f"artikel/thema/{thema_slug(t)}/index.html", layout(t, "artikel", main, f"Alle Artikel zum Thema {t}."))


# ---------------------------------------------------------------- lessons

def download_list(path, meta, key):
    items = meta.get(key) or []
    if not isinstance(items, list):
        fail(path, f"'{key}' must be a list of downloads")
    result = []
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("datei"), str) or not isinstance(item.get("titel"), str):
            fail(path, f"every entry in '{key}' needs 'datei' (path) and 'titel' (text)")
        if not isinstance(item.get("text", ""), str):
            fail(path, f"'text' of '{item['titel']}' in '{key}' must be text")
        result.append({"src": repo_file(path, item["datei"]), "titel": item["titel"], "text": item.get("text", "")})
    return result


def load_lessons():
    lessons = []
    for path in sorted((CONTENT / "edv-kurs").glob("*.md")):
        meta, body = read_source(path)
        l = {
            "path": path,
            "slug": slug_of(path, meta),
            "title": text(path, meta, "title"),
            "kurz": text(path, meta, "kurz"),
            "untertitel": text(path, meta, "untertitel", required=False),
            "dauer": text(path, meta, "dauer", required=False),
            "niveau": text(path, meta, "niveau", required=False),
            "ziele": text_list(path, meta, "ziele"),
            "nummer": meta.get("nummer"),
            "dateien": download_list(path, meta, "dateien"),
            "lehrkraft": download_list(path, meta, "lehrkraft"),
            "paket": None,
        }
        if not isinstance(l["nummer"], int) or isinstance(l["nummer"], bool) or l["nummer"] < 1:
            fail(path, "'nummer' must be a whole number from 1 (the lesson number)")
        if meta.get("paket") is not None:
            p = meta["paket"]
            if not isinstance(p, dict) or not isinstance(p.get("name"), str) or not isinstance(p.get("titel"), str) \
                    or not isinstance(p.get("dateien"), list) or not p["dateien"]:
                fail(path, "'paket' needs 'name' (file name ending in .zip), 'titel' and a list 'dateien'")
            if not DATEINAME.fullmatch(p["name"]) or not p["name"].endswith(".zip"):
                fail(path, f"paket name '{p['name']}' must be a plain file name ending in .zip")
            l["paket"] = {"name": p["name"], "titel": p["titel"], "dateien": [repo_file(path, f) for f in p["dateien"]]}
        names = [d["src"].name for d in l["dateien"] + l["lehrkraft"]] + ([l["paket"]["name"]] if l["paket"] else [])
        dupes = sorted({n for n in names if names.count(n) > 1})
        if dupes:
            fail(path, f"two downloads would have the same file name: {', '.join(dupes)}")
        l["body"] = pandoc(path, body, "html5")
        check_body(path, l["body"])
        l["url"] = f"/edv-kurs/{l['slug']}/"
        lessons.append(l)
    nummern = [l["nummer"] for l in lessons]
    for l in lessons:
        if nummern.count(l["nummer"]) > 1:
            fail(l["path"], f"another lesson also has nummer {l['nummer']}")
    lessons.sort(key=lambda l: l["nummer"])
    return lessons


def lesson_meta(lesson):
    return " · ".join(esc(x) for x in [f"Lektion {lesson['nummer']}", lesson["dauer"], lesson["niveau"]] if x)


def copy_download(lesson, src):
    dest = DIST / "edv-kurs" / lesson["slug"] / "dateien" / src.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    return dest


def file_list(lesson, items):
    rows = []
    for item in items:
        src = item["src"]
        copy_download(lesson, src)
        typ = TYP.get(src.suffix.lower(), src.suffix.lstrip(".").upper())
        dl = "" if src.suffix.lower() == ".pdf" else " download"  # PDFs open in the browser
        rows.append(f'<li><a href="dateien/{src.name}"{dl}>{esc(item["titel"])}</a> '
                    f'<span class="typ">{esc(typ)} · {groesse(src.stat().st_size)}</span>'
                    f'<br><span class="dateiname">{src.name}</span>'
                    f'<br><span class="hinweis">{esc(item["text"])}</span></li>')
    return f'<ul class="dateiliste">{"".join(rows)}</ul>'


def zip_button(lesson):
    p = lesson["paket"]
    if not p:
        return ""
    zpath = DIST / "edv-kurs" / lesson["slug"] / "dateien" / p["name"]
    zpath.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zpath, "w") as z:
        for src in p["dateien"]:
            info = zipfile.ZipInfo(src.name, date_time=(2020, 1, 1, 0, 0, 0))  # fixed time: same input, same ZIP
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, src.read_bytes())
    return (f'<a class="btn" href="dateien/{p["name"]}" download>{esc(p["titel"])} '
            f'<span>ZIP · {groesse(zpath.stat().st_size)}</span></a>')


def build_lessons(lessons):
    for i, l in enumerate(lessons):
        ziele = "".join(f"<li>{esc(z)}</li>" for z in l["ziele"])
        ziele = f'<section class="ziele"><h2>Das lernen Sie</h2><ul>{ziele}</ul></section>' if ziele else ""
        downloads = ""
        if l["paket"] and l["dateien"]:
            downloads = (f'<section class="downloads"><h2>Dateien</h2>{zip_button(l)}'
                         f'<details class="einzeln"><summary>Einzelne Dateien ({len(l["dateien"])})</summary>'
                         f'{file_list(l, l["dateien"])}</details></section>')
        elif l["paket"] or l["dateien"]:
            downloads = f'<section class="downloads"><h2>Dateien</h2>{zip_button(l)}{file_list(l, l["dateien"])}</section>'
        lehrkraft = ""
        if l["lehrkraft"]:
            lehrkraft = f'<section class="lehrkraft"><h2>Für Lehrkräfte</h2>{file_list(l, l["lehrkraft"])}</section>'
        nav = blaettern("Weitere Lektionen", lessons[i - 1] if i else None, lessons[i + 1] if i + 1 < len(lessons) else None,
                        "Vorherige Lektion", "Nächste Lektion")
        main = f"""<p class="crumbs"><a href="/edv-kurs/">EDV-Kurs</a> › Lektion {l['nummer']}</p>
<h1>{esc(l['title'])}</h1>
{f'<p class="untertitel">{esc(l["untertitel"])}</p>' if l['untertitel'] else ''}
<p class="meta">{lesson_meta(l)}</p>
<p class="lead">{esc(l['kurz'])}</p>
{ziele}
{downloads}
<div class="fortschritt" data-lektion="{l['slug']}" hidden>
  <div class="balken"><span></span></div>
  <p class="zahl"></p>
</div>
{toc(l['body'])}
<article class="inhalt lektion">
{l['body']}
</article>
<p class="zuruecksetzen" hidden><button type="button" class="reset">Alle Haken entfernen</button></p>
{lehrkraft}
{nav}"""
        write(f"edv-kurs/{l['slug']}/index.html", layout(l["title"], "kurs", main, l["kurz"], ["lektion.js"]))
    bilder = CONTENT / "edv-kurs" / "bilder"
    if bilder.is_dir():
        shutil.copytree(bilder, DIST / "edv-kurs" / "bilder")


def build_lesson_index(lessons):
    cards = ""
    for l in lessons:
        untertitel = f'<p><strong>{esc(l["untertitel"])}</strong></p>' if l["untertitel"] else ""
        cards += (f'<article class="card"><p class="meta">{lesson_meta(l)}</p>'
                  f'<h2><a href="{l["url"]}">{esc(l["title"])}</a></h2>{untertitel}<p>{esc(l["kurz"])}</p></article>')
    main = f"""<h1>EDV-Kurs</h1>
<p class="lead">Lektionen zum Mitmachen am Computer – Schritt für Schritt, mit Übungsdateien.</p>
{cards}"""
    write("edv-kurs/index.html", layout("EDV-Kurs", "kurs", main, "Lektionen zum Mitmachen am Computer."))


# ---------------------------------------------------------------- start + 404

SUCHFORMULAR = """<form class="startsuche" action="/artikel/" method="get" role="search">
  <input class="search" type="search" name="q" placeholder="Artikel durchsuchen …" aria-label="Artikel durchsuchen">
</form>"""


def build_start(articles, lessons):
    # the whole latest class day (up to ~10 handouts), not just a fixed number of articles
    letzter = max((a["datum"] for a in articles if a["datum"]), default="")
    if letzter:
        neu = [a for a in newest_first(articles) if a["datum"] == letzter]
        ueberschrift = f"Letzter Kurstag: {datum_lang(letzter)}"
    else:
        neu = newest_first(articles)[:5]
        ueberschrift = "Neueste Artikel"
    items = "".join(f'<li><a href="{a["url"]}">{esc(a["title"])}</a> <span class="badge">{esc(a["thema"])}</span></li>'
                    for a in neu)
    main = f"""<h1>{BRAND}</h1>
<p class="lead">Unterlagen, Übungen und Anleitungen aus unserem Kurs – einfach erklärt.</p>
{SUCHFORMULAR}
<div class="bereiche">
  <a class="bereich" href="/edv-kurs/"><strong>EDV-Kurs</strong><span>Lektionen zum Mitmachen am Computer</span><small>{anzahl(len(lessons), "Lektion", "Lektionen")}</small></a>
  <a class="bereich" href="/artikel/"><strong>Artikel</strong><span>Arbeitsblätter aus dem Kurs, einfach erklärt</span><small>{anzahl(len(articles), "Artikel", "Artikel")}</small></a>
</div>
<h2>{esc(ueberschrift)}</h2>
<ul class="liste">{items}</ul>
<p><a href="/artikel/">Alle Artikel</a></p>"""
    write("index.html", layout(BRAND, "start", main, "Unterlagen und Übungen aus unserem Kurs."))
    write("404.html", layout("Seite nicht gefunden", "", f"""<h1>Seite nicht gefunden</h1>
<p class="lead">Diese Seite gibt es nicht. Vielleicht finden Sie sie mit der Suche:</p>
{SUCHFORMULAR}
<p><a href="/">Startseite</a> · <a href="/edv-kurs/">EDV-Kurs</a> · <a href="/artikel/">Artikel</a></p>"""))


# ---------------------------------------------------------------- final check of the built site

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links = set(), []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("href", "src", "action"):
            if attrs.get(key):
                self.links.append(attrs[key])


def check_links():
    pages = {}
    for f in DIST.rglob("*.html"):
        parser = Links()
        parser.feed(f.read_text(encoding="utf-8"))
        pages[f] = parser
    errors = []
    for f, parser in pages.items():
        here = "/" + f.relative_to(DIST).as_posix()
        for link in parser.links:
            u = urlsplit(link)
            if u.scheme in ("http", "https", "mailto", "tel"):
                continue
            if u.scheme or u.netloc:
                errors.append(f"{here}: link type not allowed: {link}")
                continue
            target = f
            if u.path:
                path = unquote(u.path)
                if not path.startswith("/"):
                    path = posixpath.join(posixpath.dirname(here), path)
                folder = path.endswith("/")
                target = DIST / posixpath.normpath(path).lstrip("/")
                if folder or target.is_dir():
                    target = target / "index.html"
            if not target.is_file():
                errors.append(f"{here}: broken link {link}")
            elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
                errors.append(f"{here}: no anchor #{u.fragment} for link {link}")
    if errors:
        raise SystemExit("ERROR in the built site (fix the Markdown file of that page):\n  " + "\n  ".join(errors))


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SITE / "assets", DIST / "assets")
    for f in (SITE / "assets").iterdir():
        ASSET_VERSION[f.name] = hashlib.sha256(f.read_bytes()).hexdigest()[:8]
    themen = load_themen()
    vorleser = Vorleser()
    articles = load_articles(themen, vorleser)
    lessons = load_lessons()
    build_article_pages(articles)
    build_article_index(articles, themen)
    build_topic_pages(articles, themen)
    build_lessons(lessons)
    build_lesson_index(lessons)
    build_start(articles, lessons)
    build_hinweis()
    vorleser.copy_to_dist()
    check_links()
    audio = f"{len(vorleser.files)} audio file(s)" if vorleser.voice else "no audio (PIPER_MODEL not set: browser voice only)"
    print(f"built {len(articles)} article(s), {len(lessons)} lesson(s), {audio} into {DIST}; all links checked")


if __name__ == "__main__":
    main()
