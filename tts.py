# Usage: .venv/bin/python tts.py scripts/q01.json
# Writes qNN/assets/vo/sK.wav per scene + qNN/assets/vo/durations.json. Skips scenes whose text is unchanged.
import json, sys, os, hashlib
import soundfile as sf
from kokoro_onnx import Kokoro

M = os.path.expanduser("~/.cache/hyperframes/tts")
kokoro = Kokoro(f"{M}/models/kokoro-v1.0.onnx", f"{M}/voices/voices-v1.0.bin")

for path in sys.argv[1:]:
    spec = json.load(open(path))
    out = os.path.join(spec["id"], "assets", "vo")
    os.makedirs(out, exist_ok=True)
    meta_path = os.path.join(out, "durations.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    voice, speed = spec.get("voice", "am_michael"), spec.get("speed", 1.0)
    for i, sc in enumerate(spec["scenes"]):
        text = sc["say"]
        h = hashlib.md5(f"{voice}{speed}{text}".encode()).hexdigest()
        key = f"s{i}"
        wav = os.path.join(out, key + ".wav")
        if meta.get(key, {}).get("hash") == h and os.path.exists(wav):
            continue
        samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
        sf.write(wav, samples, sr)
        meta[key] = {"hash": h, "dur": round(len(samples) / sr, 3)}
        print(path, key, meta[key]["dur"], flush=True)
    json.dump(meta, open(meta_path, "w"), indent=1)
