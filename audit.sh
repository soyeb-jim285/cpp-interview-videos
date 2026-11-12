#!/usr/bin/env bash
# Usage: ./audit.sh dsa-03 | ./audit.sh path/to/lesson.json     (AUDIT_SKIP_COVERAGE=1 to skip the coverage check)
# flatten -> lint -> coverage -> tts -> build -> snapshot per reveal -> contact sheets -> audit/out/<id>/
# Then the controller dispatches a fresh reviewer with audit/out/<id>/PACKAGE.md. Stops at the first red step.
set -euo pipefail
cd "$(dirname "$0")"
arg=${1:?usage: audit.sh <id|lesson.json>}
if [ -f "$arg" ]; then f=$(realpath "$arg"); else f=$(realpath "lessons/$arg.json"); fi
id=$(basename "$f" .json)
node flatten.mjs "$f"
node validate.mjs "build/$id.json"
[ -n "${AUDIT_SKIP_COVERAGE:-}" ] || node coverage.mjs --lesson "$f"
"${PY:-.venv/bin/python}" tts.py "build/$id.json" 2>&1 | grep -vi warn || true
mkdir -p "$id"; cp -n hf/hyperframes.json hf/package.json "$id/"
node build.mjs "build/$id.json"
out=audit/out/$id; rm -rf "$out"
node audit/tool.mjs plan "$id" "$f" "$out"
npx hyperframes snapshot "$id" --at "$(cat "$out/times.txt")" --no-end --keep -o "$out/frames" >/dev/null 2>&1
node audit/tool.mjs sheets "$out"
cat > "$out/PACKAGE.md" <<EOP
# Audit package: $id
Score this lesson against \`audit/RUBRIC.md\` (repo root; follow its output format exactly).
Read, in order:
1. \`lesson.json\` - the source (scene text, code, quiz answers, covers).
2. \`timeline.md\` - per-scene type, start, duration, spoken text, reveal times (use for hook <=15 s, "something moves every 6 s", drill <=25 s).
3. \`sheet-*.png\` - contact sheets (3x4 tiles of 640x360, labelled scene/type/time/what). Judge phone readability, overflow, crowding, off-frame from these. Open every sheet.
Do not render video. Findings must be \`[scene N] problem -> concrete fix (JSON-level)\`.
EOP
echo "audit package: $out ($(ls "$out"/sheet-*.png | wc -l) sheets)"
