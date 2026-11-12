#!/usr/bin/env bash
# Builds book/cpp-from-zero.pdf from book/ch*.md
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/index.py > /tmp/cpp-book-index.md
TEXINPUTS=tools//: pandoc tools/meta.yaml tools/intro.md ch*.md /tmp/cpp-book-index.md \
  --pdf-engine=xelatex --lua-filter tools/boxes.lua -H tools/header.tex \
  --number-sections=false -o cpp-from-zero.pdf
echo "built $(pwd)/cpp-from-zero.pdf"
