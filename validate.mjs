// Usage: node validate.mjs scripts/q16.json [...]   — static checks, no audio needed. Exit 1 on any problem.
import fs from "node:fs";

let bad = 0;
const err = (f, m) => { bad++; console.log(`${f}: ${m}`); };
const TYPES = new Set(["title", "code", "compare", "diagram", "flow", "take"]);
const SPOKEN_BAN = [/C\+\+/, /std::/, /->/, /::/, /[{}<>;`]/, /\bnullptr\b(?! t)/i, /\bRAII\b/, /\bSTL\b/];

for (const f of process.argv.slice(2)) {
  let s;
  try { s = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { err(f, `bad JSON: ${e.message}`); continue; }
  const exp = f.match(/q(\d+)\.json$/);
  if (!exp || s.id !== `q${exp[1]}` || s.num !== +exp[1]) err(f, "id/num must match filename (id 'q16', num 16)");
  for (const k of ["short", "question", "scenes"]) if (!s[k]) err(f, `missing ${k}`);
  if (s.scenes?.[0]?.type !== "title") err(f, "first scene must be title");
  if (s.scenes?.at(-1)?.type !== "take") err(f, "last scene must be take");
  (s.scenes || []).forEach((sc, i) => {
    const at = `${f} scene ${i} (${sc.type})`;
    if (!TYPES.has(sc.type)) return err(at, "unknown type");
    if (!sc.say) return err(at, "missing say");
    for (const re of SPOKEN_BAN) if (re.test(sc.say)) err(at, `say contains ${re} — write it as spoken words`);
    const words = sc.say.split(/\s+/).length;
    if (words > 110) err(at, `say is ${words} words; keep scenes under ~100`);
    const cue = (c, what) => {
      if (c === undefined || typeof c === "number") return;
      if (!sc.say.toLowerCase().includes(String(c).toLowerCase())) err(at, `${what} cue "${c}" not found in say`);
    };
    const panels = sc.panels || [];
    const nLines = panels.map((p) => p.code.replace(/\n$/, "").split("\n").length);
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
