# Kursmaterial

**https://edv.ruslanlomaka.org** – Unterlagen, Übungen und Anleitungen in einfacher Sprache.

A small, read-only website with learning material for adults in job training in Germany: interactive computer
lessons and short articles about work, money and labour law, each with a glossary, questions and a quiz. All
content is German at about level B1 and works on phones.

## Features

- **EDV-Kurs:** step-by-step computer lessons with downloadable exercise files (single files or one ZIP),
  tick-off steps with a progress bar, a help section and a self-test. Lesson 1, *Bewerbung auf Knopfdruck*, teaches
  mail merge: an Excel list of job offers becomes finished Word cover letters with one click.
  Lesson 2, *Bewerbungen mit einem Doppelklick*, offers a small Windows program (built from source in CI) that
  turns the same kind of Excel list into one ready cover letter per company. Lesson 3, *Gemeinsam arbeiten mit
  Google Docs*, introduces the browser, the cloud, sharing, comments, suggestions and converting Word ↔ Google Docs
  ↔ PDF, with a shared class project.
- **Artikel:** handouts from the course rewritten in plain German. Each article has:
  - a short summary;
  - clearly marked additions;
  - a glossary;
  - the questions from the handout with answers to reveal;
  - a list of official sources;
  - a quiz.
- **Read aloud:**
  - every word in an article's glossary has a speaker button that says it in German;
  - the audio is pre-rendered during the build with the open-source TTS engine [Piper](https://github.com/OHF-Voice/piper1-gpl)
    and the German voice *Thorsten* (dataset CC0), then served from the site's own server;
  - if no recording exists, the button uses a German voice installed on the visitor's device. Online voices
    are never used.
- **Quizzes:**
  - about 10 multiple-choice questions per article, with answers labelled A, B, C;
  - questions and answers are shuffled on every load, so nobody sees the same order twice;
  - each answer gets instant feedback with an explanation and a source;
  - the quiz files use the format of [Quiz Forger](https://quiz.ruslanlomaka.org)
    ([source](https://github.com/RuslanLomaka/cs50quiz)) and can be imported there.
- **Finding things:**
  - search over titles, keywords, summaries and full texts, ignoring umlaut spelling ("abzuge", "abzüge" and
    "abzuege" all match);
  - topic pages, the articles grouped by the day they were added, and the latest day on the start page;
  - series of articles that build on each other ("Teil 2 von 5", "Weiter mit Teil 3"), shown together in all lists.
- **Comfortable to use:** works on phones from 320 px, dark mode, keyboard and screen-reader friendly, print view
  for articles.

## Privacy

The site is read-only and collects nothing:
- no accounts, forms, cookies, tracking, analytics, newsletters or third-party scripts;
- search, quiz answers and lesson ticks never leave the browser. Lesson progress is kept in the visitor's own
  browser storage; for the notice, the browser keeps only the date it was last seen;
- the web server keeps no access logs;
- the content explains public information (mostly laws) and is not legal advice. Names in examples are invented.

A small bar at the bottom says this once a day, and [`/hinweis/`](https://edv.ruslanlomaka.org/hinweis/) has the details.
Pages are served through Cloudflare, which processes connection data such as IP addresses to deliver them.

## How content gets added

1. Photos of a handout arrive. An own-words note is saved in `entwuerfe/` first.
2. The note becomes a Markdown article in `site/content/artikel/<slug>.md` plus a quiz
   `site/content/artikel/<slug>.quiz.json`. The text is never copied word for word; facts are checked against
   official sources, which are listed under "Quellen".
3. `python3 site/build.py` checks everything and builds the site.
4. A push to `main` deploys it.

[`CLAUDE.md`](CLAUDE.md) has the exact rules: front matter fields, article structure, boxes, quiz format and
privacy promises.

## Repository layout

```
site/
  content/artikel/          articles (*.md) and their quizzes (*.quiz.json); images in bilder/
  content/edv-kurs/         lessons (*.md); images in bilder/
  themen.yaml               allowed article topics
  assets/                   style.css, suche.js, lektion.js, quiz.js, hinweis.js
  build.py                  static site generator and checker
materials/serienbrief/      files of lesson 1 and the generator that rebuilds them (see its README)
entwuerfe/                  notes on handouts waiting to become articles (not published)
deploy/                     docker compose + nginx config for the server
.github/workflows/          build and deploy
```

## Build locally

Needs Python 3, pandoc and PyYAML.

```bash
python3 site/build.py                          # writes site/dist/ (no audio: buttons use the browser's voice)
PIPER_MODEL=path/to/de_DE-thorsten-medium.onnx .venv/bin/python site/build.py   # with audio (pip install piper-tts)
cd site/dist && python3 -m http.server 8000    # open http://localhost:8000
```

The build stops with `ERROR in <file>: <reason>` on content mistakes, for example:
- missing or wrongly typed fields;
- an invalid date or an unknown topic;
- a missing download or an unclosed box;
- scripts in the content;
- an invalid or missing quiz.

Afterwards it checks every internal link and anchor in the result.

## Quiz format

```json
{
  "title": "Arbeitszeit und Pausen",
  "questions": [
    {
      "question": "Wie lange muss die Ruhezeit nach Feierabend mindestens sein?",
      "answers": [
        { "text": "11 Stunden ohne Unterbrechung", "correct": true },
        { "text": "8 Stunden", "correct": false },
        { "text": "6 Stunden", "correct": false }
      ],
      "explanation": "Beispiel: Feierabend um 22 Uhr, Arbeitsbeginn frühestens um 9 Uhr.",
      "sources": [{ "title": "Arbeitszeitgesetz", "url": "https://www.gesetze-im-internet.de/arbzg/" }]
    }
  ]
}
```

Rules checked by the build: 5–30 questions, 3–4 answers each, exactly one correct, sources only http(s).

## Deployment

- **Build:** GitHub Actions builds every push.
- **Deploy:** pushes to `main` are deployed to a Raspberry Pi over Tailscale and SSH.
- **Web server on the Pi:** a non-root nginx container with a read-only file system, no capabilities, CPU, memory
  and process limits, listening only on `127.0.0.1:8090`. A Cloudflare Tunnel publishes it.
- **Safety checks:**
  - the deploy checks the port before changing anything;
  - it then checks that the new version answers, and restores the previous version automatically if it does not.
- **Browser security:** the site sends a Content-Security-Policy: only its own scripts, no framing.

## Tech

Python + pandoc (generator), Piper TTS + ffmpeg (glossary audio, build time only), plain HTML/CSS/JavaScript without
frameworks, nginx, Docker Compose, GitHub Actions, Tailscale, Cloudflare Tunnel.
