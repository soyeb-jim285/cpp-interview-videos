# Chapter 2 — Names, Functions and the Rules of the Language

In Chapter 1 you learned how a program gets built. You saw that a **compiler** turns your text into machine code, that a **declaration** tells the compiler a name exists, and that a **definition** says what the name really is. You also met the stack and the heap, pointers and references, and the `const` keyword.

This chapter is about the rules that sit on top of those ideas. How do you keep names from clashing? Why can one function name hold several functions? What does the compiler do when you break a rule, and what happens when nobody noticed?

Along the way you will meet a few words that sound scary. They are not. Each one is just a name for a simple idea, and we define each one the first time it shows up.

## Names and their homes: namespaces

Every name in your program lives somewhere. A variable declared inside a function can be used only inside that function. The part of the code where a name can be used is called its **scope**. Chapter 1 covered local scope already.

Names declared outside any function live in the **global scope**. That is the one big shared space for the whole program. Most trouble starts there.

### The problem: two libraries, one name

Imagine you are using two libraries written by two different teams. One is a graphics library. It has a function that draws pixels on the screen. The other is a card game library. It has a function that draws a playing card.

Both teams picked the same name, `draw`. Each library is a separate file of code, and each file looks fine on its own. Then you put them together in one program.

```cpp
// from a graphics library
void draw(int x) { /* draws pixels */ }

// from a card-game library
void draw(int x) { /* draws a card */ }
```

The compiler sees two functions called `draw` with the same parameter list. A **parameter** is a value a function receives when it is called. The compiler cannot tell which `draw` you mean, so it refuses. With GCC you get an error like `redefinition of 'void draw(int)'`.

The name clashed. Nothing in the names themselves was wrong.

### The fix: a namespace

A **namespace** is a named box for names. You write the keyword `namespace`, a name for the box, and then curly braces around the code that belongs inside.

```cpp
#include <iostream>

namespace gfx {
void draw(int x) { std::cout << "pixels " << x << "\n"; }
}

namespace cards {
void draw(int x) { std::cout << "card " << x << "\n"; }
}

int main() {
    gfx::draw(1);
    cards::draw(2);
}
```

Output:

```output
pixels 1
card 2
```

Line by line:

- `#include <iostream>` brings in the tools for printing. Chapter 1 covered this.
- `namespace gfx { ... }` creates a box called `gfx`. Its `draw` belongs to `gfx`.
- `namespace cards { ... }` creates a second box. Its `draw` is a different function, even though the name is the same.
- `gfx::draw(1)` calls the `draw` inside the `gfx` box. The two colons are the **scope resolution operator**. An **operator** is a symbol, like `+`, that tells the compiler to do something. This one means "look for the name on the right, inside the box on the left."
- `cards::draw(2)` does the same thing for the other box.

The full name of each function is its box name plus its own name. The full name of the first one is `gfx::draw`. The second is `cards::draw`. Two full names are different, so there is no clash.

::: tip
Namespaces are not only for libraries. Use one for your own project, named after the project, so your names can never clash with a library you add later.
:::

### The standard library lives in std

The **standard library** is the set of ready-made tools that comes with every C++ compiler. All of it lives in one namespace called `std`. That is why you have been writing `std::cout` and `std::vector`. The name `cout` is inside the box `std`. The name `vector` is inside the same box.

The full form is always safe. But typing `std::` again and again gets tiresome, so C++ gives you two shortcuts.

A **using declaration** brings in one name:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};   // full name, always clear
    using std::cout;               // bring in ONE name
    cout << v.size() << "\n";
    using namespace std;           // bring in EVERYTHING
    cout << "first: " << v[0] << "\n";
}
```

Output:

```output
3
first: 1
```

Line by line:

- `std::vector<int> v{1, 2, 3};` uses the full name. A `std::vector` is a list of values stored in a row. It can grow. The `<int>` says the list holds whole numbers.
- `using std::cout;` says: from now on, `cout` means `std::cout`. Only that one name is brought in.
- `cout << v.size()` prints how many values the list holds, which is 3.
- `using namespace std;` brings in every name from `std`. From now on you can write `cout` and `vector` on their own.
- The last line prints the first value in the list, which is 1.

::: warning
Never write `using namespace std;` in a header file. A **header file** is a file, ending in `.h` or `.hpp`, that other files copy in with `#include`. If the header says `using namespace std;`, every file that includes it gets every standard name pulled in, whether it wants them or not. This is a small thing in a small program, and a hard-to-find bug in a big one.
:::

::: answer
**Q9. What are namespaces, and why do we use them?**

A namespace is a named box that holds names, so that two names with the same spelling can live side by side without clashing. You reach a name inside a box with the scope resolution operator, as in `gfx::draw`. All of the standard library lives in the namespace `std`. Use `using namespace std;` only in small source files, and never in headers.
:::

## Two ways to add one: `++i` and `i++`

You will write `++` many times in a loop. The question is whether it goes before the name or after it. Both forms add one to the variable. They differ only in the value the expression gives back.

An **expression** is a piece of code that produces a value. `2 + 3` is an expression with the value 5. The value of `++i` and the value of `i++` are not the same, even though both change `i`.

### Before and after

Here is the difference, in a complete program.

```cpp
#include <iostream>

int main() {
    int i = 5;
    int a = ++i;   // i becomes 6, a gets 6
    std::cout << "a=" << a << " i=" << i << "\n";

    int j = 5;
    int b = j++;   // b gets 5, then j becomes 6
    std::cout << "b=" << b << " j=" << j << "\n";
}
```

Output:

```output
a=6 i=6
b=5 j=6
```

Line by line:

- `int i = 5;` creates a variable `i` with the value 5.
- `int a = ++i;` is **pre-increment**. The `++` comes first. The program adds one to `i` first, so `i` is now 6. Then the value of `++i`, which is 6, is copied into `a`.
- The next line prints `a=6` and `i=6`.
- `int j = 5;` makes a second variable with the value 5.
- `int b = j++;` is **post-increment**. The `++` comes after. The program makes a copy of the old value, 5. Then it adds one to `j`, so `j` is now 6. Then the copy, 5, goes into `b`.
- The last line prints `b=5` and `j=6`.

Think of it as a label on a box. Pre-increment changes the box and then reads the new label. Post-increment reads the old label, copies it, and then changes the box.

### What it looks like inside a class

A **class** is a way to build your own type. Chapter 1 showed you `struct` and `class`. A **member function** is a function that belongs to a class. The `++` operator can be written as a member function too. That is the best way to see why the two forms cost different amounts of work.

```cpp
#include <iostream>

class Counter {
public:
    int value = 0;

    Counter& operator++() {        // ++c (prefix)
        ++value;
        return *this;
    }

    Counter operator++(int) {      // c++ (postfix); int is a marker
        Counter old = *this;
        ++value;
        return old;
    }
};

int main() {
    Counter c;
    Counter a = ++c;   // a.value 1, c.value 1
    Counter b = c++;   // b.value 1, c.value 2
    std::cout << a.value << " " << b.value << " " << c.value << "\n";
}
```

Output:

```output
1 1 2
```

Line by line:

- `Counter& operator++()` defines what `++c` does. The `&` means it returns a **reference**. A reference is another name for an object that already exists, which you met in Chapter 1.
- `++value;` adds one to the number inside the counter.
- `return *this;` returns the counter itself. The `*this` means "the object I am being called on." Nothing is copied.
- `Counter operator++(int)` defines what `c++` does. The `int` in the brackets is not a real value. It is a marker that tells the compiler, "this one is the postfix version."
- `Counter old = *this;` makes a full copy of the counter, before changing it.
- `++value;` changes the original.
- `return old;` returns the copy, which still has the old value.
- In `main`, `++c` changes `c` to 1 and gives `a` a copy of 1. Then `c++` gives `b` the old value, 1, and leaves `c` at 2.

So prefix returns the object itself, and postfix has to build a copy. For a plain number, the copy is cheap. For a large object, the copy can cost real time.

### Does it matter in loops?

For a plain `int`, the compiler usually turns both forms into the same machine code, because the copy is never used. So in a loop like this, it makes no difference:

```cpp
for (int i = 0; i < 3; ++i)   // int: the same either way
    std::cout << i << "\n";
```

For an **iterator**, it can matter. An iterator is an object that points at one item in a list, like a bookmark. Here is a loop over a `std::vector` with an iterator.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{10, 20, 30};
    for (auto it = v.begin(); it != v.end(); ++it)
        std::cout << *it << "\n";
}
```

Output:

```output
10
20
30
```

Line by line:

- `auto` tells the compiler to work out the type itself. Here it becomes the iterator type.
- `v.begin()` gives an iterator to the first item. `v.end()` gives one just past the last item.
- `++it` moves the iterator to the next item.
- `*it` is **dereferencing**: it means "the value this iterator points at." It gives 10, then 20, then 30.

Because an iterator is an object, `it++` could copy it on every step. The `++it` form avoids that. So the habit is simple: write `++i` and `++it`, and use `i++` only when you really need the old value.

::: tip
If you do not need the old value, `++i` is always a safe choice. You will never be slower for choosing it, and in some cases you will be faster.
:::

::: answer
**Q10. What is the difference between `++i` and `i++`?**

Both add one to the variable. `++i` (pre-increment) adds one first, then gives back the new value. `i++` (post-increment) gives back a copy of the old value, then adds one. For a plain `int` the compiler usually produces the same code either way. For iterators and class types, `++i` can be faster, because `i++` has to make a copy. Write `++i` unless you need the old value.
:::

## Same name, different parameters: overloading

You have now seen two functions with the same name in different namespaces. The next idea solves a different problem. What if you want two functions with the same name in the *same* namespace, that do similar work on different kinds of data?

That is **function overloading**. Overloading means several functions share one name, but each one takes a different list of parameters.

### One name, several functions

Suppose you want to print a value. The value might be a whole number, a decimal number or a string of text. Without overloading you would need three names, like `print_int`, `print_double` and `print_string`. With overloading you can use one name.

```cpp
#include <iostream>
#include <string>

void print(int x) {
    std::cout << "int: " << x << "\n";
}

void print(double x) {
    std::cout << "double: " << x << "\n";
}

void print(const std::string& s) {
    std::cout << "string: " << s << "\n";
}

int main() {
    print(42);
    print(3.14);
    print(std::string("hi"));
}
```

Output:

```output
int: 42
double: 3.14
string: hi
```

Line by line:

- Each of the three lines defines a function called `print`. Each one takes a different parameter type: `int`, `double`, or `const std::string&`.
- A **string** is a piece of text. `std::string` is the standard type for it. The `&` makes the parameter a reference, so the string is not copied. The `const` promises the function will not change it.
- `print(42);` passes an `int`, because `42` is a whole number. The compiler picks the `int` version.
- `print(3.14);` passes a `double`, which is the type for decimal numbers. The compiler picks that version.
- `print(std::string("hi"));` passes a string. The compiler picks the string version.

Those three calls look the same to you. The compiler looks at the type of each argument and picks the best match. An **argument** is the value you pass in at the call, as opposed to the parameter, which is the slot the function declares.

### How the compiler picks

The list of a function's name and parameter types is called its **signature**. Two functions with the same name but different signatures can coexist. This choice happens during compilation, when the compiler checks your code. It is called **overload resolution**. Because the choice is made before the program runs, it is sometimes called compile-time polymorphism. **Polymorphism** is a fancy word for "one name, many behaviors."

### Under the hood: name mangling

How can three functions share one name at all? The machine code needs a unique label for each function. The compiler quietly changes each name into a longer one that includes the parameter types. This is called **name mangling**.

The **linker** is the tool that joins your compiled pieces into one program. It matches each call to a label, called a **symbol**, that it finds in the compiled code. Each overloaded version has its own mangled symbol, so the linker never gets confused.

On GCC you can see this with the `nm` command. Compile the program above to an object file and list its symbols.

```bash
g++ -std=c++17 -c overload.cpp -o overload.o
nm overload.o | grep print
```

Among the output you will see two of the labels:

```output
_Z5printd
_Z5printi
```

The exact labels depend on the compiler. The main idea is the same. `print(int)` and `print(double)` have different labels, so the linker keeps them apart.

This also explains a rule about C. A **C** function has no mangled name, so C code cannot pick one overload from many. If C code needs to call a C++ function, you mark that function with `extern "C"`. That tells the compiler, "use C's simple naming for this one."

### Two traps

Overloading has two traps that interviewers love.

The first trap: **the return type does not count.** This is a compile error:

```cpp
int    parse(const char* s);
double parse(const char* s);   // differs only by return type
```

A caller who writes `parse("42");` gives no hint about which one they want. The compiler reports `ambiguating new declaration`. Overloads must differ in their parameters.

The second trap: **calls can be ambiguous.** Here is an example:

```cpp
void f(long x);
void f(double x);

int main() {
    f(5);   // int -> long? int -> double?
}
```

The number `5` is an `int`. Converting an `int` to a `long` is one standard step. Converting it to a `double` is also one standard step. Neither is better, so the compiler cannot choose. GCC says:

```output
error: call of overloaded 'f(int)' is ambiguous
```

The fix is to give the call the exact type it needs, such as `f(5L)` or `f(5.0)`.

::: warning
Overloading is handy, but do not overuse it. Two overloads that do very different things, under the same name, will confuse every reader. Overload when the functions do the same job on different types.
:::

::: answer
**Q11. What is function overloading?**

Function overloading means giving several functions the same name, as long as their parameter lists differ in type or count. The compiler picks the right one from the types of the arguments, while it is compiling. The return type alone cannot tell two overloads apart. Calls can also be ambiguous when two conversions are equally good, such as passing an `int` to a function that takes either `long` or `double`.
:::

## The `inline` keyword

The word `inline` has two meanings. The old meaning is well known and almost never important today. The modern meaning matters a lot, especially when you put code in header files.

### The old meaning: paste the body here

A normal function call has a small cost. The program must set up the arguments, jump to the function, do the work, and jump back. For a function that does almost nothing, this overhead can be bigger than the work.

Long ago, `inline` was a way to ask the compiler to paste the function's body right at the call site. No jump, no setup.

```cpp
#include <iostream>

inline int square(int x) { return x * x; }

int main() {
    std::cout << square(5) << "\n";
}
```

Output:

```output
25
```

Line by line:

- `inline int square(int x)` defines a function that returns the square of its parameter. The `inline` keyword is a request to the compiler.
- `return x * x;` does the multiplication.
- `square(5)` is a call. The compiler may replace it with the body, `5 * 5`. A good compiler can even work out the answer, 25, before the program runs.

The key word is *request*. The compiler is free to ignore it. Modern compilers decide for themselves which functions to inline, and they often ignore the keyword completely. So the old meaning is now only a hint.

### The modern meaning: one definition, many files

The real job of `inline` today is different. It is about the **One Definition Rule**, usually shortened to **ODR**. The ODR says that each function or variable may be defined only once in the whole program.

Here is the problem. You put a function in a header file. Then several `.cpp` files include that header. Each `.cpp` file is compiled on its own, so each one gets its own copy of the function. The linker then sees several definitions of the same function and fails.

Here is a small project to show it. The header `shape.h` contains one function.

```cpp
// shape.h
inline int square(int x) { return x * x; }
```

The file `a.cpp` includes the header and uses the function.

```cpp
// a.cpp
#include "shape.h"
int use_a() { return square(3); }
```

The file `main.cpp` does the same, and prints the results.

```cpp
// main.cpp
#include <iostream>
#include "shape.h"
int use_a();
int main() {
    std::cout << use_a() << "\n" << square(4) << "\n";
}
```

Build it with both `.cpp` files:

```bash
g++ -std=c++17 -Wall -Wextra a.cpp main.cpp -o app
./app
```

Output:

```output
9
16
```

Because `square` is marked `inline`, both files may contain it. The linker sees the copies and keeps one. Without `inline`, the same build fails with:

```output
multiple definition of `square(int)'
```

Line by line:

- The `#include "shape.h"` in each file pastes the header in. The quotes mean the file is in your own project. The angle brackets, as in `<iostream>`, mean it comes from the system.
- `int use_a();` is a declaration. It tells `main.cpp` that `use_a` exists in another file.
- `use_a()` returns `square(3)`, which is 9. The `square(4)` in `main` is 16.

::: tip
Put the body of small functions in a header only if you mark them `inline`, or make them `constexpr`. Otherwise, move the body into a `.cpp` file, and keep only the declaration in the header.
:::

### Inline variables

Since C++17 you can also make a variable `inline`. There is then only one shared copy of it in the whole program, even if many files include the header.

```cpp
#include <iostream>

inline int counter = 0;   // C++17: one shared variable

void bump() { ++counter; }

int main() {
    bump();
    bump();
    std::cout << counter << "\n";
}
```

Output:

```output
2
```

Line by line:

- `inline int counter = 0;` creates one variable called `counter`, with the value 0.
- `bump()` adds one to it. It does that twice in `main`.
- The final line prints 2.

### Some functions are inline without asking

You do not always have to write `inline`. Two kinds of functions are automatically treated as inline.

A **member function** written inside the class body is inline. A **constexpr** function is also inline. A `constexpr` function is one that the compiler is allowed to run while compiling. You may have met `constexpr` in Chapter 1.

```cpp
#include <iostream>

class Circle {
public:
    double r = 2.0;
    double area() const { return 3.14 * r * r; }  // inline
};

constexpr int sq(int x) { return x * x; }          // inline

int main() {
    Circle c;
    std::cout << c.area() << "\n";
    std::cout << sq(4) << "\n";
}
```

Output:

```output
12.56
16
```

Line by line:

- `class Circle` defines a shape with one number, the radius `r`.
- `double area() const` is a member function. It is written inside the class, so it is inline. The `const` promises it does not change the circle.
- `3.14 * r * r` is the area of a circle with radius 2, which is 12.56.
- `constexpr int sq(int x)` can run at compile time, and is inline.
- `c.area()` and `sq(4)` print their values.

Remember that inlining is a decision for the compiler. Very large or recursive functions are usually not inlined, and copying big bodies everywhere makes the program larger.

::: answer
**Q12. What is the purpose of the `inline` keyword?**

Today `inline` mainly means that a function or variable may be defined in more than one file. This is how a function can live in a header that many `.cpp` files include, without a linker error. The linker merges the copies into one. The old meaning, a hint to paste the body at the call site, is only a suggestion that compilers may ignore. Member functions defined inside a class, and `constexpr` functions, are inline automatically.
:::

## Two kinds of errors: compile time and runtime

A bug is a mistake in your program. Bugs are caught at different times. The time a bug is found changes how much it hurts. Some bugs stop you before the program ever exists. Some appear only after your users have started using it.

The first step is to know the difference between **compile-time** and **runtime**. Compile time is when the compiler reads your code. Runtime is when the program is running.

### Compile-time errors: the compiler stops you

A **compile-time error** is a mistake the compiler finds while reading your source code. Here are three of them in one file:

```cpp
int main() {
    int x = "hello";   // wrong type
    undefinedFn();      // unknown name
    int y = 5           // missing semicolon
}
```

GCC reports each mistake with a line number:

```output
main.cpp:2:13: error: invalid conversion from 'const char*' to 'int'
main.cpp:3:5: error: 'undefinedFn' was not declared in this scope
main.cpp:4:14: error: expected ',' or ';' before '}' token
```

Line by line:

- `int x = "hello";` tries to put text into a number. The compiler knows a number cannot hold text.
- `undefinedFn();` calls a function nobody declared. The compiler does not know the name.
- `int y = 5` has no semicolon at the end. In C++, every statement ends with a semicolon.

Because of these errors, no program is built at all. The mistake can never reach a user. Compile-time errors are the good kind of error. The exact wording varies between compilers, but the errors are always found before the program runs.

### Runtime errors: it builds, then fails

A **runtime error** is a mistake the compiler cannot see. The code is valid, so the program builds. It then fails while it runs, sometimes only for certain inputs.

This program divides 10 by a number the user types:

```cpp
#include <iostream>

int main() {
    int d;
    std::cin >> d;
    std::cout << 10 / d << "\n";
}
```

Line by line:

- `int d;` creates a variable for the number the user will type.
- `std::cin >> d;` reads one number from the keyboard into `d`. `std::cin` is the standard input. It is the counterpart of `std::cout`.
- `10 / d` divides 10 by `d`.

If the user types 5, the program prints 2. If the user types 0, dividing by zero is not allowed. The program crashes:

```output
Floating point exception (core dumped)
```

A **crash** is when the program stops unexpectedly. The compiler could not know what the user would type, so it built the program anyway.

Another kind of runtime problem is an **exception**. An exception is a signal that something went wrong, which the code can catch and handle. Here is a vector asked for item number 10, when it has only three items.

```cpp
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3};
    try {
        std::cout << v.at(10) << "\n";
    } catch (const std::out_of_range&) {
        std::cout << "caught: out of range\n";
    }
}
```

Output:

```output
caught: out of range
```

Line by line:

- `v.at(10)` asks for item number 10. The `at` function checks the position, and finds it is not there. So it throws an exception.
- **Throwing** means the normal flow stops and the exception travels up to whoever is ready to catch it.
- `try { ... }` marks code that may throw.
- `catch (const std::out_of_range&)` says: if an `out_of_range` exception comes out, run this block instead of crashing.
- The program prints the message and ends normally.

Note the difference. `v.at(10)` is checked and reports the problem. The plain `v[10]` does not check, which leads to undefined behavior. You will read about that later in this chapter.

### The timeline of bugs

Think of bugs on a timeline, from earliest to latest.

- **Compile-time errors** are found first, and they are the cheapest to fix.
- **Link errors**, like the `multiple definition` error above, come next. The compiler is done, but the linker cannot join the pieces.
- **Runtime errors** only appear while the program runs. They may depend on the input, and they may appear in front of your users.
- **Logic errors** are the sneakiest. The program builds and runs without any crash, but the answer is wrong. Nothing tells you something is broken, except the result.

The goal is to move each bug as far left on the timeline as you can.

### Pushing mistakes toward compile time

Good C++ moves mistakes toward compile time. Two tools help.

The first is **`static_assert`**. It checks a fact while the program is being compiled. If the fact is false, the compile stops with your message.

The second is a **strong type**, such as `enum class`. An `enum` is a type with a fixed list of named values. An `enum class` is a stricter version, that does not turn into a number by itself.

```cpp
#include <iostream>

enum class Color { Red, Green };

void paint(Color c) {
    std::cout << (c == Color::Red ? "red" : "green") << "\n";
}

int main() {
    static_assert(sizeof(int) >= 4, "int must be at least 32 bits");
    paint(Color::Red);
    // paint(1);   // compile error: 1 is not a Color
}
```

Output:

```output
red
```

Line by line:

- `enum class Color { Red, Green };` defines a type that can hold only `Color::Red` or `Color::Green`.
- `paint` takes a `Color`. It prints `red` or `green`.
- `sizeof(int)` gives the number of bytes an `int` uses. The `static_assert` checks that it is at least 4. If not, the build stops with the message.
- `paint(Color::Red)` is correct, so it prints `red`.
- The commented line `paint(1)` would not compile. The number 1 is not a `Color`, and the compiler refuses. That turns a possible runtime bug into a compile-time error.

::: warning
A common trap: a compile-time check does not prove the program is correct. It only proves the check passed. Logic errors still need tests and careful thought.
:::

::: answer
**Q13. What is the difference between compile-time and runtime errors?**

A compile-time error is found by the compiler while it reads the code, so no program is built. A runtime error compiles without complaint, and then fails while the program runs, often only for some inputs, like dividing by zero. Compile-time errors are cheaper and safer, so good C++ moves checks earlier. Use strong types, `const`, and `static_assert` to catch mistakes before the program runs.
:::

## When the rules run out: undefined behavior

The worst kind of bug is one the language never tells you about. It is called **undefined behavior**, often shortened to **UB**. Undefined behavior means the C++ standard, which is the official rule book, sets no requirements on what happens. The result can be anything.

Undefined behavior is not an error message. It is not a guaranteed crash. It is simply code the standard does not describe.

### Three classic examples

Here are three lines of code, each with UB.

```cpp
int arr[3] = {1, 2, 3};
int x = arr[5];        // out of bounds

int* p = nullptr;
*p = 10;               // null pointer dereference

int big = INT_MAX;
big = big + 1;         // signed overflow
```

Line by line:

- `int arr[3]` is an **array**, a row of three `int` values. The valid positions are 0, 1 and 2. Position 5 is **out of bounds**, because it is outside the row.
- `int* p = nullptr;` makes a pointer that points to nothing. You met pointers in Chapter 1. `nullptr` is the "points to nothing" value. You will learn more about it in the last section of this chapter.
- `*p = 10;` is **dereferencing** a pointer: it means "the value at the place this pointer points." Here the place does not exist, so the write is UB.
- `INT_MAX` is the biggest value an `int` can hold. Its header is `<climits>`. Adding one to it is **signed overflow**. A **signed** number can be negative or positive. Overflowing a signed value is UB, while overflowing an unsigned value wraps around in a defined way.

These three lines are the classics. Reading past the end of an array, following a null pointer, and overflowing a signed integer are all UB.

### What actually happens?

Here is the scary part. The program might do any of these things:

```text
- print the right answer and seem fine
- print garbage numbers
- crash on one computer, and work on another
- work in a debug build, and break when optimized
- do something unrelated to the line that caused it
```

The compiler is allowed to assume UB never happens. It can use that assumption to make the code faster. So code that worked yesterday may break after you change one compiler flag. This is why "it works on my machine" proves nothing.

### The check that disappears

Here is a real trap. Suppose you want to check whether adding one to `x` overflows.

```cpp
bool willOverflow(int x) {
    return x + 1 < x;      // signed overflow is UB...
}
```

The idea is clever. If `x + 1` wraps around, it becomes less than `x`. But overflow is UB. So the compiler is allowed to assume `x + 1` is never less than `x`. From that, it may simplify the whole function to a constant. With GCC at `-O2` the function really does become `return false`, which turns your safety check into nothing.

To check overflow safely, test before you add. For example, `if (x > INT_MAX - 1)` avoids the overflow entirely.

### More common cases

Three more UB cases show up all the time.

```cpp
int x;                  // uninitialized
std::cout << x;         // reading garbage

int* q = new int(5);
delete q;
*q = 7;                 // use after free
```

Line by line:

- `int x;` makes a variable but gives it no starting value. Reading it before you assign a value is UB. The value is whatever bits happened to be in that memory.
- `new int(5)` asks the heap for a new `int` and sets it to 5. You learned about the heap in Chapter 1.
- `delete q;` gives the memory back to the heap. The pointer `q` still holds the old address. This pointer is now a **dangling pointer**, because it points at memory that no longer belongs to you.
- `*q = 7;` writes through the dangling pointer. This is **use after free**, and it is UB.

The last example is a case where the same variable is changed twice in one expression:

```cpp
int i = 0;
i = i++ + ++i;          // unsequenced modifications
```

C++ does not say which side of the `+` runs first. Both sides change `i`, with nothing to order them. So the result is UB.

### Catching UB: warnings and sanitizers

You do not have to find UB by hand. Two tools help.

A **warning** is a message from the compiler about code that looks wrong, even if it is legal. Turn them on with `-Wall` and `-Wextra`. For the uninitialized read, GCC says `'x' is used uninitialized`. For the `i = i++ + ++i` line, GCC says `operation on 'i' may be undefined`.

A **sanitizer** is a checker built into the compiler that watches your program while it runs. It stops at the first problem and prints a clear report. Turn one on with the `-fsanitize` flag:

```bash
g++ -std=c++17 -g -Wall -fsanitize=address,undefined more.cpp
./a.out
```

Here is the use-after-free example compiled that way. The sanitizer prints this report, with the line that caused it:

```output
ERROR: AddressSanitizer: heap-use-after-free
WRITE of size 4 ...
```

Line by line of the command:

- `g++` is the compiler. `-std=c++17` selects the standard.
- `-g` adds debugging information, so the report names your lines.
- `-Wall` turns on the common warnings.
- `-fsanitize=address,undefined` turns on two sanitizers. `address` catches bad memory use. `undefined` catches many kinds of UB, like overflow.
- `./a.out` runs the program. The default output file name is `a.out`.

::: tip
Build your tests with sanitizers on. A sanitizer slows the program down, but it finds bugs that would otherwise hide for months.
:::

::: warning
Sanitizers only see the paths your program actually runs. A bug in code that never runs will stay hidden, so write tests that cover real cases.
:::

::: answer
**Q14. What is undefined behavior? Give examples.**

Undefined behavior means the C++ standard sets no rules for what happens, so the program may do anything, including seem to work. Common examples are reading past the end of an array, dereferencing a null pointer, signed integer overflow, reading an uninitialized variable, using memory after it was deleted, and changing a variable twice in one unordered expression. The compiler may assume UB never happens and optimize based on that. Use `-Wall` and sanitizers to find it.
:::

## Three ways to say "nothing": `0`, `NULL`, `nullptr`

Sometimes a pointer has nothing to point at. You need a value that means "no address here." C++ has three ways to write that value, and they are not the same. Learning the difference protects you from a confusing bug.

Before we start, a word you will need. A **literal** is a value written directly in your code, like `42` or `0`. A **macro** is a piece of text that the **preprocessor** replaces before the compiler starts. The preprocessor is the first step of compilation, the one that handles lines beginning with `#`, such as `#include`.

### Zero: a literal that becomes a null pointer

Zero is an integer literal. C++ allows a zero literal to convert into a null pointer. That is the oldest rule.

```cpp
int* a = 0;         // literal zero
```

Here `0` is a number, and it is copied into a pointer. The language accepts it. This works, but the code gives no sign that `a` is a pointer. The `0` looks like a count, not an address.

### NULL: a macro that is still an integer

`NULL` is a macro inherited from C. The header that defines it usually makes it stand for `0`, or sometimes for `0L`, which is a `long` zero.

```cpp
int* b = NULL;      // a macro: 0 or 0L
```

After the preprocessor runs, this line is simply `int* b = 0;` or similar. The value is still an integer. `NULL` is a convenience name, not a new kind of thing.

### nullptr: a real null pointer

Since C++11 there is a keyword made for this job: `nullptr`. It is a real null pointer. It has its own type, called `std::nullptr_t`, which is defined in the header `<cstddef>`.

```cpp
int* c = nullptr;   // C++11: a real null pointer
```

A **type** tells the compiler what a value is and what you can do with it. `nullptr` has its own type. That type can convert to any pointer type. It cannot convert to a number, so it cannot be mistaken for one.

Here is a picture of a null pointer. Each box is a piece of memory, with an address written on it.

```{=latex}
\begin{memdiagram}
\cell[stack]{p}{0,0}{p (a pointer)}{0 (null)}
\draw[vzptr=bad] (p.east) -- (2.5,0);
\draw[vzbad, line width=1.6pt] (2.65,-0.25) -- (3.15,0.25) (2.65,0.25) -- (3.15,-0.25);
\node[vznote=bad, anchor=west] at (3.3,0) {nothing is stored at address 0};
\end{memdiagram}
```

The pointer `p` holds the address 0, which is the null address. The program is not allowed to use anything at that address.

### Why it matters: overloading

Chapter 1 and this chapter both use functions that take a pointer. Here is why `nullptr` is safer. Suppose you have two versions of `f`, one for `int` and one for a pointer.

```cpp
#include <iostream>

void f(int x)   { std::cout << "int\n"; }
void f(char* p) { std::cout << "pointer\n"; }

int main() {
    f(0);          // int
    f(nullptr);    // pointer
    f(NULL);       // not what you want!
}
```

Here is what the compiler does with each call.

- `f(0)` picks the `int` version. Zero is an integer, and that is the best match.
- `f(nullptr)` picks the pointer version. `nullptr` can only become a pointer, so there is no doubt.
- `f(NULL)` is the trap. Because `NULL` is an integer, the compiler sees an `int` again. With GCC, this call is rejected as ambiguous:

```output
error: call of overloaded 'f(NULL)' is ambiguous
```

Line by line:

- The two definitions of `f` differ in their parameter type, so they overload.
- The first call is the easy one, `f(0)`.
- The last call is the one you would expect to reach the pointer version, but it does not. You can get the `int` version, or a compile error. Compilers differ on the exact result, so you must not rely on it.

The fix is simply to write `nullptr`.

### The same story with auto

The keyword `auto` asks the compiler to work out a variable's type from its starting value. Here, `NULL` and `nullptr` give different types.

```cpp
#include <cstddef>
#include <iostream>
#include <type_traits>

int main() {
    auto x = NULL;       // an integer, not a pointer!
    auto y = nullptr;    // std::nullptr_t
    static_assert(!std::is_pointer<decltype(x)>::value, "");
    static_assert(
        std::is_same<decltype(y), std::nullptr_t>::value, "");
    std::cout << "both checks passed\n";
}
```

Output:

```output
both checks passed
```

Line by line:

- `auto x = NULL;` makes `x` an integer type, because `NULL` is an integer. GCC warns about this with `converting to non-pointer type 'long int' from NULL`.
- `auto y = nullptr;` makes `y` the type `std::nullptr_t`.
- `decltype(x)` means "the type of `x`." The two `static_assert` lines check the types at compile time. If either one is false, the build fails.
- `std::is_pointer` and `std::is_same` are standard checks from `<type_traits>`. They answer yes or no about a type.

The result is that `NULL` is a trap in both places, `auto` and overloading. `nullptr` behaves the way you expect everywhere.

::: tip
When you read old code with `NULL` or `0` as a pointer, you do not have to rewrite it all at once. Change new code to `nullptr`, and change old code when you touch it.
:::

::: answer
**Q15. What is the difference between `NULL`, `0`, and `nullptr`?**

`0` is an integer literal that the language allows to become a null pointer. `NULL` is a macro, usually defined as `0` or `0L`, so it is also an integer. Neither one is a real pointer, and that causes surprises with overloading and `auto`. `nullptr`, added in C++11, is a true null pointer with its own type, `std::nullptr_t`. It converts only to pointer types. In modern C++, always write `nullptr`.
:::

## Chapter summary

- A **namespace** is a named box for names. Reach a name with `::`, as in `gfx::draw`. The standard library lives in `std`.
- Never write `using namespace std;` in a header file.
- Pre-increment `++i` adds one, then gives the new value. Post-increment `i++` gives a copy of the old value, then adds one.
- Prefer `++i` and `++it`, because `i++` may make an unneeded copy.
- **Function overloading** lets one name serve several functions with different parameter types. The compiler chooses by the argument types.
- The return type alone cannot overload, and some calls are ambiguous.
- `inline` mainly lets a function or variable be defined in many files, as in a header. Member functions defined in a class, and `constexpr` functions, are inline automatically.
- A **compile-time error** stops the build. A **runtime error** happens while the program runs, often for some inputs. Move mistakes toward compile time with strong types and `static_assert`.
- **Undefined behavior** means the standard sets no rules, so anything can happen. Use `-Wall` and sanitizers to find it.
- Use `nullptr` for a null pointer. `0` and `NULL` are integers that can become pointers, and they cause surprises with overloading and `auto`.
