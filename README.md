# C++ interview questions — animated explainer videos

One narrated, animated video per question (100 questions, beginner → advanced).

- `scripts/qNN.json` — the script for each video (scenes, code, diagrams, narration)
- `build.mjs` + `template.html` — turn a script into a HyperFrames composition
- `tts.py` — free local narration with Kokoro-82M
- `make.sh qNN …` — voice → build → render to `out/`
- `.github/workflows/render.yml` — render many videos in parallel on GitHub Actions (Actions → render → Run workflow)

Sound effects in `sfx/` are from Pixabay (see `sfx/CREDITS.md`).
