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
