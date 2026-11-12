# Chapter 9 — The Standard Library: Containers

Earlier chapters showed you memory, pointers, classes, and move
semantics. Now we use them. Most real C++ programs do not manage
memory by hand. They store their data in ready-made boxes that the
standard library provides. This chapter explains those boxes, and the
questions interviewers ask about them.

We start from zero. You need four ideas first: the standard library,
containers, iterators, and Big-O notation.

## The four ideas you need first

### The standard library

The **standard library** is the set of ready-made code that comes with
every C++ compiler. You get it with `#include` lines. It has text
output (`std::cout`), strings (`std::string`), math, files, and more.

Part of it is called the **STL**, which stands for Standard Template
Library. The STL holds three kinds of things: containers, iterators,
and algorithms.

A **template** is a pattern that the compiler fills in with a type.
You write `std::vector<int>` to say "a vector of ints". You write
`std::vector<std::string>` to say "a vector of strings". One pattern
works for every type. The text inside the angle brackets, such as
`<int>`, is the type that gets filled in.

**Compile time** is when the compiler reads your code. **Run time** is
when the program runs. Some facts in this chapter are known at compile
time, and some only at run time. That difference matters.

Every example in this chapter uses C++17, and compiles with GCC or
Clang.

### Containers

A **container** is an object that holds other objects. The held objects
are called **elements**. Think of a container as a shelf, a box, or a
card catalog. Each container has its own rules about how elements are
stored, found, and removed. The names a container offers, such as
`size()`, form its **interface**.

A **key** is the label you look things up by. A **value** is the thing
the key leads to, like the definition next to a word in a dictionary.

This chapter covers six containers:

- `std::vector` and `std::array`: elements in a row.
- `std::map` and `std::unordered_map`: each element has a key and a
  value, and you find a value by its key.
- `std::set` and `std::unordered_set`: keys only, no values, no
  duplicates.

Some operations come up in every container. **insert** adds an
element. **find** looks one up. **erase** removes one. **clear**
removes them all. A vector also has **push_back**, which adds one
element at the end.

Here is the smallest useful container program:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {10, 20, 30};
    std::cout << "count: " << numbers.size() << '\n';
    std::cout << "first: " << numbers[0] << '\n';
}
```

It prints:

```output
count: 3
first: 10
```

Line by line:

- Line 1 includes the library for printing.
- Line 2 includes the library for vectors.
- Line 5 creates a vector holding three ints.
- Line 6 asks the vector how many elements it holds with `size()`.
- Line 7 reads the element at index 0. An **index** is a position
  counted from zero. The first element is at index 0.

### Iterators

An **iterator** is an object that points at one element of a
container, and knows how to move to the next one. Think of a bookmark.
It marks a place, and you can slide it forward to the next page.

Every container gives you two iterators. `begin()` points at the first
element. `end()` points one past the last element. There is no element
at `end()`, so you never read from it. You stop when your iterator
reaches `end()`.

You read the element an iterator points at with `*`. You move the
iterator forward with `++`. A **pointer** is a variable that holds the
memory address of an object, as you saw in the chapter on pointers.
The `*` and `++` notation looks like pointer notation, and an iterator
is often a pointer inside. Do not rely on that, though. Use iterators
the way the standard describes them.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30};

    for (auto it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << ' ';
    }
    std::cout << '\n';
}
```

It prints:

```output
10 20 30 
```

Line by line:

- Line 5 creates a vector with three elements.
- Line 7 starts `it` at the first element. The loop keeps going while
  `it` is not equal to `end()`.
- The `++it` at the end of the loop moves `it` to the next element.
  The `auto` keyword lets the compiler work out the iterator's type.
- Line 8 prints the element that `it` points at, with `*it`.

Iterators matter because every container works with them. Once you know
`begin()`, `end()`, `*`, and `++`, you can read any container in this
chapter the same way.

### Big-O notation

**Big-O notation** describes how the work grows as the number of
elements grows. We call the number of elements **n**. Big-O does not
measure seconds. It measures how the cost changes when n gets bigger.

- **O(1)**, pronounced "order one", means the work stays about the
  same no matter how big the container is. Looking at the first
  element is O(1).
- **O(log n)**, "order log n", means the work grows slowly. Doubling
  the size adds only one more step. Searching a sorted phone book by
  halves is O(log n).
- **O(n)**, "order n", means the work grows in step with the size.
  Reading every element once is O(n).

A library card catalog is a good picture. Finding a card when you
already know its drawer is O(1). Finding a book by checking every card,
one at a time, is O(n).

Three more words will appear. **Amortized** means the average cost over
many operations stays small, even if one operation is occasionally
expensive. The **average case** is the cost for a typical input. The
**worst case** is the cost for the worst possible input.

Now the questions.

## Vector versus array (Q71)

Both `std::vector` and `std::array` hold elements in a row. Elements
in a row sit one after another in memory, like houses on one street.
Computer scientists call this **contiguous**. Both containers have the
same interface, so `v[0]`, `size()`, and `begin()` look the same for
both.

The difference is where the elements live, and whether the size can
change.

### Two kinds of memory

Your program has two places to keep data. The **stack** holds local
variables. It is cleaned up automatically when a function returns. The
**heap** holds memory that your program asks for while it runs. Asking
the system for a block of heap memory is called **allocating** it.

### Same three ints, different homes

Here is a small program with one of each:

```cpp
#include <array>
#include <iostream>
#include <vector>

int main() {
    std::array<int, 3> a = {1, 2, 3};
    std::vector<int> v = {1, 2, 3};

    std::cout << "sizeof(a) = " << sizeof(a) << '\n';
    std::cout << "sizeof(v) = " << sizeof(v) << '\n';
    std::cout << "a.size() = " << a.size() << '\n';
    std::cout << "v.size() = " << v.size() << '\n';
}
```

On a typical 64-bit system, it prints:

```output
sizeof(a) = 12
sizeof(v) = 24
a.size() = 3
v.size() = 3
```

Line by line:

- Line 1 includes `std::array`. Line 2 includes printing. Line 3
  includes `std::vector`.
- Line 6 creates the array. Its `<int, 3>` means "three ints". The
  three ints are stored right inside the object `a`.
- Line 7 creates the vector with the same three numbers. Its elements
  are stored somewhere else.
- `sizeof` asks how many bytes an object takes. It is a built-in
  operator, not a function. It prints 12 for the array, because the
  array is exactly three 4-byte ints. It prints 24 for the vector.
- The vector object is small. It holds three pointers, which are 8
  bytes each on a 64-bit system. Those pointers point at the elements.
  The elements are not inside the vector.

The picture shows where things live:

```{=latex}
\begin{memdiagram}
\region[stack]{s}{-0.5,-3.2}{5.0,4.2}{STACK}
\region[heap]{h}{5.8,-1.6}{4.2,3.2}{HEAP}
\arraycells[stack]{a}{1.0,0}{1,2,3}{int a[3]}
\widecell[stack]{v}{1.0,-1.8}{2.6}{vector v}{3 pointers}
\arraycells[heap]{hv}{7.0,0}{1,2,3}{}
\ptr[stack]{v.east}{hv-0.west}
\end{memdiagram}
```

The array `a` is one block on the stack, with its numbers inside. The
vector `v` is a small block on the stack, with three pointers. Those
pointers lead to a separate block on the heap. The vector's three
pointers are named `begin`, `end`, and capacity end in this chapter.
The standard does not name them. Real libraries use their own names.

### Size: fixed at compile time or dynamic

An array's size is fixed. The size is part of the type, so
`std::array<int, 3>` and `std::array<int, 4>` are two different types.
The size must be a constant that the compiler knows. Here are two lines
that do not compile:

```cpp
std::array<int, 3> a = {1, 2, 3};
a.push_back(4);             // no such member: size is fixed

int n;
std::cin >> n;
std::array<int, n> b;       // n must be a constant
```

The first error is clear: an array has no `push_back`. The second
error comes from `n`. It is read at run time, but an array's size must
be known at compile time.

A vector can be sized at run time, and it grows with `push_back`:

```cpp
int n;
std::cin >> n;
std::vector<int> v(n);      // fine: chosen at run time
v.push_back(5);             // grows the vector
```

This is why vectors are the default. Most data has a size you do not
know until the program runs.

::: warning
A pointer into a vector can break when the vector grows. Question 73
explains why. Do not store a pointer to an element, call `push_back`,
and then use the pointer.
:::

### Side by side

| | `std::array<T, N>` | `std::vector<T>` |
|---|---|---|
| Size | Fixed, part of the type | Dynamic, can grow |
| Elements live | Inside the object | Separate heap block |
| Allocation | None | On creation and growth |
| Moving | Element by element, O(n) | Hands over its block, O(1) |
| Use when | Small, size known at compile time | Size unknown or changing |

Moving is the surprise. When you move a vector, it hands its heap block
to the new vector. Only its three pointers change, so the cost is O(1).
An array has no block to hand over. Its elements sit inside the object,
so every element is moved one at a time, and the cost is O(n).

A plain C-style array, such as `int c[3];`, has the same layout as
`std::array`. Prefer `std::array` anyway. It knows its own size, and it
copies like any other value.

::: answer
**Q71. What is the difference between `vector` and `array`?**

`std::array` has a fixed size known at compile time, and it stores its
elements inside the object, with no heap allocation. `std::vector` has
a size that can change at run time, and it stores its elements in a
separate heap block. Use `vector` by default. Use `array` for small,
fixed-size data.
:::

## How a vector manages memory (Q72)

A vector is two things. The first is a small object with three
pointers. The second is one block of memory on the heap, which holds
the elements. The block is where the elements actually live.

Two more words. The **capacity** of a vector is how many elements fit in
its block without asking for more memory. **Reserve** asks the vector
to get room for a given number of elements in advance. A **null**
pointer points at nothing. It is the empty value for a pointer.

### Three pointers and a heap block

Here is a small program that makes room, adds three numbers, and
reports the sizes:

```cpp
#include <cassert>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    v.reserve(4);
    v.push_back(10);
    v.push_back(20);
    v.push_back(30);
    std::cout << "size " << v.size()
              << " capacity " << v.capacity() << '\n';

    int* p = v.data();
    assert(&v[1] == p + 1);
    assert(v[2] == p[2]);
    std::cout << "p[1] = " << p[1] << '\n';
}
```

It prints:

```output
size 3 capacity 4
p[1] = 20
```

Line by line:

- Line 1 includes `assert`, a check that stops the program if a
  condition is false. Line 2 includes printing. Line 3 includes vector.
- Line 6 creates an empty vector. Its three pointers are all null.
- Line 7 asks for room for four ints. The vector gets a heap block big
  enough for four ints. No element exists yet.
- Lines 8 to 10 call `push_back`. Each call builds one element in the
  next free slot, and moves the end pointer forward.
- Lines 11 and 12 print `size()`, which is 3 elements, and
  `capacity()`, which is 4 slots.
- Line 14 calls `data()`. It returns a pointer to the first element.
- Lines 15 and 16 check the layout. Element 1 sits right after element
  0, in the same block. Element 2 is the same as `p[2]`.
- Line 17 prints the second element through the pointer.

Here is the block after line 10:

```{=latex}
\begin{memdiagram}
\region[heap]{hb}{-0.95,-1.7}{5.3,3.6}{HEAP BLOCK (room for 4 ints)}
\arraycells[heap]{b}{0,0}{10,20,30,??}{}
\vznote[plain]{0,1.4}{begin}
\draw[vzptr=plain] (0,1.2) -- (b-0.north);
\vznote[plain]{3.3,1.4}{end}
\draw[vzptr=plain] (3.3,1.2) -- (b-3.north);
\end{memdiagram}
```

`begin` points at the first element. `end` points one past the last
element, which is slot 3. The `??` slot is free. It holds no element
yet, but it is ready for the next `push_back`. The capacity end marks
the end of the whole block, just past slot 3.

The **standard** guarantees one more thing. The elements in the block
are contiguous, just like an array. That is why `data()` works, and why
a vector can be passed to C functions that take a pointer and a count.
The size of the vector object does not change as it grows. Only the
heap block does.

### When the block is full

When a `push_back` finds no room, the vector cannot grow in place. The
space after the block may already be used by something else. So the
vector must do a **reallocation**. It gets a new block, and moves
everything there. It does four steps:

1. It allocates a bigger block on the heap.
2. It moves or copies the elements to the new block.
3. It destroys the old elements, and frees the old block.
4. It updates its three pointers to the new block.

The standard does not say how much bigger the new block must be. It
only requires that `push_back` be amortized O(1). To meet that, the
block must grow **geometrically**. That means each new size is a fixed
multiple of the old one, such as double. In practice GCC and Clang
double the capacity. Microsoft's library grows by about one and a half
times.

Why does doubling make `push_back` cheap on average? Most pushes just
store a value in a free slot, which is O(1). Only the rare push that
triggers growth copies everything, which is O(n). Because the block
doubles each time, those expensive copies happen less and less often.
The total copying work stays proportional to n. Spread over all the
pushes, each one costs O(1) on average.

Two more notes. First, the growth factor is not part of the standard,
so do not rely on the exact numbers. Second, every reallocation makes
old pointers, references, and iterators into the vector unsafe. A
**reference** is another name for an existing object. You will see the
consequences in questions 73 and 75.

::: answer
**Q72. How does `std::vector` manage memory internally?**

A vector is a small object with three pointers. Those pointers mark the
start, the end of the elements, and the end of the allocated space. The
elements sit in one contiguous block on the heap. When the block is
full, the vector allocates a bigger block, moves the elements over,
frees the old block, and updates its pointers. Growth is geometric, so
`push_back` is amortized O(1).
:::

## What happens when a vector exceeds its capacity (Q73)

Question 72 showed what a reallocation does. Now we look at what it
costs and what it breaks.

Start from a vector that is full. Its capacity is 4, and it holds 4
elements. A **dangling pointer** is a pointer that points at memory that
no longer belongs to anyone. Here is the danger. If we keep a pointer
to the first element, and then reallocation frees the block, that
pointer dangles.

```cpp
std::vector<int> v = {1, 2, 3, 4};
// here: size 4, capacity 4 (full)
int* p = &v[0];

v.push_back(5);   // no room left!

// p now dangles: old block is gone
```

The vector is fine. It now holds 1, 2, 3, 4, and 5. But `p` still
points at the old block, which was freed. Reading `*p` is **undefined
behavior**, or **UB** for short. That term means the C++ standard makes
no promises about what happens. The program might print the right value,
print garbage, crash, or seem fine until a later run.

Line by line:

- Line 1 creates a vector that is full.
- Line 3 saves the address of the first element in a pointer.
- Line 5 adds a fifth element. There is no room, so the vector
  reallocates, and the old block is freed.
- Line 7 is a comment. The pointer `p` is now a dangling pointer.

We do not run that snippet, because its output is undefined. The next
examples are safe, and show the growth clearly.

### Watch the capacity grow

This program pushes nine numbers, and prints the capacity after each
push:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    for (int i = 0; i < 9; ++i) {
        v.push_back(i);
        std::cout << v.capacity() << ' ';
    }
    std::cout << '\n';
}
```

With GCC, it prints:

```output
1 2 4 4 8 8 8 8 16 
```

Line by line:

- Line 5 creates an empty vector, with capacity 0.
- Line 6 loops nine times, with `i` from 0 to 8.
- Line 7 adds the value `i`.
- Line 8 prints the capacity after that push.

The numbers show the doubling. The first push allocates room for one
element. The second push finds no room, so the capacity doubles to 2.
The third push doubles it to 4. The fourth fits without growing. The
fifth doubles it to 8, and so on. Each growth happens at a power of two.

The exact numbers come from the GCC library. Another compiler may print
a different sequence. Do not depend on them.

### Move or copy during growth

When a vector grows, it must move the old elements. Should it move them,
or copy them? That depends on a keyword called **noexcept**. It is a
promise that a function will not throw an exception. An **exception** is
a way for a function to report an error and stop. A `catch` block can
handle it.

The example below defines a small type with two **constructors**. A
constructor is the function that builds an object. The copy constructor
builds a new object from an existing one, by copying. The move
constructor builds it by taking over the existing one's contents. Each
one prints a word, so we can see which runs.

```cpp
#include <iostream>
#include <vector>

struct A {
    A() = default;
    A(const A&)     { std::cout << "copy "; }
    A(A&&) noexcept { std::cout << "move "; }
};

int main() {
    std::vector<A> v(2);   // size 2, capacity 2
    v.emplace_back();      // reallocates
    std::cout << '\n';
}
```

It prints:

```output
move move 
```

Line by line:

- Lines 4 to 8 define the struct `A`.
- Line 5 is the default constructor, written as `= default`. It prints
  nothing.
- Line 6 is the copy constructor, which takes `const A&`. It prints
  `copy`.
- Line 7 is the move constructor, which takes `A&&`. It is marked
  `noexcept`, and it prints `move`.
- Line 11 creates a vector of two `A` objects. The block has room for
  exactly two.
- Line 12 calls `emplace_back`, which builds one more `A` at the end. The
  vector is full, so it reallocates, and moves the two old elements.
  Each move prints `move`.

If you delete `noexcept` from line 7, the same program prints:

```output
copy copy 
```

The vector copies instead of moving. Why does that matter? If a move
throws halfway through, the vector would be left broken, because the old
elements were already taken over. If a copy throws halfway, the original
elements are still in the old block, so the vector can stay as it was.
The standard library uses the move only when it is `noexcept`, or when
the type cannot be copied at all.

::: tip
Mark your move constructors and move assignment operators `noexcept`
when they cannot throw. Vectors then move your objects during growth,
which is faster.
:::

::: answer
**Q73. What happens when a vector exceeds its capacity?**

The vector allocates a bigger block, moves or copies the elements into
it, destroys and frees the old block, and updates its pointers. The
growth factor is up to the implementation, often two. Every pointer,
reference, and iterator into the vector is now invalid, so using one is
undefined behavior. The vector moves its elements only if the move
constructor is `noexcept`, or copies them otherwise.
:::

## Size versus capacity (Q74)

Size and capacity are both counts, and they are easy to mix up. Size
counts the elements that exist. Capacity counts the slots that are
ready for elements. Capacity is always at least as big as size.

### Elements that exist versus slots that exist

Here is a program with both numbers printed:

```cpp
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    std::vector<int> v;
    v.reserve(8);
    v.push_back(7);
    v.push_back(4);
    v.push_back(9);
    std::cout << "size " << v.size()
              << " capacity " << v.capacity() << '\n';

    v.clear();
    std::cout << "after clear: size " << v.size()
              << " capacity " << v.capacity() << '\n';

    std::vector<int> w(3);
    try {
        w.at(50) = 1;
    } catch (const std::out_of_range&) {
        std::cout << "at() threw std::out_of_range\n";
    }
}
```

It prints:

```output
size 3 capacity 8
after clear: size 0 capacity 8
at() threw std::out_of_range
```

Line by line:

- Line 6 creates an empty vector. Line 7 reserves room for 8 ints.
  Nothing is stored yet, so size is 0 and capacity is 8.
- Lines 8 to 10 add 7, 4, and 9. Size becomes 3. Capacity stays 8,
  because the block already has room.
- Lines 11 and 12 print the two numbers: size 3 and capacity 8.
- Line 14 calls `clear()`. It destroys all three elements. Size drops to
  0. Capacity stays at 8, because the memory is kept for later use.
- Lines 18 to 23 try `at(50)` on a vector with three elements. The
  `at` function checks the index against the size. It throws
  `std::out_of_range`, and the `catch` block prints a message.

The `try` block holds code that might throw. The `catch` block handles
the exception. We do not print the exception's own text, because its
wording depends on the library.

### Capacity is not permission

Capacity tells you the room in memory. It does not give you the right to
use that room as elements. Only indices below `size()` hold elements. The
other slots are empty, and reading or writing them is not allowed.

```cpp
std::vector<int> v(3);   // size 3, capacity 3
v.reserve(100);          // size 3, capacity >= 100
v[50] = 1;               // UB: index >= size()
v.at(50) = 1;            // throws std::out_of_range

v.clear();               // size 0, capacity unchanged
v.shrink_to_fit();       // request: capacity -> size
```

Line by line:

- Line 1 makes a vector with three elements. Size and capacity are both 3.
- Line 2 reserves room for 100. Size is still 3.
- Line 3 writes to index 50. There are only three elements, so this is
  undefined behavior.
- Line 4 does the same with `at`. This time the check runs, and the
  function throws.
- Line 6 clears the vector. Size becomes 0. Capacity stays.
- Line 7 asks for the extra memory back. The standard calls
  `shrink_to_fit` a non-binding request. The library is free to ignore
  it. Do not rely on the capacity after this call.

::: warning
`v[i]` does not check the index. `v.at(i)` does, and throws if `i` is out
of range. Use `at` when the index comes from outside your code, and you
want an error rather than undefined behavior.
:::

### Side by side

| | `size()` | `capacity()` |
|---|---|---|
| Counts | Elements that exist | Slots allocated |
| Grows on | `push_back`, `insert`, `resize` | Reallocation or `reserve` |
| Shrinks on | `pop_back`, `erase`, `clear` | Only `shrink_to_fit`, or a swap |

Size grows with every `push_back` or `insert`. Capacity grows only when
the block is full, or when you call `reserve`. Size shrinks when you
erase or clear. Capacity hardly ever shrinks on its own.

::: answer
**Q74. What is the difference between `size()` and `capacity()`?**

`size()` is the number of elements that actually exist in the vector.
`capacity()` is the number of elements it can hold before it must
reallocate. Size is always less than or equal to capacity. You may only
access indices below `size()`. `clear()` lowers the size to zero, and
keeps the capacity.
:::

## Iterator invalidation (Q75)

An iterator is a bookmark into a container. Its job is to point at an
element. But what if the container changes under it? The bookmark can
point at a place that no longer holds what you expected. We say the
iterator is **invalidated** when a change to the container has made it
unsafe to use.

### Holding an iterator across a push_back

```cpp
std::vector<int> v = {1, 2, 3};
// capacity 3 here: full
auto it = v.begin();

v.push_back(4);    // reallocates

std::cout << *it;  // UB: it dangles
```

Line by line:

- Line 1 creates a vector with three elements. Its capacity is 3, which
  is full.
- Line 3 saves an iterator to the first element.
- Line 5 adds a fourth element. The vector reallocates to a new block,
  and frees the old one.
- Line 7 reads through `it`. But `it` still points into the old, freed
  block. This is undefined behavior.

The vector is fine. The problem is only `it`. The iterator still exists,
but it refers to memory that is gone. The bug is hard to spot. Often this
code appears to work, because the old memory has not been reused yet.
That is why it can survive testing and fail later.

We do not run this snippet, because its output is undefined.

### The classic: erasing inside a loop

The most common invalidation bug happens when you remove elements inside
a loop. Here is the wrong way, which removes every even number:

```cpp
// remove all even numbers: BROKEN
for (auto it = v.begin(); it != v.end(); ++it)
    if (*it % 2 == 0)
        v.erase(it);          // it is now invalid
```

When `erase` runs, the element under `it` is removed. Everything after
it shifts one step left. The iterator `it` now refers to a spot that
belongs to an element the vector has already moved. Then `++it` moves
from that point, which is undefined behavior. This snippet compiles, but
we do not run it.

The fix is to use the iterator that `erase` returns. It points at the
element after the one you removed. Assign it back, and only move forward
when you did not erase:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4, 5, 6};
    for (auto it = v.begin(); it != v.end(); ) {
        if (*it % 2 == 0)
            it = v.erase(it);
        else
            ++it;
    }
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

It prints:

```output
1 3 5 
```

Line by line:

- Line 6 starts the loop at the first element. Notice there is no `++it`
  in the loop header. We move `it` ourselves.
- Line 7 checks whether the element under `it` is even.
- Line 8 erases it. `erase` returns the iterator to the next element.
  We save that into `it`, so `it` is valid again.
- Line 10 handles the odd case. Here we did not erase, so we move
  forward ourselves.
- Lines 12 and 13 print what is left: 1, 3, and 5.

C++20 adds a shorter way for this job. `std::erase_if` removes every
element that matches a condition. It takes a **lambda**: a small unnamed
function written right where it is used. This lambda answers "is x
even?". We checked that the line below compiles with `-std=c++20`, and
that it prints the same `1 3 5`:

```cpp
std::erase_if(v, [](int x) { return x % 2 == 0; });
```

Before C++20, people wrote the **erase-remove idiom**. It is a two-step
pattern. `std::remove_if` moves the elements to keep toward the front.
Then `erase` removes the leftover tail. It needs `<algorithm>`:

```cpp
v.erase(std::remove_if(v.begin(), v.end(),
                       [](int x) { return x % 2 == 0; }),
        v.end());
```

### Every container has its own rules

Each container has its own rules for what a change invalidates. This
table comes from the standard:

| Container | What a change invalidates |
|---|---|
| `vector`, `string` | Reallocation: everything. Otherwise: everything at or after the change point. |
| `deque` | Push at either end: all iterators, references stay valid. Middle insert or erase: all. |
| `list`, `forward_list` | Insert: nothing. Erase: only the erased element. |
| `map`, `set` | Erase: only the erased element. |
| `unordered_map`, `unordered_set` | Rehash: all iterators, references stay valid. Erase: only the erased element. |

Vector and string are the strictest. A deque is odd. Its references stay
valid when it grows at the ends, but its iterators do not. List, map,
and set are **node-based**. Each element sits in its own small box, called
a **node**, linked to the others. So an erase only affects the one
element it removes.

::: tip
Interview habit: when you change a container inside a loop, ask
"what does this operation invalidate?" Then ask "what do I do with the
iterator I got back?"
:::

::: answer
**Q75. What is iterator invalidation?**

Iterator invalidation means an iterator, pointer, or reference no longer
refers to a valid element, usually because the container changed.
Using it is undefined behavior. In a vector, reallocation invalidates
everything, and an erase invalidates the iterators from that point on.
Node-based containers such as list, map, and set only lose the erased
element. In a loop that erases, write `it = c.erase(it)`.
:::

## Map versus unordered_map (Q76)

A `std::map` and a `std::unordered_map` both store key and value pairs.
Their interfaces look almost the same. Inside, they work in very
different ways.

A `map` is a **balanced tree**. A tree is a structure of nodes, where
each node links to up to two children. Balanced means the tree keeps its
shape even, so no path gets too long. The usual choice is a
**red-black tree**. In a map, smaller keys go to the left, and bigger
keys go to the right. Walking the tree in order gives sorted keys.

An `unordered_map` is a **hash table**. A **hash** is a number computed
from a key. The hash table uses that number to pick a **bucket**, which
is a slot in an array of buckets. Two keys can land in the same bucket.
Keys that share a bucket are chained together. There is no order.

### Same keys, two structures

Here is a program that puts the same keys in both:

```cpp
#include <iostream>
#include <map>
#include <string>
#include <unordered_map>

int main() {
    std::map<std::string, int> m = {
        {"pear", 3}, {"apple", 5}, {"fig", 1}};
    for (const auto& [key, value] : m)
        std::cout << key << '=' << value << ' ';
    std::cout << '\n';

    auto it = m.lower_bound("b");
    std::cout << "lower_bound(b): " << it->first << '\n';

    std::unordered_map<std::string, int> u(m.begin(), m.end());
    std::cout << "fig: " << u.at("fig") << '\n';
}
```

It prints:

```output
apple=5 fig=1 pear=3 
lower_bound(b): fig
fig: 1
```

Line by line:

- Lines 7 and 8 build a map with three pairs. Each pair is a key and a
  value, written in braces.
- Lines 9 and 10 loop over the map. `const auto& [key, value]` is a
  **structured binding**. It splits each pair into two names. Keys come
  out in sorted order: apple, fig, pear.
- Line 13 calls `lower_bound("b")`. It returns an iterator to the first
  key that is not less than "b". That is "fig". `it->first` reads the
  key of the element the iterator points at.
- Line 16 builds an unordered map from the same pairs. Its iteration
  order is unspecified. Only the lookup is printed, because the order
  is not something to depend on.
- Line 17 looks up "fig" with `at`, which throws if the key is missing.

The map gives sorted order. That lets it answer range questions, such
as "what is the first key after b?". The unordered map gives no order,
but its lookups are usually quicker.

A map needs its keys to be comparable with **operator<**. That is the
function that answers "is a less than b?". An unordered map needs a
**hash function**, which turns a key into a number. It also needs
**operator==**, which answers "are these two keys equal?".

### Side by side

| | `map` | `unordered_map` |
|---|---|---|
| Structure | Balanced tree | Hash table with buckets |
| Order | Sorted by key | Unspecified, can change |
| Lookup | O(log n), guaranteed | O(1) average, O(n) worst case |

The last row is the important one. Question 77 explains it in detail.

::: tip
A **comparator** is a function that answers "is a less than b?". You can
give a map a comparator instead of `operator<`. If the key type has
neither, the compiler reports an error when you use the map. An unordered
map has the same problem when its key type has no hash function or no
`operator==`.
:::

::: answer
**Q76. What is the difference between `map` and `unordered_map`?**

A `map` is a balanced binary search tree. It keeps keys sorted, and it
supports range queries such as `lower_bound`. Its operations are
O(log n) in every case. An `unordered_map` is a hash table. It has no
order, and its operations are O(1) on average, but O(n) in the worst
case, when many keys share a bucket.
:::

## Insertion, lookup, and deletion costs (Q77)

Question 76 gave the big picture. Now we want the exact costs. There are
three operations: insert adds an element, find looks one up, and erase
removes one. Remember the average and worst cases from the Big-O
section.

### The answer in one grid

| Operation | `map` | `unordered_map` |
|---|---|---|
| Insert | O(log n), always | O(1) average, O(n) worst |
| Find | O(log n), always | O(1) average, O(n) worst |
| Erase | O(log n), always | O(1) average, O(n) worst |

A map is a balanced tree. Its height grows with log n, so every insert,
find, and erase is O(log n), even in the worst case.

An unordered map is a hash table. Each operation is O(1) on average. In
the worst case, all keys land in one bucket. Then a lookup must check
every key one by one, which is O(n).

One detail: if you already hold an iterator to an element in a map,
erasing it does not need a search. The standard says that is amortized
O(1).

### Why the worst case exists

Picture the buckets. With a good hash, the keys spread out, and each
bucket holds about one key. A lookup computes the hash, goes to one
bucket, and checks about one key.

```{=latex}
\begin{memdiagram}
\region[ok]{gr}{-0.4,5.3}{8.1,5.8}{GOOD HASH: about one key per bucket, O(1)}
\region[bad]{br}{-0.4,-1.3}{8.1,5.8}{BAD HASH: every key in one bucket, O(n)}
\vznote[plain]{0.6,10.2}{bucket 0}
\vznote[plain]{0.6,9.0}{bucket 1}
\vznote[plain]{0.6,7.8}{bucket 2}
\vznote[plain]{0.6,6.6}{bucket 3}
\widecell[ok]{g0}{2.2,10.2}{1.1}{}{k1}
\widecell[ok]{g1}{2.2,9.0}{1.1}{}{k2}
\widecell[ok]{g2}{2.2,7.8}{1.1}{}{k3}
\widecell[ok]{g3}{2.2,6.6}{1.1}{}{k4}
\vznote[plain]{0.6,3.6}{bucket 0}
\vznote[plain]{0.6,2.4}{bucket 1}
\vznote[plain]{0.6,1.2}{bucket 2}
\vznote[plain]{0.6,0.0}{bucket 3}
\widecell[bad]{c1}{2.2,3.6}{1.1}{}{k1}
\widecell[bad]{c2}{3.7,3.6}{1.1}{}{k2}
\widecell[bad]{c3}{5.2,3.6}{1.1}{}{k3}
\widecell[bad]{c4}{6.7,3.6}{1.1}{}{k4}
\ptr[bad]{c1.east}{c2.west}
\ptr[bad]{c2.east}{c3.west}
\ptr[bad]{c3.east}{c4.west}
\vznote[plain]{2.2,2.4}{(empty)}
\vznote[plain]{2.2,1.2}{(empty)}
\vznote[plain]{2.2,0.0}{(empty)}
\end{memdiagram}
```

With the bad hash, the hash table is no better than a linked list. A
bad hash can come from a poor hash function. It can also come from keys
that an attacker chose on purpose. Then a lookup walks a long chain.
This is one reason to prefer a map when worst-case speed matters.

The **load factor** is the average number of keys per bucket. When it
gets too high, the table grows. This is a **rehash**. It builds a bigger
array of buckets, and moves every key into it. A rehash costs O(n).

### The costs hiding behind the big O

Here is a program that uses both containers with one million keys:

```cpp
#include <iostream>
#include <map>
#include <unordered_map>

int main() {
    std::map<int, int> m;
    std::unordered_map<int, int> u;
    u.reserve(1000000);
    for (int i = 0; i < 1000000; ++i) {
        m[i] = i * 2;
        u[i] = i * 2;
    }
    std::cout << m.find(42)->second << ' '
              << u.find(42)->second << '\n';
    std::cout << m.size() << ' ' << u.size() << '\n';
}
```

It prints:

```output
84 84
1000000 1000000
```

Line by line:

- Lines 6 and 7 create an empty map and an empty unordered map.
- Line 8 calls `reserve(1000000)` on the unordered map. This makes room
  for a million buckets up front, so it does not rehash while filling.
- Lines 9 to 12 insert one million pairs into each container. The key
  is `i`, and the value is `i * 2`. The `m[i]` form inserts the element
  if it is missing, and then returns a reference to its value.
- Lines 13 and 14 find the key 42 in each container. `find` returns an
  iterator, and `->second` reads its value. Both print 84.
- Line 15 prints the sizes. Both hold one million elements.

A balanced tree with one million keys is about 20 to 40 levels deep. So
a map lookup makes a few dozen comparisons. A hash lookup computes one
hash, then checks a few keys in one bucket.

Two costs hide behind the big O. First, an insert can trigger a rehash.
That costs O(n), but it is rare, so the insert is still O(1) on average.
Calling `reserve` up front avoids most of them. Second, with string keys,
hashing or comparing costs time proportional to the length of the string.
A long string key makes every operation slower, even in a hash table.

::: warning
Do not say "unordered_map is always faster". It is faster on average
for typical keys. A map can be the better choice when you need sorted
order, a range query, or a guaranteed bound on the worst case.
:::

::: answer
**Q77. What are the time complexities of insertion, lookup, and deletion in `map` and `unordered_map`?**

For `map`, insert, find, and erase are all O(log n) in every case,
because it is a balanced tree. For `unordered_map`, they are O(1) on
average, and O(n) in the worst case, when keys collide in one bucket. A
rehash costs O(n), but it is rare, and `reserve` can avoid it.
:::

## Set versus unordered_set (Q78)

A **set** is a container that holds keys only. It has no values. A set
never keeps two equal keys. It is a map with the values thrown away.

A `std::set` keeps its keys in a balanced tree. A `std::unordered_set`
keeps them in a hash table. The same trade-offs from question 76 apply.

### Same input, different output

```cpp
#include <iostream>
#include <set>
#include <unordered_set>

int main() {
    std::set<int> s = {5, 1, 4, 1, 3};
    for (int x : s) std::cout << x << ' ';
    std::cout << '\n';
    std::cout << "size " << s.size() << '\n';

    std::unordered_set<int> u = {5, 1, 4, 1, 3};
    std::cout << "size " << u.size() << '\n';
    std::cout << "has 4? " << (u.count(4) == 1) << '\n';
}
```

It prints:

```output
1 3 4 5 
size 4
size 4
has 4? 1
```

Line by line:

- Line 6 builds a set from five numbers. The second 1 is a duplicate, so
  the set keeps only one.
- Line 7 loops over the set. The output is sorted: 1, 3, 4, 5.
- Line 9 prints the size, which is 4, not 5.
- Line 11 builds an unordered set from the same five numbers. It also
  drops the duplicate, so its size is 4.
- Line 13 checks membership with `count`. It returns 1 if the key is
  there, and 0 if not. The parentheses make the comparison happen before
  the printing.

Line 11 builds the unordered set, but the program never loops over it.
That is on purpose. Its order is unspecified, so a loop would print the
four values in an order you must not depend on.

### Your own type: different requirements

A set needs to order its keys. An unordered set needs a hash and an
equality test. Here is a small `Point` type that works with both. A
**tuple** is a small group of values, and `std::tie` builds a tuple of
references to the fields, so they can be compared one after another.

```cpp
#include <cstddef>
#include <functional>
#include <iostream>
#include <set>
#include <tuple>
#include <unordered_set>

struct Point { int x, y; };

bool operator<(const Point& a, const Point& b) {
    return std::tie(a.x, a.y) < std::tie(b.x, b.y);
}
bool operator==(const Point& a, const Point& b) {
    return a.x == b.x && a.y == b.y;
}
struct PointHash {
    std::size_t operator()(const Point& p) const {
        return std::hash<int>{}(p.x) * 31 + std::hash<int>{}(p.y);
    }
};

int main() {
    std::set<Point> s = {{2, 1}, {1, 5}, {1, 2}};
    for (const Point& p : s) std::cout << p.x << ',' << p.y << ' ';
    std::cout << '\n';
    std::unordered_set<Point, PointHash> u = {{2, 1}, {1, 5}};
    std::cout << u.size() << '\n';
}
```

It prints:

```output
1,2 1,5 2,1 
2
```

Line by line:

- Line 8 defines `Point` with two ints.
- Lines 10 to 12 define `operator<`. It compares x first, then y. The
  set uses it to keep the points sorted.
- Lines 13 to 15 define `operator==`. The unordered set uses it to tell
  keys apart inside one bucket.
- Lines 16 to 19 define `PointHash`, a hash function for `Point`. It
  combines the hashes of x and y. The factor 31 is a common way to mix
  two numbers.
- Line 22 builds a set of three points. The set sorts them. The loop
  prints them in order: (1,2), (1,5), (2,1).
- Line 25 builds an unordered set. We pass `PointHash` as the second
  template argument, so the set knows how to hash a `Point`.
- Line 26 prints the size, which is 2.

Forgetting the hash is the classic compile error here. Without it, the
compiler rejects `std::unordered_set<Point>`, because `std::hash` has no
version for `Point`. Forgetting `operator<` causes a similar error for
`std::set`, but only when you first insert an element.

Elements in both containers are **const**. That means you cannot change
them through the container. You cannot change a key in place. A set's
order depends on its keys, and so does an unordered set's bucket.
Changing a key would break that. Erase the element, and insert the new
value. The compiler rejects an attempt to write through an iterator, such
as `*s.begin() = 5`.

### Side by side

| | `set` | `unordered_set` |
|---|---|---|
| Structure | Balanced tree | Hash table |
| Iteration | Sorted | Unspecified order |
| Operations | O(log n), always | O(1) average, O(n) worst |

A set gives you range queries, and the smallest or largest key, for
free. Both containers have a multi version for duplicates: `multiset`
and `unordered_multiset`.

::: tip
If you need the keys in order, or you want the smallest key, use `set`.
If you only need to ask "is this key here?", use `unordered_set`.
:::

::: answer
**Q78. What is the difference between `set` and `unordered_set`?**

Both hold unique keys with no values. A `set` is a balanced tree. It keeps
keys sorted, and needs `operator<`, with O(log n) operations. An
`unordered_set` is a hash table. Its keys have no order, and it needs a
hash and `operator==`. Its operations are O(1) on average, and O(n) in the
worst case.
:::

## Chapter summary

- The standard library ships with C++. Its containers hold elements.
  Iterators point at elements, and Big-O says how work grows with n.
- An array has a fixed size known at compile time, and stores its
  elements inside the object. A vector grows at run time, and stores its
  elements in one heap block.
- A vector is three pointers into one contiguous heap block. Its
  capacity is the number of slots in that block.
- When a vector is full, it allocates a bigger block, moves the elements,
  and frees the old block. The growth is geometric, so `push_back` is
  amortized O(1).
- Size counts elements that exist. Capacity counts slots that fit. Only
  indices below size are valid, and `at` checks them.
- Reallocation and erase can invalidate iterators, pointers, and
  references. Use the iterator that `erase` returns, and do not reuse an
  old one.
- A map is a balanced tree with sorted keys and O(log n) operations. An
  unordered map is a hash table with O(1) average and O(n) worst case.
- The set pair is the same idea without values. Use `set` for order and
  range queries. Use `unordered_set` for fast membership tests.
