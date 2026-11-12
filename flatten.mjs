// Usage: node flatten.mjs lessons/dsa-03.json  -> build/dsa-03.json (flat legacy-shaped script)
import fs from "node:fs";
import path from "node:path";

const f = process.argv[2];
const L = JSON.parse(fs.readFileSync(f, "utf8"));
const stem = path.basename(f, ".json");
if (L.id !== stem) { console.error(`${f}: id '${L.id}' must equal filename '${stem}'`); process.exit(1); }
if (!Array.isArray(L.chapters) || !L.chapters.length) { console.error(`${f}: lesson needs a non-empty "chapters" array`); process.exit(1); }
const scenes = [], chapters = [];
L.chapters.forEach((c, k) => {
  chapters.push({ title: c.title, start: scenes.length });
  scenes.push({ type: "chapter", n: k + 1, title: c.title }, ...c.scenes);
});
const out = { id: L.id, num: L.num, series: L.track, short: L.title, question: L.title, caps: L.caps, voice: L.voice, speed: L.speed, chapters, scenes };
fs.mkdirSync("build", { recursive: true });
fs.writeFileSync(`build/${L.id}.json`, JSON.stringify(out, null, 1));
console.log(`build/${L.id}.json: ${chapters.length} chapters, ${scenes.length} scenes`);
