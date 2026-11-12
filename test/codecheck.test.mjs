import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const run = (n) => spawnSync("node", ["codecheck.mjs", `test/fixtures/codecheck-${n}.json`], { cwd: ROOT, encoding: "utf8" });

test("codecheck passes matching output", () => {
  const r = run("pass");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /PASS/);
});

test("codecheck fails wrong output", () => {
  const r = run("fail");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL[\s\S]*expected:\n22[\s\S]*got[\s\S]*21/);
});

test("setup prepends to panel; approx tolerates number changes", async () => {
  const { checkScene } = await import("../codecheck.mjs");
  const sc = (o) => ({ panels: [{ file: "a.py", code: "print(f(2), 0.5)" }], output: { cmd: "python a.py", ...o } });
  assert.equal(checkScene(sc({ text: "4 0.5", setup: { "a.py": "f=lambda x:x*x" } }), "/tmp/claude-1000/codecheck/t1")[0], "PASS");
  assert.equal(checkScene(sc({ text: "4 0.9", approx: true, setup: { "a.py": "f=lambda x:x*x" } }), "/tmp/claude-1000/codecheck/t2")[0], "PASS");
  assert.equal(checkScene(sc({ text: "4 0.9", approx: true }), "/tmp/claude-1000/codecheck/t3")[0], "FAIL");
});
