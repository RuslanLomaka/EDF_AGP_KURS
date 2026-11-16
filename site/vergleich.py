#!/usr/bin/env python3
"""Build the working tree and a clean copy of main; list files that differ.

    python3 site/vergleich.py [git-ref]

Default ref is main. Exit 0 and print \"0 differ\" when both builds match byte-for-byte.
Each side uses its own site/build.py (so a pure content refactor can still match).
"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
# Only plain git refs (branch / tag / SHA); never pass free-form shell text to subprocess.
GIT_REF = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/\-]{0,200}$")


def run(cmd: list[str], *, text: bool = True, **kw):
    return subprocess.run(cmd, check=True, text=text, shell=False, **kw)


def build_repo(root: Path, out: Path) -> None:
    env = os.environ.copy()
    env.pop("PIPER_MODEL", None)
    env.pop("KURS_SITE", None)
    dist = root / "site" / "dist"
    if dist.exists():
        shutil.rmtree(dist)
    run([sys.executable, str(root / "site" / "build.py")], env=env, cwd=str(root))
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(dist, out)


def file_map(root: Path) -> dict[str, str]:
    return {
        f.relative_to(root).as_posix(): hashlib.sha256(f.read_bytes()).hexdigest()
        for f in sorted(root.rglob("*")) if f.is_file()
    }


def copy_exe(into_root: Path) -> None:
    exe = REPO / "materials" / "bewerbungshelfer" / "Bewerbungen_erstellen.exe"
    if not exe.is_file():
        return
    dest = into_root / "materials" / "bewerbungshelfer" / "Bewerbungen_erstellen.exe"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(exe, dest)


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "main"
    if not GIT_REF.fullmatch(base):
        print(f"invalid git ref: {base!r} (use a branch, tag or SHA)", file=sys.stderr)
        return 2
    with tempfile.TemporaryDirectory(prefix="kurs-vergleich-") as tmp:
        tmp = Path(tmp)
        work = tmp / "work"
        other = tmp / "other"
        work.mkdir()
        other.mkdir()

        for name in ("site", "materials", "deploy"):
            src = REPO / name
            if src.is_dir():
                shutil.copytree(
                    src, work / name,
                    ignore=shutil.ignore_patterns(
                        "dist", ".audio-cache", "__pycache__", "node_modules", "*.exe"),
                )
        copy_exe(work)

        with open(tmp / "base.tar", "wb") as tar_out:
            run(["git", "archive", base, "--format=tar"], cwd=str(REPO),
                stdout=tar_out, text=False)
        run(["tar", "-xf", str(tmp / "base.tar"), "-C", str(other)])
        copy_exe(other)

        print("building working tree …", flush=True)
        build_repo(work, tmp / "work-dist")
        print(f"building {base} …", flush=True)
        build_repo(other, tmp / "other-dist")

        a, b = file_map(tmp / "work-dist"), file_map(tmp / "other-dist")
        only_a = sorted(set(a) - set(b))
        only_b = sorted(set(b) - set(a))
        changed = sorted(p for p in set(a) & set(b) if a[p] != b[p])
        n = len(only_a) + len(only_b) + len(changed)
        if n == 0:
            print("0 differ")
            return 0
        print(f"{n} differ")
        for p in only_a:
            print(f"  only in working tree: {p}")
        for p in only_b:
            print(f"  only in {base}: {p}")
        for p in changed:
            print(f"  changed: {p}")
        return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as e:
        print(f"ERROR: command failed: {e}", file=sys.stderr)
        raise SystemExit(2)
