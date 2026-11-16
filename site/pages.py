#!/usr/bin/env python3
"""Build the copy of the site that GitHub Pages serves from docs/ (main branch, /docs folder).

GitHub Pages serves this repository under /EDF_AGP_KURS/, so every site address that starts with "/" gets that
prefix. The privacy texts describe GitHub Pages instead of the Pi (KURS_HOSTING=github-pages in build.py).

    python3 site/pages.py        # then commit docs/ and push

Run it again after every content change; the Pi build (site/build.py, CI) is not affected.
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent
DIST = SITE / "dist"
DOCS = SITE.parent / "docs"
BASIS = os.environ.get("PAGES_BASIS", "/EDF_AGP_KURS")


def main():
    env = dict(os.environ, KURS_HOSTING="github-pages", KURS_ADRESSE="ruslanlomaka.github.io" + BASIS)
    subprocess.run([sys.executable, str(SITE / "build.py")], check=True, env=env)

    # A "/" starts a site address when it follows a quote, "(", "=" or a space and is followed by a top-level
    # name of the site (artikel, assets, …) or directly ends the address ("/", "/#…", "/?…").
    namen = "|".join(re.escape(p.name) for p in DIST.iterdir())
    adresse = re.compile(r'(?<=["\'(=\s])/(?=(?:' + namen + r')(?=[/"\'#?)\s]|$)|["\'#?])')

    if DOCS.exists():
        shutil.rmtree(DOCS)
    shutil.copytree(DIST, DOCS)
    geaendert = 0
    for datei in DOCS.rglob("*"):
        if datei.suffix not in (".html", ".json") or not datei.is_file():
            continue
        alt = datei.read_text(encoding="utf-8")
        neu = adresse.sub(BASIS + "/", alt)
        if datei.suffix == ".html":
            neu = neu.replace("<html ", f'<html data-basis="{BASIS}" ', 1)
        if neu != alt:
            datei.write_text(neu, encoding="utf-8")
            geaendert += 1
    (DOCS / ".nojekyll").write_text("")  # serve files as they are, no Jekyll
    print(f"docs/ ready for GitHub Pages under {BASIS}/ ({geaendert} files with prefixed addresses)")


if __name__ == "__main__":
    main()
