import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const FX = path.join(ROOT, "test/fixtures");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t1-"));
fs.mkdirSync(path.join(tmp, "t1fx/assets/vo"), { recursive: true });
fs.copyFileSync(path.join(FX, "durations.json"), path.join(tmp, "t1fx/assets/vo/durations.json"));
execFileSync("node", [path.join(ROOT, "build.mjs"), path.join(FX, "all-primitives.json")], { cwd: tmp });
const html = fs.readFileSync(path.join(tmp, "t1fx/index.html"), "utf8");
const tpl = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const sec = (i) => html.match(new RegExp(`<section id="s${i}"[^>]*>`))[0];
const attr = (s, a) => Number(s.match(new RegExp(`${a}="([\\d.]+)"`))[1]);

test("diagram: stage zoom, pulse path, glow, move", () => {
  assert.match(html, /id="s2-stage"/);
  assert.match(html, /id="s2-a0-q"/);
  assert.match(html, /tl\.to\("#s2-win",\{x:670/); // move [900,760] from x=330
  assert.match(html, /boxShadow:"0 0 46px/);
});

test("count change tweens innerText with snap", () => {
  assert.match(html, /fromTo\("#s2-sum-v0",\{innerText:0\},\{innerText:8[^}]*snap:\{innerText:1\}/);
});

test("notesHtml returns pinned + free", () => {
  const src = fs.readFileSync(path.join(ROOT, "build.mjs"), "utf8") + fs.readFileSync(path.join(ROOT, "scenes-v2.mjs"), "utf8");
  assert.match(src, /pinned: html, free, tw/);
});

test("macros expand to ids id0..idN with arrows", () => {
  for (const id of ["arr0", "arr4", "tr0", "tr4", "ls0", "ls2", "st0", "st2"]) assert.match(html, new RegExp(`id="s[234]-${id}"`));
  assert.match(html, /id="s3-a3-q"/); // 4 tree edges -> a0..a3
  assert.match(html, /id="s4-a1-q"/); // list: 2 edges
});

test("hook: N lines, accent word", () => {
  assert.equal((html.match(/class="hl"/g) || []).length, 3);
  assert.match(html, /<em>Slide<\/em> it\./);
  assert.match(html, /class="hook"/);
});

test("chapter: no audio, no captions, 2.5s", () => {
  assert.equal(attr(sec(1), "data-duration"), 2.5);
  assert.doesNotMatch(html, /id="vo1"/);
  assert.doesNotMatch(html, /id="cap1-/);
  assert.match(html, /class="chap"/);
});

test("quiz: countdown ring, duration includes pause", () => {
  assert.match(html, /class="quiz"/);
  assert.match(html, /class="ring"/);
  assert.match(html, /id="s7-cd-fg"/);
  assert.equal(attr(sec(7), "data-duration"), 0.45 + 4 + 3 + 3);
  assert.equal((html.match(/class="cn"/g) || []).length, 3);
});

test("chart: bars grow, labels count", () => {
  assert.equal((html.match(/class="cb /g) || []).length, 3);
  assert.match(html, /fromTo\("#s5-b2-n",\{innerText:0\},\{innerText:1000/);
  assert.match(html, /fromTo\("#s5-b2",\{height:0\}/);
});

test("code type:true types lines with a caret", () => {
  assert.match(html, /class="tx"/);
  assert.match(html, /id="s6-p0-c"/);
  assert.match(html, /steps\(/);
});

test("background grid + dual radial", () => {
  assert.match(tpl, /#bgfx\{[^}]*linear-gradient[^}]*radial-gradient[^}]*radial-gradient/);
});

test("no nondeterminism", () => {
  assert.doesNotMatch(html.split("<script>").pop(), /Math\.random|setTimeout|repeat:-1/);
});

test("every tween time >= its scene t0", () => {
  const body = html.split("<script>").pop();
  const chunks = body.split(/\/\/ (s\d+) t0=([\d.]+)\n/).slice(1);
  assert.ok(chunks.length >= 27);
  for (let i = 0; i < chunks.length; i += 3) {
    const t0 = Number(chunks[i + 1]), part = chunks[i + 2].split("// global")[0];
    const times = [...part.matchAll(/,(-?\d+(?:\.\d+)?)\);/g)].map((m) => Number(m[1]));
    assert.ok(times.length);
    for (const t of times) assert.ok(t >= t0 - 1e-6, `${chunks[i]}: ${t} < ${t0}`);
  }
});

test("all on-screen text styles >= 32px (chip exempt)", () => {
  const css = tpl.match(/<style>([\s\S]*?)<\/style>/)[1];
  const bad = [];
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/^\s*\.chip\b/.test(sel)) continue;
    for (const m of body.matchAll(/font:[^;]*?(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 32) bad.push(`${sel.trim()} ${m[1]}`);
    for (const m of body.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 32) bad.push(`${sel.trim()} ${m[1]}`);
  }
  assert.deepEqual(bad, []);
});

test("chart labels/readouts fade in at their bar's cue", () => {
  for (let i = 0; i < 3; i++) {
    const m = html.match(new RegExp(`fromTo\\("#s5-b${i}-v,#s5-x${i}",\\{opacity:0\\},\\{opacity:1,duration:0.4\\},([\\d.]+)\\)`));
    const g = html.match(new RegExp(`fromTo\\("#s5-b${i}",\\{height:0\\},\\{[^}]*\\},([\\d.]+)\\)`));
    assert.ok(m && g && m[1] === g[1], `bar ${i}`);
  }
});

test("auto-zoom bbox includes move targets and stays above captions", () => {
  const m = html.match(/fromTo\("#s2-stage",[^;]*?scale:([\d.]+),transformOrigin[^;]*?\{x:([\d.-]+),y:([\d.-]+),scale:([\d.]+)/);
  const [k, tx, ty] = [m[4], m[2], m[3]].map(Number);
  // moved window box bottom (y=900+100) in screen space
  assert.ok(ty + 1000 * k <= 930, `bottom ${ty + 1000 * k}`);
});
