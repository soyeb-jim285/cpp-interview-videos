# Teaching Brief: writing one course lesson

You write ONE file: `lessons/<id>.json`. Nothing else. The engine turns it into a 6–12 minute narrated, animated
lesson: `flatten.mjs` → `validate.mjs` (lint) → Kokoro TTS reads every `say` aloud → `build.mjs` animates →
HyperFrames renders. Captions come from `say`. This file replaces `BRIEF.md` and `ROLES_BRIEF.md` for lessons.

**Who watches.** One student preparing for micro1 interviews: a ~30 min AI voice interview (concepts out loud,
getting harder fast), then a ~30 min timed LeetCode-style coding test. He knows C++ well. He called the old clips
"bland and not good for understanding at all". He wants a **teacher telling interesting stuff**: engaging, easy to
follow, really helpful, entertaining. After your lesson he must be able to answer every covered question out loud,
with an example, and (for coding topics) solve the problem type under time pressure.

## 1. Inputs and the one rule about facts

- Your syllabus row (in `SYLLABUS.md`): `id`, `title`, `covers`, hook idea, central worked example.
- `scripts/<cid>.json` for every id in `covers`: the **fact-checked source**. Read every one fully. Its `question` is
  what the interviewer asks; its scenes and `take` are what a good answer contains; its "In the interview" rows are
  the follow-ups. Every point in those files must be taught in your lesson and answered in your Drill.
- Use the syllabus worked example as your spine (its numbers are checked). You may add, never contradict.
- If you are not sure a claim is true, cut it. Say less, never say wrong.

## 2. The teacher

You are a senior engineer who has sat on both sides of the interview table, teaching one student at a desk.

- **Second person, present tense.** "You", "we" when doing it together. Contractions. Short sentences (≤ 14 words
  reads best: captions break at 14).
- **Curious, not hyped.** Wonder at the mechanism, never at yourself. Each chapter has one "why this exists" or
  story moment: the bug that cost someone a night, why the designers chose this, what breaks without it.
- **Concrete always.** Real numbers, real names: `users` table, 10 million rows, array 2, 7, 11, 15, target 9.
  Never "some value", "a large number", "foo".
- **One idea at a time.** Define each term the moment it appears, in plain words, before using it.
- **Talk to the screen.** Name what appears as it appears ("this box", "watch lo jump"). Don't read long on-screen
  text aloud word for word; the screen shows the compact form, the voice explains it.
- A light joke or aside is welcome once per chapter if it teaches something.
- **Banned:** "in this video", "welcome back", "let's dive in", "deep dive", "unlock", "powerful", "seamless",
  "game changer", "simply", "just" (as in "just do X"), "obviously", "as we all know", "it's important to note",
  any hype adjective. No "like and subscribe". No list-reading without something moving.

## 3. Lesson skeleton

```
chapter 1 (teach) : hook → agenda (take "Today") → problem → why it matters → [teach beats]
chapter 2..N (teach): problem → [teach beats]
chapter (drill)   : one rapid Q→A scene per covered question, each with "covers"
chapter (recap)   : Practice card → take (last scene of the lesson)
```

**Teach beats, in order, inside every teach chapter:**

1. **Intuition / analogy.** An everyday picture first (library index for a DB index, guessing game for binary
   search), then the real thing. A `flow` or `diagram`.
2. **Worked example, visibly running.** The mechanism happens on screen with real values: boxes change, pointers
   move, counts climb. A `diagram` with `changes` (one stage, several steps). This is the heart of the lesson.
3. **Code.** The same example as code, lines highlighted as the voice names them, real `output`.
4. **Pause and predict.** A `quiz` on a small variation ("same array, search for eight"). The answer and why is the
   first sentence of the next scene.
5. **Common trap.** The mistake candidates make, shown (red note on the bad line, a `compare` bug/fix table, an
   output that is wrong).

### Story, stakes, shown answers

- **Story & stakes.** Every teach chapter opens with a tiny story or stake: a real interview moment, a production
  outage, a puzzle, or "most candidates do X, and fail because...". One light touch of humor or surprise per chapter
  (a dry aside, an absurd example). Still no hype words.
- **Quiz answers are shown.** The scene after a quiz must visually demonstrate the answer (diagram change, chart,
  code output), not only say it.
- **No dead narration.** No scene may end with more than 4 s (about 11 words) of narration after its last reveal. Put
  the explanation where something moves.

Order may flex (a trap can come before the quiz), but every teach chapter has a quiz, ≥ 3 distinct scene types, and
no type three times in a row. Chapter 1 (a teach chapter) opens with the hook, then **why it matters**, both inside it: one scene stating, in outcome
language, what the viewer gains (the thesis lands by beat 2). Split the lesson into 3–5 teach chapters of 4–8 scenes;
dense lessons (8–10 covers) can use 5–6. Chapter titles ≤ 30 chars, specific ("Search the answer, not the array",
not "Part 2").

**Interview Drill** (`"kind": "drill"`). For each covered id, one scene ≤ 25 s (≤ 55 words) that asks the question
the way the interviewer would and answers it the way he should say it: the core answer, one concrete example or
number, the likely follow-up. Each drill scene carries `"covers": ["<cid>"]` (one scene may cover two closely
related ids). Default shape: `compare` with heads `["They ask", "You say"]`, one row per sub-question, a cue per row.
Use `code` when the answer is "what does this print".
**Teach everything you cover.** Every `covers` id is taught in a teach chapter (usually its own chapter) AND drilled.
The lint forces the drill to name every id, so a drill answer for something no chapter taught is a bug in your plan:
add the chapter, never a drill-only id.

**Recap** (`"kind": "recap"`). Last chapter. Scene 1 is the **Practice card**, last scene is a `take`.
- Practice card: `compare` with heads `["Solve next", "Why"]`, 3 rows, e.g. `LeetCode 35 · Search Insert Position`.
  **Required for every DSA and C++ lesson**; optional elsewhere (use a hands-on exercise instead). Use only problems you are
  certain exist with that exact number and official title (LeetCode "N · Title", Codeforces "1352C · K-th Not
  Divisible by n"). Order easy → harder. If unsure of a number, pick a more famous problem. Without problems, the card
  is 3 concrete hands-on exercises ("Add an index to `orders.user_id` and compare `EXPLAIN` before/after").
- `take`: 3 lines, the whole lesson as he would say it in the interview.

### Beginnings: say what we're solving

The viewer must know the problem in the first seconds. No lesson, and no chapter, just starts.

1. **Hook** names the problem in plain words (what we are stuck on, not a teaser).
2. **Agenda** right after the hook: a `take` with `"kicker": "Today"`, ≤ 3 lines, what we will do.
3. **Every teach chapter opens with a `problem` scene** (statement + example input → expected output) BEFORE any
   analogy or technique. In chapter 1 it comes right after the agenda.
4. Concept lessons (Backend, SWE, C++) frame the chapter's question as the problem: title "Why is this query slow?",
   statement, example input = the query and table size, example output = the goal "under 5 ms".

## 4. Hooks and clarity techniques

The hook is the first scene, ≤ 40 words, in **outcome language** (what he can do after), never a definition and never
subject jargon. Pick one strategy (the syllabus "hook idea" is a starting point, sharpen it):

| Strategy | Example |
|---|---|
| Rhetorical question | "Why does adding one index make a query a thousand times faster?" |
| Counterintuitive claim | "`std::move` doesn't move anything." |
| Shocking number | "Two threads, two hundred thousand additions, and the counter comes up short." |
| Stakes | "Get this one line wrong and your code passes every test, then crashes in production." |
| Imagine / scenario | "I'm thinking of a number from one to a million. You get twenty guesses." |
| Pain validation | "Everyone says 'use a hash map'. Nobody says why it's O of one, or when it isn't." |
| Direct challenge | "By the end, you'll predict the print order of any async snippet." |

Use these techniques by name while planning each scene (pick one per scene):
- **Make concrete:** analogy · worked example with real numbers · anchor on something familiar.
- **Reveal in order:** progressive disclosure (one layer per cue) · build-up (simple case → general) · signposting
  ("first… then… finally").
- **Contrast:** before/after · common belief vs reality · two options side by side · counterexample (here it breaks).
- **Structure:** rule of three · question → answer · frame then fill (show the empty shape, then fill it).
- **Evidence:** demonstration (the mechanism runs) · causal chain (A → B → C) · real output.
- **Landing:** callback to the hook · distill to one line · a coined phrase ("find the first yes").

Never paraphrase the source script in order. Reorder for understanding: problem → picture → mechanism → code → trap.

## 5. Pacing and motion (the anti-slideshow rules)

- **Nothing appears before the voice names it.** Every element gets a `cue`: a phrase from that scene's `say`. The
  reveal fires when the voice reaches the phrase. Elements without a cue appear when the voice starts; use that only
  for the stage carried over from the previous scene.
- **A reveal every ≤ 15 words** (≈ 6 s). Lint `[gap]` counts words from the start of `say` to the first cue, between
  consecutive cues, and from the last cue to the end. Quiz is exempt, and so are hook/take with no cue phrases;
  code, diagram, compare, flow and chart fail even with no cues at all. A missing cue is reported first.
- **Tables budget words.** `compare` and `take` get exactly one cue per row/line (`[cue-count]`), so with N rows
  the `say` can be at most ≈ 15·(N+1) words. More to say? Add rows or split into another scene.
- **One motion per reveal.** Each cue moves one thing (a box arrives, a pointer moves, a value changes). Recolor +
  glow on the same box counts as one. Don't fire a move, a new box and a text change on the same phrase; give each
  its own words.
- **Cue order = speaking order** (`[cue-order]`). A cue matches the **first** occurrence (case-insensitive) of the
  phrase anywhere in the `say`: pick 2–4 word phrases that occur once. "in" matches inside "index"; "two" matches
  inside "two pointers" earlier on.
- **Keep one stage.** Consecutive diagram scenes reuse the same coordinates for the same things (the array stays put,
  only pointers and values change), so the lesson feels like one continuous shot.
- **Held reads are good.** After a big reveal add `"hold": 2` (silent seconds). Stillness beats busy motion.
- **Fill the frame, stay out of the edges.** Diagrams auto-zoom to fill the screen; text is ≥ 32 px after auto-fit
  (`[font-floor]`). Captions own the bottom band: content stays at y ≤ 920.

## 6. Length targets

Kokoro speaks ≈ 2.75 words/s. Each scene adds ≈ 1.25 s, each quiz +6 s (countdown + answer hold), each chapter card
2.5 s. A scene's `say` is typically 25–70 words (max 90, `[say-length]`).

| Video | Words of `say` | Scenes |
|---|---|---|
| 6 min | ≈ 800 | ≈ 28 |
| 8 min | ≈ 1,100 | ≈ 36 |
| 10 min | ≈ 1,400 | ≈ 45 |
| 12 min (max, dense lessons) | ≈ 1,650 | ≈ 52 |

Aim for the low end for 1–2 covers, the high end for 8–10 covers. Check with:
```sh
node -e 'const s=require("./build/<id>.json"),w=s.scenes.reduce((a,x)=>a+(x.say?x.say.split(/\s+/).length:0),0),q=s.scenes.filter(x=>x.type==="quiz").length;console.log(w,"words",s.scenes.length,"scenes ≈",((w/2.75+s.scenes.length*1.25+q*6+s.chapters.length*2.5)/60).toFixed(1),"min")'
```

## 7. The lesson file

```json
{"id": "dsa-05", "track": "DSA", "num": 5, "title": "Binary Search & Search on the Answer", "covers": ["cp06"],
 "caps": [["O of log n", "O(log n)"]],
 "chapters": [{"title": "…", "scenes": [ … ]}, {"title": "Interview drill", "kind": "drill", "scenes": [ … ]},
              {"title": "Recap", "kind": "recap", "scenes": [ … ]}]}
```

- `id` = filename stem = syllabus id. `num` = the number in the id. `title` = syllabus title.
- `track` exactly one of `SWE`, `Backend`, `DSA`, `Frontend`, `AI Eval`, `C++` (sets branding and output folder).
- `covers` = the syllabus covers, exactly. `caps` = caption fixes (§ 9). Don't set `voice` or `speed`.
- Chapter `kind`: `"teach"` (default when omitted), `"drill"` (exactly one), `"recap"` (last).
- Chapter cards are inserted automatically. Never write `chapter` or `title` scenes.

## 8. Primitive reference

Canvas 1920×1080. Fields every scene can use: `say` (required), `head` (top-left heading, ≤ 40 chars; use on
teaching scenes, omit on hook/quiz/take), `hold` (silent seconds after the voice, default 0.8). Text fields
(`head`, cells, `label`, `sub`, `q`, options, take lines) render `` `backticks` `` as code. Tones: `good` green,
`bad` red, `warn` amber, `dim` faded; boxes, bars and macros use `blue` for blue (and `ghost` = dashed border),
notes use `info` (their default).

### hook — first scene only
```json
{"type": "hook", "say": "Two threads each add one to a counter, a hundred thousand times. You expect two hundred thousand. You get less. Let's find out where the rest went.",
 "lines": [{"text": "2 threads × 100,000 adds", "cue": "Two threads"}, {"text": "Expect 200,000", "cue": "You expect"}, {"text": "Get less.", "cue": "You get less", "accent": "less"}]}
```
1–4 lines, each `text` ≤ 42 chars (one line, never wraps), giant type slamming in on its cue; earlier lines dim.
`accent`: `true` (whole line amber) or a substring that appears **exactly** (case-sensitive) in `text`, else nothing
is highlighted. `say` ≤ 40 words (`[hook-length]`).

### flow — a row of 2–5 boxes joined by arrows
```json
{"type": "flow", "head": "Every guess halves the range", "say": "Guess the middle. Too high, so half is gone. Again. A million shrinks to one.",
 "items": [{"label": "start", "text": "1,000,000", "cue": "Guess the middle"}, {"label": "1 guess", "text": "500,000", "cue": "half is gone"},
           {"label": "20 guesses", "text": "1", "tone": "good", "sub": "found", "cue": "shrinks to one"}]}
```
Each item: `text` (≤ 15 chars with ≤ 4 items, ≤ 11 chars with 5), optional `label` (above), `sub` (small, below),
`tone`, `cue` (box and its incoming arrow appear). Scene-level `y` (default 420), `h` (default 240).

### diagram — the worked-example stage
```json
{"type": "diagram", "head": "Cache-aside", "say": "The app asks Redis first. A miss. So it reads the database, two hundred milliseconds, and saves the copy.",
 "items": [{"id": "app", "x": 160, "y": 450, "w": 300, "h": 140, "text": "app", "cue": "The app"},
           {"id": "redis", "x": 810, "y": 300, "w": 300, "h": 140, "label": "cache", "text": "Redis", "tone": "bad", "cue": "Redis first"},
           {"id": "db", "x": 810, "y": 620, "w": 300, "h": 140, "label": "database", "text": "Postgres", "cue": "reads the database"},
           {"id": "ms", "x": 1400, "y": 620, "w": 300, "h": 140, "text": "0", "size": 56, "tone": "warn", "cue": "two hundred"}],
 "arrows": [{"from": "app", "to": "redis", "label": "GET", "cue": "asks"}, {"from": "app", "to": "db", "cue": "reads the database"},
            {"from": "db", "to": "redis", "tone": "good", "bend": -60, "cue": "saves the copy"}],
 "changes": [{"id": "redis", "text": "miss", "cue": "A miss"}, {"id": "ms", "count": [0, 200], "cue": "two hundred"}]}
```
- **Item:** `id` (never `a0`, `a1`…: reserved for arrows), `x`, `y` (top-left), `w`, `h`, `text`, optional `label`
  (sits 46 px above the box), `sub`, `tone`, `size` (text px, default 40, auto-shrinks to fit), `cue` (pops in with a
  glow). Region (dashed frame behind things): `{"id": "win", "region": true, "x", "y", "w", "h", "label", "tone", "cue"}`.
- **Safe area:** x 100–1820, y 190–920 (lint). Leave ≥ 60 px above any box with a `label`. Text fits when
  `w ≥ 20 × (longest text in chars) + 30` (with size ≤ 40).
- **Arrow:** `from`, `to` (item ids), `cue` (draws, then a pulse runs along it), optional `label`, `tone`,
  `bend` (px curve, ±), `dx`/`dy` (shift the target point). Arrow ids are `a0`, `a1`… in order: your `arrows` first,
  then arrows generated by `list`/`tree` macros.
- **Auto-zoom:** the diagram is scaled up (max 1.6×, never down) to fill the frame with a slow push-in, so draw at
  real size inside the safe area. `"noZoom": true` turns it off.
- **Code beside a diagram:** add `panels` (+ `steps`, `notes`) as in `code`; the panel takes the left side
  (`area` default `{"w": 840}`), items must start at x > 990, panel lines ≤ 35 chars, ≤ 12 lines.
- **Free notes:** `"notes": [{"x": 1200, "y": 300, "text": "O(1) average", "tone": "good", "cue": "…"}]` (≤ 32 chars).

**Change ops** (`changes`, each `{"id", "cue", …}`; targets item ids, macro ids like `c3`, or arrows `a0`…):

| Op | Example | Effect |
|---|---|---|
| `text` | `{"id": "sum", "text": "9", "cue": "nine"}` | value slides out, new value in, box pulses (chainable) |
| `count` | `{"id": "ms", "count": [0, 200], "dur": 1, "cue": "…"}` | number counts up; set the box `text` to the start value |
| `tone` | `{"id": "c4", "tone": "dim", "cue": "…"}` | recolors the box border (or arrow `a1`) |
| `glow` | `{"id": "c3", "glow": true, "tone": "good", "cue": "…"}` | glow pulse in the tone color ("look here") |
| `move` | `{"id": "lo", "move": [810, 570], "cue": "lo jumps"}` | slides the box to the new top-left x, y |
| `kill` | `{"id": "node2", "kill": true, "cue": "freed"}` | fades to 25 % with a red ✕ (deleted, freed, invalid) |
| `fade` | `{"id": "tmp", "fade": true, "cue": "…"}` | fades out |

Ops combine in one object when they are one motion: `{"id": "v0", "text": "no", "tone": "bad", "cue": "Twelve"}`.

**Macros** (go inside `items`; expand to normal items with ids `<id>0`, `<id>1`…, which `changes` can target):

```json
{"array": {"id": "c", "values": [2, 7, 11, 15], "y": 380, "cue": "Here is the array"}}
{"list":  {"id": "n", "values": [1, 2, 3, 4], "y": 420, "cues": ["one", "two", "three", "four"]}}
{"tree":  {"id": "t", "nodes": [[8, -1], [3, 0], [10, 0], [1, 1], [6, 1]], "cue": "the tree"}}
{"stack": {"id": "s", "values": ["main", "f", "g"], "x": 810, "y": 800, "cue": "the call stack"}}
```
- `cue` reveals all elements at once; `cues` (one per element) reveals them one by one. Optional `tone`,
  `arrowTone` (list/tree).
- **array:** square cells with their index above. For n ≤ 9 cells, each is 160 px wide, 20 px apart, and cell k's
  left edge is `x = 970 − 90·n + 180·k` (n = 6: 430, 610, 790, …), top at `y` (default 420). Put pointer boxes
  (`lo`, `hi`, `i`) under cells at that x + 20 and slide them with `move`. Values ≤ 3 chars.
- **list:** nodes 140 px tall in a row joined by arrows (node k's arrow appears with node k).
- **tree:** `[value, parentIndex]`, root parent `-1`, children left → right in listed order. Nodes 130 px, levels
  190 px apart from `y` (default 240), leaves 170 px apart centered on `x` (default 960). Max 3 levels at the default
  y, 4 with `"y": 190`; max 9 leaves (the lint checks the safe area).
- **stack:** `values[0]` at the bottom; 300×100 boxes stacked upward from `y` (top of the bottom box, default 800).
  Max 6 values. Push = a later scene with one more value (or an item with a cue); pop = `fade` the top id.

### code — code with highlighted lines, notes and real output
```json
{"type": "code", "head": "Prefix sums in one pass", "say": "Start the running sum at zero. Each step adds the next value. Then print them. Zero, one, three, six.",
 "panels": [{"file": "sol.cpp", "code": "vector<int> a = {1, 2, 3};\nvector<int> p(4, 0);\nfor (int i = 0; i < 3; i++)\n    p[i + 1] = p[i] + a[i];\nfor (int x : p) cout << x << ' ';"}],
 "steps": [{"lines": [2], "cue": "at zero"}, {"lines": [3, 4], "cue": "adds the next"}, {"lines": [5], "cue": "print them"}],
 "notes": [{"line": 4, "inside": true, "text": "O(1) per step", "tone": "good", "cue": "adds the next"}],
 "output": {"cmd": "./sol", "text": "0 1 3 6", "cue": "Zero, one"}}
```
- **Panel:** `file` (sets the language and the tab name: `.cpp .py .ts .js .sql .sh .java .go .rs .css .txt`),
  `code` (`\n` between lines), optional `label` + `tone` (tag in the tab bar, e.g. `"label": "bug", "tone": "bad"`),
  `"type": true` (types itself out with a caret; add `cue` to start typing at a phrase).
- **Size limits (font ≥ 32 px):** one panel ≤ 74 chars/line, ≤ 12 lines (≤ 9 lines when there is `output`);
  two panels side by side ≤ 32 chars/line each; beside a diagram ≤ 35 chars. Cut comments, use short names.
- **steps:** highlight `lines` (others dim) at `cue`; `{"lines": [], "cue": …}` un-dims all; `panel` picks the panel.
  Steps fire only after the code has finished appearing (about a second).
- **notes:** pinned to code `line`. With one full-width panel always use `"inside": true` (the note sits at the
  right end of the line). ≤ 32 chars. A pinned note must not cover code: `[note-overlap]` fails if it would sit on its line's text (shorten the line or the note, or use a free-position `x`,`y` note). `bad` notes play an error sound: use them for the trap line.
- **output:** terminal below the code: `cmd`, `text` (`\n` between lines, ≤ 3 lines), `cue`, `"tone": "bad"`
  for an error or wrong result. It must be the real output (§ 10).
- Two panels: `"panels": [{…"label": "before"}, {…"label": "after"}]` for before/after or bug/fix.

### compare — a table that fills row by row
```json
{"type": "compare", "head": "map vs unordered_map", "say": "Lookup? Map walks a tree, twenty steps per million keys. Hashing jumps to a bucket. Worst case? Collisions can make hashing O of n. Order? Only map keeps keys sorted.",
 "heads": ["", "`map`", "`unordered_map`"], "rows": [["lookup", "O(log n) tree walk", "O(1) average"], ["worst case", "O(log n)", "O(n) with collisions"], ["order", "sorted", "none"]],
 "cues": ["Lookup", "Worst case", "Order"]}
```
`heads` (2–3 columns), `rows` (≤ 7, each with one cell per head), optional `rowHeads` (one per row, a narrow left
column), `cues` (exactly one per row, `[cue-count]`; ≤ 15 words of `say` per row, see § 5).
With > 2 rows, earlier rows dim as each new row lands and everything un-dims at the end. Cells ≤ ~45 chars (2 cols).

### quiz — pause and predict
```json
{"type": "quiz", "say": "Your turn. Same array, but search for eight. Which index comes back? Pause and predict.",
 "q": "In [1, 3, 5, 7, 7, 9], what does `lowerBound(a, 8)` return?", "options": ["4", "5", "6", "-1"], "answer": 1}
```
The question appears, options pop in, a silent 3-2-1 countdown ring runs after the voice, then the right option
lights green and holds 3 s. `q` ≤ 80 chars; 2–4 `options`, ≤ 22 chars each; `answer` = option index or the exact
option string (a mismatch silently highlights nothing). Open question: omit `options`, `answer` = the short answer
text (≤ 30 chars) revealed after the countdown. `pause` (default 3) and `hold` (default 3) in seconds; give the drill
self-tests `"pause": 5`. `optCue` (fraction 0–1 of the voice, or a phrase from `say`; default 0.35) sets when options appear. The `say` asks
and stops: never speak the answer inside the quiz. The next scene's first sentence gives it with the reason.

### chart — bars that grow and count
```json
{"type": "chart", "head": "One product page read", "say": "From the database, two hundred milliseconds. From Redis, about two. That's a hundred times faster.", "unit": "ms",
 "bars": [{"label": "Postgres", "value": 200, "tone": "bad", "cue": "From the database"}, {"label": "Redis", "value": 2, "tone": "good", "cue": "From Redis"}]}
```
≤ 6 bars, `label` ≤ 10 chars, `value` a number (shown counting up, then `unit`). **The scale is linear**: a bar under
1/20 of the tallest is a sliver. That's fine when the tininess is the point (200 vs 2 ms); otherwise chart comparable
values (operations for n = 10, 20, 40), never 10 next to 1,000,000.

### problem — the chapter's question, stated first
```json
{"type": "problem", "title": "Pair with target sum", "statement": "Given a sorted array and a target, return two numbers that add up to the target.",
 "example": {"input": "[1, 3, 4, 6, 8, 11], target 10", "output": "4 + 6"}, "note": "n up to 100,000",
 "say": "Here is the problem. For example, this sorted array and a target of ten. We want the pair that adds up: four and six. Up to a hundred thousand numbers.",
 "cues": {"example": "For example", "output": "four and six", "note": "Up to a hundred"}}
```
First scene of every teach chapter (after the hook + agenda in chapter 1). `title` ≤ 40 chars, `statement` ≤ 160 chars
(wraps to ≤ 3 lines), `example.input` / `example.output` ≤ 60 chars each, `note` optional. Title and statement
appear at scene start; input at `cues.example`, output at `cues.output`, note at `cues.note` (in that order;
`example` and `output` required). Reveal gaps follow `[gap]` (≤ 15 words), so cue "For example" early.

### take — the lines to remember
```json
{"type": "take", "say": "So say this. A sliding window adds what enters and subtracts what leaves. Each element moves once, so O of n. Use it for the best contiguous range.",
 "lines": ["Add what enters, subtract what leaves.", "Each element in and out once: O(n).", "Use it for the best contiguous range."],
 "cues": ["adds what enters", "moves once", "Use it"]}
```
≤ 3 lines, ≤ 50 chars each, one cue per line. The lesson's last scene must be a `take` (`[recap-last]`).
`kicker` is optional (default "Remember"). The **agenda** is a take with `"kicker": "Today"`:
```json
{"type": "take", "kicker": "Today", "say": "Today you will do three things. Find a pair that hits a target, in one pass. Slide a window instead of recounting. And grow and shrink a window to fit a rule.",
 "lines": ["Find a pair that hits a target, in one pass", "Slide a window instead of recounting", "Grow and shrink a window to fit a rule"],
 "cues": ["Find a pair", "Slide a window", "grow and shrink"]}
```

### drill scene (the shape every drill scene follows)
```json
{"type": "compare", "head": "Say it in 20 seconds", "covers": ["cp04"], "heads": ["They ask", "You say"],
 "say": "What is a sliding window? A range you update as elements enter and leave. Why O of n? Each element enters once and leaves once. Negative numbers? Shrinking breaks, so use prefix sums with a deque.",
 "rows": [["What is a sliding window?", "A range updated as elements enter and leave"], ["Why O(n)?", "each element enters once, leaves once"], ["Negative numbers?", "shrinking breaks: prefix sums + deque"]],
 "cues": ["What is a sliding", "Why O of n", "Negative numbers"]}
```

## 9. Spoken text (`say`) conventions

TTS reads `say` literally and captions show it. Lint bans `C++`, `std::`, `->`, `::`, `{ } < > ;` and backticks,
`nullptr`, `RAII`, `STL` in `say`. Also never write `( ) [ ] = + * / % & | ^ # _` or digits glued to symbols.

| Write in `say` | Captions show |
|---|---|
| `C plus plus`, `C plus plus seventeen` | C++, C++17 (automatic) |
| `s t d colon colon vector`, `s t d` | std::vector, std (automatic) |
| `null p t r` | nullptr (automatic) |
| `i plus plus`, `plus plus i` | i++, ++i (automatic) |
| spaced acronyms `R A I I`, `S T L`, `U B`, `H T T P`, `A P I`, `S Q L`, `J S O N`, `J W T`, `C P U`, `T C P`, `D N S`, `C S S`, `D O M`, `L L M` | RAII, STL, … (automatic: single capitals separated by spaces are joined) |
| `O of n`, `O of log n`, `O of n log n`, `O of n squared`, `O of one` | add to `caps` (below) |
| `Big O` (as the existing scripts say it) | add `["Big O", "Big-O"]` to `caps` |
| `star p` (for `*p`), `ampersand`, `arrow`, `double colon` | as written |
| camelCase as words: `use effect`, `push back`, `make unique` | add to `caps`: `["[Uu]se effect", "useEffect"]` |
| numbers as words: `forty two`, `ten to the eighth`, `LeetCode thirty five` | as written |

`caps` is a list of `[regex, written]` applied to captions in order, after the automatic fixes (so spaced capitals
are already joined). Put longer patterns first: `[["O of n log n", "O(n log n)"], ["O of n squared", "O(n²)"],
["O of n", "O(n)"], ["O of one", "O(1)"]]`. Regexes are case-sensitive. Avoid two single capitals in a row that are
not an acronym ("is it A or B" is fine; "plan A B" becomes "AB"). Names TTS might mangle (Kokoro, Dijkstra) are fine;
rephrase anything that is pure punctuation. `caps` touch captions only: screen text you write (`head`, hook `lines`,
cells, labels) is shown exactly as written, so write it in display form (`Big-O`, `O(n)`, `std::move`).

## 10. Code must be correct, and every output real

Every code panel is a real program (or a real fragment of one). Before you use it, save the full program (panel code
+ includes + `main`) in a scratch dir and run it:

```sh
g++ -std=c++17 -Wall -Wextra -fsanitize=address,undefined sol.cpp -o sol && ./sol   # C++
python3 app.py                                                                      # Python
node app.js        # JavaScript;  node app.ts  runs TypeScript (types are stripped)
sqlite3 :memory: < query.sql                                                        # SQL
```

- The `output.text` is copied from what it printed. Quiz answers and worked-example numbers are checked the same way.
- A deliberately broken snippet (the trap) gets a `bad` label/note; describe the error in plain words or use the
  real compiler message, never an invented one. Undefined behaviour is never shown as having a fixed output.
- `codecheck` compiles C++ panels as written: include your own headers (put `#include`/`using namespace std;` in the
  panel, or in `output.setup`, see §11). A C++ panel without `main` is skipped.
- Language per track: **DSA** C++ (`sol.cpp`, no Python); **C++** C++; **SWE** and **Backend** Python (`app.py`),
  plus SQL (`query.sql`) or shell (`run.sh`) when the topic needs it; **Frontend** TypeScript/TSX (check the logic
  as plain `.ts`); **AI Eval** Python. Use the real complexity, real HTTP status codes, real SQL.

## 11. Workflow (repeat until green)

Run from the repo root (`/stuff/Study/cpp-videos`):

```sh
node flatten.mjs lessons/<id>.json && node validate.mjs build/<id>.json && node coverage.mjs --lesson lessons/<id>.json && node codecheck.mjs lessons/<id>.json
```

Green = the four commands succeed (`ok`, coverage prints nothing and exits 0, codecheck has no FAIL).
`codecheck` runs every scene's `output.cmd` on that scene's panels and compares with `output.text`: every scene must
PASS or SKIP; a FAIL means the shown output is not what the code produces (fix code or text). A SKIP (network, fragment
without `main`, git) means you must have run it yourself elsewhere. Panels of one scene must run on their own, or use these escape hatches on `output`
(neither is ever shown on screen):

- `"setup": {"<file>": "<code>"}` hidden files written before the panels. A key equal to a panel's file name is
  prepended to that panel's code (earlier-scene definitions, includes); any other key is its own file (a module the
  panel imports, a data file). For `sqlite3 <db>` cmds the `.sql` setup files run first, then the panel's `.sql`.
  Example: `"output": {"cmd": "sqlite3 app.db", "setup": {"seed.sql": "CREATE TABLE users(id INT, email TEXT);"}, "text": "..."}`
  or `"setup": {"app.py": "from db import query"}` plus `"db.py": "def query(q): ..."`.
- `"approx": true` for timing, profiling or random output: cmd must exit 0 and `text` must have the same lines with a
  number in each position of stdout (values may differ). Example: `"text": "dns 0.02\ntls 0.15", "approx": true`. Fix every message and rerun. Do
not run TTS, `build.mjs`, `make.sh` or a render; do not edit any file except `lessons/<id>.json` (scratch code files
go in a temp dir).

| Lint message | Fix |
|---|---|
| `[hook-first]` / `[hook-length]` | first scene of chapter 1 is a `hook`, `say` ≤ 40 words |
| `[agenda]` | the scene right after the hook is a `take` with `"kicker": "Today"` |
| `[problem-first]` | every teach chapter's first scene is a `problem` (chapter 1: after hook + agenda) |
| `[problem-length]` | statement ≤ 160 chars, example input/output ≤ 60 chars each |
| `[quiz-per-chapter]` | add a quiz to that teach chapter |
| `[type-variety]` / `[type-repeat]` | ≥ 3 scene types per teach chapter, no type 3× in a row |
| `[chapter-kind]` | kind is `teach`, `drill` or `recap` |
| `[drill-covers]` | exactly one drill chapter; its scenes' `covers` together list every lesson `covers` id |
| `[recap-last]` | last chapter is `recap` and ends with a `take` |
| `[gap] N words between reveals` | add a cue in that stretch or cut words (start, between cues, and end all count) |
| `[gap] no reveal for N words` | that scene has no cue phrases at all |
| `[cue-order]` | reorder the list or pick a phrase that first occurs later |
| `[say-length]` | `say` ≤ 90 words: split the scene |
| `[region-title]` | a region's title sits on its top border: keep cells' top (and index labels) ≥ 80 px below the region top, or right of the title |
| `[note-overlap]` | shorten that code line or the note text, or use a free-position note (`x`,`y`) |
| `[font-floor]` | shorten code lines / box text, fewer lines, or widen the box |
| `[table-fit]` | compare table still taller than y 190-900 at the 32 px floor: cut rows or shorten cell text (the build already shrinks padding, then font) |
| `[offscreen]` | a diagram note, label, arrow label or box text would render left of x 80 or right of x 1840 (after the auto-zoom): shorten it (message gives max chars) or move it inward |
| `[label-overlap]` | two arrow labels, or an arrow label and a box/its label, intersect: shorten the label, add `bend`, or move the boxes apart |
| `… cue "…" not found in say` | every cue (steps, notes, output, rows, items, arrows, changes, hook lines, bars, panels, `optCue`) must be an exact substring of that scene's `say`; order/gap checks wait until all are found |
| `[cue-count]` | one cue per compare row / take line |
| `[macro] …` | a macro is malformed (e.g. a tree parent index that doesn't exist) |
| `outside safe area` / `overlaps code panel` | move the item (macros too: trees too deep or wide) |
| `change targets unknown id` / `arrow … unknown id` | typo, or arrow index beyond the arrows list |
| `say contains /…/` | write the symbol as words (§ 9) |
| structural: `missing say` / `chapter card must have no say` | every scene needs `say`; never write `chapter` scenes |
| structural: `panel k has N lines (max 16)` / `line width W too wide` | ≤ 12 lines; ≤ 74 chars (one panel), 32 (two), 35 (beside diagram) |
| structural: `step line …` / `note line … out of range` | line numbers start at 1 and must exist in that panel |
| structural: `note text too long` / `note needs line (code) or x,y (diagram)` | notes ≤ 32 chars; code notes take `line`, diagram notes `x`,`y` |
| structural: `row j has N cells, heads M` / `rowHeads length != rows length` / `max 7 rows` | one cell per head, one rowHead per row, ≤ 7 rows |
| structural: `take: max 3 lines` / `flow: max 5 items` | split into another scene |
| structural: `item id "a0" clashes with arrow ids` | rename the item (`a0`, `a1`… are arrows) |
| `already claimed by <id>` (coverage) | your `covers` must match your syllabus row |

## 12. Self-check before you hand back

- [ ] Green: flatten + validate + coverage all pass.
- [ ] Hook in outcome language; "why it matters" lands as beat 2.
- [ ] Every teach chapter: analogy → example running on screen → code with real output → quiz → trap.
- [ ] Every quiz's answer is explained in the first sentence of the next scene.
- [ ] Every point of every `scripts/<cid>.json` in `covers` is taught, and the drill answers each `question`
      out loud in ≤ 55 words with an example and the follow-up.
- [ ] Practice card names 3 real problems with exact numbers and titles (DSA / coding lessons).
- [ ] All code compiled and run; every output, number and quiz answer verified by running it.
- [ ] Every cue moves one thing; consecutive diagram scenes keep the same stage coordinates.
- [ ] Length matches § 6 (run the estimate command); no scene is filler.
- [ ] Read the whole `say` text top to bottom aloud in your head: it sounds like a teacher talking, no banned
      phrases, no symbols, numbers as words, short sentences.
- [ ] Pilot audit lessons (each cost a re-audit): a quiz about code shows that code on screen; every analogy
      is introduced before it is used and tied explicitly to the real thing; no dense one-liners (split
      `for(a;b;c)` tricks into plain loops); claims are scoped exactly ("for sum-threshold windows", not
      "always"); a printed output needs the print code visible; directions are literal ("R steps one cell
      left", not "move right in"); state preconditions (sorted input) and hidden costs (O(n log n) sort).
- [ ] Production audit lessons (most common RED causes): every term (TTL, rebase, idempotency key, hop…)
      is defined in plain words the FIRST time it is spoken; a quiz asks for a PREDICTION on new inputs —
      never an answer already said, and never a question whose `say` gives the answer away; distractors are
      plausible mistakes; the drill mixes scene types (no 3 compare tables in a row) and answers in full
      spoken sentences, not fragments; chart narration derives a number before showing it, never talks over
      an empty chart; diagram labels never overlap (shorten labels, bend arrows, widen gaps); every panel
      labelled "run.sh"/"main.py" is genuinely runnable as shown; numbers spoken unambiguously ("ninety
      nine commits back", not "the one ninety nine back"); each chapter ends by saying how it answered its
      problem card; problem-card `say` openings vary (not "New problem... For example... We want..." every
      time); no scene holds >6 s without a new reveal; diagram nodes appear on their spoken beat, not all at once.

## 13. Complete example lesson (passes the lint)

A short lesson (≈ 4 min) showing every part of the skeleton. A real lesson is longer and has more teach chapters.
It lives at `test/fixtures/brief-example.json` and `node --test test/` checks it stays green. (Its coverage check
reports `cp06 already claimed by dsa-05` because it is an example, not the real `dsa-05`.) Note how chapter 2's quiz
answer opens the code scene, how lo/hi sit under array cells at `970 − 90·6 + 180·k + 20`, and how the drill answers
both halves of cp06's question.

<!-- example:start -->
```json
{
 "id": "brief-example", "track": "DSA", "num": 99, "title": "Binary Search: Find the First Yes", "covers": ["cp06"],
 "caps": [["O of log n", "O(log n)"], ["lo plus half the gap", "lo + (hi - lo) / 2"]],
 "chapters": [
  {"title": "A million in twenty guesses", "scenes": [
   {"type": "hook", "say": "I'm thinking of a number from one to a million. You get twenty guesses. Sounds impossible? By the end, you'll win every time, and write the code with zero off by one bugs.",
    "lines": [{"text": "1 to 1,000,000", "cue": "number from one"}, {"text": "20 guesses", "cue": "twenty guesses"}, {"text": "Never miss.", "cue": "win every time", "accent": true}]},
   {"type": "take", "kicker": "Today", "say": "Today you will do three things. Find any value in a sorted list by halving it. Write the loop with no off by one bugs. And search an answer that is not even in an array.",
    "lines": ["Find a value by halving the range", "Write the loop with no off by one", "Search the answer, not the array"],
    "cues": ["Find any value", "Write the loop", "search an answer"]},
   {"type": "problem", "title": "First value at least x", "statement": "Given a sorted array and a number x, find the first position holding a value at least x.",
    "example": {"input": "[1, 3, 5, 7, 7, 9], x = 7", "output": "index 3"}, "note": "n up to 1,000,000",
    "say": "Here is the problem. For example, this array and x equal to seven. First big enough spot? Index three. Up to a million items, so no scanning.",
    "cues": {"example": "For example", "output": "Index three", "note": "Up to a million"}},
   {"type": "flow", "head": "Every guess halves the range",
    "say": "Here's the trick. Guess the middle. Five hundred thousand? Too high, so half the numbers are gone. Guess the middle of what's left. Every guess halves the range, and a million shrinks to one number in twenty guesses. That halving is binary search.",
    "items": [{"label": "start", "text": "1,000,000", "cue": "Guess the middle"}, {"label": "1 guess", "text": "500,000", "cue": "half the numbers"}, {"label": "2 guesses", "text": "250,000", "cue": "middle of what"}, {"label": "20 guesses", "text": "1", "tone": "good", "cue": "shrinks to one"}]},
   {"type": "diagram", "head": "First value at least 7",
    "say": "Sorted array. We want the first value at least seven. Lo starts at zero, and hi starts one past the end. The middle is index three, value seven. Big enough, so hi moves to three. The right half is out. Next middle is index one, value three. Too small, so lo jumps to two. Index two holds five. Still too small, so lo jumps again. Lo meets hi. The answer is index three.",
    "items": [
     {"array": {"id": "c", "values": [1, 3, 5, 7, 7, 9], "y": 380, "cue": "Sorted array"}},
     {"id": "lo", "x": 450, "y": 570, "w": 120, "h": 70, "text": "lo", "tone": "warn", "cue": "Lo starts"},
     {"id": "hi", "x": 1530, "y": 660, "w": 120, "h": 70, "text": "hi", "tone": "good", "cue": "hi starts"},
     {"id": "ans", "x": 790, "y": 800, "w": 340, "h": 110, "label": "answer", "text": "?", "size": 56, "cue": "first value"}],
    "changes": [
     {"id": "c3", "glow": true, "cue": "index three"},
     {"id": "hi", "move": [990, 660], "cue": "hi moves"},
     {"id": "c4", "tone": "dim", "cue": "right half"}, {"id": "c5", "tone": "dim", "cue": "right half"},
     {"id": "c1", "glow": true, "tone": "bad", "cue": "index one"},
     {"id": "lo", "move": [810, 570], "cue": "jumps to two"},
     {"id": "c2", "glow": true, "tone": "bad", "cue": "holds five"},
     {"id": "lo", "move": [990, 570], "cue": "jumps again"},
     {"id": "ans", "text": "3", "tone": "good", "cue": "answer is"}]},
   {"type": "code", "head": "The template that never goes off by one",
    "say": "Here it is in C plus plus. Lo and hi start at the two ends. While the range is not empty, take the middle. If the middle value is too small, the answer is to its right, so lo becomes mid plus one. Otherwise mid might be the answer, so hi becomes mid. When the loop ends, lo is the first index that is big enough. On our array it prints three.",
    "panels": [{"file": "sol.cpp", "code": "int lowerBound(const vector<int>& a, int x) {\n    int lo = 0, hi = (int)a.size();\n    while (lo < hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (a[mid] < x) lo = mid + 1;\n        else hi = mid;\n    }\n    return lo;\n}"}],
    "steps": [{"lines": [2], "cue": "two ends"}, {"lines": [3, 4], "cue": "take the middle"}, {"lines": [5], "cue": "too small"}, {"lines": [6], "cue": "Otherwise"}, {"lines": [8], "cue": "loop ends"}],
    "output": {"cmd": "./sol", "text": "3", "cue": "prints three"}},
   {"type": "quiz", "say": "Your turn. Same array, but search for eight. Which index comes back? Pause and predict.",
    "q": "In [1, 3, 5, 7, 7, 9], what does `lowerBound(a, 8)` return?", "options": ["4", "5", "6", "-1"], "answer": 1},
   {"type": "compare", "head": "Three bugs interviewers watch for",
    "say": "It's five. Nine is the first value at least eight. Three classic bugs. Adding lo and hi can overflow, so add half the gap instead. Mixing two loop templates can loop forever, so pick one. And search for ten: lo ends at six, past the end. Check it before reading.",
    "heads": ["Bug", "What happens", "Fix"],
    "rows": [["`(lo + hi) / 2`", "overflows when both are huge", "`lo + (hi - lo) / 2`"], ["`lo <= hi` with `hi = mid`", "loops forever", "one template, always"], ["read `a[lo]` blindly", "lo can equal `a.size()`", "check `lo < n` first"]],
    "cues": ["Adding lo", "Mixing two", "search for ten"]}]},
  {"title": "Search the answer, not the array", "scenes": [
   {"type": "problem", "title": "Smallest ship that works", "statement": "Ten packages must ship in five days, in order. Find the smallest ship capacity that makes it.",
    "example": {"input": "weights 1 to 10, 5 days", "output": "capacity 15"},
    "say": "New problem, no sorted array. For example, weights one to ten, five days. Smallest capacity that works? Fifteen.",
    "cues": {"example": "For example", "output": "Fifteen"}},
   {"type": "diagram", "head": "Smallest ship that works in 5 days",
    "say": "Now a problem with no sorted array at all. Ten packages weigh one to ten, and you have five days. What's the smallest ship that works? Ask a yes or no question for each capacity. Twelve: no. Thirteen: no. Fourteen: no. Fifteen: yes. Sixteen: yes. Once it says yes, it stays yes. So binary search for the first yes.",
    "items": [
     {"id": "task", "x": 610, "y": 200, "w": 700, "h": 110, "text": "weights 1 to 10 · 5 days", "tone": "warn", "cue": "Ten packages"},
     {"id": "c0", "x": 430, "y": 380, "w": 160, "h": 160, "label": "capacity", "text": "12", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "c1", "x": 610, "y": 380, "w": 160, "h": 160, "text": "13", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "c2", "x": 790, "y": 380, "w": 160, "h": 160, "text": "14", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "c3", "x": 970, "y": 380, "w": 160, "h": 160, "text": "15", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "c4", "x": 1150, "y": 380, "w": 160, "h": 160, "text": "16", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "c5", "x": 1330, "y": 380, "w": 160, "h": 160, "text": "17", "size": 56, "tone": "blue", "cue": "smallest ship"},
     {"id": "v0", "x": 430, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"},
     {"id": "v1", "x": 610, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"},
     {"id": "v2", "x": 790, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"},
     {"id": "v3", "x": 970, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"},
     {"id": "v4", "x": 1150, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"},
     {"id": "v5", "x": 1330, "y": 600, "w": 160, "h": 100, "text": "?", "cue": "yes or no question"}],
    "changes": [
     {"id": "v0", "text": "no", "tone": "bad", "cue": "Twelve"}, {"id": "v1", "text": "no", "tone": "bad", "cue": "Thirteen"},
     {"id": "v2", "text": "no", "tone": "bad", "cue": "Fourteen"}, {"id": "v3", "text": "yes", "tone": "good", "cue": "Fifteen"},
     {"id": "v4", "text": "yes", "tone": "good", "cue": "Sixteen"}, {"id": "v5", "text": "yes", "tone": "good", "cue": "stays yes"},
     {"id": "v3", "glow": true, "tone": "good", "cue": "first yes"}]},
   {"type": "quiz", "say": "Quick one. If everything had to ship in one day, which capacity would the search return? Pause and predict.",
    "q": "Weights 1 to 10, one day. Smallest capacity?", "options": ["10", "15", "55", "56"], "answer": "55"},
   {"type": "code", "head": "Binary search over capacities",
    "say": "Fifty five: the whole load in one trip. The smallest capacity is the heaviest package. The largest is the total. Check the middle. If it fits, try smaller. If not, go bigger. The check must never flip from yes back to no, or the search breaks. Here it returns fifteen.",
    "panels": [{"file": "sol.cpp", "code": "int shipWithinDays(const vector<int>& w, int days) {\n    int lo = *max_element(w.begin(), w.end());\n    int hi = accumulate(w.begin(), w.end(), 0);\n    while (lo < hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (fits(w, days, mid)) hi = mid;\n        else lo = mid + 1;\n    }\n    return lo;\n}"}],
    "steps": [{"lines": [2], "cue": "heaviest package"}, {"lines": [3], "cue": "The largest"}, {"lines": [5, 6], "cue": "If it fits"}, {"lines": [7], "cue": "go bigger"}, {"lines": [9], "cue": "returns fifteen"}],
    "notes": [{"line": 6, "inside": true, "text": "fits() must be monotonic", "tone": "warn", "cue": "never flip"}]}]},
  {"title": "Interview drill", "kind": "drill", "scenes": [
   {"type": "compare", "head": "Say it in 20 seconds", "covers": ["cp06"],
    "say": "How does binary search work? Halve a range that holds the answer, every step. How fast? O of log n, so a million items take twenty steps. Search on the answer? Find the first yes of a check that never flips. Follow up: why lo plus half the gap? Lo plus hi can overflow.",
    "heads": ["They ask", "You say"],
    "rows": [["How does binary search work?", "Halve a range that holds the answer"], ["How fast?", "O(log n): a million items, 20 steps"], ["What is search on the answer?", "Find the first yes of a monotonic check"], ["Why `lo + (hi - lo) / 2`?", "`lo + hi` can overflow"]],
    "cues": ["How does binary", "How fast", "Search on the answer", "Follow up"]}]},
  {"title": "Recap", "kind": "recap", "scenes": [
   {"type": "compare", "head": "Practice before your interview",
    "say": "Solve these three next. LeetCode thirty five, search insert position, is exactly today's lower bound. LeetCode thirty four, first and last position, runs it twice. LeetCode eight seventy five, Koko eating bananas, is search on the answer with a new check.",
    "heads": ["Solve next", "Why"],
    "rows": [["LeetCode 35 · Search Insert Position", "today's lower bound"], ["LeetCode 34 · Find First and Last Position of Element in Sorted Array", "lower bound, twice"], ["LeetCode 875 · Koko Eating Bananas", "search on the answer"]],
    "cues": ["thirty five", "thirty four", "eight seventy five"]},
   {"type": "take", "say": "So say this. Binary search keeps a range that holds the answer and halves it. One template: lo less than hi, hi becomes mid, lo becomes mid plus one. And when a yes or no check never flips back, search the answer.",
    "lines": ["Keep a range that holds the answer. Halve it.", "`lo < hi`, `hi = mid`, `lo = mid + 1`.", "Monotonic yes/no check? Find the first yes."],
    "cues": ["keeps a range", "one template", "when a yes"]}]}
 ]
}
```
<!-- example:end -->
