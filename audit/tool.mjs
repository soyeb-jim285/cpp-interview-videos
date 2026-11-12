// Helper for audit.sh.  node audit/tool.mjs plan <id> <lesson.json> <outdir>   -> times.txt, tiles.json, timeline.md, lesson.json, PACKAGE.md(part)
//                       node audit/tool.mjs sheets <outdir>                    -> sheet-NN.png from frames/ + tiles.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [mode, ...a] = process.argv.slice(2);
const MIN_GAP = 1.5, GAP = 6, PER = 12, fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

// "p0 .ln, p0-l3, a1-p" -> "code, line 3, arrow"
const nice = (w) => [...new Set(w.split(", ").map((x) => x.replace(/^p\d+-l(\d+)$/, "line $1").replace(/^p\d+( \.ln)?$/, "code").replace(/^a\d+(-\w)?$/, "arrow").replace(/^f(\d+)$/, "step $1").replace(/^cmp \.r(\d+)$/, "row $1").replace(/^cmp \.ch$/, "headers").replace(/^(cn|cd)(-fg)?(\d*)$/, "countdown").replace(/^qz \.opt$/, "options").replace(/^qq$/, "question").replace(/^out( \.ol)?$/, "output")))].join(", ");
if (mode === "plan") {
  const [id, lesson, out] = a;
  const spec = JSON.parse(fs.readFileSync(`build/${id}.json`, "utf8"));
  const rv = JSON.parse(fs.readFileSync(`${id}/reveals.json`, "utf8"));
  const html = fs.readFileSync(`${id}/index.html`, "utf8");
  const secs = [...html.matchAll(/<section id="s(\d+)"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((m) => ({ i: +m[1], t0: +m[2], d: +m[3] }));
  const tiles = [];
  let md = `# Timeline: ${id}\n\nGaps > ${GAP}s between reveals are flagged with GAP (a mid-frame tile is added).\n\n| # | type | start | dur | say | reveals (time: what) |\n|---|---|---|---|---|---|\n`;
  for (const s of secs) {
    const sc = spec.scenes[s.i], end = s.t0 + s.d;
    const mine = rv.filter((r) => r.scene === s.i);
    let last = -9;
    const picks = [];
    for (const r of mine) if (r.t - last >= MIN_GAP) { picks.push({ r: r.t, what: r.what }); last = r.t; }
    const flags = [], extra = [];
    picks.forEach((p, k) => {
      const next = picks[k + 1]?.r ?? end;
      if (next - p.r > GAP) { extra.push({ r: (p.r + next) / 2 - 0.7, what: `mid (gap ${(next - p.r).toFixed(1)}s)` }); flags.push(`GAP ${fmt(p.r)}-${fmt(next)}`); }
    });
    picks.push(...extra);
    picks.sort((x, y) => x.r - y.r);
    for (const p of picks) p.t = Math.min(p.r + 0.7, end - 0.4);
    for (const p of picks) tiles.push({ scene: s.i, type: sc.type, t: +p.t.toFixed(2), what: nice(p.what) });
    const say = (sc.say ?? sc.title ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    md += `| ${s.i} | ${sc.type} | ${fmt(s.t0)} | ${s.d.toFixed(1)}s | ${say} | ${mine.map((r) => `${r.t.toFixed(1)}: ${r.what}`).join("; ")}${flags.length ? " **" + flags.join(", ") + "**" : ""} |\n`;
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/timeline.md`, md);
  fs.writeFileSync(`${out}/tiles.json`, JSON.stringify(tiles, null, 1));
  fs.writeFileSync(`${out}/times.txt`, tiles.map((t) => t.t).join(","));
  fs.copyFileSync(lesson, `${out}/lesson.json`);
  console.log(`${tiles.length} tiles`);
} else if (mode === "sheets") {
  const [out] = a;
  const tiles = JSON.parse(fs.readFileSync(`${out}/tiles.json`, "utf8"));
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const name = (t) => `${out}/frames/at-${String(+t.toFixed(3))}s.png`;
  let n = 0;
  for (let k = 0; k < tiles.length; k += PER) {
    const args = [];
    for (const t of tiles.slice(k, k + PER)) args.push("-label", `s${t.scene} ${t.type} · ${mmss(t.t)} · ${t.what}`.slice(0, 64), name(t.t));
    const f = `${out}/sheet-${String(++n).padStart(2, "0")}.png`;
    execFileSync("montage", ["-pointsize", "16", "-background", "#222", "-fill", "white", ...args, "-tile", "3x4", "-geometry", "640x360+4+4", f]);
  }
  console.log(`${n} sheets`);
}
