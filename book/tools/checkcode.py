# Compile + run every ```cpp block that has main(); compare stdout with the next ```text block (if it is
# within 6 lines after). Usage: python3 tools/checkcode.py ch04-owning-memory.md [...]
import re, subprocess, sys, tempfile, os

BLOCK = re.compile(r"```(\w+)\n(.*?)```", re.S)
HDRS = "#include <bits/stdc++.h>\nusing std::cout; using std::endl;\n"

for path in sys.argv[1:]:
    text = open(path).read()
    blocks = [(m.group(1), m.group(2), m.start(), m.end()) for m in BLOCK.finditer(text)]
    for i, (lang, code, s, e) in enumerate(blocks):
        if lang != "cpp" or "main(" not in code:
            continue
        line = text.count("\n", 0, s) + 1
        expected = None
        if i + 1 < len(blocks) and blocks[i + 1][0] in ("text", "output"):
            gap = text[e:blocks[i + 1][2]]
            if gap.count("\n") <= 6 and re.search(r"output|print|prints|shows|you.ll see|result", gap, re.I):
                expected = blocks[i + 1][1].strip()
        with tempfile.TemporaryDirectory() as d:
            src, exe = os.path.join(d, "a.cpp"), os.path.join(d, "a")
            open(src, "w").write(HDRS + code)
            c = subprocess.run(["g++", "-std=c++20", "-w", "-pthread", src, "-o", exe], capture_output=True, text=True)
            if c.returncode:
                first = next((l for l in c.stderr.splitlines() if "error" in l), c.stderr[:150])
                print(f"{path}:{line}: COMPILE FAIL  {first.split('a.cpp:')[-1][:150]}")
                continue
            if expected is None:
                continue
            r = subprocess.run([exe], capture_output=True, text=True, timeout=10, input="0\n")
            got = r.stdout.strip()
            if got != expected and not any(w in code for w in ("rand", "thread", "async", "&x", "address", "%p")):
                print(f"{path}:{line}: OUTPUT MISMATCH\n   expected: {expected[:200]!r}\n   got:      {got[:200]!r}")
print("check done")
