#!/bin/sh
# Contact sheets of every app icon, rendered the way a host draws them.
#
# The legibility auditor (icon-legibility.ts) answers "can this mark be SEEN on
# the tile". It cannot answer "is this the right mark" — that needs eyes, and
# eyes need pixels. This renders every icon onto the real tile colour and
# montages them into labeled sheets so the whole pack can be reviewed at once.
# It is how the wrong Typeform, Pipedrive, Stripe and Datadog marks were found.
#
# Needs librsvg + imagemagick, which the studio container has (or can apt-get):
#   docker compose -f .devcontainer/docker-compose.yml exec studio \
#     sh -c "apt-get update && apt-get install -y librsvg2-bin fonts-dejavu-core"
#   docker compose -f .devcontainer/docker-compose.yml exec studio \
#     sh /app/packages/apps/_tools/icon-sheets.sh light /tmp/sheets
#
# Renders with rsvg-convert, NOT ImageMagick's own SVG parser: the internal one
# silently mangles gradients, <style> rules and <use>, which would make correct
# icons look broken and hide the ones that are.
#
#   $1 = theme (light|dark), $2 = output dir
set -e
THEME="${1:-light}"
OUT="${2:-/tmp/sheets}"
APPS=/app/packages/apps/apps
WORK="$OUT/$THEME"
rm -rf "$WORK" && mkdir -p "$WORK" "$OUT/sheets"

if [ "$THEME" = "dark" ]; then TILE="#1f232c"; FG="#9aa4b2"; else TILE="#f0f2f6"; FG="#3a4250"; fi

for dir in "$APPS"/*/; do
  app=$(basename "$dir")
  # The icon the host would actually show in this theme.
  if [ "$THEME" = "dark" ] && [ -f "$dir/assets/icon.dark.svg" ]; then
    icon="$dir/assets/icon.dark.svg"
  elif [ -f "$dir/assets/icon.svg" ]; then
    icon="$dir/assets/icon.svg"
  else
    icon=$(ls "$dir"/assets/* 2>/dev/null | head -1)
  fi
  [ -n "$icon" ] || continue

  case "$icon" in
    *.svg)
      # rsvg-convert is a real renderer (librsvg) — ImageMagick's internal MSVG
      # parser silently mangles gradients, <style> rules and <use>.
      rsvg-convert -w 84 -h 84 -a -b none "$icon" -o "$WORK/.raw.png" 2>/dev/null ||
        { echo "RENDER-FAIL $app" >&2; continue; }
      ;;
    *) cp "$icon" "$WORK/.raw.png" ;;
  esac

  # Mirror AppIcon: contain-fit with padding on a flat tile.
  convert "$WORK/.raw.png" -resize 84x84 -background "$TILE" \
          -gravity center -extent 108x108 -alpha remove -alpha off \
          "$WORK/$app.png" 2>/dev/null || echo "COMPOSE-FAIL $app" >&2
done
rm -f "$WORK/.raw.png"

ls "$WORK"/*.png | sort | split -l 24 - "$WORK/batch."
for b in "$WORK"/batch.*; do
  montage -label '%t' @"$b" -tile 6x -geometry 108x108+7+7 \
          -background "$TILE" -fill "$FG" -font DejaVu-Sans -pointsize 13 \
          "$OUT/sheets/$THEME-$(basename "$b" | sed 's/batch\.//').png"
done
ls "$OUT/sheets"
