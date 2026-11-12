import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { codeLayout, tableFit, arrowGeo } from "../util.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t6-"));
fs.mkdirSync(path.join(tmp, "lessons"));
fs.copyFileSync(path.join(ROOT, "test/fixtures/brief-example.json"), path.join(tmp, "lessons/brief-example.json"));
execFileSync("node", [path.join(ROOT, "flatten.mjs"), "lessons/brief-example.json"], { cwd: tmp });
const flat = JSON.parse(fs.readFileSync(path.join(tmp, "build/brief-example.json"), "utf8"));
// lint output for the fixture lesson with `sc` inserted as scene 3
const lint = (sc) => {
  fs.writeFileSync(path.join(tmp, "build/x.json"), JSON.stringify({ ...flat, scenes: [...flat.scenes.slice(0, 3), sc, ...flat.scenes.slice(3)] }));
  const r = spawnSync("node", [path.join(ROOT, "validate.mjs"), "build/x.json"], { cwd: tmp, encoding: "utf8" });
  return r.stdout + r.stderr;
};
const say = "alpha beta gamma";

test("few-line code panel stays at the 46 px cap and is centered in the band", () => {
  const L = codeLayout({ type: "code", panels: [{ code: "a = 1\nb = 2\nprint(a + b)\n" }] });
  assert.equal(L.fonts[0], 46);
  const h = 3 * Math.round(46 * 1.55) + 96;
  assert.equal(L.area.y, 190 + (710 - h) / 2);
  assert.equal(codeLayout({ type: "code", panels: [{ code: "x" }], area: { y: 200 } }).area.y, 200);
});

test("compare: 7 long rows shrink to fit; impossible tables fail [table-fit]", () => {
  const rows = (n, t) => Array.from({ length: n }, () => [t, t]);
  const ok = tableFit({ heads: ["A", "B"], rows: rows(6, "short") });
  assert.ok(ok.ok && ok.total <= 710);
  assert.ok(!tableFit({ heads: ["A", "B"], rows: rows(7, "x ".repeat(80)) }).ok);
  assert.match(lint({ type: "compare", say, heads: ["A", "B"], rows: rows(7, "x ".repeat(80)) }), /\[table-fit\]/);
  assert.doesNotMatch(lint({ type: "compare", say, heads: ["A", "B"], rows: rows(3, "short") }), /\[table-fit\]/);
});

const box = (id, x, y) => ({ id, x, y, w: 200, h: 120, text: "v", cue: "alpha" });
test("diagram: note running off the right edge fails [offscreen]", () => {
  const d = (x) => ({ type: "diagram", say, noZoom: true, items: [box("a", 200, 400)], notes: [{ x, y: 300, text: "fresh? read from the primary", cue: "beta" }] });
  assert.match(lint(d(1500)), /\[offscreen\] note "fresh\? read from the primary" ends at x=\d+ \(max 1840\)/);
  assert.doesNotMatch(lint(d(300)), /\[offscreen\]/);
});

test("diagram: arrow labels that collide fail [label-overlap]", () => {
  const items = [box("a", 300, 400), box("b", 700, 400), box("c", 700, 700)];
  const arrows = (l) => [{ from: "a", to: "b", label: l, cue: "alpha" }, { from: "a", to: "b", label: l, cue: "beta" }];
  assert.match(lint({ type: "diagram", say, items, arrows: arrows("reads the thing") }), /\[label-overlap\]/);
  assert.doesNotMatch(lint({ type: "diagram", say, items, arrows: [{ from: "a", to: "b", label: "ok", cue: "alpha" }] }), /\[label-overlap\]/);
  assert.ok(arrowGeo({ label: "x" }, items[0], items[1]).lab.w > 0);
});

test("legacy scripts keep passing without the new rules", () => {
  const r = spawnSync("node", ["validate.mjs", ...fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".json")).map((f) => `scripts/${f}`)], { cwd: ROOT, encoding: "utf8" });
  assert.match(r.stdout, /^ok/m);
});
