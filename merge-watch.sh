#!/usr/bin/env bash
cd "$(dirname "$0")"
while [ "$(ls out/merged/*.mp4 2>/dev/null | wc -l)" -lt 12 ]; do ./merge-all.sh; sleep 300; done
echo "all merged"
