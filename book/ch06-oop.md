# Chapter 6 — Thinking in Objects

Earlier chapters gave you the basic tools: `struct` and `class`, memory, pointers, and smart pointers. This chapter uses them to think about a program as a set of **objects**. The style of programming that does this is called **object-oriented programming**, or **OOP** for short.

OOP questions come up in almost every C++ interview. Interviewers ask for the "four pillars", the difference between two words that sound alike, and what a "pure virtual function" is. These answers only make sense once you have seen the code behind them. So we build each idea from a small program that you can compile and run.

Every code sample in this chapter is a complete program. You can save one as `main.cpp` and build it with the command below.

::: tip
Build and run a program from a terminal:

```bash
g++ -std=c++17 main.cpp -o main
./main
```
:::

## Building blocks

Some small words come first. Each one is short, and each one comes back in the bigger sections.

### Classes and objects

A **class** is a blueprint. It describes the data a thing holds and the actions it can take. An **object** is a real thing made from that blueprint. One blueprint can make many objects, just as one house plan can build many houses.

Here is a small class:

```cpp
#include <iostream>

class Counter {
public:
    int value = 0;   // a data member: each object has its own
};

int main() {
    Counter a;       // one object
    Counter b;       // another object, from the same blueprint
    a.value = 5;     // the dot reaches a member of the object
    std::cout << a.value << ' ' << b.value << '\n';
}
```

Output:

```output
5 0
```

Walk-through:

- `#include <iostream>` brings in `std::cout`, which sends text to the screen. The `<<` operator sends each value to it.
- `class Counter { ... };` defines the blueprint. Do not forget the semicolon after the closing brace.
- **public** means that code outside the class may use the members that follow it.
- `int value = 0;` is a **data member**: a variable that belongs to each object.
- `Counter a;` builds one object. `Counter b;` builds a second, separate one.
- `a.value = 5;` changes only `a`. The dot (`.`) reaches a member of an object. That is why `b.value` is still `0`.

### Member functions and private data

A **member function** is a function that belongs to a class. Inside it, the object's own data can be used by name. A member can also be **private**, which means only the class's own member functions may use it. Code outside the class is blocked.

A **const member function** is one that promises not to change the object. You write `const` after the parameter list. The compiler checks the promise for you.

```cpp
#include <iostream>

class Counter {
public:
    void increment() { value = value + 1; }
    // const: does not change the object
    int get() const { return value; }
private:
    // private: hidden from outside
    int value = 0;
};

int main() {
    Counter c;
    c.increment();
    c.increment();
    std::cout << c.get() << '\n';
    // c.value = 100;   // error: 'value' is private
}
```

Output:

```output
2
```

Walk-through:

- `increment()` is a member function. It uses `value` by name, because `value` belongs to the same object.
- `get()` returns the value. The `const` after its parameter list says it leaves the object alone.
- `private:` hides `value`. The line `c.value = 100;` is commented out, because it does not compile. Hiding data like this is the heart of encapsulation (question 47).

### Constructors and destructors

Every object is created at one moment and destroyed at another. Two special member functions handle those moments.

A **constructor** runs automatically when an object is created. It has the same name as the class, and no return type. Its job is to set the object up, so that it starts out in a valid state.

A **destructor** runs automatically when an object is destroyed. Its name is the class name with a tilde (`~`) in front. It takes no arguments. Its job is to clean up, for example by releasing memory the object owns.

```cpp
#include <iostream>
#include <string>

class Robot {
public:
    Robot(std::string n) : name(n) {       // constructor
        std::cout << name << " powers on\n";
    }
    ~Robot() {                             // destructor
        std::cout << name << " powers off\n";
    }
private:
    std::string name;
};

int main() {
    std::cout << "start\n";
    {
        Robot r("R2");                     // constructor runs here
        std::cout << "working\n";
    }                                      // destructor runs here
    Robot* p = new Robot("R3");            // constructor runs here
    delete p;                              // destructor runs here
    std::cout << "end\n";
}
```

Output:

```output
start
R2 powers on
working
R2 powers off
R3 powers on
R3 powers off
end
```

Walk-through:

- `Robot(std::string n) : name(n)` is the constructor. `std::string` is the C++ type for text. The part after the colon is the **member initializer list**. It sets `name` before the body runs.
- The body prints a message. You can put any setup code here.
- `~Robot()` is the destructor. It prints a message when the object dies.
- The braces `{ ... }` make a **scope**: a block that ends at the closing brace. `r` is born at its opening line and destroyed at the closing brace. That is why "R2 powers off" comes before "R3".
- `new Robot("R3")` builds an object on the **heap**, the memory area that lives until you free it, and returns a pointer to it. A closing brace does not destroy heap objects. Only `delete` does, and it runs the destructor first. A smart pointer does this `delete` for you.

::: warning
If you write no constructor, the compiler writes a simple one for you. The same is true for the destructor. You will often see `= default` after a destructor, as in `virtual ~Shape() = default;`. It means "write the usual, empty one for me". The word `virtual` is explained in question 51. It matters when you delete a derived object through a base pointer. Without a virtual destructor, that delete is **undefined behavior**: the program may do anything, including crash.
:::

### Base and derived classes

A **base class** is a class that other classes are built on. A **derived class** is a class built from a base class. We write `class Dog : public Animal` to say "Dog is derived from Animal". A dog is an animal, so we say that a Dog **is-a** Animal. Question 48 covers this in full.

### References

A **reference** is another name for an existing object. It does not make a copy.

```cpp
#include <iostream>

int main() {
    int n = 1;
    int& r = n;     // r is another name for n
    r = 7;          // changes n too
    std::cout << n << '\n';
}
```

Output:

```output
7
```

Walk-through:

- `int& r = n;` makes `r` a second name for the same `int`. The `&` after the type is what makes it a reference.
- `r = 7;` writes to the object that both names share, so `n` becomes `7`.
- A `const` reference, such as `const int& view = n;`, is a name you may read but not change. Function parameters often use this form.

### Virtual and override, in one line each

The word **virtual** on a member function of a base class says: a derived class may replace this function, and a call made through a base pointer or reference should run the object's real version. The word **override** on a derived class's function says: "I am replacing a base version." The compiler checks that the base version exists. Question 51 shows both in code.

## The four pillars of OOP

People call the four big ideas of OOP the **pillars** of OOP. The pillars are ideas, not keywords. Each one is a way to make code safer, simpler, or easier to extend.

- **Encapsulation** keeps data together with the code that changes it, and hides the data.
- **Abstraction** shows what an object does, and hides how it does it.
- **Inheritance** builds a new class on top of an existing one, so the new class reuses it. The relationship is is-a.
- **Polymorphism** lets one call behave differently, depending on the real type of the object.

Think of a car. You steer with a wheel and pedals. That is the simple surface, which is abstraction. The engine sits under the hood, and you cannot reach in and change the fuel mix with your hand. That is encapsulation. A sports car is still a car, so it reuses the car design. That is inheritance. "Drive" works for any car, and each one does it in its own way. That is polymorphism.

Here is all four in one small program:

```cpp
#include <iostream>

class Shape {                                  // abstraction
public:
    virtual double area() const = 0;           // WHAT, not HOW
    virtual ~Shape() = default;
};

class Circle : public Shape {                  // inheritance
    // encapsulation: hidden
    double r;
public:
    explicit Circle(double radius) : r(radius > 0 ? radius : 0) {}
    double area() const override { return 3.14159 * r * r; }
};

class Square : public Shape {
    double side;
public:
    explicit Square(double s) : side(s) {}
    double area() const override { return side * side; }
};

void report(const Shape& s) {                  // polymorphism
    std::cout << s.area() << '\n';
}

int main() {
    report(Circle(1));
    report(Square(2));
}
```

Output:

```output
3.14159
4
```

Walk-through:

- `Shape` says that every shape has an `area`. It does not say how to compute it. The `= 0` makes `area` **pure virtual**: `Shape` has no body for it, and each derived class must supply one. Question 52 covers this.
- `Circle` keeps its radius in `r`, which is private. Code outside the class cannot set `r` to minus five.
- The constructor uses `?:`, the conditional operator. `radius > 0 ? radius : 0` means "radius if it is positive, otherwise zero". So a `Circle` is always valid.
- **explicit** stops the compiler from turning a plain number into a `Circle` without you asking.
- `Circle` and `Square` both derive from `Shape`. Each one is a `Shape`.
- `report` takes any `Shape` through a **reference**, here a `const` one, so it reads the object without copying it. Its call `s.area()` runs the circle formula for the circle, and the square formula for the square.

Add a `Triangle` tomorrow, and `report` does not change at all.

::: answer
**Q46. What are the four pillars of OOP?**

The four pillars are encapsulation, abstraction, inheritance, and polymorphism. Encapsulation bundles data with the functions that change it and hides the data. Abstraction shows what an object does and hides how it does it. Inheritance lets a derived class reuse a base class, in an is-a relationship. Polymorphism gives one interface many behaviors, chosen by the actual object.
:::

## Encapsulation and abstraction

These two ideas get mixed up all the time, because both are about hiding things. The difference is what they hide, and why. **Encapsulation** is about protecting data. **Abstraction** is about hiding complexity from the user.

### Encapsulation: the object guards its data

Think of a bank account. The balance should change only through deposits and withdrawals, never by someone writing a number on the card. Encapsulation makes this true in code.

```cpp
#include <iostream>
#include <stdexcept>

class Account {
    double balance = 0;                     // private: hidden data
public:
    void deposit(double amt) {
        if (amt <= 0) throw std::invalid_argument("bad amount");
        balance += amt;
    }
    double getBalance() const { return balance; }
};

int main() {
    Account acc;
    acc.deposit(50);                        // the only way in
    std::cout << acc.getBalance() << '\n';
    // acc.balance = -1000;   // error: 'balance' is private
}
```

Output:

```output
50
```

Walk-through:

- `balance` has no `public:` in front of it, so it is private. In a `class`, members are private until you say otherwise.
- `deposit` is a public function. It is the only door into `balance`.
- `throw std::invalid_argument(...)` means "stop here and report an error". So a zero or negative deposit is rejected before it can damage the balance.
- `getBalance() const` lets code read the balance, but not change it.
- The commented line `acc.balance = -1000;` would not compile. The object guards its own rules, and nobody outside can break them.

### Abstraction: show what, hide how

Think of a TV remote. You press Power, and the TV turns on. You do not need to know how the TV's power circuit works. The remote gives you a simple surface, and the details stay hidden. That is abstraction in everyday life.

In C++, you build abstraction with an abstract class that lists the actions, and derived classes that supply the details.

```cpp
#include <iostream>
#include <string>

class Storage {                              // WHAT you can do
public:
    virtual void save(const std::string& data) = 0;
    virtual ~Storage() = default;
};

class DiskStorage : public Storage {         // one HOW
public:
    void save(const std::string& data) override {
        std::cout << "disk saves: " << data << '\n';
    }
};

void backup(Storage& s) {                    // knows only the WHAT
    s.save("report");
}

int main() {
    DiskStorage d;
    backup(d);
}
```

Output:

```output
disk saves: report
```

Walk-through:

- `Storage` lists one action, `save`. It has no body, so the details are left to others. Question 53 explains what makes this an abstract class.
- `DiskStorage` gives one way to do the save. A database or a cloud version could be written the same way.
- `backup` takes a `Storage&`. It calls `save` and does not know, or care, where the data goes.
- `d` is passed to `backup` as a `Storage&`. That works because a `DiskStorage` is a `Storage`.

You already use abstraction every day in C++. When you call `push_back` on a `std::vector`, you do not think about how the vector grows its memory.

### Side by side

| | Encapsulation | Abstraction |
|---|---|---|
| Goal | Protect data and rules | Reduce complexity for the user |
| Hides | Internal state | Implementation details |
| Question | Who may touch this data? | What does this do? |
| Works at | Inside a class | Design and interfaces |
| Tools | `private`, `protected`, member functions | Abstract classes, clear APIs |
| Example | Private `balance` | `Storage::save()` |

The two work together. Encapsulation is one of the ways to get abstraction. Hiding the balance behind `deposit` also gives a simple surface to the user.

::: answer
**Q47. What is the difference between encapsulation and abstraction?**

Encapsulation protects data: it keeps the data private and lets only the class's own functions change it, so the object can enforce its rules. Abstraction hides complexity: it exposes what an object can do through a simple interface, and hides how it does it. Encapsulation is about the inside of a class, and abstraction is about the outside view. Encapsulation is one way to get abstraction.
:::

## Inheritance

**Inheritance** lets one class, the **derived class**, take on everything that another class, the **base class**, has. You do not write that code twice. The derived class can also add its own members.

### The basic idea

```cpp
#include <iostream>

class Animal {
public:
    void eat() { std::cout << "eating\n"; }
protected:
    int age = 0;                       // protected: see below
};

class Dog : public Animal {            // Dog IS-A Animal
public:
    void bark() { std::cout << "woof at " << age << '\n'; }
};

int main() {
    Dog d;
    d.eat();     // inherited from Animal
    d.bark();    // Dog's own
}
```

Output:

```output
eating
woof at 0
```

Walk-through:

- `Animal` is the base class. `Dog` is derived from it, with `class Dog : public Animal`.
- `d.eat()` works even though `Dog` never mentions `eat`. The function came from `Animal`.
- **protected** means: hidden from outside code, but visible to derived classes. So `bark` can read `age`, and `main` cannot.
- `d.bark()` runs the function that only `Dog` has.

### The types by structure

People list inheritance types in two ways. The first is by **structure**: how the classes are linked. Each shape below is a common pattern. The arrows point from the derived class to its base.

- **Single**: one derived class has one base. `Dog` from `Animal` is single.
- **Multilevel**: a chain. `Puppy` derives from `Dog`, which derives from `Animal`.
- **Multiple**: one class has two or more bases at once. C++ allows this. Java does not allow it for classes.
- **Hierarchical**: several classes share the same base, such as `Dog` and `Cat`, both from `Animal`.
- **Hybrid**: a mix of two or more of the above. Its famous problem is the diamond, shown below.

Here are the first four in one program:

```cpp
#include <iostream>

class Animal {                             // the base
public:
    void eat() { std::cout << "eat\n"; }
};

class Dog : public Animal {                // single: Dog from Animal
public:
    void bark() { std::cout << "woof\n"; }
};

// multilevel: Puppy -> Dog -> Animal
class Puppy : public Dog {
public:
    void yip() { std::cout << "yip\n"; }
};

// hierarchical: Cat also from Animal
class Cat : public Animal {
public:
    void meow() { std::cout << "meow\n"; }
};

class Printer {
public:
    void print() { std::cout << "print\n"; }
};

class Scanner {
public:
    void scan() { std::cout << "scan\n"; }
};

// multiple: two bases
class Copier : public Printer, public Scanner {
};

int main() {
    Puppy p;
    p.eat();     // from Animal, through Dog
    p.bark();    // from Dog
    p.yip();     // Puppy's own

    Cat c;
    c.meow();

    Copier k;
    k.print();
    k.scan();
}
```

Output:

```output
eat
woof
yip
meow
print
scan
```

Walk-through:

- `Puppy` builds on `Dog`, so it has `bark` and `eat` too. That is a chain of three classes.
- `Cat` and `Dog` both come from `Animal`. Two derived classes from one base is hierarchical.
- `Copier` has two bases, `Printer` and `Scanner`, so it has both `print` and `scan`. That is multiple inheritance.

### Hybrid: the diamond problem

Now suppose a `Copier` is both a `Scanner` and a `Printer`, and both of those are `Device`s. Here is the shape:

```{=latex}
\begin{memdiagram}
\cell[plain]{dev}{3,3.0}{}{Device}
\cell[plain]{sc}{0.5,1.4}{}{Scanner}
\cell[plain]{pr}{5.5,1.4}{}{Printer}
\cell[plain]{co}{3,-0.2}{}{Copier}
\draw[draw=vzplain, line width=0.9pt] (dev.south) -- (sc.north);
\draw[draw=vzplain, line width=0.9pt] (dev.south) -- (pr.north);
\draw[draw=vzplain, line width=0.9pt] (sc.south) -- (co.north);
\draw[draw=vzplain, line width=0.9pt] (pr.south) -- (co.north);
\end{memdiagram}
```

Without special care, the `Copier` would contain two separate `Device` parts, one from each side. Then `c.id` would be ambiguous: which `id` do you mean? The fix is **virtual inheritance**, which says that both sides share one single base part.

```cpp
#include <iostream>

struct Device { int id = 0; };
struct Scanner : virtual Device {};
struct Printer : virtual Device {};
struct Copier : Scanner, Printer {};

int main() {
    Copier c;
    c.id = 7;      // OK: there is only one shared Device
    std::cout << c.id << '\n';
}
```

Output:

```output
7
```

Walk-through:

- `struct Device` has an `id`. `struct` is used here so that members are public by default.
- `Scanner : virtual Device` and `Printer : virtual Device` both inherit from `Device` virtually. This is the word that makes them share one copy.
- `Copier : Scanner, Printer` gets both bases. There is one `Device` inside it.
- Without `virtual`, `c.id` would not compile. The compiler would say the name is ambiguous.

### The types by access mode

The second way to group inheritance is by **access mode**. The access word sits right after the colon, and it controls how the base's public and protected members appear in the derived class.

- `public` inheritance keeps public members public. This is the normal is-a relationship.
- `protected` inheritance makes public and protected members protected.
- `private` inheritance makes everything private. It is used for "implemented in terms of", not is-a.

In every case, the base's **private** members stay hidden from the derived class.

```cpp
#include <iostream>

class Base {
public:
    int pub = 1;
protected:
    int prot = 2;
private:
    // never accessible in a derived class
    int priv = 3;
};

class A : public Base {};          // pub: public,    prot: protected
class B : protected Base {};       // pub: protected, prot: protected
class C : private Base {};         // pub: private,   prot: private

struct D : Base {};                // struct: public by default
class E : Base {};                 // class: private by default

int main() {
    A a;
    // OK: public through public inheritance
    std::cout << a.pub << '\n';
    // a.prot = 6;                 // error: protected
    // B b; b.pub = 1;             // error: now protected
    // C c; c.pub = 1;             // error: now private

    D d;
    std::cout << d.pub << '\n';    // OK: struct inherits publicly
    // E e; e.pub = 1;             // error: class inherits privately
}
```

Output:

```output
1
1
```

Walk-through:

- `A` inherits publicly, so `a.pub` is public and usable from `main`.
- `a.prot` is commented out. `prot` is protected, so only `A` and classes derived from `A` can use it.
- `B` and `C` change the access of `pub` to protected and private. That is why `b.pub` and `c.pub` would fail.
- `priv` is never usable from a derived class, whatever the access mode.
- `D` is a `struct`, so its base is public by default. `E` is a `class`, so its base is private by default. Hence `e.pub` would fail.

::: warning
Forgetting the word `public` is a classic bug. `class Dog : Animal` silently means private inheritance. Then outside code cannot call `eat` on a `Dog`, and the code fails to compile in a confusing way. Always write `public` when you mean is-a.
:::

::: answer
**Q48. What is inheritance? Explain its different types.**

Inheritance lets a derived class reuse everything in a base class, and public inheritance models an is-a relationship. By structure, there are single, multilevel, multiple, and hierarchical inheritance. Hybrid inheritance mixes these, and it can cause the diamond problem, which virtual inheritance solves. By access mode, the base is inherited as public, protected, or private, and a base's private members are never accessible to the derived class.
:::

## Polymorphism

**Polymorphism** comes from two Greek words: *poly*, meaning many, and *morph*, meaning forms. In C++, it means one interface that works with many types, where the behavior depends on the actual type of the object.

C++ has two kinds. Let's start with the one that changes while the program runs.

### Runtime polymorphism: virtual functions

Here a `Dog` and a `Cat` both say something, but a single loop can handle both. The loop holds them as one common type, `Animal`.

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Animal {
    virtual void speak() const { std::cout << "...\n"; }
    virtual ~Animal() = default;
};

struct Dog : Animal {
    void speak() const override { std::cout << "Woof\n"; }
};

struct Cat : Animal {
    void speak() const override { std::cout << "Meow\n"; }
};

int main() {
    std::vector<std::unique_ptr<Animal>> zoo;
    zoo.push_back(std::make_unique<Dog>());
    zoo.push_back(std::make_unique<Cat>());
    for (const auto& a : zoo) a->speak();
}
```

Output:

```output
Woof
Meow
```

Walk-through:

- A **vector**, written `std::vector`, is a list that can grow. It comes from `<vector>`.
- `std::unique_ptr` is the smart pointer from the earlier chapter. It owns an object and deletes it when it goes away.
- `std::make_unique<Dog>()` makes a `Dog` on the heap and gives back a `unique_ptr` to it. Pushing it into `zoo` stores it there.
- `zoo` holds `unique_ptr<Animal>`. Each element is a pointer to some `Animal`, which may really be a `Dog` or a `Cat`.
- `for (const auto& a : zoo)` runs its body once for each item. `auto` lets the compiler work out the type. `a` is a `const` reference to one pointer.
- `a->speak()` is the key line. The loop does not know which animal it has. Each object runs its own `speak`.

If you later add a `Cow`, this loop works unchanged.

### Compile-time polymorphism: overloads and templates

C++ also has polymorphism that is decided before the program runs. It has two tools.

**Function overloading** means two or more functions share one name, but take different parameters. The compiler picks the right one from the argument types.

A **template** is one piece of code with a placeholder type, written `typename T`. The compiler makes a separate version for each real type you use.

```cpp
#include <iostream>

int add(int a, int b) { return a + b; }
double add(double a, double b) { return a + b; }

template <typename T>
T biggest(T a, T b) { return a > b ? a : b; }

int main() {
    std::cout << add(1, 2) << '\n';           // picks the int version
    // picks the double version
    std::cout << add(1.5, 2.5) << '\n';
    std::cout << biggest(3, 7) << '\n';       // makes biggest<int>
    std::cout << biggest('a', 'z') << '\n';   // makes biggest<char>
}
```

Output:

```output
3
4
7
z
```

Walk-through:

- Two `add` functions share a name. Calls with `int`s use the first, and calls with `double`s use the second.
- `T` is a placeholder for a type. `biggest(3, 7)` makes `T` into `int`, and `biggest('a', 'z')` makes it into `char`.
- `a > b ? a : b` is the conditional operator: it gives `a` if the test is true, otherwise `b`.
- Operator overloading, which you may meet later, uses the same idea.

### The trap: slicing

Runtime polymorphism only works through a pointer or a reference. If you copy the object into a base-type variable, something is lost.

```cpp
#include <iostream>

struct Animal {
    virtual void speak() const { std::cout << "...\n"; }
    virtual ~Animal() = default;
};

struct Dog : Animal {
    void speak() const override { std::cout << "Woof\n"; }
};

// copies only the Animal part
void byValue(Animal a)      { a.speak(); }
void byRef(const Animal& a) { a.speak(); }   // keeps the real type

int main() {
    Dog d;
    byValue(d);
    byRef(d);
}
```

Output:

```output
...
Woof
```

The copy in `byValue` looks like this:

```{=latex}
\begin{memdiagram}
\vcells[data]{d}{0,1.2}{Animal part,Dog part}{d (a Dog)}
\vcells[stack]{a}{5.6,1.2}{Animal part}{a inside byValue (an Animal)}
\ptr[stack]{d-0.east}{a-0.west}
\vznote[plain]{2.8,1.5}{copy}
\vznote[bad]{5.6,0.1}{the Dog part is gone}
\end{memdiagram}
```

Walk-through:

- `byValue(Animal a)` makes a new `Animal` and copies only the `Animal` part of `d`. The `Dog` part is cut off. This is **slicing**.
- Inside `byValue`, `a.speak()` calls the `Animal` version, so it prints `...`.
- `byRef(const Animal& a)` does not copy. The name `a` still refers to the whole `Dog`, so `speak` finds the `Dog` version, and it prints `Woof`.
- For runtime polymorphism, the base function must be `virtual`, the derived function must have the same signature, and you must call through a pointer or reference.

::: answer
**Q49. What is polymorphism?**

Polymorphism means one interface with behavior chosen by the actual type of the object. In C++, runtime polymorphism uses virtual functions called through a base pointer or reference, so each object runs its own version. Compile-time polymorphism uses function overloading and templates, which the compiler resolves before the program runs. Passing a derived object by value into a base type slices it, so use pointers or references.
:::

## Compile-time vs runtime polymorphism

Both kinds let one piece of code work with many types. The difference is **when** the decision is made. Compile-time polymorphism is decided by the compiler, before the program runs. Runtime polymorphism is decided while the program runs.

### The same idea, written both ways

Here is compile-time polymorphism. `Dog` and `Cat` do not share a base class. A template works with both.

```cpp
#include <iostream>

struct Dog {
    void speak() const { std::cout << "Woof\n"; }
};

struct Cat {
    void speak() const { std::cout << "Meow\n"; }
};

template <typename T>
void talk(const T& a) {
    a.speak();                // fixed for each T
}

int main() {
    talk(Dog{});              // the compiler makes talk<Dog>
    talk(Cat{});              // the compiler makes talk<Cat>
}
```

Output:

```output
Woof
Meow
```

Walk-through:

- `Dog{}` and `Cat{}` are objects built with empty braces, which is an easy way to make a temporary object.
- `talk` is a template. The compiler writes a separate `talk` for `Dog` and another for `Cat`.
- Each call is wired directly to the right `speak`. The compiler knows the type, so it knows the function.

Now the runtime version. Here one `talk` takes any `Animal`:

```cpp
#include <iostream>
#include <memory>
#include <string>

struct Animal {
    virtual void speak() const = 0;
    virtual ~Animal() = default;
};

struct Dog : Animal {
    void speak() const override { std::cout << "Woof\n"; }
};

struct Cat : Animal {
    void speak() const override { std::cout << "Meow\n"; }
};

void talk(const Animal& a) {
    a.speak();                // looked up at runtime
}

int main() {
    std::string input = "dog";    // pretend the user typed this
    std::unique_ptr<Animal> pet;
    if (input == "dog")
        pet = std::make_unique<Dog>();
    else
        pet = std::make_unique<Cat>();

    talk(*pet);               // Dog or Cat? Decided now.
}
```

Output:

```output
Woof
```

Walk-through:

- `Animal` has a pure virtual `speak`, so `Animal` itself cannot be built. Only `Dog` and `Cat` can.
- The choice of `pet` depends on `input`. The compiler cannot know it ahead of time.
- `*pet` turns the `unique_ptr` into a plain `Animal` object, and `talk` takes it by reference.
- `a.speak()` picks `Woof` or `Meow` while the program runs. If `input` held `"cat"`, the output would be `Meow`.

### What happens at runtime

Runtime polymorphism needs a small lookup. The compiler builds a table of function pointers for each class with virtual functions. This table is called the **vtable** (virtual table). Each object stores a hidden pointer to its class's vtable, called the **vptr** (virtual pointer).

```{=latex}
\begin{memdiagram}
\cell[stack]{pet}{0,1.2}{pet}{0x500}
\vcells[data]{obj}{3.6,1.2}{vptr,(Dog's data)}{Dog object}
\vcells[data]{vt}{8.2,1.2}{speak}{Dog's vtable}
\ptr[stack]{pet.east}{obj-0.west}
\ptr[stack]{obj-0.east}{vt-0.west}
\end{memdiagram}
```

To call `pet->speak()`, the program follows `pet` to the object, loads its `vptr`, finds the `speak` slot in the table, and calls the function there. That is one extra step compared with a plain call, and it usually stops the compiler from inlining the call. (**Inlining** means the compiler pastes the function's body straight into the caller.) A template cannot do this, because a template needs the type at compile time.

### Side by side

Some books call compile-time binding **static binding** or **early binding**, and runtime binding **dynamic binding** or **late binding**. "Binding" just means connecting a call to the function it runs. Compile-time polymorphism can cause **code bloat**, which means the final program holds many near-identical copies of the same code.

| | Compile-time | Runtime |
|---|---|---|
| Decided | When compiling | While the program runs |
| Mechanism | Overloading, templates, operators | Virtual functions through a base pointer or reference |
| Also called | Static, early binding | Dynamic, late binding |
| Call cost | Direct call, can be inlined | Indirect call through the vtable |
| Flexibility | Types must be known at compile time | Type can be chosen at runtime |
| Downsides | Code bloat, slower builds | Small overhead, needs pointers or references |

::: tip
Interview answer in one breath: use compile-time polymorphism when the types are known while you write the code, and runtime polymorphism when the type is only known while the program runs.
:::

::: answer
**Q50. What is the difference between compile-time and runtime polymorphism?**

Compile-time polymorphism is resolved by the compiler, through overloading and templates, so it has no runtime lookup and calls can be inlined. Runtime polymorphism is resolved while the program runs, through virtual functions called via a base pointer or reference. The compiler uses a vtable, so each call goes through one extra lookup. Use runtime polymorphism when the type is only known at runtime, and templates when it is known at compile time.
:::

## Virtual functions

A **virtual function** is a member function whose version is chosen by the object's real type, not by the type of the pointer used to call it. The choice happens at runtime. One experiment shows the difference.

### Virtual versus non-virtual

```cpp
#include <iostream>

struct Base {
    void hello()         { std::cout << "Base hello\n"; }
    virtual void greet() { std::cout << "Base greet\n"; }
    virtual ~Base() = default;
};

struct Derived : Base {
    void hello()          { std::cout << "Derived hello\n"; }
    void greet() override { std::cout << "Derived greet\n"; }
};

int main() {
    Derived d;
    Base* p = &d;       // a Base pointer to a Derived object
    p->hello();         // non-virtual: the pointer's type decides
    p->greet();         // virtual: the object's real type decides
}
```

Output:

```output
Base hello
Derived greet
```

Walk-through:

- `Base` has two functions. Only `greet` is `virtual`.
- `Derived` redefines both. For `greet`, it uses `override` to say so.
- `Base* p = &d;` points a `Base` pointer at a `Derived` object. The `&` gives the address of `d`.
- `p->hello()` is not virtual, so the compiler uses the pointer's type, `Base`. It prints `Base hello`.
- `p->greet()` is virtual, so the call is decided at runtime by the real object, which is a `Derived`. It prints `Derived greet`.

### How it works: the vtable

The C++ standard does not say how virtual calls must be done. In practice, the common compilers all use the vtable scheme from question 50.

```{=latex}
\begin{memdiagram}
\cell[stack]{p}{0,1.2}{p (Base*)}{\&d}
\vcells[data]{d}{3.6,1.2}{vptr,(other members)}{d (a Derived)}
\vcells[data]{vt}{8.2,1.2}{greet,\textasciitilde{}Derived}{Derived's vtable}
\ptr[stack]{p.east}{d-0.west}
\ptr[stack]{d-0.east}{vt-0.west}
\end{memdiagram}
```

A virtual call follows `p` to the object. It loads the `vptr` from the object, finds the `greet` slot in the table, and calls whatever is stored there. For a `Derived` object, that slot holds `Derived::greet`. For a `Base` object, it would hold `Base::greet`.

### Two classic traps

```cpp
#include <iostream>

struct Base {
    // calls init from the constructor
    Base() { init(); }
    virtual void init() { std::cout << "Base::init\n"; }
    virtual void run(int) {}
    virtual ~Base() = default;
};

struct Derived : Base {
    void init() override { std::cout << "Derived::init\n"; }
    // void run(long) override {}   // error: nothing to override
};

int main() {
    Derived d;
}
```

Output:

```output
Base::init
```

Walk-through:

- The `Derived` object is built in two steps. First the `Base` part is built, and while it runs, the object is still only a `Base`.
- So the `init()` call inside `Base`'s constructor goes to `Base::init`, not to `Derived::init`. This is the first trap: do not rely on virtual calls inside a constructor.
- `Derived::init` is never run here. The program prints only `Base::init`.
- The second trap is a signature mismatch. A function's **signature** is its name and parameter types. `Base::run` takes an `int`, and `Derived` tries to override it with a `long`. Without `override`, the code still compiles, because the new function is simply a different function. With `override`, the compiler reports an error. That is why you should always write `override`.

::: warning
Always write `override` on a derived class's virtual function. It turns a silent mistake, such as a wrong parameter type or a misspelled name, into a compile error.
:::

::: answer
**Q51. What is a virtual function?**

A virtual function is a member function whose version is chosen at runtime, based on the object's real type, when it is called through a base pointer or reference. The compiler normally uses a vtable and a vptr to do this. Write `override` on the derived version so the compiler checks it. A virtual call made inside a constructor does not reach the derived class, because the derived part does not exist yet.
:::

## Pure virtual functions

A **pure virtual function** is a virtual function declared with `= 0` at the end. It means: every concrete derived class must provide this function.

### Declaring one

```cpp
#include <iostream>

class Shape {
public:
    virtual double area() const = 0;   // pure virtual
    virtual ~Shape() = default;
};

class Circle : public Shape {
    double r;
public:
    explicit Circle(double radius) : r(radius) {}
    double area() const override { return 3.14159 * r * r; }
};

int main() {
    // Shape s;                        // error: abstract class
    Circle c(2.0);
    std::cout << c.area() << '\n';
}
```

Output:

```output
12.5664
```

Walk-through:

- `= 0` at the end of `area` says that `Shape` has no sensible way to compute an area. Every shape has one, but the base cannot say how.
- Because of that, `Shape` is an **abstract class**: it cannot be created. The commented line `Shape s;` would fail with an error. Question 53 covers abstract classes in full.
- `Circle` overrides `area`, so `Circle` is **concrete**: it can be created.
- `c.area()` returns 3.14159 times 2 times 2, which is about 12.5664. `cout` prints six significant digits.

### The obligation passes down

```cpp
#include <iostream>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
    double r;
public:
    explicit Circle(double radius) : r(radius) {}
    double area() const override { return 3.14159 * r * r; }
};

class Polygon : public Shape {          // no area(): still abstract
public:
    int sides() const { return n; }
protected:
    int n = 0;
};

int main() {
    // Polygon p;                       // error: still abstract
    // OK: a pointer to an abstract type
    Shape* ptr = new Circle(1.0);
    std::cout << ptr->area() << '\n';   // runs Circle::area
    delete ptr;
}
```

Output:

```output
3.14159
```

Walk-through:

- `Polygon` derives from `Shape` but does not override `area`. So `Polygon` inherits the pure virtual function without a body, and stays abstract. `Polygon p;` would fail.
- `Shape* ptr = new Circle(1.0);` is allowed, because a pointer to an abstract class is fine. The object on the heap is a `Circle`, which is concrete.
- `ptr->area()` runs `Circle::area`, through the pointer.
- `delete ptr;` frees the heap object. Because `Shape` has a virtual destructor, this is safe.

### A surprise: a pure virtual can have a body

```cpp
#include <iostream>
#include <string>

class Logger {
public:
    virtual void log(const std::string& m) = 0;   // pure virtual
    // pure virtual destructor
    virtual ~Logger() = 0;
};

void Logger::log(const std::string& m) {           // a body for it
    std::cout << "default: " << m << '\n';
}

// a body is required
Logger::~Logger() {}

class FileLogger : public Logger {
public:
    void log(const std::string& m) override {
        // reuse the default
        Logger::log(m);
    }
};

int main() {
    FileLogger f;
    f.log("hello");
}
```

Output:

```output
default: hello
```

Walk-through:

- `log` is pure virtual, but `Logger::log` still gets a body, written outside the class. A derived class can call it on purpose, as `Logger::log(m)` does here.
- The destructor is pure virtual too. A pure virtual destructor **must** have a body, because every derived destructor calls it. Leave it out, and the program fails at link time, with an error that says the destructor is undefined. **Linking** is the last build step, where the compiled pieces are joined together.
- `Logger` stays abstract, because `log` is still pure. `FileLogger` provides `log`, so it is concrete.

::: tip
The body of a pure virtual function is a shared default. It is not a way to skip overriding. The derived class still has to write its own version, or call the default by name.
:::

::: answer
**Q52. What is a pure virtual function?**

A pure virtual function is a virtual function declared with `= 0`. It means that derived classes must provide an implementation to become concrete. A class with a pure virtual function is abstract and cannot be instantiated. A pure virtual function can still have a body, which derived classes may call explicitly. A pure virtual destructor must have a body, or the program will not link.
:::

## Abstract classes

An **abstract class** is a class that has at least one pure virtual function. You cannot create objects of it directly. But an abstract class is not empty. It can hold data, a constructor, and normal functions.

### An abstract class with real content

Here is a complete program. It defines an abstract class, two concrete classes that derive from it, and a `main` that uses them.

```cpp
#include <iostream>
#include <string>
#include <utility>

class Employee {                          // abstract
public:
    explicit Employee(std::string n) : name(std::move(n)) {}
    virtual ~Employee() = default;

    virtual double pay() const = 0;       // the missing piece
    void printSlip() const {              // shared, concrete
        std::cout << name << ": " << pay() << '\n';
    }
protected:
    std::string name;                     // real data
};

class Manager : public Employee {
public:
    using Employee::Employee;             // use the base constructor
    double pay() const override { return 9000; }
};

class Intern : public Employee {
public:
    using Employee::Employee;
    double pay() const override { return 1500; }
};

int main() {
    // Employee e("Ann");               // error: abstract class
    Manager m("Bo");
    Intern  i("Cy");
    m.printSlip();
    i.printSlip();
}
```

Output:

```output
Bo: 9000
Cy: 1500
```

Walk-through:

- `Employee` has a constructor, a data member `name`, and a normal function `printSlip`. Only `pay` is missing.
- `pay` is pure virtual, because the base class cannot know how each kind of employee is paid. That single missing function makes the whole class abstract.
- `explicit Employee(std::string n) : name(std::move(n))` sets the name. `std::move` lets the constructor take over the string's contents, instead of copying them.
- `Employee e("Ann");` is commented out, because the compiler rejects it.
- `Manager` and `Intern` each supply `pay`, so they are concrete. `using Employee::Employee;` lets them be built with the same constructor as `Employee`.
- `printSlip` is shared code. It calls `pay()`, which runs the right version for each object. The output shows `9000` and `1500`.

Shared logic with one missing step is a well-known design, called the **template method** pattern. The base class fixes the steps, and the derived classes fill in the gaps.

### Interfaces

When a class has only pure virtual functions and no data, it works as an **interface**: a list of what the object must be able to do. C++ has no `interface` keyword. An abstract class plays that role.

```cpp
#include <iostream>
#include <vector>

struct Drawable {                         // a pure interface
    virtual void draw() const = 0;
    virtual ~Drawable() = default;
};

struct Circle : Drawable {
    void draw() const override { std::cout << "circle\n"; }
};

struct Square : Drawable {
    void draw() const override { std::cout << "square\n"; }
};

void render(const std::vector<const Drawable*>& items) {
    for (const Drawable* d : items) d->draw();
}

int main() {
    Circle c;
    Square s;
    render({&c, &s});
}
```

Output:

```output
circle
square
```

Walk-through:

- `Drawable` has one pure virtual function and no data. It is an interface.
- `Circle` and `Square` each provide `draw`.
- `render` takes a list of pointers to anything `Drawable`. It does not know the real types.
- `{&c, &s}` builds the list. The `&` gives the address of each object, and each address converts to a `const Drawable*`.

Here is a common follow-up question: can an abstract class have a constructor? Yes. `Employee` has one. It runs whenever a derived object is built.

::: warning
An abstract class can be used only through a pointer or a reference, or as a base class. Writing `Employee e;` is an error, and passing an abstract class by value is also an error. Code that needs a value should use a concrete derived class.
:::

::: answer
**Q53. What is an abstract class?**

An abstract class has at least one pure virtual function, so it cannot be instantiated directly. It can still have data members, constructors, and normal member functions, which derived classes inherit. You use an abstract class through pointers or references. Derived classes override the pure virtual functions to become concrete. A class with only pure virtual functions and no data is called an interface.
:::

## Chapter summary

- OOP organizes a program around objects, which bundle data with the functions that work on it.
- Constructors set up an object when it is created. Destructors clean up when it dies.
- Encapsulation protects data and rules. Abstraction hides complexity behind a simple interface.
- Inheritance reuses a base class. Public inheritance means is-a. Watch out for the diamond problem.
- Polymorphism gives one interface many behaviors. Compile-time uses overloads and templates; runtime uses virtual functions.
- A virtual function is chosen by the object's real type, through a vtable. Always write `override`.
- A pure virtual function (`= 0`) makes a class abstract. A pure virtual destructor must still have a body.
- Pass derived objects by pointer or reference, never by value into a base type, or they are sliced.
