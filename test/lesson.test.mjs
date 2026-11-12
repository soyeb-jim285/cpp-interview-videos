import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t2-"));
fs.mkdirSync(path.join(tmp, "lessons"));
fs.mkdirSync(path.join(tmp, "fx-01/assets/vo"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "test/fixtures/lesson-fx-01.json"), path.join(tmp, "lessons/fx-01.json"));
const run = (f, ...a) => execFileSync("node", [path.join(ROOT, f), ...a], { cwd: tmp });
run("flatten.mjs", "lessons/fx-01.json");
const flat = JSON.parse(fs.readFileSync(path.join(tmp, "build/fx-01.json"), "utf8"));

test("flatten inserts chapter cards and chapters index", () => {
  assert.deepEqual(flat.scenes.map((s) => s.type), ["chapter", "hook", "take", "chapter", "take"]);
  assert.deepEqual(flat.chapters, [{ title: "First", start: 0 }, { title: "Second", start: 3 }]);
  assert.equal(flat.series, "FX"); assert.equal(flat.num, 1); assert.equal(flat.question, "Fixture lesson");
  assert.equal(flat.scenes[3].n, 2);
});

test("lesson id must match filename", () => {
  fs.writeFileSync(path.join(tmp, "lessons/bad-01.json"), JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(tmp, "lessons/fx-01.json"))), id: "zz-01" }));
  assert.throws(() => execFileSync("node", [path.join(ROOT, "flatten.mjs"), "lessons/bad-01.json"], { cwd: tmp, stdio: "pipe" }));
});

test("build writes chapters.txt, increasing, starting 0:00:00", () => {
  // scenes 0..4 -> s0 chapter(no vo) s1 hook s2 take s3 chapter s4 take
  fs.writeFileSync(path.join(tmp, "fx-01/assets/vo/durations.json"), JSON.stringify({ s1: { dur: 5 }, s2: { dur: 4 }, s4: { dur: 3 } }));
  run("build.mjs", "build/fx-01.json");
  const lines = fs.readFileSync(path.join(tmp, "fx-01/chapters.txt"), "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^0:00:00 First$/);
  const secs = lines.map((l) => l.split(" ")[0].split(":").reduce((a, b) => a * 60 + +b, 0));
  assert.ok(secs[1] > secs[0]);
  assert.match(lines[1], /^0:00:\d\d Second$/);
});

test("intro line when a scene precedes chapter 1", () => {
  const s = structuredClone(flat);
  s.id = "fx-02"; s.scenes.unshift({ type: "hook", say: "x", lines: [{ text: "x", cue: "x" }] });
  s.chapters = s.chapters.map((c) => ({ ...c, start: c.start + 1 }));
  fs.mkdirSync(path.join(tmp, "fx-02/assets/vo"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "fx-02/assets/vo/durations.json"), JSON.stringify({ s0: { dur: 2 }, s2: { dur: 5 }, s3: { dur: 4 }, s5: { dur: 3 } }));
  fs.writeFileSync(path.join(tmp, "build/fx-02.json"), JSON.stringify(s));
  run("build.mjs", "build/fx-02.json");
  const lines = fs.readFileSync(path.join(tmp, "fx-02/chapters.txt"), "utf8").trim().split("\n");
  assert.match(lines[0], /^0:00:00 Intro$/);
  assert.equal(lines.length, 3);
});

test("validate accepts flattened lesson and legacy script; flatten rejects no chapters", () => {
  run("validate.mjs", "build/fx-01.json");
  execFileSync("node", [path.join(ROOT, "validate.mjs"), path.join(ROOT, "scripts/q01.json")]);
  fs.writeFileSync(path.join(tmp, "lessons/nc-01.json"), JSON.stringify({ id: "nc-01", track: "X", num: 1, title: "t" }));
  assert.throws(() => execFileSync("node", [path.join(ROOT, "flatten.mjs"), "lessons/nc-01.json"], { cwd: tmp, stdio: "pipe" }));
});
