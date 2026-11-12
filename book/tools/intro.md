# How to Read This Book {-}

This book is written for someone who knows nothing about C++ yet. Read it from the start: every chapter builds on the ones before it, and every new word is explained the first time it appears.

Each chapter teaches ideas with small, complete programs. Type them in and run them if you can; seeing the output yourself is the fastest way to learn.

Along the way you will see three kinds of boxes:

::: answer
**The blue box** is what you would say in an interview. Every one of the 100 questions has exactly one. They are numbered, and the Question Index at the back tells you where each one is.
:::

::: tip
**Green boxes** are good habits and helpful shortcuts.
:::

::: warning
**Orange boxes** are common mistakes, and the trick questions interviewers like to ask.
:::

Memory is drawn as simple boxes and arrows, like this:

```{=latex}
\begin{memdiagram}
\region[stack]{s}{-1.3,-0.8}{2.6,1.9}{STACK}
\region[heap]{h}{2.4,-0.8}{2.6,1.9}{HEAP}
\cell[stack]{p}{0,0}{int* p}{0x5f20}
\cell[heap]{v}{3.7,0}{@0x5f20}{42}
\ptr{p}{v}
\end{memdiagram}
```

That picture means: a pointer called `p` lives on the stack, and it holds the address of a number `42` that lives on the heap. By the end of Chapter 3, pictures like this will feel natural.
