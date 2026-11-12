# Chapter 5 — Pointers and References in Depth

You already know that a **pointer** is a variable that holds an address, and that a **reference** is another name for an existing object. You also met `nullptr`, the **stack** (where local variables live) and the **heap** (memory you ask for with `new`), and smart pointers that free memory for you.

This chapter goes deeper. We will move a pointer through an array, follow pointers to pointers, read tricky `const` declarations, learn why returning a local's address is a disaster, and find out why arrays and pointers are not the same thing. Every section starts with a small picture, then a complete program, then what it prints.

Please read the code slowly. Most interview traps hide in one or two lines.

## Pointer arithmetic

Pointer arithmetic means doing `+` and `-` on a pointer. The result is a new address. The important rule is simple, but beginners often get it wrong: **adding a number to a pointer moves it by whole elements, not by bytes.**

An **array** is a row of values of the same type, stored side by side in memory. Each value in the row is an **element**. An array of four `int`s has four elements.

Think about houses on one street. If every house is the same width, then "two houses down" means two houses, not two feet. A pointer works the same way. Its step size is the size of the thing it points to.

The **size** of a type is the number of bytes one value takes. You can ask for it with the **sizeof** operator, which we explain in the array sections. On most desktop systems an `int` is 4 bytes and a `double` is 8 bytes.

A second term: **undefined behavior** (UB) means the C++ standard does not say what happens. The program may crash, print garbage, or appear to work. UB is never something you want, even if it seems to work on your machine today.

### Adding moves by elements

Here is a complete program.

```cpp
#include <iostream>

int main() {
    int arr[4] = {10, 20, 30, 40};
    int* p = arr;        // p points to arr[0]
    int* q = p + 2;      // q points to arr[2]

    std::cout << *q << '\n';     // 30
    std::cout << q - p << '\n';  // 2

    p++;                         // p now points to arr[1]
    std::cout << *p << '\n';     // 20
}
```

It prints:

```output
30
2
20
```

Walk through it line by line:

- `int arr[4] = {...};` makes four `int`s in a row. The array's name, `arr`, is the address of its first element.
- `int* p = arr;` makes `p` point to `arr[0]`. We will look at why the name turns into an address in the array sections.
- `int* q = p + 2;` moves `p` forward by two *elements*. On a system with 4-byte `int`s, that is 8 bytes. Now `q` points to `arr[2]`.
- `*q` follows the arrow and reads `30`. The `*` is the **dereference** operator: it means "the value at this address."
- `q - p` subtracts two pointers. The answer is the distance in elements, which is `2`. It is not the distance in bytes.
- `p++` moves `p` forward by one element, to `arr[1]`. That is why `*p` now prints `20`.

Here is the memory picture:

```{=latex}
\begin{memdiagram}
\region[stack]{arr}{-1.3,-1.1}{5.6,2.1}{arr}
\arraycells[stack]{a}{0,0}{10,20,30,40}{}
\cell[stack]{p}{0,2.4}{int* p}{0x100}
\cell[stack]{q}{2.2,2.4}{int* q}{0x108}
\ptr[stack]{p.south}{a-0.north}
\ptr[stack]{q.south}{a-2.north}
\vznote[plain]{5.8,2.4}{p points to arr[0]\\q points to arr[2]}
\end{memdiagram}
```

The addresses here are made up for the picture. Your computer may use other numbers, but the spacing of 4 bytes between `int`s is typical.

### The step size comes from the type

The step size is not always 4 bytes. It depends on the type the pointer points to. An `int*` steps by `sizeof(int)`. A `double*` steps by `sizeof(double)`.

```cpp
#include <iostream>

int main() {
    int a[4] = {1, 2, 3, 4};
    int* pa = a;

    a[2] = 7;                    // same as *(a + 2) = 7;
    std::cout << *(pa + 2) << ' ' << a[2] << '\n';

    std::cout << sizeof(int) << ' ' << sizeof(double) << '\n';
}
```

It prints (on a typical desktop system):

```output
7 7
4 8
```

Walk through it:

- `a[2] = 7;` sets the third element to 7.
- `*(pa + 2)` moves `pa` two `int`s forward and reads that value. It prints `7`.
- `a[2]` also prints `7`. Those two expressions name the same element.
- The last line shows the step sizes: 4 bytes for `int`, 8 for `double`.

Here is the key idea behind the example. **Subscripting is pointer arithmetic.** The expression `a[2]` is defined as `*(a + 2)`. The `[]` is a shorter way to write "move forward, then dereference." The same is true for `a[i]` and `*(a + i)`.

### Where pointer arithmetic is legal

You may point at any element of an array. You may also point one place past the end, to the address just after the last element. That one-past-the-end address is legal to create and compare, but **never legal to dereference**.

Going any further is UB, even if you never read through the pointer. Subtracting pointers that point into different objects is also UB.

Here is the safe way to walk an array. An **iterator** is an object that points at an element and moves to the next one. The standard library uses the same idea everywhere.

```cpp
#include <iostream>

int main() {
    int arr[4] = {10, 20, 30, 40};
    int* end = arr + 4;   // one past the end: OK to make and compare

    for (int* it = arr; it != end; ++it)
        std::cout << *it << ' ';
    std::cout << '\n';
}
```

It prints:

```output
10 20 30 40 
```

Walk through it:

- `arr + 4` is the address one past `arr[3]`. We store it in `end` and never read from it.
- `it` starts at the first element.
- The loop runs while `it` is not equal to `end`. Each time around, `*it` is an element that really exists.
- `++it` moves `it` to the next element. When `it` reaches `end`, the loop stops before any dereference happens.

Now the rules you must not break. These lines would be UB:

```cpp
int arr[4] = {10, 20, 30, 40};
int* end = arr + 4;   // OK: one past the end
*end = 5;             // UB: never dereference it
int* bad = arr + 5;   // UB: even forming this address is UB

int x = 1, y = 2;
auto d = &y - &x;     // UB: the two pointers are in different objects
```

::: warning
Walking past the end of an array is one of the most common bugs in C++. The bug is often silent. The program may run fine until a different input makes it crash. Always stop your loop at the end pointer or at the array size.
:::

::: tip
The rule for stepping is "times the size of the type." If `p` is an `int*`, then `p + 3` is 12 bytes further on a 4-byte `int`. You never have to multiply by hand, because the compiler does it for you.
:::

::: answer
**Q36. What is pointer arithmetic?**

Pointer arithmetic is adding or subtracting whole numbers to a pointer, or subtracting two pointers. Adding `n` moves the pointer by `n` elements, which is `n` times the size of the type in bytes. Subtracting two pointers into the same array gives the number of elements between them. The expression `a[i]` is defined as `*(a + i)`, so array subscripting is pointer arithmetic. Pointers must stay inside the array, or one past its end, and only the end address can never be dereferenced.
:::

## Pointers, lvalue references and rvalue references

C++ has three ways to name an object with an address-like handle: `int* p`, `int& r`, and `int&& r`. They look alike, but they behave differently. To explain them, we need three words.

An **lvalue** is an object that has a name, and you can take its address. A variable like `x` is an lvalue. A **temporary** is a value that exists only for a moment, with no name, like the number `10` or the result of `x + 1`. An **rvalue** is a value that is a temporary, or that you treat as one.

### What each one binds to

Here is a complete program.

```cpp
#include <iostream>

int main() {
    int x = 5;
    int* p = &x;      // p holds the address of x
    int& r = x;       // r is another name for x
    r = 6;

    int&& rr = 10;    // rr binds to a temporary 10

    std::cout << x << ' ' << *p << ' ' << r << ' ' << rr << '\n';
}
```

It prints:

```output
6 6 6 10
```

Walk through it:

- `int* p = &x;` makes `p` a separate variable. Its value is the address of `x`. The `&` here means "address of."
- `int& r = x;` makes `r` a second name for `x`. There is no new box for `r` to hold. Anything you do to `r` happens to `x`.
- `r = 6;` changes `x`, because `r` is `x`. So `x` is 6.
- `*p` follows the arrow from `p` to `x`, so it is 6 too.
- `int&& rr = 10;` binds a name to the temporary `10`. The temporary lives as long as `rr` does.

Here is the memory picture:

```{=latex}
\begin{memdiagram}
\cell[stack]{x}{0,0}{int x}{6}
\vznote[plain]{0,0.95}{x: 5, then 6}
\cell[stack]{p}{3.2,0}{int* p}{\&x}
\ptr[stack]{p.west}{x.east}
\cell[stack]{r}{0,-2.4}{}{alias}
\vznote[plain]{-1.6,-2.4}{int\& r}
\ptrlabel[stack]{r.north}{x.south}{same object}
\cell[data]{tmp}{6.4,0}{temporary}{10}
\cell[data]{rr}{6.4,-2.4}{}{alias}
\vznote[plain]{8.6,-2.4}{int\&\& rr}
\ptrlabel[data]{rr.north}{tmp.south}{binds}
\end{memdiagram}
```

Some lines are illegal. They are shown here as comments:

```cpp
// int& bad = 10;    error: 10 is an rvalue, not an lvalue
// int&& bad2 = x;   error: x is an lvalue
int&& ok = std::move(x);  // OK: std::move casts x to an rvalue
```

The last line uses `std::move`, which lives in `<utility>`. It does not move anything by itself. It only changes how the compiler sees `x`, so `x` can bind to `&&`.

### Why && exists: overloading

Why do rvalue references exist at all? The main reason is **overloading**: writing two functions with the same name and different parameter types. The compiler picks the one that fits the argument best. An lvalue reference picks lvalues, and an rvalue reference picks temporaries.

This is how move constructors know that they may take the guts out of a temporary, since nobody will look at it again. That idea has a name: **move semantics** means taking the contents of a value that is about to be thrown away, instead of copying them.

```cpp
#include <iostream>
#include <utility>

void f(int&)  { std::cout << "lvalue\n"; }
void f(int&&) { std::cout << "rvalue\n"; }

int main() {
    int x = 1;
    f(x);             // lvalue
    f(42);            // rvalue
    f(std::move(x));  // rvalue
    int&& rr = 5;
    f(rr);            // lvalue!
}
```

It prints:

```output
lvalue
rvalue
rvalue
lvalue
```

Walk through it:

- `f(x)` passes a named variable, so the `int&` version runs.
- `f(42)` passes a temporary, so the `int&&` version runs.
- `f(std::move(x))` casts `x` to an rvalue, so the `int&&` version runs.
- `f(rr)` is the trap. `rr` was declared as an rvalue reference, but it has a name. Its expression is therefore an lvalue, and the `int&` version runs.

::: warning
The trap is worth remembering: **a named rvalue reference is an lvalue.** Inside a function, if you want to pass `rr` on as an rvalue again, you must use `std::move(rr)`.
:::

### Side by side

A pointer stores an address. It can be null, and you can point it somewhere else later.

- `int* p` is an object holding an address.
- It can be `nullptr`.
- It can be re-pointed at any time.
- Use it for optional access, or when you need to change where it points.

An lvalue reference is an alias for an object that has a name.

- `int& r` is another name for an lvalue.
- It can never be null.
- It cannot be re-pointed. Assigning to it changes the object it names.
- Use it to pass or change something without copying.

An rvalue reference is an alias for a temporary.

- `int&& r` is another name for a temporary, which it keeps alive.
- It can never be null.
- It cannot be re-pointed.
- Use it for move semantics: taking the resources out of a value that is about to be thrown away.

::: answer
**Q37. What is the difference between `int* p`, `int& r`, and `int&& r`?**

`int* p` is a separate object that holds an address. It can be null, and it can be re-pointed. `int& r` is just another name for an lvalue, an object with a name, so it can never be null. `int&& r` is another name for a temporary, such as `10` or `std::move(x)`, and it keeps that temporary alive. A named rvalue reference is itself an lvalue, which is a common interview trap.
:::

## void pointers

A **void pointer** has the type `void*`. It holds an address, like any pointer, but it does not know what type of object lives there. Its type is "unknown."

Think of a box with a number on the label, but the label has been scraped off. You know there is something in the box, and you know where the box is. You do not know what it is.

### An address with the type erased

Any pointer to an object can be converted to a `void*` automatically. Going back needs a cast.

```cpp
#include <iostream>

int main() {
    int x = 42;
    void* v = &x;                     // any object pointer converts
    int* p = static_cast<int*>(v);    // cast back to the real type

    std::cout << *p << '\n';          // 42
}
```

It prints:

```output
42
```

Walk through it:

- `int x = 42;` makes an `int` in memory.
- `void* v = &x;` stores the address of `x`. The compiler lets you do this for any object type.
- `*v` would be an error. The compiler does not know how big the thing is, so it does not know how far to read.
- `v + 1` is also an error. As you saw in pointer arithmetic, a step needs a size, and a `void*` has no size.
- `static_cast<int*>(v)` tells the compiler, "I know this address holds an `int`." This is the explicit cast.
- `*p` now reads `42` as an `int`.

The diagram:

```{=latex}
\begin{memdiagram}
\cell[data]{x}{0,0}{x: int at 0x200}{42}
\cell[stack]{v}{3.6,0}{void* v}{0x200}
\ptr[stack]{v.west}{x.east}
\vznote[plain]{3.6,-0.9}{v holds 0x200, but v has no type}
\end{memdiagram}
```

### Two interview points

First, in C++ you must cast a `void*` to another pointer type with an explicit cast. In C, the conversion is implicit. This is why C++ code that uses `malloc` always writes a cast. `malloc` returns a `void*`.

Second, the compiler now trusts you completely. If you cast to the wrong type, the code compiles, but using it is UB.

```cpp
#include <cstdlib>
#include <iostream>

int main() {
    void* raw = std::malloc(sizeof(int));
    int* a = static_cast<int*>(raw);   // explicit cast needed in C++
    *a = 3;
    std::cout << *a << '\n';           // 3
    std::free(raw);
}
```

It prints:

```output
3
```

Walk through it:

- `std::malloc(sizeof(int))` asks the C library for 4 bytes, and returns a `void*` to them.
- `static_cast<int*>(raw)` turns that into an `int*`, which is what we really stored.
- `*a = 3;` writes into the memory, and the next line reads it back.
- `std::free(raw);` gives the memory back. Memory from `malloc` must be released with `free`, not with `delete`.

Now the dangerous version, shown as a warning and not as a program. If you wrote `double* d = static_cast<double*>(raw);` and then `*d = 3.14;`, it would compile. But the memory is only 4 bytes, and the code would write to a `double`, so it is UB.

::: warning
A cast does not check anything. It only tells the compiler to trust you. A `void*` cast to the wrong type is a silent bug.
:::

### Where you meet them, and what to use instead

You meet `void*` in C libraries such as `malloc`, `memcpy` and `qsort`. Many C-style callback APIs also hand you a `void*` of user data, so you can pass any context you like.

In modern C++, prefer templates, which keep the type information. You can also use `std::any` or `std::variant`, which carry the type safely. Those options check types for you and avoid the cast-back problem.

::: answer
**Q38. What is a void pointer?**

A `void*` holds the address of an object without knowing its type. Any object pointer converts to `void*` automatically, but you cannot dereference it or do pointer arithmetic on it, because the size is unknown. To use the data, you must cast it back with `static_cast` to the real type. In C++, the cast back is always explicit. Casting to the wrong type compiles, but the result is undefined behavior. In modern code, prefer templates or type-safe alternatives such as `std::variant`.
:::

## Pointer to a pointer

A **pointer to a pointer** is a variable that holds the address of another pointer. It sounds scary, but it is just one more arrow in a chain.

Each `*` follows one arrow. Two `*`s follow two arrows.

### Following the arrows

```cpp
#include <iostream>

int main() {
    int x = 42;
    int* p = &x;      // p points to x
    int** pp = &p;    // pp points to p

    std::cout << (*pp == p) << '\n';  // 1: *pp is p's value
    std::cout << **pp << '\n';        // 42: follow both arrows
    **pp = 99;                        // changes x
    std::cout << x << '\n';           // 99
}
```

It prints:

```output
1
42
99
```

Walk through it:

- `int** pp = &p;` declares `pp` as a pointer to an `int*`. Read the stars as "pointer to pointer to int."
- `*pp` follows one arrow, from `pp` to `p`. Its value is the address stored in `p`, so comparing it with `p` gives `1`.
- `**pp` follows two arrows, from `pp` to `p` and from `p` to `x`. It reads `42`.
- `**pp = 99;` writes through both arrows, so `x` becomes `99`.

The memory picture:

```{=latex}
\begin{memdiagram}
\cell[stack]{x}{0,0}{x @ 0x100}{42}
\cell[stack]{p}{3.2,0}{p @ 0x108}{0x100}
\cell[stack]{pp}{6.4,0}{pp @ 0x110}{0x108}
\ptr[stack]{p.west}{x.east}
\ptr[stack]{pp.west}{p.east}
\vznote[plain]{3.2,-1.0}{pp $\to$ p $\to$ x $\to$ 42}
\vznote[plain]{3.2,-1.6}{*pp gives 0x100 (value of p), **pp gives 42}
\end{memdiagram}
```

### Changing the caller's pointer

Why would you need a pointer to a pointer? The most common reason is to let a function change a pointer that belongs to its caller. Remember that a function gets copies of its arguments. If it takes a plain `int*`, then it can change only its own copy of the pointer.

```cpp
#include <iostream>

void make(int** out) {
    *out = new int(7);        // writes into the caller's p
}

void make2(int*& out) {       // C++: a reference to a pointer
    out = new int(8);
}

int main() {
    int* p = nullptr;
    make(&p);
    std::cout << *p << '\n';  // 7
    delete p;

    make2(p);
    std::cout << *p << '\n';  // 8
    delete p;
}
```

It prints:

```output
7
8
```

Walk through it:

- `make(&p)` passes the address of `p`, which is an `int**`.
- Inside `make`, `*out` means "the pointer that `p` is." Writing to it changes `p` in `main`.
- `new int(7)` makes an `int` on the heap that holds 7. `p` now points to it.
- `delete p;` frees that heap memory. You must do this, or the memory leaks.
- `make2(p)` does the same job with a reference to a pointer, `int*&`. This is cleaner, because you do not need to take an address or write `*`.

### Real examples: argv and grids

You have already met one pointer to a pointer. The `main` function in many programs has this form:

```cpp
int main(int argc, char** argv) {
    // argv[0] is a char*: the name of the program
}
```

`argv` is an array of C strings, one per command-line argument. Each C string is a `char*`, so the whole array is a `char**`.

Another use is a two-dimensional array built from pointers: an array of row pointers, each pointing to its own row.

```cpp
#include <iostream>

int main() {
    int** grid = new int*[3];          // array of 3 row pointers
    for (int i = 0; i < 3; ++i)
        grid[i] = new int[4]();        // each row: 4 ints, set to 0
    grid[1][2] = 5;
    std::cout << grid[1][2] << '\n';   // 5

    for (int i = 0; i < 3; ++i)
        delete[] grid[i];              // free each row
    delete[] grid;                     // then free the row pointers
}
```

It prints:

```output
5
```

Walk through it:

- `new int*[3]` makes an array of three `int*`s on the heap. The type of `grid` is `int**`.
- The loop gives each row pointer its own array of four `int`s. The `()` sets them all to 0.
- `grid[1][2]` means "row 1, then column 2." It is the same as `*(*(grid + 1) + 2)`.
- The cleanup goes in reverse: first each row, then the array of row pointers.

::: warning
This code works, but it is awkward and easy to get wrong. A missing `delete[]` is a leak. In real C++ code, prefer a `std::vector<std::vector<int>>`, or one flat `std::vector<int>` with the row and column math done by hand. Those free their memory for you.
:::

::: answer
**Q39. What is a pointer to a pointer?**

A pointer to a pointer is a variable that stores the address of another pointer, written as `int**`. The first `*` follows one arrow and gives you the pointer. The second `*` follows another arrow and gives you the value. It is used to let a function change the caller's pointer, and to handle arrays of pointers, such as `argv` and arrays of row pointers. In C++, a reference to a pointer, `int*&`, usually does the same job more cleanly.
:::

## const with pointers

The word **const** means "this cannot be changed through this name." A `const` object cannot be assigned to after it is created.

With pointers, there are two things that might be locked: the value the pointer points to, and the pointer itself. The three declarations below lock different things. Their names look alike, which is why this topic is a favorite interview question.

### Read it from right to left

The trick is to read each declaration from right to left. Start at the name, then read leftward.

```cpp
#include <iostream>

int main() {
    int a = 1, b = 2;

    const int* p1 = &a;      // pointer to const int
    // *p1 = 5;              // error: the value is read-only
    p1 = &b;                 // OK: the pointer can move

    int* const p2 = &a;     // const pointer to int
    *p2 = 5;                 // OK: changes a
    // p2 = &b;              // error: p2 itself is const

    const int* const p3 = &a;  // const pointer to const int
    // *p3 = 5;              // error: the value is locked
    // p3 = &b;              // error: the pointer is locked

    std::cout << a << ' ' << *p1 << '\n';   // 5 2
}
```

It prints:

```output
5 2
```

Walk through it:

- `const int* p1 = &a;` reads as "p1 is a pointer to a const int." You cannot write `*p1`, but you can move `p1` to `&b`. After that, `*p1` is `2`.
- `int* const p2 = &a;` reads as "p2 is a const pointer to an int." It must be given a value right away, and it can never point anywhere else. But `*p2` is an ordinary `int`, so `*p2 = 5` changes `a`.
- `const int* const p3 = &a;` locks both. You cannot write through `p3`, and you cannot move it.
- The last line prints `a`, which is 5 because of `*p2 = 5`, and `*p1`, which is `b`, so 2.

The uncommented lines show the errors in a real compiler. GCC reports, for example, "assignment of read-only location" for `*p1 = 5` and "assignment of read-only variable" for `p2 = &b`.

### What sits on each side of the star

Here is the rule in short. A `const` to the left of the `*` locks the value. A `const` to the right of the `*` locks the pointer.

So `const int*` and `int const*` are the same declaration. A `const` written before the `*`, whether before or after `int`, always locks the value.

Now compare the three:

- `const int* p`: you cannot change the value through `p`. You can re-point `p`.
- `int* const p`: you can change the value through `p`. You cannot re-point `p`, and you must give it a value when you declare it.
- `const int* const p`: you cannot change the value, and you cannot re-point `p`. You must give it a value when you declare it.

### The trap: a pointer to const is not a const object

A pointer to const does not make the object itself constant. It only means that *this pointer* will not let you change the value. The object can still change through other names.

```cpp
#include <iostream>

int main() {
    int a = 1;
    const int* p = &a;
    a = 10;                    // fine: a itself is not const
    std::cout << *p << '\n';   // 10
}
```

It prints:

```output
10
```

Walk through it:

- `p` is a pointer to a const `int`, so the program could not write `*p = something`.
- `a` is not const. You can change it directly, and `a = 10` is legal.
- `*p` looks at the same memory as `a`, so it reads `10`.

This is why `const int*` is so common in function parameters. It is a promise: "I will only read this data." It does not promise that nobody else will change it while the function runs.

::: tip
If you see `const T*` or `const T&` in a function parameter, it means the function will not change the caller's data through that parameter. That is the main reason to write it.
:::

::: answer
**Q40. What is the difference between `const int*`, `int* const`, and `const int* const`?**

Read each declaration from right to left. `const int*` is a pointer to a const int: you cannot change the value through it, but you can re-point it. `int* const` is a const pointer to an int: you can change the value, but the pointer must be set when declared and can never point elsewhere. `const int* const` locks both, so you can neither change the value nor re-point it. A pointer to const does not make the object itself const, because the object can still be changed through its other names.
:::

## Returning a pointer to a local variable

A **local variable** is a variable declared inside a function. It lives in that function's **stack frame**: the block of stack memory the program sets aside for one call of the function. When the function returns, that frame is no longer owned by the function. Its memory can be reused by the next function call.

So a pointer to a local is a pointer to memory that will not stay valid. It is called a **dangling pointer**, because it points at nothing that is really there.

### Why it compiles, and why it's wrong

Here is the classic mistake.

```cpp
#include <iostream>

int* bad() {
    int x = 42;
    return &x;       // address of a local
}

int main() {
    int* p = bad();
    std::cout << *p << '\n';   // UB: p dangles
}
```

It compiles. Its behavior is UB. When this program ran on GCC 16 on Linux, it crashed with a segmentation fault. On another compiler or run, it might print 42, print garbage, or crash.

Here is what happens step by step. When `bad` is called, its stack frame is made, and `x` lives inside it. `bad` returns the address of `x`, and `p` stores that address. But when `bad` returns, its frame is gone. `p` still holds the address, but the memory there now belongs to nobody. Another function call can use those same bytes for its own locals, so the value you read may be anything.

```{=latex}
\begin{memdiagram}
\region[stack]{s1}{-2.1,-2.0}{4.2,4.5}{while bad() runs}
\vcells[stack]{L}{0,1.9}{x = 42,p $\to$ x}{}
\vznote[plain]{0,-1.0}{x lives in bad's frame}
\region[plain]{s2}{3.1,-2.0}{4.2,4.5}{after bad() returns}
\vcells[plain]{R}{5.2,1.9}{(free),p $\to$ ???}{}
\vznote[bad]{5.2,-1.0}{p dangles}
\end{memdiagram}
```

### Compilers warn about the simple case

The good news is that compilers catch the simple case. GCC warns about this code even without extra flags. Here is a file with both a pointer version and a reference version:

```cpp
int* bad() {
    int x = 42;
    return &x;
}

int& badRef() {
    int x = 42;
    return x;        // the same bug, as a reference
}
```

GCC reports these two warnings:

```output
warning: address of local variable 'x' returned [-Wreturn-local-addr]
warning: reference to local variable 'x' returned [-Wreturn-local-addr]
```

But do not rely on this. Once the address passes through another variable or another function, the warning can disappear. Treat warnings as errors, and use AddressSanitizer, a tool that can detect stack use after return at run time.

### What to do instead

Usually, just return by value. The value is copied out, which is cheap for small types, and the compiler often removes the copy completely.

```cpp
#include <iostream>
#include <memory>

int byValue() { int x = 42; return x; }              // copy out
int* fromStatic() { static int x = 42; return &x; }  // lives forever
std::unique_ptr<int> fromHeap() {
    return std::make_unique<int>(42);                // caller owns it
}
const char* literal() { return "hi"; }               // OK: static storage

int main() {
    std::cout << byValue() << ' ' << *fromStatic() << ' '
              << *fromHeap() << ' ' << literal() << '\n';
}
```

It prints:

```output
42 42 42 hi
```

Walk through it:

- `byValue` returns a copy of `x`. There is no pointer, so nothing can dangle.
- `fromStatic` uses a `static` local. A `static` local is created once and lives for the whole program, so its address stays valid. The price is that it is shared state: every caller sees the same `x`.
- `fromHeap` returns a `std::unique_ptr`, which owns a heap object. The caller owns it, and the memory is freed when the smart pointer goes away.
- `literal` returns a pointer to a string literal such as `"hi"`. Literals have static storage, so this is safe. It is the trick question: not every pointer return is a bug.

::: warning
A `static` local is safe to return the address of, but it is not free. It is global state. Two calls share it, and it is not safe to use from two threads at once without care.
:::

::: answer
**Q41. Can a function return a pointer to a local variable? Why or why not?**

It compiles, but it is undefined behavior, because a local variable lives in the function's stack frame. When the function returns, the frame is gone and the pointer dangles. Any read through it may print garbage or crash. Compilers such as GCC warn about the simple case. Better choices are to return the value, return a smart pointer that owns heap memory, or return a pointer to a `static` local. Returning a pointer to a string literal is fine, because literals live for the whole program.
:::

## Dereferencing a null pointer

A **null pointer** is a pointer that holds nothing: in modern C++, you write it as `nullptr`. Dereferencing a pointer means following it to read or write the value. So dereferencing a null pointer means trying to read or write at "no address."

The honest answer is that the result is **undefined behavior**. The standard promises nothing. In practice, you almost always get a crash.

### What usually happens

On mainstream systems, the null pointer holds the address 0, and the memory at address 0 is never mapped. When the program reads it, the processor raises a fault. The operating system then sends a **signal**, a notice that the program did something illegal. On Linux that signal is `SIGSEGV`, and the shell prints "Segmentation fault". On Windows it is an "access violation."

```cpp
#include <iostream>

int main() {
    int* p = nullptr;   // address 0
    int v = *p;         // UB: reads address 0
    std::cout << v << '\n';
}
```

When this was compiled and run on GCC 16 on Linux, the program ended with a segmentation fault, exit code 139 (128 plus the signal number 11). It printed nothing.

Notice what is *not* true here. This is not a C++ exception. A `try`/`catch` block cannot catch it, because the program is killed by the operating system before C++ gets a chance to react.

```{=latex}
\begin{memdiagram}
\cell[bad]{p}{0,0}{p (holds 0)}{0}
\widecell[bad]{nm}{4.4,0}{4.2}{address 0 is not mapped}{no memory here}
\ptr[bad]{p}{nm}
\vznote[bad]{4.4,-1.0}{$\to$ SIGSEGV, crash}
\end{memdiagram}
```

### Why it is not always a crash

The bigger danger is that UB lets the compiler assume it never happens. Here is an example.

```cpp
#include <iostream>

void f(int* p) {
    int v = *p;              // dereference: the compiler may now assume p is not null
    if (p == nullptr)        // this check may be removed by the optimizer
        return;
    std::cout << v << '\n';
}

int main() { int x = 3; f(&x); }
```

Walk through it:

- The first line dereferences `p`. If `p` were null, that would be UB.
- Because UB cannot happen in a correct program, the compiler may conclude that `p` is not null.
- It may then decide that the check `p == nullptr` is always false, and delete it.

I built this version with `-O2` and called it with `nullptr`. It still crashed at the dereference, so the check was never reached in that run. Still, the standard allows exactly this kind of optimization. A similar pattern in the Linux kernel, where a null check was removed after a dereference, caused a real security bug. The lesson is the same: check before you use.

### How to avoid it

Check every pointer that can legitimately be null, before you use it. If a value must always exist, take a reference instead, because a valid reference is never null. If a value may or may not exist, use `std::optional`, which says so in the type.

```cpp
#include <iostream>
#include <optional>

void show(int* p) {
    if (p == nullptr) return;   // check, because null is possible
    std::cout << *p << '\n';
}

std::optional<int> find(bool ok) {   // "maybe no value", no pointer
    if (ok) return 7;
    return std::nullopt;
}

int main() {
    int x = 3;
    show(&x);        // prints 3
    show(nullptr);   // prints nothing

    auto r = find(false);
    if (r) std::cout << *r << '\n';
    else   std::cout << "none\n";   // prints none
}
```

It prints:

```output
3
none
```

Walk through it:

- `show` checks for null before the `*`. Calling it with `nullptr` does nothing.
- `find` returns an `std::optional<int>`. Its type says that a value may be missing, so no pointer is needed.
- `std::nullopt` means "no value." Checking `if (r)` is the safe way to ask whether the optional holds something.

::: tip
In testing, build with the undefined behavior sanitizer (`-fsanitize=undefined` on GCC and Clang). It reports a null dereference with the file and line, which is much easier to debug than a silent crash.
:::

::: answer
**Q42. What happens when you dereference a null pointer?**

It is undefined behavior, so the standard guarantees nothing. On mainstream systems, the address 0 is not mapped, so the operating system stops the program with a segmentation fault, or an access violation on Windows. This is not a C++ exception, and `try`/`catch` cannot catch it. Because UB lets the compiler assume the pointer is not null, it may also delete null checks that come after the dereference. Prevent it by checking pointers before use, by taking a reference when null is not allowed, or by using `std::optional` for values that may be missing.
:::

## Arrays and pointers

People often say "an array is just a pointer." That is not quite true. An array is a block of storage holding its elements. A pointer is a separate variable that holds an address. An array *turns into* a pointer in most expressions, but the two are not the same thing.

The **sizeof** operator gives the size of a type or an object in bytes. It is the quickest way to see the difference.

### Storage versus an address

Here is an array of five `int`s. It is 20 bytes of elements, side by side, if an `int` is 4 bytes. No address is stored anywhere in the array itself.

```{=latex}
\begin{memdiagram}
\arraycells[data]{arr}{0,0}{1,2,3,4,5}{}
\vznote[data]{2.2,-1.1}{arr: five ints, 20 bytes}
\cell[stack]{p}{0,2.4}{p: 8 bytes}{0x100}
\ptr[stack]{p.south}{arr-0.north}
\vznote[plain]{1.6,1.2}{points to the 1}
\end{memdiagram}
```

Here is the program that shows the difference.

```cpp
#include <iostream>

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int* p = arr;                      // decays to &arr[0]

    std::cout << sizeof(arr) << '\n';  // 20: all the elements
    std::cout << sizeof(p) << '\n';    // 8: just the pointer
    p = p + 1;                         // OK: p is a variable
    std::cout << *p << '\n';           // 2

    // arr = p;                        // error: arrays cannot be assigned
}
```

It prints (on a typical 64-bit system with 4-byte `int`s):

```output
20
8
2
```

Walk through it:

- `sizeof(arr)` is the size of all five elements. The array knows its size, because the size is part of its type.
- `sizeof(p)` is the size of the pointer itself, which is 8 on a 64-bit system. The pointer does not know how big the array is.
- `p = p + 1;` moves the pointer. A pointer is a variable, so it can be changed.
- `arr = p;` is an error. An array is not a variable you can assign to.

The array is `int[5]`, and its size is part of its type. The pointer is `int*`, and it knows only where something starts.

### The classic trap: arrays as parameters

Passing an array to a function makes it **decay**, which means the array turns into a pointer to its first element. We explain decay fully in the next section. The trap is that the size is lost. Even if you write `int a[5]` in the parameter list, the parameter is really an `int*`.

```cpp
#include <cstddef>
#include <iostream>

void f(int a[5]) {                 // really: void f(int* a)
    std::cout << sizeof(a) << '\n';   // 8, not 20
}

template <std::size_t N>
void g(int (&a)[N]) {              // a reference to the whole array
    std::cout << N << '\n';        // 5: the size is kept
}

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    f(arr);
    g(arr);
}
```

It prints (on a 64-bit system):

```output
8
5
```

Walk through it:

- `f` looks like it takes an array of five, but it receives a pointer. So `sizeof(a)` is the size of a pointer, 8.
- `g` takes a reference to an array of `N` ints. The reference keeps the full type, so the compiler works out `N` from the argument, which is 5.
- `template <std::size_t N>` makes `g` a **template**: a pattern that the compiler fills in for each size or type it needs.

GCC gives a warning for `f` when you compile with `-Wall`. It says that `sizeof` on an array parameter returns the size of a pointer.

### A side-by-side look

An array is storage. A pointer is an address. The differences are:

- `sizeof` on an array gives all of its bytes. `sizeof` on a pointer gives the pointer's own size, usually 8.
- An array cannot be assigned. A pointer can be re-pointed at any time.
- `&arr` gives a pointer to the whole array, which has a different type, `int(*)[5]`. `&p` gives the address of the pointer itself, which has type `int**`.
- An array knows its size. A pointer knows only where its first element is.

::: warning
Do not write `sizeof(a) / sizeof(a[0])` on a function parameter. The result is the pointer size divided by the element size, which is a wrong number. Pass the length as a separate argument, or use a reference to the array as `g` does.
:::

::: answer
**Q43. What is the difference between an array and a pointer?**

An array is the elements themselves, stored side by side, and its size is part of its type. A pointer is a separate variable holding one address, and its size is just the size of the pointer. In most expressions an array turns into a pointer to its first element, which is called decay. `sizeof` tells them apart: the array gives all its bytes, the pointer gives 8 on a 64-bit system. An array cannot be assigned, but a pointer can be re-pointed. When an array is passed to a function, it decays, and the size is lost.
:::

## Array decay

**Array decay** is the implicit conversion of an array into a pointer to its first element. The word "decay" means the array quietly becomes something simpler. The conversion is automatic, and you do not write any `&` to get it.

The result is that the pointer knows where the array starts, but it forgets how long the array is.

### The array becomes a pointer

Here is the first example. We never write `&` anywhere, yet the array turns into a pointer.

```cpp
#include <iostream>

int main() {
    int arr[4] = {10, 20, 30, 40};
    int* p = arr;                      // same as &arr[0]

    std::cout << sizeof(arr) << '\n';  // 16: the whole array
    std::cout << sizeof(p) << '\n';    // 8: just a pointer
}
```

Walk through it:

- `int* p = arr;` is the decay. The array `arr` is converted to the address of `arr[0]`.
- `sizeof(arr)` is 16, which is four ints of 4 bytes each. The array still has its full size here, because we are in the same scope where it was declared.
- `sizeof(p)` is 8. The pointer has forgotten the length.

The picture:

```{=latex}
\begin{memdiagram}
\cell[stack]{p}{-3.2,0}{p: 8 bytes}{0x100}
\arraycells[data]{arr}{0,0}{10,20,30,40}{arr: 16 bytes}
\ptr[stack]{p.east}{arr-0.west}
\vznote[plain]{-3.2,-1.1}{knows only the start}
\vznote[plain]{2.2,-1.1}{knows its size}
\end{memdiagram}
```

The pointer has no room for the length, so the length is gone.

### Where it bites: function parameters

Decay causes the most trouble with functions. You cannot pass a plain array by value. Even if you write the parameter with brackets and a size, the number is ignored, and the parameter is really an `int*`. The array decays at the call.

```cpp
#include <iostream>

void print(int a[4]) {                // really: void print(int* a)
    std::cout << sizeof(a) << '\n';   // the size of a pointer
}

int main() {
    int arr[4] = {10, 20, 30, 40};
    std::cout << sizeof(arr) << ' ';  // 16, in main
    print(arr);                       // arr decays here: prints 8
}
```

It prints:

```output
16 8
```

Walk through it:

- Inside `main`, `sizeof(arr)` is 16, because the array has not decayed yet.
- At the call `print(arr)`, the array decays to a pointer.
- Inside `print`, `sizeof(a)` gives 8. The `4` in `int a[4]` is ignored by the compiler.

This is why C-style functions take the length as a separate argument. The pattern is `void print(int* a, std::size_t n)`.

### When decay does not happen

Decay does not happen everywhere. `sizeof` sees the real array, and so does the address-of operator `&`. A reference binding also keeps the full type. Those three cases give you the whole array.

```cpp
#include <iostream>

template <std::size_t N>
void show(int (&a)[N]) {       // N is deduced as 4 from the argument
    std::cout << N << '\n';
}

int main() {
    int arr[4] = {10, 20, 30, 40};
    auto q = &arr;             // type int(*)[4]: the size is kept
    auto& r = arr;             // type int(&)[4]: no decay
    std::cout << sizeof(*q) << ' ' << sizeof(r) << '\n';  // 16 16
    show(arr);                 // 4
}
```

It prints:

```output
16 16
4
```

Walk through it:

- `&arr` gives a pointer to the whole array, `int(*)[4]`. It is a different type from `int*`, and it keeps the size.
- `auto& r = arr;` binds a reference to the whole array, so there is no decay.
- `show` takes a reference to an array of `N` ints. The compiler deduces `N` as 4 from the argument. A template deduces the number, and a plain pointer parameter could not.

### The modern fix

In modern C++, use `std::array`, which never decays. It is a class that holds its elements and knows its size. You can also pass a `std::span` (C++20), which holds a pointer and a length together.

`std::array<int, 4>` is a real object with a `.size()` member, and it does not turn into a pointer when you pass it to a function. This is the usual fix in new code.

::: tip
If you pass a `std::span` to a function, you pass both the start and the length in one object. The span is only a view. It does not own the elements, so the array it refers to must still be alive.
:::

::: answer
**Q44. What is array decay?**

Array decay is the automatic conversion of an array into a pointer to its first element, which happens in most expressions. The array forgets its length when it decays, so a function that receives the pointer cannot know how many elements there are. Decay does not happen when you apply `sizeof`, take the address with `&`, or bind a reference to the array. In modern code, use `std::array`, which never decays, or pass a `std::span` in C++20, which carries the pointer and the length together.
:::

## How references are implemented

A **reference** is an alias: another name for an existing object. You have seen how references behave. The question here is how a compiler stores one in memory, and whether the C++ standard requires any particular storage.

The short answer is that the standard describes how a reference **behaves**. It does not say how a reference must be **stored**. That choice is left to the compiler.

### What compilers usually do

Look at this simple program first.

```cpp
#include <iostream>

int main() {
    int x = 5;
    int& r = x;       // an alias for x
    r = 7;            // x is now 7
    std::cout << x << '\n';   // 7
}
```

It prints:

```output
7
```

Here `r` is a local alias for `x`. For a local alias like this, the compiler usually stores nothing at all. It simply uses `x` directly. The name `r` exists only in the source code.

When a reference must really be stored, the usual choice is a hidden pointer. A reference stored as a **class member**, which is a variable inside a struct, or passed to a function that is not inlined, is often implemented as a constant pointer that is dereferenced automatically. The machine code is then the same as the pointer version:

```cpp
int x = 5;
int* const p = &x;   // what a stored reference often looks like inside
*p = 7;              // what r = 7 becomes
```

The programmer never writes that pointer. The compiler hides it, and it is an implementation detail.

### What the standard actually says

The standard is deliberately vague here. A reference is not an object. It is an alias. The standard says it is unspecified whether a reference needs any storage at all.

Because of this, everything you can observe goes to the object the reference refers to. Here is a program with the observable facts.

```cpp
#include <iostream>

struct Holder { int& r; };   // a struct that stores a reference

int main() {
    int x = 5;
    int& r = x;
    r = 7;
    std::cout << x << '\n';                       // 7
    std::cout << (&r == &x) << '\n';              // 1: same address as x
    std::cout << (sizeof r == sizeof(int)) << '\n';  // 1: size of the int
    std::cout << sizeof(Holder) << '\n';          // 8 on this 64-bit system
}
```

It prints (with GCC on 64-bit Linux):

```output
7
1
1
8
```

Walk through it:

- `r = 7;` writes to `x`, so `x` is 7.
- `&r` gives the address of `x`, because `&r` means the address of the object the reference names. So `&r == &x` is 1.
- `sizeof r` gives the size of an `int`, not the size of some reference object. So it is equal to `sizeof(int)`.
- `sizeof(Holder)` is 8, because `Holder` stores a reference, and on this compiler a stored reference is pointer-sized. The standard does not promise 8. It is the compiler's choice.

Some things are not allowed, and the standard forbids them because a reference is not a real object:

```cpp
// int& r2 = x;
// int&* pr;     error: no pointers to references
// int& arr[3];  error: no arrays of references
```

When these lines were compiled with GCC, it reported "cannot declare pointer to 'int&'" and "declaration of 'arr' as array of references." You cannot take the address of a reference to get a pointer to it, because the pointer would be to the referred object.

### A stored reference can dangle, too

Because a stored reference is really an address underneath, it has the same lifetime problems as a pointer. If it refers to a local that has died, it dangles.

```cpp
int& bad() {
    int local = 42;
    return local;      // a reference to a dead local
}

int& r = bad();        // r refers to memory that is gone
// std::cout << r;    // undefined behavior
```

GCC warns about the `return local;` line, with the message "reference to local variable 'local' returned." But the warning covers only the simple case. Nothing in the language stops a reference from dangling in general. Using `r` is UB.

::: warning
The interview trap is believing that references are always safe. A reference is safer than a pointer in one way: it cannot be null. It is not safer in the way that matters most: it can still refer to an object that no longer exists.
:::

::: answer
**Q45. How are references implemented internally, and does the C++ standard require a specific representation?**

The standard does not require any particular representation. It defines only the behavior of a reference, which is an alias for an existing object. Compilers often store no data at all for a local reference, and use the object directly. When a reference must be stored, for example as a class member, compilers usually use a hidden constant pointer that is dereferenced automatically. A reference can still dangle if it refers to an object that has already ended its lifetime, so a reference is not automatically safe.
:::

## Chapter summary

- Pointer arithmetic moves a pointer by whole elements: `p + n` is `n` times the size of the type, and `p - q` gives the element count between two pointers into the same array.
- Subscripting is pointer arithmetic: `a[i]` is defined as `*(a + i)`. Pointers may reach the array's end but never be dereferenced there.
- `int* p` is an object holding an address and can be null. `int& r` is an alias for an lvalue, and `int&& r` is an alias for a temporary. A named `&&` is an lvalue.
- A `void*` holds an address with no type, so you must `static_cast` it back, and casting to the wrong type is UB.
- A pointer to a pointer, `int**`, follows two arrows. It lets a function change the caller's pointer, and it appears in `argv`.
- Read `const` declarations right to left: `const int*` locks the value, `int* const` locks the pointer, and `const int* const` locks both.
- Returning a pointer or reference to a local is UB, because the local dies with its stack frame. Return by value, a `static` local, or a smart pointer.
- Dereferencing a null pointer is UB, usually a segmentation fault, which `try`/`catch` cannot catch. Check before use, or prefer references and `std::optional`.
- An array is its elements and knows its size. A pointer is an address. Arrays decay to pointers in most expressions, and the size is lost.
- The standard defines how references behave, not how they are stored. Compilers often store nothing for a local reference, and use a hidden pointer when a reference must be stored.
