// Usage: node build.mjs scripts/q01.json [...]
// Reads a question spec + qNN/assets/vo/durations.json (from tts.py), writes qNN/index.html.
import fs from "node:fs";
import path from "node:path";

const SFX = new URL("./sfx", import.meta.url).pathname;
import { LEAD, TAIL, esc, r3, hlInline, cueTime, panelFont, boxFont } from "./util.mjs";
import { sceneHook, sceneQuiz, sceneChapter, sceneChart, expandMacros } from "./scenes-v2.mjs";

const SFXLEN = { "click.mp3": 0.37, "click-soft.mp3": 0.37, "error.mp3": 1.62, "key-press.mp3": 0.4, "pop.mp3": 0.72, "sparkle.mp3": 1.8, "whoosh.mp3": 0.57, "whoosh-short.mp3": 0.57 };

// ---------- tiny highlighter (language from panel file extension) ----------
const KWS = {
  cpp: "alignas auto bool break case catch char class const constexpr const_cast continue decltype default delete do double dynamic_cast else enum explicit extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register reinterpret_cast return short signed sizeof static static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while size_t std NULL",
  py: "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return self True try while with yield int str list dict set len range print",
  js: "async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof interface let new null of return static super switch this throw true try type typeof undefined var void while yield string number boolean any unknown never readonly keyof as implements enum",
  java: "abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch synchronized this throw throws true false try void volatile while var String",
  sql: "SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX PRIMARY KEY FOREIGN REFERENCES BEGIN COMMIT ROLLBACK AND OR NOT NULL AS DISTINCT COUNT SUM AVG MAX MIN IN EXISTS UNIQUE TRANSACTION ISOLATION LEVEL FOR EXPLAIN",
  sh: "if then else fi for do done while case esac function export echo cd sudo",
  go: "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false error string int",
  css: "display flex grid block none auto important",
  rs: "as async await break const continue crate else enum false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while Some None Ok Err",
};
const LANG = { cpp: "cpp", cc: "cpp", h: "cpp", hpp: "cpp", c: "cpp", py: "py", js: "js", jsx: "js", ts: "js", tsx: "js", mjs: "js", java: "java", kt: "java", sql: "sql", sh: "sh", bash: "sh", txt: "txt", yml: "sh", yaml: "sh", go: "go", rs: "rs", css: "css", md: "txt" };
const KWSET = Object.fromEntries(Object.entries(KWS).map(([k, v]) => [k, new Set(v.split(" "))]));
const HASH_COMMENT = new Set(["py", "sh"]);
function hl(line, lang = "cpp") {
  const com = HASH_COMMENT.has(lang) ? "#.*$" : lang === "sql" ? "--.*$" : lang === "css" ? "\\/\\*.*?\\*\\/" : "\\/\\/.*$";
  const pre = lang === "cpp" ? "#\\s*\\w+" : "(?!)";
  const re = new RegExp(`(${com})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\`)|(${pre})|(\\b\\d+(?:\\.\\d+)?[fFuUlL]*\\b)|([A-Za-z_]\\w*)|(\\s+)|(.)`, "g");
  const KW = KWSET[lang] || new Set();
  let out = "", m;
  while ((m = re.exec(line))) {
    const [t, c, str, p, num, id, ws] = m;
    if (c) out += `<i class="c">${esc(c)}</i>`;
    else if (str) out += `<i class="s">${esc(str)}</i>`;
    else if (p) out += `<i class="p">${esc(p)}</i>`;
    else if (num) out += `<i class="n">${esc(num)}</i>`;
    else if (id) out += KW.has(lang === "sql" ? id.toUpperCase() : id) ? `<i class="k">${id}</i>` : /^[A-Z]/.test(id) ? `<i class="t">${id}</i>` : esc(id);
    else if (ws) out += ws;
    else out += esc(t);
  }
  return out || " ";
}
const langOf = (file) => LANG[(file || "main.cpp").split(".").pop().toLowerCase()] || "cpp";

// ---------- scene renderers: return {html, tw:[js lines], sfx:[{t,file,vol}]} ----------
function codePanels(sc, sid, panels, area) {
  let html = "", tw = [];
  const gap = 40, n = panels.length;
  const pw = (area.w - gap * (n - 1)) / n;
  panels.forEach((p, k) => {
    const lines = p.code.replace(/\n$/, "").split("\n");
    const fs_ = Math.max(32, panelFont(p, pw, area));
    const lh = Math.round(fs_ * 1.55);
    const h = lines.length * lh + 96;
    const x = area.x + k * (pw + gap);
    const pid = `${sid}-p${k}`;
    html += `<div class="panel" id="${pid}" style="left:${x}px;top:${area.y}px;width:${pw}px;height:${h}px">
<div class="bar" data-layout-ignore><b></b><b></b><b></b><span>${esc(p.file || "main.cpp")}</span>${p.label ? `<em class="tag ${p.tone || ""}">${esc(p.label)}</em>` : ""}</div>
<pre style="font-size:${fs_}px;line-height:${lh}px">${lines.map((l, j) => `<div class="ln" id="${pid}-l${j + 1}"><u>${j + 1}</u>${p.type ? `<span class="tx">${hl(l, langOf(p.file))}</span>` : hl(l, langOf(p.file))}</div>`).join("")}${p.type ? `<div class="caret" id="${pid}-c" style="height:${lh - 8}px"></div>` : ""}</pre></div>`;
    tw.push(`tl.fromTo("#${pid}",{opacity:0,y:30},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${r3(sc.t0 + 0.1 + k * 0.15)});`);
    p._geo = { x, y: area.y, w: pw, h, lh, top: area.y + 48 + 24, n: lines.length, pid };
    if (p.type) { // typewriter: clip each line open in char steps, caret follows
      let ts = Math.max(sc.t0 + 0.3 + k * 0.15, p.cue !== undefined ? cueTime(sc, p.cue) : 0);
      const cw = fs_ * 0.6;
      lines.forEach((l, j) => {
        if (!l.length) return;
        const d = Math.min(0.6, Math.max(0.12, l.length * 0.025));
        tw.push(`tl.fromTo("#${pid}-l${j + 1} .tx",{clipPath:"inset(-8px 100% -8px 0)"},{clipPath:"inset(-8px -12px -8px 0)",duration:${r3(d)},ease:"steps(${l.length})"},${r3(ts)});`);
        tw.push(`tl.set("#${pid}-c",{opacity:1},${r3(ts)});tl.fromTo("#${pid}-c",{x:0,y:${j * lh}},{x:${r3(l.length * cw)},duration:${r3(d)},ease:"steps(${l.length})"},${r3(ts)});`);
        ts += d + 0.05;
      });
      tw.push(`tl.set("#${pid}-c",{opacity:0},${r3(ts + 0.5)});`);
      sc._revealEnd = Math.max(sc._revealEnd || 0, ts + 0.2);
      return;
    }
    tw.push(`tl.fromTo("#${pid} .ln",{opacity:0,x:-12},{opacity:1,x:0,duration:0.25,stagger:0.035,ease:"power2.out"},${r3(sc.t0 + 0.3 + k * 0.15)});`);
    sc._revealEnd = Math.max(sc._revealEnd || 0, sc.t0 + 0.3 + k * 0.15 + 0.035 * lines.length + 0.3);
  });
  return { html, tw };
}

function focusSteps(sc, panels, steps = []) {
  const tw = [];
  for (const st of steps) {
    const t = r3(Math.max(cueTime(sc, st.cue), sc._revealEnd || 0));
    panels.forEach((p, k) => {
      const g = p._geo, want = st.panel === undefined || st.panel === k ? st.lines || [] : [];
      const all = `#${g.pid} .ln`;
      if (!st.lines || st.lines.length === 0) {
        tw.push(`tl.to("${all}",{opacity:1,backgroundColor:"rgba(0,0,0,0)",duration:0.3},${t});`);
        return;
      }
      if (st.panel !== undefined && st.panel !== k) return;
      tw.push(`tl.to("${all}",{opacity:0.6,backgroundColor:"rgba(0,0,0,0)",duration:0.3},${t});`);
      if (want.length) tw.push(`tl.to("${want.map((j) => `#${g.pid}-l${j}`).join(",")}",{opacity:1,backgroundColor:"rgba(255,180,84,0.16)",duration:0.3},${t});`);
    });
  }
  return tw;
}

function notesHtml(sc, sid, panels, notes = [], sfx) {
  let html = "", free = "", tw = [];
  notes.forEach((nt, i) => {
    const id = `${sid}-n${i}`, t = r3(cueTime(sc, nt.cue));
    let style;
    if (nt.line) {
      const g = panels[nt.panel || 0]._geo;
      const y = g.top + (nt.line - 1) * g.lh + g.lh / 2;
      style = nt.side === "left" ? `right:${1920 - g.x + 18}px;top:${y}px` : `left:${g.x + g.w + 18}px;top:${y}px`;
      if (nt.inside) style = `right:${1920 - (g.x + g.w) + 36}px;top:${y}px`;
    } else style = `left:${nt.x}px;top:${nt.y}px`;
    const el = `<div class="note ${nt.tone || "info"}" id="${id}" style="${style}">${esc(nt.text)}</div>`;
    if (nt.line) html += el; else free += el;
    tw.push(`tl.fromTo("#${id}",{opacity:0,scale:0.85},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)"},${t});`);
    sfx.push({ t, file: nt.tone === "bad" ? "error.mp3" : "pop.mp3", vol: nt.tone === "bad" ? 0.12 : 0.18 });
  });
  return { html: html + free, pinned: html, free, tw };
}

function outputHtml(sc, sid, out, y, sfx) {
  if (!out) return { html: "", tw: [] };
  const id = `${sid}-out`, t = r3(cueTime(sc, out.cue));
  const lines = out.text.split("\n");
  const html = `<div class="term ${out.tone || ""}" id="${id}" style="left:${out.x ?? 160}px;top:${out.y ?? y}px;width:${out.w ?? 1600}px">
<div class="prompt">$ ${esc(out.cmd || "./app")}</div>${lines.map((l, j) => `<div class="ol" id="${id}-${j}">${esc(l)}</div>`).join("")}</div>`;
  const tw = [`tl.fromTo("#${id}",{opacity:0,y:20},{opacity:1,y:0,duration:0.4,ease:"power3.out"},${t});`,
    `tl.fromTo("#${id} .ol",{opacity:0},{opacity:1,duration:0.15,stagger:0.18},${r3(t + 0.35)});`];
  sfx.push({ t, file: "key-press.mp3", vol: 0.2 });
  return { html, tw };
}

function sceneCode(sc, sid, sfx) {
  const panels = sc.panels;
  const hasOut = !!sc.output;
  const area = { x: 160, y: 190, w: 1600, h: hasOut ? 560 : 720, ...(sc.area || {}) };
  const a = codePanels(sc, sid, panels, area);
  const tw = [...a.tw, ...focusSteps(sc, panels, sc.steps)];
  const bottom = Math.max(...panels.map((p) => p._geo.y + p._geo.h));
  const n = notesHtml(sc, sid, panels, sc.notes, sfx);
  const o = outputHtml(sc, sid, sc.output, bottom + 30, sfx);
  return { html: a.html + n.html + o.html, tw: [...tw, ...n.tw, ...o.tw] };
}

function sceneCompare(sc, sid, sfx) {
  const cols = sc.heads.length + (sc.rowHeads ? 1 : 0);
  const big = sc.rows.length <= 3, small = sc.rows.length >= 6; // few rows: scale text and padding up to fill the band
  let html = `<div class="cmp" id="${sid}-cmp" style="--cf:${big ? 46 : small ? 34 : 40}px;--rf:${big ? 40 : 32}px;--cp:${big ? 40 : small ? 18 : 28}px;grid-template-columns:${sc.rowHeads ? "300px " : ""}repeat(${sc.heads.length},1fr)">`;
  if (sc.rowHeads) html += `<div class="ch" style="background:none"></div>`;
  sc.heads.forEach((h, k) => (html += `<div class="ch h${k}">${esc(h)}</div>`));
  const tw = [`tl.fromTo("#${sid}-cmp .ch",{opacity:0,y:-16},{opacity:1,y:0,duration:0.4,stagger:0.1},${r3(sc.t0 + 0.2)});`];
  sc.rows.forEach((row, i) => {
    if (sc.rowHeads) html += `<div class="rh r${i}">${esc(sc.rowHeads[i])}</div>`;
    row.forEach((c, k) => (html += `<div class="cc r${i} k${k}"><span>${hlInline(c)}</span></div>`));
    const t = r3(cueTime(sc, sc.cues?.[i] ?? (i + 0.5) / (sc.rows.length + 0.5)));
    tw.push(`tl.fromTo("#${sid}-cmp .r${i}",{opacity:0,y:18},{opacity:1,y:0,duration:0.4,stagger:0.08,ease:"power3.out"},${t});`);
    if (i > 0 && sc.rows.length > 2) tw.push(`tl.to("#${sid}-cmp .r${i - 1}",{opacity:0.42,duration:0.4},${t});`);
    if (i === sc.rows.length - 1 && sc.rows.length > 2) tw.push(`tl.to("#${sid}-cmp .cc,#${sid}-cmp .rh",{opacity:1,duration:0.5},${r3(t + Math.max(1.5, (sc.t0 + LEAD + sc.vo - t) * 0.6))});`);
    sfx.push({ t, file: "click-soft.mp3", vol: 0.25 });
  });
  void cols;
  return { html: html + "</div>", tw };
}

function sceneDiagram(sc, sid, sfx) {
  const ex = expandMacros(sc); sc.items = ex.items; sc.arrows = [...(sc.arrows || []), ...ex.arrows];
  let html = `<svg class="wires" width="1920" height="1080" viewBox="0 0 1920 1080">`, tw = [];
  let pre = "";
  if (sc.panels) {
    const a = codePanels(sc, sid, sc.panels, { x: 120, y: 190, w: 840, h: 700, ...(sc.area || {}) });
    pre = a.html; tw.push(...a.tw, ...focusSteps(sc, sc.panels, sc.steps));
  }
  const boxes = Object.fromEntries((sc.items || []).map((b) => [b.id, b]));
  let divs = "";
  for (const b of sc.items || []) {
    const id = `${sid}-${b.id}`, t = r3(cueTime(sc, b.cue));
    const vals = [b.text ?? "", ...(sc.changes || []).filter((c) => c.id === b.id && c.text !== undefined).map((c) => c.text), ...(sc.changes || []).filter((c) => c.id === b.id && c.count).map((c) => c.count[1])];
    if (b.region) {
      divs += `<div class="region ${b.tone || ""}" id="${id}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"><span>${esc(b.label)}</span></div>`;
    } else {
      divs += `<div class="box ${b.tone || ""}" id="${id}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">${b.label ? `<div class="lbl">${hlInline(b.label)}</div>` : ""}<div class="val" style="font-size:${Math.max(32, boxFont(b, vals))}px">${vals.map((v, k) => `<span id="${id}-v${k}" style="opacity:${k ? 0 : 1}">${hlInline(v)}</span>`).join("")}</div>${b.sub ? `<div class="sub">${hlInline(b.sub)}</div>` : ""}</div>`;
    }
    tw.push(`tl.fromTo("#${id}",{opacity:0,scale:0.92},{opacity:1,scale:1,duration:0.45,ease:"back.out(1.6)"},${t});`);
    if (!b.region && b.cue !== undefined) tw.push(glow(id, b.tone, t + 0.2));
    if (!b.region && b.cue !== undefined) sfx.push({ t, file: "pop.mp3", vol: 0.14 });
  }
  const edge = (b, tx, ty) => { // point on b's border (incl. label above it) toward (tx,ty)
    const top = b.y - (b.label && !b.region ? 46 : 0), h = b.y + b.h - top;
    const cx = b.x + b.w / 2, cy = top + h / 2, dx = tx - cx, dy = ty - cy;
    const s = Math.min(Math.abs((b.w / 2 + 6) / (dx || 1e-9)), Math.abs((h / 2 + 6) / (dy || 1e-9)));
    return [cx + dx * s, cy + dy * s];
  };
  (sc.arrows || []).forEach((a, i) => {
    const A = boxes[a.from], B = boxes[a.to], id = `${sid}-a${i}`, t = r3(cueTime(sc, a.cue));
    const [bx, by] = [B.x + B.w / 2 + (a.dx || 0), B.y + B.h / 2 + (a.dy || 0)];
    const [x1, y1] = edge(A, bx, by);
    const [x2, y2] = edge(B, A.x + A.w / 2, A.y + A.h / 2);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1;
    const qx = mx + (-(y2 - y1) / L) * (a.bend || 0), qy = my + ((x2 - x1) / L) * (a.bend || 0);
    let len = 0, px = x1, py = y1;
    for (let k = 1; k <= 40; k++) { const u = k / 40, X = (1 - u) ** 2 * x1 + 2 * (1 - u) * u * qx + u * u * x2, Y = (1 - u) ** 2 * y1 + 2 * (1 - u) * u * qy + u * u * y2; len += Math.hypot(X - px, Y - py); px = X; py = Y; }
    const ang = Math.atan2(y2 - qy, x2 - qx), hx = (d, s) => [x2 - 22 * Math.cos(ang + s * d), y2 - 22 * Math.sin(ang + s * d)];
    const [p1, p2] = [hx(0.45, 1), hx(0.45, -1)];
    const dpath = `M${r3(x1)},${r3(y1)} Q${r3(qx)},${r3(qy)} ${r3(x2)},${r3(y2)}`;
    html += `<g id="${id}" class="arrow ${a.tone || ""}"><path id="${id}-p" d="${dpath}" stroke-dasharray="${r3(len)}" stroke-dashoffset="${r3(len)}"/><path class="pulse" id="${id}-q" d="${dpath}" stroke-dasharray="46 ${r3(len + 46)}" stroke-dashoffset="46" opacity="0"/><polygon id="${id}-h" points="${r3(x2)},${r3(y2)} ${r3(p1[0])},${r3(p1[1])} ${r3(p2[0])},${r3(p2[1])}" opacity="0"/>${a.label ? (Math.abs(x2 - x1) < Math.abs(y2 - y1) ? `<text x="${r3(qx + 22)}" y="${r3(qy + 9)}" style="text-anchor:start" id="${id}-t" opacity="0">${esc(a.label)}</text>` : `<text x="${r3(qx)}" y="${r3(qy - 16)}" id="${id}-t" opacity="0">${esc(a.label)}</text>`) : ""}</g>`;
    tw.push(`tl.to("#${id}-p",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},${t});`);
    tw.push(`tl.to("#${id}-h${a.label ? `,#${id}-t` : ""}",{opacity:1,duration:0.2},${r3(t + 0.5)});`);
    tw.push(`tl.set("#${id}-q",{opacity:1},${r3(t + 0.55)});tl.fromTo("#${id}-q",{strokeDashoffset:46},{strokeDashoffset:${r3(-len)},duration:0.75,ease:"power1.inOut"},${r3(t + 0.55)});tl.set("#${id}-q",{opacity:0},${r3(t + 1.3)});`);
    sfx.push({ t, file: "whoosh-short.mp3", vol: 0.1 });
  });
  html += "</svg>";
  const counters = {};
  for (const c of sc.changes || []) {
    const t = r3(cueTime(sc, c.cue)), id = `${sid}-${c.id}`;
    if (c.text !== undefined) {
      const k = (counters[c.id] = (counters[c.id] || 0) + 1);
      tw.push(`tl.to("#${id}-v${k - 1}",{opacity:0,y:-20,duration:0.25},${t});`);
      tw.push(`tl.fromTo("#${id}-v${k}",{opacity:0,y:20},{opacity:1,y:0,duration:0.3},${r3(t + 0.15)});`);
      tw.push(`tl.to("#${id}",{scale:1.08,duration:0.15,yoyo:true,repeat:1},${t});`, glow(id, c.tone, t));
      sfx.push({ t, file: "click.mp3", vol: 0.2 });
    }
    if (c.count) tw.push(`tl.fromTo("#${id}-v0",{innerText:${c.count[0]}},{innerText:${c.count[1]},duration:${c.dur ?? 1},ease:"power1.out",snap:{innerText:1}},${t});`, glow(id, c.tone, t));
    const col = { bad: "#f07178", good: "#aad94c", warn: "#ffb454", info: "#59c2ff", dim: "#4a5060" }[c.tone];
    if (col && /^a\d+$/.test(c.id)) tw.push(`tl.to("#${id}-p",{stroke:"${col}",duration:0.3},${t});tl.to("#${id}-h",{fill:"${col}",duration:0.3},${t});`);
    else if (col) tw.push(`tl.to("#${id}",{borderColor:"${col}",duration:0.3},${t});`);
    if (c.kill) { tw.push(`tl.to("#${id}",{opacity:0.25,duration:0.4},${t});`); divs += `<div class="xmark" id="${id}-x" style="${xpos(boxes[c.id])}">✕</div>`; tw.push(`tl.fromTo("#${id}-x",{opacity:0,scale:2},{opacity:1,scale:1,duration:0.3,ease:"power3.out"},${t});`); sfx.push({ t, file: "error.mp3", vol: 0.12 }); }
    if (c.move) { const b = boxes[c.id]; tw.push(`tl.to("#${id}",{x:${c.move[0] - b.x},y:${c.move[1] - b.y},duration:0.7,ease:"power2.inOut"},${t});`); sfx.push({ t, file: "whoosh.mp3", vol: 0.12 }); }
    if (c.glow) tw.push(glow(id, c.tone, t));
    if (c.fade) tw.push(`tl.to("#${id}",{opacity:0,duration:0.4},${t});`);
  }
  const n = notesHtml(sc, sid, sc.panels || [], sc.notes, sfx);
  // auto-zoom: scale the diagram so it fills its area, with a slow push-in
  const its = [...(sc.items || []), ...(sc.changes || []).filter((c) => c.move && boxes[c.id]).map((c) => ({ ...boxes[c.id], x: c.move[0], y: c.move[1] }))]; // include move targets
  let stageOpen = "", stageClose = "";
  if (its.length && !sc.noZoom) {
    const x0 = Math.min(...its.map((b) => b.x)) - 20, x1 = Math.max(...its.map((b) => b.x + b.w)) + 20;
    const y0 = Math.min(...its.map((b) => b.y - (b.label && !b.region ? 50 : b.region ? 30 : 0))) - 10, y1 = Math.max(...its.map((b) => b.y + b.h + (b.sub ? 10 : 0))) + 30;
    const A = sc.panels ? { x: 120 + (sc.area?.w ?? 840) + 50, y: 180, w: 1800 - (120 + (sc.area?.w ?? 840) + 50), h: 730 } : { x: 110, y: 180, w: 1700, h: 740 };
    const k = Math.max(1, Math.min(A.w / (x1 - x0), A.h / (y1 - y0), sc.panels ? 1.35 : 1.6));
    const tx = A.x + (A.w - (x1 - x0) * k) / 2 - x0 * k, ty = A.y + (A.h - (y1 - y0) * k) / 2 - y0 * k;
    stageOpen = `<div class="stage" id="${sid}-stage">`; stageClose = "</div>";
    const end = sc.t0 + LEAD + sc.vo + (sc.hold ?? TAIL);
    tw.unshift(`tl.fromTo("#${sid}-stage",{x:${r3(tx + (x1 - x0) * k * 0.015)},y:${r3(ty + (y1 - y0) * k * 0.015)},scale:${r3(k * 0.97)},transformOrigin:"0 0"},{x:${r3(tx)},y:${r3(ty)},scale:${r3(k)},duration:${r3(end - sc.t0)},ease:"none"},${r3(sc.t0)});`);
  }
  return { html: pre + stageOpen + divs + html + n.free + stageClose + n.pinned, tw: [...tw, ...n.tw] };
}
const GLOW = { bad: "240,113,120", good: "170,217,76", warn: "255,180,84", info: "89,194,255", blue: "89,194,255", dim: "120,130,150" };
const glow = (id, tone, t) => `tl.to("#${id}",{boxShadow:"0 0 46px 8px rgba(${GLOW[tone] || "255,180,84"},0.55)",duration:0.3,yoyo:true,repeat:1,repeatDelay:0.5},${r3(t)});`;
const xpos = (b) => `left:${b.x + b.w / 2 - 50}px;top:${b.y + b.h / 2 - 60}px`;

function sceneFlow(sc, sid, sfx) {
  const n = sc.items.length, gap = 70, w = Math.min(340, (1600 - gap * (n - 1)) / n), y = sc.y || 420, h = sc.h || 240;
  const x0 = 960 - (n * w + (n - 1) * gap) / 2;
  sc.items = sc.items.map((it, i) => ({ id: `f${i}`, x: x0 + i * (w + gap), y, w, h, label: it.label, text: it.text, sub: it.sub, tone: it.tone, size: it.size || 34, cue: it.cue }));
  sc.arrows = sc.items.slice(1).map((it, i) => ({ from: `f${i}`, to: it.id, cue: it.cue }));
  return sceneDiagram(sc, sid, sfx);
}

function sceneTitle(sc, sid, spec) {
  const html = `<div class="ttl" id="${sid}-ttl"><div class="qn" id="${sid}-qn">${spec.series ? esc(spec.series) + " · " : "Question "}${spec.num}</div><h1 id="${sid}-h">${hlInline(spec.question)}</h1>${sc.sub ? `<p id="${sid}-sub">${hlInline(sc.sub)}</p>` : ""}</div>`;
  if (sc.t0 === 0) return { html, tw: sc.sub ? [`tl.fromTo("#${sid}-sub",{opacity:0},{opacity:1,duration:0.6},${r3(cueTime(sc, sc.subCue ?? 0.5))});`] : [] };
  const tw = [`tl.fromTo("#${sid}-qn",{opacity:0,y:20},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${r3(sc.t0 + 0.2)});`,
    `tl.fromTo("#${sid}-h",{opacity:0,y:40,filter:"blur(10px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.8,ease:"power3.out"},${r3(sc.t0 + 0.4)});`];
  if (sc.sub) tw.push(`tl.fromTo("#${sid}-sub",{opacity:0},{opacity:1,duration:0.6},${r3(cueTime(sc, sc.subCue ?? 0.5))});`);
  return { html, tw };
}

function sceneTake(sc, sid, sfx) {
  const html = `<div class="take" id="${sid}-tk"><div class="kicker">${esc(sc.kicker || "Remember")}</div>${sc.lines.map((l, i) => `<div class="tl" id="${sid}-t${i}"><s>0${i + 1}</s><span>${hlInline(l.replace(/\b[A-Z](?: [A-Z]\b)+/g, (m) => m.replace(/ /g, "")))}</span></div>`).join("")}</div>`;
  const tw = [`tl.fromTo("#${sid}-tk .kicker",{opacity:0,x:-20},{opacity:1,x:0,duration:0.6},${r3(sc.t0 + 0.2)});`];
  sc.lines.forEach((l, i) => {
    const t = r3(cueTime(sc, sc.cues?.[i] ?? i / sc.lines.length));
    tw.push(`tl.fromTo("#${sid}-t${i}",{opacity:0,y:24},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${t});`);
  });
  sfx.push({ t: r3(sc.t0 + 0.2), file: "sparkle.mp3", vol: 0.12 });
  return { html, tw };
}

function sceneProblem(sc, sid, sfx) {
  const ex = sc.example || {}, c = sc.cues || {};
  const html = `<div class="prob" id="${sid}-pb"><div class="kicker" id="${sid}-pk">Problem</div><h1 id="${sid}-pt">${hlInline(sc.title)}</h1><p class="pst" id="${sid}-ps">${hlInline(sc.statement)}</p><div class="pio"><div class="pbox" id="${sid}-pi"><b>Input</b><code>${esc(ex.input)}</code></div><div class="pbox out" id="${sid}-po"><b>Output</b><code>${esc(ex.output)}</code></div></div>${sc.note ? `<div class="pnote" id="${sid}-pn">${hlInline(sc.note)}</div>` : ""}</div>`;
  const tw = [`tl.fromTo("#${sid}-pk",{opacity:0,x:-20},{opacity:1,x:0,duration:0.5},${r3(sc.t0 + 0.2)});`,
    `tl.fromTo("#${sid}-pt",{opacity:0,y:30},{opacity:1,y:0,duration:0.6,ease:"power3.out"},${r3(sc.t0 + 0.3)});`,
    `tl.fromTo("#${sid}-ps",{opacity:0,y:20},{opacity:1,y:0,duration:0.6,ease:"power3.out"},${r3(sc.t0 + 0.7)});`];
  for (const [id, k] of [["pi", "example"], ["po", "output"], ["pn", "note"]]) {
    if (id === "pn" && !sc.note) continue;
    const t = r3(cueTime(sc, c[k] ?? (k === "example" ? 0.3 : k === "output" ? 0.6 : 0.8)));
    tw.push(`tl.fromTo("#${sid}-${id}",{opacity:0,y:30,scale:0.94},{opacity:1,y:0,scale:1,duration:0.45,ease:"back.out(1.6)"},${t});`);
    sfx.push({ t, file: "pop.mp3", vol: 0.2 });
  }
  sfx.push({ t: r3(sc.t0 + 0.2), file: "sparkle.mp3", vol: 0.12 });
  return { html, tw };
}

// spoken -> written forms for captions
const CAPS = [[/\bnull p t r\b/g, "nullptr"], [/\bs t d colon colon (\w+)/g, "std::$1"], [/\bs t d\b/g, "std"], [/\b(\w+) colon colon (\w+)/g, "$1::$2"], [/\bC plus plus eleven\b/g, "C++11"], [/\bC plus plus seventeen\b/g, "C++17"], [/\bC plus plus\b/g, "C++"], [/\b[Pp]lus plus ([a-z])\b/g, "++$1"], [/\b([a-z]) plus plus\b/g, "$1++"], [/\b[A-Z](?: [A-Z]\b)+/g, (m) => m.replace(/ /g, "")]];
const capfix = (s, spec) => hlInline([...CAPS, ...(spec.caps || []).map(([a, b]) => [new RegExp(a, "g"), b])].reduce((x, [a, b]) => x.replace(a, b), s));
// Reveal times for the audit (audit.sh): every tween that brings something in, merged within 0.5 s.
export function revealsOf(scene, t0, tweens) {
  const hits = [{ t: r3(t0), what: "scene start" }];
  for (const tw of tweens) for (const st of tw.split(/(?<=\);)(?=tl\.)/)) {
    const m = st.match(/^tl\.(fromTo|to)\("([^"]+)",(\{[^}]*\})[\s\S]*,(-?[\d.]+)\);$/);
    if (!m || /-stage$|-q$/.test(m[2]) || (m[1] === "to" && /^\{opacity:0[,}]/.test(m[3]))) continue;
    hits.push({ t: Number(m[4]), what: m[2].replace(/^#s\d+-?/, "") || "scene" });
  }
  hits.sort((a, b) => a.t - b.t);
  const out = [];
  for (const h of hits) {
    const l = out.at(-1);
    if (l && h.t - l.t < 0.5) { if (!l.what.split(", ").includes(h.what) && l.what.length < 60) l.what += ", " + h.what; } else out.push({ scene, t: h.t, what: h.what });
  }
  return out;
}
// ---------- assemble ----------
function build(specPath) {
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const dir = spec.id;
  const durs = JSON.parse(fs.readFileSync(path.join(dir, "assets/vo/durations.json"), "utf8"));
  fs.mkdirSync(path.join(dir, "assets/sfx"), { recursive: true });
  const reveals = [];
  let t = 0, scenesHtml = "", tws = [], audio = "", caps = "";
  const sfx = [];
  spec.scenes.forEach((sc, i) => {
    if (sc.say === undefined && sc.type !== "chapter") throw new Error(`scene ${i} (${sc.type}) needs "say"`);
    sc.vo = sc.say === undefined ? 0 : durs[`s${i}`].dur; sc.t0 = t;
    const dur = sc.type === "chapter" ? 2.5 : r3(LEAD + sc.vo + (sc.type === "quiz" ? (sc.pause ?? 3) + (sc.hold ?? 3) : sc.hold ?? TAIL));
    const sid = `s${i}`;
    const r = { title: () => sceneTitle(sc, sid, spec), code: () => sceneCode(sc, sid, sfx), compare: () => sceneCompare(sc, sid, sfx), diagram: () => sceneDiagram(sc, sid, sfx), flow: () => sceneFlow(sc, sid, sfx), take: () => sceneTake(sc, sid, sfx), problem: () => sceneProblem(sc, sid, sfx), hook: () => sceneHook(sc, sid, sfx), quiz: () => sceneQuiz(sc, sid, sfx), chapter: () => sceneChapter(sc, sid, sfx), chart: () => sceneChart(sc, sid, sfx) }[sc.type]();
    const head = sc.head ? `<div class="head" id="${sid}-head">${hlInline(sc.head)}</div>` : "";
    scenesHtml += `<section id="${sid}" class="clip scene" data-start="${r3(t)}" data-duration="${dur}" data-track-index="1">${head}${r.html}</section>\n`;
    if (sc.head) tws.push(`tl.fromTo("#${sid}-head",{opacity:0,x:-30},{opacity:1,x:0,duration:0.5,ease:"power3.out"},${r3(t + 0.05)});`);
    tws.push(`// ${sid} t0=${r3(t)}`, ...r.tw);
    reveals.push(...revealsOf(i, t, sc.head ? [`tl.fromTo("#${sid}-head",{opacity:0},{opacity:1},${r3(t + 0.05)});`, ...r.tw] : r.tw));
    // scene exit
    tws.push(`tl.to("#${sid} > *",{opacity:0,duration:0.3},${r3(t + dur - 0.35)});`);
    if (sc.say !== undefined) audio += `<audio id="vo${i}" class="clip" src="assets/vo/s${i}.wav" data-start="${r3(t + LEAD)}" data-duration="${sc.vo}" data-track-index="10" data-volume="1"></audio>\n`;
    if (i > 0) sfx.push({ t: r3(t), file: i % 2 ? "whoosh-short.mp3" : "whoosh.mp3", vol: 0.1 });
    // captions: sentence-level, timed by character position
    const sents = sc.say === undefined ? [] : (sc.say.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) || [sc.say]).flatMap((s) => {
      if (s.split(/\s+/).length <= 14) return [s];
      const parts = s.match(/[^,;:]+[,;:]?\s*/g), out = [];
      for (const p of parts) { if (out.length && (out.at(-1) + p).split(/\s+/).length <= 14) out[out.length - 1] += p; else out.push(p); }
      return out;
    }).reduce((acc, p) => {
      if (acc.length && (p.trim().split(/\s+/).length < 5 || acc.at(-1).trim().split(/\s+/).length < 4) && (acc.at(-1) + p).split(/\s+/).length <= 18) acc[acc.length - 1] += p; else acc.push(p);
      return acc;
    }, []);
    let c = 0;
    sents.forEach((s, k) => {
      const a = t + LEAD + (c / sc.say.length) * sc.vo; c += s.length;
      const b = t + LEAD + (c / sc.say.length) * sc.vo;
      caps += `<div id="cap${i}-${k}" class="clip cap" data-start="${r3(a)}" data-duration="${r3(Math.max(0.3, b - a))}" data-track-index="5">${capfix(s.trim(), spec)}</div>\n`;
    });
    t += dur;
  });
  // sfx: thin out hits closer than 0.25s
  sfx.sort((a, b) => a.t - b.t);
  let last = -9, used = new Set(), k = 0;
  for (const s of sfx) {
    if (s.t - last < 0.25) continue; last = s.t;
    if (!used.has(s.file)) { fs.copyFileSync(path.join(SFX, s.file), path.join(dir, "assets/sfx", s.file)); used.add(s.file); }
    audio += `<audio id="fx${k++}" class="clip" src="assets/sfx/${s.file}" data-start="${s.t}" data-duration="${SFXLEN[s.file]}" data-track-index="${11 + (k % 2)}" data-volume="${s.vol}"></audio>\n`;
  }
  const total = r3(t);
  fs.writeFileSync(path.join(dir, "reveals.json"), JSON.stringify(reveals, null, 1));
  const html = fs.readFileSync(new URL("./template.html", import.meta.url), "utf8")
    .replace("%TITLE%", esc(`${spec.series ? spec.series + " " : "Q"}${spec.num}: ${spec.question}`))
    .replaceAll("%DUR%", total).replace("%BRAND%", ({ Backend: "BE", SWE: "SWE", DSA: "DSA", Frontend: "FE", "AI Eval": "AI" })[spec.series] || "C++").replace("%QCHIP%", `${spec.series ? esc(spec.series) + " " : "Q"}${spec.num} · ${esc(spec.short)}`)
    .replace("%SCENES%", scenesHtml).replace("%CAPS%", caps).replace("%AUDIO%", audio)
    .replace("%TWEENS%", tws.join("\n") + `\n// global\ntl.fromTo("#prog",{scaleX:0},{scaleX:1,duration:${total},ease:"none"},0);`);
  // ponytail: RES=720 renders 1280x720 by scaling the 1920x1080 canvas; layout/lint stay in 1080 units
  const out = process.env.RES === "720" ? html.replace('content="width=1920, height=1080"', 'content="width=1280, height=720"')
    .replace("html,body{width:1920px;height:1080px", "html,body{width:1280px;height:720px").replace("#root{position:relative;width:1920px;height:1080px", "#root{position:relative;width:1280px;height:720px")
    .replace('data-width="1920" data-height="1080">', 'data-width="1280" data-height="720">\n<div id="cv" style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform:scale(0.666667);transform-origin:0 0">')
    .replace("</div>\n<script>", "</div>\n</div>\n<script>") : html;
  fs.writeFileSync(path.join(dir, "index.html"), out);
  if (spec.chapters) { // YouTube chapters: first line must be 0:00:00
    const ts = (x) => `${Math.floor(x / 3600)}:${String(Math.floor(x / 60) % 60).padStart(2, "0")}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
    const rows = spec.chapters.map((c) => [spec.scenes[c.start].t0, c.title]);
    if (rows[0][0] > 0) rows.unshift([0, "Intro"]);
    fs.writeFileSync(path.join(dir, "chapters.txt"), rows.map(([x, n]) => `${ts(x)} ${n}`).join("\n") + "\n");
  }
  console.log(`${dir}: ${spec.scenes.length} scenes, ${total}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) for (const p of process.argv.slice(2)) build(p);
