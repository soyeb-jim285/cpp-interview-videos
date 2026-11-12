// Usage: node codecheck.mjs lessons/<id>.json | --all     Runs every scene's output.cmd on its panels and compares with output.text.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "/tmp/claude-1000/codecheck";
const NET = /\b(curl|wget|ssh|scp|docker|psql|mysql|redis-cli|kubectl|nc|telnet)\b|https?:\/\/|git\s+(push|pull|fetch|clone|remote)/;
const trim = (s) => s.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

function sh(cmd, cwd) {
  const r = spawnSync("sh", ["-c", cmd], { cwd, encoding: "utf8", timeout: 10000 });
  if (r.error) return { err: r.error.code === "ETIMEDOUT" ? "timeout after 10s" : String(r.error) };
  return { out: r.stdout, errout: r.stderr, status: r.status };
}

export function checkScene(scene, dir) {
  const { cmd, text } = scene.output;
  if (!cmd) return ["SKIP", "no cmd"];
  if (NET.test(cmd)) return ["SKIP", "needs network/server: " + cmd];
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const notes = [];
  const files = {};
  for (const p of scene.panels || []) {
    if (p.file in files) notes.push(`dup file ${p.file}: last wins`);
    files[p.file] = p.code;
  }
  for (const [f, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), code);
  }
  if (/^\s*git\b/.test(cmd)) return ["SKIP", "git needs repo state: " + cmd];
  const tgt = (cmd.match(/^\s*(?:python3?|node|sh|bash)\s+(\S+\.\w+)/) || [])[1];
  if (tgt && !(tgt in files)) return ["SKIP", `${tgt} not among scene panels`];
  const cpp = Object.keys(files).filter((f) => /\.(cpp|cc|cxx)$/.test(f));
  let run = cmd.replace(/\bpython3?\b/g, "python3");
  if (cpp.length && !/\bg\+\+|\bc\+\+/.test(cmd)) {
    const exe = (cmd.match(/^\s*\.\/([\w.-]+)/) || [])[1];
    if (exe) {
      const src = cpp.find((f) => path.basename(f, path.extname(f)) === exe) || cpp[cpp.length - 1];
      if (!/\bmain\s*\(/.test(files[src])) return ["SKIP", `${src} has no main (fragment)`];
      if (cpp.length > 1) notes.push(`compiled ${src}`);
      fs.writeFileSync(path.join(dir, "prelude.h"), "#include <bits/stdc++.h>\nusing namespace std;\n"); // ponytail: snippets assume std; no per-file include check
      run = `g++ -std=c++17 -include prelude.h -o ${exe} ${src} && ${run}`;
    }
  } else if (cpp.length && /\bg\+\+/.test(cmd) && cpp.some((f) => !/\bmain\s*\(/.test(files[f])) && cpp.length === 1) return ["SKIP", "no main (fragment)"];
  const sql = Object.keys(files).filter((f) => f.endsWith(".sql")).pop();
  if (/^\s*sqlite3\b/.test(cmd) && !/[<"'|]/.test(cmd) && sql) run += ` < ${sql}`; // cmd gives only the db: feed the scene's .sql
  const r = sh(run, dir);
  if (r.err) return ["FAIL", r.err];
  const exp = trim(text ?? "");
  const looksErr = /error|Traceback|Exception|fatal|warning/i.test(exp);
  const got = trim(r.out + (looksErr || r.status ? (r.out && r.errout ? "\n" : "") + r.errout : ""));
  const pre = exp.endsWith("…") ? exp.slice(0, -1).trimEnd() : null;
  const ok = pre !== null ? got.startsWith(pre) : got === exp;
  if (ok) return ["PASS", notes.join("; ")];
  const f5 = (s) => s.split("\n").slice(0, 5).join("\n");
  return ["FAIL", `expected:\n${f5(exp)}\n--- got (exit ${r.status}):\n${f5(got)}`];
}

export function checkLesson(file) {
  const id = path.basename(file, ".json");
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  const res = [];
  let n = 0;
  for (const c of lesson.chapters) for (const s of c.scenes) {
    n++;
    if (s.output) res.push({ id: `${id}-s${n}`, ...Object.fromEntries([["st", 0], ["msg", 1]].map(([k, i]) => [k, checkScene(s, path.join(ROOT, `${id}-s${n}`))[i]])) });
  }
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv[2];
  if (!a) { console.error("usage: node codecheck.mjs lessons/<id>.json | --all"); process.exit(2); }
  const files = a === "--all" ? fs.readdirSync("lessons").filter((f) => f.endsWith(".json")).sort().map((f) => "lessons/" + f) : [a];
  const tot = { PASS: 0, FAIL: 0, SKIP: 0 };
  const fails = [];
  for (const f of files) {
    const rs = checkLesson(f);
    const c = { PASS: 0, FAIL: 0, SKIP: 0 };
    for (const r of rs) {
      c[r.st]++; tot[r.st]++;
      if (r.st === "FAIL") fails.push(r.id);
      if (a !== "--all" || r.st === "FAIL") console.log(`${r.st} ${r.id}${r.msg ? "  " + r.msg : ""}`);
    }
    if (a === "--all") console.log(`${path.basename(f, ".json").padEnd(10)} pass ${c.PASS}  fail ${c.FAIL}  skip ${c.SKIP}`);
  }
  console.log(`TOTAL pass ${tot.PASS} fail ${tot.FAIL} skip ${tot.SKIP}`);
  if (fails.length) console.log("FAILS: " + fails.join(" "));
  process.exit(tot.FAIL ? 1 : 0);
}
