# Chapter 12 — Reading Real Code: Five Classic Bugs

You now know most of what C++ offers: variables, functions, classes, pointers, the heap, and containers like `std::vector`. This last chapter puts that knowledge to work. We look at five short pieces of code. Each one compiles, and each one is broken in a way that interviewers love to ask about.

For each bug, you will see the code, then stop and predict. Then we walk through what really happens in memory, draw it, fix the code, and finish with an interview answer.

Try to predict before you read on. You learn much more from a wrong guess that you check than from a right answer you only read.

## Words you will need

Some terms come up in every example, so here they are once.

A **stack** is the area where functions keep their local variables. Each function call gets a **stack frame**, a block of space for that call's variables. The newest frame sits on top, and it is removed when the function returns.

The **heap** is a second area of memory. You ask for heap memory with `new`, and you give it back with `delete`. Heap memory lives until you delete it.

An **address** is the number that says where something sits in memory. A **pointer** is a variable that stores an address. The `&` operator gives you the address of a variable. The `*` operator follows a pointer to the value it points at.

A **class** is a type you define yourself. It groups data and functions under one name. The data inside it is called a **member variable**. A variable is in **scope** from its declaration until the closing brace of the block it was declared in. When the variable goes out of scope, it is destroyed.

**Undefined behavior** (often shortened to UB) means the C++ standard does not say what happens. The program may print the right answer, print garbage, crash, or do something else entirely. Once a program has undefined behavior, no output means anything.

## Bug 1: Returning the address of a local variable

Here is the code. It is a single function, and it returns a pointer.

```cpp
int* getValue() {
    int x = 10;
    return &x;
}
```

**Pause and predict.** The function creates a local variable `x`, sets it to 10, and returns its address. Is that pointer safe to use after `getValue` returns? Decide before you read on.

### What really happens in memory

Suppose `main` calls `getValue`. A new stack frame is pushed for `getValue`, and `x` lives inside it.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-2.3,-0.9) rectangle (2.3,3);\end{scope}
\node[vzregiontitle=stack] at (-2.2,3.05) {STACK (newest frame on top)};
\widecell[stack]{g}{0,1.9}{3.8}{getValue() frame}{x = 10 at 0x7ffc10}
\widecell[stack]{m}{0,0}{3.8}{main() frame}{p = (not set yet)}
\end{memdiagram}
```

The function returns `&x`, which is the address `0x7ffc10`. Our example address is made up, but the idea is real. `main` stores it in `p`.

When `getValue` returns, its frame is removed. The variable `x` no longer exists. The memory is free for reuse, but `p` still holds `0x7ffc10`.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-2.3,-0.9) rectangle (2.3,3);\end{scope}
\node[vzregiontitle=stack] at (-2.2,3.05) {STACK};
\widecell[plain]{gone}{0,1.9}{3.8}{}{free: x no longer exists}
\widecell[stack]{m}{0,0}{3.8}{main() frame}{p = 0x7ffc10}
\ptr[bad]{m.north}{gone.south}
\end{memdiagram}
```

Now `main` calls some other function. That call reuses the same stack space and writes its own data there.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-2.3,-0.9) rectangle (2.3,3);\end{scope}
\node[vzregiontitle=stack] at (-2.2,3.05) {STACK};
\widecell[stack]{o}{0,1.9}{3.8}{other() frame}{0x7ffc10: garbage}
\widecell[stack]{m}{0,0}{3.8}{main() frame}{p = 0x7ffc10}
\ptr[bad]{m.north}{o.south}
\end{memdiagram}
```

Reading `*p` now reads whatever `other` left there. A pointer like this is called a **dangling pointer**: it points at memory that no longer belongs to the variable it was meant for. Using a dangling pointer is undefined behavior. The read might print 10 by luck, print garbage, or crash.

The compiler can often warn you about this. With GCC or Clang, build with `-Wall`:

```output
g++ -Wall value.cpp
warning: address of local variable 'x' returned
```

Always read that warning. It is the compiler telling you that the bug is real.

### The fix

There are two good fixes. The first is the simplest. Return the value, not the address:

```cpp
int getValue() {
    int x = 10;
    return x;     // a copy of 10 is returned
}
```

An `int` is small, so copying it costs almost nothing.

The second fix is for when the object really must outlive the function. Put it on the heap and return a **smart pointer**. A smart pointer is a class that owns a pointer and frees the memory for you when it is no longer needed. The most common one is `std::unique_ptr`, which means "exactly one owner." You need `#include <memory>` for it.

```cpp
#include <memory>

std::unique_ptr<int> makeValue() {
    return std::make_unique<int>(10);
}
```

The memory is freed automatically when the caller's `unique_ptr` goes out of scope. You will see this again in Bug 2.

::: warning
A `static` local variable also avoids the dangling pointer, because it lives for the whole program. But it is shared state: every call uses the same `x`. Use it rarely, and only when you know why.
:::

::: answer
**Q96. What is wrong with this code? `int* getValue() { int x = 10; return &x; }`**

The function returns the address of `x`, which is a local variable. A local variable is destroyed when its function returns, so the returned pointer dangles. Reading through it is undefined behavior: it might print 10, print garbage, or crash. Return the `int` by value, which is cheap, or return a `std::unique_ptr` if the object has to outlive the function. Always take compiler warnings like "address of local variable returned" seriously.
:::

## Bug 2: Using a pointer after delete

This program is only three lines long.

```cpp
#include <iostream>

int main() {
    int* p = new int(5);
    delete p;
    std::cout << *p << "\n";
}
```

**Pause and predict.** The program allocates an `int` holding 5, deletes it, and then prints `*p`. What is printed? Is it 5, 0, or a crash? Decide before you read on.

### What really happens in memory

The line `new int(5)` asks the heap for room for one `int`, stores 5 there, and gives back its address. The pointer `p` on the stack holds that address.

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.4,2.1}{\texttt{Step 1: int* p = new int(5);}}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.3,-0.8) rectangle (1.3,1.2);\end{scope}
\node[vzregiontitle=stack] at (-1.2,1.25) {STACK};
\begin{scope}[on background layer]\draw[vzregion=heap] (2.4,-0.8) rectangle (5,1.2);\end{scope}
\node[vzregiontitle=heap] at (2.5,1.25) {HEAP};
\cell[stack]{p}{0,0}{p}{0x5f20}
\cell[heap]{v}{3.7,0}{@0x5f20}{5}
\ptr[stack]{p.east}{v.west}
\end{memdiagram}
```

The line `delete p` gives the memory back to the heap's bookkeeping. The heap may reuse that block for something else, or write its own notes into it.

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.4,2.1}{\texttt{Step 2: delete p;}}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.3,-0.8) rectangle (1.3,1.2);\end{scope}
\node[vzregiontitle=stack] at (-1.2,1.25) {STACK};
\begin{scope}[on background layer]\draw[vzregion=heap] (2.4,-0.8) rectangle (5,1.2);\end{scope}
\node[vzregiontitle=heap] at (2.5,1.25) {HEAP};
\cell[stack]{p}{0,0}{p}{0x5f20}
\cell[heap]{v}{3.7,0}{@0x5f20}{}
\freed{v}
\ptr[bad]{p.east}{v.west}
\vznote[bad]{3.7,-1.3}{freed: may be reused}
\end{memdiagram}
```

Look closely at `p`. `delete` did not change it. It still holds `0x5f20`. Now it is a dangling pointer. The `*p` in the last line is a **use after free**: reading memory that has already been freed. This is undefined behavior. The program might print 5 today, print garbage tomorrow, or crash. Printing 5 proves nothing.

Interviewers like this example because the wrong answer ("it prints 5") looks so reasonable.

### The fix

A common band-aid is to set the pointer to `nullptr` right after deleting it:

```cpp
delete p;
p = nullptr;   // a later *p usually crashes right away
```

This helps, because a crash is easier to find than silent junk. But it does not help other copies of the pointer. If you copied `p` to another variable before the delete, that copy still dangles.

The real fix is to let an owner manage the memory, so you never call `delete` yourself:

```cpp
#include <iostream>
#include <memory>

int main() {
    auto q = std::make_unique<int>(5);
    std::cout << *q << "\n";   // fine
}                              // freed automatically here
```

`std::make_unique<int>(5)` allocates the same heap `int`. When `q` goes out of scope at the closing brace, the `unique_ptr` deletes the memory. There is no `delete` to forget, and no way to use the memory after it is freed.

To catch these bugs when you do have raw pointers, build with AddressSanitizer. It is a tool built into GCC and Clang that checks memory use while the program runs:

```bash
g++ -fsanitize=address main.cpp && ./a.out
```

On the buggy program, it stops with an error that names the problem, such as `ERROR: AddressSanitizer: heap-use-after-free`. A sanitizer is slower, so use it while testing, not in your final release build.

::: warning
Interviewers often ask: "So setting the pointer to `nullptr` fixes it?" The honest answer is that it fixes only the one pointer you cleared. Copies of the pointer still dangle.
:::

::: answer
**Q97. What happens here? `int* p = new int(5); delete p; cout << *p;`**

`delete` frees the memory but does not change `p`, so `p` becomes a dangling pointer. Reading `*p` afterwards is a use after free, which is undefined behavior, even if it happens to print 5. Setting `p` to `nullptr` after the delete makes a later mistake crash sooner, but it does not fix copies of the pointer. The real fix is `std::make_unique`, which frees the memory automatically and removes the need for `delete`. AddressSanitizer (`-fsanitize=address`) finds these bugs while you test.
:::

## Bug 3: How many times do constructors and destructors run?

This is a counting puzzle. Here is the class, and a `main` that creates two objects.

```cpp
#include <iostream>

class Test {
public:
    Test() { std::cout << "Constructor\n"; }
    ~Test() { std::cout << "Destructor\n"; }
};

int main() {
    Test a;
    Test b = a;
}
```

A **constructor** is a special function that runs when an object is created. A **destructor** is a special function that runs when an object is destroyed. This class prints a line in each one.

**Pause and predict.** How many lines of output will this program print? How many of them say "Constructor", and how many say "Destructor"? Count before you read on.

### What really happens

Work through `main` one line at a time.

`Test a;` creates `a` on the stack. This calls the constructor, which prints `Constructor`.

`Test b = a;` looks like assignment, but it is not. It creates a brand new object `b` from the existing object `a`. C++ does this with a **copy constructor**, which is a constructor that takes another object of the same class and builds a copy of it.

This class does not write a copy constructor. The compiler writes one for you. The compiler-written version copies each member variable, and this class has none. It prints nothing.

So far the output is one line: `Constructor`. Now the closing brace ends `main`. Objects are destroyed in the reverse of the order they were created. `b` goes first, then `a`. Each destructor prints `Destructor`.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-2.3,-0.9) rectangle (2.3,2.4);\end{scope}
\node[vzregiontitle=stack] at (-2.2,2.45) {STACK};
\widecell[stack]{a}{0,1.5}{3.8}{}{a : Test}
\widecell[stack]{b}{0,0}{3.8}{}{b : Test}
\vznote[plain]{5.0,1.5}{built by \texttt{Test()}:\\prints Constructor}
\vznote[plain]{5.0,0}{built by copy:\\prints nothing}
\vznote[bad]{0,-1.7}{closing brace: destroy in REVERSE order\\\texttt{b -> \textasciitilde{}Test()} prints Destructor\\\texttt{a -> \textasciitilde{}Test()} prints Destructor}
\end{memdiagram}
```

The program prints `Constructor` once and `Destructor` twice. Two objects were created and two were destroyed, but only one of them ran your constructor.

Notice one more detail. The copy happens even though `a` is a named object, not a temporary. C++17 can skip copies only for temporary objects, so here the copy constructor really runs.

### Make the copy visible

To see the copy, write the copy constructor yourself:

```cpp
class Test {
public:
    Test() { std::cout << "Constructor\n"; }
    Test(const Test&) { std::cout << "Copy constructor\n"; }
    ~Test() { std::cout << "Destructor\n"; }
};
```

The `const Test&` parameter is a **reference** to the other object. A reference is another name for an existing object, and `const` promises that the copy constructor will not change it. Running the program with this class prints:

```output
Constructor
Copy constructor
Destructor
Destructor
```

Now every part of the object's life is visible. Constructed once, copied once, destroyed twice.

### The trap: `=` is not the same as `Test b = a;`

Interviewers often follow up with this: "What if you write `Test b; b = a;` instead?" Here the two lines are different. `Test b;` builds `b` with the default constructor. Then `b = a;` calls **copy assignment** (`operator=`) on the object that already exists. Copy assignment runs only on an object that is already alive. So the constructor runs twice in this version, and the destructor runs twice.

::: tip
Rule of thumb: `Test b = a;` creates a new object, so it uses a constructor (the copy constructor). `b = a;` changes an object that already exists, so it uses `operator=`.
:::

::: answer
**Q98. How many times will the constructor and destructor execute?**

The output is one `Constructor` and two `Destructor` lines. `Test b = a;` creates a new object from an existing one, so it calls the copy constructor, not your default constructor. Because you did not write a copy constructor, the compiler wrote one that copies members and prints nothing. At the closing brace, objects are destroyed in reverse order: `b` first, then `a`. Every object is destroyed exactly once, and assignment (`=`) is different from initialization.
:::

## Bug 4: What happens to pointers when a vector grows?

A `std::vector` stores its elements in one block of heap memory. When the vector runs out of room, it moves everything into a bigger block. That is the key to this bug.

The **capacity** of a vector is how many elements fit in its current block. The **size** is how many it holds right now. We will use these words in the code.

```cpp
#include <vector>

std::vector<int> v;
v.reserve(2);            // room for 2, size is 0
v.push_back(10);
v.push_back(20);
int* p = &v[0];          // p points at the first element
v.push_back(30);         // is p still valid?
```

Here `reserve` asks for room for two elements. The first two `push_back` calls fill that room. Then `p` is set to the address of the first element.

**Pause and predict.** The third `push_back` adds a third element. Is `p` still valid after that? Decide before you read on.

### What really happens in memory

The vector object `v` lives on the stack. It holds a pointer to a heap buffer, and the buffer holds the elements. Here the buffer has room for two.

```{=latex}
\begin{memdiagram}
\vznote[plain]{2.6,3.0}{Right after the second push\_back}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.7,-0.85) rectangle (1.7,2.3);\end{scope}
\node[vzregiontitle=stack] at (-1.6,2.35) {STACK};
\begin{scope}[on background layer]\draw[vzregion=heap] (3.4,-0.85) rectangle (6,1.05);\end{scope}
\node[vzregiontitle=heap] at (3.5,1.1) {HEAP};
\widecell[stack]{v}{0,1.4}{2.6}{v}{size 2, cap 2}
\cell[stack]{d}{0,0}{data}{0x1000}
\arraycells[heap]{buf}{4,0}{10,20}{}
\vznote[plain]{4.6,-1.3}{buffer @0x1000 (capacity 2)}
\ptr[stack]{d.east}{buf-0.west}
\end{memdiagram}
```

The third `push_back` needs room for a third element, but the capacity is already 2. The vector must reallocate. It asks the heap for a bigger buffer, copies or moves the old elements across, adds the new one, and frees the old buffer.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=heap] (3.4,-0.85) rectangle (12.4,1.05);\end{scope}
\node[vzregiontitle=heap] at (3.5,1.1) {HEAP};
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.7,-0.85) rectangle (1.7,2.3);\end{scope}
\node[vzregiontitle=stack] at (-1.6,2.35) {STACK};
\widecell[stack]{v}{0,1.4}{2.6}{v}{size 3, cap 4}
\cell[stack]{p}{0,0}{p}{0x1000}
\arraycells[plain]{old}{4,0}{,}{}
\freed{old-0}
\freed{old-1}
\vznote[bad]{4.6,-1.3}{old buffer @0x1000 (FREED)}
\arraycells[ok]{nb}{8.5,0}{10,20,30}{}
\node[vzcell=plain, minimum width=1.1cm, rounded corners=0pt] at (11.8,0) {free};
\vznote[ok]{9.6,-1.3}{new buffer @0x2000}
\ptr[bad]{p.east}{old-0.west}
\draw[vzptr=stack] (v.east) -- (8.5,1.6) -- (nb-0.north);
\end{memdiagram}
```

The new buffer is at `0x2000`. Our addresses are made up, but the pattern is real. The vector now lives at a different place. `p` still holds `0x1000`, the address of memory that has been freed. Reading `*p` is undefined behavior.

The standard does not promise how much the capacity grows. GCC and Clang usually double it, so 2 becomes 4. Do not depend on that exact number in your code.

### The rule

The general rule is this. An **iterator** is an object that points at an element, the way a pointer does. A pointer, a reference or an iterator into a vector is a way of reaching an element. When `push_back` causes a reallocation, all of them are **invalidated**, which means they no longer point at valid elements. If the vector still has spare capacity, only the end iterator is invalidated. Insert and erase have similar rules.

### Three fixes

First, reserve enough room before you take any pointers:

```cpp
v.reserve(3);            // room for everything we will add
```

Second, store an index instead of an address. An index is just a number, and it stays correct after the vector moves:

```cpp
std::size_t i = 0;       // use v[i] later
```

Third, take the pointer after you have finished adding elements:

```cpp
v.push_back(30);
int* p = &v[0];          // safe: no more push_back calls
```

::: warning
Reserving is a promise, not a shield. If you reserve 2 and later push 3 elements, the bug comes back. Re-check your reserve call whenever the number of elements changes.
:::

::: answer
**Q99. What happens to pointers and references when a vector reallocates?**

No, `p` is no longer valid. The third `push_back` exceeds the capacity of 2, so the vector allocates a bigger buffer, moves the elements, and frees the old one. `p` still holds the old address, so it dangles. Any pointer, reference or iterator into a vector can be invalidated when it reallocates. Reserve enough room first, store an index instead of an address, or take the pointer after you finish adding elements.
:::

## Bug 5: The class that copies its pointer

This is the favorite interview question of the five. It is a class that owns heap memory through a raw pointer.

```cpp
#include <iostream>

class User {
public:
    int* data;
    User() { data = new int(10); }
    ~User() { delete data; }
};

int main() {
    User a;
    User b = a;
}
```

The constructor allocates an `int` on the heap, and the destructor deletes it. That looks responsible. The class owns its memory and cleans it up.

**Pause and predict.** The code creates `a`, then creates `b` as a copy of `a`. What goes wrong? Think about how many times `delete` runs, and what it deletes. Decide before you read on.

### What really happens in memory

Start with `User a;`. The constructor allocates an `int` holding 10 and stores its address in `a.data`.

Then `User b = a;` creates `b`. Our class has no copy constructor, so the compiler writes one. The compiler's version copies each member. For a pointer member, that means it copies the address, not the `int` it points to.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.9,-1.2) rectangle (1.9,2.5);\end{scope}
\node[vzregiontitle=stack] at (-1.8,2.55) {STACK};
\begin{scope}[on background layer]\draw[vzregion=heap] (4,-0.6) rectangle (7,1.6);\end{scope}
\node[vzregiontitle=heap] at (4.1,1.65) {HEAP};
\widecell[stack]{a}{0,1.6}{3.0}{a}{data = 0x5f20}
\widecell[stack]{b}{0,-0.3}{3.0}{b}{data = 0x5f20}
\cell[heap]{i}{5.5,0.6}{@0x5f20}{10}
\ptr[stack]{a.east}{i.west}
\draw[vzptr=stack] (b.east) -- ++(1.2,0) -| (i.south);
\end{memdiagram}
```

Now two objects hold the same address. One `int` is shared by both. Copying a pointer like this is called a **shallow copy**: the pointer is copied, but the thing it points at is not. The right kind of copy for this class is a **deep copy**, where the new object gets its own `int`.

At the closing brace, `b` is destroyed first. Its destructor deletes the `int` at `0x5f20`. Then `a` is destroyed, and its destructor deletes the same address again. That is a **double delete**, and it is undefined behavior. On glibc systems, the program usually stops with an error such as `free(): double free detected`.

### Fix 1: Rule of Three

The **Rule of Three** says this. If a class needs one of these three special functions, it almost certainly needs all three: a destructor, a copy constructor, and a copy assignment operator. Our class already has the destructor, so it needs the other two.

```cpp
class User {
public:
    int* data;
    User() : data(new int(10)) {}
    User(const User& o) : data(new int(*o.data)) {}  // own int
    User& operator=(const User& o) {
        *data = *o.data;   // copy the value, keep our own int
        return *this;
    }
    ~User() { delete data; }
};
```

The copy constructor allocates a new `int` and copies the value into it. Now `a` and `b` each delete their own memory.

The copy assignment operator handles `b = a;` when both objects already exist. It copies the value into the `int` that `b` already owns, instead of throwing that `int` away and taking `a`'s address. The `return *this;` lets assignments chain, like `x = y = z;`.

### Fix 2: Rule of Zero

The better fix is to avoid owning a raw pointer at all. The **Rule of Zero** says: if your class does not need a custom destructor or copy functions, let the compiler write them. Here, the class does not need a pointer. It needs an `int`:

```cpp
class User {
public:
    int data = 10;
};

User a;
User b = a;   // copies the int, so a and b are independent
```

When the class holds an `int` directly, the compiler's copy is already correct.

Sometimes you really need heap ownership. Then use a smart pointer. A **unique_ptr** owns its object alone, so it cannot be copied:

```cpp
#include <memory>

class User {
public:
    std::unique_ptr<int> data = std::make_unique<int>(10);
};

User a;
User b = a;   // compile error: unique_ptr cannot be copied
```

The accidental copy now fails at compile time, which is much better than crashing at runtime. If you want to hand the ownership over, you can move it, for example with `User b = std::move(a);`. A move transfers the pointer, and leaves `a` with nothing to delete.

::: warning
Interviewers often ask: "Can't you just forbid copying?" Yes. Writing `User(const User&) = delete;` makes copies a compile error. That is a valid choice, but a class that can be copied safely (Rule of Zero) is usually more useful.
:::

::: answer
**Q100. Find the memory-management problem.**

The compiler-written copy constructor copies the pointer, not the `int`, so `a.data` and `b.data` point to the same `int`. This is a shallow copy. Both destructors then delete that `int`, which is a double delete and undefined behavior. The fix is the Rule of Three: write a copy constructor and a copy assignment operator that make a deep copy. Better still is the Rule of Zero: store a plain `int`, or use a `unique_ptr`, so an accidental copy will not compile.
:::

## Chapter summary

- A returned pointer to a local variable dangles, because the variable dies when its function returns. Return by value, or return a `unique_ptr`.
- `delete` frees memory but does not change the pointer. Reading through it afterwards is a use after free.
- `std::make_unique` and `std::unique_ptr` free memory for you, so you rarely need `delete`.
- `Test b = a;` creates a new object with the copy constructor. `b = a;` changes an existing object with `operator=`.
- Objects are destroyed in the reverse order of their creation. Each one is destroyed exactly once.
- A vector that reallocates moves its elements and frees its old buffer. Every pointer, reference and iterator into it can become invalid.
- Use `reserve`, store indices, or take pointers after the last `push_back`.
- A class that owns a raw pointer needs deep copies (the Rule of Three), or better, no raw pointer at all (the Rule of Zero).
- Read compiler warnings. Build with `-Wall`, and test with `-fsanitize=address`.

## Where to go from here

You have now seen the most common ways C++ programs break, and each one comes down to one question: who owns this memory, and who frees it? Ask that question about every pointer you write, and you will avoid most of these bugs.

Practice by reading code. Take a small program, predict what it does, then run it with `-Wall -Wextra` and the sanitizers. When a prediction is wrong, find out why. That habit matters more than any single rule in this book.

Next, learn the standard library reference. The website cppreference.com describes `std::vector`, `std::unique_ptr` and the other containers and smart pointers, with notes on when iterators become invalid. The C++ Core Guidelines are a free, well-known set of advice about writing safe modern C++. Keep building small programs, and treat every warning as a lesson.
