#!/bin/bash
# Builds dist/spotify-to-apple-music-<version>.zip for the Chrome Web Store:
# only the files the extension runs on, none of the repo's docs or store assets.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
out="dist/spotify-to-apple-music-$version.zip"
mkdir -p dist
rm -f "$out"
zip -qr "$out" manifest.json background.js lib redirect.html redirect.css redirect.js \
  popup.html popup.css popup.js icons -x '*.DS_Store'
echo "$out"
unzip -l "$out" | tail -n +4 | awk 'NF==4 {print "  " $4}'
