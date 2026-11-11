# Writing a C++ interview video script

Each question becomes one narrated, animated explainer video (~1.5–2.5 min). You write ONLY the script JSON
`scripts/qNN.json`. A generator (`build.mjs`) turns it into animation; Kokoro TTS reads the `say` text aloud;
captions are derived from `say`. The viewer is a student preparing for C++ interviews who wants to truly
understand, not memorize.

## Read first
- `build.mjs` — exactly which fields each scene type supports (sceneCode, sceneCompare, sceneDiagram, sceneFlow, sceneTitle, sceneTake).
- Good examples: `scripts/q04.json` (code + memory diagram), `scripts/q06.json`, `scripts/q07.json` (diagram changes, arrows), `scripts/q14.json` (code + output + flow-ish diagram), `scripts/q05.json` (code scenes with notes + compare).
- `validate.mjs` — run `node validate.mjs scripts/qNN.json` on every file you write until it prints `ok`.

## Content rules (most important)
1. **Technically correct.** Every claim, every code line, every output must be true for standard C++ (C++17/20) on GCC/Clang. If unsure, say less. Code must compile except lines you mark as errors. Outputs shown must be what the code really prints. Don't invent compiler error text — use well-known real messages or a short paraphrase in a note.
2. **Show, don't list.** Spine = one concrete worked example that the viewer watches happen (memory boxes changing, arrows drawn, lines highlighted as the voice names them). Use `diagram` with `panels` (code left, memory right) for anything about memory, pointers, objects, lifetimes, containers.
3. Structure: `title` → 3–5 teaching scenes → `take` (≤3 lines, the interview answer). Use a `compare` table only when the question literally asks "difference between", and at most once.
4. Narration (`say`): plain, friendly, spoken English, short sentences, ~2.5 words/sec. ≤ ~100 words per scene. End with what to say in an interview where natural. Mention the classic trap/follow-up question interviewers ask.

## Spoken-text conventions (TTS reads `say` literally)
- Write `C plus plus`, never `C++`. `C plus plus eleven / seventeen` for versions.
- `s t d colon colon vector` (captions auto-fix to `std::vector`); `s t d` alone for std.
- `null p t r` for nullptr. Spell acronyms with spaces: `R A I I`, `S T L`, `U B`, `O of n`, `O of log n`.
- `plus plus i` / `i plus plus`, `star p` for *p, `ampersand`, `arrow` for ->, `double colon`.
- No symbols in `say`: no `::`, `->`, `{}`, `<>`, `;`, backticks. Numbers as words when short ("forty two").
- Anything else that captions should show differently: add to `"caps": [["spoken regex", "written"]]`.

## Layout rules (validator enforces most)
- Canvas 1920×1080. Diagram items: x 100–1820, y 190–920. With a code panel on the left (default width 840), items must start at x > 990 (or set `"area": {"w": 760}` and keep x > 910).
- Code panels: ≤ 16 lines; line width ≤ 78 chars (single panel), ≤ 44 (two panels), ≤ 52 (code beside a diagram). Keep comments short.
- Box sizes: values `size` 32–48; small boxes ~260×110–130. Leave ≥ 60px vertical gap between boxes that have a `label` (label sits 44px above the box).
- Item ids must not look like `a0`, `a1` (reserved for arrows). Arrow changes target `a0`, `a1`… by index.
- Notes: ≤ 32 chars. `"line": N, "inside": true` pins a note to the right end of code line N.
- Cues are substrings of that scene's `say` (case-insensitive); the reveal happens when the voice reaches them. Order cues in speaking order.

## Don't
- Don't run TTS, build, or render. Don't edit any file except your own `scripts/qNN.json`.
- Don't pad. Don't repeat the on-screen text word-for-word in narration.
