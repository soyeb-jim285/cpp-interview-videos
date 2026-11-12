// Helper for audit.sh.  node audit/tool.mjs plan <id> <lesson.json> <outdir>   -> times.txt, tiles.json, timeline.md, lesson.json, PACKAGE.md(part)
//                       node audit/tool.mjs sheets <outdir>                    -> sheet-NN.png from frames/ + tiles.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [mode, ...a] = process.argv.slice(2);
const MIN_GAP = 1.5, GAP = 6, PER = 12, fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

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
    for (const r of mine) if (r.t - last >= MIN_GAP) { picks.push({ t: Math.min(r.t + 0.7, end - 0.4), what: r.what }); last = r.t; }
    const ts = [...picks.map((p) => p.t), end];
    const flags = [];
    for (let k = 0; k < picks.length; k++) {
      const next = k + 1 < picks.length ? mine.find((r) => r.t > picks[k].t + 0.5 && r.t - picks[k].t >= MIN_GAP)?.t ?? end : end;
      if (next - picks[k].t > GAP) { const m = (picks[k].t + next) / 2; picks.push({ t: m, what: `mid (gap ${(next - picks[k].t).toFixed(1)}s)` }); flags.push(`GAP ${fmt(picks[k].t)}-${fmt(next)}`); }
    }
    picks.sort((x, y) => x.t - y.t);
    for (const p of picks) tiles.push({ scene: s.i, type: sc.type, t: +p.t.toFixed(2), what: p.what });
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
  const name = (t) => `${out}/frames/at-${String(+t.toFixed(3))}s.png`;
  let n = 0;
  for (let k = 0; k < tiles.length; k += PER) {
    const args = [];
    for (const t of tiles.slice(k, k + PER)) args.push("-label", `S${t.scene} ${t.type} @${t.t}s: ${t.what}`.slice(0, 70), name(t.t));
    const f = `${out}/sheet-${String(++n).padStart(2, "0")}.png`;
    execFileSync("montage", ["-pointsize", "16", "-background", "#222", "-fill", "white", ...args, "-tile", "3x4", "-geometry", "640x360+4+4", f]);
  }
  console.log(`${n} sheets`);
}
