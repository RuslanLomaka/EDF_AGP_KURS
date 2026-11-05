#!/usr/bin/env bash
# Builds the Windows program Bewerbungen_erstellen.exe from the Go source in programm/.
# Needs Go (any version from 1.21 downloads the version go.mod asks for). CI runs this before the site build;
# run it once locally before `python3 site/build.py`, because the lesson offers the program for download.
set -euo pipefail
cd "$(dirname "$0")/programm"
go vet ./...
go test ./...
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o ../Bewerbungen_erstellen.exe .
echo "built materials/bewerbungshelfer/Bewerbungen_erstellen.exe"
