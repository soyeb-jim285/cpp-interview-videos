# Chapter 4 — Owning Memory Safely

Earlier chapters showed you how to get memory with `new` and give it back with `delete`. This chapter asks a harder question: who is responsible for giving it back?

When one piece of code is responsible for an object's memory, we say that code is the **owner**. Ownership is a promise. The owner frees the memory exactly once, at the right time, and nobody else frees it.

Most memory bugs in C++ happen when that promise is broken. Some are broken by copying an object, some by forgetting a cleanup step, and some by a pointer that outlives its memory. The tools in this chapter make the promise easier to keep.

We also meet a few words that are new to most readers. **Undefined behavior**, often shortened to **UB**, is what C++ calls a mistake that the language gives no rule for. When your program has UB, it may crash, print wrong results, look fine, or do something worse. Nothing in the code tells you which one will happen.

## Double-free errors

We start with a common bug. A **double free** happens when you free the same block of memory twice. The second free is UB.

Before the first example, we need two special functions that every class can have.

A **constructor** runs automatically when an object is created. It has the same name as the class, and its job is to set the object up. A **destructor** runs automatically when the object is destroyed, usually when its scope ends. Its name is the class name with a tilde in front, such as `~Buffer`. The destructor is a good place for cleanup. Constructors and destructors get a full treatment later in the book. For now, remember that the destructor runs by itself.

### The obvious version

```cpp
int main() {
    int* p = new int(5);
    int* q = p;      // same block
    delete p;
    delete q;        // freed again
}
```

Here is what happens, line by line.

Line 2 asks `new` for one `int` on the heap and stores its address in `p`. The `int` holds 5.

Line 3 copies the address into `q`. Now `p` and `q` both point at the same block. The block has one owner in the programmer's head, but two pointers in the code.

Line 4 calls `delete p`. The block is returned to the allocator. Both `p` and `q` still hold the address, so both are now dangling pointers. A dangling pointer points at memory that has already been freed.

Line 5 calls `delete q`. It hands the same address back to the allocator a second time. This is the double free.

On Linux with the GNU C++ compiler, running this program often prints the following and stops:

```output
free(): double free detected in tcache 2
Aborted (core dumped)
```

That message is useful, but you cannot count on it. Other systems may print nothing and keep running. The allocator keeps a list of free blocks. A double free can put one block on that list twice, so two later `new` calls can return the same memory. That is how a program ends up with two objects sharing one block, which is exactly the kind of bug attackers exploit.

### The hidden version

The most common double free has no `delete` in `main` at all. It hides inside a class.

```cpp
struct Buffer {
    int* data;
    Buffer() : data(new int[10]) {}
    ~Buffer() { delete[] data; }
};

int main() {
    Buffer a;
    Buffer b = a;  // copies the pointer
}   // ~b frees data, then ~a frees it again
```

The `Buffer` class owns a heap array of ten ints. The constructor allocates it. The destructor frees it.

The part after the colon in `Buffer() : data(new int[10]) {}` is the **member initializer list**. It sets the member `data` before the constructor body runs. A **member** is a variable declared inside a class.

Line 9 is the trap. `Buffer` has no copy rules of its own, so C++ writes a default copy for you. That default copies each member, and `data` is just a pointer. So `b.data` gets the same address as `a.data`. Both objects now think they own one array.

Line 10 is the end of `main`. Objects are destroyed in reverse order of creation, so `b` goes first and deletes the array. Then `a` runs its destructor and deletes the same address again. The bug has no `delete` in `main`. It comes from the copy.

We look at copying in detail in the next question.

### Preventing it

There are several ways to stop double frees.

The first is to set a pointer to `nullptr` after you delete it. `nullptr` is the keyword for "a pointer that points at nothing." Deleting a null pointer does nothing, so a second delete becomes harmless:

```cpp
delete p;
p = nullptr;   // deleting nullptr again is a no-op
```

This helps only that one pointer. Copies such as `q` above still hold the old address.

The second way is to avoid owning raw memory. A standard `std::vector` is a container that holds a growable array and frees it itself when it is destroyed:

```cpp
struct Buffer {
    std::vector<int> data = std::vector<int>(10);
};                      // copies are deep, no double free
```

Now the compiler's default copy copies the vector properly. Each copy gets its own array.

The third way is a smart pointer, which we meet later in this chapter. A `std::unique_ptr` can have only one owner, so it cannot be copied by accident.

These ideas lead to two rules. The **rule of three** says that if your class needs a destructor to free memory, it almost always needs you to write how copies are made, and how assignment works. The **rule of zero** says that if your class holds only standard types such as vectors and strings, you should write none of these functions, because the compiler's versions are already correct. Question 27 explains copies, and the rules come back at the end of that question.

::: answer
**Q26. What is a double-free error?**

A double free happens when you free the same memory twice, with `delete` or `free`. It is undefined behavior, so the program may crash, silently corrupt memory, or be exploited. The usual cause is copying an object that owns a raw pointer, because the default copy duplicates the pointer, not the memory. Prevent it with single ownership such as `std::unique_ptr`, a `std::vector`, the rule of three or zero, and use AddressSanitizer to catch it while testing.
:::

::: warning
A `nullptr` after `delete` is not a cure. It only fixes the one pointer you reset. Any copy of that pointer still holds the old address.
:::

## Shallow copy and deep copy

In the last question, a copy of an object gave us two objects that shared one heap block. This question names the two ways a copy can work.

Some words first. A **copy constructor** is a constructor that makes a new object from an existing one. The line `Shallow b = a;` calls one. A **copy assignment** is the `=` operator used on objects that already exist, as in `b = a;`.

A **shallow copy** copies the pointer's value, which is the address. A **deep copy** makes a new heap block and copies the data inside it. Here is the difference in code.

### Shallow: copy the pointer

```cpp
struct Shallow {
    int* data;
};

Shallow a{new int(5)};
Shallow b = a;      // copies the address

*b.data = 9;        // a sees 9 too!
```

`Shallow` has one member, a pointer to an `int`. The line `Shallow a{new int(5)};` uses braces to fill the members in order. So `a.data` points at a new heap `int` that holds 5.

Line 6 creates `b` as a copy of `a`. The compiler writes this copy for you. It copies each member, so `b.data` gets the same address that `a.data` has.

Line 8 writes 9 through `b`. Because `a.data` and `b.data` hold the same address, reading `*a.data` now also gives 9. The two objects share the data, so a change through one shows up in the other.

The shared data also causes the double-free problem from the last question. If `Shallow` had a destructor that called `delete data`, each object would delete the same block.

### Deep: copy what it points to

```cpp
struct Deep {
    int* data;
    Deep(int v) : data(new int(v)) {}
    Deep(const Deep& o)
        : data(new int(*o.data)) {}  // new block
    ~Deep() { delete data; }
};

Deep a(5);
Deep b = a;         // copies the value

*b.data = 9;        // a is still 5
```

This version writes its own copy constructor. The `const Deep& o` in parentheses is the object being copied. The `&` means "a reference," which is another name for the same object. The `const` promises that the copy constructor will not change `o`.

Inside the copy constructor, `new int(*o.data)` allocates a fresh `int` and gives it the value that `o.data` points at. The new pointer goes into `data`. So each object now has its own block.

Line 10 makes `b` a copy of `a`. The copy constructor runs, and `b.data` points at a new `int` that holds 5.

Line 12 writes 9 through `b`. That changes only `b`'s block. `a` still holds 5.

Each object has its own `~Deep()`, which deletes its own block. Nothing is deleted twice.

Real code should also write a copy assignment operator, because `b = a;` with objects that already exist would otherwise make the shallow copy again. That is the rule of three from the last question.

### Side by side

A table shows the two side by side.

| | Shallow copy | Deep copy |
|---|---|---|
| Copies | The pointer (address) | The data it points to |
| Afterwards | Two objects share one block | Each owns its own block |
| Changes | Visible through both | Stay independent |

Shallow copy is cheap, because it only copies an address. Deep copy costs an allocation and a copy of the data. The compiler gives you the shallow version for raw pointer members. You get the deep version either by writing it yourself, or by using a `std::vector` or `std::string`, which copy their contents for you.

::: answer
**Q27. What is the difference between shallow copy and deep copy?**

A shallow copy copies the pointer's value, so two objects end up sharing the same heap block. A deep copy allocates a new block and copies the data into it, so each object is independent. The compiler's default copy is shallow for raw pointer members. You get a deep copy by writing a copy constructor and copy assignment yourself, or by holding a `std::vector` or `std::string`, which copy their contents correctly.
:::

::: tip
Ask yourself one question about any class with a raw pointer: "What happens when this object is copied?" If the answer is "two objects share the pointer," you have a bug waiting to happen.
:::

## RAII

Now we turn to the idea that prevents most of these bugs. It has a clumsy name: **RAII**, which stands for "Resource Acquisition Is Initialization."

A **resource** is anything you must give back after you use it. Heap memory is one. Open files, locks, network sockets and threads are others.

### The problem: manual cleanup

Here is a function that opens a file and writes to it. The standard C function `std::fopen` opens a file, and `std::fclose` closes it.

```cpp
void work() {
    std::FILE* f = std::fopen("log.txt", "w");
    risky();               // throws? f never closed
    if (bad()) return;     // returns? f never closed
    std::fclose(f);
}
```

The function opens the file on line 2, and closes it on line 5. That works only if nothing goes wrong in between.

Line 3 calls `risky()`. An **exception** is C++'s way of leaving a function early when something fails. The program uses `throw` to raise one, and `catch` to handle it. If `risky()` throws, control jumps out of `work()`, and line 5 never runs. The file stays open.

Line 4 returns early. The same thing happens.

Every exit path needs its own cleanup, and someone will forget one. The same problem appears with memory, locks and sockets.

### The fix: a class that owns the resource

```cpp
#include <cstdio>
#include <stdexcept>

class File {
    std::FILE* f;
public:
    explicit File(const char* name)
        : f(std::fopen(name, "w")) {          // acquire
        if (!f) throw std::runtime_error("open failed");
    }
    ~File() { std::fclose(f); }               // release
    File(const File&) = delete;               // no copies
    File& operator=(const File&) = delete;
};

void work() {
    File log("log.txt");
    risky();                                  // may throw
}                                             // ~File() runs
```

This is RAII. The constructor acquires the resource. The destructor releases it.

The constructor opens the file. If the open fails, it throws, so a `File` object always holds an open file. The keyword `explicit` stops the compiler from turning a plain string into a `File` without you asking. That is a small safety step.

The destructor closes the file. It runs automatically, so you never write the close call yourself.

The two lines marked `= delete` forbid copying. If two `File` objects could exist for one file, both would try to close it. Deleting the copy functions means the compiler refuses such code.

Inside `work()`, we create a `File` and call `risky()`. There is no close call anywhere. When `work()` ends, normally or by an exception, the `File` is destroyed and the file is closed.

### Why it works: destructors always run

```cpp
void work() {
    File log("log.txt");
    std::lock_guard lk(m);
    risky();       // throws!
}
```

The variable `m` is a `std::mutex`, which is a lock that only one thread can hold at a time. `std::lock_guard` is a standard class that locks a mutex in its constructor and unlocks it in its destructor.

Here is what happens when `risky()` throws. The exception leaves `risky()`, then leaves `work()`. On the way out, C++ destroys every local object that was fully built. It does this in reverse order of creation. This is called **stack unwinding**.

So `lk` is destroyed first, and it unlocks the mutex. Then `log` is destroyed, and it closes the file. You get the cleanup for free, with no `try` or `catch` in the function.

There is one fine point. Unwinding is only guaranteed when something catches the exception somewhere up the chain. If nothing catches it, the program calls `std::terminate`, and the destructors may not run at all.

### You already use RAII

The standard library is built on this idea.

Heap memory is managed by `std::unique_ptr` (a smart pointer, which we meet soon), `std::vector` and `std::string`. Files are managed by `std::fstream`, which closes itself. Mutexes are managed by `std::lock_guard`. Threads are managed by `std::jthread` in C++20, which waits for its thread to finish when it is destroyed.

In an interview, say it this way: acquire in the constructor, release in the destructor, and let scope do the rest.

::: answer
**Q28. What is RAII (Resource Acquisition Is Initialization)?**

RAII ties a resource to the lifetime of an object. The constructor acquires the resource, such as memory, a file or a lock, and the destructor releases it. Because destructors run on every exit path, including early returns and exceptions, you get no leaks and no manual cleanup code. The standard library uses it everywhere, through `std::unique_ptr`, `std::vector`, `std::fstream`, `std::lock_guard` and `std::jthread`.
:::

::: warning
RAII only works when a resource has an owner object. A raw `new` with no owner, or a `fopen` with no wrapper class, has no automatic cleanup. That is why we wrap them.
:::

## Smart pointers

RAII works well for memory, but writing a class for every heap object is tedious. **Smart pointers** are standard classes that do this for you. A smart pointer looks like a pointer, because you can use `*` and `->` on it. It also owns the object it points at, and deletes that object automatically.

There are three smart pointers in C++: `std::unique_ptr`, `std::shared_ptr` and `std::weak_ptr`. We look at them one at a time, starting with the most common.

### unique_ptr: exactly one owner

```cpp
void demo() {
    auto p = std::make_unique<Widget>(3);
    p->draw();               // use it like a pointer

    // auto q = p;           // error: no copy
    auto r = std::move(p);   // transfer ownership
    // now p is null, r owns the Widget
}                            // r's destructor deletes it
```

This example assumes a class `Widget` with a constructor that takes an `int` and a member function `draw()`.

Line 2 creates a `Widget` on the heap. `std::make_unique` is a function that calls `new` for you and wraps the result in a `std::unique_ptr`. The `3` goes to the `Widget`'s constructor.

Line 3 uses the pointer with `->`, just like a raw pointer.

Line 5 is commented out, but it shows the rule. A `std::unique_ptr` cannot be copied. If two of them could hold the same object, both would delete it. The compiler stops that.

Lines 6 and 7 move the object. **Moving** means handing over the contents of one object to another, and leaving the first one empty. `std::move` is a function that marks an object as ready to be moved from. The actual transfer happens in the new owner. After the move, `r` owns the `Widget`, and `p` is null.

Line 8 is the end of the function. `r` is destroyed, so it deletes the `Widget`. You never wrote `delete`.

A `std::unique_ptr` is usually the same size as a raw pointer, and it costs almost nothing extra. So it is the right default.

### shared_ptr: many owners, counted

```cpp
auto a = std::make_shared<Widget>();
{
    auto b = a;     // count: 2
}                   // b gone, count: 1
a.reset();          // count: 0, deleted
```

A `std::shared_ptr` lets several owners share one object. Each `shared_ptr` points at the object and also at a count of how many owners there are. The count is explained in question 31.

Line 1 creates the `Widget` and the first owner, `a`. `std::make_shared` usually puts the object and its count in one allocation.

Line 3 copies `a` into `b`. Copying a `shared_ptr` adds an owner. The count becomes 2.

Line 4 ends the block, so `b` is destroyed. The count drops to 1.

Line 5 calls `reset()`, which makes `a` let go of the object. The count drops to 0, and the `Widget` is deleted.

Use `shared_ptr` only when ownership really is shared. If one object clearly owns another, `unique_ptr` is simpler and faster.

### weak_ptr: observe without owning

A `std::weak_ptr` points at an object that a `shared_ptr` owns, but it does not count as an owner. Its main job is to break cycles, which we explain in question 32. A **cycle** is a loop of objects that point at each other.

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;   // observes, doesn't own
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->prev = a;                    // no cycle of owners

if (auto p = b->prev.lock()) {  // shared_ptr, or null
    // a is still alive here
}
```

The `Node` has two links. `next` is a `shared_ptr`, so it owns the next node. `prev` is a `weak_ptr`, so it only observes the previous node.

Lines 8 and 9 connect the two nodes. Because `b->prev` is weak, `a` has only one real owner, the variable `a` itself. There is no cycle of owners.

You cannot use a `weak_ptr` directly. Line 11 calls `lock()`. It returns a `shared_ptr` if the object is still alive, or a null one if it is gone. The `if (auto p = ...)` form declares `p` and checks whether it is non-null. Inside the braces, `p` keeps the object alive, and `a` is still alive too.

::: answer
**Q29. What are smart pointers, and why are they useful?**

Smart pointers are standard classes that act like pointers but own the objects they point at, and delete them automatically when the owner goes away. They are useful because they make ownership clear and remove most manual `delete` calls, which prevents leaks and double frees. Reach for `std::unique_ptr` first, use `std::shared_ptr` only for truly shared ownership, and use `std::weak_ptr` to observe an object without owning it.
:::

## unique_ptr, shared_ptr and weak_ptr

The three smart pointers differ in one question: who owns the object? This section puts them side by side. Each one answers that question in a different way.

### unique_ptr: one owner

```cpp
auto a = std::make_unique<int>(42);
auto b = std::move(a);  // ownership moves
// auto c = b;          // error: no copy

// end of scope: b deletes the int
```

Line 1 makes `a` the sole owner of a heap `int` holding 42.

Line 2 moves ownership to `b`. Now `b` is the owner, and `a` is empty.

Line 3 would copy `b` into `c`. That is an error, because a `unique_ptr` can only be moved. There is only ever one owner.

At the end of the scope, `b` deletes the `int`. A `unique_ptr` is the only owner, so its destructor is the only one that deletes.

### shared_ptr and weak_ptr: counting and watching

```cpp
auto s1 = std::make_shared<int>(42);
auto s2 = s1;               // share
std::weak_ptr<int> w = s1;  // observe

s1.reset();
s2.reset();                 // int destroyed
bool gone = w.expired();    // true
```

Line 1 creates the `int` and its owner, `s1`.

Line 2 copies `s1` into `s2`. Now two owners share the `int`.

Line 3 makes `w` a `weak_ptr` to the same `int`. It observes the object but does not own it.

Line 5 resets `s1`. One owner is left, so the `int` still exists.

Line 6 resets `s2`. That was the last owner, so the `int` is destroyed.

Line 7 asks the `weak_ptr` whether its object is gone. `expired()` returns `true` now.

Behind the scenes, a `shared_ptr` and its `weak_ptr` share a hidden structure called the **control block**. The control block holds two counts: the **strong count** of owners, and the **weak count** of observers. The object is destroyed when the strong count reaches zero. The control block itself is freed when both counts reach zero.

### Using a weak_ptr: lock it first

```cpp
std::weak_ptr<int> w;
{
    auto s = std::make_shared<int>(42);
    w = s;
    if (auto p = w.lock()) std::cout << *p << '\n';
}
if (auto p = w.lock()) std::cout << *p << '\n';
else                   std::cout << "expired\n";
```

This program prints `42` and then `expired`.

Line 1 declares an empty `weak_ptr`.

Lines 2 to 6 form a block. Inside it, line 3 creates `s`, an owner of an `int` holding 42. Line 4 makes `w` observe that `int`.

Line 5 calls `lock()` on `w`. The object is still alive, so `lock()` returns a `shared_ptr`, and the `if` runs. It prints 42. When the block ends, `s` is destroyed, and the `int` goes with it.

Line 7 calls `lock()` again. The object is gone, so `lock()` returns a null pointer. The `if` is false, and the `else` prints `expired`.

This is how caches and observers check safely whether an object still exists.

### Side by side

- **unique_ptr** has exactly one owner. It can only be moved, not copied. It costs about the same as a raw pointer. The object is deleted when that owner goes away.
- **shared_ptr** has many owners. Copying it adds an owner. It costs a control block and atomic count updates. The object is deleted when the last owner goes away.
- **weak_ptr** owns nothing. Copying it adds an observer. It never frees the object. You call `lock()` to use it.

Use `unique_ptr` by default. Use `shared_ptr` only for a truly shared lifetime. Use `weak_ptr` for observers and to break cycles.

::: answer
**Q30. What is the difference between `unique_ptr`, `shared_ptr`, and `weak_ptr`?**

`unique_ptr` is the sole owner of its object. It can be moved but not copied, and it costs about as much as a raw pointer. `shared_ptr` is one of many owners, counted in a control block, and the object is destroyed when the last one goes away. `weak_ptr` observes a `shared_ptr`'s object without owning it, and you call `lock()` to use it safely. Choose `unique_ptr` by default.
:::

## Reference counting

`shared_ptr` must know when the last owner has gone. It finds out with **reference counting**: it keeps a count of the owners, and frees the object when the count reaches zero.

The idea is simple. The count starts at one. Each new owner adds one. Each owner that goes away subtracts one. When the count hits zero, the last owner deletes the object.

### Watch the count

```cpp
auto a = std::make_shared<int>(7);
std::cout << a.use_count();     // 1
{
    auto b = a;                  // copy: +1
    std::cout << a.use_count();  // 2
}                                // b dies: -1
std::cout << a.use_count();     // 1
a.reset();                       // 0: delete
```

`use_count()` returns the current count. The comments show the values the program reads. The first `use_count()` gives 1, the one inside the block gives 2, and the one after the block gives 1. Those three numbers are printed next to each other, so the line reads `121`, with no spaces. The count is then zero after `reset()`.

Line 1 creates the `int` and the first owner, so the count is 1.

Lines 3 to 6 form a block. Line 4 copies `a` into `b`. That adds one owner, so the count is 2. Line 6 ends the block, so `b` is destroyed, and the count goes back to 1.

Line 8 calls `reset()` on `a`. That removes the last owner. The count is 0, and the `int` is deleted.

`use_count()` is mostly useful for debugging. Do not write logic that depends on its value, because other threads may change it at the same moment.

### The whole algorithm

The rules are small.

- A new owner, made by copy construction or copy assignment, adds one.
- An owner that is destroyed or reset subtracts one.
- Moving a `shared_ptr` only transfers ownership, so the count does not change.
- Whoever brings the count to zero deletes the object.

### It is not free

Each copy of a `shared_ptr` changes the count. Those changes are **atomic**, which means each one happens as a single step that no other thread can interrupt halfway. So the count is safe to share across threads. The updates are still slower than a plain increment.

Here is the practical advice:

```cpp
void byValue(std::shared_ptr<Widget> w);   // +1 on call, -1 on return
void byRef(const std::shared_ptr<Widget>& w);  // no count change
void best(const Widget& w);                    // no ownership needed
```

Passing by value copies the pointer, which adds and removes an owner on every call. Pass by value only if the function really keeps a copy. Pass a `const` reference to the `shared_ptr` if the function only uses it. Best of all, if the function only uses the object and does not care about ownership, pass a reference to the object itself.

Also remember that the count is thread safe, but the `Widget` it points at is not. Two threads changing the same `Widget` still need a lock.

The classic follow-up question is about cycles. Two objects that own each other never reach zero, so they leak. Question 32 covers that.

::: answer
**Q31. What is reference counting?**

Reference counting tracks how many owners an object has. Each new owner adds one, each owner that goes away subtracts one, and when the count reaches zero the object is deleted. `shared_ptr` uses this with an atomic counter, so the count is safe across threads. It costs a control block and atomic operations, and cycles keep the count above zero forever, so they leak.
:::

::: tip
Pass `const std::shared_ptr<T>&` when a function needs to hold on to the pointer. Pass `T&` when it only needs the object. Counts change less often that way, and the code says what it needs.
:::

## Circular references

We have seen that a `shared_ptr` frees its object when the count hits zero. Now we see when the count never hits zero.

A **circular reference** happens when objects own each other in a loop. The name comes from the loop of pointers.

### Two nodes that own each other

```cpp
#include <iostream>
#include <memory>

struct Node {
    std::shared_ptr<Node> other;
    ~Node() { std::cout << "freed\n"; }
};

int main() {
    auto a = std::make_shared<Node>();
    auto b = std::make_shared<Node>();
    a->other = b;
    b->other = a;
}   // prints nothing: leak
```

The `Node` has one `shared_ptr` member. Its destructor prints `freed`, so we can see when it runs.

Lines 10 and 11 in `main` create two nodes, `a` and `b`. Each has a count of one, from the `shared_ptr` variable that owns it.

Line 12 makes `a`'s node own `b`'s node. The count of `b`'s node becomes 2.

Line 13 makes `b`'s node own `a`'s node. The count of `a`'s node becomes 2.

Line 14 ends `main`. The variables `a` and `b` are destroyed, and each count drops to 1. But one is not zero. Each node is kept alive by the other. Neither destructor runs, so `freed` never prints.

This is a memory leak, and it happens without any `new` or `delete` being written in a risky way. The program keeps running with no crash, so the leak can go unnoticed for a long time.

### The fix: make the back edge weak

```cpp
#include <iostream>
#include <memory>

struct Child;

struct Parent {
    std::shared_ptr<Child> child;    // owns
    ~Parent() { std::cout << "~Parent\n"; }
};

struct Child {
    std::weak_ptr<Parent> parent;    // only observes
    ~Child() { std::cout << "~Child\n"; }
};

int main() {
    auto p = std::make_shared<Parent>();
    p->child = std::make_shared<Child>();
    p->child->parent = p;
}
```

The line `struct Child;` is a **forward declaration**. It tells the compiler that a type called `Child` exists and will be defined later. We need it because `Parent` mentions `Child` before the full definition.

The parent owns its child with a `shared_ptr`, on line 7. The child only observes its parent with a `weak_ptr`, on line 12. A `weak_ptr` does not add to the count, so there is no cycle of owners.

In `main`, line 17 creates the parent. Line 18 creates the child and gives it to the parent. Line 19 gives the child a weak pointer back to the parent.

When `main` ends, `p` is destroyed. The parent's count hits zero, so the parent is destroyed. Its destructor prints `~Parent`. Then its member `child` is released. The child's count hits zero, so the child is destroyed, and it prints `~Child`.

The program prints:

```output
~Parent
~Child
```

When the child needs its parent, it calls `lock()`, as we saw in question 30.

### Where cycles hide

Cycles appear in a few common places.

- **Back pointers.** A child points to its parent, and the parent points to the child. This happens in trees and graphs.
- **Doubly linked lists.** Each node has a `next` and a `prev`, and both are owning pointers.
- **Callbacks.** An object stores a function, called a **lambda**, that captures a `shared_ptr` to the object itself. A lambda is a small unnamed function written inline. A **capture** is a variable the lambda carries with it.

To find leaks like these, you can use LeakSanitizer or Valgrind. Both report memory that was never freed. Question 35 covers them.

The rule of thumb is simple. Ownership should form a tree, with one owner at each node. Every back edge should be a `weak_ptr`, or a plain raw pointer that the design guarantees stays valid.

::: answer
**Q32. What is a circular reference problem with `shared_ptr`?**

A circular reference happens when shared pointers own each other in a loop. Each object's count stays at one or more, so neither ever reaches zero, and neither destructor runs. There is no crash, so the leak is silent. The fix is to make one direction a `weak_ptr`, so that ownership forms a tree, and the parent's destruction releases its children.
:::

::: warning
Interviewers often ask how you find a cycle. The answer is not "look at the code carefully." Run LeakSanitizer or Valgrind on a test that creates and drops the objects, and read the report.
:::

## Alignment and padding

So far we have treated memory as one long row of bytes. The compiler, however, cares about where each object starts in that row. It also adds unused bytes to a struct, and this surprises most beginners.

A **byte** is one small unit of memory. An **address** is the number that names a byte. An **offset** is how far a member is from the start of its struct. **sizeof** is an operator that gives the size of a type in bytes.

**Alignment** is the rule that an object must start at an address that is a multiple of a certain number. Each type has an alignment. An `int` is usually 4-byte aligned, so it must start at an address divisible by 4. **alignof(T)** gives the alignment of type `T`.

**Padding** is the unused bytes the compiler inserts to keep each member aligned.

### struct A: six bytes of data, twelve bytes of struct

```cpp
struct A {
    char c;   // 1 byte
    int  i;   // 4 bytes
    char d;   // 1 byte
};
// sizeof(A) == 12, not 6
```

The members hold 1 + 4 + 1 = 6 bytes of data, but `sizeof(A)` is 12. Here is the layout on a typical 64-bit x86 system with GCC or Clang:

```{=latex}
\begin{memdiagram}
\widecell[plain]{a}{-6.05,0}{1.04}{}{c}
\widecell[plain]{b}{-3.85,0}{3.24}{}{pad}
\widecell[data]{c}{0,0}{4.34}{}{i}
\widecell[plain]{d}{2.75,0}{1.04}{}{d}
\widecell[plain]{e}{4.95,0}{3.24}{}{pad}
\foreach \k in {0,...,11} { \node[font=\sffamily\scriptsize, text=vzmute] at (-6.05+1.1*\k,-0.7) {\k}; }
\vznote[plain]{-7.4,-0.7}{offset}
\end{memdiagram}
```

The member `c` is at offset 0. The member `i` needs 4-byte alignment, so it cannot start at offset 1. The compiler inserts three bytes of padding, and `i` starts at offset 4.

The member `d` can go right after `i`, at offset 8. Its alignment is 1, so no padding is needed before it.

The struct itself must be aligned to its largest member, which is 4. So the total size must be a multiple of 4. The size after `d` is 9, so three more bytes of padding bring it to 12. That way, in an array of `A`, every element's `int` stays aligned.

The exact numbers depend on the platform. The numbers in this section are what GCC and Clang produce on common 64-bit systems.

### Same members, better order

```cpp
struct B {
    int  i;   // 4 bytes
    char c;   // 1 byte
    char d;   // 1 byte
};
// sizeof(B) == 8
```

`B` has the same three members, in a different order. Here is its layout:

```{=latex}
\begin{memdiagram}
\widecell[data]{a}{-2.2,0}{4.34}{}{i}
\widecell[plain]{b}{0.55,0}{1.04}{}{c}
\widecell[plain]{c}{1.65,0}{1.04}{}{d}
\widecell[plain]{d}{3.3,0}{2.14}{}{pad}
\foreach \k in {0,...,7} { \node[font=\sffamily\scriptsize, text=vzmute] at (-3.85+1.1*\k,-0.7) {\k}; }
\vznote[plain]{-5.2,-0.7}{offset}
\end{memdiagram}
```

The `int` goes first, at offset 0. The two `char` members follow it, at 4 and 5. The struct now has 6 bytes of data, and it needs a size that is a multiple of 4. So only two bytes of padding are added, and `sizeof(B)` is 8.

This is a common interview trick. To shrink a struct, order the members from the largest alignment to the smallest. The data stays the same, but the padding goes down.

### Why it exists, and how to control it

```cpp
#include <iostream>

struct A { char c; int i; char d; };
struct B { int i; char c; char d; };

int main() {
    std::cout << sizeof(A) << ' ' << alignof(A) << '\n';
    std::cout << sizeof(B) << ' ' << alignof(B) << '\n';
}
```

Running it prints:

```output
12 4
8 4
```

Processors load data fastest from aligned addresses. Some processors even refuse to load misaligned data. In C++, using an object at a misaligned address is undefined behavior, so the compiler keeps objects aligned for you.

You can query an alignment with `alignof`. You can ask for a larger alignment with `alignas`:

```cpp
struct alignas(64) Counter { int n; };  // own cache line
static_assert(sizeof(Counter) == 64);
```

A **cache line** is a small block of memory, often 64 bytes, that the processor moves in and out of its cache at one time. If two threads write to different variables that sit on the same cache line, the processor keeps passing that line back and forth. This slows both threads down. This is called **false sharing**. Giving each counter its own cache line avoids it.

`static_assert` checks a condition when the code is compiled. If the check fails, the compiler stops with an error.

There is also a compiler-specific `#pragma pack` that removes padding. It is not standard C++, and it makes the CPU work harder on each access. Use it only when you must match a fixed binary layout, such as a file format or a network packet.

::: answer
**Q33. What is memory alignment and padding?**

Alignment means each type must start at an address that is a multiple of its alignment, which you can query with `alignof`. Padding is the unused bytes the compiler inserts between and after members so that every member, and the struct as a whole, meets that rule. To shrink a struct, order its members from largest to smallest alignment. You can raise an alignment with `alignas`, for example to avoid false sharing.
:::

::: tip
When you see `sizeof` bigger than you expected, do not panic. Draw the struct with offsets, as in this section, and the padding will be obvious.
:::

## Placement new

You already know that `new` does two jobs. It allocates memory, and it constructs an object in that memory. **Placement new** does only the second job. You give it an address where the memory already exists, and it constructs the object there.

Placement new has a special syntax. The address goes in parentheses after the word `new`:

```cpp
new (address) Type{ ...arguments... }
```

### Construct without allocating

```cpp
#include <new>

struct Point { int x, y; };

alignas(Point) unsigned char buf[sizeof(Point)];

Point* p = new (buf) Point{1, 2};

p->~Point();   // destroy explicitly
// no delete: nothing was allocated
```

Line 4 reserves raw bytes on the stack. The array `buf` is big enough for one `Point`. The `alignas(Point)` makes sure the bytes start at an address with the right alignment. The type `unsigned char` is used because a byte array is a neutral kind of storage.

No `Point` exists yet. The bytes are just bytes.

Line 6 is placement new. It runs the `Point` constructor at the address `buf`, and returns a pointer to the new object. It allocates nothing.

Line 8 destroys the object by calling its destructor directly. Here, the destructor is the default one, which does nothing. But the call is still required in general. You must write it yourself, because placement new did not create a memory block that `delete` could free.

Line 9 is the important rule. Never call `delete` on `p`. The `delete` would try to free memory that `new` never allocated, which is undefined behavior.

### The destructor is your job

```cpp
#include <iostream>
#include <new>

struct Tracer {
    Tracer()  { std::cout << "ctor\n"; }
    ~Tracer() { std::cout << "dtor\n"; }
};

int main() {
    alignas(Tracer) unsigned char buf[sizeof(Tracer)];
    Tracer* t = new (buf) Tracer;
    t->~Tracer();   // forget this and "dtor" never prints
}
```

This program prints:

```output
ctor
dtor
```

Line 10 reserves aligned bytes that can hold one `Tracer`.

Line 11 uses placement new. The constructor runs, and it prints `ctor`.

Line 12 calls the destructor explicitly, and it prints `dtor`. If you delete this line, `dtor` never prints. The object simply goes away, and any resource it held, such as a file or heap memory, leaks.

The buffer must also be big enough and correctly aligned, or you get undefined behavior.

### Where it is used

Placement new is the tool that lets library code build objects in memory it manages itself.

- A `std::vector` reserves raw capacity, and then builds each element in place when you add it.
- A `std::optional` keeps raw storage inside itself, and builds the value only when you set it.
- A memory pool grabs one big block, then places many objects inside it.

Since C++20, `std::construct_at` does the same job as placement new, and it also works in code the compiler runs at compile time. You will rarely write placement new yourself, but you should know what it means when you read it.

::: answer
**Q34. What is placement `new`?**

Placement `new` constructs an object at an address you provide, without allocating memory. You must call the destructor yourself, and you must never call `delete` on that object. The memory must be large enough and correctly aligned. Standard containers and memory pools use this technique to build objects in storage they manage.
:::

::: warning
Placement new is for memory management, not for everyday code. If you find yourself using it, first check whether `std::vector`, `std::optional` or a smart pointer already does the job.
:::

## Finding memory corruption with sanitizers and Valgrind

Some memory bugs do not crash right away. A write one element past the end of an array may silently change another variable. A read from freed memory may return the old value, and look correct. Such bugs are called **memory corruption**, and they are hard to find by reading code.

Two tools catch them for you. **AddressSanitizer**, often shortened to **ASan**, is built into GCC and Clang. **Valgrind** is a separate program that runs your binary on a simulated processor.

A **sanitizer** is a tool that adds checks to your program while it runs. The checks are added by the compiler, so they are called **instrumentation**.

### AddressSanitizer: compile it in

```cpp
int main() {
    int* a = new int[4];
    a[4] = 1;        // one past the end
    delete[] a;
}
```

The array has elements 0 to 3. Line 3 writes to element 4, which does not exist. This is a **heap buffer overflow**.

Run normally, this program may seem fine. The write lands in memory that happens to be free, and nothing crashes.

To find the bug, compile with two flags and run again:

```output
g++ -g -fsanitize=address bug.cpp && ./a.out
```

The flag `-g` adds debugging information, so the report can show line numbers. The flag `-fsanitize=address` turns on AddressSanitizer.

With the sanitizer, the program stops at the bad write and prints something like this:

```output
ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
WRITE of size 4 at 0x... thread T0
    #0 0x... in main bug.cpp:3
0x... is located 0 bytes after 16-byte region
```

The `0x...` parts are addresses. They change from run to run, so the placeholders stand in for them. The message tells you the kind of error, the size of the write, the line, and the size of the block that was overrun. It says "0 bytes after," which means the write went just past the end.

### How AddressSanitizer sees the overflow

ASan works with three ideas.

- **Redzones.** Every heap block is surrounded by poisoned bytes, called redzones. A poisoned byte must never be touched by correct code.
- **Shadow memory.** ASan keeps a separate map that records which bytes are valid. One shadow byte describes eight bytes of real memory.
- **Checks.** The compiler inserts a quick shadow check before every load and every store. Touching a redzone is caught at once.

Freed memory is also poisoned, and it is held in a **quarantine** for a while before it can be reused. That is how ASan catches use after free. ASan also finds overflows in stack and global variables, double frees, and, on Linux, memory leaks through LeakSanitizer.

The cost is about two times slower. That is cheap enough to run your tests with it.

### Valgrind: no recompiling

```cpp
int main() {
    int* p = new int(5);
    delete p;
    return *p;       // use after free
}
```

Here `p` is read after it was freed. This is a use after free.

Valgrind needs no special build. Compile with `-g` for line numbers, then run the program under Valgrind:

```output
g++ -g uaf.cpp && valgrind ./a.out
```

Valgrind runs your binary on a simulated processor, and it checks every memory access. The report looks like this:

```output
Invalid read of size 4
   at 0x...: main (uaf.cpp:4)
 Address 0x... is 0 bytes inside a block of size 4 free'd
ERROR SUMMARY: 1 errors from 1 contexts
```

Valgrind catches the read at line 4 and says the block was already freed. It also reports reads of uninitialized values, which ASan does not check, and memory leaks at exit.

The cost is much larger. Valgrind is often twenty to thirty times slower. It also finds fewer overflows in stack arrays than ASan does.

### Using them in practice

Here is a simple workflow.

1. **Build** your tests with `-fsanitize=address` and `-fsanitize=undefined`, plus `-g`. The second flag turns on the UndefinedBehaviorSanitizer, which checks for many kinds of UB.
2. **Run** the whole test suite, both on your machine and in continuous integration.
3. **Read** the report. It shows the kind of error, the stack trace, and where the memory was allocated and freed.
4. **Use Valgrind** when you cannot rebuild the program, or when you want to hunt uninitialized reads.

One trap: do not run an ASan build under Valgrind. The two tools change the program in ways that clash, and they do not work together.

::: answer
**Q35. How can you detect memory corruption using AddressSanitizer or Valgrind?**

Compile with `-g -fsanitize=address` and run your tests, and ASan stops at the first bad read or write with a precise report: the error type, the line, and the block involved. It is about twice as slow. Valgrind needs no rebuild, because it runs the binary on a simulated processor, but it is much slower. Both catch heap overflows, use after free and leaks, so run them in your test pipeline.
:::

::: warning
Sanitizers find only the bugs your tests reach. A clean run means "no error on this path," not "no bug." Test the paths that matter.
:::

## Chapter summary

- A double free releases the same memory twice. It is undefined behavior, and the usual cause is a shallow copy of an object that owns a raw pointer.
- A shallow copy copies the address, so two objects share data. A deep copy allocates a new block and copies the data.
- RAII ties a resource to an object's lifetime: acquire in the constructor, release in the destructor, and destructors run on every exit path.
- Smart pointers are RAII wrappers for memory. Use `std::unique_ptr` by default, `std::shared_ptr` for truly shared ownership, and `std::weak_ptr` to observe without owning.
- Reference counting frees a shared object when its count of owners reaches zero. Cycles keep the count above zero, so they leak. Break them with a `weak_ptr`.
- Alignment forces objects to start at addresses that are multiples of their alignment. Padding fills the gaps, so order struct members from largest to smallest to shrink them.
- Placement new constructs an object at a given address without allocating. You must call the destructor yourself, and never call `delete`.
- Build with `-g -fsanitize=address` to catch memory bugs with precise reports, or run Valgrind when you cannot rebuild.
