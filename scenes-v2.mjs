// Engine v2 scene renderers (hook, quiz, chapter, chart) + diagram item macros.
// Same contract as build.mjs renderers: return {html, tw:[GSAP calls on `tl`]}.
import { LEAD, esc, r3, hlInline, cueTime } from "./util.mjs";

const cl = (v, a, b) => Math.max(a, Math.min(b, v));

export function sceneHook(sc, sid, sfx) {
  const L = sc.lines, maxLen = Math.max(...L.map((l) => l.text.length));
  const size = Math.floor(cl(Math.min(160, 1700 / (maxLen * 0.56), 820 / (L.length * 1.12)), 72, 160));
  const body = (l) => {
    const t = esc(l.text);
    if (l.accent === true) return `<em>${t}</em>`;
    return typeof l.accent === "string" ? t.replace(esc(l.accent), (m) => `<em>${m}</em>`) : t;
  };
  const html = `<div class="hook" id="${sid}-hk">${L.map((l, i) => `<div class="hl" id="${sid}-h${i}" style="font-size:${size}px">${body(l)}</div>`).join("")}</div>`;
  const tw = [];
  L.forEach((l, i) => {
    const t = r3(cueTime(sc, l.cue ?? i / L.length));
    tw.push(`tl.fromTo("#${sid}-h${i}",{opacity:0,y:90,scale:1.22,filter:"blur(14px)"},{opacity:1,y:0,scale:1,filter:"blur(0px)",duration:0.42,ease:"power4.out"},${t});`);
    if (i) tw.push(`tl.to("#${sid}-h${i - 1}",{opacity:0.45,duration:0.3},${t});`);
    sfx.push({ t, file: "pop.mp3", vol: 0.2 });
  });
  return { html, tw };
}

export function sceneChapter(sc, sid, sfx) {
  const n = String(sc.n).padStart(2, "0"), t = sc.t0;
  const html = `<div class="chap"><div class="kicker" id="${sid}-ck">Chapter</div><div class="cnum" id="${sid}-cn">${esc(n)}</div><div class="cline" id="${sid}-cb"></div><div class="ctitle" id="${sid}-ct">${hlInline(sc.title)}</div></div>`;
  sfx.push({ t: r3(t + 0.15), file: "whoosh.mp3", vol: 0.14 });
  return { html, tw: [
    `tl.fromTo("#${sid}-ck",{opacity:0,x:-20},{opacity:1,x:0,duration:0.4},${r3(t + 0.1)});`,
    `tl.fromTo("#${sid}-cn",{opacity:0,scale:1.4,x:-40},{opacity:1,scale:1,x:0,duration:0.5,ease:"power4.out"},${r3(t + 0.15)});`,
    `tl.fromTo("#${sid}-cb",{scaleX:0},{scaleX:1,duration:0.6,ease:"power3.inOut"},${r3(t + 0.4)});`,
    `tl.fromTo("#${sid}-ct",{opacity:0,y:50},{opacity:1,y:0,duration:0.55,ease:"power3.out"},${r3(t + 0.55)});`,
  ] };
}

export function sceneQuiz(sc, sid, sfx) {
  const pause = sc.pause ?? 3, opts = sc.options || [], C = 2 * Math.PI * 80;
  const ai = typeof sc.answer === "number" ? sc.answer : opts.indexOf(sc.answer);
  const tp = r3(sc.t0 + LEAD + sc.vo), tr = r3(tp + pause);
  const letter = (i) => String.fromCharCode(65 + i);
  const nums = Array.from({ length: pause }, (_, k) => pause - k);
  let html = `<div class="quiz" id="${sid}-qz"><div class="qbadge">QUIZ</div><div class="qq" id="${sid}-qq">${hlInline(sc.q)}</div>`;
  if (opts.length) html += `<div class="opts">${opts.map((o, i) => `<div class="opt" id="${sid}-o${i}"><b>${letter(i)}</b><span>${hlInline(o)}</span></div>`).join("")}</div>`;
  else html += `<div class="think" id="${sid}-th">Pause and think...</div><div class="ans" id="${sid}-an">${hlInline(String(sc.answer))}</div>`;
  if (pause > 0) html += `<div class="ring" id="${sid}-cd"><svg width="220" height="220" viewBox="0 0 220 220"><circle cx="110" cy="110" r="80" class="rbg"/><circle cx="110" cy="110" r="80" class="rfg" id="${sid}-cd-fg" stroke-dasharray="${r3(C)}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/></svg>${nums.map((k) => `<div class="cn" id="${sid}-cn${k}">${k}</div>`).join("")}</div>`;
  html += "</div>";
  const tw = [`tl.fromTo("#${sid}-qq",{opacity:0,y:30},{opacity:1,y:0,duration:0.6,ease:"power3.out"},${r3(sc.t0 + 0.2)});`];
  if (opts.length) tw.push(`tl.fromTo("#${sid}-qz .opt",{opacity:0,y:30,scale:0.94},{opacity:1,y:0,scale:1,duration:0.45,stagger:0.18,ease:"back.out(1.5)"},${r3(cueTime(sc, sc.optCue ?? 0.35))});`);
  else tw.push(`tl.fromTo("#${sid}-th",{opacity:0},{opacity:1,duration:0.5},${r3(cueTime(sc, sc.optCue ?? 0.35))});`);
  if (pause > 0) {
    tw.push(`tl.fromTo("#${sid}-cd",{opacity:0,scale:0.6},{opacity:1,scale:1,duration:0.4,ease:"back.out(2)"},${r3(Math.max(sc.t0 + 0.2, tp - 0.3))});`);
    tw.push(`tl.fromTo("#${sid}-cd-fg",{strokeDashoffset:0},{strokeDashoffset:${r3(C)},duration:${pause},ease:"none"},${tp});`);
    nums.forEach((k, j) => {
      const a = r3(tp + j);
      tw.push(`tl.set("#${sid}-cn${k}",{opacity:1},${a});tl.fromTo("#${sid}-cn${k}",{scale:1.5},{scale:1,duration:0.35,ease:"power3.out"},${a});tl.set("#${sid}-cn${k}",{opacity:0},${r3(a + 0.98)});`);
      sfx.push({ t: a, file: "click.mp3", vol: 0.18 });
    });
    tw.push(`tl.to("#${sid}-cd",{opacity:0,scale:0.8,duration:0.3},${tr});`);
  }
  if (opts.length) {
    tw.push(`tl.to("#${sid}-qz .opt",{opacity:0.3,duration:0.3},${tr});`);
    if (ai >= 0) tw.push(`tl.to("#${sid}-o${ai}",{opacity:1,scale:1.04,borderColor:"#aad94c",backgroundColor:"#1b2b12",boxShadow:"0 0 50px 6px rgba(170,217,76,0.5)",duration:0.4,ease:"back.out(2)"},${tr});`);
  } else tw.push(`tl.to("#${sid}-th",{opacity:0,duration:0.2},${tr});tl.fromTo("#${sid}-an",{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.45,ease:"back.out(2)"},${tr});`);
  sfx.push({ t: tr, file: "sparkle.mp3", vol: 0.18 });
  return { html, tw };
}

export function sceneChart(sc, sid, sfx) {
  const B = sc.bars, n = B.length, max = Math.max(...B.map((b) => b.value));
  const slot = 1600 / n, bw = Math.min(220, slot * 0.62), base = 780, maxH = 460;
  const step = B.every((b) => Number.isInteger(b.value)) ? 1 : 0.1;
  let html = `<div class="cbase" style="left:140px;top:${base}px;width:1640px"></div>`;
  const tw = [`tl.fromTo("#${sid}-cbase",{scaleX:0},{scaleX:1,duration:0.6,ease:"power2.out"},${r3(sc.t0 + 0.15)});`];
  html = html.replace('class="cbase"', `class="cbase" id="${sid}-cbase"`);
  B.forEach((b, i) => {
    const cx = 160 + slot * (i + 0.5), H = Math.max(10, (b.value / max) * maxH), t = r3(cueTime(sc, b.cue ?? i / n));
    html += `<div class="cb ${b.tone || "blue"}" id="${sid}-b${i}" style="left:${r3(cx - bw / 2)}px;width:${r3(bw)}px;bottom:${1080 - base}px;height:0"><div class="bv" id="${sid}-b${i}-v"><span id="${sid}-b${i}-n">0</span>${sc.unit ? `<small>${esc(sc.unit)}</small>` : ""}</div></div>`;
    html += `<div class="cx" id="${sid}-x${i}" style="left:${r3(cx - slot / 2)}px;top:${base + 22}px;width:${r3(slot)}px">${hlInline(b.label)}</div>`;
    tw.push(`tl.fromTo("#${sid}-b${i}-v,#${sid}-x${i}",{opacity:0},{opacity:1,duration:0.4},${t});`);
    tw.push(`tl.fromTo("#${sid}-b${i}",{height:0},{height:${r3(H)},duration:0.9,ease:"power3.out"},${t});`);
    tw.push(`tl.fromTo("#${sid}-b${i}-n",{innerText:0},{innerText:${b.value},duration:0.9,ease:"power3.out",snap:{innerText:${step}}},${t});`);
    sfx.push({ t, file: "pop.mp3", vol: 0.16 });
  });
  return { html, tw };
}

// ---------- diagram macros: array / list / tree / stack -> normal items (+arrows) ----------
export function expandMacros(sc) {
  const items = [], arrows = [];
  for (const it of sc.items || []) {
    const m = it.array || it.list || it.tree || it.stack;
    if (!m) { items.push(it); continue; }
    const id = (k) => `${m.id}${k}`, cue = (k) => m.cues?.[k] ?? m.cue;
    const node = (k, x, y, w, h, o) => items.push({ id: id(k), x: r3(x), y: r3(y), w, h, tone: m.tone || "blue", cue: cue(k), ...o });
    if (it.array) {
      const v = m.values, n = v.length, gap = 20, w = Math.min(160, (1600 - gap * (n - 1)) / n), x0 = m.x ?? 960 - (n * w + (n - 1) * gap) / 2;
      v.forEach((val, k) => node(k, x0 + k * (w + gap), m.y ?? 420, w, w, { text: String(val), label: String(k), size: 56 }));
    } else if (it.list) {
      const v = m.values, n = v.length, gap = 90, w = Math.min(220, (1600 - gap * (n - 1)) / n), x0 = m.x ?? 960 - (n * w + (n - 1) * gap) / 2;
      v.forEach((val, k) => { node(k, x0 + k * (w + gap), m.y ?? 420, w, 140, { text: String(val), size: 48 }); if (k) arrows.push({ from: id(k - 1), to: id(k), cue: cue(k), tone: m.arrowTone }); });
    } else if (it.tree) {
      const N = m.nodes, kids = N.map(() => []), roots = [];
      N.forEach(([, p], k) => (p === null || p < 0 ? roots : kids[p]).push(k));
      const X = [], D = [], hg = 170, vg = 190; let slot = 0;
      const place = (k, d) => { D[k] = d; if (!kids[k].length) X[k] = slot++ * hg; else { kids[k].forEach((c) => place(c, d + 1)); X[k] = (X[kids[k][0]] + X[kids[k].at(-1)]) / 2; } };
      roots.forEach((r) => place(r, 0));
      const cx = m.x ?? 960, off = cx - (Math.min(...X) + Math.max(...X)) / 2;
      N.forEach(([val, p], k) => { node(k, X[k] + off - 65, (m.y ?? 240) + D[k] * vg, 130, 130, { text: String(val), size: 52 }); if (p !== null && p >= 0) arrows.push({ from: id(p), to: id(k), cue: cue(k), tone: m.arrowTone }); });
    } else { // stack: values[0] is the bottom, y = top of the bottom box
      const h = 100;
      m.values.forEach((val, k) => node(k, m.x ?? 810, (m.y ?? 800) - k * (h + 10), 300, h, { text: String(val), size: 44 }));
    }
  }
  return { items, arrows };
}
