# Chapter 3 — How Memory Really Works

Earlier chapters gave you the basic picture. A program has a stack and a heap. A variable lives somewhere, and a pointer holds the address of something else. You also learned that using a bad pointer is **undefined behavior** (UB for short), which means the language makes no promises about what happens next.

This chapter opens the box. We will ask where memory comes from, what `new` and `delete` really do, and how programs get into trouble. Most of the interview questions about memory are really one question asked in different ways: *who owns this memory, and who gives it back?*

Some words we will use all the time. A **byte** is the smallest piece of memory you can name. It holds 8 bits. A **memory address** is a number that names one byte, a bit like a house number on a street. An **object** is a piece of memory that holds a value of some type, such as an `int` or a `std::string`.

## Question 16: How does memory allocation work in C++?

Think of memory as a long street of numbered houses. Your program needs houses for its objects. The question is who picks the house, and who clears it out when the object is done.

C++ gives every object one of three kinds of **storage**. Storage means "the rules for how long memory lives and who manages it."

- **Static storage** lasts for the whole run of the program. Global variables live here. They are created before `main` starts and destroyed after it ends.
- **Automatic storage** is the **stack**. Local variables live here. They are created when their function starts and destroyed when it returns. A **scope** is the part of the code between a pair of braces, and you do not have to do anything to free them.
- **Dynamic storage** is the **heap**. You ask for it with `new`, and it stays alive until you give it back. You are responsible for it.

Here is one small program that uses all three.

```cpp
#include <iostream>

int counter = 0;            // static storage

void f() {
    int x = 7;              // automatic storage (stack)
    int* p = new int(42);   // dynamic storage (heap)
    std::cout << x << ' ' << *p << '\n';
    delete p;
}                           // x is gone now

int main() {
    f();
    std::cout << counter << '\n';
}
```

It prints:

```output
7 42
0
```

Walk through it line by line.

- `int counter = 0;` is outside every function. It is static, so it exists for the whole run. Its value is `0` when `main` starts.
- Inside `f`, `int x = 7;` is a normal local. It lives on the stack and disappears when `f` ends.
- `int* p = new int(42);` asks the heap for room for one `int` and stores `42` in it. The name `p` is on the stack, but the `int` it points to is on the heap. The `*p` on the next line means "the value at the address `p` holds."
- `delete p;` gives the heap room back. We must do this ourselves.
- When `f` returns, `x` and `p` vanish. The heap room is not cleared by that. It is only freed by our `delete`. This is the key difference between the stack and the heap.

Now look at what happens when you call `new`. Your code asks for room, and the request goes down several layers.

```{=latex}
\begin{memdiagram}
\begin{scope}[shift={(-3.5,0)}]
\flowchain{your code/new int(42), operator new/finds room for the object, allocator/usually malloc (free lists), operating system/gives more pages when needed}
\end{scope}
\end{memdiagram}
```

An **allocator** is the part of the runtime that hands out heap memory. A **free list** is a list of memory pieces that were given back and can be reused. The allocator takes a piece from this list when it can. When the list is empty, it asks the operating system for a larger chunk. Such a request is called a **system call**, which means a request from your program to the operating system. You do not need to know the details to use C++, but it helps to know that the heap is not magic. It is a set of pieces handed out by an allocator.

::: tip
The heap is slow compared to the stack. Each `new` may search free lists, and each `delete` puts a piece back. Use the stack for small locals whenever you can.
:::

Modern C++ gives us a better way. Instead of owning memory by hand, let an **owner** object do it. An owner is an object that is responsible for deleting what it holds.

```cpp
#include <memory>
#include <vector>

struct Widget {};

int main() {
    int scores[10] = {};                    // automatic storage
    std::vector<int> big(1'000'000);        // heap, owned by big
    auto w = std::make_unique<Widget>();    // heap, owned by w
    Widget* raw = new Widget;               // heap, owned by you
    delete raw;                             // forget this: leak
    return scores[0];
}
```

This program prints nothing. It returns `0`, which is `scores[0]`.

- `scores` is a plain array on the stack. It is freed for free.
- `std::vector<int> big(1'000'000);` asks the heap for a million `int`s. The `vector` is the owner, and it frees them when `big` goes out of scope. The `'` in `1'000'000` is a digit separator. It only makes the number easier to read.
- `std::make_unique<Widget>()` creates a `Widget` on the heap. It returns a **smart pointer**, which is an object that owns a heap object and deletes it for you. The type is `std::unique_ptr<Widget>`.
- `new Widget` followed by `delete raw` is the old way. It works only if you remember the `delete`. If you forget, the memory is lost. That is a leak, and Question 22 covers it.

::: answer
**Q16. How does memory allocation work in C++?**

C++ has three kinds of storage. Static storage lasts for the whole program and holds globals. Automatic storage is the stack, and it holds locals that are freed when their scope ends. Dynamic storage is the heap, which you request with `new` and must give back. A `new` request goes through an allocator, usually `malloc`, which reuses free pieces and asks the operating system for more when it runs out. Prefer the stack, and prefer owners such as `std::vector` and `std::unique_ptr` over raw `new` and `delete`.
:::

## Question 17: What are the differences between stack, heap, data, and text segments?

The stack and the heap are not the only parts of a running program. The compiler also puts your program's code and its global data into a few big regions. These regions are called **segments**. A segment is one contiguous range of addresses that has one job.

Here is the usual picture. Real systems differ in the details, but the idea is the same.

```{=latex}
\begin{memdiagram}
\widecell[stack]{st}{0,4.4}{5.6}{}{STACK (locals)}
\widecell[heap]{hp}{0,3.3}{5.6}{}{HEAP (new)}
\widecell[data]{bs}{0,2.2}{5.6}{}{BSS (zeroed)}
\widecell[data]{dt}{0,1.1}{5.6}{}{DATA (g, n)}
\widecell[plain]{tx}{0,0}{5.6}{}{TEXT (machine code)}
\vznote[plain]{-2.8,5.1}{high addresses}
\vznote[plain]{-2.8,-0.6}{low addresses}
\node[vznote=stack, anchor=west] at (3.0,4.4) {changes while the program runs};
\node[vznote=heap, anchor=west] at (3.0,3.3) {changes while the program runs};
\node[vznote=data, anchor=west] at (3.0,2.2) {size fixed when the program loads};
\node[vznote=data, anchor=west] at (3.0,1.1) {size fixed when the program loads};
\node[vznote=plain, anchor=west] at (3.0,0) {size fixed when the program loads};
\end{memdiagram}
```

The **text segment** holds the machine code. Every function you write is turned into instructions, and those instructions live here. The text segment is usually **read-only**, which means the program cannot change its own code. A write there is usually a crash.

The **data segment** holds global and static variables that have an initial value. The **BSS segment** holds global and static variables that have no initial value. The C++ rule is that those start as zero, so the operating system fills that area with zeros. Both are fixed in size when the program is loaded.

The **stack** holds local variables and function call information. The **heap** holds memory from `new`. Both change size while the program runs.

Here is a program that has one example of each.

```cpp
#include <iostream>

int g = 5;            // initialized global: data segment
int z;                // uninitialized global: BSS

int square(int x) {   // machine code: text segment
    return x * x;
}

int main() {
    static int n = 3;     // static local: data segment
    int local = 1;        // automatic: stack
    int* p = new int(2);  // dynamic: heap
    std::cout << square(g) << ' ' << z << ' ' << n << ' '
              << local << ' ' << *p << '\n';
    delete p;
}
```

It prints:

```output
25 0 3 1 2
```

Walk through it.

- `int g = 5;` is a global with a value, so it lives in the data segment.
- `int z;` is a global with no value. It is still static, and it starts at zero. It lives in BSS.
- `int square(int x)` is a function. Its instructions live in the text segment. Calling `square(g)` runs those instructions with `x` equal to `5`, so the answer is `25`.
- `static int n = 3;` is a local that is static. Even though it is inside `main`, it lives in the data segment, not on the stack. It keeps its value between calls.
- `int local = 1;` lives on the stack.
- `new int(2)` puts the `int` on the heap. `*p` is `2`.

You can check the segments yourself on Linux. The command `nm` lists the symbols in a program and shows a letter for each. On a build of this program, `g` shows as `D` (initialized data), `z` as `B` (BSS), and `square` as `T` (text). The static local `n` shows as `d`, which is data as well. The local `local` and the `new` memory do not appear in the list at all, because they are created only while the program runs.

::: warning
A common mistake is to say "the stack holds all the local variables, and the data segment holds all the static ones." That is almost right. The exact trap is that a `static` local is *not* on the stack, even though it is declared inside a function.
:::

::: answer
**Q17. What are the differences between stack, heap, data, and text segments?**

The text segment holds the program's machine code, and it is read-only. The data segment holds globals and statics that have an initial value, and BSS holds those that start at zero. These sizes are fixed when the program loads. The stack holds local variables and call information, and it is freed when a scope ends. The heap holds memory from `new`, which lives until you delete it. The stack and heap change size while the program runs.
:::

## Question 18: What is the difference between `malloc()` and `new`?

`malloc` comes from C. It gives you a block of bytes and nothing more. `new` comes from C++. It gives you a block of memory and builds an object in it. This difference matters most for objects that own something, such as a `std::string`.

Here is the difference in one picture.

```{=latex}
\begin{memdiagram}
\vcells[plain]{m}{1.9,0}{raw bytes,nothing is built,(no object yet)}{malloc(sizeof(Player))}
\vcells[ok]{n}{6.4,0}{Player object,Player() runs,name = "hero"}{new Player}
\vznote[plain]{1.9,-2.7}{returns void*, no constructor}
\vznote[ok]{6.4,-2.7}{returns Player*, constructed}
\end{memdiagram}
```

Here is a complete program that uses `new`. The commented-out line shows the `malloc` version of the same idea, which is wrong.

```cpp
#include <iostream>
#include <string>

struct Player {
    std::string name;
    Player() : name("hero") {}
};

int main() {
    Player* b = new Player;                 // allocate AND construct
    std::cout << b->name << '\n';
    delete b;

    // Player* a = (Player*)std::malloc(sizeof(Player));
    // a->name = "x";  // UB: no std::string was constructed
}
```

It prints:

```output
hero
```

Walk through it.

- `struct Player` holds a `std::string` called `name`. The constructor, `Player()`, sets `name` to `"hero"`. A **constructor** is a special function that runs when an object is created and sets it up.
- `new Player` does two things. It asks for memory big enough for a `Player`, and then it runs `Player()` inside that memory. The pointer `b` points to a fully built `Player`.
- `b->name` reads the string, so the output is `hero`.
- `delete b` runs the destructor and frees the memory. Question 19 explains the details.
- The `malloc` line only gives raw bytes. No `Player` is built, so there is no `std::string` inside. Writing to `a->name` is UB, because that string does not exist yet. The next example shows the safe way to use `malloc`.

`malloc` has other differences you need for interviews. It takes a number of bytes, so you must multiply yourself. It returns a `void*`, which must be cast. It returns `NULL` (the null pointer) when it fails. `new` works out the size from the type. It throws `std::bad_alloc` when it fails. You can also ask `new` not to throw.

```cpp
#include <cstdlib>
#include <new>

int main() {
    int* p = static_cast<int*>(std::malloc(10 * sizeof(int)));
    if (p == nullptr) return 1;             // malloc reports failure
    p[0] = 1;
    std::free(p);

    int* q = new int[10];                   // throws std::bad_alloc
    delete[] q;

    int* r = new (std::nothrow) int[10];    // gives nullptr instead
    if (r == nullptr) return 1;
    delete[] r;
}
```

This program prints nothing when it succeeds. Notice that `malloc` memory is freed with `free`, and `new` memory is freed with `delete` or `delete[]`. We will see why in Question 19.

::: warning
Do not mix the two families. Memory from `malloc` must be released with `free`, and memory from `new` must be released with `delete`. Mixing them is undefined behavior, even when it seems to work.
:::

::: answer
**Q18. What is the difference between `malloc()` and `new`?**

`malloc` is a C function that gives you raw bytes. You must give it the size in bytes, cast the `void*` result, and check for `NULL`. It does not construct any object. `new` is a C++ operator that allocates memory, builds the object in it by calling its constructor, and returns a typed pointer. It throws `std::bad_alloc` on failure unless you use `std::nothrow`. Pair `malloc` with `free` and `new` with `delete`.
:::

## Question 19: What is the difference between `free()` and `delete`?

`free` and `delete` both give memory back to the heap. The big difference is that `delete` first destroys the object. `free` only returns the bytes.

Think of a rented house. Before you return the keys, you clean out the furniture. `delete` does the cleaning and then the returning. `free` only returns the keys, and it does not know what furniture was inside.

Here is an object that owns its own memory.

```cpp
#include <iostream>
#include <string>

struct Doc {
    std::string text;               // owns its own buffer
    ~Doc() { std::cout << "destroying Doc\n"; }
};

int main() {
    Doc* d = new Doc{std::string(100, 'x')};
    delete d;                       // ~Doc runs, then memory is freed
    std::cout << "done\n";

    int* none = nullptr;
    delete none;                    // no-op
    std::free(nullptr);             // no-op
}
```

It prints:

```output
destroying Doc
done
```

Walk through it.

- `struct Doc` has a `std::string` inside. The string keeps its characters in its own heap buffer. So a `Doc` owns two pieces of heap memory: the `Doc` itself, and the characters inside its string.
- `~Doc()` is the **destructor**. It runs automatically when a `Doc` is destroyed. Here it prints a message so you can see when it runs.
- `delete d;` first calls `~Doc()`, which prints `destroying Doc`. Then the string runs its own destructor and frees its characters. Then the memory of the `Doc` itself is released.
- `delete` on a null pointer does nothing. The same is true of `free(nullptr)`. You do not need an `if` before them.

Now the rule. Use `free` only with memory from `malloc`, `calloc`, or `realloc`. Use `delete` only with memory from `new`. Use `delete[]` with memory from `new[]`. These pairs must match. If you use `free` on memory from `new`, the destructors never run. That is undefined behavior. If you use `delete` on memory from `malloc`, the destructor is called on bytes that were never constructed. That is also undefined behavior.

```text
new   ...  delete      OK
new[] ...  delete[]    OK
malloc ... free        OK

new   ...  free        UB: no destructor runs
malloc ... delete      UB: destructor on raw bytes
new[] ...  delete      UB: wrong form (Question 21)
```

::: tip
You rarely need `free` or `delete` in modern C++. Store objects in a `std::vector`, or own them with `std::unique_ptr`. Then the owner does the work for you, and the pairing rule cannot be broken.
:::

::: answer
**Q19. What is the difference between `free()` and `delete`?**

`delete` runs the object's destructor and then releases its memory. `free` only releases the bytes, and it knows nothing about objects. Each must match its allocator: `free` for `malloc`, `delete` for `new`, and `delete[]` for `new[]`. Mixing them is undefined behavior. Both are safe to call on a null pointer, which does nothing. The best choice is to let a smart pointer or a container do the deleting.
:::

## Question 20: What happens internally when you call `new`?

When you write `new Widget(3)`, the work is done in two separate jobs. First, memory is found and reserved. Second, an object is built in that memory. Knowing this split is the answer to most "what does new do" questions.

Here is the program first.

```cpp
#include <iostream>

struct Widget {
    int v;
    Widget(int x) : v(x) { std::cout << "Widget(" << x << ")\n"; }
    ~Widget() { std::cout << "~Widget(" << v << ")\n"; }
};

int main() {
    Widget* w = new Widget(3);      // allocate, then construct
    std::cout << w->v << '\n';
    delete w;                       // destroy, then deallocate
}
```

It prints:

```output
Widget(3)
3
~Widget(3)
```

Here are the steps behind `new Widget(3)`, in order.

1. The program calls **`operator new`** with `sizeof(Widget)`, the number of bytes a `Widget` needs. This is a function that only finds raw memory. It does not know what a `Widget` is.
2. The constructor `Widget(3)` runs inside that memory. The message `Widget(3)` is printed, and `v` becomes `3`.
3. The result, which is the address of the new object, is stored in `w`. The type of `w` is `Widget*`, so the compiler knows how to use it.

`delete w` does the same steps in reverse. It runs the destructor, which prints `~Widget(3)`. Then it calls **`operator delete`**, which gives the raw memory back.

You can do the same steps by hand. This is not something you will write in real code, but it proves the point.

```cpp
#include <iostream>
#include <new>

struct Widget {
    int v;
    Widget(int x) : v(x) { std::cout << "Widget(" << x << ")\n"; }
    ~Widget() { std::cout << "~Widget(" << v << ")\n"; }
};

int main() {
    void* raw = ::operator new(sizeof(Widget));  // allocate only
    Widget* m = new (raw) Widget(4);     // construct in that memory
    std::cout << m->v << '\n';
    m->~Widget();                                // destroy only
    ::operator delete(raw);                      // deallocate only
}
```

It prints:

```output
Widget(4)
4
~Widget(4)
```

Walk through it.

- `::operator new(sizeof(Widget))` asks for raw memory. Nothing is constructed yet. The `::` means "the global one."
- `new (raw) Widget(4)` is called **placement new**. It does not look for memory. It builds a `Widget` at the address you give it. You need `#include <new>` for it.
- `m->~Widget()` calls the destructor by name. This is how an object built in raw memory is destroyed.
- `::operator delete(raw)` gives the memory back. The two halves, `new (raw)` and `m->~Widget()`, must match.

The steps also explain what happens when something goes wrong. An **exception** is C++'s way of reporting an error. Code can `throw` one, and a `try` block can `catch` it. Suppose the constructor throws an exception. C++ knows the object was never fully built. So it calls `operator delete` for you, and the raw memory is returned. Nothing leaks. The second possible failure is that the memory itself cannot be found. Then `operator new` throws `std::bad_alloc`, and no constructor runs at all.

```cpp
#include <iostream>
#include <new>
#include <stdexcept>

struct Bad {
    Bad() { throw std::runtime_error("boom"); }
};

int main() {
    try {
        Bad* b = new Bad;     // constructor throws; memory is freed
        (void)b;
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << '\n';
    }

    try {
        std::size_t n = 1ULL << 50; // about four petabytes of int
        int* big = new int[n];
        delete[] big;
    } catch (const std::bad_alloc&) {
        std::cout << "out of memory\n";
    }
}
```

It prints:

```output
caught: boom
out of memory
```

The first `try` shows the constructor failing. The memory for `Bad` is returned automatically, so there is no leak. The second `try` asks for far more memory than any machine has. `new` cannot find it and throws `std::bad_alloc`.

::: warning
The "freed for you" rule only covers the one `new` expression that failed. If you `new` something and then store the pointer nowhere, the memory is still lost. The next questions show how that happens.
:::

::: answer
**Q20. What happens internally when you call `new`?**

`new` does two jobs. First it calls `operator new`, which finds raw memory of the right size. Then it runs the constructor in that memory, so an object exists there. It returns a typed pointer to the object. If the constructor throws, the memory is released automatically. If no memory can be found, `operator new` throws `std::bad_alloc`. `delete` reverses the work: it runs the destructor and then calls `operator delete`.
:::

## Question 21: Why must `new[]` be paired with `delete[]`?

`new[]` creates an array of objects, and `delete[]` destroys all of them. The reason the two forms differ is simple. `delete[]` must know how many objects to destroy. A plain `delete` only knows about one object.

Here is an array of three objects.

```cpp
#include <iostream>

struct T {
    ~T() { std::cout << "~T "; }
};

int main() {
    T* arr = new T[3];
    delete[] arr;                   // destroys all three
    std::cout << '\n';
}
```

It prints (note the trailing space after each `~T`):

```output
~T ~T ~T 
```

Walk through it.

- `new T[3]` builds three `T` objects in one block. The pointer `arr` points to the first one.
- `delete[] arr` runs the destructor three times, once for each `T`. Each call prints `~T `.
- Because `delete[]` runs three destructors, the output has three `~T`s.

The count is the important part. When you write `new T[3]`, the runtime may store the element count, `3`, along with the block. Only `delete[]` reads that count, and only `delete[]` knows to run every destructor. A plain `delete` on the same pointer does not know there are three objects. It would run one destructor and free the block in the wrong way.

The rule is simple to state. Every `new[]` gets exactly one `delete[]`. Every `new` gets exactly one `delete`. Here is what goes wrong when they do not match.

```cpp
T* arr = new T[3];
delete arr;          // wrong form: UB, only one destructor
                     // may run, and the block is freed wrongly

T* one = new T;
delete[] one;        // wrong the other way: UB

int* nums = new int[3];
delete nums;         // still wrong, even though int has no destructor
```

The last line is the surprise. `int` has no destructor, so the bug may seem harmless. But the rule is about the form of the call, not the type. The compiler is allowed to assume that a `new[]` pointer was freed with `delete[]`, so a mismatch is undefined behavior. It might appear to work today and fail after a small change.

The best answer is to avoid the problem altogether. A `std::vector` owns its array and knows its own size. You never write `delete` at all.

```cpp
#include <iostream>
#include <vector>

struct T {
    ~T() { std::cout << "~T "; }
};

int main() {
    std::vector<T> v(3);            // three T objects, owned by v
}                                   // destroyed here: ~T ~T ~T
```

The `vector` is destroyed when `main` ends, so its three elements are destroyed as well. The output is the same, and no form can be mismatched.

::: warning
Interviewers often ask, "Does `delete` on an `int*` from `new int[3]` crash?" The honest answer is that it may not crash, and that is exactly why it is dangerous. It is undefined behavior, so you cannot rely on what happens.
:::

::: answer
**Q21. Why must `new[]` be paired with `delete[]`?**

`new[]` creates several objects in one block, and it may store the element count. Only `delete[]` reads that information, so it can run every destructor and free the block correctly. A plain `delete` on a `new[]` pointer is undefined behavior, even for `int`, and so is `delete[]` on a single `new` object. The safest fix is to use a `std::vector`, which owns the array and needs no `delete` at all.
:::

## Question 22: What is a memory leak? How do you detect and prevent it?

A **memory leak** happens when your program allocates heap memory and then loses every pointer to it. The memory is still reserved, so nobody can use it or give it back. The program keeps taking more and more memory until it runs out.

Think of a library book. You borrowed it, then lost the card that said where you put it. The book is still checked out to you, but you can never return it, and no one else can read it.

Here is a leak that happens inside a function.

```cpp
#include <iostream>

bool failed() { return true; }

void process() {
    int* data = new int[1000];
    if (failed())
        return;                 // early exit: data is never deleted
    delete[] data;
}

int main() {
    process();
    std::cout << "done\n";
}
```

It prints:

```output
done
```

The program prints `done`, so it looks fine. But the array of 1000 `int`s is never freed. `failed()` returns `true`, so `process` returns before the `delete[]`. The pointer `data` lived on the stack, and it vanished when the function returned. The heap block has no pointer left to it, so it is leaked.

This is the most common leak. A function has two exits, and one of them forgets the `delete`. The bug shows up only on the rare path.

### Detect it

A small leak like this is invisible when you run the program. Use a **sanitizer**. A sanitizer is a tool built into the compiler that checks your program while it runs. You turn it on with a flag. The leak checker is called **LeakSanitizer**, and it is part of AddressSanitizer.

```bash
g++ -g -fsanitize=address leak.cpp && ./a.out
```

Here is a program that leaks on purpose.

```cpp
int main() {
    int* p = new int[1000];
    p = nullptr;          // address lost
}
```

With the sanitizer on, the output begins like this. The exact wording and the stack trace depend on your compiler version, but the first lines are stable.

```output
ERROR: LeakSanitizer: detected memory leaks

Direct leak of 4000 byte(s) in 1 object(s) allocated from:
```

The number `4000` is 1000 `int`s at 4 bytes each. The report also shows the line where the leaked memory was allocated, which is the place to look. Another popular tool is Valgrind, which checks a program in a similar way on Linux. A useful habit is to run the sanitizer on every test.

Some leaks show up only as a program that slowly uses more and more memory. If you see that, a sanitizer or Valgrind is the next step.

### Prevent it

The lasting fix is to give every allocation an owner. An owner is an object that deletes its memory when it goes away. This idea is called **RAII**, which stands for "Resource Acquisition Is Initialization." It means that an object takes a resource in its constructor and gives it back in its destructor. Memory is one kind of resource.

```cpp
#include <iostream>
#include <memory>
#include <vector>

bool failed() { return true; }

void process() {
    std::vector<int> data(1000);   // owns its memory
    if (failed())
        return;                    // freed here
}                                  // ...or here

int main() {
    process();
    auto w = std::make_unique<int>(5);
    std::cout << *w << '\n';
}                                  // w frees its int here
```

It prints:

```output
5
```

Now the early `return` is harmless. The `vector` is destroyed on every exit path, so the memory is always freed. The `std::unique_ptr` works the same way. It frees its object when it goes out of scope, even if an exception is thrown.

Two more habits help. Avoid raw `new` and `delete` in ordinary code. And when two objects point at each other with `std::shared_ptr`, they can form a cycle that is never freed. A **weak_ptr** is a smart pointer that watches an object without owning it. Using one for the back-link breaks the cycle.

::: tip
If you find yourself writing `delete` in a function, stop and ask whether a `vector` or `unique_ptr` could own the memory instead.
:::

::: answer
**Q22. What is a memory leak? How do you detect and prevent it?**

A memory leak is heap memory that is still allocated but that no pointer can reach anymore, so it can never be freed. It usually comes from an early return or an exception that skips a `delete`. Detect it with a sanitizer such as AddressSanitizer with LeakSanitizer, or with Valgrind, which report the allocation site. Prevent it with RAII owners: `std::vector` for arrays and `std::unique_ptr` for single objects. Use `weak_ptr` to break `shared_ptr` cycles.
:::

## Question 23: What is a dangling pointer?

A **dangling pointer** is a pointer that still holds an address, but the object at that address has already died. The pointer is still there. The thing it points to is gone.

Think of a house address written on a piece of paper. The house was torn down last year. The paper still has the address on it, but going there leads nowhere useful. Using the paper is the mistake.

Here is the simplest case, with two pointers to one object.

```cpp
#include <iostream>

int main() {
    int* p = new int(5);
    int* q = p;             // q holds the same address
    std::cout << *q << '\n';
    delete p;
    p = nullptr;            // p is safe now
    // *q = 9;              // UB: q dangles
}
```

It prints:

```output
5
```

Walk through it.

- `new int(5)` creates one `int` on the heap, and `p` points to it.
- `int* q = p;` copies the address. Now `p` and `q` both point to the same `int`. Copying a pointer does not copy the object.
- `delete p;` frees the `int`. The address is now stale, and `q` still holds it.
- `p = nullptr;` makes `p` safe. It has no address to misuse.
- `*q = 9;` would write to freed memory. `q` dangles, and that is undefined behavior. It is commented out so the program stays correct.

Setting `p` to `nullptr` only fixes `p`. It cannot reach into `q`. This is the trap. Every copy of the pointer is still dangling after `delete`.

There are other ways to dangle. The next example shows three of them. It is written to show the bugs, so do not run it as a finished program.

```cpp
int* local() {
    int x = 1;
    return &x;                 // x dies at return
}

std::vector<int> v{1, 2, 3};
int* first = &v[0];
v.push_back(4);                // may reallocate
std::cout << *first;           // may be dangling

std::string_view sv = std::string("temp");
std::cout << sv;               // temp already gone
```

- `local` returns the address of a local variable. The variable `x` is on the stack, and it is destroyed when the function returns. GCC and Clang both warn about this line.
- `first` points to an element inside `v`. `push_back` may need more room. When it does, it moves every element to a new block and frees the old one. `first` then points at freed memory. The source of the trouble is the container, not the pointer.
- `std::string_view` is a light object that looks at a string without owning it. The `std::string("temp")` is a **temporary**, which is an unnamed object that is destroyed at the end of the full line it appears in. The view is left pointing at nothing.

::: warning
A dangling pointer is not the same as a null pointer. A null pointer is set to `nullptr`, and checking `if (p)` is a useful test. A dangling pointer still looks valid, so the check passes and the bug stays hidden.
:::

The cure is ownership. Use values, smart pointers, and containers, so that each object has one clear owner and every pointer is short-lived. Sanitizers help too. AddressSanitizer reports a dangling read the moment it happens, as Question 25 shows.

::: answer
**Q23. What is a dangling pointer?**

A dangling pointer holds the address of an object whose lifetime has ended. Common causes are calling `delete` while another pointer still holds the address, returning the address of a local variable, and keeping a pointer into a `vector` that then reallocates. Setting one pointer to `nullptr` does not fix copies of it. Using a dangling pointer is undefined behavior. Prevent it with clear ownership: smart pointers, values, and containers.
:::

## Question 24: What is a wild or uninitialized pointer?

A **wild pointer** is a pointer that was never given a value. A new local pointer holds whatever bytes happened to be in that place on the stack. Those bytes are a garbage address. Using the pointer is undefined behavior.

Think of a new employee who was given a key card but no building. The card holds some number, but it does not open any door you know about. Trying it could open a stranger's office.

Here are two pointers, one wild and one correct.

```cpp
#include <iostream>

int* g;                  // global: zero-initialized, so nullptr

int main() {
    std::cout << (g == nullptr) << '\n';
    int* q = nullptr;
    if (q) *q = 5;       // check before use: skipped
    std::cout << "ok\n";
}
```

It prints:

```output
1
ok
```

Walk through it.

- `int* g;` is a global. Globals are zero-initialized, so `g` starts as `nullptr`. The test `g == nullptr` prints `1`, which means true.
- `int* q = nullptr;` is a local. It is set on purpose to say "I point at nothing."
- `if (q) *q = 5;` only writes when `q` is not null. Here it is null, so the write is skipped.

Now the wild version. It is shown only to see the bug. Do not run it as a finished program.

```cpp
int main() {
    int* p;              // never initialized: wild
    *p = 5;              // writes to an address we never chose
}
```

The local `p` has no value. The write `*p = 5` goes to whatever address the leftover bytes describe. The program may crash, or it may quietly corrupt some other object. That is what makes it dangerous.

On Clang, `clang++ -Wall` reports this line. The message on the book's build was:

```output
warning: variable 'p' is uninitialized when used here [-Wuninitialized]
```

GCC gives a similar warning with `-Wall`, though the wording differs. Always compile with warnings turned on, and read them.

::: tip
The compiler warning is your friend here. A warning about an uninitialized variable is almost always a real bug, not a false alarm.
:::

The difference between a wild pointer and a dangling pointer matters in interviews. A **wild** pointer was never valid. A **dangling** pointer was valid once, and its object has since died. Both are undefined behavior when used, and both are fixed the same way. Always initialize every pointer, either to a real address or to `nullptr`.

::: answer
**Q24. What is a wild or uninitialized pointer?**

A wild pointer is a pointer that was never given a value. Its contents are whatever garbage was in memory, so it holds a meaningless address. Using it is undefined behavior. A dangling pointer, by contrast, was valid once and its object has since been destroyed. Avoid both by initializing every pointer to a real address or to `nullptr`, and check before use. Turn on `-Wall` so the compiler warns about uninitialized variables.
:::

## Question 25: What happens when you access memory after calling `delete`?

When you call `delete`, the memory goes back to the allocator. The allocator may hand it to someone else right away. Reading or writing it afterward is **use after free**, which is undefined behavior. The program may crash, print the right value, print a wrong value, or do nothing visible at all.

Think of a hotel room that was checked out. The key card still opens the door. Someone may already be sleeping in it. Walking in is not safe, even though nothing seems to happen when you open the door.

Here is the classic trap.

```cpp
#include <iostream>

int main() {
    int* p = new int(42);
    std::cout << *p << '\n';    // fine: still alive
    delete p;
    // *p = 7;                  // UB: use after free
}
```

It prints:

```output
42
```

Walk through it.

- `new int(42)` creates an `int` on the heap. `p` points to it.
- `*p` prints `42`, because the memory is still in use.
- `delete p` returns the block to the allocator. The pointer `p` still holds the address.
- `*p = 7;` writes to the freed block. The line is commented out here so the program stays correct.

Now consider why this is so dangerous. After `delete`, the allocator may reuse that block for something new. Here is a second allocation that might land in the same place.

```cpp
int* p = new int(42);
delete p;               // block returned

int* q = new int(99);   // may reuse the same block

*p = 7;                 // use after free: may overwrite q's value
std::cout << *q;        // might print 7
```

The line `*p = 7;` may overwrite the `99` that `q` now owns. Then `*q` may print `7`. Nothing in the code said that this would happen. It depends on the allocator. This is why the bug is so hard to find: it can appear in one place and cause damage somewhere else.

Here is the same kind of bug, showing what a sanitizer does with it.

```cpp
int main() {
    int* p = new int(42);
    delete p;
    return *p;     // read after delete
}
```

Compile and run it with AddressSanitizer:

```bash
g++ -g -fsanitize=address uaf.cpp && ./a.out
```

The sanitizer stops the program at the bad read. The first lines of its report look like this. The rest is a stack trace that points to the line.

```output
ERROR: AddressSanitizer: heap-use-after-free
READ of size 4 ...
```

The words "heap-use-after-free" tell you exactly what happened. The sanitizer catches the bug on the run where it happens, so use it while you test.

::: warning
"It worked when I ran it" is not evidence that a use-after-free is safe. The program may pass today and fail in production, when the allocator reuses memory differently.
:::

The fix is the same as for the other pointer bugs. Do not use `delete` directly. Let `std::unique_ptr` or `std::vector` own the memory, so the pointer is never used after the owner is gone. When you must keep a raw pointer, make it clear in your design which object owns the memory, and make sure the owner outlives every use.

::: answer
**Q25. What happens when you access memory after calling `delete`?**

Accessing memory after `delete` is use after free, which is undefined behavior. The block goes back to the allocator, which may reuse it for a new object, so a write can corrupt an unrelated value. There is no guaranteed crash, so the program may seem to work. AddressSanitizer reports the problem as `heap-use-after-free` when it happens. Prevent it by letting smart pointers or containers own the memory, so no pointer outlives its owner.
:::

## Chapter summary

- C++ has three kinds of storage: static (whole program), automatic (the stack), and dynamic (the heap, which you request with `new`).
- A program's code is in the text segment, its initialized globals in the data segment, and its zero-start globals in BSS.
- `malloc` returns raw bytes, while `new` allocates and then constructs an object.
- `delete` runs the destructor and then frees memory, while `free` only frees bytes. Always pair `new` with `delete`, `new[]` with `delete[]`, and `malloc` with `free`.
- `new` calls `operator new` and then the constructor. A failed constructor frees the memory for you.
- A leak is heap memory that no pointer can reach. Use sanitizers to find it, and owners such as `vector` and `unique_ptr` to prevent it.
- A dangling pointer outlives the object it points to. A wild pointer was never set. Both are undefined behavior when used.
- Accessing memory after `delete` is use after free. It may appear to work, which makes it dangerous.
