// Usage: node validate.mjs scripts/q16.json [...]   — static checks, no audio needed. Exit 1 on any problem.
import fs from "node:fs";
import { panelFont, boxFont } from "./util.mjs";
import { expandMacros } from "./scenes-v2.mjs";

let bad = 0;
const err = (f, m) => { bad++; console.log(`${f}: ${m}`); };
const TYPES = new Set(["title", "code", "compare", "diagram", "flow", "take", "hook", "quiz", "chart", "chapter"]);
const SPOKEN_BAN = [/C\+\+/, /std::/, /->/, /::/, /[{}<>;`]/, /\bnullptr\b(?! t)/i, /\bRAII\b/, /\bSTL\b/];

const wordsBefore = (say, cue) => say.slice(0, say.toLowerCase().indexOf(String(cue).toLowerCase())).split(/\s+/).filter(Boolean).length;
// Every string cue in a scene, labelled for error messages (numbers are 0..1 fractions of the voice).
const cueRefs = (sc) => [
  ...(sc.steps || []).map((x) => ["step", x.cue]), ...(sc.notes || []).map((x) => ["note", x.cue]), ["output", sc.output?.cue],
  ...(["compare", "take"].includes(sc.type) ? (sc.cues || []).map((c) => [sc.type === "take" ? "take" : "row", c]) : []),
  ...(sc.items || []).map((b) => [sc.type === "flow" ? "flow item" : `item ${b.id}`, b.cue]),
  ...(sc.arrows || []).map((a, j) => [`arrow ${j}`, a.cue]), ...(sc.changes || []).map((c) => [`change ${c.id}`, c.cue]),
  ...(sc.type === "hook" ? (sc.lines || []).map((l, j) => [`hook line ${j}`, l.cue]) : []),
  ...(sc.bars || []).map((b, j) => [`bar ${j}`, b.cue]), ...(sc.panels || []).map((p, k) => [`panel ${k}`, p.cue]),
  ["optCue", sc.optCue], ["subCue", sc.subCue],
].filter(([, c]) => typeof c === "string");
// Lesson-only per-scene rules: font floor, cue order, reveal gaps.
function lessonScene(s, sc, at, panels, cuesOk) {
  const area = sc.type === "code" ? { w: 1600, h: sc.output ? 560 : 720, ...sc.area } : { w: 840, h: 700, ...sc.area };
  panels.forEach((p, k) => {
    const px = panelFont(p, (area.w - 40 * (panels.length - 1)) / panels.length, area);
    if (px < 32) err(at, `[font-floor] panel ${k} code font ${px}px < 32px`);
  });
  const items = sc.type === "flow" ? sc.items.map((it) => ({ ...it, w: Math.min(340, (1600 - 70 * (sc.items.length - 1)) / sc.items.length), size: it.size || 34 })) : sc.items || [];
  for (const b of items) {
    if (b.region) continue;
    const vals = [b.text ?? "", ...(sc.changes || []).filter((c) => c.id === b.id && c.text !== undefined).map((c) => c.text), ...(sc.changes || []).filter((c) => c.id === b.id && c.count).map((c) => c.count[1])];
    const px = boxFont(b, vals);
    if (px < 32) err(at, `[font-floor] box ${b.id ?? b.label} font ${px}px < 32px`);
  }
  for (const [g, want] of [["rows", sc.type === "compare" && sc.rows], ["lines", sc.type === "take" && sc.lines]])
    if (want && sc.cues && sc.cues.length !== want.length) err(at, `[cue-count] ${sc.cues.length} cues for ${want.length} ${g} (one cue per ${g.slice(0, -1)})`);
  if (!cuesOk) return; // missing cues already reported; order/gap would be computed on a partial list
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
  const n = sc.say.split(/\s+/).length;
  if (!all.length) { if (["code", "diagram", "compare", "flow", "chart"].includes(sc.type) && n > 15) err(at, `[gap] no reveal for ${n} words (max 15)`); return; }
  const pos = [...new Set(all.map((c) => wordsBefore(sc.say, c)))].sort((a, b) => a - b);
  [0, ...pos, n].forEach((p, i, a) => { if (i && p - a[i - 1] > 15) err(at, `[gap] ${p - a[i - 1]} words between reveals (max 15, ~6 s)`); });
}

// Pinned notes must not cover code: inside notes need to start past the end of nearby lines; outside notes must fit in frame.
function noteOverlap(at, sc, panels, n) {
  const a = sc.type === "code" ? { x: 160, w: 1600, h: sc.output ? 560 : 720, ...sc.area } : { x: 120, w: 840, h: 700, ...sc.area };
  const k = n.panel || 0, pw = (a.w - 40 * (panels.length - 1)) / panels.length, x = a.x + k * (pw + 40);
  const fs = Math.max(32, panelFont(panels[k], pw, a)), noteW = (n.text || "").length * 18 + 44;
  const lines = panels[k].code.replace(/\n$/, "").split("\n");
  if (!n.inside) { // ponytail: ignores side:"left"
    if (n.side !== "left" && x + pw + 18 + noteW > 1880) err(at, `[note-overlap] note "${n.text}" runs off the frame; shorten the text, use "inside", or a free-position note`);
    return;
  }
  const end = x + 90 + lines[n.line - 1].length * fs * 0.6;
  if (x + pw - 24 - noteW < end + 12) err(at, `[note-overlap] note "${n.text}" covers code at line ${n.line}; shorten the line or the note, or use a free-position note`);
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
  s.chapters.forEach((c) => { if (!["teach", "drill", "recap"].includes(c.kind)) err(f, `[chapter-kind] chapter "${c.title}" has invalid kind "${c.kind}"`); });
  if (!s.covers?.length) err(f, "[drill-covers] lesson covers is missing or empty");
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
    if (sc.type === "diagram") { // lint what build draws: macro cells c0..cN are real ids
      try { const ex = expandMacros(sc); sc = { ...sc, items: ex.items, arrows: [...(sc.arrows || []), ...ex.arrows] }; } catch (e) { return err(at, `[macro] ${e.message}`); }
    }
    if (!TYPES.has(sc.type)) return err(at, "unknown type");
    if (sc.type === "chapter") return sc.say === undefined ? undefined : err(at, "chapter card must have no say");
    if (!sc.say) return err(at, "missing say");
    for (const re of SPOKEN_BAN) if (re.test(sc.say)) err(at, `say contains ${re} — write it as spoken words`);
    const words = sc.say.split(/\s+/).length;
    if (s.chapters && words > 90) err(at, `[say-length] say is ${words} words (max 90)`);
    if (!s.chapters && words > 110) err(at, `say is ${words} words; keep scenes under ~100`);
    const missing = cueRefs(sc).filter(([, c]) => !sc.say.toLowerCase().includes(c.toLowerCase()));
    for (const [what, c] of missing) err(at, `${what} cue "${c}" not found in say`);
    const panels = sc.panels || [];
    const nLines = panels.map((p) => p.code.replace(/\n$/, "").split("\n").length);
    if (s.chapters) lessonScene(s, sc, at, panels, !missing.length);
    panels.forEach((p, k) => {
      const lines = p.code.split("\n");
      if (lines.length > 16) err(at, `panel ${k} has ${lines.length} lines (max 16)`);
      const w = Math.max(...lines.map((l) => l.length));
      if (w > (sc.type === "diagram" ? 52 : panels.length > 1 ? 44 : 78)) err(at, `panel ${k} line width ${w} too wide`);
    });
    for (const st of sc.steps || []) {
      const k = st.panel ?? 0;
      for (const l of st.lines || []) if (!nLines[k] || l < 1 || l > nLines[k]) err(at, `step line ${l} out of range for panel ${k}`);
    }
    for (const n of sc.notes || []) {
      if (s.chapters && n.line && panels[n.panel || 0]) noteOverlap(at, sc, panels, n);
      if (n.line && (!nLines[n.panel || 0] || n.line > nLines[n.panel || 0])) err(at, `note line ${n.line} out of range`);
      if (!n.line && (n.x === undefined || n.y === undefined)) err(at, "note needs line (code) or x,y (diagram)");
      if ((n.text || "").length > 32) err(at, `note text too long: "${n.text}"`);
    }
    if (sc.type === "compare") {
      sc.rows.forEach((r, j) => r.length !== sc.heads.length && err(at, `row ${j} has ${r.length} cells, heads ${sc.heads.length}`));
      if (sc.rowHeads && sc.rowHeads.length !== sc.rows.length) err(at, "rowHeads length != rows length");
      if (sc.rows.length > 7) err(at, "max 7 rows");
    }
    if (sc.type === "take") {
      if (sc.lines.length > 3) err(at, "take: max 3 lines");
    }
    if (sc.type === "flow") {
      if (sc.items.length > 5) err(at, "flow: max 5 items");
    }
    if (sc.type === "diagram") {
      const ids = new Set((sc.items || []).map((b) => b.id));
      for (const b of sc.items || []) {
        if (/^a\d+$/.test(b.id)) err(at, `item id "${b.id}" clashes with arrow ids (a0, a1…)`);
        if (b.x < 100 || b.y < 190 || b.x + b.w > 1820 || b.y + b.h > 920) err(at, `item ${b.id} outside safe area (x 100-1820, y 190-920)`);
        if (panels.length && b.x < (120 + (sc.area?.w ?? 840) + 30)) err(at, `item ${b.id} overlaps code panel (x must be > ${120 + (sc.area?.w ?? 840) + 30})`);
      }
      (sc.arrows || []).forEach((a, j) => {
        if (!ids.has(a.from) || !ids.has(a.to)) err(at, `arrow ${j} from/to unknown id`);
      });
      for (const c of sc.changes || []) {
        const m = c.id.match(/^a(\d+)$/);
        if (m ? +m[1] >= (sc.arrows || []).length : !ids.has(c.id)) err(at, `change targets unknown id ${c.id}`);
      }
    }
  });
}
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log("ok");
