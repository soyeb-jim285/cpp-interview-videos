// Usage: node build.mjs scripts/q01.json [...]
// Reads a question spec + qNN/assets/vo/durations.json (from tts.py), writes qNN/index.html.
import fs from "node:fs";
import path from "node:path";

const SFX = new URL("./sfx", import.meta.url).pathname;
const LEAD = 0.45, TAIL = 0.8;
const SFXLEN = { "click.mp3": 0.37, "click-soft.mp3": 0.37, "error.mp3": 1.62, "key-press.mp3": 0.4, "pop.mp3": 0.72, "sparkle.mp3": 1.8, "whoosh.mp3": 0.57, "whoosh-short.mp3": 0.57 };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r3 = (n) => Math.round(n * 1000) / 1000;

// ---------- tiny C++ highlighter ----------
const KW = new Set("alignas auto bool break case catch char class const constexpr const_cast continue decltype default delete do double dynamic_cast else enum explicit extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register reinterpret_cast return short signed sizeof static static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while size_t std NULL".split(" "));
function hl(line) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#\s*\w+)|(\b\d+(?:\.\d+)?[fFuUlL]*\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let out = "", m;
  while ((m = re.exec(line))) {
    const [t, com, str, pre, num, id, ws] = m;
    if (com) out += `<i class="c">${esc(com)}</i>`;
    else if (str) out += `<i class="s">${esc(str)}</i>`;
    else if (pre) out += `<i class="p">${esc(pre)}</i>`;
    else if (num) out += `<i class="n">${esc(num)}</i>`;
    else if (id) out += KW.has(id) ? `<i class="k">${id}</i>` : /^[A-Z]/.test(id) ? `<i class="t">${id}</i>` : esc(id);
    else if (ws) out += ws;
    else out += esc(t);
  }
  return out || " ";
}

// ---------- timing ----------
function cueTime(sc, cue) {
  if (cue === undefined || cue === null) return sc.t0 + LEAD;
  if (typeof cue === "number") return sc.t0 + LEAD + cue * sc.vo;
  const i = sc.say.toLowerCase().indexOf(cue.toLowerCase());
  if (i < 0) throw new Error(`cue "${cue}" not in: ${sc.say}`);
  return sc.t0 + LEAD + (i / sc.say.length) * sc.vo;
}

// ---------- scene renderers: return {html, tw:[js lines], sfx:[{t,file,vol}]} ----------
function codePanels(sc, sid, panels, area) {
  let html = "", tw = [];
  const gap = 40, n = panels.length;
  const pw = (area.w - gap * (n - 1)) / n;
  panels.forEach((p, k) => {
    const lines = p.code.replace(/\n$/, "").split("\n");
    const maxC = Math.max(...lines.map((l) => l.length), 20);
    const fs_ = Math.floor(Math.min(p.size || 34, (pw - 150) / (maxC * 0.61), (area.h - 90) / (lines.length * 1.55)));
    const lh = Math.round(fs_ * 1.55);
    const h = lines.length * lh + 96;
    const x = area.x + k * (pw + gap);
    const pid = `${sid}-p${k}`;
    html += `<div class="panel" id="${pid}" style="left:${x}px;top:${area.y}px;width:${pw}px;height:${h}px">
<div class="bar" data-layout-ignore><b></b><b></b><b></b><span>${esc(p.file || "main.cpp")}</span>${p.label ? `<em class="tag ${p.tone || ""}">${esc(p.label)}</em>` : ""}</div>
<pre style="font-size:${fs_}px;line-height:${lh}px">${lines.map((l, j) => `<div class="ln" id="${pid}-l${j + 1}"><u>${j + 1}</u>${hl(l)}</div>`).join("")}</pre></div>`;
    tw.push(`tl.fromTo("#${pid}",{opacity:0,y:30},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${r3(sc.t0 + 0.1 + k * 0.15)});`);
    tw.push(`tl.fromTo("#${pid} .ln",{opacity:0,x:-12},{opacity:1,x:0,duration:0.25,stagger:0.035,ease:"power2.out"},${r3(sc.t0 + 0.3 + k * 0.15)});`);
    p._geo = { x, y: area.y, w: pw, h, lh, top: area.y + 48 + 24, n: lines.length, pid };
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
      tw.push(`tl.to("${all}",{opacity:0.38,backgroundColor:"rgba(0,0,0,0)",duration:0.3},${t});`);
      if (want.length) tw.push(`tl.to("${want.map((j) => `#${g.pid}-l${j}`).join(",")}",{opacity:1,backgroundColor:"rgba(255,180,84,0.16)",duration:0.3},${t});`);
    });
  }
  return tw;
}

function notesHtml(sc, sid, panels, notes = [], sfx) {
  let html = "", tw = [];
  notes.forEach((nt, i) => {
    const id = `${sid}-n${i}`, t = r3(cueTime(sc, nt.cue));
    let style;
    if (nt.line) {
      const g = panels[nt.panel || 0]._geo;
      const y = g.top + (nt.line - 1) * g.lh + g.lh / 2;
      style = nt.side === "left" ? `right:${1920 - g.x + 18}px;top:${y}px` : `left:${g.x + g.w + 18}px;top:${y}px`;
      if (nt.inside) style = `right:${1920 - (g.x + g.w) + 24}px;top:${y}px`;
    } else style = `left:${nt.x}px;top:${nt.y}px`;
    html += `<div class="note ${nt.tone || "info"}" id="${id}" style="${style}">${esc(nt.text)}</div>`;
    tw.push(`tl.fromTo("#${id}",{opacity:0,scale:0.85},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)"},${t});`);
    sfx.push({ t, file: nt.tone === "bad" ? "error.mp3" : "pop.mp3", vol: nt.tone === "bad" ? 0.12 : 0.18 });
  });
  return { html, tw };
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
  let html = `<div class="cmp" id="${sid}-cmp" style="grid-template-columns:${sc.rowHeads ? "300px " : ""}repeat(${sc.heads.length},1fr)">`;
  if (sc.rowHeads) html += `<div class="ch" style="background:none"></div>`;
  sc.heads.forEach((h, k) => (html += `<div class="ch h${k}">${esc(h)}</div>`));
  const tw = [`tl.fromTo("#${sid}-cmp .ch",{opacity:0,y:-16},{opacity:1,y:0,duration:0.4,stagger:0.1},${r3(sc.t0 + 0.2)});`];
  sc.rows.forEach((row, i) => {
    if (sc.rowHeads) html += `<div class="rh r${i}">${esc(sc.rowHeads[i])}</div>`;
    row.forEach((c, k) => (html += `<div class="cc r${i} k${k}"><span>${hlInline(c)}</span></div>`));
    const t = r3(cueTime(sc, sc.cues?.[i] ?? (i + 0.5) / (sc.rows.length + 0.5)));
    tw.push(`tl.fromTo("#${sid}-cmp .r${i}",{opacity:0,y:18},{opacity:1,y:0,duration:0.4,stagger:0.08,ease:"power3.out"},${t});`);
    sfx.push({ t, file: "click-soft.mp3", vol: 0.25 });
  });
  void cols;
  return { html: html + "</div>", tw };
}
// `code` inside backticks in prose cells
const hlInline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

function sceneDiagram(sc, sid, sfx) {
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
    const vals = [b.text ?? "", ...(sc.changes || []).filter((c) => c.id === b.id && c.text !== undefined).map((c) => c.text)];
    if (b.region) {
      divs += `<div class="region ${b.tone || ""}" id="${id}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"><span>${esc(b.label)}</span></div>`;
    } else {
      divs += `<div class="box ${b.tone || ""}" id="${id}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">${b.label ? `<div class="lbl">${hlInline(b.label)}</div>` : ""}<div class="val" style="font-size:${b.size || 40}px">${vals.map((v, k) => `<span id="${id}-v${k}" style="opacity:${k ? 0 : 1}">${hlInline(v)}</span>`).join("")}</div>${b.sub ? `<div class="sub">${hlInline(b.sub)}</div>` : ""}</div>`;
    }
    tw.push(`tl.fromTo("#${id}",{opacity:0,scale:0.92},{opacity:1,scale:1,duration:0.45,ease:"back.out(1.6)"},${t});`);
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
    html += `<g id="${id}" class="arrow ${a.tone || ""}"><path id="${id}-p" d="M${r3(x1)},${r3(y1)} Q${r3(qx)},${r3(qy)} ${r3(x2)},${r3(y2)}" stroke-dasharray="${r3(len)}" stroke-dashoffset="${r3(len)}"/><polygon id="${id}-h" points="${r3(x2)},${r3(y2)} ${r3(p1[0])},${r3(p1[1])} ${r3(p2[0])},${r3(p2[1])}" opacity="0"/>${a.label ? (Math.abs(x2 - x1) < Math.abs(y2 - y1) ? `<text x="${r3(qx + 22)}" y="${r3(qy + 9)}" style="text-anchor:start" id="${id}-t" opacity="0">${esc(a.label)}</text>` : `<text x="${r3(qx)}" y="${r3(qy - 16)}" id="${id}-t" opacity="0">${esc(a.label)}</text>`) : ""}</g>`;
    tw.push(`tl.to("#${id}-p",{strokeDashoffset:0,duration:0.6,ease:"power2.inOut"},${t});`);
    tw.push(`tl.to("#${id}-h${a.label ? `,#${id}-t` : ""}",{opacity:1,duration:0.2},${r3(t + 0.5)});`);
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
      tw.push(`tl.to("#${id}",{scale:1.08,duration:0.15,yoyo:true,repeat:1},${t});`);
      sfx.push({ t, file: "click.mp3", vol: 0.2 });
    }
    const col = { bad: "#f07178", good: "#aad94c", warn: "#ffb454", info: "#59c2ff", dim: "#4a5060" }[c.tone];
    if (col && /^a\d+$/.test(c.id)) tw.push(`tl.to("#${id}-p",{stroke:"${col}",duration:0.3},${t});tl.to("#${id}-h",{fill:"${col}",duration:0.3},${t});`);
    else if (col) tw.push(`tl.to("#${id}",{borderColor:"${col}",duration:0.3},${t});`);
    if (c.kill) { tw.push(`tl.to("#${id}",{opacity:0.25,duration:0.4},${t});`); divs += `<div class="xmark" id="${id}-x" style="${xpos(boxes[c.id])}">✕</div>`; tw.push(`tl.fromTo("#${id}-x",{opacity:0,scale:2},{opacity:1,scale:1,duration:0.3,ease:"power3.out"},${t});`); sfx.push({ t, file: "error.mp3", vol: 0.12 }); }
    if (c.fade) tw.push(`tl.to("#${id}",{opacity:0,duration:0.4},${t});`);
  }
  const n = notesHtml(sc, sid, sc.panels || [], sc.notes, sfx);
  return { html: pre + divs + html + n.html, tw: [...tw, ...n.tw] };
}
const xpos = (b) => `left:${b.x + b.w / 2 - 50}px;top:${b.y + b.h / 2 - 60}px`;

function sceneFlow(sc, sid, sfx) {
  const n = sc.items.length, gap = 70, w = Math.min(340, (1600 - gap * (n - 1)) / n), y = sc.y || 420, h = sc.h || 240;
  const x0 = 960 - (n * w + (n - 1) * gap) / 2;
  sc.items = sc.items.map((it, i) => ({ id: `f${i}`, x: x0 + i * (w + gap), y, w, h, label: it.label, text: it.text, sub: it.sub, tone: it.tone, size: it.size || 34, cue: it.cue }));
  sc.arrows = sc.items.slice(1).map((it, i) => ({ from: `f${i}`, to: it.id, cue: it.cue }));
  return sceneDiagram(sc, sid, sfx);
}

function sceneTitle(sc, sid, spec) {
  const html = `<div class="ttl" id="${sid}-ttl"><div class="qn" id="${sid}-qn">Question ${spec.num}</div><h1 id="${sid}-h">${hlInline(spec.question)}</h1>${sc.sub ? `<p id="${sid}-sub">${hlInline(sc.sub)}</p>` : ""}</div>`;
  if (sc.t0 === 0) return { html, tw: sc.sub ? [`tl.fromTo("#${sid}-sub",{opacity:0},{opacity:1,duration:0.6},${r3(cueTime(sc, sc.subCue ?? 0.5))});`] : [] };
  const tw = [`tl.fromTo("#${sid}-qn",{opacity:0,y:20},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${r3(sc.t0 + 0.2)});`,
    `tl.fromTo("#${sid}-h",{opacity:0,y:40,filter:"blur(10px)"},{opacity:1,y:0,filter:"blur(0px)",duration:0.8,ease:"power3.out"},${r3(sc.t0 + 0.4)});`];
  if (sc.sub) tw.push(`tl.fromTo("#${sid}-sub",{opacity:0},{opacity:1,duration:0.6},${r3(cueTime(sc, sc.subCue ?? 0.5))});`);
  return { html, tw };
}

function sceneTake(sc, sid, sfx) {
  const html = `<div class="take" id="${sid}-tk"><div class="kicker">Remember</div>${sc.lines.map((l, i) => `<div class="tl" id="${sid}-t${i}"><s>0${i + 1}</s><span>${hlInline(l)}</span></div>`).join("")}</div>`;
  const tw = [`tl.fromTo("#${sid}-tk .kicker",{opacity:0,x:-20},{opacity:1,x:0,duration:0.6},${r3(sc.t0 + 0.2)});`];
  sc.lines.forEach((l, i) => {
    const t = r3(cueTime(sc, sc.cues?.[i] ?? i / sc.lines.length));
    tw.push(`tl.fromTo("#${sid}-t${i}",{opacity:0,y:24},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${t});`);
  });
  sfx.push({ t: r3(sc.t0 + 0.2), file: "sparkle.mp3", vol: 0.12 });
  return { html, tw };
}

// spoken -> written forms for captions
const CAPS = [[/\bnull p t r\b/g, "nullptr"], [/\bs t d colon colon (\w+)/g, "std::$1"], [/\bs t d\b/g, "std"], [/\b(\w+) colon colon (\w+)/g, "$1::$2"], [/\bC plus plus eleven\b/g, "C++11"], [/\bC plus plus seventeen\b/g, "C++17"], [/\bC plus plus\b/g, "C++"], [/\b[Pp]lus plus ([a-z])\b/g, "++$1"], [/\b([a-z]) plus plus\b/g, "$1++"], [/\b[A-Z](?: [A-Z]\b)+/g, (m) => m.replace(/ /g, "")]];
const capfix = (s, spec) => hlInline([...CAPS, ...(spec.caps || []).map(([a, b]) => [new RegExp(a, "g"), b])].reduce((x, [a, b]) => x.replace(a, b), s));
// ---------- assemble ----------
function build(specPath) {
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const dir = spec.id;
  const durs = JSON.parse(fs.readFileSync(path.join(dir, "assets/vo/durations.json"), "utf8"));
  fs.mkdirSync(path.join(dir, "assets/sfx"), { recursive: true });
  let t = 0, scenesHtml = "", tws = [], audio = "", caps = "";
  const sfx = [];
  spec.scenes.forEach((sc, i) => {
    sc.vo = durs[`s${i}`].dur; sc.t0 = t;
    const dur = r3(LEAD + sc.vo + (sc.hold ?? TAIL));
    const sid = `s${i}`;
    const r = { title: () => sceneTitle(sc, sid, spec), code: () => sceneCode(sc, sid, sfx), compare: () => sceneCompare(sc, sid, sfx), diagram: () => sceneDiagram(sc, sid, sfx), flow: () => sceneFlow(sc, sid, sfx), take: () => sceneTake(sc, sid, sfx) }[sc.type]();
    const head = sc.head ? `<div class="head" id="${sid}-head">${hlInline(sc.head)}</div>` : "";
    scenesHtml += `<section id="${sid}" class="clip scene" data-start="${r3(t)}" data-duration="${dur}" data-track-index="1">${head}${r.html}</section>\n`;
    if (sc.head) tws.push(`tl.fromTo("#${sid}-head",{opacity:0,x:-30},{opacity:1,x:0,duration:0.5,ease:"power3.out"},${r3(t + 0.05)});`);
    tws.push(...r.tw);
    // scene exit
    tws.push(`tl.to("#${sid} > *",{opacity:0,duration:0.3},${r3(t + dur - 0.35)});`);
    audio += `<audio id="vo${i}" class="clip" src="assets/vo/s${i}.wav" data-start="${r3(t + LEAD)}" data-duration="${sc.vo}" data-track-index="10" data-volume="1"></audio>\n`;
    if (i > 0) sfx.push({ t: r3(t), file: i % 2 ? "whoosh-short.mp3" : "whoosh.mp3", vol: 0.1 });
    // captions: sentence-level, timed by character position
    const sents = (sc.say.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) || [sc.say]).flatMap((s) => {
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
  const html = fs.readFileSync("template.html", "utf8")
    .replace("%TITLE%", esc(`Q${spec.num}: ${spec.question}`))
    .replaceAll("%DUR%", total).replace("%QCHIP%", `Q${spec.num} · ${esc(spec.short)}`)
    .replace("%SCENES%", scenesHtml).replace("%CAPS%", caps).replace("%AUDIO%", audio)
    .replace("%TWEENS%", tws.join("\n") + `\ntl.fromTo("#prog",{scaleX:0},{scaleX:1,duration:${total},ease:"none"},0);`);
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`${dir}: ${spec.scenes.length} scenes, ${total}s`);
}

for (const p of process.argv.slice(2)) build(p);
