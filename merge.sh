#!/usr/bin/env bash
# Usage: ./merge.sh <name> <id>...   -> out/merged/<name>.mp4 + <name>-chapters.txt (YouTube chapter list)
# Only merges if every id has a rendered mp4. Lossless concat (same codec everywhere).
set -euo pipefail
cd "$(dirname "$0")"
name=$1; shift
mkdir -p out/merged
list=out/merged/$name.list; : > "$list"; chap=out/merged/$name-chapters.txt; : > "$chap"
t=0
for id in "$@"; do
  f=$(compgen -G "out/$id-*.mp4" | head -1) || { echo "missing $id, not merging $name"; rm -f "$list" "$chap"; exit 1; }
  echo "file '$PWD/$f'" >> "$list"
  title=$(node -e "const s=require('./scripts/$id.json');console.log((s.series?s.series+' '+s.num:'Q'+s.num)+' - '+s.question.replace(/\`/g,''))")
  printf '%d:%02d:%02d %s\n' $((t/3600)) $((t%3600/60)) $((t%60)) "$title" >> "$chap"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  t=$(python3 -c "print(round($t+$d))")
done
ffmpeg -y -v error -f concat -safe 0 -i "$list" -c copy -movflags +faststart "out/merged/$name.mp4"
rm -f "$list"
echo "merged out/merged/$name.mp4 ($((t/60)) min)"
