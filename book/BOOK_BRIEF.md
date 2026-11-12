# Writing one chapter of "C++ From Zero" (a beginner's book)

The reader knows NOTHING about C++ and maybe little about programming. They want to genuinely understand,
and to be able to answer every interview question in this chapter. This is a book to read start to finish,
not a Q&A list.

## Sources of truth
- `../scripts/qNN.json` for each question in your chapter. These were fact-checked and their code was compiled.
  Reuse their examples, outputs and caveats. Do NOT invent facts beyond them; if you add an example, keep it
  simple and certainly correct for standard C++17 on GCC/Clang. Never guess program output.
- `../BRIEF.md` is for videos; ignore its narration rules. Your text uses normal C++ notation (`std::vector`, `nullptr`, `p->x`).

## Style
- Write like a patient friend. Short sentences. Short paragraphs (2–4 sentences). Plain words.
- Define every term the first time it appears, in **bold**. Never use a term before defining it.
- Build up: each section starts from what the reader already knows (earlier chapters exist; you may refer back by name).
- Use everyday analogies (houses and addresses, labels on boxes, library cards...), then the real thing.
- EVERY concept gets a small, complete code example, then what it prints, then a line-by-line walk-through.
- Draw memory as ASCII diagrams in `text` code blocks, e.g.

  ```text
  STACK                HEAP
  +--------+          +------+
  | p  ----|--------->|  42  |
  +--------+          +------+
  ```
- Point out the common mistakes and the "trap" follow-up interviewers ask.
- No fluff, no hype, no emojis.

## Format (Pandoc Markdown → PDF)
- One file: `book/chNN-<slug>.md` (NN given in your task). Start with `# Chapter title`.
- `##` sections, `###` subsections. Follow the order of the questions unless a different order teaches better.
- Code blocks fenced with ```cpp (or ```text for diagrams/output, ```bash for commands). Keep code lines ≤ 70 chars.
- After the material that covers a question, add an interview answer box, exactly in this form:

  ::: answer
  **Q18. What is the difference between `malloc()` and `new`?**

  Two to six sentences: the answer you would say in an interview, in plain words.
  :::

  Every question in your chapter must get exactly one answer box. Number them as given.
- Optional tip boxes: `::: tip` … `:::` and warning boxes: `::: warning` … `:::` (one short paragraph each).
- End the chapter with `## Chapter summary`: 5–10 bullet points.
- Length: roughly 700–1100 words per question, including code. Quality over length.
- Do not use HTML, raw LaTeX, tables wider than 3 columns, or images.

## Before you finish
Re-read your chapter as the beginner. Every term defined before use? Every question answered in a box?
Every code sample correct and its output real? Then report: the file path and any doubts.
