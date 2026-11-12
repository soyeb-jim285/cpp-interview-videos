# Appendix: every question -> chapter where its answer box lives.
import glob, re
print("# Appendix: Question Index\n")
print("Find the answer to any question quickly. Each one is in the blue *Interview answer* box in the chapter shown.\n")
for f in sorted(glob.glob("ch*.md")):
    text = open(f).read()
    chap = re.search(r"^# (.+)$", text, re.M).group(1)
    qs = re.findall(r"\*\*Q(\d+)\.\s*(.+?)\*\*", text)
    if not qs: continue
    print(f"**{chap}**\n")
    for n, q in qs: print(f"- Q{n}. {q}")
    print()
