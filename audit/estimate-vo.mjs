// ponytail: fast audit narration — durations from word count (2.7 w/s, measured on dsa-03) + silent wavs.
// No hash is written, so the real tts.py run (render time) regenerates every scene.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = path.join(spec.id, "assets", "vo"); fs.mkdirSync(out, { recursive: true });
const meta = {};
spec.scenes.forEach((sc, i) => {
  if (!sc.say) return;
  const dur = Math.round((sc.say.split(/\s+/).length / 2.7 + 0.3) * 1000) / 1000;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(dur), path.join(out, `s${i}.wav`)]);
  meta[`s${i}`] = { dur };
});
fs.writeFileSync(path.join(out, "durations.json"), JSON.stringify(meta, null, 1));
console.log(`${spec.id}: estimated narration for ${Object.keys(meta).length} scenes`);
