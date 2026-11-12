#!/usr/bin/env bash
# Builds each merged video once all its parts are rendered (skips ones already merged). Safe to run any time.
cd "$(dirname "$0")"
s() { for i in $(seq "$2" "$3"); do printf "%s%02d " "$1" "$i"; done; }
q() { for i in $(seq "$1" "$2"); do printf "q%02d " "$i"; done | sed 's/q100/q100/'; }
plan=(
  "01-SWE-fundamentals|$(s sw 1 12)"
  "02-Backend|$(s be 1 15)"
  "03-DSA-part1-core-patterns|$(s cp 1 10)"
  "04-DSA-part2-advanced|$(s cp 11 20)"
  "04b-DSA-part3-sorting-and-linked-lists|$(s cp 21 24)"
  "05-Frontend|$(s fe 1 12)"
  "06-AI-evaluation|$(s ai 1 6)"
  "07-Cpp-part1-basics-and-language|$(q 1 15)"
  "08-Cpp-part2-memory|$(q 16 35)"
  "09-Cpp-part3-pointers-and-OOP|$(q 36 60)"
  "10-Cpp-part4-lifetime-move-STL|$(q 61 85)"
  "11-Cpp-part5-modern-concurrency-bugs|$(q 86 100)"
)
for p in "${plan[@]}"; do
  name=${p%%|*}; ids=${p#*|}
  [ -f "out/merged/$name.mp4" ] && continue
  ./merge.sh "$name" $ids 2>/dev/null | grep merged || true
done
