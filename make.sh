#!/usr/bin/env bash
# Usage: ./make.sh q02 q03 ...   (voice -> build -> check -> render each)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
for q in "$@"; do
  "${PY:-.venv/bin/python}" tts.py "scripts/$q.json" 2>&1 | grep -vi warn || true
  mkdir -p "$q"; cp -n hf/hyperframes.json hf/package.json "$q/"
  node build.mjs "scripts/$q.json"
  slug=$(node -e "const s=require('./scripts/$q.json');console.log(s.short.toLowerCase().replace(/[^a-z0-9+]+/g,'-').replace(/\+/g,'p').replace(/^-|-$/g,''))")
  (cd "$q" && npx hyperframes render -o "../out/$q-$slug.mp4" --workers "${WORKERS:-3}" --quiet > "../out/$q.log" 2>&1) && echo "rendered out/$q-$slug.mp4"
done
