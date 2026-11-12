// Usage: node codecheck.mjs lessons/<id>.json | --all     Runs every scene's output.cmd on its panels and compares with output.text.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const BWRAP = fs.existsSync("/usr/bin/bwrap");

const ROOT = "/tmp/claude-1000/codecheck";
const NET = /\b(curl|wget|ssh|scp|docker|psql|mysql|redis-cli|kubectl|nc|telnet)\b|https?:\/\/|git\s+(push|pull|fetch|clone|remote)/;
const trim = (s) => s.split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

// ponytail: extra pip libs (bcrypt, pyjwt) live here; CI installs them to the same path
const LIBS = `${process.env.HOME}/.cache/codecheck-libs`;

function sh(cmd, cwd) {
  // lesson-supplied commands run only inside bubblewrap: no network, read-only fs except the scratch dir
  const r = spawnSync("/usr/bin/bwrap", ["--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--tmpfs", "/tmp", "--bind", cwd, cwd, "--chdir", cwd,
    "--unshare-all", "--die-with-parent", "--new-session", "sh", "-c", cmd], { encoding: "utf8", timeout: 30000, env: { ...process.env, PYTHONPATH: LIBS } });
  if (r.error) return { err: r.error.code === "ETIMEDOUT" ? "timeout after 30s" : String(r.error) };
  return { out: r.stdout, errout: r.stderr, status: r.status };
}

export function checkScene(scene, dir) {
  const { cmd, text } = scene.output;
  if (!cmd) return ["SKIP", "no cmd"];
  if (!BWRAP) return ["SKIP", "no sandbox"];
  if (NET.test(cmd)) return ["SKIP", "needs network/server: " + cmd];
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const notes = [];
  const files = {};
  for (const p of scene.panels || []) {
    if (p.file in files) notes.push(`dup file ${p.file}: last wins`);
    files[p.file] = p.code;
  }
  // output.setup: hidden files; same name as a panel = hidden preamble prepended to that panel, else a standalone file
  const setup = scene.output.setup || {};
  for (const [f, code] of Object.entries(setup)) files[f] = f in files ? code + "\n" + files[f] : code;
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
      run = `g++ -std=c++17 -o ${exe} ${src} && ${run}`;
    }
  } else if (cpp.length && /\bg\+\+/.test(cmd) && cpp.some((f) => !/\bmain\s*\(/.test(files[f])) && cpp.length === 1) return ["SKIP", "no main (fragment)"];
  const sqls = Object.keys(files).filter((f) => f.endsWith(".sql") && !(f in setup)).slice(-1).concat(Object.keys(setup).filter((f) => f.endsWith(".sql")));
  if (/^\s*sqlite3\b/.test(cmd) && !/[<"'|]/.test(cmd) && sqls.length) run = `cat ${[...sqls.slice(1), sqls[0]].join(" ")} | ` + run; // cmd gives only the db: feed setup .sql then the panel .sql
  const r = sh(run, dir);
  if (r.err) return ["FAIL", r.err];
  const exp = trim(text ?? "");
  const looksErr = /error|Traceback|Exception|fatal|warning/i.test(exp);
  const got = trim(r.out + (looksErr || r.status ? (r.out && r.errout ? "\n" : "") + r.errout : ""));
  const pre = exp.endsWith("…") ? exp.slice(0, -1).trimEnd() : null;
  if (scene.output.approx) {
    const sk = (t) => t.replace(/-?\d+(\.\d+)?/g, "#").replace(/[ \t]+/g, " ");
    if (r.status === 0 && sk(got) === sk(exp)) return ["PASS", "approx"];
    return ["FAIL", `approx${r.status ? " exit " + r.status : ""}: numbers/shape differ\nexpected:\n${exp.split("\n").slice(0, 5).join("\n")}\n--- got:\n${got.split("\n").slice(0, 5).join("\n")}`];
  }
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
