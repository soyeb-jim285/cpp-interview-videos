# Chapter 8 — Object Lifetime and Move Semantics

Every object in a program has a life. It is born, it does its job, and then it dies. Earlier chapters showed you classes, the copy constructor, copy assignment, the Rule of Five, and smart pointers. This chapter follows an object from birth to death. Then it shows a faster way to hand one object's contents to another.

The order is a little unusual. We start with constructors, including `explicit`, then destructors, then virtual functions. Next come lvalues and rvalues, and only after them move constructors. You cannot understand moving without knowing lvalues and rvalues, so that topic comes before the move constructor, even though its question number is later.

## Before we start: objects, lifetime, and memory

An **object** is a piece of memory that holds a value of some type, such as an `int` or a `Point`. A **variable** is a name you give to an object.

The **lifetime** of an object is the time from its creation to its destruction. Lifetime is the main idea of this chapter.

A **scope** is the code between a `{` and its matching `}`. A variable declared inside a scope is a **local** variable. It exists only while the program runs inside that scope.

C++ keeps objects in two main places. Local objects live on the **stack**, a region of memory that grows and shrinks as functions start and finish. Objects that you create with `new` live on the **heap**, a larger pool of memory that you manage yourself. Here a pointer `p` on the stack points to an `int` on the heap:

```{=latex}
\begin{memdiagram}
\region[stack]{s}{-1.3,-0.8}{2.6,1.9}{}
\node[vzregiontitle=stack, anchor=south west] at (-1.20,1.15) {STACK};
\region[heap]{h}{2.4,-0.8}{2.6,1.9}{}
\node[vzregiontitle=heap, anchor=south west] at (2.50,1.15) {HEAP};
\cell[stack]{p}{0,0}{int* p}{0x5f20}
\cell[heap]{v}{3.7,0}{@0x5f20}{42}
\ptr{p.east}{v.west}
\end{memdiagram}
```

Keep this picture in mind. Most of the questions in this chapter are about what happens to these boxes over time.

## Constructors: how an object is born

A **member** is a variable or function that belongs to a class. A **constructor** is a special member function that runs when an object is created. A constructor has the same name as its class and no return type.

A class can have several constructors. They differ only in what you hand to the new object. Here is one small class that shows all three kinds that matter in this question.

```cpp
#include <iostream>

struct Point {
    int x, y;
    Point() : x(0), y(0) {}                    // default
    Point(int x, int y) : x(x), y(y) {}        // parameterized
    Point(const Point& o) : x(o.x), y(o.y) {}  // copy
};

void print(const Point& p) {
    std::cout << "(" << p.x << ", " << p.y << ")\n";
}

int main() {
    Point a;        // default
    Point b(3, 4);  // parameterized
    Point c = b;    // copy
    Point d(b);     // copy
    print(a);
    print(b);
    print(c);
    print(d);
}
```

It prints:

```output
(0, 0)
(3, 4)
(3, 4)
(3, 4)
```

The part after the colon in each constructor is the **member initializer list**. It sets `x` and `y` before the body `{}` runs. The body is empty here, so the list does all the work.

### The default constructor

A **default constructor** takes no arguments. The line `Point a;` calls it, and `a` starts as `(0, 0)`. Think of it as the "I want nothing special" birth.

### The parameterized constructor

A **parameterized constructor** takes values you choose. The line `Point b(3, 4);` passes 3 and 4, so `b` becomes `(3, 4)`. This is the constructor most of your classes need.

### The copy constructor

A **copy constructor** builds a new object from an existing object of the same type. It takes a **const reference** to the source.

A **reference** is another name for an object that already exists. Writing `const Point&` means "a read-only name for an existing Point." The word `const` is a promise that the function will not change the source.

Both `Point c = b;` and `Point d(b);` call the copy constructor. The two spellings mean the same thing here.

::: tip
The copy constructor is also called in three other places: when you pass an object by value to a function, when you return one by value (unless the compiler skips the copy, see the last section), and whenever you start a new object from an old one.
:::

### Trap: copy constructor or copy assignment?

This is the question interviewers like most. Look at the lines below. Only one of them calls the copy constructor.

```cpp
#include <iostream>

struct Point {
    int x, y;
    Point() : x(0), y(0) {}
    Point(int x, int y) : x(x), y(y) {}
    Point(const Point& o) : x(o.x), y(o.y) {}
    Point& operator=(const Point& o) {  // copy assignment
        x = o.x;
        y = o.y;
        std::cout << "assignment\n";
        return *this;
    }
};

int main() {
    Point b(3, 4);
    Point c = b;   // new object: copy constructor
    Point a;
    c = a;         // old object: copy assignment
    std::cout << c.x << " " << c.y << "\n";
}
```

It prints:

```output
assignment
0 0
```

The line `Point c = b;` creates a new object, so it uses the copy constructor. The line `c = a;` assigns to an object that already exists. That is **copy assignment**, which C++ writes as `operator=`. The equals sign looks the same in both cases. What tells them apart is whether the object already exists before the line runs.

### Two more traps

Once you write any constructor yourself, the compiler stops writing the default one. With only `Point(int, int)` declared, the line `Point p;` fails. GCC says:

```output
error: no matching function for call to 'Point::Point()'
```

The fix is to write the default constructor yourself, or to ask for it with `Point() = default;`.

The second trap is the copy constructor's parameter. It must take a reference. If you wrote `Point(Point o)`, making a copy would need a copy constructor call, which needs another copy, and so on forever. GCC refuses:

```output
error: invalid constructor; you probably meant 'Point (const Point&)'
```

### What the compiler writes for you

The compiler writes a **default constructor** only if you declare no constructors at all. It writes a **copy constructor** for you as well, unless you declare a move operation. You will meet move operations soon.

::: answer
**Q61. What is the difference between default, parameterized, and copy constructors?**

A default constructor takes no arguments, and the compiler writes one only if you declare no constructors. A parameterized constructor takes the values you choose. A copy constructor builds a new object from an existing one and takes a const reference to it. Writing `c = a;` on an existing object is copy assignment, not the copy constructor.
:::

## Explicit constructors: when a constructor is a silent conversion

A **conversion** turns a value of one type into a value of another type. The compiler can do this on its own if a constructor takes one argument. That is an **implicit conversion**. Here is the surprise.

```cpp
#include <iostream>

class Array {
public:
    Array(int size) : n(size) {}   // implicit: no keyword
    int n;
};

void print(const Array& a) {
    std::cout << "size " << a.n << "\n";
}

int main() {
    print(10);     // compiles: builds a temporary Array
    Array a = 5;   // compiles too
    std::cout << a.n << "\n";
}
```

It prints:

```output
size 10
5
```

`Array` has a constructor that takes an `int`. Since it is not marked `explicit`, the compiler may use it to turn an `int` into an `Array` whenever it needs one. So `print(10)` quietly builds a temporary `Array` of size 10. A **temporary** is an object with no name, made to hold a value for a moment. Most programmers who write `print(10)` did not mean to build an array. That is usually a bug.

Now mark the constructor `explicit`. The word **explicit** means the constructor can only be called when you name the type yourself.

```cpp
#include <iostream>

class Array {
public:
    explicit Array(int size) : n(size) {}
    int n;
};

void print(const Array& a) {
    std::cout << "size " << a.n << "\n";
}

int main() {
    Array b(5);          // direct initialization: ok
    print(Array(10));    // you asked for it: ok
    std::cout << b.n << "\n";
}
```

It prints:

```output
size 10
5
```

The line `Array b(5);` uses **direct initialization**: the value goes in parentheses. The line `print(Array(10));` names the type, so it is also allowed. The conversion still exists. It just has to be visible in the code.

Two other forms are now refused. The first is `print(10);`, which GCC rejects with:

```output
error: invalid initialization of reference of type
       'const Array&' from expression of type 'int'
```

The second is `Array a = 5;`, which is **copy initialization** (the value follows an equals sign). GCC says:

```output
error: conversion from 'int' to non-scalar type 'Array' requested
```

### The standard library uses both

Look at these three lines from the standard library:

```cpp
std::string s = "hi";                // implicit: fine
std::vector<int> v = 10;             // explicit: error
std::unique_ptr<int> p = new int;    // explicit: error
```

A `std::string` from a string literal is implicit, because the conversion is natural and safe. A `std::vector` from a number is explicit, because `10` could mean "ten elements" or "one element with value ten". A `std::unique_ptr` from a raw pointer is explicit, because taking ownership should always be visible.

The keyword also blocks **list initialization**, which uses braces. For a class with `explicit Point(int, int)`, the line `Point q = {1, 2};` fails. You can also mark a conversion operator explicit, as in `explicit operator bool`.

::: warning
A constructor that takes one argument is a conversion unless you mark it `explicit`. Read your own one-argument constructors and ask: would I want the compiler to call this without asking me?
:::

::: answer
**Q70. What is the difference between `explicit` and implicit constructors?**

An implicit constructor lets the compiler convert a value to your type without being asked, so `print(10)` can build a temporary object. Marking a constructor `explicit` allows it only when you name the type, such as `Array(10)` or `Array b(5)`. Copy initialization with an equals sign and braces are refused. Make single-argument constructors explicit unless the conversion is truly natural, as with a string from a literal.
:::

## Destructors: when an object dies

A **destructor** is a special member function that runs when an object's lifetime ends. Its name is the class name with a tilde in front, like `~Point()`. You write one when the object must clean something up, such as memory or a file handle.

The next program prints a message whenever an object is built or destroyed. It follows every kind of lifetime.

```cpp
#include <iostream>
#include <string>

struct T {
    std::string n;
    T(std::string s) : n(s) { std::cout << "+" << n << ' '; }
    ~T() { std::cout << "-" << n << ' '; }
};

T g("g");                    // global object

int main() {
    T a("a");                // local object in main
    {
        T b("b");            // local object in a smaller scope
    }                        // b dies here
    T* h = new T("h");       // object on the heap
    delete h;                // h dies only here
    T("tmp");                // temporary
}                            // a dies here; g dies after main
```

It prints (one space after each word):

```output
+g +a +b -b +h -h +tmp -tmp -a -g
```

Read it left to right. The global `g` is built before `main` starts. The local `a` is built next. The inner block builds `b`, and the closing brace after it destroys `b` at once. Then `new` builds `h`, and `delete h` destroys it. The line `T("tmp");` creates a temporary, which dies at the semicolon. Then `main` ends, so `a` dies. Finally the global `g` dies after `main` returns.

The rules are these:

- A local object dies at the closing brace of its scope. Locals die in the reverse order of their creation.
- A temporary dies at the end of the **full expression**, the statement that created it.
- A heap object dies only when you call `delete` on its pointer.
- A global or **static** object (one that keeps its value between function calls) dies after `main` returns.

### Inside one object

Destruction inside one object runs in exact reverse of construction. First your destructor body runs. Then the member variables are destroyed in reverse order of declaration. Then the base class destructors run.

A **base class** is a class that another class is built on top of. The class built on top is a **derived class**. The idea is the same as for locals: the last thing built is the first thing destroyed.

### Exceptions and cleanup

An **exception** is a way for code to report a problem by jumping out of the current function. Code that catches it can then continue. When an exception leaves a scope, the program **unwinds the stack**: it destroys each local object on the way out.

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

struct T {
    std::string n;
    T(std::string s) : n(s) { std::cout << "+" << n << ' '; }
    ~T() { std::cout << "-" << n << ' '; }
};

void f() {
    T a("a");
    throw std::runtime_error("oops");
}

int main() {
    try {
        f();
    } catch (const std::exception& e) {
        std::cout << "caught " << e.what() << '\n';
    }
}
```

It prints:

```output
+a -a caught oops
```

The destructor of `a` ran while the exception was leaving `f`. That is the whole reason for a style called **RAII**, which stands for "Resource Acquisition Is Initialization." RAII means that a resource such as memory or a file is owned by an object, so its destructor releases it even when an exception happens. Smart pointers such as `std::unique_ptr` work this way.

Some cases do not run destructors at all. If you `new` an object and never `delete` it, its destructor never runs, and the memory leaks. Calling `std::abort()` ends the program without destroying any locals.

### The trap: deleting through a base pointer

Here is the most common interview trap. A pointer to a base class can point to a derived object. A **virtual function** is a member function marked with the keyword `virtual`, so that a call through a base pointer runs the derived version. The next section explains this fully. For now, know that a class with virtual functions, used through base pointers, is **polymorphic**.

When you `delete` a polymorphic object through a base pointer, the base destructor must be **virtual**. Then the derived destructor runs too. Without it, the program has **undefined behavior**. That means the C++ standard allows any result at all, including a crash, and you must never rely on what happens.

```cpp
#include <iostream>

struct Base {
    ~Base() { std::cout << "~Base\n"; }  // not virtual: a bug
};

struct Derived : Base {
    ~Derived() { std::cout << "~Derived\n"; }
};

int main() {
    Base* p = new Derived;
    delete p;   // undefined behavior
}
```

With GCC this printed only `~Base`, so `~Derived` never ran. Another compiler, or another day, may behave differently. Now add one word:

```cpp
#include <iostream>

struct Base {
    virtual ~Base() { std::cout << "~Base\n"; }  // virtual
};

struct Derived : Base {
    ~Derived() override { std::cout << "~Derived\n"; }
};

int main() {
    Base* p = new Derived;
    delete p;
}
```

It prints:

```output
~Derived
~Base
```

Now the derived part is destroyed first, then the base part, as it should be.

::: warning
A class with any virtual function should have a virtual destructor. Without it, `delete` through a base pointer is undefined behavior.
:::

::: answer
**Q62. When is a destructor called?**

A destructor runs when an object's lifetime ends. A local object is destroyed at the closing brace of its scope, in reverse order of creation. A temporary is destroyed at the end of its full expression. A heap object is destroyed only when you call `delete`, and a global or static object after `main` returns. When an exception unwinds the stack, the locals are destroyed too. Make the destructor virtual in any base class meant for polymorphic use, or deleting through a base pointer is undefined behavior.
:::

## Virtual functions, and why constructors cannot be virtual

To understand this question you need one new idea. A **virtual function** is a member function marked `virtual`. A derived class can replace it. When you call it through a base pointer or base reference, C++ runs the version for the object's real type, not the pointer's type. That choice made at run time is called **dynamic dispatch**.

Here is the first thing to try. Mark a constructor `virtual`:

```cpp
struct Base {
    virtual Base();     // not allowed
    virtual ~Base();    // fine, and often required
};
```

GCC rejects the first line:

```output
error: constructors cannot be declared 'virtual'
```

The reason is a chicken-and-egg problem. Dynamic dispatch works like this. Most compilers give each object of a class with virtual functions a hidden pointer, the **vptr**, which points to a **vtable**. A vtable is a table of the addresses of the class's virtual functions. A virtual call looks up the function through the vptr. But the vptr is set up by the constructor. Before the constructor runs, there is no vptr to look through. Also, when you construct an object, you always name its exact type, so there is nothing to choose at run time anyway.

Destructors are different. The object already exists when its destructor runs, so the destructor can and should be virtual.

### The constructor sets the vptr, one layer at a time

Calling a virtual function inside a constructor is a classic trap. Here is a base constructor that calls a virtual function.

```cpp
#include <iostream>

struct Base {
    Base() { hello(); }
    virtual void hello() { std::cout << "Base\n"; }
};

struct Derived : Base {
    void hello() override { std::cout << "Derived\n"; }
};

int main() {
    Derived d;   // prints Base
}
```

It prints:

```output
Base
```

Here is what happens. Building `d` happens in layers, base first. While the `Base` constructor runs, the vptr points to `Base`'s vtable, because the `Derived` part is not built yet. So the call to `hello` runs `Base::hello`. Only when the `Derived` constructor starts does the vptr switch to `Derived`'s vtable.

```{=latex}
\begin{memdiagram}
\vznote[plain]{2.6,3.7}{step 1: the Base part is being built}
\region[plain]{d1}{-0.4,0.9}{6.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.30,2.95) {d (Derived)};
\widecell[stack]{vp1}{2.6,2.0}{4.6}{}{vptr}
\widecell[data]{vt1}{2.6,-0.5}{4.6}{Base vtable}{hello -> Base::hello}
\draw[vzptr=data] (vp1.south) -- (vt1.north);
\vznote[plain]{9.6,3.7}{step 2: the Derived part starts}
\region[plain]{d2}{6.6,0.9}{6.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (6.70,2.95) {d (Derived)};
\widecell[stack]{vp2}{9.6,2.0}{4.6}{}{vptr}
\widecell[data]{vt2}{9.6,-0.5}{4.6}{Derived vtable}{hello -> Derived::hello}
\draw[vzptr=data] (vp2.south) -- (vt2.north);
\end{memdiagram}
```

The **override** keyword in `Derived` asks the compiler to check that `hello` really replaces a virtual function. Never rely on a virtual call inside a constructor, because during construction it may not reach the most derived class.

### When you want the effect anyway

Sometimes you want a copy of an object without knowing its exact type. The usual answer is a virtual function that makes the copy for you. Each class writes its own version, and each one uses its own copy constructor.

```cpp
#include <iostream>
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual void say() const = 0;
};

struct Circle : Shape {
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);
    }
    void say() const override { std::cout << "circle\n"; }
};

void copyAny(const Shape& s) {
    std::unique_ptr<Shape> copy = s.clone();
    copy->say();
}

int main() {
    Circle c;
    copyAny(c);
}
```

It prints:

```output
circle
```

The function `copyAny` knows only that it has a `Shape`. Yet `s.clone()` makes a `Circle`, the right type, because the call is virtual. The `= 0` makes `clone` a **pure virtual** function, which means each derived class must provide it. The `std::unique_ptr` returned here is one of the smart pointers from an earlier chapter, so the copy is freed automatically.

::: tip
The same idea gives you **virtual factory functions**: a virtual function that creates the right kind of object for the caller.
:::

::: answer
**Q63. Can a constructor be virtual? Why not?**

No. A virtual call looks up the function through the object's vptr, and that pointer is set up by the constructor, so before construction there is nothing to look through. Also, constructing always names the exact type, so there is nothing to choose at run time. If you need the effect, write a virtual `clone()` or factory function. Destructors, on the other hand, should be virtual in a polymorphic base class.
:::

## Lvalues and rvalues

The next question is about move constructors, but you need one idea first. Every **expression** in C++, such as `x` or `x + 1`, has a **value category**. The value category decides what you may do with the expression. You can take its address, assign to it, or steal its resources.

There are two main groups. An **lvalue** is an expression that names an object that lasts beyond the expression. It has an identity, which means it has a stable address that you can take. Think of a named box in a warehouse with a label on it. An **rvalue** is the other group: a value that is not a named, stable object. A temporary is an rvalue. Think of a package that is delivered and will be thrown away after use.

```cpp
#include <iostream>

int arr[3] = {1, 2, 3};
int& at(int i) { return arr[i]; }

int main() {
    int x = 5;
    int* p = &x;     // ok: x is an lvalue, it has an address
    at(0) = 3;       // ok: at(0) returns a reference, an lvalue
    std::cout << *p << " " << arr[0] << "\n";
}
```

It prints:

```output
5 3
```

The variable `x` is an lvalue, so `&x` works. The function `at` returns a reference to an element of `arr`. Because the result is a reference to a stable object, `at(0) = 3` changes `arr[0]`. The number `5` by itself is an rvalue. It has no name and no address, so `&5` is refused:

```output
error: lvalue required as unary '&' operand
```

Likewise `x + 1 = 7;` fails with `error: lvalue required as left operand of assignment`. The sum `x + 1` is a temporary value, and you cannot assign to a temporary.

### What references can bind to

A reference must bind to something of the right kind. The next program shows the rules.

```cpp
#include <iostream>
#include <utility>

int main() {
    int x = 5;
    const int& c = 5;        // ok: const reference binds to rvalue
    int&& d = 5;             // ok: rvalue reference binds to rvalue
    int&& g = std::move(x);  // ok: std::move(x) is an rvalue
    std::cout << c << " " << d << " " << g << "\n";
}
```

It prints:

```output
5 5 5
```

An **rvalue reference**, written `int&&`, binds only to rvalues. The line `int&& d = 5;` is fine because `5` is an rvalue. The line `int&& e = x;` fails:

```output
error: cannot bind rvalue reference of type 'int&&'
       to lvalue of type 'int'
```

An ordinary reference, `int&`, binds only to lvalues. The line `int& b = 5;` fails with `cannot bind non-const lvalue reference`. The exception is a **const** reference, `const int&`, which binds to anything. It also keeps a temporary alive as long as the reference lives. That is why `const int& c = 5;` works.

Why does this matter? An rvalue is a temporary that nobody else can see, or something you marked on purpose with `std::move`. It is safe to steal from. That is the whole basis of moving.

### The full picture

Since C++11 there are three kinds of expression, and two groups built from them. The three kinds are:

```{=latex}
\begin{memdiagram}
\region[stack]{g}{0.0,-0.9}{5.6,2.7}{}
\node[vzregiontitle=stack, anchor=south west] at (0.10,1.85) {glvalue};
\region[ok]{r}{2.6,-0.9}{6.0,2.7}{}
\node[vzregiontitle=ok, anchor=south west] at (2.70,1.85) {rvalue};
\widecell[stack]{lv}{1.2,0}{1.9}{lvalue}{x, at(0)}
\widecell[data]{xv}{4.1,0}{2.2}{xvalue}{std::move(x)}
\widecell[ok]{pv}{7.1,0}{2.2}{prvalue}{5, x + 1}
\vznote[plain]{2.2,-1.6}{has an identity}
\vznote[plain]{6.0,-1.6}{can be moved from}
\end{memdiagram}
```

An **lvalue** has identity and cannot be moved from implicitly. An **xvalue**, such as `std::move(x)`, has identity and can be moved from. It sits in both groups. A **prvalue**, such as `5`, `x + 1`, or `std::string()`, is a pure temporary with no identity. A **glvalue** is anything with identity, so lvalues and xvalues. An **rvalue** is anything that can be moved from, so xvalues and prvalues.

### The trap: a named rvalue reference is an lvalue

This is the favorite interview trap. Look at the function below.

```cpp
#include <iostream>
#include <string>
#include <utility>

struct Noisy {
    Noisy() {}
    Noisy(const Noisy&) { std::cout << "copy\n"; }
    Noisy(Noisy&&) { std::cout << "move\n"; }
};

void take(Noisy&& n) {
    Noisy a = n;             // n has a name: lvalue, so copy
    Noisy b = std::move(n);  // cast to rvalue: move
}

int main() {
    take(Noisy());
}
```

It prints:

```output
copy
move
```

Inside `take`, the parameter's type is `Noisy&&`. But the expression `n` has a name, so it is an lvalue. Using it copies. To move from it, you must call `std::move` again. The type of a variable and the value category of an expression that names it are two different things.

::: answer
**Q67. What are lvalues and rvalues?**

An lvalue is an expression that names a persistent object with an identity, so you can take its address. An rvalue is a temporary, or something marked with `std::move`, and it is safe to move from. A const reference can bind to either. An rvalue reference binds only to rvalues. And a named rvalue reference is itself an lvalue, so you must `std::move` it again to move from it.
:::

## Move constructors

Copying a big object is slow. Imagine a buffer of a million numbers on the heap. A copy allocates a second buffer and copies every number. Yet the original is often about to be thrown away anyway. C++ lets you **move** instead: take over the resources of the old object, and leave it empty. Moving transfers ownership of the heap memory.

A **move constructor** builds a new object by stealing from an rvalue. It is written `T(T&& o)`. The `&&` is the rvalue reference you just learned. The word **noexcept** in the code below is a promise that the function will not throw an exception; we explain it at the end of this section.

A **std::vector** is a standard container, a growable list of items. Here is a small class that owns a heap array, and a vector that holds several of them.

```cpp
#include <cstddef>
#include <iostream>
#include <utility>
#include <vector>

class Buffer {
    int* data;
    std::size_t n;

public:
    Buffer(std::size_t n) : data(new int[n]), n(n) {}
    Buffer(Buffer&& o) noexcept
        : data(std::exchange(o.data, nullptr)),
          n(std::exchange(o.n, 0)) {}
    ~Buffer() { delete[] data; }
    std::size_t size() const { return n; }
};

Buffer make() {
    Buffer t(10);
    return t;
}

int main() {
    Buffer a(1000);
    Buffer b = std::move(a);
    std::cout << a.size() << " " << b.size() << "\n";

    std::vector<Buffer> v;
    v.push_back(Buffer(10));
    Buffer c = make();
    std::cout << v.size() << " " << c.size() << "\n";
}
```

It prints:

```output
0 1000
1 10
```

The class is built around `int* data`, a pointer to a heap array. The constructor `Buffer(std::size_t n)` allocates the array. The vector in `main` shows the move in action.

Here is what the move constructor does to memory. First, `a` owns an array of a thousand ints:

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.0,3.6}{Before: Buffer b = std::move(a);}
\widecell[stack]{a1}{0.1,2.6}{3.2}{a}{data, n = 1000}
\widecell[heap]{h1}{5.0,2.6}{3.2}{}{[ 1000 ints ]}
\ptr[data]{a1.east}{h1.west}
\vznote[plain]{0.1,1.2}{b: (not built yet)}
\end{memdiagram}
```

The move constructor copies the pointer and the size. Then it sets the source's pointer to `nullptr` and its size to 0. Only one owner now points at the array:

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.0,3.6}{After: pointer and size copied, source cleared}
\widecell[stack]{a2}{0.1,2.6}{3.2}{}{a: data = nullptr, n = 0}
\widecell[stack]{b2}{0.1,0.6}{3.2}{}{b: data, n = 1000}
\widecell[heap]{h2}{5.0,0.6}{3.2}{}{[ 1000 ints ]}
\ptr[data]{b2.east}{h2.west}
\vznote[heap]{5.0,-0.2}{owned by b}
\end{memdiagram}
```

The move costs one pointer copy. It allocates nothing, no matter how big the array is. The line `a.size()` now prints 0, because `a` was emptied. The destructor of `a` is still safe: `delete[] nullptr` does nothing.

### When does the move run?

Your code triggers a move in three common ways. You can ask for one with `std::move`, as in `Buffer b = std::move(a);`. A temporary passed to `push_back` is moved into the vector, as in `v.push_back(Buffer(10));`. And a local returned by value is moved, unless the compiler skips the copy completely. You will see that in the last section. Either way, the caller gets the same object.

### Writing it well

Mark the move constructor `noexcept`. When a `std::vector` grows, it moves its elements to the new buffer only if the move cannot throw. If the move might throw and the type can be copied, the vector copies instead, to keep its own guarantees safe.

The `std::exchange(o.data, nullptr)` call does two things at once. It returns the old value of `o.data`, and it stores `nullptr` in `o.data`. That is shorter and harder to get wrong than two separate lines.

The compiler writes a move constructor for you only if you declare none of these: a copy constructor, a copy assignment operator, a move assignment operator, or a destructor. This is the Rule of Five from an earlier chapter, seen from the move side.

::: warning
If your move constructor is not marked `noexcept`, `std::vector` may copy your objects instead of moving them when it grows. The program still works, but it is slower.
:::

::: answer
**Q64. What is a move constructor?**

A move constructor, written `T(T&& o)`, builds a new object by taking the resources of an rvalue. For a class that owns heap memory, it copies the pointer and size, then leaves the source empty and safe to destroy. Nothing is allocated, so the cost does not depend on the size of the data. Mark it `noexcept`, or containers such as `std::vector` will copy instead of moving. The compiler writes it only if you declare no copy operations and no destructor.
:::

## Copying versus moving

Now compare both side by side with a very large vector. The function `keep` is there only to show the two ways of passing an argument.

```cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

void keep(std::string x) {
    std::cout << "got " << x.size() << "\n";
}

int main() {
    std::vector<int> a(1000000, 7);
    std::vector<int> b = a;             // copy: O(n)
    std::vector<int> c = std::move(a);  // move: O(1)
    std::cout << a.size() << " " << b.size() << " "
              << c.size() << "\n";

    std::string s = "a long string, too long for SSO here";
    keep(s);                // lvalue: copied
    keep(std::move(s));     // rvalue: moved
}
```

It prints:

```output
0 1000000 1000000
got 36
got 36
```

The line `std::vector<int> b = a;` allocates a second buffer and copies all one million ints. Copying takes time that grows with the size, written **O(n)** (read "order n"). The line `std::vector<int> c = std::move(a);` allocates nothing and copies only a few pointers. That takes the same time whatever the size, written **O(1)** (read "order one"). So `a` is empty afterward, and `c` holds the million ints.

A **copy** duplicates the resources, so the source is unchanged. A **move** transfers the resources, so the source is left in a **valid but unspecified** state. That phrase means the object is safe to destroy or assign to, but you must not count on its value. After `std::move(a)`, the code above prints 0 for `a.size()`, because that is what the standard library does for vectors. Do not write code that depends on it for other types.

Types that store their data inside the object itself, such as `int` or `std::array`, have nothing to hand over. Moving them is just copying. A `std::string` falls in between. Many standard libraries store very short strings inside the string object itself, a trick called **small string optimization**, or **SSO**. Moving a short string copies its characters. Moving a long string steals its heap buffer. That is why the example uses a long string.

### Who decides: overload resolution

How does C++ choose between copy and move? It uses **overload resolution**, the rule that picks the best of several functions with the same name. The function `keep` takes its argument by value, so it needs a new `std::string`. Passing `s`, an lvalue, selects the copy constructor, because you might still use `s`. Passing `std::move(s)`, an rvalue, selects the move constructor.

The classic trap is moving a `const` object:

```cpp
const std::string k = "another long string here";
std::string t = std::move(k);   // copies, silently
```

`std::move(k)` produces a `const std::string&&`. A move constructor takes a non-const `std::string&&`, and it cannot be used with a const object. The copy constructor takes a `const std::string&`, which can accept it. So the compiler quietly copies. No error is shown, and no move happens.

::: tip
Copy costs O(n) for most containers. Move costs O(1) for `std::vector`, `std::string` (long strings), and `std::unique_ptr`. Each of them owns one heap block that it can hand over.
:::

::: answer
**Q65. What is the difference between copying and moving an object?**

Copying duplicates the resources, usually at O(n) cost, and leaves the source unchanged. Moving transfers the resources, usually at O(1) cost, and leaves the source valid but unspecified, so you may only destroy it or assign a new value. Overload resolution picks the move for rvalues and the copy for lvalues. Remember that `std::move` on a const object still produces a copy.
:::

## What std::move actually does

The name suggests that `std::move` moves something. It does not. It is a cast. Here is the whole idea in one small function, with a name of our own so it does not clash with the real one. The function is a **template**, a pattern that the compiler fills in for each type it is used with. The real `std::move` is a template too.

```cpp
#include <iostream>
#include <type_traits>
#include <utility>

template <class T>
constexpr std::remove_reference_t<T>&& my_move(T&& t) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(t);
}

int main() {
    int x = 7;
    int y = my_move(x);   // same as std::move(x)
    std::cout << y << "\n";
}
```

It prints:

```output
7
```

The body of `my_move` is one line. It is a **static_cast**, a conversion the compiler checks at compile time, to the rvalue reference type. The piece `std::remove_reference_t<T>` removes any `&` from `T`, so the result is a plain rvalue reference. No memory is touched, and no code runs at run time. The function only changes how the compiler sees the expression: from "something you are still using" to "something that may be stolen from".

To prove that the cast alone does nothing, cast a string and print it:

```cpp
#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string a = "hello";
    std::string&& r = std::move(a);   // just a cast
    std::cout << r << '\n';           // still hello

    std::string b = std::move(a);     // move ctor steals
    std::cout << b << ' ' << a.size() << '\n';
}
```

It prints:

```output
hello
hello 0
```

The cast on the first line changed nothing. The string `a` still holds `hello`. The steal happens only on the second line, where the rvalue reaches the string's move constructor. The move constructor empties `a`. This is the chain: `std::move(a)` makes an xvalue, which is an rvalue. Overload resolution then picks the move constructor over the copy constructor. The move constructor does the real work. So `std::move` just enables that choice.

### Three traps

The first trap is returning `std::move` of a local variable:

```cpp
#include <string>
#include <utility>

std::string make() {
    std::string s = "result";
    return std::move(s);   // blocks NRVO
}

int main() {
    std::string r = make();
}
```

GCC with `-Wall` warns:

```output
warning: moving a local object in a return statement prevents
         copy elision [-Wpessimizing-move]
```

The name `s` alone lets the compiler build the result in place, which is faster. Write `return s;`. The compiler knows how to move a local by name without help.

The second trap is moving a `const` object, which silently copies, shown above. The third trap is using an object after it was moved from. Its value is unspecified, so assign it a new value before you read it, or let it be destroyed.

::: answer
**Q66. What does `std::move()` actually do?**

`std::move` does not move anything. It is a static cast to an rvalue reference, and it runs no code. It tells overload resolution that the object may be stolen from. The move constructor or move assignment operator then does the real work. Do not use `std::move` on a const object, because it silently copies. And do not write `return std::move(local);`, because that blocks the compiler's cheaper way of building the return value.
:::

## Perfect forwarding

Now a problem that appears in templates. A template can take an argument and pass it on to another function. The question is how to pass it on without losing whether it was an lvalue or an rvalue.

Here are two overloads of `take`, one that copies and one that moves. A wrapper template passes its argument to `take`.

```cpp
#include <iostream>
#include <string>

void take(const std::string&) { std::cout << "copy\n"; }
void take(std::string&&)      { std::cout << "move\n"; }

template <class T>
void wrapper(T&& arg) {
    take(arg);
}

int main() {
    std::string s = "hi";
    wrapper(s);
    wrapper(std::string("hi"));
}
```

It prints:

```output
copy
copy
```

The second call should move, because the argument is a temporary. But inside `wrapper`, the parameter `arg` has a name, so it is an lvalue. Its rvalue-ness is lost, and `take` copies. The fix is the standard function **std::forward**:

```cpp
#include <iostream>
#include <string>
#include <utility>

void take(const std::string&) { std::cout << "copy\n"; }
void take(std::string&&)      { std::cout << "move\n"; }

template <class T>
void wrapper(T&& arg) {
    take(std::forward<T>(arg));
}

int main() {
    std::string s = "hi";
    wrapper(s);
    wrapper(std::string("hi"));
}
```

It prints:

```output
copy
move
```

Now the caller's choice survives the trip. Perfect forwarding means passing arguments on with their value category intact. It needs two ingredients. The first is a **forwarding reference**: a parameter written `T&&`, where `T` is deduced from the argument. **Deduction** means the compiler works out `T` for you. A forwarding reference accepts both lvalues and rvalues. The second ingredient is `std::forward<T>(arg)`, which casts `arg` back to an rvalue only when the caller passed an rvalue.

### How T remembers the category

How does `T` know? It depends on what you pass. When you pass the lvalue `s`, the compiler deduces `T` as `std::string&`. When you pass a temporary, it deduces `T` as plain `std::string`.

The rule that makes this work is **reference collapsing**. When a reference is made to a reference, the result is simplified: `&` followed by `&` is `&`, `&` followed by `&&` is `&`, and only `&&` followed by `&&` is `&&`. So with an lvalue, `T&&` becomes `std::string&`, and `forward` returns an lvalue. With a temporary, `T&&` becomes `std::string&&`, and `forward` returns an rvalue.

```text
call            T deduced       forward gives
--------------  --------------  -------------
wrapper(s)      std::string&    lvalue: copy
wrapper(temp)   std::string     rvalue: move
```

The category travels inside `T`, so `std::forward` can read it back.

### Where you see it

You meet perfect forwarding every time you construct an object through a library function. The standard `std::make_unique` and `std::vector::emplace_back` both pass their constructor arguments along this way:

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <utility>

template <class T, class... Args>
std::unique_ptr<T> my_make_unique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

int main() {
    auto p = my_make_unique<std::string>(3, 'x');
    std::cout << *p << "\n";
}
```

It prints:

```output
xxx
```

The `Args&&... args` is a **parameter pack**, a list of any number of arguments, and each one is a forwarding reference. The `...` after `std::forward<Args>(args)` passes all of them along.

### The traps

Only a bare `T&&`, with `T` deduced right there, is a forwarding reference. A parameter like `std::vector<int>&&` is an ordinary rvalue reference. So is `const T&&`, because the special rule applies only to a bare `T&&`. Use `std::forward` only once for each argument. Forwarding an rvalue twice can move from it twice.

::: answer
**Q68. What is perfect forwarding?**

Perfect forwarding passes an argument through a template and keeps it an lvalue or an rvalue, exactly as the caller passed it. It needs a forwarding reference, written as a bare `T&&` with `T` deduced, and a call to `std::forward<T>(arg)`. Reference collapsing lets `T` remember the category. It is how `std::make_unique` and `emplace_back` pass constructor arguments on without extra copies. Only a bare `T&&` with `T` deduced counts; `const T&&` and `std::vector<int>&&` do not forward.
:::

## Copy elision and NRVO

The fastest copy is the one that never happens. When a function returns an object by value, the compiler often builds that object directly in the place where the caller wants it. This is **copy elision**: the compiler skips the copy, and the move too. Let us count the constructor calls.

```cpp
#include <iostream>

struct T {
    T()         { std::cout << "ctor\n"; }
    T(const T&) { std::cout << "copy\n"; }
    T(T&&)      { std::cout << "move\n"; }
};

T make()      { return T(); }      // returns a temporary
T makeNamed() { T t; return t; }   // returns a named local

int main() {
    T a = make();
    T b = makeNamed();
}
```

It prints:

```output
ctor
ctor
```

Each `T` prints when it is constructed, a copy, or a move. The function `make` returns a temporary. The function `makeNamed` returns a named local variable. Without elision, each call could build an object, then move it out to the caller. But the output shows only two constructor calls, and no copies or moves at all. Both were elided.

There are two names for this. **RVO**, return value optimization, is elision when a function returns a temporary, as `make` does. **NRVO**, named return value optimization, is elision when a function returns a named local, as `makeNamed` does.

```{=latex}
\begin{memdiagram}
\vznote[plain]{2.0,4.1}{Without NRVO:}
\vznote[plain]{9.6,4.1}{With NRVO:}
\region[plain]{f1}{-0.4,1.4}{4.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.30,3.45) {makeNamed's frame};
\widecell[stack]{t1}{1.6,2.4}{2.4}{}{t: T (built here)}
\region[plain]{m1}{-0.4,-1.6}{4.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.30,0.45) {main's frame};
\widecell[ok]{b1}{1.6,-0.6}{2.4}{}{b: T (moved into)}
\ptrlabel[plain]{t1.south}{b1.north}{move}
\region[plain]{f2}{6.6,1.4}{4.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (6.70,3.45) {makeNamed's frame};
\vznote[plain]{8.6,2.4}{(no t here)}
\region[plain]{m2}{6.6,-1.6}{4.0,2.0}{}
\node[vzregiontitle=plain, anchor=south west] at (6.70,0.45) {main's frame};
\widecell[ok]{b2}{8.6,-0.6}{2.4}{}{b: T (is t)}
\vznote[plain]{8.6,-2.2}{t is built here, in b's own storage}
\end{memdiagram}
```

Naively, `t` is built in the frame of `makeNamed`, then moved into `b`, then destroyed. With NRVO the caller passes the address of `b`'s storage, and `t` is constructed right there. `t` and `b` are the same object, so nothing needs to move.

### Guaranteed in C++17, optional for NRVO

Interviewers want to hear this difference. The next type cannot be copied or moved.

```cpp
struct NoMove {
    NoMove() = default;
    NoMove(const NoMove&) = delete;
    NoMove(NoMove&&) = delete;
};

NoMove f() { return NoMove(); }      // compiles: guaranteed
NoMove g() { NoMove n; return n; }   // NRVO optional: needs a move

int main() {
    NoMove a = f();
    NoMove b = g();
}
```

Returning a temporary compiles, because since C++17 that elision is **guaranteed**. The compiler never even considers a copy or a move. But `g` returns a named local, and NRVO is only allowed, not required. So the compiler must still check that a move or copy constructor is available. Here both are deleted, and GCC reports:

```output
error: use of deleted function 'NoMove::NoMove(NoMove&&)'
```

### When NRVO cannot happen

NRVO usually fails when different paths return different objects. The next example has two locals, and the function may return either one.

```cpp
#include <iostream>
#include <utility>

struct T {
    T()       { std::cout << "ctor\n"; }
    T(const T&) { std::cout << "copy\n"; }
    T(T&&)    { std::cout << "move\n"; }
};

T pick(bool c) {
    T x, y;
    if (c) return x;     // two different objects
    return y;
}

T bad() {
    T t;
    return std::move(t); // blocks NRVO
}

int main() {
    T a = pick(true);
    T b = bad();
}
```

It prints:

```output
ctor
ctor
move
ctor
move
```

In `pick`, the two locals `x` and `y` are built, so two `ctor` lines appear. The function returns `x`, and since two objects compete for one return slot, the compiler cannot elide. It moves `x` out instead, so the output has `move`, not `copy`. In `bad`, the explicit `std::move` makes the return expression something other than the plain name `t`. The compiler is forced to move, even though it could have built `t` in place. So write `return t;` and let the compiler choose.

::: tip
Do not write `return std::move(local);`. Return the local by name, and the compiler either elides the copy or moves it for you.
:::

::: answer
**Q69. What is copy elision, and what is NRVO?**

Copy elision means the compiler builds an object directly where it is needed, so the copy or move is skipped. RVO is elision when a function returns a temporary, and it is guaranteed since C++17. NRVO is elision when a function returns a named local. It is allowed but optional, so the type still needs an accessible move or copy constructor. NRVO usually fails when different paths return different objects. Return a local by name, and never write `return std::move(local);`.
:::

## Chapter summary

- A constructor runs when an object is born. A default one takes no arguments, a parameterized one takes your values, and a copy one takes a const reference to an existing object.
- `c = a;` on an existing object is copy assignment. It does not call the copy constructor.
- An `explicit` constructor is called only when you name the type. An implicit one lets the compiler convert silently, so mark single-argument constructors `explicit` by default.
- A destructor runs when the lifetime ends. Locals die at the end of their scope, temporaries at the end of their full expression, heap objects on `delete`.
- Make the destructor of any polymorphic base class virtual, or deleting through a base pointer is undefined behavior.
- Constructors cannot be virtual, because the vptr that dispatches virtual calls is set up by the constructor. Use a virtual `clone()` or factory function instead.
- An lvalue has identity and a name. An rvalue is a temporary or something marked with `std::move`. A named rvalue reference is itself an lvalue.
- A move constructor, `T(T&&)`, steals resources from an rvalue and leaves the source empty but safe to destroy. Mark it `noexcept`.
- `std::move` is only a cast to an rvalue reference. Perfect forwarding uses a forwarding reference `T&&` and `std::forward<T>`, so arguments keep their category.
- Copy elision builds the result in its final place. RVO is guaranteed in C++17. NRVO is optional, so return locals by name and never with `std::move`.
