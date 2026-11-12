#!/usr/bin/env bash
# Usage: ./make.sh q02 cp04 dsa-03 ...   (voice -> build -> render each)
# Legacy id (scripts/<id>.json) -> out/<id>-<slug>.mp4 ; lesson id (lessons/<id>.json) -> out/course/<track>/<id>-<slug>.mp4
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
for q in "$@"; do
  if [ -f "lessons/$q.json" ]; then
    node flatten.mjs "lessons/$q.json"
    node validate.mjs "build/$q.json"   # set -e stops here on failure, before TTS
    node coverage.mjs --lesson "lessons/$q.json"   # covers exist and are not claimed elsewhere
    spec="build/$q.json"
    dest="out/course/$(node -p "require('./$spec').series.toLowerCase()")"
  else
    spec="scripts/$q.json"; dest=out
  fi
  mkdir -p "$dest"
  "${PY:-.venv/bin/python}" tts.py "$spec" > "out/$q.tts.log" 2>&1 || { grep -vi warn "out/$q.tts.log" | tail -20; echo "TTS failed for $q" >&2; exit 1; }
  mkdir -p "$q"; cp -n hf/hyperframes.json hf/package.json "$q/"
  node build.mjs "$spec"
  slug=$(node -e "const s=require('./$spec');console.log(s.short.toLowerCase().replace(/[^a-z0-9+]+/g,'-').replace(/\+/g,'p').replace(/^-|-$/g,''))")
  (cd "$q" && npx hyperframes render -o "../$dest/$q-$slug.mp4" --workers "${WORKERS:-3}" --quiet > "../out/$q.log" 2>&1) && echo "rendered $dest/$q-$slug.mp4"
  if [ -f "$q/chapters.txt" ]; then cp "$q/chapters.txt" "$dest/$q-$slug-chapters.txt"; fi
done
