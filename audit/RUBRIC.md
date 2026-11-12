# Lesson audit rubric

Score each criterion 1-5 (integers). **Green = every score >= 4** (plus lint and coverage already passing, which audit.sh enforces before you see anything).
Inputs: `lesson.json`, `timeline.md` (scene, type, start, dur, say, reveal times), `sheet-*.png` (tiles labelled `S<scene> <type> @<time>s: <what revealed>`). Be strict: a 3 means "a viewer would notice". Cite evidence (scene numbers, times) for every score under 5.

| # | Criterion | 1 | 3 | 5 |
|---|---|---|---|---|
| 1 | Hook strength | No hook; starts with "In this video"/definition, or hook runs >25 s | Names the topic and a vague benefit; or curiosity without a stated outcome; 15-25 s | Within 15 s: states the outcome the viewer will have ("you will be able to...") AND opens a curiosity gap (puzzle, surprising number, failure) that the lesson pays off |
| 2 | Clarity and build-up | Terms used before defined; jumps to code; analogy missing or wrong | Most terms defined before use; one unexplained jump or analogy never tied back to the real thing | Every term defined before first use; analogy first, then the real structure, explicit mapping between them; each scene needs only what earlier scenes gave |
| 3 | Something moves at least every 6 s | Any scene static >12 s, or a scene shows its whole content at once (front-loaded) and then idles | Gaps of 6-9 s in places, or reveals that are decorative (nothing new to learn) | No gap >6 s in `timeline.md`; every reveal matches the narration beat (what is said is what appears) |
| 4 | Phone readability | Text under ~32 px at 1080p, low contrast, clipped/overflowing/off-frame elements, overlapping labels | Small but legible code/labels; crowded scene; caption overlapping content in 1-2 tiles | All text comfortably readable at 640x360 tile size; strong contrast; nothing clipped, overlapping, or touching edges; max ~6 items per scene |
| 5 | Correctness | A wrong fact, wrong output, code that would not compile, wrong complexity | Minor imprecision (loose wording, omitted edge case) with no wrong claim | All facts, code, printed outputs, and complexities verified by you (trace the code; recompute outputs) |
| 6 | Drill answers each covered id | A covered id is not answered, or the Drill is generic | Each id touched but an answer is >25 s, hedged, or misses the key point | List every covered id (`covers` in lesson.json); for each, the Drill gives a direct, complete, interview-grade answer in <= 25 s of speech (check `timeline.md` dur / word count). Write the per-id list in your findings |
| 7 | Quiz quality | No quiz, or recall trivia | Prediction question but answer not explained, or distractors arbitrary | Real prediction (viewer must reason/trace), distractors are plausible mistakes, pause before the answer, and the answer is explained after reveal (why, not just which) |
| 8 | Practice card (DSA/C++ tracks; "n/a" scores 5 for others) | Missing, or problems vague/misnamed | Present but fewer than 3, or one is not a real/correctly named problem | 3 real problems, correctly named (e.g. LeetCode title/number), on topic, increasing difficulty or distinct patterns. Verify names against your own knowledge |
| 9 | Teacher voice and entertainment | Reads like docs; filler, hype ("amazing", "super powerful"), repeated intros | Clear but flat; some filler; no story or why-it-exists | Sounds like a teacher: a story or stakes, why this exists/what problem it solved, concrete numbers, varied rhythm; zero filler or hype; each sentence earns its place |

## Reviewer output (exactly this format)

```
| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Hook strength | 4 | ... |
... (all 9 rows)

Verdict: GREEN | NOT GREEN (lowest: #N)

Findings (only for scores < 5; one line each, most severe first):
- [scene N] problem -> concrete fix (JSON-level, e.g. "scenes[3].size 30 -> 44", "split scene into two, move cue 'lo jumps' to 0.5")
```

Notes for the reviewer:
- Findings must name a scene index as in `timeline.md` (chapter cards count as scenes) and a fix a writer can apply by editing lesson JSON; "improve clarity" is not a fix.
- Use the contact sheets for visuals only; use `lesson.json` for facts and code.
- A tile labelled `mid (gap Ns)` means nothing new appeared for N s; if it looks identical to the previous tile, that is a criterion 3 failure.
- Do not suggest changes to the pipeline or the rubric.
