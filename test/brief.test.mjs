import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const FX = path.join(ROOT, "test/fixtures/brief-example.json");

test("TEACHING_BRIEF example equals the fixture and passes flatten + validate", () => {
  const md = fs.readFileSync(path.join(ROOT, "TEACHING_BRIEF.md"), "utf8");
  const block = md.match(/<!-- example:start -->\n```json\n([\s\S]*?)\n```\n<!-- example:end -->/)[1];
  assert.deepEqual(JSON.parse(block), JSON.parse(fs.readFileSync(FX, "utf8")));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t5-"));
  fs.mkdirSync(path.join(tmp, "lessons"));
  fs.copyFileSync(FX, path.join(tmp, "lessons/brief-example.json"));
  const run = (f, a) => spawnSync("node", [path.join(ROOT, f), a], { cwd: tmp, encoding: "utf8" });
  assert.equal(run("flatten.mjs", "lessons/brief-example.json").status, 0);
  const v = run("validate.mjs", "build/brief-example.json");
  assert.equal(v.status, 0, v.stdout);
});
