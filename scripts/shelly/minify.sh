#!/usr/bin/env bash
# Minify a Shelly script for pasting. mJS keeps the whole source resident in ~8 KB of heap, so comments
# and long identifiers cost real memory on-device. Keep the readable source in git, paste dist/<name>.js.
#
# Usage: ./minify.sh [schedule.shelly.js ...]
set -euo pipefail
cd "$(dirname "$0")"

ROLLDOWN=../../frontend/node_modules/.bin/rolldown
[ -x "$ROLLDOWN" ] || { echo "rolldown not found — run npm install in frontend/"; exit 1; }

SOURCES=("$@")
[ ${#SOURCES[@]} -gt 0 ] || SOURCES=(schedule.shelly.js priceColor.shelly.js)

mkdir -p dist
for src in "${SOURCES[@]}"; do
  name=$(basename "$src" .shelly.js)
  out="dist/$name.js"

  # es2016 keeps `let` (which mJS has) but downlevels optional catch binding (`catch {`, which it lacks).
  "$ROLLDOWN" "$src" --minify --format iife --transform.target es2016 -o "$out.tmp" >/dev/null

  # mJS has no template literals, but the minifier rewrites every string as one. Convert back —
  # safe only while nothing interpolates, which the check enforces.
  if grep -q '\${' "$out.tmp"; then echo "$src: template interpolation in output"; exit 1; fi
  tr '`' '"' < "$out.tmp" > "$out"
  rm "$out.tmp"

  # Everything else mJS rejects. Fail loudly rather than shipping a script that dies at runtime.
  if grep -qE '=>|\bconst\b|catch\s*\{' "$out"; then echo "$src: output uses syntax mJS rejects"; exit 1; fi

  printf '%-22s %6s B -> %6s B\n' "$name" "$(wc -c < "$src")" "$(wc -c < "$out")"
done
