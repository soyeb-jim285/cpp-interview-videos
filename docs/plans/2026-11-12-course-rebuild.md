# Interview Prep Course Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Replace the 169 one-question clips with a teacher-led video course (≈48 lessons, 6–10 min each) that is engaging, easy to follow, and — verified by a coverage check — teaches every interview question the viewer listed, so that after watching he can answer them all and do well in micro1 interviews.

**Architecture:** Keep the proven pipeline (JSON script → `build.mjs` → HyperFrames HTML → Kokoro TTS → render) but (1) upgrade the engine with the faceless-explainer motion doctrine (camera, real movement, data flowing, kinetic type, quizzes), (2) change the unit from "question" to "lesson" (chapters + interview drill + `covers` list), and (3) add automated gates — engagement lint, coverage check, visual audit — that every lesson must pass ("green") before it renders.

**Tech Stack:** Node 22 (build/validate), GSAP 3.15 in HyperFrames 0.9.x, Kokoro-82M (`kokoro_onnx`), ffmpeg, g++ for code checks, Sonnet sub-agents for lesson writing and auditing.

**Spec:** the user's requests in this session, verbatim intent:
- "make videos that are like tutorial or like you are a teacher and telling interesting stuff"
- "after watching these I will be able to answer all the questions and do well in the interviews fully"
- "engaging and interesting and easy to follow … really helpful and entertaining. use your skills"
- "start building videos from the ground up … plan it first … audit it then green it"
- Skill doctrine: `faceless-explainer/references/{story-design,visual-design,motion-language}.md`, `hyperframes-creative/references/story-spine.md`.

## Global Constraints
- Canvas 1920×1080, 30 fps; must stay readable on a phone: rendered body text ≥ 32 px, code ≥ 30 px, hero visual fills 40–60 % of frame.
- Nothing appears before the voice names it; no static stretch longer than 6 s while narration runs.
- Every lesson: hook in the first 15 s that states the payoff in outcome language; thesis by beat 2; ≥ 1 worked example where the mechanism visibly runs; ≥ 1 "pause and predict" quiz per chapter; an Interview Drill chapter; a 3-line recap.
- Teacher voice: second person, curious, concrete numbers, a story or "why this exists" moment per chapter; no filler, no hype words.
- All code compiles/runs (g++ -std=c++17, node, python3) and every shown output is real.
- Coverage: each of the 100 C++ questions and each of the 69 role topics appears in exactly one lesson's `covers` and is answered in its Interview Drill.
- Render order follows interview urgency: SWE → Backend → DSA → Frontend → AI Eval → C++.

## Review Focus
1. Viewer watches on a phone → small text unreadable. Test: lint fails any rendered font < 32 px (box auto-fit can shrink text — clamp).
2. A cue phrase repeats earlier in the narration → reveal fires too early. Test: lint fails a cue whose first match precedes the previous cue of the same scene.
3. Long lesson = long TTS → one bad scene forces whole re-render. Test: per-scene TTS cache already keyed by hash; lint must pass before TTS.
4. Agents reuse the same layout every scene → slideshow feel. Test: lint requires ≥ 3 distinct scene types per chapter and no type 3× in a row.
5. A question in the user's list silently dropped in the merge into lessons. Test: `coverage.mjs` fails on any uncovered or double-covered id.

---

### Task 1: Engine v2 motion primitives (partly done in pilot)
**Files:** Modify `build.mjs`, `template.html`; Test `test/engine.test.mjs`
**Produces (scene JSON fields):**
- diagram change `{id, move:[x,y]}` (done), `{id, glow:true, tone}` (done), arrow pulse (done), auto-zoom stage + push-in (done)
- change `{id, count:[from,to]}` → number counts up in the box
- scene `hook`: `{type:"hook", lines:[{text, cue, accent?}], say}` → kinetic per-line slam, full-bleed type
- scene `quiz`: `{type:"quiz", q, options?:[..], answer, say, pause:3}` → question, 3-2-1 ring countdown (silent pause of `pause` s), answer reveal
- scene `chapter`: `{type:"chapter", n, title}` → chapter card (auto-inserted, 2.5 s, no narration)
- scene `chart`: `{type:"chart", bars:[{label,value,tone,cue}], unit}` → bars grow on cue with counting labels (Big-O growth, latency, etc.)
- code panel option `type:true` → lines type on with caret when revealed
- background depth layer (hairline grid + dual radial) on every scene
- auto-layout item macros (so writers never hand-place coordinates): `{array:{id,values,y}}` cells with index labels, `{list:{id,values,y}}` linked nodes + arrows, `{tree:{id,nodes:[[val,parent]]}}` tidy tree, `{stack:{id,values,x}}` vertical stack; each expands to normal items with ids `id0..idN`
- [ ] Step 1: `test/engine.test.mjs` builds `test/fixtures/all-primitives.json` and asserts the HTML contains `-stage`, `-q` pulse paths, a `.quiz` with countdown, a `.hook` with N lines, count tween `innerText`, and that every `tl.` time ≥ scene t0.
- [ ] Step 2: run `node --test test/` → FAIL.
- [ ] Step 3: implement the primitives in `build.mjs` (one renderer function per scene type, same `{html,tw}` contract as `sceneDiagram`).
- [ ] Step 4: `node --test test/` → PASS; `npx hyperframes snapshot` of the fixture shows each primitive.
- [ ] Step 5: commit `feat(engine): v2 motion primitives`.

### Task 2: Lesson format + chapters output
**Files:** Modify `build.mjs`, `tts.py`, `make.sh`; Create `lessons/` dir, `test/lesson.test.mjs`
**Produces:** lesson JSON `{id:"dsa-03", track, title, covers:[ids], chapters:[{title, scenes:[...]}]}`; build flattens chapters, auto-inserts `chapter` cards, writes `<id>-chapters.txt` (YouTube format) next to the mp4. Output path `out/course/<track>/<id>-<slug>.mp4`.
- [ ] Step 1: test asserts a 2-chapter fixture yields 2 chapter cards, chapters.txt with `0:00:00` first line and monotonically increasing times.
- [ ] Step 2–4: implement, run tests green.
- [ ] Step 4b: `make.sh` runs `validate.mjs` and `coverage.mjs` before TTS and stops on red (Review Focus 3).
- [ ] Step 5: commit.

### Task 3: Engagement lint (`validate.mjs` v2)
**Files:** Modify `validate.mjs`; Test `test/validate.test.mjs` with good/bad fixtures
**Rules (fail = red):** hook scene first, ≤ 40 words; every chapter has a quiz; Interview Drill chapter exists and lists every `covers` id; recap last; ≥ 3 distinct scene types per chapter, none 3× consecutively; estimated gap between consecutive reveals ≤ 6 s (words/2.5); cue order monotonic (Review Focus 2); font floor 32 px after auto-fit (Review Focus 1); scene `say` ≤ 90 words; all old rules (spoken-symbol bans, layout safe area).
- [ ] Steps 1–5: bad fixtures each fail with the named rule; good fixture passes; commit.

### Task 4: Syllabus + coverage check
**Files:** Create `SYLLABUS.md`, `coverage.mjs`; Test via `node coverage.mjs` exit code
**Produces:** ≈48 lessons — C++ 14 (follows `book/` chapters), DSA 14 (adds Trees/BST and Graph lessons), Backend 7, SWE 5, Frontend 5, AI Eval 3. Each row: id, title, covers, hook idea, central worked example.
- [ ] Step 1: write `coverage.mjs`: collects all ids (q01–q100 from `scripts/q*.json`, role topics from `ROLES_BRIEF.md`), all `covers` from `lessons/*.json` (or SYLLABUS table before lessons exist); exit 1 listing missing/duplicate ids.
- [ ] Step 2: run → FAIL (no syllabus). Step 3: write SYLLABUS.md. Step 4: run → PASS. Step 5: commit.

### Task 5: Teaching brief for lesson writers
**Files:** Create `TEACHING_BRIEF.md` (replaces BRIEF/ROLES_BRIEF for new work)
Content: teacher persona; lesson skeleton (hook → why it matters → build-up chapters, each = intuition/analogy → worked example running → code → pause-and-predict quiz → common trap) → Interview Drill (rapid Q→A for every `covers` id, ≤ 25 s each) → recap → Practice card (3 named LeetCode/Codeforces problems to solve next, for coding lessons); hook catalog and clarity techniques from `story-design.md`; one-motion-per-reveal rule from `visual-design.md`; full primitive reference with a JSON example per scene type; spoken conventions; code must compile (commands given); run `node validate.mjs` + `node coverage.mjs` until green.
- [ ] Step 1: write; Step 2: a fresh agent writes one chapter from it without questions (dry run) → passes lint; commit.

### Task 6: Pilot lesson + user gate
**Files:** `lessons/dsa-03-two-pointers-sliding-window.json`
- [ ] Step 1: write pilot (extends the cp04 v2 already rendered at `pilot/cp04-v2.mp4`).
- [ ] Step 2: lint + coverage green; render.
- [ ] Step 3: visual audit (Task 7) green.
- [ ] Step 3b: measure render speed at 1080p30 vs 1080p24 vs 720p30; pick the fastest that stays sharp on a phone (cuts the 12 h estimate).
- [ ] Step 4: **user watches pilot** — voice choice A/B (am_michael vs af_heart), pacing, density. Adjust brief/engine. No mass production before approval.

### Task 7: Audit loop ("audit it then green it")
**Files:** Create `audit/RUBRIC.md`, `audit.sh`
`audit.sh <id>` → builds, snapshots one frame per reveal into a contact sheet, and a fresh Sonnet reviewer scores against RUBRIC (hook strength, clarity, something-moves-every-6s, readability on phone, correctness, does Drill truly answer each covered question, entertainment). Any score < 4/5 → findings back to the writer agent → fix → re-audit. Green = lint pass + coverage pass + rubric all ≥ 4.
- [ ] Steps: write rubric; run on pilot; confirm it catches a seeded defect (shrink a font, front-load a scene); commit.

### Task 8: Production
- [ ] Spawn writer agents per track (≤ 8 in parallel, each ≤ 4 lessons), each must reach green (lint + coverage + audit) before handing back.
- [ ] Queue renders by urgency (SWE → Backend → DSA → FE → AI → C++) with `run-queue.sh`; old clips stay available until each track's lessons exist.
- [ ] Per-track playlist folder `out/course/<track>/` with chapters files; optional Drive/YouTube upload.

## Cost / time (measured: ≈1.8× realtime render on this laptop)
≈48 lessons × ~8 min ≈ 6.5 h of video → ≈ 12 h of rendering. SWE+Backend+DSA (≈26 lessons) ≈ 6.5 h. Writing + audit ≈ 2–3 h in parallel. Engine + brief + pilot ≈ 2 h.

## Audit log (self-review, 2026-11-12)
- Gap: videos alone can't make the coding test pass → added Practice card per coding lesson (Task 5) and the Drill answers each covered question explicitly.
- Gap: agents hand-placing coordinates caused cramped/odd diagrams → added auto-layout macros (Task 1).
- Gap: Review Focus 3 had no owner → `make.sh` gate (Task 2, Step 4b).
- Gap: 12 h render is the bottleneck → render-speed measurement in the pilot (Task 6, Step 3b); urgency order keeps the interviews' tracks first.
- Open decision for the user at the pilot: voice (am_michael vs af_heart) and whether to add a quiet music bed (needs a music source; none is bundled).
