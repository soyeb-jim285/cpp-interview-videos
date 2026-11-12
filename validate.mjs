// Usage: node validate.mjs scripts/q16.json [...]   — static checks, no audio needed. Exit 1 on any problem.
import fs from "node:fs";
import { panelFont, boxFont } from "./util.mjs";

let bad = 0;
const err = (f, m) => { bad++; console.log(`${f}: ${m}`); };
const TYPES = new Set(["title", "code", "compare", "diagram", "flow", "take", "hook", "quiz", "chart", "chapter"]);
const SPOKEN_BAN = [/C\+\+/, /std::/, /->/, /::/, /[{}<>;`]/, /\bnullptr\b(?! t)/i, /\bRAII\b/, /\bSTL\b/];

const wordsBefore = (say, cue) => say.slice(0, say.toLowerCase().indexOf(String(cue).toLowerCase())).split(/\s+/).filter(Boolean).length;
// Lesson-only per-scene rules: font floor, cue order, reveal gaps.
function lessonScene(s, sc, at, panels) {
  const area = sc.type === "code" ? { w: 1600, h: sc.output ? 560 : 720, ...sc.area } : { w: 840, h: 700, ...sc.area };
  panels.forEach((p, k) => {
    const px = panelFont(p, (area.w - 40 * (panels.length - 1)) / panels.length, area);
    if (px < 30) err(at, `[font-floor] panel ${k} code font ${px}px < 30px`);
  });
  const items = sc.type === "flow" ? sc.items.map((it) => ({ ...it, w: Math.min(340, (1600 - 70 * (sc.items.length - 1)) / sc.items.length), size: it.size || 34 })) : sc.items || [];
  for (const b of items) {
    if (b.region) continue;
    const vals = [b.text ?? "", ...(sc.changes || []).filter((c) => c.id === b.id && c.text !== undefined).map((c) => c.text), ...(sc.changes || []).filter((c) => c.id === b.id && c.count).map((c) => c.count[1])];
    const px = boxFont(b, vals);
    if (px < 32) err(at, `[font-floor] box ${b.id ?? b.label} font ${px}px < 32px`);
  }
  const named = (a = []) => a.map((x) => (x && typeof x === "object" ? x.cue : x)).filter((c) => typeof c === "string" && sc.say.toLowerCase().includes(c.toLowerCase()));
  // declared-order groups (diagram items/arrows/changes are time-sorted by build, so skipped)
  const groups = [sc.steps, sc.notes, sc.type === "compare" && sc.cues, sc.type === "take" && sc.cues, sc.type === "flow" && sc.items, sc.type === "hook" && sc.lines, sc.bars];
  for (const g of groups) {
    const cs = named(g || []);
    for (let i = 1; i < cs.length; i++) {
      if (sc.say.toLowerCase().indexOf(cs[i].toLowerCase()) < sc.say.toLowerCase().indexOf(cs[i - 1].toLowerCase()))
        err(at, `[cue-order] cue "${cs[i]}" fires before "${cs[i - 1]}"`);
    }
  }
  const all = [sc.steps, sc.notes, sc.cues, sc.items, sc.arrows, sc.changes, sc.lines, sc.bars, sc.output && [sc.output], sc.panels].flatMap((g) => named(g || []));
  if (!all.length) return;
  const n = sc.say.split(/\s+/).length, pos = [...new Set(all.map((c) => wordsBefore(sc.say, c)))].sort((a, b) => a - b);
  [0, ...pos, n].forEach((p, i, a) => { if (i && p - a[i - 1] > 15) err(at, `[gap] ${p - a[i - 1]} words between reveals (max 15, ~6 s)`); });
}

function lessonRules(f, s) {
  const sc = s.scenes || [], first = sc.find((x) => x.type !== "chapter");
  if (first?.type !== "hook") err(f, "[hook-first] first scene after chapter card must be a hook");
  else if (first.say && first.say.split(/\s+/).length > 40) err(f, `[hook-length] hook say is ${first.say.split(/\s+/).length} words (max 40)`);
  const chs = s.chapters.map((c, k) => ({ ...c, sc: sc.slice(c.start, s.chapters[k + 1]?.start ?? sc.length).filter((x) => x.type !== "chapter") }));
  chs.forEach((c) => {
    if ((c.kind || "teach") !== "teach") return;
    if (!c.sc.some((x) => x.type === "quiz")) err(f, `[quiz-per-chapter] chapter "${c.title}" has no quiz`);
    if (new Set(c.sc.map((x) => x.type)).size < 3) err(f, `[type-variety] chapter "${c.title}" needs >= 3 distinct scene types`);
    c.sc.forEach((x, i) => { if (i >= 2 && x.type === c.sc[i - 1].type && x.type === c.sc[i - 2].type) err(f, `[type-repeat] chapter "${c.title}" has 3 consecutive ${x.type} scenes`); });
  });
  const drills = chs.filter((c) => c.kind === "drill");
  if (drills.length !== 1) err(f, `[drill-covers] need exactly one drill chapter, found ${drills.length}`);
  else {
    const got = new Set(drills[0].sc.flatMap((x) => x.covers || []));
    const miss = (s.covers || []).filter((id) => !got.has(id));
    if (miss.length) err(f, `[drill-covers] drill chapter missing covers: ${miss.join(", ")}`);
  }
  const last = chs.at(-1);
  if (last?.kind !== "recap" || last.sc.at(-1)?.type !== "take") err(f, "[recap-last] last chapter must be kind recap ending in a take");
}

for (const f of process.argv.slice(2)) {
  let s;
  try { s = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { err(f, `bad JSON: ${e.message}`); continue; }
  const exp = f.match(/([a-z]+)(\d+)\.json$/);
  if (!s.chapters && !f.startsWith("build/") && (!exp || s.id !== exp[1] + exp[2] || s.num !== +exp[2])) err(f, "id/num must match filename (id 'q16', num 16; or 'be03', num 3)");
  for (const k of ["short", "question", "scenes"]) if (!s[k]) err(f, `missing ${k}`);
  if (!(s.chapters ? ["chapter", "hook"] : ["title"]).includes(s.scenes?.[0]?.type)) err(f, s.chapters ? "first scene must be chapter or hook" : "first scene must be title");
  if (s.scenes?.at(-1)?.type !== "take") err(f, "last scene must be take");
  if (s.chapters) lessonRules(f, s);
  (s.scenes || []).forEach((sc, i) => {
    const at = `${f} scene ${i} (${sc.type})`;
    if (!TYPES.has(sc.type)) return err(at, "unknown type");
    if (sc.type === "chapter") return sc.say === undefined ? undefined : err(at, "chapter card must have no say");
    if (!sc.say) return err(at, "missing say");
    for (const re of SPOKEN_BAN) if (re.test(sc.say)) err(at, `say contains ${re} — write it as spoken words`);
    const words = sc.say.split(/\s+/).length;
    if (s.chapters && words > 90) err(at, `[say-length] say is ${words} words (max 90)`);
    if (!s.chapters && words > 110) err(at, `say is ${words} words; keep scenes under ~100`);
    const cue = (c, what) => {
      if (c === undefined || typeof c === "number") return;
      if (!sc.say.toLowerCase().includes(String(c).toLowerCase())) err(at, `${what} cue "${c}" not found in say`);
    };
    const panels = sc.panels || [];
    const nLines = panels.map((p) => p.code.replace(/\n$/, "").split("\n").length);
    if (s.chapters) lessonScene(s, sc, at, panels);
    panels.forEach((p, k) => {
      const lines = p.code.split("\n");
      if (lines.length > 16) err(at, `panel ${k} has ${lines.length} lines (max 16)`);
      const w = Math.max(...lines.map((l) => l.length));
      if (w > (sc.type === "diagram" ? 52 : panels.length > 1 ? 44 : 78)) err(at, `panel ${k} line width ${w} too wide`);
    });
    for (const st of sc.steps || []) {
      cue(st.cue, "step");
      const k = st.panel ?? 0;
      for (const l of st.lines || []) if (!nLines[k] || l < 1 || l > nLines[k]) err(at, `step line ${l} out of range for panel ${k}`);
    }
    for (const n of sc.notes || []) {
      cue(n.cue, "note");
      if (n.line && (!nLines[n.panel || 0] || n.line > nLines[n.panel || 0])) err(at, `note line ${n.line} out of range`);
      if (!n.line && (n.x === undefined || n.y === undefined)) err(at, "note needs line (code) or x,y (diagram)");
      if ((n.text || "").length > 32) err(at, `note text too long: "${n.text}"`);
    }
    if (sc.output) cue(sc.output.cue, "output");
    if (sc.type === "compare") {
      sc.rows.forEach((r, j) => r.length !== sc.heads.length && err(at, `row ${j} has ${r.length} cells, heads ${sc.heads.length}`));
      if (sc.rowHeads && sc.rowHeads.length !== sc.rows.length) err(at, "rowHeads length != rows length");
      if (sc.rows.length > 7) err(at, "max 7 rows");
      (sc.cues || []).forEach((c) => cue(c, "row"));
    }
    if (sc.type === "take") {
      if (sc.lines.length > 3) err(at, "take: max 3 lines");
      (sc.cues || []).forEach((c) => cue(c, "take"));
    }
    if (sc.type === "flow") {
      if (sc.items.length > 5) err(at, "flow: max 5 items");
      sc.items.forEach((it) => cue(it.cue, "flow item"));
    }
    if (sc.type === "diagram") {
      const ids = new Set((sc.items || []).map((b) => b.id));
      for (const b of sc.items || []) {
        cue(b.cue, `item ${b.id}`);
        if (/^a\d+$/.test(b.id)) err(at, `item id "${b.id}" clashes with arrow ids (a0, a1…)`);
        if (b.x < 100 || b.y < 190 || b.x + b.w > 1820 || b.y + b.h > 920) err(at, `item ${b.id} outside safe area (x 100-1820, y 190-920)`);
        if (panels.length && b.x < (120 + (sc.area?.w ?? 840) + 30)) err(at, `item ${b.id} overlaps code panel (x must be > ${120 + (sc.area?.w ?? 840) + 30})`);
      }
      (sc.arrows || []).forEach((a, j) => {
        cue(a.cue, `arrow ${j}`);
        if (!ids.has(a.from) || !ids.has(a.to)) err(at, `arrow ${j} from/to unknown id`);
      });
      for (const c of sc.changes || []) {
        cue(c.cue, `change ${c.id}`);
        const m = c.id.match(/^a(\d+)$/);
        if (m ? +m[1] >= (sc.arrows || []).length : !ids.has(c.id)) err(at, `change targets unknown id ${c.id}`);
      }
    }
  });
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log("ok");
