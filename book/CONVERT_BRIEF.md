# Convert ASCII diagrams in one chapter to TikZ (cppviz)

Goal: every ASCII picture in a ```text block becomes a real drawing. Do NOT change prose, code, or answer boxes.

## Two kinds of ```text blocks
1. **Program output** (follows a code block, "prints", "Output:", compiler errors, terminal text):
   change only the fence: ```text -> ```output . Leave content as is.
2. **Diagrams** (boxes, arrows, STACK/HEAP, tables of memory, timelines, flows): replace the whole block with
   a raw LaTeX block:
   ````
   ```{=latex}
   \begin{memdiagram}
   ...macros...
   \end{memdiagram}
   ```
   ````
   If a block is plain prose/list-like text that is neither (e.g. a rule list), leave it as ```text.

## Macros (book/tools/cppviz.sty, units cm, tones: stack heap ok bad data plain)
- `\cell[tone]{id}{x,y}{small label above}{value}` box 1.9x0.85cm. Label may be empty `{}`.
- `\widecell[tone]{id}{x,y}{width}{label}{value}`
- `\region[tone]{id}{x,y}{w,h}{TITLE}` dashed area, (x,y) = bottom-left. Put it around its cells with ~0.4 padding, leave 0.5 above top cell for labels.
- `\ptr[tone]{fromid}{toid}`, `\ptrbend[tone]{a}{b}{left}`, `\ptrlabel[tone]{a}{b}{text}`
- Anchors allowed: `p.east`, `v.north`, etc.
- `\freed{id}` red X over a cell (deleted memory).
- `\vznote[tone]{x,y}{text}` small caption text (use `\\` for line breaks).
- `\arraycells[tone]{id}{x,y}{10,20,30}{label}` contiguous cells id-0,id-1..., 1.1cm apart, index under each.
- `\vcells[tone]{id}{x,y}{a,b,c}{label}` vertical stack, id-0 on top, 0.85cm apart (good for call stacks, vtables).
- `\flowchain{Step/sub, Step/sub, ...}` left-to-right pipeline (max 5 steps).
- Plain TikZ is allowed too: `\node[vzcell=data] (x) at (0,0) {..};`, `\draw[vzptr=bad] ...`.
Rules: width max ~14cm (x from -1.5 to 12.5). Escape `_ # & % { }` in labels (`\_`, `\#`, `\&`). Write `->` in text as `->` inside `\texttt{}` is fine; `~` must be `\textasciitilde{}`. `<`/`>` in labels use `\textless{}`/`\textgreater{}`. Values like `0x5f20`, `nullptr` are fine. Keep it faithful to what the ASCII showed; you may make it clearer.
Example: stack pointer to heap int, then freed:
```
\begin{memdiagram}
\region[stack]{s}{-1.3,-0.8}{2.6,1.9}{STACK}
\region[heap]{h}{2.4,-0.8}{2.6,1.9}{HEAP}
\cell[stack]{p}{0,0}{int* p}{0x5f20}
\cell[heap]{v}{3.7,0}{@0x5f20}{42}
\ptr{p}{v}
\freed{v}
\vznote[bad]{3.7,-1.2}{deleted: p dangles}
\end{memdiagram}
```

## Verify (required)
`cd /stuff/Study/cpp-videos/book && bash tools/onechap.sh chNN-*.md` builds /tmp/chNN.pdf and pngs /tmp/chNN-*.png.
Fix every LaTeX error. Then LOOK at the PNG pages that contain diagrams (Read tool) and fix overlaps, clipped
text, arrows crossing labels, or anything not matching the prose. Then `python3 tools/checkcode.py chNN-*.md`
must report nothing new (it now compares against ```output blocks too).
Report: number converted to diagrams, number retagged output, any doubts.
