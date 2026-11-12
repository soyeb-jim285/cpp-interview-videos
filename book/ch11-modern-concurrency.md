# Chapter 11 — Modern C++ and Doing Things at Once

Earlier chapters taught you variables, functions, the STL, move semantics and smart pointers. This chapter covers what the newer versions of C++ added. At the end, it does something new: it lets one program do several things at the same time.

C++ is defined by a **standard**. The standard is a long written document that says what the language and its library must do. A new version comes out every few years. **C++11** was published in 2011. It changed the language so much that people call it *modern C++*. C++14, C++17 and C++20 came after it.

## C++11: the big upgrade (Q86)

Old C++ code often looks clumsy. It writes very long type names, loops with counters, and uses the number zero for "no pointer". C++11 fixed much of this. Let's see the most useful features in one small program.

```cpp
#include <algorithm>
#include <iostream>
#include <memory>
#include <vector>

int main() {
    std::vector<int> v{5, 2, 8};          // brace initialization
    auto it = v.begin();                  // type deduction
    for (int x : v) std::cout << x;       // range-based for
    std::sort(v.begin(), v.end(),
        [](int a, int b) { return a > b; });  // lambda
    int* p = nullptr;                     // typed null pointer
    std::unique_ptr<int> up(new int(7));  // smart pointer
}
```

This program prints `528` with no newline at the end.

Let's go through it line by line. The `#include` lines bring in the parts of the standard library we use. Each `#include` is a **header**, a file with declarations the compiler needs.

The first line of `main` uses **brace initialization**. A list of values in `{ }` fills the new `std::vector` directly. A **vector** is the growable array from the STL chapter. Before C++11 you had to add the values one at a time.

The `auto` line uses **type deduction**. The compiler looks at the value on the right of `=` and works out the type for you. We cover `auto` in detail in Q87.

The `for` loop is a **range-based for loop**. A **range** is anything you can walk through from start to end, like a vector. `for (int x : v)` visits each element in order, one at a time.

The `sort` call uses a **lambda**. A lambda is a small function written right where you need it. This one says "a is bigger than b", so `sort` puts the numbers in descending order. We cover lambdas in Q88. The sort runs after the loop, so the loop prints the numbers in their original order.

`nullptr` is a keyword that means "a **pointer** that points to nothing". A pointer is a variable that holds the address of another object. Before C++11, people used `0` or `NULL`. Those are plain numbers, which can confuse the compiler when functions are overloaded.

The last line uses a **smart pointer**, from the earlier chapter. It owns the `int` and deletes it automatically when it goes out of scope. You never call `delete` yourself.

### Move semantics

The biggest C++11 feature is **move semantics**. Copying a big object means making a full duplicate of all its data. A **move** takes the data from one object and gives it to another, without duplicating it.

```cpp
#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string a(1000, 'x');       // 1000 characters of 'x'
    std::string b = std::move(a);   // b takes a's buffer, no copy
    std::cout << b.size() << '\n';  // prints 1000
}
```

This program prints `1000`.

The `a` line makes a string that holds 1000 `x` characters. Its characters live in a **buffer**, a block of memory that holds the data.

The `b` line is the interesting one. `std::move(a)` does not move anything by itself. It is a label that says "a may give away its data". The new string `b` then takes the buffer from `a`. No characters are copied, so the cost stays small even for huge strings.

After the move, `a` is still a valid object. Its value is **unspecified**, which means you cannot count on what it holds. You may assign a new value to it or let it be destroyed. Do not read it.

This is why returning a big vector from a function is cheap now. The vector is moved out, or the copy is skipped entirely.

::: warning
Do not write `return std::move(x);` for a local variable. A plain `return x;` already moves it, and the extra `std::move` can block the compiler's shortcut.
:::

### More of C++11, in brief

Some C++11 features are small enough to show in one program. This one uses an **enum class**, a **constexpr** function and a **static_assert**.

```cpp
#include <iostream>

enum class Color { Red, Green };      // scoped enumeration

constexpr int square(int x) {         // can run at compile time
    return x * x;
}

static_assert(square(3) == 9, "math is broken"); // compile-time

int main() {
    Color c = Color::Green;
    if (c == Color::Green) std::cout << square(4) << '\n';
}
```

This program prints `16`.

An **enumeration** is a named list of values. A plain `enum` leaks its names into the surrounding scope and turns into integers by accident. An **enum class** keeps its names inside its own type, so you write `Color::Green`.

`constexpr` tells the compiler that a function or variable can be computed while the program is being built. The `static_assert` line is a check that runs at compile time. If the condition is false, the program does not build at all.

The library also grew. Here is an **unordered_map**, a **hash table**. A hash table finds a value by its key quickly, without keeping the keys sorted.

```cpp
#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> m;
    m["apples"] = 3;                   // key "apples", value 3
    std::cout << m["apples"] << '\n';  // prints 3
}
```

This program prints `3`.

The map stores pairs of key and value. The `m["apples"]` syntax looks up the key, and it creates the entry if it is missing. Other C++11 features include `override`, `final`, `= delete`, `= default`, variadic templates, `std::array`, `std::tuple` and `std::chrono` for time. The last big group is concurrency: threads, mutexes, atomics and futures. The rest of this chapter is about that group.

::: answer
**Q86. What are the major features introduced in C++11?**

C++11 is the 2011 standard that made C++ feel modern. The biggest change is move semantics, where an object hands its resources to another object instead of copying them. Other major features are `auto`, range-based for loops, lambdas, `nullptr`, brace initialization, smart pointers, `enum class`, `constexpr`, and a threading library with `thread`, `mutex`, `atomic` and `future`. In an interview, lead with move semantics, then name a few others by what they do.
:::

::: tip
To try these programs, use a C++17 compiler. A typical command is `g++ -std=c++17 -Wall prog.cpp -o prog`, then run it with `./prog`. The `-Wall` flag asks the compiler to warn you about likely mistakes.
:::

## auto: let the compiler write the type (Q87)

Usually you write the type of every variable. Here is `int x = 5;`. The **type** tells the compiler what kind of value the variable holds. With `auto`, you write the word `auto` and the compiler works out the type from the **initializer**, which is the value after the `=` sign.

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    auto i = 42;                  // int
    auto d = 3.14;                // double
    std::map<std::string, int> m{{"a", 1}};
    auto it = m.begin();          // the long iterator type, for you
    std::cout << i << ' ' << d << ' ' << it->first << '\n';
}
```

This program prints `42 3.14 a`.

The `42` is an `int`, so `i` is an `int`. The `3.14` is a `double`, so `d` is a `double`. Both types are decided at compile time, exactly as if you had written them yourself.

The `map` line is where `auto` helps most. A **map** stores key and value pairs. Its **iterator**, the type that points to one entry, has a long name such as `std::map<std::string, int>::iterator`. The `auto` line writes that for you. The `it->first` part reads the key of the entry that the iterator points to.

`auto` has rules. It needs an initializer, so `auto x;` is a compile error. A string literal such as `"hi"` gives a `const char*`, not a `std::string`. Keep these in mind.

### The trap: auto copies

Here is the trap interviewers love. Plain `auto` makes a copy, because it drops references and **top-level const**. A **reference** is another name for an existing variable. Top-level const means `const` on the variable itself.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    for (auto e : v) e *= 2;            // changes a copy only
    for (int e : v) std::cout << e << ' ';
    std::cout << '\n';
    for (auto& e : v) e *= 2;           // changes the real element
    for (int e : v) std::cout << e << ' ';
    std::cout << '\n';
}
```

This program prints two lines:

```output
1 2 3 
2 4 6 
```

Each line ends with a space before the newline.

The first loop writes `auto e`. Each `e` is a fresh copy of one element. Multiplying the copy by two changes nothing in the vector, so the first line still shows `1 2 3`.

The second loop writes `auto& e`. The `&` makes `e` a reference to the real element. Now `e *= 2` changes the vector itself, and the second line shows `2 4 6`.

::: warning
When a loop changes the elements, write `auto&`. When it only reads them, `const auto&` avoids copies and is still safe.
:::

### Braces and return types

Two more rules come up in interviews. This program shows both.

```cpp
#include <iostream>

auto add(int a, int b) {     // return type deduced (C++14)
    return a + b;
}

int main() {
    auto x{5};               // int in C++17 and later
    std::cout << add(x, 2) << '\n';
}
```

This program prints `7`.

Since C++14, a function can use `auto` as its return type. The compiler takes the type from the `return` statement, here `int`.

With braces, `auto x{5};` gives an `int` in modern C++. But `auto y = {5};`, with an equals sign, gives a `std::initializer_list<int>`, a light list of values. That is a surprise, so read the braces carefully.

::: answer
**Q87. What is the purpose of `auto`?**

`auto` tells the compiler to deduce a variable's type from its initializer. You avoid writing long type names, such as iterator types. The type is still fixed at compile time, so there is no run-time cost. The trap is that plain `auto` drops references and top-level const, so it makes copies. Write `auto&` or `const auto&` when you want to avoid copies, and remember that `auto` needs an initializer.
:::

## Lambdas: small functions written inline (Q88)

A **lambda expression** is an unnamed function object that you write inline, right where you use it. "Unnamed" means it has no name. A **function object** is an object you can call with `( )`, like a function.

### Anatomy of a lambda

```cpp
#include <iostream>

int main() {
    int limit = 3;

    auto isBig = [limit](int x) -> bool {
        return x > limit;
    };

    std::cout << std::boolalpha;        // print true/false as words
    std::cout << isBig(5) << ' ' << isBig(2) << '\n';
}
```

This program prints `true false`.

The first part, `[limit]`, is the **capture list**. It says which outside variables the lambda may use. Here the lambda captures `limit`, so it can read it. Captures are covered in detail in Q89.

Next come the parameters, `(int x)`, just like a normal function. The `-> bool` part is the **return type**. You may leave it out, and the compiler will usually work it out from the body.

The body, `return x > limit;`, is the code that runs. We store the lambda in a variable with `auto`, and then call it like a function with `isBig(5)`.

### What the compiler really makes

A lambda is not magic. The compiler turns it into a class. The following is a sketch of that idea, not code you write yourself.

```text
class Closure {          // hidden class made by the compiler
    int limit;           // each captured variable becomes a member
public:
    bool operator()(int x) const {   // the body becomes this call
        return x > limit;
    }
};
```

The class has a data member called `limit`, which holds the captured copy. The body of the lambda becomes `operator()`, the call operator. That is the part that runs when you write `isBig(5)`. The compiler creates an object of this class, called a **closure**, and that object is what `isBig` really is.

This is why you can store a lambda, pass it to another function, and call it later.

### Lambdas with algorithms

Lambdas shine with the STL algorithms. This program counts the even numbers in a vector.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6};

    auto evens = std::count_if(v.begin(), v.end(),
        [](int x) { return x % 2 == 0; });

    std::cout << evens << '\n';
}
```

This program prints `3`.

`std::count_if` needs a test that it runs on each element. It counts the elements where the test returns `true`. The lambda is that test. It checks whether `x % 2` is zero, which means `x` is even. The `%` operator gives the remainder after division.

The capture list is empty, `[]`. The lambda uses nothing from outside, so it captures nothing. Lambdas are also common for callbacks and for thread functions, which we meet later in this chapter.

::: tip
If you need to store lambdas of different shapes in one variable, use `std::function`. It holds any callable with a matching signature. Use `auto` when the variable holds just one lambda.
:::

::: answer
**Q88. What is a lambda expression?**

A lambda is an unnamed function object written inline, with the form `[captures](params) { body }`. The compiler turns it into a class with a call operator, and each captured variable becomes a member of that class. Lambdas are common with STL algorithms such as `std::count_if`, for callbacks, and for thread functions. Store one with `auto`, or with `std::function` when you need one type for several callables.
:::

## Capture by value and capture by reference (Q89)

A lambda's capture list decides how it sees outside variables. There are two main ways. **Capture by value** copies the variable when the lambda is created. **Capture by reference** keeps a link to the original variable.

### Same variable, two captures

```cpp
#include <iostream>

int main() {
    int n = 1;

    auto byVal = [n]  { return n; };    // copy of n, taken now
    auto byRef = [&n] { return n; };    // link to the real n

    n = 10;

    std::cout << byVal() << ' ' << byRef() << '\n';
}
```

This program prints `1 10`.

The `[n]` in `byVal` makes a copy. At that moment `n` is `1`, so the copy holds `1` forever. The `&` in `[&n]` makes `byRef` hold a reference instead. A reference is another name for `n`, not a copy.

Then we set `n` to `10`. The copy inside `byVal` does not change, so it still returns `1`. The reference in `byRef` reads the real `n`, so it returns `10`.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.4,-2.8) rectangle (5.4,1);\end{scope}
\node[vzregiontitle=stack] at (-1.3,1.05) {STACK};
\cell[stack]{n}{0,0}{n}{10}
\cell[stack]{vr}{0,-2}{byRef}{\&n}
\ptr[stack]{vr.north}{n.south}
\cell[stack]{bv}{4,0}{byVal}{1}
\vznote[plain]{4,-1.3}{own copy,\\made at creation}
\end{memdiagram}
```

The diagram is a rough picture. The point is that `byVal` owns a separate `1`, while `byRef` points back at the one real `n`.

### Changing a copy needs mutable

By default, a by-value capture is read-only inside the lambda. The call operator is `const`, so the lambda may not change its copy.

```cpp
#include <iostream>

int main() {
    int c = 0;

    // auto bad = [c] { return ++c; };    // compile error: read-only
    auto inc = [c]() mutable { return ++c; };

    inc();
    inc();
    std::cout << inc() << '\n';   // 3
    std::cout << c << '\n';       // 0
}
```

This program prints `3` and then `0`.

The commented line would not build. The lambda would try to change its copy of `c`, and the default rule forbids that. The `mutable` keyword lifts that rule. Now the lambda may change its own copy.

The copy lives inside the lambda, so it keeps its value between calls. The three calls return `1`, `2` and `3`. The original `c` is still `0`, because the lambda never touched it.

### The trap: dangling references

Here is the trap that interviewers ask about most.

```cpp
#include <functional>

std::function<int()> make() {
    int local = 42;
    return [&local] { return local; };   // dangling!
}

int main() {
    auto f = make();
    f();    // undefined behavior: local is already gone
}
```

This program has no output that you can trust. The variable `local` is destroyed when `make` returns, but the lambda still holds a reference to it. Calling `f` reads memory that no longer belongs to `local`. That is **undefined behavior**, which means the C++ standard does not promise any result.

The fix is to capture by value:

```cpp
    return [local] { return local; };    // safe: holds its own copy
```

A **dangling reference** is a reference to something that no longer exists. The rule of thumb is simple. If a lambda can outlive the scope where it was made, for example when you return it or store it as a callback, capture by value.

### Side by side

| | By value `[x]` | By reference `[&x]` |
|---|---|---|
| Stores | A copy, taken at creation | A reference to the original |
| Sees later changes | No | Yes |
| Danger | Stale values, and copy cost | Dangling if it outlives the variable |

::: warning
Do not capture a local variable by reference in a lambda that you return or store for later. The bug often looks fine in small tests and fails later, in a real program.
:::

::: answer
**Q89. What is the difference between capture by value and capture by reference in lambdas?**

Capture by value (`[x]`) copies the variable when the lambda is created, so later changes to the original do not show up. Capture by reference (`[&x]`) keeps a reference to the original, so it sees the current value. By-value captures are `const` inside the lambda unless you add `mutable`. If a lambda can outlive the variable it captured by reference, that reference dangles and using it is undefined behavior. In that case, capture by value.
:::

## Templates: write once, use for any type (Q90)

A **template** is code that takes a type as a parameter. You write the code once, with a placeholder type. The compiler then makes the real version for each type you actually use.

### One function, many types

Imagine you need a function that returns the bigger of two values. Without templates, you would write one for `int`, another for `double`, another for `std::string`. A template lets you write it once.

```cpp
#include <iostream>
#include <string>

template <typename T>                 // T is a placeholder type
T maxOf(T a, T b) {
    return a > b ? a : b;             // ?: picks a or b
}

int main() {
    std::cout << maxOf(3, 7) << '\n';                  // T is int
    std::cout << maxOf(2.5, 1.5) << '\n';              // T is double
    std::cout << maxOf<std::string>("a", "b") << '\n';  // T by hand
    // maxOf(3, 2.5);   // compile error: T would be int and double
}
```

This program prints three lines: `7`, `2.5` and `b`.

The line `template <typename T>` says that `T` is a **type parameter**. It is a name the compiler will replace with a real type. The function body uses `T` like any other type.

When we call `maxOf(3, 7)`, the compiler sees two `int` arguments. It **deduces**, or works out, that `T` must be `int`. The two `double` values give `T` as `double`. For the string we write the type ourselves in angle brackets.

The commented-out line is the classic gotcha. One `T` cannot be `int` and `double` at once, so deduction fails and the program will not build. Fix it by setting the type by hand, as in the string example.

### Instantiation

A template is a recipe, not real code. When you use it with a type, the compiler creates a separate function for that type. This step is called **instantiation**.

```{=latex}
\begin{memdiagram}
\widecell[data]{t}{6,3.2}{2.6}{}{maxOf\textless{}T\textgreater{}}
\vznote[plain]{9.0,3.2}{the template: a recipe}
\widecell[ok]{i1}{1.9,0}{3.8}{}{maxOf\textless{}int\textgreater{}}
\widecell[ok]{i2}{6.0,0}{3.8}{}{maxOf\textless{}double\textgreater{}}
\widecell[ok]{i3}{10.1,0}{3.8}{}{maxOf\textless{}std::string\textgreater{}}
\vznote[plain]{1.9,-0.8}{real code}
\vznote[plain]{6.0,-0.8}{real code}
\vznote[plain]{10.1,-0.8}{real code}
\ptr[data]{t.south}{i1.north}
\ptr[data]{t.south}{i2.north}
\ptr[data]{t.south}{i3.north}
\end{memdiagram}
```

Each instantiation is real machine code, fitted to its type. It all happens at compile time, so calling a template costs nothing extra at run time.

The price is paid when building. Compile times grow, and the program file can grow too. The compiler also needs the full template at each place you use it, so templates are usually written in **header** files. A header is a file that other files include.

### Class templates

Classes can be templates too. This is how `std::vector` and `std::map` work.

```cpp
#include <iostream>
#include <string>

template <typename T>
class Box {                       // a class: data plus functions
    T value;                      // the data it stores
public:
    Box(T v) : value(v) {}        // constructor: sets up a new Box
    T get() const { return value; }
};

int main() {
    Box<int> a(5);
    Box<std::string> b("hi");
    std::cout << a.get() << ' ' << b.get() << '\n';
}
```

This program prints `5 hi`.

The `Box` class has one placeholder, `T`. The line `Box<int> a(5);` makes a class for `int`, and `Box<std::string> b("hi");` makes a second, separate class for strings. They are different types, both made from one definition.

The constructor is the function that runs when an object is created. The `: value(v)` part, called a **member initializer**, gives `value` its starting value. The `const` after `get()` promises that `get` does not change the box.

::: tip
Unlike Java generics, which mostly share one compiled version, each C++ template instantiation is its own fully typed code. That is why templates are fast, and also why they make the build slower.
:::

::: answer
**Q90. What are templates?**

A template is code written once with a type parameter, such as `template <typename T>`. The compiler makes a separate version for each type you use, at compile time, so there is no run-time cost. Function templates usually deduce `T` from the arguments, and class templates need the type written out, like `Box<int>`. The costs are longer builds and bigger programs, and templates usually live in headers.
:::

## Template specialization: a custom version for one type (Q91)

A template gives one generic version for every type. **Specialization** gives the compiler a custom version for some specific type. The custom version wins when that type is used.

### Full specialization

We start with a **primary template**. That is the generic version, the one used when no special case matches.

```cpp
#include <iostream>

template <typename T>                  // primary template
struct TypeName {                     // struct: a class, public
    static const char* get() { return "unknown"; }
};

template <>                            // full specialization for int
struct TypeName<int> {
    static const char* get() { return "int"; }
};

int main() {
    std::cout << TypeName<int>::get() << '\n';
    std::cout << TypeName<double>::get() << '\n';
}
```

This program prints two lines: `int` and `unknown`.

The primary template answers `"unknown"` for any type. The second definition starts with `template <>`, with empty angle brackets. That says "I am a specialization, and I name the exact type myself". Here the exact type is `int`.

So `TypeName<int>::get()` uses the special version and prints `int`. `TypeName<double>::get()` has no special version, so the compiler falls back to the primary template and prints `unknown`.

### Why specialize?

Sometimes the generic code is wrong for one type. Here is a generic `equal` function, plus a special version for C strings.

```cpp
#include <cstring>
#include <iostream>

template <typename T>
bool equal(T a, T b) { return a == b; }

template <>                            // special case for C strings
bool equal<const char*>(const char* a, const char* b) {
    return std::strcmp(a, b) == 0;        // compare the text
}

int main() {
    char buf[] = "abc";                   // one array of letters
    const char* p1 = buf;
    const char* p2 = "abc";             // another array of letters
    std::cout << std::boolalpha << equal(p1, p2) << '\n';
}
```

This program prints `true`.

A **C string** is a `char` array that ends with a zero byte. A `const char*` points to the first letter of one.

In the generic version, `a == b` compares two pointers. It asks whether they point to the same place. Here `p1` and `p2` point to two different arrays, so `==` alone would say `false`. We want to know whether the text is the same.

The special version uses `std::strcmp`, which compares the letters one by one and returns `0` when they match. So the output is `true`. `std::strcmp` lives in `<cstring>`.

### Partial specialization

**Partial specialization** matches a whole family of types. The pattern still has a placeholder, so it fits many types.

```cpp
template <typename T>
struct IsPointer { static constexpr bool value = false; };

template <typename T>                       // still a template
struct IsPointer<T*> { static constexpr bool value = true; };

int main() {
    static_assert(!IsPointer<int>::value, "int is not a pointer");
    static_assert(IsPointer<int*>::value, "int* is a pointer");
    static_assert(IsPointer<double*>::value, "double* is a pointer");
}
```

This program prints nothing, because all the checks pass at compile time. If one of them were false, the program would not build.

The pattern `T*` matches any pointer type. `int*` and `double*` both match, and each gets `value` set to `true`. A plain `int` does not match the pattern, so it uses the primary template with `value` set to `false`.

This is how the standard **type traits** work. A type trait asks a question about a type at compile time.

::: warning
Partial specialization works only for class templates. You cannot partially specialize a function template. For functions, write an overload instead.
:::

::: answer
**Q91. What is template specialization?**

Specialization is a custom version of a template for particular types. A full specialization writes `template <>` followed by one exact type, and the compiler uses it for that type only. A partial specialization matches a pattern such as `T*`, and it works only for class templates. Programmers use it for type traits, and for types where the generic code is wrong or slow. For one function, a plain overload is often simpler.
:::

## Before concurrency: what is a thread? (from zero)

Everything so far ran in a single line of steps. The program started at `main`, ran one statement, then the next, and so on. The processor did one thing at a time.

Modern computers have several **CPU cores**. A core is a part of the processor that can run its own stream of instructions. To use more than one core at once, the program needs more than one line of steps running side by side.

A **thread** is exactly that: one line of execution. It is a path through your code with its own position, its own local variables and its own notes about where it is now. Every program starts with one thread, the **main thread**, which begins at `main`.

Think of a kitchen. One cook can do one thing at a time. Two cooks can work in the same kitchen at once. They share the same fridge, but each has their own cutting board. The cooks are the threads. The fridge is shared memory. The cutting boards are private.

### Starting a thread

```cpp
#include <iostream>
#include <thread>

void hello() {
    std::cout << "hello from the new thread\n";
}

int main() {
    std::thread t(hello);    // start a new thread that runs hello()
    t.join();                // wait here until t has finished
    std::cout << "hello from main\n";
}
```

This program prints two lines, in this order:

```output
hello from the new thread
hello from main
```

The `std::thread` type comes from `<thread>`. Writing `std::thread t(hello);` creates a thread object and starts a new thread that calls `hello`.

The `join` call means "wait until that thread finishes". Because of `join`, the main thread waits, so its line always prints last.

Without `join`, the two threads would run side by side, and the lines could print in either order. We come back to that point soon.

::: tip
On some Linux setups, GCC needs the flag `-pthread` to build threads. A safe command is `g++ -std=c++17 -pthread hello.cpp -o hello`.
:::

The diagram below shows the two lines of steps. Time runs down the page.

```{=latex}
\begin{memdiagram}
\node[vz, anchor=east] at (2.0,1.2) {main thread};
\node[vz, anchor=east] at (2.0,0) {new thread t};
\node[vzcell=stack, minimum width=1.7cm] (m1) at (3.2,1.2) {main()};
\node[vzcell=stack, minimum width=1.7cm] (m2) at (5.3,1.2) {start t};
\node[vzcell=stack, minimum width=2.1cm] (m3) at (7.9,1.2) {join (wait)};
\node[vzcell=stack, minimum width=1.7cm] (m4) at (10.0,1.2) {print};
\node[vzcell=ok, minimum width=1.7cm] (t1) at (6.1,0) {hello()};
\node[vzcell=ok, minimum width=1.7cm] (t2) at (8.3,0) {print};
\node[vzcell=ok, minimum width=1.2cm] (t3) at (10.6,0) {done};
\ptr[stack]{m2.south}{t1.north}
\end{memdiagram}
```

### Threads share memory

Each thread has its own **stack**, the scratch area where a function keeps its local variables. A thread cannot see another thread's locals. Global variables, and anything on the **heap** (memory you get with `new`), are shared. Every thread can see them.

```{=latex}
\begin{memdiagram}
\begin{scope}[on background layer]\draw[vzregion=stack] (-1.4,-0.6) rectangle (1.4,1.6);\end{scope}
\node[vzregiontitle=stack] at (-1.3,1.65) {THREAD A};
\begin{scope}[on background layer]\draw[vzregion=heap] (3.1,-0.6) rectangle (5.9,1.6);\end{scope}
\node[vzregiontitle=heap] at (3.2,1.65) {SHARED MEMORY};
\begin{scope}[on background layer]\draw[vzregion=stack] (7.6,-0.6) rectangle (10.4,1.6);\end{scope}
\node[vzregiontitle=stack] at (7.7,1.65) {THREAD B};
\cell[stack]{ai}{0,0}{}{local i}
\cell[heap]{cnt}{4.5,0}{counter}{5}
\cell[stack]{bi}{9,0}{}{local i}
\ptr[stack]{ai.east}{cnt.west}
\ptr[plain]{bi.west}{cnt.east}
\end{memdiagram}
```

Sharing is useful, and it is also dangerous. Two threads that change the same variable can step on each other. That is the start of every concurrency bug, and it is why the next sections matter.

A few words will come up in the next questions. **Join** means wait for a thread to finish. **Detach** means let a thread run on its own, with no waiting. A thread object that is still joinable when it is destroyed makes the program call `std::terminate`, which stops the program.

## std::thread versus std::async (Q92)

Both `std::thread` and `std::async` run code on another thread. They differ in how much work you do and how you get the answer back.

### std::thread: you manage everything

```cpp
#include <iostream>
#include <thread>

int compute() { return 42; }     // stands in for slow work

int main() {
    int result = 0;
    std::thread t([&result] { result = compute(); });
    t.join();
    std::cout << result << '\n';
}
```

This program prints `42`.

The line that creates `t` starts a new thread right away. It runs a lambda, and the lambda calls `compute`. A `std::thread` returns nothing, so the lambda stores its answer in `result`. The lambda captures `result` by reference, as we saw in Q89, so the thread writes into the real variable.

The `join` call waits until the thread is done. Only after `join` do we read `result`. The reading is safe because the thread has finished writing.

If you forget `join` or `detach`, the thread object is destroyed while still running, and the program calls `std::terminate`. An exception that escapes the thread function also calls `terminate`. So `std::thread` is a low-level tool, and you must handle everything yourself.

### std::async: a task with a future

```cpp
#include <future>
#include <iostream>

int compute() { return 42; }

int main() {
    std::future<int> f = std::async(std::launch::async, compute);
    std::cout << f.get() << '\n';    // waits, then returns 42
}
```

This program prints `42`.

`std::async` runs a function and gives you back a **future**. A future is an object that will hold a value later. The type `std::future<int>` says the value is an `int`.

The call `f.get()` waits until the task finishes, and then returns the value. If `compute` had thrown an exception, `get()` would throw it again, right here in your thread. You do not need `join`, and you do not need a shared variable.

The first argument, `std::launch::async`, is a **launch policy**. It says the task must run on a new thread. Without it, the library may choose to run the task later, inside `get()`, on the same thread. So a plain `std::async(compute)` may not run in parallel at all.

### Side by side

| | `std::thread` | `std::async` |
|---|---|---|
| Level | Low: a thread of execution | High: a task with a result |
| Result | None: share a variable | A `std::future<T>`, read by `get()` |
| Exceptions | Escaping one calls `terminate` | Stored, rethrown by `get()` |

::: warning
Forgetting to `join()` or `detach()` a `std::thread` ends the program. Use `std::thread` for long-lived workers, and `std::async` when you just want one answer.
:::

::: answer
**Q92. What is the difference between `std::thread` and `std::async`?**

`std::thread` starts a thread right away and returns nothing, so you share results through variables. You must `join` or `detach` it, and an exception that escapes it calls `terminate`. `std::async` runs a task and returns a `std::future`, and `get()` gives you the value or rethrows the exception. Use `std::thread` for long-lived workers, and `std::async` when you want a result. Pass `std::launch::async` if the task must run on its own thread.
:::

## Race conditions (Q93)

A **race condition** is a bug where the result depends on the timing of the threads. Sometimes thread A goes first, sometimes thread B does, and the answer changes. The program may even look right most of the time.

### Two threads, one counter

Here are two threads that each add one to a shared counter a hundred thousand times.

```cpp
#include <iostream>
#include <thread>

int counter = 0;

void work() {
    for (int i = 0; i < 100000; ++i)
        ++counter;              // looks like one step, is not
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << counter << '\n';   // we expect 200000
}
```

We expect `200000`. But this program is not safe. Its output can be a number lower than `200000`, and it changes from run to run. Do not rely on any particular wrong value.

The line `++counter` looks like one step, but the processor does three things: it **reads** the value, **adds** one, and **writes** the result back. Two threads can interleave those three steps. Here is one possible order, with the counter starting at `5`:

```{=latex}
\begin{memdiagram}
\node[vz, font=\sffamily\bfseries\small] at (0.5,0.9) {time};
\node[vz, font=\sffamily\bfseries\small] at (3.4,0.9) {thread A};
\node[vz, font=\sffamily\bfseries\small] at (7.4,0.9) {thread B};
\node[vz, font=\sffamily\bfseries\small] at (10.6,0.9) {counter};
\node[vz] at (0.5,0) {1};
\node[vz] at (0.5,-0.95) {2};
\node[vz] at (0.5,-1.9) {3};
\node[vz] at (0.5,-2.85) {4};
\node[vz] at (0.5,-3.8) {5};
\node[vz] at (0.5,-4.75) {6};
\node[vzcell=stack, minimum width=2.6cm] at (3.4,0) {reads 5};
\node[vzcell=heap, minimum width=2.6cm] at (7.4,-0.95) {reads 5};
\node[vzcell=stack, minimum width=2.6cm] at (3.4,-1.9) {adds 1 -> 6};
\node[vzcell=heap, minimum width=2.6cm] at (7.4,-2.85) {adds 1 -> 6};
\node[vzcell=stack, minimum width=2.6cm] at (3.4,-3.8) {writes 6};
\node[vzcell=heap, minimum width=2.6cm] at (7.4,-4.75) {writes 6};
\node[vzcell=data, minimum width=1.6cm] at (10.6,0) {5};
\node[vzcell=data, minimum width=1.6cm] at (10.6,-0.95) {5};
\node[vzcell=data, minimum width=1.6cm] at (10.6,-1.9) {5};
\node[vzcell=data, minimum width=1.6cm] at (10.6,-2.85) {5};
\node[vzcell=data, minimum width=1.6cm] at (10.6,-3.8) {6};
\node[vzcell=data, minimum width=1.6cm] at (10.6,-4.75) {6};
\end{memdiagram}
```

Both threads added one, but the counter went up by only one. One increment is lost. That is the race. Nothing here is wrong with the arithmetic. The bug is in the timing.

### Data race versus race condition

Interviewers like this distinction. A **data race** is a narrow thing. It happens when two threads access the same memory, at least one of them writes, and nothing makes them take turns. In C++, a data race on a plain variable is **undefined behavior**.

A race condition is broader. It is any bug where timing changes the result, even when every access is safe on its own.

```cpp
#include <atomic>
#include <mutex>

std::atomic<int> tickets{1};

void buy() {
    if (tickets > 0) {      // both threads may see 1...
        --tickets;          // ...then both subtract: -1
    }
}

std::mutex m;
void buySafe() {
    std::lock_guard<std::mutex> lk(m);
    if (tickets > 0) --tickets;   // check and act as one step
}
```

Here the atomic counter alone is not enough. Each `--tickets` is safe, but the check comes first. Two threads can both see one ticket, and both buy it. The fix is to make the check and the action a single protected step. The `buySafe` version does that with a mutex. Every other path to `tickets` must take the same lock too.

### Fixing the counter

There are two standard fixes. This is the first: make the counter an **atomic**. An atomic makes each operation indivisible, so no other thread can interrupt it.

```cpp
#include <atomic>
#include <iostream>
#include <thread>

std::atomic<int> counter{0};

void work() {
    for (int i = 0; i < 100000; ++i)
        ++counter;              // one indivisible step
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << counter.load() << '\n';   // prints 200000
}
```

This program prints `200000`, every time.

The `std::atomic<int>` type wraps an `int`. The `++counter` now works as one step that no other thread can split. The `load()` function reads the value, safely. Q95 explains atomics in more detail. The other fix is a mutex, which we cover in Q94.

Tools called **thread sanitizers** can find data races while you test. Turn them on with your compiler's `-fsanitize=thread` flag.

::: answer
**Q93. What is a race condition?**

A race condition is a bug where the result depends on the timing of threads. A data race is a narrow case: two threads touch the same memory, at least one writes, and nothing synchronizes them. In C++ a data race is undefined behavior. The counter bug happens because `++counter` is a read, an add and a write, and threads can interleave them. Fix it with an atomic or a mutex, and make a check-then-act sequence a single protected step.
:::

## Mutex and std::lock_guard (Q94)

A **mutex** is a lock that only one thread can hold at a time. The name is short for *mutual exclusion*. When a thread wants the lock and someone else already has it, the thread waits. When the holder lets go, one waiting thread gets it.

### Two threads, one lock

```cpp
#include <iostream>
#include <mutex>
#include <thread>

std::mutex m;
int counter = 0;

void work() {
    for (int i = 0; i < 100000; ++i) {
        std::lock_guard<std::mutex> lk(m);   // lock m
        ++counter;                       // one thread here at a time
    }                                    // lk destroyed: m unlocks
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << counter << '\n';    // prints 200000
}
```

This program prints `200000`.

The line `std::lock_guard<std::mutex> lk(m);` creates a **lock guard** named `lk`. Its constructor locks the mutex `m`. If the other thread already holds `m`, this line waits.

Only the thread that holds `m` may run `++counter`. When the loop body ends, `lk` goes out of scope and is destroyed. Its destructor unlocks `m`, and the other thread can continue.

The timeline below shows the same idea with two threads. Thread A holds the lock. Thread B waits.

```{=latex}
\begin{memdiagram}
\node[vz, anchor=east] at (-0.2,0) {mutex m};
\node[vz, anchor=east] at (-0.2,-1.2) {thread A};
\node[vz, anchor=east] at (-0.2,-2.4) {thread B};
\node[vzcell=data, minimum width=3.0cm] at (1.5,0) {unlocked};
\node[vzcell=data, minimum width=3.0cm] at (4.9,0) {locked by A};
\node[vzcell=data, minimum width=3.0cm] at (8.3,0) {locked by B};
\node[vzcell=data, minimum width=3.0cm] at (11.7,0) {unlocked};
\node[vzcell=stack, minimum width=3.0cm] at (1.5,-1.2) {lock m};
\node[vzcell=stack, minimum width=3.0cm, align=center] at (4.9,-1.2) {++counter ...\\unlock};
\node[vzcell=heap, minimum width=3.0cm, align=center] at (4.9,-2.4) {blocked,\\waiting ...};
\node[vzcell=heap, minimum width=3.0cm] at (8.3,-2.4) {lock m, ++};
\node[vzcell=heap, minimum width=3.0cm] at (11.7,-2.4) {unlock};
\end{memdiagram}
```

### Why not lock and unlock by hand?

You could write `m.lock()` and `m.unlock()` yourself. It is risky. Every path out of the function must unlock. Here is what can go wrong.

```cpp
#include <mutex>

std::mutex m;
int counter = 0;
int limit = 10;

void process() { /* work that might throw */ }

void work() {
    m.lock();
    ++counter;
    if (counter > limit) return;   // early return: m stays locked!
    process();                     // if this throws, m stays locked!
    m.unlock();
}
```

If `counter > limit`, the function returns before `unlock`. If `process` throws an exception, the function also leaves before `unlock`. In both cases the mutex stays locked forever. The next thread that calls `m.lock()` waits for ever. That is a **deadlock**, a situation where threads wait for each other, or for a lock that will never open.

### What lock_guard does

A `std::lock_guard` solves this with **RAII**. RAII stands for *Resource Acquisition Is Initialization*. The name is odd, but the idea is simple. A resource, such as a lock, a file or a block of memory, is tied to the life of an object. The constructor acquires it, and the destructor releases it.

Here is a simplified sketch of how `lock_guard` works. The real one is in the standard library.

```cpp
template <class Mutex>
class lock_guard {
    Mutex& mtx;                                  // the mutex we hold
public:
    explicit lock_guard(Mutex& m) : mtx(m) { mtx.lock(); }
    ~lock_guard() { mtx.unlock(); }              // destructor
    lock_guard(const lock_guard&) = delete;      // cannot be copied
};
```

The constructor locks the mutex. The destructor unlocks it. A destructor runs whenever an object leaves its scope. That happens at the end of the block, at a `return`, or when an exception flies past. So the unlock cannot be forgotten.

The line `= delete` stops anyone from copying the guard. Two guards could both try to unlock one mutex, so copying is forbidden.

::: tip
The standard has related tools. `std::unique_lock` can unlock early, and it works with condition variables. `std::scoped_lock`, from C++17, locks several mutexes at once without deadlocking.
:::

::: warning
Keep locked sections short. While a thread holds the lock, every other thread that needs it must wait. Do slow work outside the lock.
:::

::: answer
**Q94. What is a mutex, and how does `std::lock_guard` work?**

A mutex is a lock that only one thread can hold at a time. Other threads that want it wait until it is released. `std::lock_guard` locks the mutex in its constructor and unlocks it in its destructor, which is RAII. That means every way out of a scope releases the lock, including `return` and exceptions. Do not call `lock()` and `unlock()` by hand, and keep the locked part of the code small.
:::

## std::atomic versus a mutex (Q95)

Both `std::atomic` and a mutex stop data races. They do it in different ways, and they fit different jobs. An atomic makes one operation on one variable indivisible. A mutex makes a whole block of code exclusive.

### Atomic counter

The atomic program from Q93 is the right tool for a single counter.

```cpp
#include <atomic>
#include <iostream>
#include <thread>

std::atomic<int> counter{0};

void work() {
    for (int i = 0; i < 100000; ++i)
        ++counter;                  // one atomic read-modify-write
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << counter.load() << '\n';   // prints 200000
}
```

This program prints `200000`.

The `++counter` line becomes a single hardware instruction that reads, adds and writes in one indivisible step. On most processors that is cheap, and no thread has to sleep. The mutex version from Q94 prints the same `200000`, but each increment takes a lock and then releases it.

### Where atomics are not enough

An atomic protects one variable, one operation at a time. Look at a transfer of ten units from one account to another.

```cpp
#include <atomic>
#include <mutex>

std::atomic<int> a{100}, b{0};

void transfer() {
    a -= 10;   // atomic
    b += 10;   // atomic
}              // but the pair is not atomic

std::mutex m;
void transferSafe() {
    std::lock_guard<std::mutex> g(m);
    a -= 10;
    b += 10;   // readers must take m too
}
```

Each line in `transfer` is atomic on its own. But between the two lines, another thread can look at `a` and `b`. It can see `a + b` equal to `90`, not `100`. The money is briefly missing. The invariant, which is "the total is always 100", has been broken.

The mutex version fixes this. The whole pair of changes sits inside one locked block, so no other thread sees the middle. This works only if every reader of `a` and `b` also takes the same mutex.

### Checking for lock-free atomics

An atomic is **lock-free** when the processor can do its operations without any lock. You can ask the object.

```cpp
#include <atomic>
#include <iostream>

int main() {
    std::atomic<int> a{0};
    std::cout << std::boolalpha << a.is_lock_free() << '\n';
}
```

On most desktop and laptop processors this prints `true`. The standard leaves the answer to the platform, so ask the object rather than assume.

### Side by side

| | `std::atomic` | `std::mutex` |
|---|---|---|
| Protects | One variable, one operation | Any block of code, many variables |
| How | Special processor instructions | Lock and unlock, usually with RAII |
| Waiting | Usually none, lock-free | Others block, and may sleep |

::: tip
Use an atomic for a counter or a flag, a single value that one operation can update. Use a mutex when several values must change together and stay consistent.
:::

::: answer
**Q95. What is the difference between `std::atomic` and a mutex?**

`std::atomic` makes single operations on one variable indivisible, and it is usually lock-free, so threads do not block. A mutex makes a whole block of code exclusive, so other threads wait while it is held. An atomic cannot keep two variables consistent with each other, but a mutex can. Use atomics for counters and flags, and a mutex when several values must change together.
:::

## Chapter summary

- C++11 is the 2011 standard that made C++ "modern". Its biggest change is move semantics, which hands over resources instead of copying them.
- `auto` deduces a variable's type from its initializer, at compile time. Plain `auto` copies, so use `auto&` to avoid copies.
- A lambda is an unnamed function object, `[captures](params) { body }`. The compiler turns it into a class with a call operator.
- Capture by value copies a variable when the lambda is made. Capture by reference keeps a link, which can dangle.
- A template is code written once with a type parameter. The compiler makes a version for each type used.
- Specialization gives a template a custom version for a type, or a family of types. Full uses `template <>`, partial uses a pattern and works only for classes.
- A thread is one line of execution. Threads share global and heap memory but have their own stacks.
- `std::thread` runs code now and must be joined or detached. `std::async` returns a `std::future` you read with `get()`.
- A race condition is a bug where the timing of threads changes the result. A data race is unsynchronized access with a write, and it is undefined behavior.
- A mutex with `std::lock_guard` gives exclusive access, and RAII releases the lock on every exit path. `std::atomic` makes single operations on one variable indivisible.
