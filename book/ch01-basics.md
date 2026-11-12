# Chapter 1 — What C++ Is and How a Program Runs

This chapter is your first step. You will learn what a program is, how the
text you type becomes something a computer runs, and then answer eight
common interview questions. Read it from start to finish. Each section
uses ideas from the ones before it.

## Before we start: programs, source code, compilers

A **program** is a list of instructions for a computer. The computer
follows them one by one. A program can open a window, add numbers, or
print a line of text.

You write a program as text, in a **programming language**. The text is
called **source code**. C++ is one programming language. You save C++
source code in a **source file**, and its name usually ends in `.cpp`.

The computer cannot run source code directly. Its processor only
understands **machine code**, long patterns of 0s and 1s. A **compiler**
is a program that reads your source code and translates it into machine
code. Think of it as a translator between you and the processor.

The output of the compiler is an **executable**, a program the computer
can start and run.

### Your first program

Here is the classic first program. It prints one line of text.

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, world!\n";
    return 0;
}
```

Compile it and run it from a terminal:

```bash
g++ hello.cpp -o hello
./hello
```

It prints:

```output
Hello, world!
```

Now the code, line by line.

- `#include <iostream>` pastes in a **header file**. A header file is a
  file of declarations, which means it tells the compiler what names
  exist. `iostream` declares the tools for input and output.
- `int main() {` starts a **function** named `main`. A **function** is a
  named block of instructions. Every C++ program starts running at `main`.
  The braces `{` and `}` mark where the function starts and ends.
- `int` is a **type**: the kind of value something holds. Here it says
  that `main` gives back a whole number.
- `std::cout << "Hello, world!\n";` is one **statement**, a single
  instruction. It ends with a semicolon `;`. `std::cout` is the standard
  output stream, the way to send text to the screen. The `<<` arrow sends
  the text to it. `std::` says that `cout` lives in the **namespace**
  `std`, a named group of names that the standard library uses. The `\n`
  means "new line".
- `return 0;` ends `main` and reports success to the operating system.
  The operating system is the software that manages your computer.

::: tip
Add `-std=c++17 -Wall -Wextra` to the compile command. For example,
`g++ -std=c++17 -Wall -Wextra hello.cpp -o hello`. This asks the compiler
to check your code more strictly and to warn you about suspicious lines.
:::

## Variables, addresses and pointers, from zero

Some later questions use **pointers**. Before we meet them, we need three
simple ideas.

A **variable** is a named box in memory that holds a value. Memory is the
part of the computer where data lives while a program runs. Each variable
has a **type** that says what kind of value it holds. The type `int` holds
whole numbers.

```cpp
int age = 30;   // a box named age, holding 30
```

Memory is made of many numbered slots, one per byte. A byte is a small
unit of storage. Each box sits in one or more of these slots. The number
of a slot is its **address**. An address is to memory what a house number
is to a street. It tells you where something is.

A **pointer** is a variable that holds an address. It does not hold the
value 30. It holds the location of the box that contains 30.

Two small operators go with pointers:

- `&` means **address of**. `&age` is the address of `age`.
- `*` means **dereference**, or "follow the address". If `p` holds an
  address, `*p` is the value stored at that address.

Here is a complete program:

```cpp
#include <iostream>

int main() {
    int age = 30;
    int* p = &age;   // p holds the address of age

    std::cout << age << "\n";
    std::cout << *p << "\n";
    std::cout << (p == &age) << "\n";
}
```

It prints:

```output
30
30
1
```

Walk through it:

- `int age = 30;` creates the box `age` and puts 30 in it.
- `int* p = &age;` creates a pointer. The `*` after `int` says that `p`
  is a pointer to an `int`. The `&age` stores the address of `age` in `p`.
- The first `cout` prints `age`, which is 30.
- The second `cout` prints `*p`. The pointer leads to `age`, so it is 30.
- The third `cout` compares the pointer with the address of `age`. The
  answer is true, and a true value prints as `1`.

Here is a picture of the same thing. The addresses are made up for the
picture. Your real addresses will be different.

```{=latex}
\begin{memdiagram}
\cell[stack]{age}{0,0}{age}{30}
\cell[stack]{p}{0,-1.6}{p}{0x100}
\draw[vzptr=stack] (p.north) -- (age.south);
\node[vznote=plain] at (-1.6,0.9) {address};
\node[vznote=plain] at (-1.6,0) {0x100};
\node[vznote=plain] at (-1.6,-1.6) {0x108};
\node[vznote=stack, anchor=west] at (1.2,-0.8) {p holds the address of age};
\end{memdiagram}
```

One more word. A pointer that points at nothing has the value
**`nullptr`**. It is the modern way to say "no address here". You will
see it again in Questions 6 and 7.

::: warning
A pointer holds an address, not a value. `p` and `*p` look alike, but
they are different things: `p` is the address, `*p` is the value at that
address. Mixing them up is one of the most common beginner errors.
:::

## 1. C and C++

### C++ began as C with classes

**C** is an older programming language. It is **procedural**. A procedural
program is a list of functions that act on data. C is small, and it stays
close to the hardware.

**C++** is a larger language that includes C. Its designers started with
C and added features. The first added feature was the **class**. A class
is a user-made type that bundles data together with the functions that
use it. C++ then grew to support three styles of programming:
procedural, object-oriented (built around classes), and **generic**
(code written once for many types).

Think of C as a small toolbox. C++ is the same toolbox with many more
drawers. You are free to open only the drawers you need.

### The same stack, written twice

A **stack** here means a simple container where you put items on top and
take them off the top. Here is one written in C. A **struct** is a
grouping of several values under one name, here `data` and `size`.

```c
#include <stdlib.h>

struct Stack { int* data; int size; };

void push(struct Stack* s, int v) {
    s->data[s->size++] = v;
}

int main(void) {
    struct Stack s;
    s.data = malloc(10 * sizeof(int));
    s.size = 0;
    push(&s, 42);
    free(s.data);   /* you must remember */
    return 0;
}
```

This program prints nothing. Walk through it:

- The struct holds a pointer `data` to an array of ints, and a count
  `size`. An **array** is a row of values stored one after another.
- `push` takes a pointer to the stack, because it has to change it. It
  writes `v` into the next free slot.
- `malloc(10 * sizeof(int))` asks the heap, a large pool of memory we
  explain in Question 4, for room for 10 ints. `sizeof(int)` gives the
  number of bytes an int takes.
- `free(s.data)` gives that memory back. If you forget this line, the
  memory is lost until the program ends. That is a **memory leak**.

Now the C++ version of the same idea:

```cpp
#include <vector>

class Stack {
    std::vector<int> data;
public:
    void push(int v) {
        data.push_back(v);
    }
};

int main() {
    Stack s;
    s.push(42);
}   // memory freed automatically
```

Walk through it:

- `class Stack` bundles the data and the function together. The function
  `push` is a **member function**, a function that belongs to the class.
- `std::vector<int>` is a resizable array from the **standard library**,
  the set of ready-made tools that come with C++. The `<vector>` header
  declares it.
- `data.push_back(v)` adds `v` to the end of the vector. The vector looks
  after its own memory, so we never call `malloc` or `free`.
- In `main`, `Stack s;` creates the object. When `s` goes out of scope,
  its **destructor** runs. A destructor is a special function that runs
  when an object ends. The vector's destructor frees its memory. A
  **scope** is the region between a pair of braces where a name is
  visible. When the braces close, the scope ends.

This pattern has a name, **RAII**, which stands for "Resource Acquisition
Is Initialization". It means: an object takes control of a resource, such
as memory or a file, in its **constructor** (the function that sets it
up), and gives it back in its destructor. You get cleanup for free.

### Four features C does not have

Here is one program that uses four features C lacks.

```cpp
#include <iostream>

namespace geo {
    int    area(int side)  { return side * side; }
    double area(double r)  { return 3.14 * r * r; }
}

template <typename T>
T biggest(T a, T b) { return a > b ? a : b; }

void twice(int& x) { x *= 2; }

int main() {
    std::cout << geo::area(3) << "\n";
    std::cout << geo::area(2.0) << "\n";
    int n = 5;
    twice(n);
    std::cout << n << "\n";
    std::cout << biggest(3, 7) << "\n";
    std::cout << biggest(2.5, 1.5) << "\n";
}
```

It prints:

```output
9
12.56
10
7
2.5
```

Walk through it:

- A **namespace** is a named group of names. `geo::area` means "the
  `area` inside `geo`". Two groups can each have their own `area` without
  clashing.
- **Overloading** means two functions share one name but take different
  parameter types. The two `area` functions take an `int` and a `double`.
  The compiler picks the one that matches the call. `area(3)` gives 9,
  and `area(2.0)` gives 12.56.
- A **template** is code with a type placeholder, written as `typename T`.
  The compiler makes a version for each type you use. `biggest(3, 7)`
  makes an `int` version, and `biggest(2.5, 1.5)` makes a `double` one.
- A **reference** is another name for an existing variable. The `&` in
  `int& x` means that `x` is not a copy of `n`, but `n` itself. So
  `twice` changes `n` to 10. Question 6 explains references in full.

### C++ is almost, but not exactly, a superset of C

A **superset** is a bigger language that contains a smaller one. Most
C code is also C++ code, but not all of it. C++ is stricter about types
in some places.

A **keyword** is a word the language reserves for its own use. You cannot
use it as a name. In C++, `class` is a keyword. In C, it is an ordinary
word. Here is C code that breaks in C++:

```c
int* p = malloc(sizeof(int));   // fine in C
int class = 5;                  // fine in C
```

In C++, the first line is an error. `malloc` returns a `void*`, a pointer
of no particular type, and C++ does not convert it to `int*` by itself.
You must write an explicit **cast**, a conversion you write yourself:

```cpp
#include <cstdlib>

int main() {
    int* q = static_cast<int*>(std::malloc(sizeof(int)));
    int klass = 5;     // renamed: class is a keyword
    std::free(q);
    (void)klass;
}
```

The second line in C++ is an error with `class`, so the variable was
renamed to `klass`. The `(void)klass;` line only stops a warning about an
unused variable. Two fixes: add a cast, and choose another name.

### Side by side

Here is the whole picture. An **exception** is an error signal that
jumps out of the current function to a place that handles it. A **return
code** is a number a function gives back to say whether it worked. The
**STL**, the Standard Template Library, is the part of the standard
library with containers such as `vector` and algorithms such as sorting.
A **macro** is a text replacement done before compilation. A **smart
pointer** is a class that owns a pointer and frees it for you.

| Topic | C | C++ |
|---|---|---|
| Style | Procedural: functions and data | Procedural, object-oriented and generic |
| Memory | `malloc` and `free` only | `new` and `delete`, RAII, smart pointers |
| Generic code | Macros and `void*` | Templates, checked by the type system |
| Errors | Return codes | Exceptions, plus return codes |
| Library | Small standard library | STL: containers and algorithms |
| Names | One global namespace | Namespaces and overloading |

::: answer
**Q1. What is the difference between C and C++?**

C is a procedural language with manual memory management, close to the
hardware. C++ includes C and keeps all of that, then adds classes, RAII,
templates, overloading, namespaces, exceptions, and the STL. C++ follows
the **zero overhead** rule: you do not pay for a feature you do not use.
:::

::: warning
Do not say "C++ is C with a few extra keywords". A C++ programmer writes
classes, uses the standard library, and relies on destructors to clean
up. Code written in the C style inside C++ compiles, but it throws away
most of the benefit.
:::

## 2. What happens when you compile and execute a C++ program?

### Our file

Here is the file we will follow. It is a little bigger than Hello World.

```cpp
#include <iostream>
#define GREETING "Hello"

int main() {
    std::cout << GREETING << ", world\n";
    return 0;
}
```

The line `#define GREETING "Hello"` starts with `#`. That makes it a
**preprocessor directive**, an instruction for a helper tool that runs
before the compiler. We meet that helper in a moment. For now, note that
`GREETING` is a macro, as we saw in Question 1: wherever the word
`GREETING` appears, it will be replaced with `"Hello"`.

When you type `g++ hello.cpp -o hello`, it looks like one step. In fact,
four tools run one after another.

### The four stages

```{=latex}
\begin{memdiagram}
\node[vzstep=stack, text width=2.2cm] (pp) at (0,0) {\textbf{Preprocessor}\\[-1pt]{\scriptsize pastes headers, expands macros}};
\node[vzstep=stack, text width=2.2cm] (cc) at (3.9,0) {\textbf{Compiler}\\[-1pt]{\scriptsize C++ to assembly}};
\node[vzstep=stack, text width=2.2cm] (as) at (7.8,0) {\textbf{Assembler}\\[-1pt]{\scriptsize assembly to machine code}};
\node[vzstep=stack, text width=2.2cm] (ld) at (11.7,0) {\textbf{Linker}\\[-1pt]{\scriptsize joins object files and libraries}};
\draw[vzptr=stack] (pp.east) -- node[above, font=\ttfamily\scriptsize]{hello.i} (cc.west);
\draw[vzptr=stack] (cc.east) -- node[above, font=\ttfamily\scriptsize]{hello.s} (as.west);
\draw[vzptr=stack] (as.east) -- node[above, font=\ttfamily\scriptsize]{hello.o} (ld.west);
\vznote[plain]{0,-1.0}{hello.cpp (source)};
\vznote[plain]{11.7,-1.0}{hello (program)};
\end{memdiagram}
```

- The **preprocessor** handles every line that starts with `#`. It pastes
  in the full text of each header, such as `iostream`, and replaces each
  macro with its value. The result is one long text file. For this small
  program, that file has tens of thousands of lines, because the standard
  headers are large.
- The **compiler** reads that text. It checks the syntax (the grammar of
  the language) and the types. Then it translates the C++ into
  **assembly**, a readable form of the processor's instructions, such as
  `call` or `mov`.
- The **assembler** turns assembly into machine code and stores it in an
  **object file**, with the name ending in `.o`. An object file holds the
  machine code for one source file. It may still have gaps, such as
  calls to functions defined elsewhere.
- The **linker** joins all the object files, and the code of any
  **library** you use, into one executable. A library is a ready-made
  collection of compiled code. The code behind `std::cout` lives in one.

You can stop the process at any stage yourself:

```bash
g++ -E hello.cpp -o hello.i    # preprocess only
g++ -S hello.cpp -o hello.s    # stop after compiling (assembly)
g++ -c hello.cpp -o hello.o    # stop after assembling (object file)
g++ hello.o -o hello           # link the object file into a program
./hello
```

The flag `-E` stops after the preprocessor. `-S` stops after the compiler.
`-c` stops after the assembler and creates an object file. Without any of
these flags, `g++` runs all the stages and creates the program. Running
`./hello` prints:

```output
Hello, world
```

### Why the stages matter: reading errors

Knowing the stages tells you which tool reports which error. Here is a
file that declares a function, uses it, and never defines it.

```cpp
int add(int a, int b);   // declared, never defined

int main() {
    return add(2, 3);
}
```

The compiler accepts it. It only needs to know that `add` exists, and the
declaration says so. The linker then looks for the code of `add` and
cannot find it. Compiling this file with `g++ main.cpp -o main` prints:

```output
/usr/bin/ld: ... in function `main':
main.cpp:(.text+0xf): undefined reference to `add(int, int)'
collect2: error: ld returned 1 exit status
```

The text `ld` is the linker. The phrase **undefined reference** means
"something is used but has no definition". Your compiler's exact wording
may differ a little, but the idea is the same.

### Running: the operating system takes over

When you run `./hello`, the **operating system** (the software that runs
your computer) starts a **process**. A process is a running program with
its own memory. A part of the operating system called the **loader**
prepares that memory.

```{=latex}
\begin{memdiagram}
\cell[plain]{disk}{0,0}{disk file}{hello}
\region[plain]{pm}{2.8,-2.9}{5.4,5.3}{PROCESS MEMORY}
\draw[vzptr=plain] (disk.east) -- node[above, font=\sffamily\scriptsize]{loader} (2.6,0);
\widecell[plain]{pt}{5.5,1.2}{4.6}{}{Text : machine code}
\widecell[plain]{pd}{5.5,0.1}{4.6}{}{Data : globals, statics}
\widecell[plain]{ph}{5.5,-0.9}{4.6}{}{Heap : new / malloc}
\widecell[plain]{ps}{5.5,-1.9}{4.6}{}{Stack: calls, locals}
\vznote[plain]{5.5,-3.5}{main() runs, then\\return 0 gives the exit code};
\end{memdiagram}
```

- The **text** part holds the machine code. It is the part of memory
  that holds instructions.
- The **data** part holds global variables, which live for the whole run
  of the program.
- The **heap** and the **stack** are for data your code creates while it
  runs. Question 4 explains them.
- Startup code runs first. It sets up global objects, then calls `main`.
- When `main` returns, its number becomes the **exit code**. It is the
  program's report to the shell, the program that reads your commands.
  By convention, `0` means success.

Check the exit code with `echo $?` right after `./hello`. It prints `0`.

::: answer
**Q2. What happens when you compile and execute a C++ program?**

The compiler driver runs four tools in order. The preprocessor pastes in
headers and expands macros. The compiler checks the code and translates it
to assembly. The assembler turns that into an object file of machine code.
The linker joins the object files and libraries into one executable. When
you run it, the operating system loads it into a new process, sets up its
memory, runs startup code, and calls `main`. The value `main` returns
becomes the exit code.
:::

::: warning
Errors come from different stages. Syntax and type errors come from the
compiler. "undefined reference" and "multiple definition" come from the
linker. When you read an error, first ask which stage printed it.
:::

## 3. Declaration and definition

### A declaration is a sign, a definition is the building

A **declaration** introduces a name and tells the compiler what kind of
thing it is. It says, "this exists somewhere." A **definition** makes it
real: it reserves memory for a variable, writes the body of a function, or
gives the full layout of a class.

Think of a sign that says "bakery on this street" and the bakery itself.
The sign is the declaration. The bakery, with its ovens and shelves, is
the definition. Every definition is also a declaration, but a declaration
does not need a definition to be written in the same place.

Here is one file that uses both.

```cpp
#include <iostream>

extern int count;          // declaration: exists somewhere
int add(int a, int b);     // declaration
struct Point;              // declaration: name only

int count = 0;             // definition: memory reserved
int add(int a, int b) {    // definition: the body
    return a + b;
}
struct Point { int x, y; };  // definition: full layout

int main() {
    Point p{1, 2};
    std::cout << add(2, 3) << " " << count << " ";
    std::cout << p.x + p.y << "\n";
}
```

It prints:

```output
5 0 3
```

Walk through it:

- `extern int count;` declares a variable. The word `extern` means the
  memory is defined somewhere else, or in this file further down.
- `int add(int a, int b);` declares a function. It names the parameters
  and the return type, but has no body.
- `struct Point;` declares a class type by name only. The compiler knows
  that `Point` is a type, but not what it contains yet.
- `int count = 0;` defines the variable. Memory is reserved and set to 0.
- The `add` function gets its body, so it is now defined.
- `struct Point { int x, y; };` gives the full layout. Only now can we
  create a `Point` and read its members `x` and `y`.
- In `main`, `p.x + p.y` is 3, and `add(2, 3)` is 5.

### Why headers exist

In a real project, the code is split into many `.cpp` files. A **header
file**, usually ending in `.h` or `.hpp`, holds declarations that many
files need. Each `.cpp` file, after its includes are pasted in, is one
**translation unit**: the unit the compiler checks at one time.

```{=latex}
\begin{memdiagram}
\node[vzcell=plain, align=center, minimum width=3.6cm, minimum height=1.15cm] (mh) at (-4.4,0) {\textbf{math.h}\\int add(int,int);\\(declaration)};
\node[vzcell=plain, align=center, minimum width=2.8cm, minimum height=0.85cm] (mc) at (0,1.9) {\textbf{main.cpp}\\add(2,3);};
\node[vzcell=plain, align=center, minimum width=2.8cm, minimum height=0.85cm] (oc) at (0,-1.9) {\textbf{other.cpp}\\add(4,5);};
\node[vzcell=plain, align=center, minimum width=3.4cm, minimum height=1.15cm] (md) at (4.6,0) {\textbf{math.cpp}\\int add(int a,\\int b) \{...\}\\(the one definition)};
\node[vzstep=data, text width=2.6cm] (link) at (9.8,0) {\textbf{linker}\\[-1pt]{\scriptsize joins every call to the one definition}};
\draw[vzptr=plain] (mh.north east) -- node[midway, above, sloped, font=\sffamily\scriptsize]{\#include} (mc.west);
\draw[vzptr=plain] (mh.south east) -- node[midway, below, sloped, font=\sffamily\scriptsize]{\#include} (oc.west);
\draw[vzptr=plain] (mc.east) -- (link.north west);
\draw[vzptr=plain] (md.east) -- (link.west);
\draw[vzptr=plain] (oc.east) -- (link.south west);
\end{memdiagram}
```

Each `.cpp` file sees only the declaration, so the compiler can check
every call. Exactly one file holds the definition, so the linker can
connect all the calls to one body.

### The one definition rule

The **one definition rule**, often written **ODR**, says that you may
declare something as many times as you like, but define it exactly once
in the whole program. Break it, and the linker complains. Here is a
mistake in two files.

```cpp
// a.cpp
int counter = 0;
int main() { return counter; }

// b.cpp
int counter = 0;     // a second definition!
```

Compile both with `g++ a.cpp b.cpp -o ab`. The linker stops with this
message:

```output
multiple definition of `counter'
```

The fix is to declare `counter` in a header and define it in one `.cpp`
file. Here is a complete, working version with three files.

```cpp
// counter.h
extern int counter;        // declaration only
void bump();
```

```cpp
// counter.cpp
#include "counter.h"

int counter = 0;           // the one definition
void bump() { ++counter; }
```

```cpp
// main_two.cpp
#include <iostream>
#include "counter.h"

int main() {
    bump();
    bump();
    std::cout << counter << "\n";
}
```

Compile it with `g++ main_two.cpp counter.cpp -o two`. Running `./two`
prints:

```output
2
```

Walk through it: `main_two.cpp` includes the header, so it knows about
`counter` and `bump`. `counter.cpp` holds the only definitions. The
linker joins the two files, so `main`'s calls reach the one `counter`.

### The opposite mistake

You can also declare and call a function, and never define it.

```cpp
void greet(const char* name);   // declared...

int main() {
    greet("Sam");                 // ...called...
}                                // ...never defined
```

The compiler is happy, because the declaration is enough to check the
call. The linker is not. Compiling with `g++ greet_main.cpp` reports:

```output
undefined reference to `greet(char const*)'
```

::: answer
**Q3. What is the difference between declaration and definition?**

A declaration introduces a name and its type: it says the thing exists
somewhere. A definition creates the thing: it reserves memory for a
variable, writes a function body, or gives a class its full layout. You may
declare something many times, but you must define it exactly once in the
program. Headers hold declarations so that many files can share them.
:::

::: tip
If you see "undefined reference", look for a missing definition or a
`.cpp` file that is not part of the build. If you see "multiple
definition", look for a variable or function defined in two `.cpp` files.
:::

## 4. Stack and heap memory

### Two places for your data

When a program runs, its data lives in memory, and two areas are used most.
The **stack** is managed by the compiler. Each function call gets a block
of memory on the stack, called its **frame**. The **heap** is a large pool
of memory that you request and return yourself, with `new` and `delete`
(or with `malloc` and `free`, the C way).

Stack variables end when their scope ends, as we saw in Question 1. Heap
memory lasts until you give it back.

This stack is memory, not the stack data structure from Question 1. The
two only share a name.

### Watch memory while a function runs

Here is a small program that uses both areas.

```cpp
#include <iostream>

void f() {
    int a = 5;                 // a lives in f's stack frame
    int* p = new int(42);      // 42 lives on the heap
    std::cout << a << " " << *p << "\n";
    delete p;                  // give the heap memory back
}                              // a and p disappear here

int main() {
    f();
}
```

It prints:

```output
5 42
```

Here is what happens, in order:

```{=latex}
\begin{memdiagram}
\region[stack]{S}{-2.1,-2.9}{4.2,5.6}{STACK}
\region[heap]{H}{2.4,-2.3}{2.6,2.9}{HEAP}
\region[stack]{F}{-1.6,-2.2}{3.2,3.0}{f() frame}
\widecell[stack]{mainf}{0,1.9}{3.4}{}{main()}
\cell[stack]{a}{0,0.1}{a}{5}
\cell[stack]{p}{0,-1.2}{p}{0x5f20}
\cell[heap]{v}{3.7,-1.2}{at 0x5f20}{42}
\draw[vzptr=stack] (p.east) -- (v.west);
\end{memdiagram}
```

Walk through it:

- Calling `f` pushes a new frame on the stack, on top of the frame of
  `main`.
- `int a = 5;` puts `a` in that frame. It is a plain local variable.
- `new int(42)` asks the heap for room for one `int` and sets it to 42.
  It returns the address of that room, and `p` stores the address. The
  pointer `p` lives in the frame, but the 42 lives on the heap.
- `*p` follows the pointer, so the second value printed is 42.
- `delete p;` returns the heap memory. Without it, the memory would leak.
- When `f` ends, its whole frame disappears. `a` and `p` are gone, but the
  heap memory was already returned by `delete`.

### The rules side by side

| Topic | Stack | Heap |
|---|---|---|
| Managed by | The compiler, automatically | You (`new`/`delete`) or smart pointers |
| Lifetime | Ends with the scope | Until it is freed |
| Speed | Very fast: move one pointer | Slower: the heap must find free space |
| Size | Small, often 1 to 8 MB | Large, most of your RAM |
| Typical bugs | Stack overflow | Leaks, dangling pointers |
| Use for | Small, short-lived locals | Big or long-lived data |

The **allocator** is the part of the runtime that finds free space on the
heap. Searching for room takes time, which is why the heap is slower.

### Size matters

The stack is small. A huge local array can overflow it. A **stack
overflow** happens when a program uses more stack than it has. Here are
two versions of the same idea.

```cpp
#include <iostream>

void bad() {
    int big[10000000];         // about 40 MB, all on the stack
    big[0] = 1;
    big[9999999] = 2;
    std::cout << big[0] + big[9999999] << "\n";
}

int main() {
    bad();
}
```

**Optimization** is the compiler rewriting code to run faster. `-O0`
means no optimization, and `-O2` turns it on. With `g++ -std=c++17 -O0`,
this program
crashes on a Linux machine with the usual 8 MB stack limit. The shell then
reports an exit code of 139, which means a **segmentation fault**: the
program touched memory it was not allowed to use. A compiler with
optimization turned on may move or remove the array, and then the program
may print 3 without crashing. Never rely on either outcome.

The safe version puts the elements on the heap:

```cpp
#include <iostream>
#include <vector>

void good() {
    std::vector<int> big(10000000);   // elements live on the heap
    big[0] = 1;
    big[9999999] = 2;
    std::cout << big[0] + big[9999999] << "\n";
}

int main() {
    good();
}
```

It prints `3`, every time. The `vector` object itself is small and lives
on the stack. Its ten million elements live on the heap, and the vector
frees them when it goes out of scope.

::: warning
After `delete p;`, the pointer `p` still holds the old address, but the
memory it points to has been returned. Such a pointer is called a
**dangling pointer**. Reading or writing through it is **undefined
behavior**: the language makes no promise about what happens, and the
result can look fine one day and fail the next.
:::

::: answer
**Q4. What is the difference between stack and heap memory?**

The stack holds local variables and function frames. The compiler manages
it automatically, it is very fast, it is small, and its data ends with
the scope. The heap is large and flexible. You request memory with `new`
or `malloc`, and it lives until you free it. Forgetting to free causes
leaks, and using freed memory causes dangling pointers. Prefer the stack,
and when you need the heap, use it through `std::vector` or
`std::unique_ptr`, not raw `new`.
:::

::: tip
A local `std::vector` or `std::unique_ptr` gives you heap storage that
frees itself. That is almost always what you want in modern C++.
:::

## 5. static, const and constexpr

**Compile time** is when the compiler runs. **Runtime** is when the
finished program runs. These three keywords look related, but each one
answers a different question. Keep three questions in mind:

- **static**: how long does it live, and who can see it?
- **const**: can it change after it is set?
- **constexpr**: must its value be known at compile time?

### static: how long it lives

A **local variable** is one declared inside a function. An ordinary local
variable is created each time the function runs, and destroyed when it
ends. A `static` local is different: it is created once and keeps its
value between calls.

```cpp
#include <iostream>

int counter() {
    static int calls = 0;   // created once, keeps its value
    return ++calls;
}

int main() {
    counter();
    counter();
    std::cout << counter() << "\n";
}
```

It prints:

```output
3
```

Walk through it:

- `static int calls = 0;` runs its initialization only once, on the first
  call. After that, `calls` keeps its value.
- `++calls` adds one, and `return` gives the new value back.
- `main` calls `counter` three times. The third call returns 3, because
  the variable survived the first two calls.

### static: who can see it

`static` also controls visibility. At file level, it hides a function or
variable from other `.cpp` files. Inside a class, a `static` member
belongs to the class itself, not to any one object.

```cpp
#include <iostream>

static int helper() { return 1; }   // visible only in this file

class Player {
public:
    static int count;               // ONE copy, shared by all players
    Player() { ++count; }
};
int Player::count = 0;

int main() {
    std::cout << helper() << "\n";
    Player a, b, c;
    std::cout << Player::count << "\n";
}
```

It prints:

```output
1
3
```

Walk through it:

- `static int helper()` is a function that only this file can call.
- `static int count;` inside `Player` declares one counter for the whole
  class. Each object does not get its own copy.
- `int Player::count = 0;` defines that counter. This is a definition, so
  it lives outside the class, in one `.cpp` file.
- The constructor `Player()` adds one to `count`. Three objects are
  created, so `Player::count` is 3.

### const: can it change?

A **const** variable is **read-only** after it gets its value. The value
can be fixed when the program runs, not only at compile time. That is
the key difference from `constexpr`, which comes next.

```cpp
#include <iostream>

int main() {
    const int maxUsers = 100;
    // maxUsers = 200;          // compile error: read-only

    int n;
    std::cin >> n;
    const int size = n * 2;    // value known only at runtime
    std::cout << maxUsers << " " << size << "\n";
}
```

Compile it, then run it and type 4 when asked. If you pipe the input, the
command is `echo 4 | ./const`. It prints:

```output
100 8
```

Walk through it:

- `const int maxUsers = 100;` sets a value once. The commented line would
  try to change it, and the compiler would refuse.
- `std::cin >> n;` reads a number from the user, so `n` is not known until
  the program runs.
- `const int size = n * 2;` is legal. A `const` value may be computed at
  runtime. It just cannot change afterwards.

`const` also appears in function parameters, as a promise. Question 6
explains `const T&`.

### constexpr: known at compile time

A **constexpr** value must be computable by the compiler, while it is
compiling. The compiler itself runs the function, and stores the result in
the program.

```cpp
#include <iostream>

constexpr int square(int x) { return x * x; }

constexpr int a = square(8);   // computed by the compiler: 64
int arr[square(3)];            // array of 9 ints, size fixed now
static_assert(a == 64, "a must be 64");

int main() {
    std::cout << a << " " << sizeof(arr) / sizeof(arr[0]) << "\n";
}
```

It prints:

```output
64 9
```

Walk through it:

- `constexpr int square(int x)` is a function the compiler can run while
  compiling, if its inputs are known then.
- `constexpr int a = square(8);` stores 64 in the program. No work happens
  at runtime.
- `int arr[square(3)];` needs a size that is fixed at compile time. Array
  sizes must be known early, so `square(3)` must be a compile-time value.
- `static_assert` checks a condition at compile time. If the condition is
  false, the build fails. Here it confirms that `a` is 64.
- The last line prints `sizeof(arr) / sizeof(arr[0])`, the number of
  elements, which is 9.

If the value depends on input, the compiler refuses. This does not compile:

```cpp
constexpr int square(int x) { return x * x; }

int main() {
    int n;
    constexpr int b = square(n);   // n is not known at compile time
}
```

GCC reports:

```output
error: the value of 'n' is not usable in a constant expression
```

### Side by side

| Keyword | Question it answers | Typical use |
|---|---|---|
| `static` | How long does it live, and who can see it? | Counters, shared class data, file-private helpers |
| `const` | Can it change after it is set? | Parameters you only read, fixed settings |
| `constexpr` | Is it known at compile time? | Array sizes, compile-time math |

Every `constexpr` variable is also `const`. But not every `const` is
`constexpr`. A `static` value can change, while a `const` one cannot.

::: answer
**Q5. What is the difference between `static`, `const`, and `constexpr`?**

`static` controls lifetime and visibility. A static local lives for the
whole program, a static member is shared by the whole class, and a static
at file level is hidden from other files. It has nothing to do with being
constant. `const` means read-only after initialization, and its value may
come from runtime. `constexpr` means the value must be computable at
compile time, and it implies `const`.
:::

::: warning
`static` has different meanings depending on where it stands. Inside a
function it means "keep this between calls". At file level it means "hide
this from other files". Inside a class it means "one copy for the class".
Read the context before you decide what it does.
:::

## 6. Pass by value, reference and pointer

We now know variables, addresses and pointers, from the section before
Question 1. This question is about how a function receives its data.

A function's **parameter** is a name in its declaration, like `x` in
`void addOne(int x)`. An **argument** is the actual value you pass in the
call, like `n` in `addOne(n)`. How the value is passed decides whether the
function can change the caller's variable.

### 1. By value: a copy

**Pass by value** means the function receives a copy. The parameter is a
new variable that starts with the same value.

```cpp
#include <iostream>

void addOne(int x) {
    x = x + 1;          // changes only the copy
}

int main() {
    int n = 5;
    addOne(n);
    std::cout << n << "\n";
}
```

It prints:

```output
5
```

Here is the moment the function runs:

```{=latex}
\begin{memdiagram}
\cell[stack]{n}{0,0}{main()}{n : 5}
\cell[stack]{x}{3.8,0}{addOne()}{x : 5}
\draw[vzptr=plain] (n.east) -- node[above, font=\sffamily\scriptsize]{copy} (x.west);
\vznote[plain]{0,-1.1}{main's n is still 5};
\vznote[plain]{3.8,-1.1}{x = x + 1 makes x 6\\(x is destroyed when addOne returns)};
\end{memdiagram}
```

Walk through it:

- `addOne(n)` copies the 5 in `n` into the new variable `x`.
- `x = x + 1` changes only `x`, the copy.
- When `addOne` returns, `x` disappears. `n` was never touched, so it is
  still 5.

### 2. By reference: an alias

A **reference** is another name for an existing variable. You write it
with `&` after the type, as `int&`. A reference is not a new variable and
holds no separate value. It is an **alias**, another name for the same
object.

```cpp
#include <iostream>

void addOne(int& x) {
    x = x + 1;          // x is another name for n
}

int main() {
    int n = 5;
    addOne(n);
    std::cout << n << "\n";
}
```

It prints:

```output
6
```

Walk through it:

- `int& x` says `x` is a reference to an `int`.
- When `addOne(n)` runs, `x` becomes another name for `n`. Nothing is
  copied.
- `x = x + 1` changes `n` directly, so `n` becomes 6.

### 3. By pointer: a copy of the address

A pointer parameter receives a copy of an address. Inside the function,
you follow the address with `*` to reach the caller's variable.

```cpp
#include <iostream>

void addOne(int* x) {
    *x = *x + 1;        // follow the address, change the target
}

int main() {
    int n = 5;
    addOne(&n);
    std::cout << n << "\n";
}
```

It prints:

```output
6
```

Walk through it:

- `addOne(&n)` passes the address of `n`, not its value.
- `x` is a copy of that address. It is a pointer.
- `*x` means "the value at the address `x` holds", which is `n`. So
  `*x = *x + 1` adds one to `n`.
- The caller writes `&n`, so it is clear that `n` may change.

A pointer can be `nullptr`. Following a null pointer with `*` is a crash.
A careful function checks first:

```cpp
void addOne(int* x) {
    if (x != nullptr) {
        *x = *x + 1;
    }
}
```

### Big read-only objects: const T&

Copying a large object, such as a long string, costs time. When a function
only reads an object, you can pass a **const reference**, written `const
T&`. It avoids the copy, and the `const` promises the function will not
change the object.

```cpp
#include <iostream>
#include <string>

void show(const std::string& s) {
    std::cout << s << " has " << s.size() << " characters\n";
}

int main() {
    std::string name = "Sam";
    show(name);
}
```

It prints:

```output
Sam has 3 characters
```

Walk through it: `show` receives `name` by reference, so no copy of the
string is made. The `const` means that `s` cannot be changed inside
`show`. The compiler enforces that promise.

### Side by side

| Style | What the function gets | Can it change the caller's variable? |
|---|---|---|
| By value: `f(n)` | A copy of the whole object | No |
| By reference: `f(n)` | The object itself, under another name | Yes |
| By pointer: `f(&n)` | A copy of the address | Yes, through `*` |

The call for a value and a reference looks the same, `f(n)`. Only the
pointer call needs `&`. Use values for small types such as `int` and
`double`. Use `const T&` for big objects you only read. Use pointers when
the argument is optional, since it can be `nullptr`.

::: answer
**Q6. What is the difference between pass by value, reference, and pointer?**

Pass by value gives the function a copy, so the caller's variable cannot
change. Pass by reference gives the function another name for the same
object, with no copy, so changes are visible to the caller. Pass by
pointer gives the function a copy of the address, which it follows with
`*`. Pointers can be null, so the function must check them. Use values
for small types, `const T&` for big read-only objects, and pointers when
the argument may be absent.
:::

::: tip
When you see `void f(T& x)`, the `&` tells you the function may change
your variable. When you see `void f(const T& x)`, it cannot.
:::

## 7. Pointer versus reference

Both a pointer and a reference let you reach another variable, but they
behave very differently. One assignment shows the difference.

### One assignment tells them apart

```cpp
#include <iostream>

int main() {
    int a = 10, b = 20;

    int* p = &a;       // p stores a's address
    int& r = a;        // r IS a

    p = &b;            // p now points to b
    std::cout << *p << " " << r << "\n";

    r = b;             // copies 20 into a!
    std::cout << a << " " << b << "\n";
}
```

It prints:

```output
20 10
20 20
```

Here is the picture at the end of the program:

```{=latex}
\begin{memdiagram}
\cell[stack]{a}{0,0}{a (also named r)}{20}
\cell[stack]{b}{3.6,0}{b}{20}
\cell[stack]{p}{0,-2.0}{p}{\&b}
\draw[vzptr=stack] (p.east) -| (b.south);
\end{memdiagram}
```

Walk through it:

- `int* p = &a;` creates `p`, its own variable. It stores the address of
  `a`.
- `int& r = a;` creates `r`. It is not a separate variable. It is another
  name for `a`.
- `p = &b;` moves the pointer. Now `p` holds the address of `b`. `*p` is
  20, and `r` is still 10.
- `r = b;` does not move the reference. A reference cannot be re-bound. It
  copies the value of `b`, which is 20, into `a`. Since `r` is `a`, `a`
  becomes 20.
- `b` is unchanged. The last line prints `20 20`.

### More rules

```cpp
int* p;            // allowed (but dangerous): uninitialized
int* q = nullptr;  // allowed: points to nothing
int& r;            // error: must be initialized
int& s = nullptr;  // error: no null references

int arr[3] = {1, 2, 3};
int* it = arr;
it++;              // pointer arithmetic: now at arr[1]
```

Walk through it:

- A pointer may be left uninitialized, or set to `nullptr`. An
  uninitialized pointer holds an unknown address, so using it is a bug.
- A reference must be **bound** to an object when it is created. Binding
  means attaching the reference to the object it names. There is no such
  thing as an empty reference.
- `arr` is an array. Its name, used alone, gives the address of its first
  element. So `int* it = arr;` points at `arr[0]`.
- `it++` moves the pointer to the next element. This is called **pointer
  arithmetic**. A reference has no such thing.

Here is a complete program that uses `it` to read the array:

```cpp
#include <iostream>

int main() {
    int arr[3] = {1, 2, 3};
    int* it = arr;      // points at arr[0]
    it++;               // now points at arr[1]
    std::cout << *it << "\n";
}
```

It prints:

```output
2
```

The two errors in the snippet are exactly the rules above. Compiling a
file that has `int& r;` and `int& s = nullptr;` gives this message for the
first line:

```output
error: 'r' declared as reference but not initialized
```

### Side by side

| Topic | Pointer | Reference |
|---|---|---|
| What it is | A variable holding an address | Another name for an object |
| Null | Can be `nullptr` | Never null |
| Re-point | Yes, any time | No, bound for life |
| Initialize | Optional | Required |
| Arithmetic | Yes: `p++`, `p + 2` | No |
| Syntax | `*p`, `p->x` | `r`, `r.x` |

The arrow `p->x` means "follow the pointer `p` and take member `x`". It is
short for `(*p).x`. A reference uses a dot, just like the object it names.

::: answer
**Q7. What is the difference between a pointer and a reference?**

A pointer is its own variable that stores an address. It can be null,
can be re-pointed to another object at any time, and supports arithmetic.
You use it with `*` and `->`. A reference is an alias for an existing
object. It can never be null, must be bound when created, and cannot be
re-bound. You use it exactly like the object itself.
:::

::: warning
`r = b;` with a reference does not change what `r` refers to. It assigns
a value to the object `r` names. This surprises almost everyone the first
time, so remember: a reference is bound for life.
:::

## 8. struct versus class

In C++, `struct` and `class` are almost the same thing. The difference is
small, and it is worth knowing exactly.

### The only difference: default access

A **member** is a variable or function inside a class or struct. An
**access specifier** says who may use a member. The two access specifiers
are **public** (anyone may use it) and **private** (only the class's own
functions may use it).

```cpp
#include <iostream>

struct A {
    int x;              // public by default
};

class B {
    int x;              // private by default
};

int main() {
    A a;
    a.x = 1;            // OK
    std::cout << a.x << "\n";
    // B b;  b.x = 1;   // error: x is private
}
```

It prints:

```output
1
```

Walk through it:

- In `struct A`, `x` is public, because that is the default for `struct`.
  So `main` may read and write `a.x`.
- In `class B`, `x` is private, because that is the default for `class`.
  The commented line would be an error: GCC says
  `'int B::x' is private within this context`.
- Both keywords can hold data, member functions, and constructors. Those
  features are the same in both. Only the default differs.

### The same default for inheritance

**Inheritance** lets one class take over the members of another. The
original is the **base class**, and the new one is the **derived class**.
The access default works the same way.

```cpp
#include <iostream>

struct Base { int v; };

struct D1 : Base {};    // public inheritance (default for struct)
class  D2 : Base {};    // private inheritance (default for class)

int main() {
    D1 d1;
    d1.v = 1;           // OK
    std::cout << d1.v << "\n";
    // D2 d2;  d2.v = 1; // error: Base is private in D2
}
```

It prints:

```output
1
```

Walk through it:

- `struct D1 : Base {}` inherits from `Base` publicly, so `v` stays
  public, and `d1.v` works.
- `class D2 : Base {}` inherits privately, so `v` becomes private inside
  `D2`. Writing `d2.v` is an error. GCC reports
  `'int Base::v' is inaccessible within this context`.
- Write `public` or `private` after the colon, and the default no longer
  matters.

### So when do you use which?

By convention, use `struct` for plain bundles of data with no rules. Use
`class` when there is an **invariant** to protect. An invariant is a rule
that must always hold, such as "a bank balance is never negative."

```cpp
#include <iostream>

struct Point {          // plain data, no rules
    double x, y;
};

class BankAccount {     // has a rule to protect
public:
    void deposit(double amt) {
        if (amt > 0) balance += amt;
    }
    double get() const { return balance; }
private:
    double balance = 0; // nobody can set it to -500
};

int main() {
    Point p{1.5, 2.0};
    BankAccount acc;
    acc.deposit(100);
    acc.deposit(-500);  // refused
    std::cout << p.x + p.y << " " << acc.get() << "\n";
}
```

It prints:

```output
3.5 100
```

Walk through it:

- `Point` is a plain bundle of two numbers. Its members are public, so
  `p.x` and `p.y` are easy to use. Nothing needs protecting.
- `BankAccount` is a class because `balance` must follow a rule. `balance`
  is private, so no outside code can set it directly.
- `deposit` is the only way in. It refuses amounts that are not positive.
  The `-500` deposit does nothing.
- `get() const` reads the balance. The `const` promises that `get` does
  not change the object.
- The output is `3.5` for the point (1.5 + 2.0), and `100` for the
  account.

::: answer
**Q8. What is the difference between `struct` and `class`?**

In C++ the only difference is the default access. Members and base classes
of a `struct` are public by default, and those of a `class` are private
by default. Everything else, including constructors, member functions and
inheritance, works the same. By convention, use `struct` for plain data
and `class` for objects that protect a rule, an invariant.
:::

::: warning
A common trap: in C, `struct` cannot have member functions and has no
access control at all. That is a C rule. In C++, the words `struct` and
`class` both give you full power, so the difference is only the default.
:::

## Chapter summary

- A **program** is a list of instructions. **Source code** is the text you write, and a **compiler** turns it into machine code.
- The four build stages are the **preprocessor**, the **compiler**, the **assembler** and the **linker**. Errors name the stage that found them.
- Running a program means the operating system loads it, sets up memory, calls `main`, and uses its return value as the exit code.
- A **declaration** says a name exists. A **definition** creates it. Declare as often as you like, define exactly once.
- The **stack** holds function frames and locals, managed automatically. The **heap** is large and manual, so prefer `vector` and smart pointers.
- `static` controls lifetime and visibility. `const` means read-only. `constexpr` means known at compile time.
- Pass by value copies, pass by reference aliases, and pass by pointer copies an address. Use `const T&` for big read-only objects.
- A pointer is its own variable holding an address, and can be null or re-pointed. A reference is an alias that is never null and never re-bound.
- In C++, `struct` and `class` differ only in their default access, public or private.
