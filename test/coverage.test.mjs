import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
// Fresh temp project: scripts/{a,b,c}.json, optional SYLLABUS.md and lessons.
const proj = ({ syllabus, lessons = {} }) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cov-"));
  fs.mkdirSync(path.join(d, "scripts")); fs.mkdirSync(path.join(d, "lessons"));
  for (const id of ["a", "b", "c"]) fs.writeFileSync(path.join(d, `scripts/${id}.json`), "{}");
  if (syllabus) fs.writeFileSync(path.join(d, "SYLLABUS.md"),
    "| id | title | covers | hook idea | central worked example |\n|---|---|---|---|---|\n" +
    syllabus.map(([id, c]) => `| ${id} | T | ${c} | h | e |`).join("\n") + "\n");
  for (const [id, covers] of Object.entries(lessons)) fs.writeFileSync(path.join(d, `lessons/${id}.json`), JSON.stringify({ id, covers }));
  const run = (...args) => spawnSync("node", [path.join(ROOT, "coverage.mjs"), ...args], { cwd: d, encoding: "utf8" });
  run.dir = d;
  return run;
};
const out = (r) => r.stdout + r.stderr;

test("syllabus covering every id once passes", () => {
  const r = proj({ syllabus: [["dsa-01", "a, b"], ["be-01", "c"]] })();
  assert.equal(r.status, 0, out(r));
});
test("missing id fails and is listed", () => {
  const r = proj({ syllabus: [["dsa-01", "a, b"]] })("--syllabus");
  assert.equal(r.status, 1); assert.match(out(r), /missing.*\bc\b/i);
});
test("duplicate id fails and is listed", () => {
  const r = proj({ syllabus: [["dsa-01", "a, b"], ["be-01", "b, c"]] })();
  assert.equal(r.status, 1); assert.match(out(r), /duplicate.*\bb\b/i);
});
test("unknown id fails", () => {
  const r = proj({ syllabus: [["dsa-01", "a, b, c, zz"]] })();
  assert.equal(r.status, 1); assert.match(out(r), /unknown.*zz/i);
});
test("lesson files take precedence over syllabus; fixtures ignored", () => {
  const run = proj({ syllabus: [["dsa-01", "a"]], lessons: { "dsa-01": ["a", "b"], "be-01": ["c"], "fx-01": ["a"] } });
  assert.equal(run().status, 0, out(run()));
  assert.equal(run("--syllabus").status, 1);
});
test("--lesson: own covers ok even when the matching syllabus row claims them", () => {
  const r = proj({ syllabus: [["dsa-01", "a, b"], ["be-01", "c"]], lessons: { "dsa-01": ["a", "b"] } })("--lesson", "lessons/dsa-01.json");
  assert.equal(r.status, 0, out(r));
});
test("--lesson: id claimed by another lesson fails", () => {
  const r = proj({ lessons: { "dsa-01": ["a", "b"], "be-01": ["b"] } })("--lesson", "lessons/dsa-01.json");
  assert.equal(r.status, 1); assert.match(out(r), /\bb\b.*be-01/);
});
test("--lesson: id claimed by a different syllabus row fails", () => {
  const r = proj({ syllabus: [["dsa-01", "a"], ["be-01", "b, c"]], lessons: { "dsa-01": ["a", "b"] } })("--lesson", "lessons/dsa-01.json");
  assert.equal(r.status, 1); assert.match(out(r), /\bb\b.*be-01/);
});
test("--lesson: unknown id fails", () => {
  const r = proj({ lessons: { "dsa-01": ["a", "nope"] } })("--lesson", "lessons/dsa-01.json");
  assert.equal(r.status, 1); assert.match(out(r), /unknown.*nope/i);
});
test("--lesson: empty or missing covers fails", () => {
  for (const covers of [[], undefined]) {
    const r = proj({ lessons: { "dsa-01": covers } })("--lesson", "lessons/dsa-01.json");
    assert.equal(r.status, 1, out(r)); assert.match(out(r), /empty or missing/);
  }
});
test("short syllabus row (no covers column) does not crash", () => {
  const run = proj({ syllabus: [["dsa-01", "a, b, c"]] });
  fs.appendFileSync(path.join(run.dir, "SYLLABUS.md"), "| be-01 | T\n");
  const r = run("--syllabus"); assert.equal(r.status, 0, out(r)); assert.doesNotMatch(out(r), /TypeError/);
});
