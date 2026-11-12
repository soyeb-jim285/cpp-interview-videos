// Shared helpers for build.mjs and scenes-v2.mjs.
export const LEAD = 0.45, TAIL = 0.8;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const r3 = (n) => Math.round(n * 1000) / 1000;
// `code` inside backticks in prose cells
export const hlInline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

// Map a cue (substring of sc.say, or 0..1 fraction of the voice) to absolute seconds.
export function cueTime(sc, cue) {
  if (cue === undefined || cue === null) return sc.t0 + LEAD;
  if (typeof cue === "number") return sc.t0 + LEAD + cue * sc.vo;
  const i = sc.say.toLowerCase().indexOf(cue.toLowerCase());
  if (i < 0) throw new Error(`cue "${cue}" not in: ${sc.say}`);
  return sc.t0 + LEAD + (i / sc.say.length) * sc.vo;
}

// Raw (pre-floor) auto-fit font sizes; build clamps to 32, validate fails below the floor.
export const panelFont = (p, pw, area) => {
  const lines = p.code.replace(/\n$/, "").split("\n"), maxC = Math.max(...lines.map((l) => l.length), 20);
  return Math.floor(Math.min(p.size || 46, (pw - 150) / (maxC * 0.61), (area.h - 90) / (lines.length * 1.55)));
};
export const boxFont = (b, vals) => Math.floor(Math.min(b.size || 40, (b.w - 28) / (Math.max(...vals.map((v) => String(v).replace(/`/g, "").length), 1) * 0.62)));

// Shared code-panel layout (build + lint). Content band is y 190..900 (title above, caption band below).
export const BAND = { y: 190, h: 710 };
export function codeLayout(sc) {
  const panels = sc.panels || [], isCode = sc.type === "code", out = sc.output;
  const outH = out && out.y === undefined ? 36 + (1 + out.text.split("\n").length) * 48 : 0; // terminal box height at 32px/1.5
  const h = out ? 560 : BAND.h; // font budget unchanged; the block is centered, not shrunk
  const area = { x: isCode ? 160 : 120, y: BAND.y, w: isCode ? 1600 : 840, h, ...sc.area };
  const pw = (area.w - 40 * (panels.length - 1)) / (panels.length || 1);
  const raw = panels.map((p) => panelFont(p, pw, area)), fonts = raw.map((r) => Math.max(32, r));
  const n = panels.map((p) => p.code.replace(/\n$/, "").split("\n").length), ph = (k) => n[k] * Math.round(fonts[k] * 1.55) + 96;
  // shrink (floor 32) until panels + terminal end above the caption band (y 900)
  const room = BAND.y + BAND.h - (sc.area?.y ?? BAND.y) - (outH ? 30 + outH : 0);
  panels.forEach((p, k) => { while (fonts[k] > 32 && ph(k) > room) fonts[k]--; });
  const hs = panels.map((p, k) => ph(k));
  const total = Math.max(0, ...hs) + (outH ? 30 + outH : 0);
  if (sc.area?.y === undefined) area.y = BAND.y + Math.max(0, (BAND.h - total) / 2); // center the block in the band
  return { area, pw, raw, fonts, total, outH, bottom: area.y + total, fit: sc.area?.y === undefined && !sc.area?.h };
}
// Rendered-width estimate (px) of a one-line string at font size fs (Inter ~0.55 em/char avg, bold a bit wider).
export const textW = (s, fs, bold) => String(s).replace(/`/g, "").length * fs * (bold ? 0.6 : 0.56);
// Compare-table sizing (build + lint): few rows scale up; shrink row padding, then font (floor 32), until the grid fits y 190..900 (710 px).
export function tableFit(sc) {
  const R = sc.rows.length, nh = sc.heads.length, rh = !!sc.rowHeads, nc = nh + (rh ? 1 : 0);
  const colW = (1600 - (rh ? 300 : 0) - 18 * (nc - 1)) / nh - 54, lines = (t, w, fs, b) => Math.max(1, Math.ceil(textW(t, fs, b) / (w * 0.92)));
  const big = R <= 3, small = R >= 6, rf = big ? 40 : 32;
  const total = (cf, cp) => (lines(sc.heads.reduce((a, h) => (h.length > a.length ? h : a), ""), colW, cf, 1) * cf * 1.25 + 28) + sc.rows.reduce((a, row, i) =>
    a + 14 + Math.max(...row.map((c) => lines(c, colW, cf) * cf * 1.3 + 2 * cp + 2), rh ? lines(sc.rowHeads[i], 280, rf, 1) * rf * 1.25 + 2 * cp : 0), 0);
  let cf = big ? 46 : small ? 34 : 40, cp = big ? 40 : small ? 18 : 28;
  for (let f = cf; f >= 32; f -= 2) for (let p = cp; p >= 12; p -= 2) if (total(f, p) <= BAND.h) return { cf: f, cp: p, rf, total: total(f, p), ok: true };
  return { cf: 32, cp: 12, rf, total: total(32, 12), ok: false };
}
// Diagram geometry shared by build and lint.
// Point on box b's border (incl. its label above) toward (tx,ty).
const edge = (b, tx, ty) => {
  const top = b.y - (b.label && !b.region ? 46 : 0), h = b.y + b.h - top;
  const cx = b.x + b.w / 2, cy = top + h / 2, dx = tx - cx, dy = ty - cy;
  const s = Math.min(Math.abs((b.w / 2 + 6) / (dx || 1e-9)), Math.abs((h / 2 + 6) / (dy || 1e-9)));
  return [cx + dx * s, cy + dy * s];
};
export function arrowGeo(a, A, B) {
  const [bx, by] = [B.x + B.w / 2 + (a.dx || 0), B.y + B.h / 2 + (a.dy || 0)];
  const [x1, y1] = edge(A, bx, by), [x2, y2] = edge(B, A.x + A.w / 2, A.y + A.h / 2);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const qx = mx + (-(y2 - y1) / L) * (a.bend || 0), qy = my + ((x2 - x1) / L) * (a.bend || 0);
  const side = Math.abs(x2 - x1) < Math.abs(y2 - y1); // vertical-ish arrows put the label to the right of the curve
  const w = a.label ? textW(a.label, 32, true) : 0;
  const lab = side ? { x: qx + 22, y: qy + 9 - 32, w, h: 40 } : { x: qx - w / 2, y: qy - 16 - 32, w, h: 40 };
  return { x1, y1, x2, y2, qx, qy, side, lab };
}
// Auto-zoom transform of the diagram stage (scales items to fill the area); null when not zoomed.
export function stageOf(sc) {
  const boxes = Object.fromEntries((sc.items || []).map((b) => [b.id, b]));
  const its = [...(sc.items || []), ...(sc.changes || []).filter((c) => c.move && boxes[c.id]).map((c) => ({ ...boxes[c.id], x: c.move[0], y: c.move[1] }))];
  if (!its.length || sc.noZoom) return null;
  const x0 = Math.min(...its.map((b) => b.x)) - 20, x1 = Math.max(...its.map((b) => b.x + b.w)) + 20;
  const y0 = Math.min(...its.map((b) => b.y - (b.label && !b.region ? 50 : b.region ? 30 : 0))) - 10, y1 = Math.max(...its.map((b) => b.y + b.h + (b.sub ? 10 : 0))) + 30;
  const A = sc.panels ? { x: 120 + (sc.area?.w ?? 840) + 50, y: 180, w: 1800 - (120 + (sc.area?.w ?? 840) + 50), h: 730 } : { x: 110, y: 180, w: 1700, h: 740 };
  const k = Math.max(1, Math.min(A.w / (x1 - x0), A.h / (y1 - y0), sc.panels ? 1.35 : 1.6));
  return { k, tx: A.x + (A.w - (x1 - x0) * k) / 2 - x0 * k, ty: A.y + (A.h - (y1 - y0) * k) / 2 - y0 * k, x0, x1, y0, y1 };
}
export const noteW = (n) => textW(n.text || "", 32, true) + 44;
