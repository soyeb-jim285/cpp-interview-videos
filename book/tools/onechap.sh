#!/usr/bin/env bash
# Build one chapter alone: tools/onechap.sh ch05-foo.md  -> /tmp/ch05.pdf + /tmp/ch05-N.png
cd "$(dirname "$0")/.."
n=$(basename "$1" | cut -c1-4)
TEXINPUTS=tools//: pandoc tools/meta.yaml "$1" --pdf-engine=xelatex --lua-filter tools/boxes.lua -H tools/header.tex \
  -V toc=false -o /tmp/$n.pdf && rm -f /tmp/$n-*.png && pdftoppm -r 60 -png /tmp/$n.pdf /tmp/$n && echo "ok /tmp/$n.pdf $(ls /tmp/$n-*.png | wc -l) pages"
