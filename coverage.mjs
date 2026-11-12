// Usage: node coverage.mjs [--syllabus]      every scripts/*.json id covered exactly once (lessons/*.json, else SYLLABUS.md)
//        node coverage.mjs --lesson lessons/<id>.json   that lesson's covers exist and no other lesson/syllabus row claims them
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const universe = new Set(fs.readdirSync("scripts").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)));
const REAL = /^(cpp|dsa|be|swe|fe|ai)-\d+$/; // ponytail: anything else in lessons/ (fx-01, vx-01…) is a test fixture
const lessons = () => (fs.existsSync("lessons") ? fs.readdirSync("lessons") : [])
  .filter((f) => f.endsWith(".json") && REAL.test(f.slice(0, -5)))
  .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join("lessons", f), "utf8")).covers || []]);
const syllabus = () => !fs.existsSync("SYLLABUS.md") ? [] : fs.readFileSync("SYLLABUS.md", "utf8").split("\n")
  .map((l) => l.split("|").map((c) => c.trim()))
  .filter((c) => REAL.test(c[1] || ""))
  .map((c) => [c[1], (c[3] || "").split(",").map((s) => s.trim()).filter(Boolean)]);

const errs = [];
if (args[0] === "--lesson") {
  const f = args[1], own = path.basename(f, ".json");
  const covers = JSON.parse(fs.readFileSync(f, "utf8")).covers || [];
  if (!Array.isArray(covers) || !covers.length) errs.push(`${own}: covers is empty or missing`);
  const others = [...lessons(), ...syllabus()].filter(([id]) => id !== own);
  for (const c of covers) {
    if (!universe.has(c)) errs.push(`unknown id: ${c}`);
    for (const [id, cs] of others) if (cs.includes(c)) errs.push(`${c} already claimed by ${id}`);
  }
  if (new Set(covers).size !== covers.length) errs.push(`duplicate id inside ${own}`);
} else {
  const ls = lessons(), rows = !args.includes("--syllabus") && ls.length ? ls : syllabus();
  const owners = new Map();
  for (const [id, cs] of rows) for (const c of cs) owners.set(c, [...(owners.get(c) || []), id]);
  const missing = [...universe].filter((u) => !owners.has(u)).sort();
  const unknown = [...owners.keys()].filter((c) => !universe.has(c));
  const dups = [...owners].filter(([, o]) => o.length > 1).map(([c, o]) => `${c} (${o.join(", ")})`);
  if (missing.length) errs.push(`missing: ${missing.join(", ")}`);
  if (dups.length) errs.push(`duplicate: ${dups.join(", ")}`);
  if (unknown.length) errs.push(`unknown id: ${unknown.join(", ")}`);
  if (!errs.length) console.log(`coverage ok: ${universe.size} ids, ${rows.length} lessons`);
}
for (const e of errs) console.error(e);
process.exit(errs.length ? 1 : 0);
