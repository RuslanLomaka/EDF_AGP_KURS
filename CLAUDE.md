# CLAUDE.md

Guidance for Claude (and other agents) working in this repository.

## What this is

"Kursmaterial": a small static website plus teaching materials for a German job-training course in Husum
(participants of the "Job plus" programme; trainer: Ruslan, the repo owner).
- The owner writes to Claude in English or Ukrainian. **All site content is German, in simple language (about B1),
  formal "Sie".**
- **This repository is PUBLIC.** Never commit secrets, real personal data, scans or photos of handouts.
- Docs (this file, README, docs/) describe the current state only. Solved problems live in git history, not here.

## Layout

```
site/
  content/artikel/*.md        one article per course handout (YAML front matter + pandoc Markdown)
  content/edv-kurs/*.md       interactive EDV lessons; content/edv-kurs/bilder/ holds their images
  themen.yaml                 allowed article topics, in display order
  assets/                     style.css (light + dark mode), suche.js (article list), lektion.js (lesson steps)
  build.py                    builds everything into site/dist/ (git-ignored)
materials/serienbrief/        files of lesson 1 (Excel list, Word mail-merge letters, handout, day plan)
  generator/                  scripts that rebuild every file of that kit
docs/handoff-serienbrief.md   background of lesson 1: design decisions and Office gotchas
```

Site sections (top navigation, fixed at three items): **Start · EDV-Kurs · Artikel**.
- `/edv-kurs/`: numbered lessons; `/edv-kurs/<slug>/` with downloads, checkable steps and progress (kept in the
  visitor's browser), help and a self-test.
- `/artikel/`: all articles with search (title, keywords, full text, umlaut-insensitive), topic filter and grouping
  by class day; `/artikel/<slug>/` with table of contents, keywords, "Mehr zum Thema" and previous/next links.

## Build and check

```bash
python3 site/build.py                # needs pandoc and PyYAML
cd site/dist && python3 -m http.server 8000   # links are absolute (/artikel/...), so preview over HTTP
```

The build stops with a clear message on missing front matter, an unknown topic, a bad date, a duplicate slug or a
missing download file. Before committing, check at phone width (390 px): no horizontal scrolling, search and topic
filter work, lesson checkboxes work.

## Adding an article from photos (the main recurring task)

The owner sends photos of a handout (often several per day; several pages can be ONE text with its exercises).
1. Work out which pages belong together. If unsure, ask.
2. Create `site/content/artikel/<slug>.md`. The slug is lowercase with hyphens and must equal the file name.
   Front matter fields:
   - `title`, `slug`, `thema` (must be listed in `site/themen.yaml`; reuse a topic, add one only if none fits);
   - `datum` (ISO `YYYY-MM-DD`, the class day; leave `""` and ask if unknown);
   - `stichwoerter` (list, used by the search);
   - `kurz` (1–2 sentences);
   - `quelle`.
3. Write the content **in your own words**, never as a verbatim copy (copyright). The goal is that every nuance is
   understood, not a word-for-word transfer. Words the owner crossed out or underlined are hints, not text.
4. Follow the structure of `brutto-und-netto.md`:
   - a `::: kurz` box ("Kurz gesagt");
   - short sections with `{#ids}`;
   - **anything not in the handout goes into a `::: ergaenzung` box** (extra facts, numbers, tips; marked "Stand
     2026, ohne Gewähr" in the footer). Extend only within reason, not a Wikipedia article;
   - a "Wörter" glossary as a definition list (article + plural, simple explanation, example sentence);
   - "Fragen zum Text": the handout's questions as `<details><summary>question</summary>answer</details>`.
5. Run the build, check the result at phone width, commit, push. Lists, search, topic filter, "Mehr zum Thema"
   and previous/next links update automatically.

## Adding a lesson

Create `site/content/edv-kurs/<slug>.md` like `bewerbung-auf-knopfdruck.md`: front matter `title`, `slug`, `nummer`,
`kurz`, optional `untertitel`, `dauer`, `niveau`, `ziele`, `dateien` / `lehrkraft` (download lists, paths from the repo
root), `paket` (ZIP of several files). Steps go in `::: schritte` blocks (numbered list); boxes: `::: kurz`,
`::: info`, `::: achtung`. Lesson files live under `materials/<lesson>/`.

## Hosting and CI/CD

Target: the owner's Raspberry Pi, which already hosts java.ruslanlomaka.org (repo RuslanLomaka/OnlineJavaSandbox)
behind a Cloudflare Tunnel. This site is live at **https://edv.ruslanlomaka.org**.

- `.github/workflows/deploy.yml`:
  - **build** runs on every push and pull request: pandoc + PyYAML → `site/build.py` → release tarball.
  - **deploy** runs on pushes to `main` and manual runs only. It connects over Tailscale (tag `tag:ci`) + SSH,
    checks that port 8090 is free or already used by our container, uploads to `~/projects/kursmaterial` on the
    Pi, runs `docker compose up -d --force-recreate`, and checks that `/`, `/artikel/` and `/edv-kurs/` answer on 127.0.0.1:8090.
  - Without all five secrets (`TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `PI_HOST`, `PI_USER`, `PI_SSH_PRIVATE_KEY`)
    the deploy is skipped with a warning instead of failing.
- `deploy/compose.yaml` (compose project `kursmaterial`, container `kursmaterial-web`, nginx on `127.0.0.1:8090`,
  64 MB limit) and `deploy/nginx.conf`. Never touch the OnlineJavaSandbox stack on the Pi.
- The previous version stays in `~/projects/kursmaterial/html.previous` on the Pi.
- Cloudflare tunnel `pi-4gb-tunnel` has the route `edv.ruslanlomaka.org` → `http://localhost:8090`.
- The repo is public, so Actions logs are public. Never print secrets or host details in the logs.

## Open points

- Ask the course teacher / supervisor before publishing materials made for the course; the day plan names "Job plus".
- Class date of the article "Brutto und Netto" is unknown.
