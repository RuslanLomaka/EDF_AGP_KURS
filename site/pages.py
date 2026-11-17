#!/usr/bin/env python3
"""Build a copy of the site for GitHub Pages.

    python3 site/pages.py                       # docs/ of this repository: served under /EDF_AGP_KURS/
    python3 site/pages.py --ziel ../RuslanLomaka.github.io --basis "" --adresse edv.ruslanlomaka.org
                                                # the user site repository, which serves edv.ruslanlomaka.org at /

With a --basis, every site address that starts with "/" gets that prefix. The privacy texts describe GitHub Pages
instead of the Pi (KURS_HOSTING=github-pages in build.py). In the target, .git and CNAME are kept; everything
else is replaced. Set PIPER_MODEL to include the recorded glossary words (as CI does). Run it again after every
content change, then commit and push the target.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent
DIST = SITE / "dist"
BEHALTEN = {".git", "CNAME"}


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--ziel", default=str(SITE.parent / "docs"), help="target folder (default: docs/)")
    a.add_argument("--basis", default="/EDF_AGP_KURS", help='address prefix, "" for a site served at /')
    a.add_argument("--adresse", default=None, help="web address named in the Datenschutzerklärung")
    args = a.parse_args()
    basis, ziel = args.basis.rstrip("/"), Path(args.ziel).resolve()
    adresse = args.adresse or "ruslanlomaka.github.io" + basis

    env = dict(os.environ, KURS_HOSTING="github-pages", KURS_ADRESSE=adresse)
    subprocess.run([sys.executable, str(SITE / "build.py")], check=True, env=env)

    ziel.mkdir(parents=True, exist_ok=True)
    for alt in ziel.iterdir():
        if alt.name not in BEHALTEN:
            shutil.rmtree(alt) if alt.is_dir() and not alt.is_symlink() else alt.unlink()
    shutil.copytree(DIST, ziel, dirs_exist_ok=True)

    geaendert = 0
    if basis:
        # A "/" starts a site address when it follows a quote, "(", "=" or a space and is followed by a top-level
        # name of the site (artikel, assets, …) or directly ends the address ("/", "/#…", "/?…").
        namen = "|".join(re.escape(p.name) for p in DIST.iterdir())
        adressen = re.compile(r'(?<=["\'(=\s])/(?=(?:' + namen + r')(?=[/"\'#?)\s]|$)|["\'#?])')
        for datei in ziel.rglob("*"):
            if datei.suffix not in (".html", ".json") or not datei.is_file():
                continue
            alt = datei.read_text(encoding="utf-8")
            neu = adressen.sub(basis + "/", alt)
            if datei.suffix == ".html":
                neu = neu.replace("<html ", f'<html data-basis="{basis}" ', 1)
            if neu != alt:
                datei.write_text(neu, encoding="utf-8")
                geaendert += 1
    (ziel / ".nojekyll").write_text("")  # serve files as they are, no Jekyll
    print(f"{ziel} ready for GitHub Pages at {adresse}/ ({geaendert} files with prefixed addresses)")


if __name__ == "__main__":
    main()
