#!/usr/bin/env bash
# Renders ids from queue.txt in order, skipping ones already in out/. Edit queue.txt any time.
cd "$(dirname "$0")"
while :; do
  next=""
  while read -r id; do
    [ -z "$id" ] && continue
    [ -f "scripts/$id.json" ] || continue
    compgen -G "out/$id-*.mp4" >/dev/null || { next=$id; break; }
  done < queue.txt
  [ -z "$next" ] && { echo "queue empty"; break; }
  ./make.sh "$next" || echo "FAILED $next"
done
