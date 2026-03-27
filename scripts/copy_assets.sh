#!/usr/bin/env bash
set -euo pipefail

SRC="/Users/rifined/Documents/rifined/Design/Apps/MACArcadeDrive/MACArcadeDrive/Assets.xcassets"
DST="/Users/rifined/Games/MacWebDriver/macarcadedrive-web/public/assets"

mkdir -p "$DST"
find "$DST" -type f -delete

while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  lower="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
  safe="$(printf '%s' "$lower" | sed -E 's/[^a-z0-9._-]+/_/g; s/_+/_/g; s/^_+//; s/_+$//')"
  cp "$file" "$DST/$safe"
done < <(find "$SRC" -type f \( -name '*.png' -o -name '*.svg' -o -name '*.ttf' -o -name '*.ttc' \) -print0)

echo "Copied assets into $DST"
