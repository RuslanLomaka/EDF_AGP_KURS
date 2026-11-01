# CLAUDE.md

Guidance for Claude (and other agents) working in this repository.

## What this is

"Kursmaterial": a static website plus teaching materials for a German job-training course, live at
**https://edv.ruslanlomaka.org**. Trainer and owner: Ruslan.
- The owner writes to Claude in English or Ukrainian. **All site content is German, in simple language (about B1),
  formal "Sie".**
- **This repository is PUBLIC.** Never commit secrets, real personal data, scans or photos of handouts.
- Docs (this file, README, materials/*/README.md) describe the current state only. Solved problems live in git
  history, not here.
- Work on `main`. **Every push to `main` deploys to the live site** (no staging), so run the build before pushing.

## Layout

```
site/
  content/artikel/*.md        one article per course handout (YAML front matter + pandoc Markdown)
  content/artikel/bilder/     article images (served at /artikel/bilder/)
  content/edv-kurs/*.md       interactive lessons; content/edv-kurs/bilder/ holds their images
  themen.yaml                 allowed article topics, in display order
  content/artikel/*.quiz.json  one quiz per article (Quiz Forger JSON format)
  assets/                     style.css, suche.js (article list + search), lektion.js (lesson steps),
                              quiz.js (article quizzes), hinweis.js (privacy notice once per visit)
  build.py                    builds everything into site/dist/ (git-ignored) and checks it
materials/serienbrief/        files of lesson 1; README.md explains them; generator/build_kit.sh rebuilds them
entwuerfe/                    own-words notes on handouts not yet turned into articles (not published)
deploy/                       compose.yaml + nginx.conf for the web server on the Pi
.github/workflows/deploy.yml  build on every push, deploy from main
```

## Site

Top navigation, fixed at three items: **Start · EDV-Kurs · Artikel**.
- `/`: search box, the two sections, all articles of the latest class day.
- `/edv-kurs/<slug>/`: lesson with downloads (ZIP + single files), checkable steps (progress in the visitor's
  browser), help, self-test, files for teachers.
- `/artikel/`: search (title, keywords, summary, full text; umlaut-insensitive; full texts load from
  `suchindex.json` on the first search), topic filter, class days as foldable groups (latest two open).
- `/artikel/<slug>/`: table of contents, quiz, keywords, "Mehr zum Thema" (nearest dates), previous/next in class
  order.
- `/hinweis/`: privacy and purpose notice; the same points open as a dialog once per visit on every page.
- `/artikel/thema/<topic>/`: all articles of one topic, works without JavaScript.

**URLs are permanent.** Never rename or delete a published slug or topic: links get printed and shared.

## Build and check

```bash
python3 site/build.py                          # needs pandoc and PyYAML
cd site/dist && python3 -m http.server 8000    # links are absolute (/artikel/...), so preview over HTTP
```

The build stops with `ERROR in <file>: <reason>` on content mistakes:
- missing or mistyped fields, invalid YAML;
- a date that is not a real `YYYY-MM-DD`, a slug that is not lowercase a-z/0-9/hyphens;
- an unknown topic, duplicate lesson numbers;
- a missing download file;
- an unclosed or unknown `:::` box, `<script>`, `on…=` attributes or `javascript:` links in content.

Afterwards it checks every internal link and `#anchor` in the built site. Before pushing, also look at changed
pages at phone width (390 px).

The live server sends a Content-Security-Policy: no inline scripts and nothing from other domains. JavaScript
belongs in `site/assets/`; images are stored in the repository.

## Adding an article from photos (the main recurring task)

The owner sends photos of a handout (often several per day; several pages can be ONE text with its exercises).
1. Work out which pages belong together. If unsure, ask.
2. Create `site/content/artikel/<slug>.md`. The slug equals the file name. Front matter:
   - `title`, `slug`;
   - `thema`: must be listed in `site/themen.yaml`; reuse a topic, add one only if none fits;
   - `datum`: the day the owner **sent** the photos, as `"YYYY-MM-DD"` (not the day you process them);
   - `reihenfolge`: whole number, the handout's position among those sent that day;
   - `stichwoerter`: a list, used by the search;
   - `kurz`: 1–2 sentences;
   - `quelle`.
3. Write the content **in your own words**, never as a verbatim copy (copyright). The goal is that every nuance is
   understood. Words the owner crossed out or underlined are hints, not text.
4. Follow the structure of `brutto-und-netto.md`:
   - a `::: kurz` box ("Kurz gesagt");
   - short sections with `{#ids}`;
   - **anything not in the handout goes into a `::: ergaenzung` box**. Extend only within reason, not a Wikipedia
     article;
   - a "Wörter" glossary as a definition list (article + plural, simple explanation, example sentence);
   - "Fragen zum Text": the handout's questions as `<details><summary>question</summary>answer</details>`.
   - "Quellen" at the end: links to official or reliable sources (gesetze-im-internet.de, federal ministries,
     Bundesagentur für Arbeit, familienportal.de, Verbraucherzentrale, DGB). Check every URL answers 200 before
     publishing. Facts from these sources may extend the article (in `::: ergaenzung` boxes).
5. Write the quiz `site/content/artikel/<slug>.quiz.json` in Quiz Forger's format (importable at
   quiz.ruslanlomaka.org): `{"title", "questions": [{"question", "answers": [{"text", "correct"}], "explanation",
   "sources": [{"title", "url"}]}]}`. About 10 questions, 3 answers, exactly one correct, wrong answers plausible,
   a short explanation for each. The build refuses articles without a valid quiz; the page shuffles questions and
   answers on every load.
6. Images only if they help: own diagrams or screenshots, never photos of the handout. Put them in
   `site/content/artikel/bilder/`, link them as `/artikel/bilder/<file>`, and always write alt text.
7. Build, check, commit, push. Lists, search, topic pages, "Mehr zum Thema" and previous/next update by themselves.

**Batches of photos.** The owner sends groups of photos and says when to start. Then:
- first save one own-words note per handout in `entwuerfe/NN-<slug>.md` and push it (photos in the chat may
  not be available later);
- work slowly to save the owner's usage limits: about 3 articles per 5 hours, one push per batch;
- delete each note when its article is published.

## Adding a lesson

Create `site/content/edv-kurs/<slug>.md` like `bewerbung-auf-knopfdruck.md`.
- **Front matter:**
  - required: `title`, `slug`, `nummer` (unique whole number), `kurz`;
  - optional: `untertitel`, `dauer`, `niveau`, `ziele`;
  - downloads: `dateien` and `lehrkraft` (lists of `datei`, a path from the repo root, plus `titel` and `text`),
    and `paket` (one ZIP made of several files).
- **Body:** steps go in `::: schritte` blocks (numbered lists); the boxes are `::: kurz`, `::: info` and
  `::: achtung`.
- **Files:** lesson files live in `materials/<lesson>/`.

## Hosting and CI/CD

The owner's Raspberry Pi serves the site behind a Cloudflare Tunnel (route `edv.ruslanlomaka.org` →
`http://localhost:8090`).
- `.github/workflows/deploy.yml`:
  - **build** runs on every push and on pull requests to `main`.
  - **deploy** runs only from `main` (and manually). It works in this order:
    1. connects over Tailscale (`tag:ci`) and SSH;
    2. checks that port 8090 is free or already ours;
    3. uploads to `~/projects/kursmaterial` and runs `docker compose up -d --force-recreate --pull always`;
    4. checks `/`, `/artikel/` and `/edv-kurs/`.

    If the new version does not answer, it restores the previous `html/`, `compose.yaml` and `nginx.conf` and fails.
  - Actions are pinned by commit SHA; Dependabot proposes updates monthly.
  - Secrets: `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `PI_HOST`, `PI_USER`, `PI_SSH_PRIVATE_KEY`.
- `deploy/compose.yaml`:
  - its own compose project (`kursmaterial`), so it never touches other containers on the Pi;
  - non-root nginx on `127.0.0.1:8090`;
  - read-only file system, no capabilities, limits on CPU, memory and processes.
- Actions logs are public: never print secrets, IP addresses or web server access logs.

## Privacy promises (keep them true)

The notice (dialog + `/hinweis/`, text in `HINWEIS_PUNKTE` in `build.py`) promises:
- no accounts, forms, cookies, tracking, analytics, e-mails or external scripts;
- inputs stay in the browser: lesson ticks in `localStorage`, the "notice seen" flag in `sessionStorage`;
- no access logs on the server (`access_log off` in `deploy/nginx.conf`);
- only public information, no legal advice, no personal or confidential data about real people or companies.

Any change that would break one of these promises must also change the notice text, and needs the owner's OK.

## Open points

- The owner still decides whether the programme and employer may be named in public files: the day plan PDF and
  the repository name mention them.
