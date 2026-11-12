import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t3-"));
fs.mkdirSync(path.join(tmp, "lessons"));
const w = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const good = () => ({
  id: "vx-01", track: "VX", num: 1, title: "Valid lesson", covers: ["a", "b"],
  chapters: [
    { title: "One", scenes: [
      { type: "hook", say: "Why does this crash? Let us find out.", lines: [{ text: "Crash?", cue: "crash" }] },
      { type: "code", say: "Look at this line first, then the second line here.", panels: [{ code: "int x = 1;\nint y = 2;" }], steps: [{ lines: [1], cue: "first" }, { lines: [2], cue: "second" }] },
      { type: "quiz", say: "What prints?", q: "What prints?", options: ["1", "2"], answer: 0 }] },
    { title: "Drill", kind: "drill", scenes: [{ type: "quiz", say: "Quick drill.", q: "Q", options: ["a", "b"], answer: 1, covers: ["a", "b"] }] },
    { title: "Recap", kind: "recap", scenes: [{ type: "take", say: "That is all.", lines: ["done"] }] }],
});
const check = (L) => {
  fs.writeFileSync(path.join(tmp, "lessons/vx-01.json"), JSON.stringify(L));
  const run = (...a) => spawnSync("node", [path.join(ROOT, a[0]), ...a.slice(1)], { cwd: tmp, encoding: "utf8" });
  const fl = run("flatten.mjs", "lessons/vx-01.json");
  assert.equal(fl.status, 0, fl.stderr);
  return run("validate.mjs", "build/vx-01.json");
};
const bad = (rule, mut) => test(`fails ${rule}`, () => {
  const L = good(); mut(L);
  const r = check(L);
  assert.equal(r.status, 1, r.stdout);
  assert.ok(r.stdout.includes(`[${rule}]`), r.stdout);
});

test("good lesson passes", () => { const r = check(good()); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /ok/); });
bad("hook-first", (L) => { L.chapters[0].scenes.shift(); });
bad("hook-length", (L) => { L.chapters[0].scenes[0].say = w(41); });
bad("quiz-per-chapter", (L) => { L.chapters[0].scenes.pop(); });
bad("drill-covers", (L) => { L.chapters[1].scenes[0].covers = ["a"]; });
bad("drill-covers", (L) => { L.chapters[1].kind = "teach"; });
bad("recap-last", (L) => { L.chapters[2].kind = "teach"; });
bad("type-variety", (L) => { L.chapters[0].scenes.splice(1, 1); });
bad("type-repeat", (L) => { const q = L.chapters[0].scenes[2]; L.chapters[0].scenes.push(q, q); });
bad("gap", (L) => { L.chapters[0].scenes[1].say = `first ${w(16)} second`; });
bad("cue-order", (L) => { L.chapters[0].scenes[1].say = "Look at the second line, then the first line here."; });
bad("say-length", (L) => { L.chapters[0].scenes[2].say = w(91); });
bad("font-floor", (L) => { L.chapters[0].scenes[1].panels[0].code = "x".repeat(100) + "\ny"; });
bad("font-floor", (L) => { L.chapters[0].scenes[1].panels[0].code = "x".repeat(76) + "\ny"; });
bad("note-overlap", (L) => { Object.assign(L.chapters[0].scenes[1], { panels: [{ code: "x".repeat(60) + "\ny" }], steps: [], notes: [{ line: 1, inside: true, text: "short note", cue: "first" }] }); });
bad("region-title", (L) => { L.chapters[0].scenes.splice(2, 0, { type: "diagram", say: "Array in a window.", items: [{ id: "w", region: true, label: "WINDOW", x: 300, y: 300, w: 800, h: 300 }, { array: { id: "c", values: [1, 2, 3], x: 340, y: 330, cue: "Array" } }] }); });
bad("drill-covers", (L) => { L.covers = []; });
bad("chapter-kind", (L) => { L.chapters[0].kind = "bogus"; });
bad("gap", (L) => { Object.assign(L.chapters[0].scenes[1], { say: w(16), steps: [{ lines: [1] }] }); });

const miss = (what, mut) => test(`missing ${what} cue fails`, () => {
  const L = good(); mut(L.chapters[0].scenes);
  const r = check(L);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, new RegExp(`${what} cue "nope" not found in say`));
  assert.ok(!r.stdout.includes("[gap]") && !r.stdout.includes("[cue-order]"), r.stdout); // no order/gap noise on a partial cue list
});
miss("optCue", (S) => { S[2].optCue = "nope"; });
miss("hook line 0", (S) => { S[0].lines[0].cue = "nope"; });
miss("bar 0", (S) => { S.push({ type: "chart", say: "Linear is small.", bars: [{ label: "n", value: 1, cue: "nope" }] }); });
miss("panel 0", (S) => { S[1].panels[0].type = true; S[1].panels[0].cue = "nope"; });
miss("subCue", (S) => { S.push({ type: "title", say: "Hello there.", subCue: "nope" }); });
miss("step", (S) => { S[1].steps[0].cue = "nope"; });
bad("cue-count", (L) => { L.chapters[0].scenes.push({ type: "compare", say: "One row. Two rows.", heads: ["a"], rows: [["x"], ["y"]], cues: ["One row"] }); });
bad("macro", (L) => { L.chapters[0].scenes.push({ type: "diagram", say: "A tree.", items: [{ tree: { id: "t", nodes: [[1, 5]], cue: "A tree" } }] }); });

test("legacy scripts still pass", () => {
  const r = spawnSync("node", ["validate.mjs", ...fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".json")).map((f) => "scripts/" + f)], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout);
});
