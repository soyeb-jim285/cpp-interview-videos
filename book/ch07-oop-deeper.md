# Chapter 7 — Objects Under the Hood

In Chapter 6 you met inheritance and virtual functions. You saw that a
**derived class** is a class built on top of a **base class**, and that a
**virtual function** can be replaced by a derived class. You also saw
constructors and destructors at a basic level.

This chapter goes one step deeper. We will look at how names are chosen,
what happens when things go wrong in a constructor, how objects are copied,
and what the computer actually builds in memory to make virtual functions
work. Each section starts with a small question and ends with an answer you
can say out loud in an interview.

Every example here was compiled with GCC in C++17 mode. When we show output,
it is the real output.

## Overriding and overloading

Two words sound alike: **overloading** and **overriding**. Beginners mix
them up all the time. They are different ideas, and interviewers ask about
the difference because the mix-up is so common.

### Overloading: same name, different parameters

**Overloading** means writing several functions with the same name in the
same scope. The parameter lists must be different, so the compiler can tell
which one you mean.

Think of a kitchen drawer with one label, "spoons", but different spoons for
soup, tea, and dessert. The label is the same. The spoon you pick depends on
what you need.

```cpp
#include <iostream>
#include <string>

void print(int x)                { std::cout << "int " << x; }
void print(double x)             { std::cout << "double " << x; }
void print(const std::string& s) { std::cout << "string " << s; }

int main() {
    print(42);                   std::cout << "\n";
    print(3.14);                 std::cout << "\n";
    print(std::string("hi"));    std::cout << "\n";
}
```

Output:

```output
int 42
double 3.14
string hi
```

The first three lines define three functions called `print`. Each has a
different parameter type, so each is a different **overload**.

The calls in `main` pick the matching version. `42` is an `int`, so the
`int` version runs. `3.14` is a `double`, so the `double` version runs. The
compiler makes this choice while it is compiling, by looking at the argument
types. That is why overloading is called **compile-time** resolution.

The list of parameter types is called the **signature** of a function. The
return type is not part of the choice. This matters for the next example.

```cpp
int    parse(const std::string& s);
double parse(const std::string& s);   // compile error
```

These two lines have the same parameter list. They differ only in the return
type, so the calls `parse(text)` would look identical. The compiler refuses
this code. You cannot overload on return type alone.

::: warning
Overloading does not care about return types. If two functions differ only
in what they return, you get a compile error, not a choice.
:::

### Overriding: a derived class replaces a virtual function

**Overriding** is a different idea. A **derived class** writes its own
version of a **virtual function** from its **base class**. The signature must
match exactly. The derived version replaces the base version for objects of
the derived type.

```cpp
#include <iostream>

struct Base {
    virtual void draw() const { std::cout << "Base\n"; }
    virtual ~Base() = default;
};

struct Derived : Base {
    void draw() const override { std::cout << "Derived\n"; }
};

int main() {
    Derived d;
    Base& b = d;   // b refers to Base, but the object is Derived
    b.draw();      // which draw runs?
}
```

Output:

```output
Derived
```

The variable `b` has the type `Base&`, so you might expect `Base::draw` to
run. But the object is really a `Derived`, and `draw` is virtual. So the
call runs `Derived::draw`.

Line 9 is the key. It writes `Derived` as the type of `d`, and line 10 makes
a `Base` reference point at that same object. The choice of which `draw`
runs is made at **runtime**, when the program runs, because the real type
is only known then. This is **runtime polymorphism**, the same idea from
Chapter 6.

Notice the word `override` after `draw() const`. It is optional, but you
should always write it. It asks the compiler to check that this function
really overrides a base virtual function. If you misspell the name or change
a parameter by mistake, the compiler reports an error instead of silently
creating a new, unrelated function.

::: tip
Always write `override` when you replace a virtual function. It turns a
silent bug into a compile error.
:::

### The trap: a derived name hides base overloads

Here is a trap that mixes both ideas. Suppose the base class has two
overloads, and the derived class adds one of its own.

```cpp
#include <iostream>

struct Base {
    void f(int)    { std::cout << "Base::f(int)\n"; }
    void f(double) { std::cout << "Base::f(double)\n"; }
};

struct Derived : Base {
    // using Base::f;   <- the fix
    void f(int) { std::cout << "Derived::f(int)\n"; }
};

int main() {
    Derived d;
    d.f(2.5);
}
```

Output:

```output
Derived::f(int)
```

You might expect `Base::f(double)` to run, because `2.5` is a `double`. It
does not. When the derived class declares a function named `f`, that name
**hides** every `f` in the base class. The compiler looks only at
`Derived::f`, which takes an `int`. The `2.5` is quietly converted to an
`int`, and `Derived::f(int)` runs.

The fix is one line, the **using declaration** shown in the comment on line 7:

```cpp
using Base::f;   // bring the base overloads back into scope
```

After that, both base overloads and the derived one are visible, and `d.f(2.5)`
picks `Base::f(double)`.

::: warning
Name hiding is a common surprise. If a derived class declares a function with
the same name as a base class function, the base overloads disappear from
view. Add `using Base::f;` when you want them back.
:::

### Side by side

| | Overloading | Overriding |
|---|---|---|
| Where | Same scope | Base and derived class |
| Signature | Parameters must differ | Must match the base exactly |
| Resolved | Compile time | Runtime, through a base pointer or reference |

Overloading lives in one scope, and overriding links a base and a derived
class. Overloading is a compile-time choice. Overriding is a runtime choice.
Only overriding needs `virtual` in the base class.

::: answer
**Q54. What is the difference between overriding and overloading?**

Overloading means several functions with the same name in the same scope,
with different parameter lists. The compiler picks one at compile time by
matching the argument types. Overriding means a derived class replaces a
base class virtual function, with exactly the same signature, and the choice
is made at runtime through a base pointer or reference. Write `override` so
the compiler checks the signature. Watch out for name hiding: a derived name
hides base overloads unless you add `using Base::f;`.
:::

## Why a virtual destructor?

In Chapter 6 you learned that a destructor cleans up an object when it dies.
Now we ask what happens when the object is a derived one, but the pointer
that deletes it has the base type.

### Deleting through a base pointer

A **pointer** holds the address of something. A **heap** is a region of
memory you ask for at runtime with `new`, and you give it back with
`delete`. Objects created with `new` live on the heap until you delete them.

Here is a base class and a derived class that owns a heap array.

```cpp
#include <iostream>

struct Base {
    ~Base() { std::cout << "~Base\n"; }
};

struct Derived : Base {
    int* data = new int[1000];
    ~Derived() {
        std::cout << "~Derived\n";
        delete[] data;
    }
};

int main() {
    Base* p = new Derived;
    delete p;     // Base's destructor is NOT virtual
}
```

Output with GCC:

```output
~Base
```

The `Derived` object has two parts: a `Base` part and a `Derived` part.
The `Derived` part owns an array of 1000 integers on the heap.

```{=latex}
\begin{memdiagram}
\region[stack]{s}{-1.3,0.7}{2.6,2.0}{}
\node[vzregiontitle=stack, anchor=south west] at (-1.20,2.75) {STACK};
\region[heap]{h}{2.2,-1.5}{9.6,4.6}{}
\node[vzregiontitle=heap, anchor=south west] at (2.30,3.15) {HEAP};
\cell[stack]{p}{0,1.5}{Derived* p}{0x5f20}
\region[heap]{o}{2.5,-0.8}{5.0,3.2}{}
\node[vzregiontitle=heap, anchor=south west] at (2.60,2.45) {Derived object};
\widecell[heap]{base}{5.0,1.5}{3.6}{}{Base part}
\widecell[heap]{dpart}{5.0,0.2}{3.6}{}{Derived part}
\widecell[data]{arr}{9.6,0.2}{3.0}{}{[ int x 1000 ]}
\ptr[stack]{p.east}{base.west}
\ptrlabel[data]{dpart.east}{arr.west}{data}
\end{memdiagram}
```

The pointer `p` has type `Base*`. When you write `delete p`, the compiler
looks at the destructor. Since the destructor is not `virtual`, it picks
`Base::~Base` based on the pointer's type alone. It never asks what the object
really is. So `~Derived` never runs, and `delete[] data` never happens. The
1000 integers leak.

Strictly speaking, this is **undefined behavior**. The C++ standard does not
say what must happen, so the program is broken, even if it appears to work.
The output above is what GCC printed. Another compiler could do something
else.

::: warning
Deleting a derived object through a base pointer, when the base destructor is
not virtual, is undefined behavior. In practice the derived destructor is
skipped, and its resources leak.
:::

### The fix: one keyword

Make the base destructor `virtual`:

```cpp
#include <iostream>

struct Base {
    virtual ~Base() { std::cout << "~Base\n"; }
};

struct Derived : Base {
    ~Derived() override { std::cout << "~Derived\n"; }
};

int main() {
    Base* p = new Derived;
    delete p;
}
```

Output:

```output
~Derived
~Base
```

Now `delete p` looks up the real type at runtime, using the virtual
mechanism from Chapter 6. It finds `Derived`, so `~Derived` runs first. Then
`~Base` runs. The order is the reverse of construction: the base was built
first, so it is destroyed last. Everything is cleaned up.

Notice that `Derived`'s destructor does not need the word `virtual`. Once the
base destructor is virtual, the derived one is virtual too. Writing
`override` there is still a good habit, because it asks the compiler to check
the match.

The same problem appears with a `std::unique_ptr<Base>` that holds a
`Derived`. A `unique_ptr` is a **smart pointer** that deletes what it holds
when it goes out of scope. It calls `delete` on a `Base*`, so the same rule
applies.

### The rule

Here is the simple rule you should remember:

```cpp
// A base class that is used polymorphically:
struct Shape {
    virtual void draw() const = 0;
    virtual ~Shape() = default;   // public and virtual
};

// A base class that must never be deleted through a base pointer:
struct Mixin {
protected:
    ~Mixin() = default;           // protected and not virtual
};
```

The first case is the common one. If a class has virtual functions, or you
plan to delete its objects through a base pointer, give it a public virtual
destructor.

The second case is rarer. A protected, non-virtual destructor means nobody
outside the class hierarchy can delete through the base. Trying to do so is a
compile error. This is a good choice for a base class that is only meant to
be inherited.

Classes that are never used as bases do not need a virtual destructor. Adding
one costs a little memory for each object, so do not add it for no reason.

::: tip
`std::shared_ptr` is different. If you create the object with
`std::make_shared<Derived>()` and store it in a `std::shared_ptr<Base>`, the
right destructor runs even without `virtual`. The pointer remembers the real
type when it is created. Do not rely on this. Write a virtual destructor
anyway.
:::

::: answer
**Q55. Why do we need a virtual destructor?**

A virtual destructor makes `delete` on a base pointer run the destructor of
the real, derived object. Without it, deleting a derived object through a base
pointer is undefined behavior, and in practice the derived destructor is
skipped, leaking whatever that class owns. The rule is: a class meant for
polymorphic use gets a public virtual destructor. If the class must never be
deleted through a base pointer, make its destructor protected and non-virtual
instead.
:::

## Constructors that throw

A **constructor** builds an object. An **exception** is the way C++ reports
an error that a function cannot handle in the normal way. You **throw** an
exception, and the program jumps to a matching **catch** block.

A constructor has no return value, so it cannot report failure by returning
a code. Throwing is the normal way to say "I could not build this object."

### What happens to a half-built object

Suppose a `Car` has two parts, an engine and wheels. Its constructor throws
halfway through.

```cpp
#include <iostream>
#include <stdexcept>

struct Part {
    Part(const char* n) { std::cout << "built " << n << "\n"; }
    ~Part()             { std::cout << "destroyed\n"; }
};

struct Car {
    Part engine{"engine"};
    Part wheels{"wheels"};
    Car() { throw std::runtime_error("no fuel"); }
    ~Car() { std::cout << "~Car\n"; }
};

int main() {
    try {
        Car c;
    } catch (const std::exception& e) {
        std::cout << "caught " << e.what() << "\n";
    }
}
```

Output:

```output
built engine
built wheels
destroyed
destroyed
caught no fuel
```

Look at the stages. First, `Car c` starts to be built, and its members are
built in the order they appear. The engine is built, then the wheels. Then
the constructor body runs and throws.

```{=latex}
\begin{memdiagram}
\region[plain]{car}{-0.2,-1.1}{5.4,3.5}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.10,2.45) {Car c, being built};
\widecell[ok]{eng}{2.5,1.6}{4.4}{}{engine: built}
\widecell[ok]{whl}{2.5,0.6}{4.4}{}{wheels: built}
\widecell[bad]{bod}{2.5,-0.4}{4.4}{}{body: throw!}
\end{memdiagram}
```

Now C++ **unwinds** the stack. Unwinding means the program leaves the scope
and destroys everything that was fully built in it. The two members are
destroyed in reverse order: wheels first, then engine. You see two
`destroyed` lines. Then the `catch` block runs.

The important missing line is `~Car`. The `Car` object never finished being
built, so its life never began. Its destructor never runs. Only the parts
that were already complete are cleaned up.

::: tip
Members and base classes that were fully built are always destroyed, in
reverse order of construction. The object that failed to build is not.
:::

### The trap: raw resources leak

This is where things go wrong for real programs. Look at a class that gets
memory from `new` in its constructor.

```cpp
class Widget {
    int* buf;
public:
    Widget() : buf(new int[1000]) {
        connect();      // throws...
    }                   // ...so buf leaks
    ~Widget() { delete[] buf; }
};
```

The constructor allocates `buf`, then calls `connect()`, which throws. The
object never finishes building, so `~Widget` never runs. The array that
`buf` points to is never deleted. That is a **memory leak**: memory that the
program owns but can no longer reach or free.

The fix is the idea called **RAII**, which stands for **Resource Acquisition
Is Initialization**. The name is awkward, but the idea is simple. Keep each
resource in an object that cleans itself up. The cleanup happens when that
object is destroyed, and the member object is destroyed even when the outer
constructor fails.

```cpp
#include <vector>

class Widget {
    std::vector<int> buf;
public:
    Widget() : buf(1000) {
        connect();      // throws...
    }                   // ...and buf is freed automatically
};
```

Now `buf` is a `std::vector`, which owns its memory and frees it in its own
destructor. When `connect` throws, `buf` is a fully built member, so it is
destroyed during unwinding. Nothing leaks, and you wrote no `delete` at all.

::: warning
A constructor that owns a raw pointer from `new` is dangerous. If something
later in the constructor throws, the pointer's memory leaks. Put resources in
members that clean up after themselves, such as `std::vector` or
`std::unique_ptr`.
:::

### Two more facts interviewers like

First, if a constructor throws inside a `new` expression, the memory is freed
for you. Here is the code:

```cpp
Widget* w = new Widget;   // if the constructor throws, the memory
                          // is freed, and w is never assigned
```

The C++ runtime frees the block it allocated for the object. The pointer `w`
is never given a value, because the whole expression failed.

Second, a **function try block** can catch exceptions from a constructor's
member initializer list:

```cpp
struct Car {
    Part engine;
    Car() try : engine("v8") {
        // constructor body
    } catch (...) {
        // log it here
    }   // the exception is rethrown automatically here
};
```

The handler can log the problem or add context, but it cannot swallow the
error. When the handler ends, C++ rethrows the exception. A constructor that
fails must not finish normally, so the caller always finds out.

::: answer
**Q56. What happens when a constructor throws an exception?**

The object is never created, so its destructor does not run. Any members and
base classes that were already fully built are destroyed, in reverse order of
construction. Raw resources, such as memory from `new` allocated in the
constructor body, are not cleaned up, so they leak. The fix is RAII: hold
each resource in a member that manages itself, such as a `std::vector` or a
`std::unique_ptr`. Memory from a `new` expression is freed automatically if
the constructor throws.
:::

## Copy constructor versus copy assignment

Both of these copy one object into another. They look alike, and the
difference is one of the most common interview traps.

### Which one runs?

```cpp
#include <iostream>

struct T {
    T() {}
    T(const T&)            { std::cout << "copy ctor\n"; }
    T& operator=(const T&) {
        std::cout << "copy assign\n";
        return *this;
    }
};

int main() {
    T a;
    T b = a;   // new object
    T c(a);    // new object
    c = b;     // c already exists
}
```

Output:

```output
copy ctor
copy ctor
copy assign
```

Ask one question: does the object on the left already exist? In `T b = a;`,
the object `b` is being created right here. So the **copy constructor** runs.
The same holds for `T c(a);`.

Only `c = b;` calls the **copy assignment operator**, because `c` already
exists and gets a new value. The `=` sign is the same in `T b = a;` and
`c = b;`, but the meaning is different. This is the classic trap.

The copy constructor is written `T(const T&)`. It is a constructor, with no
return type. It takes a **reference** to the object being copied. A reference
is another name for an existing object, written with `&`. The word `const`
promises that the copy will not change the original.

The copy assignment operator is written `T& operator=(const T&)`. The name
`operator=` is how C++ lets you define what `=` means for your class. It
returns `T&`, a reference to the object on the left, so you can chain
assignments like `a = b = c;`.

### Why assignment does more work

Creating a new object is easy, because the new object owns nothing yet.
Assignment is harder, because the target already owns something. Let's use a
class that owns a heap array.

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.0,3.9}{BEFORE: b = a;}
\cell[stack]{a1}{0,2.9}{a.data}{0x300}
\arraycells[heap]{A1}{3.5,2.9}{7,8,9}{}
\ptr[data]{a1.east}{A1-0.west}
\cell[stack]{b1}{0,1.5}{b.data}{0x100}
\arraycells[heap]{B1}{3.5,1.5}{1,2}{}
\ptr[data]{b1.east}{B1-0.west}
\vznote[plain]{1.0,0.6}{AFTER: b = a;}
\cell[stack]{a2}{0,-0.5}{a.data}{0x300}
\arraycells[heap]{A2}{3.5,-0.5}{7,8,9}{}
\ptr[data]{a2.east}{A2-0.west}
\cell[stack]{b2}{0,-1.9}{b.data}{0x500}
\arraycells[heap]{B2}{3.5,-1.9}{7,8,9}{}
\ptr[data]{b2.east}{B2-0.west}
\vznote[bad]{4.6,-2.9}{[ 1 2 ] at 0x100 has been deleted}
\end{memdiagram}
```

Here is the code that does that work:

```cpp
Buffer& operator=(const Buffer& o) {
    if (this == &o) return *this;          // self-assignment check
    int* fresh = new int[o.n];             // 1. make a new copy
    std::copy(o.data, o.data + o.n, fresh);
    delete[] data;                         // 2. free the OLD array
    data = fresh;                          // 3. point at the new one
    n = o.n;
    return *this;
}
```

The steps are:

1. Make a fresh copy of the other object's data. Do this first, so that if
   `new` fails, the target is still intact.
2. Delete the old array. Without this step, the old memory leaks.
3. Point the target at the fresh copy.

The line `if (this == &o)` handles **self-assignment**, which is the case
`b = b;`. Here `this` is a **pointer** to the current object, and `&o` is the
address of the other object. If they are the same object, there is nothing to
do. Without the check, step 2 would delete the array, and step 3 would copy
from memory that was just freed.

A copy constructor never needs this. The new object has no old data to
release, and it cannot be assigned to itself because it does not exist yet.

::: warning
A copy assignment operator must do three jobs: release the old state, copy
the new state, and handle `b = b`. A copy constructor only copies. Forgetting
the first or third job is a common bug.
:::

### Side by side

| | Copy constructor | Copy assignment |
|---|---|---|
| Signature | `T(const T&)` | `T& operator=(const T&)` |
| Called when | A new object is created from another | An existing object gets another's value |

The copy constructor runs for `T b = a;`, `T b(a);`, and when an existing
object is passed by value to a function. Copy assignment runs only for `b = a;`
with `b` already existing. The constructor has no old resources to release.
Assignment must release them and handle self-assignment. The constructor has
no return value. Assignment returns `*this` by reference.

If your class needs one of these, it almost always needs the other too. That
idea leads to the Rule of Three in the next section.

::: answer
**Q57. What is the difference between a copy constructor and copy assignment operator?**

The copy constructor creates a new object from an existing one, so it runs
for `T b = a;` and `T b(a);`. Copy assignment overwrites an object that
already exists, so it runs for `b = a;` when `b` was already created. The
assignment operator must release the old resources, copy the new ones, handle
self-assignment, and return `*this` by reference. The copy constructor has no
old state to deal with. Remember that `T b = a;` is construction, not
assignment, even though it uses the equals sign.
:::

## The Rule of Three, Five, and Zero

Chapter 6 introduced the **destructor**. In this chapter we meet several more
**special member functions**. These are functions the compiler may write for
you if you do not write them: the destructor, the two copy functions, and two
**move** functions that we will meet shortly. The three rules tell you which
of them to write yourself.

### The bug: a destructor and no copy constructor

Here is a class that owns memory.

```cpp
class Buffer {
    int* data;
public:
    Buffer(int n) : data(new int[n]) {}
    ~Buffer() { delete[] data; }
    // no copy constructor written
};

int main() {
    Buffer a(3);
    Buffer b = a;   // copies the pointer
}                   // ~b runs, then ~a
```

`Buffer a(3);` allocates an array of three integers and stores its address in
`data`. Then `Buffer b = a;` runs. Nobody wrote a copy constructor, so the
compiler writes one. The compiler's version copies each member one by one.
That copies the pointer, not the array. Now both `a.data` and `b.data` point
to the same heap block.

```{=latex}
\begin{memdiagram}
\region[stack]{s}{-1.3,-0.9}{2.6,2.9}{}
\node[vzregiontitle=stack, anchor=south west] at (-1.20,2.05) {STACK};
\region[heap]{h}{2.4,-0.6}{3.0,2.4}{}
\node[vzregiontitle=heap, anchor=south west] at (2.50,1.85) {HEAP};
\cell[stack]{a}{0,1.0}{}{a.data}
\cell[stack]{b}{0,-0.2}{}{b.data}
\widecell[heap]{arr}{3.9,0.4}{2.2}{}{int[3]}
\ptr[stack]{a.east}{arr.west}
\ptr[stack]{b.east}{arr.west}
\end{memdiagram}
```

At the end of `main`, `b` is destroyed first. Its destructor runs
`delete[]` on the shared block. Then `a` is destroyed. Its destructor runs
`delete[]` on the same block again. That is a **double delete**, and it is
undefined behavior. Usually it crashes.

The fix is to tell the compiler how to copy. The copy must allocate its own
array. That is a **deep copy**. The opposite, copying just the pointer, is a
**shallow copy**.

### The Rule of Three

Here is the **Rule of Three**: if your class needs a custom destructor, a
custom copy constructor, or a custom copy assignment operator, it almost
always needs all three.

```cpp
class Buffer {
    int* data;
    int n;
public:
    Buffer(int n) : data(new int[n]), n(n) {}

    ~Buffer();                          // 1. destructor
    Buffer(const Buffer&);              // 2. copy constructor
    Buffer& operator=(const Buffer&);   // 3. copy assignment
};
```

The reason is that all three deal with the same resource. If the destructor
frees the memory, the copy must make its own memory, or two objects will free
the same block. If the copy assignment is written, it must free the old memory
as well. The three functions have to agree.

The copy functions must make a deep copy, with their own new array, just like
the assignment shown earlier.

### The Rule of Five

C++11 added **move** operations. A **move** takes the resources from an
object that is about to disappear, instead of copying them. It is like moving
house: you carry the furniture, rather than buying a copy of every chair.

A **move constructor** and a **move assignment operator** take an
**rvalue reference**, written `&&`. You can think of that as a reference to
an object that is temporary or about to be thrown away, so it is safe to
steal its contents. Here are the full five:

```cpp
class Buffer {
    int* data;
    int n;
public:
    Buffer(int n) : data(new int[n]), n(n) {}

    ~Buffer();                              // 1. destructor
    Buffer(const Buffer&);                  // 2. copy constructor
    Buffer& operator=(const Buffer&);       // 3. copy assignment

    Buffer(Buffer&&) noexcept;              // 4. move constructor
    Buffer& operator=(Buffer&&) noexcept;   // 5. move assignment
};
```

The **Rule of Five** says: if you write one of these five, consider writing
all five. The move functions just steal the pointer and leave the other
object empty, so no copy and no new memory are needed.

There is a trap here. Once you declare a destructor or a copy operation, the
compiler stops writing the move operations for you. Any move your class
needs then silently falls back to a copy. Writing a custom destructor is
enough to lose the automatic moves.

::: tip
`std::move(x)` does not move anything. It is a cast that tells the compiler
"treat `x` as temporary, so a move is allowed." The real work is done by the
move constructor or move assignment operator.
:::

### The Rule of Zero

The best approach is the **Rule of Zero**. Do not manage the raw resource
yourself. Store it in a member that already manages itself, such as a
`std::vector` or a `std::unique_ptr`. Then you write none of the five
functions.

```cpp
#include <utility>
#include <vector>

class Buffer {
    std::vector<int> data;
public:
    Buffer(int n) : data(n) {}
    // no destructor, no copy, no move written
};

int main() {
    Buffer a(3);
    Buffer b = a;              // deep copy, done by vector
    Buffer c = std::move(a);   // cheap move, done by vector
}
```

The compiler writes the copy and move functions for `Buffer`. Each one calls
the `vector`'s own copy or move, and those are already correct. The `vector`
allocates its own memory, frees it in its destructor, and copies deeply. So
`Buffer` gets all of that for free.

In an interview, say this: prefer the Rule of Zero. Use the Rule of Five only
for a class whose whole job is to own a raw resource. Most classes you write
should follow the Rule of Zero.

::: answer
**Q58. What is the Rule of Three, Five, and Zero?**

The Rule of Three says: if you write a destructor, a copy constructor, or a
copy assignment operator, you almost always need all three, because they
manage the same resource. The Rule of Five adds the move constructor and move
assignment operator from C++11, which steal resources instead of copying
them. Writing a destructor or copy operation stops the compiler from
generating the moves, so they must be written too. The Rule of Zero is the
best choice: hold resources in members such as `std::vector` or
`std::unique_ptr`, and write none of the five functions.
:::

## The diamond problem

So far, each class had one base class. C++ also allows **multiple
inheritance**, where a class has two or more base classes. That power brings
a problem called the **diamond problem**.

### The shape

Here is a base class called `Device`, and two classes that inherit from it.

```cpp
struct Device { int id = 0; };

struct Scanner : Device {};
struct Printer : Device {};

struct Copier : Scanner, Printer {};
```

A `Copier` is both a scanner and a printer, so it inherits from both. Draw the
arrows, and you get a diamond.

```{=latex}
\begin{memdiagram}
\node[vzcell=plain, minimum width=5.0cm] (dev) at (2.5,3.0) {Device (int id)};
\node[vzcell=plain, minimum width=2.2cm] (sc) at (0.8,1.4) {Scanner};
\node[vzcell=plain, minimum width=2.2cm] (pr) at (4.2,1.4) {Printer};
\node[vzcell=plain, minimum width=2.4cm] (co) at (2.5,-0.2) {Copier};
\draw[vzptr=plain] (sc.north) -- (dev.south -| sc);
\draw[vzptr=plain] (pr.north) -- (dev.south -| pr);
\draw[vzptr=plain] (co.north west) -- (sc.south);
\draw[vzptr=plain] (co.north east) -- (pr.south);
\end{memdiagram}
```

The problem is hidden inside that shape. `Device` is reached twice, once
through `Scanner` and once through `Printer`.

### Two copies of Device

With ordinary inheritance, each path brings its own base class. So one
`Copier` object contains two separate `Device` parts. Each one has its own
`id`.

```{=latex}
\begin{memdiagram}
\region[plain]{co}{-0.4,0.2}{5.8,3.8}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.30,4.05) {Copier object};
\widecell[plain]{sp}{2.5,2.5}{4.6}{Scanner part}{Device part: id = 0}
\widecell[plain]{pp}{2.5,0.9}{4.6}{Printer part}{Device part: id = 0}
\end{memdiagram}
```

Now try to use the `id`:

```cpp
Copier c;
c.id = 5;   // compile error: 'id' is ambiguous
```

The compiler cannot know which `id` you mean. There are two of them. So it
refuses the code. You can name the path, with `c.Scanner::id = 5;`, which
compiles. But that sets only one of the two copies, and the two can drift
apart.

The same ambiguity happens when you try to convert a `Copier*` to a `Device*`.
The compiler cannot choose which `Device` part to use.

::: warning
With two paths to one base, you get two base copies. The result is ambiguous
names and conversions, and sometimes two values that should be one.
:::

### The fix: virtual inheritance

The fix is **virtual inheritance**. You add the word `virtual` to the
inheritance from the shared base.

```cpp
#include <iostream>

struct Device { int id = 0; };

struct Scanner : virtual Device {};
struct Printer : virtual Device {};

struct Copier : Scanner, Printer {};

int main() {
    Copier c;
    c.id = 5;   // ok: there is one shared Device
    std::cout << c.id << "\n";
}
```

Output:

```output
5
```

With `virtual`, `Scanner` and `Printer` share a single `Device`. The final
`Copier` object holds exactly one `Device` part, and both the `Scanner` and
`Printer` parts refer to it.

```{=latex}
\begin{memdiagram}
\region[plain]{cp}{-0.4,0.9}{4.4,3.2}{}
\node[vzregiontitle=plain, anchor=south west] at (-0.30,4.15) {Copier object (simplified)};
\widecell[plain]{sp}{1.8,3.1}{3.4}{}{Scanner part}
\widecell[plain]{pp}{1.8,1.7}{3.4}{}{Printer part}
\widecell[data]{dev}{7.4,2.4}{3.4}{}{Device: id = 5}
\ptr[data]{sp.east}{dev.west}
\ptr[data]{pp.east}{dev.west}
\end{memdiagram}
```

Now `c.id` is not ambiguous. There is only one place it can be. The cost is a
little extra work. The compiler cannot fix the position of the shared `Device`
inside the object, so it finds it through a pointer or an offset at runtime.

### Who builds the shared base?

A classic follow-up question: who constructs the shared base class? Let's
give `Device` a constructor that takes an `int`.

```cpp
#include <iostream>

struct Device {
    int id;
    Device(int i) : id(i) {}
};

struct Scanner : virtual Device {
    Scanner() : Device(1) {}
};

struct Printer : virtual Device {
    Printer() : Device(2) {}
};

struct Copier : Scanner, Printer {
    Copier() : Device(3) {}   // the most derived class builds it
};

int main() {
    Copier c;
    std::cout << "c.id == " << c.id << "\n";
}
```

Output:

```output
c.id == 3
```

The rule is this: with a virtual base class, the **most derived class**
constructs the shared base directly. Here the most derived class is `Copier`,
so its line `Device(3)` is the one that counts. The `Device(1)` in `Scanner`
and the `Device(2)` in `Printer` are ignored when `Copier` is built.

`Scanner` and `Printer` still write their own `Device(...)` calls. That is
because each one can also be built on its own, as a complete object, and then
its call is used.

If `Copier` did not name `Device` in its initializer list, the compiler would
need a default constructor for `Device`. This class has none, so the code
would fail to compile.

::: answer
**Q59. What is the diamond problem in multiple inheritance?**

The diamond problem happens when a class inherits from the same base class
through two different paths. With ordinary inheritance, the object gets two
separate copies of that base, so names like `c.id` become ambiguous, and
conversions to the base are ambiguous too. Virtual inheritance fixes this by
sharing a single copy of the base between the paths. The most derived class
is the one that constructs that shared base.
:::

## vtables and vptrs

Chapter 6 and this chapter showed what virtual functions do. We end with how
they are usually built. The C++ standard does not require any particular
method. But almost every real compiler uses the same design, and interviewers
like to ask about it.

### One hidden pointer, one table per class

Two terms first. A **vtable**, short for "virtual table," is an array of
function pointers. A **function pointer** holds the address of a function.
Each class with virtual functions gets one vtable. A **vptr**, short for
"virtual pointer," is a hidden pointer stored inside each object of such a
class. It points to the vtable of the object's class.

Here is an example:

```cpp
struct Shape {
    virtual double area() const { return 0; }
    virtual void draw() const {}
    virtual ~Shape() = default;
};

struct Circle : Shape {
    double r = 1;
    double area() const override { return 3.14 * r * r; }
};

Shape* s = new Circle;
s->area();   // calls Circle::area
```

`Shape` has virtual functions, so the compiler builds one vtable for it. It
also builds one for `Circle`. The `Circle` table has one entry for each
virtual function, in a fixed order. `Circle` overrides `area`, so its entry
for `area` points to `Circle::area`. It does not override `draw`, so that
entry points to `Shape::draw`.

When you write `new Circle`, the object gets a vptr. The constructor sets it
to point at `Circle`'s vtable. The `r` member sits beside it.

```{=latex}
\begin{memdiagram}
\region[heap]{obj}{-0.4,0.45}{3.4,2.4}{}
\node[vzregiontitle=heap, anchor=south west] at (-0.30,2.90) {Circle object (on the heap)};
\widecell[heap]{vp}{1.3,2.0}{2.6}{}{vptr}
\widecell[heap]{rr}{1.3,1.0}{2.6}{}{r = 1}
\vcells[data]{vt}{6.5,2.4}{area: Circle::area,draw: Shape::draw,destructor: \textasciitilde{}Circle}{Circle's vtable}
\ptr[data]{vp.east}{vt-0.west}
\end{memdiagram}
```

Real vtables usually hold a little extra data too, such as type information.
The idea is the same. The vptr finds the right table, and the table finds
the right function.

### What s->area() becomes

Look at `s->area()` from the code above. The compiler sees that `s` is a
`Shape*`. It does not know the real type, which could be `Circle` or
something else. But it knows that `area` always sits at the same position in
the vtable. So it can compile the call in three steps.

1. Load the vptr from the object that `s` points to.
2. Read the function pointer in the slot for `area` in that vtable.
3. Call through that function pointer.

Whatever the object really is, its own vtable leads the call to the correct
override. That is **virtual dispatch**: choosing the function to call at
runtime, by looking it up through the object.

### The costs

Every object of a polymorphic class carries the extra vptr, so the object gets
bigger. Let's measure it:

```cpp
#include <iostream>

struct Plain   { int x; };
struct Virtual { int x; virtual void f() {} };

int main() {
    std::cout << sizeof(Plain) << ' ' << sizeof(Virtual) << "\n";
}
```

Output on a typical 64-bit GCC build:

```output
4 16
```

`Plain` holds one `int`, so it takes 4 bytes. `Virtual` holds the same `int`,
plus an 8-byte vptr. That is 12 bytes, and the compiler pads it to 16 so the
object lines up correctly in memory. Your numbers may differ on another
platform, but the vptr always adds to the size.

Each virtual call also takes an extra step, the pointer load, and an indirect
jump. It is usually slower than a direct call. The compiler can often skip the
lookup when it knows the exact type, but not when the call goes through a
base pointer.

There is one more classic follow-up. Inside a base class constructor, the vptr
still points to the base class's vtable. So a virtual call made inside a base
constructor runs the base version, not the derived one. The derived part of
the object does not exist yet. The derived vptr is set only when the derived
constructor starts.

::: tip
The vtable is one per class, shared by all its objects. The vptr is one per
object. Only the vptr costs memory per object.
:::

::: answer
**Q60. What are vtables and vptrs, and how are they typically used to implement virtual dispatch?**

A vtable is an array of function pointers, one for each class with virtual
functions. A vptr is a hidden pointer in each object, set by its constructor
to point at its class's vtable. To call a virtual function through a base
pointer, the program loads the vptr from the object, reads the function
pointer in the fixed slot for that function, and calls it. This lets the
right override run for the real type, at runtime. The standard does not
require this design, but most compilers use it.
:::

## Chapter summary

- **Overloading** is several functions with the same name and different
  parameters, chosen at compile time. **Overriding** is a derived class
  replacing a base virtual function with the same signature, chosen at
  runtime.
- Always write `override`. A derived name hides base overloads, so add
  `using Base::f;` when you need them.
- Deleting a derived object through a base pointer needs a **virtual
  destructor**. Without it, the derived destructor is skipped: undefined
  behavior.
- A throwing constructor never finishes the object, so its destructor does
  not run. Fully built members are destroyed in reverse order.
- Raw resources in a constructor leak if it throws. Use RAII members such as
  `std::vector`.
- `T b = a;` is copy construction. `b = a;` is copy assignment, which must
  release old state and handle `b = b`.
- Rule of Three: if you write a destructor, copy constructor, or copy
  assignment, write all three. Rule of Five adds the two moves.
- Rule of Zero: hold resources in `std::vector` or `std::unique_ptr`, and
  write none of the five.
- Virtual inheritance makes two paths to one base share a single base
  object, and the most derived class constructs it.
- A **vtable** is one table per class of function pointers. A **vptr** in
  each object points to it, and a virtual call goes through the vptr.
