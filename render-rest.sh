#!/usr/bin/env bash
# waits for the Q1-15 run, then renders Q16-100 and re-renders Q1 (highlight fix)
cd "$(dirname "$0")"
while pgrep -f "make.sh q01" >/dev/null; do sleep 20; done
./make.sh $(seq -f "q%g" 16 100) q01
