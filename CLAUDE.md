# CLAUDE.md

Guidance for Claude (and other agents) working in this repository.

## What this is

"Kursmaterial": a small static website plus teaching materials for a German job-training course in Husum
(participants of the "Job plus" programme; trainer: Ruslan, the repo owner).
- The owner writes to Claude in English or Ukrainian. **All site content is German, in simple language (about B1),
  formal "Sie".**
- **This repository is PUBLIC.** Never commit secrets, real personal data, scans or photos of handouts.

## Layout

```
site/
  content/unterlagen/*.md   one article per course handout (YAML front matter + pandoc Markdown)
  templates/artikel.html    pandoc template for articles
  assets/style.css          the only stylesheet (light + dark mode)
  build.py                  builds everything into site/dist/ (git-ignored)
materials/serienbrief/      lesson kit "Bewerbung auf Knopfdruck" (Excel list + Word mail merge), see LIES_MICH.txt
  generator/                scripts that rebuild every file of the kit
docs/handoff-serienbrief.md full background of the mail-merge lesson: design decisions, gotchas, history
```

Site sections (top navigation): **Start · Bewerbung auf Knopfdruck · Unterlagen**.

## Build and check

```bash
python3 site/build.py                # needs pandoc and PyYAML
python3 site/build.py --inline-css   # self-contained pages, e.g. to send a single HTML file as a preview
```

Before committing, open the pages at phone width (390 px):
- no horizontal scrolling;
- the search on `unterlagen/index.html` finds words from the title, the keywords and the full text;
- the search ignores umlauts: "abzuge", "abzüge" and "abzuege" all match "Abzüge".

## Adding an article from photos (the main recurring task)

The owner sends photos of a handout (often several per day; several pages can be ONE text with its exercises).
1. Work out which pages belong together. If unsure, ask.
2. Create `site/content/unterlagen/<slug>.md`. The slug is lowercase with hyphens and must equal the file name.
   Front matter fields:
   - `title`, `slug`, `thema` (reuse existing topics, e.g. "Arbeit & Geld");
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
5. Run the build, check the result at phone width, commit, push.

## Hosting and CI/CD

Target: the owner's Raspberry Pi, which already hosts java.ruslanlomaka.org (repo RuslanLomaka/OnlineJavaSandbox)
behind a Cloudflare Tunnel. This site will be **edv.ruslanlomaka.org**.

- `.github/workflows/deploy.yml`:
  - **build** runs on every push and pull request: pandoc + PyYAML → `site/build.py` → release tarball.
  - **deploy** runs on pushes to `main` and manual runs only. It connects over Tailscale (tag `tag:ci`) + SSH,
    checks that port 8081 is free or already used by our container, uploads to `~/projects/kursmaterial` on the
    Pi, runs `docker compose up -d --force-recreate`, and checks that 127.0.0.1:8081 answers.
  - Without all five secrets (`TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `PI_HOST`, `PI_USER`, `PI_SSH_PRIVATE_KEY`)
    the deploy is skipped with a warning instead of failing.
- `deploy/compose.yaml` (compose project `kursmaterial`, container `kursmaterial-web`, nginx on `127.0.0.1:8081`,
  64 MB limit) and `deploy/nginx.conf`. Never touch the OnlineJavaSandbox stack on the Pi.
- The previous version stays in `~/projects/kursmaterial/html.previous` on the Pi.
- Cloudflare: a public hostname (published application route) on the existing tunnel, `edv.ruslanlomaka.org` →
  `http://localhost:8081`. The owner adds it only after the first successful deploy.
- The repo is public, so Actions logs are public. Never print secrets or host details in the logs.

## Open points

- The "Bewerbung auf Knopfdruck" page is still a placeholder. It should explain the lesson and offer the kit files
  for download.
- Ask the course teacher / supervisor before publishing materials made for the course; the kit's day plan names
  "Job plus".
- Class date of the article "Brutto und Netto" is unknown.
