#!/bin/bash
# Renders the Web Store images from store/src/*.html with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")"
python3 src/build.py
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() {  # name width height — fresh profile per shot, killed if it hangs
  local tmp; tmp=$(mktemp -d)
  rm -f "$PWD/$1.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --no-first-run --no-default-browser-check --user-data-dir="$tmp" --allow-file-access-from-files \
    --window-size="$2,$3" --screenshot="$PWD/$1.png" "file://$PWD/src/$1.html" >/dev/null 2>&1 &
  local pid=$!
  for _ in $(seq 1 60); do kill -0 $pid 2>/dev/null || break; sleep 0.5; done
  kill $pid 2>/dev/null || true; wait $pid 2>/dev/null || true
  rm -rf "$tmp"
  echo "$1.png $(sips -g pixelWidth -g pixelHeight "$1.png" 2>/dev/null | awk '/pixel/{printf "%s ", $2}')"
}
shot screenshot-1 1280 800
shot screenshot-2 1280 800
shot screenshot-3 1280 800
shot screenshot-4 1280 800
shot promo-small 440 280
shot promo-marquee 1400 560
