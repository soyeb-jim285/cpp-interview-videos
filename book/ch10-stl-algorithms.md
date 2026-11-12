# Chapter 10 — Using Containers Well: Algorithms and Idioms

In chapter 9 you met the containers. A **container** is an object that holds a group of elements. You saw `std::vector`, `std::array`, `std::map`, `std::set`, and their unordered cousins. You also met Big-O, which tells you how the time an operation takes grows as the container grows.

This chapter is about using containers well. You will learn how to add elements without wasted work. You will choose between the three sequence containers. You will sort with your own rules, see how a priority queue works inside, and remove elements correctly.

Many of these tools come from the **algorithms**. An algorithm is a function that does a job, such as sorting, on a **range**. The algorithm functions live in the header `<algorithm>`. A range is two iterators. The first iterator points at the first element. The second points just past the last element. For a vector `v`, the whole range is `v.begin()` to `v.end()`.

An **iterator** is an object that points at an element and can move to the next one. You met iterators in chapter 9. Keep that picture in mind as we go.

## Adding elements: push_back and emplace_back

You already know `push_back()`. It adds one element to the end of a vector. Now let us look at what happens underneath.

To store a value in a vector, C++ either **copies** it or **moves** it. A copy makes a new, separate object with the same contents. A move takes the contents of an existing object and hands them to the new one. After a move, the old object is still valid, but it is usually empty. Moves are normally cheap, and copies can be expensive.

A **constructor** is the special function that builds an object. You give it the arguments it needs. Here is a small type that prints a message from each of its three functions, so we can see which one runs:

```cpp
#include <iostream>
#include <vector>

struct P {
    P(int x, int y) { std::cout << "ctor\n"; }
    P(const P&)     { std::cout << "copy\n"; }
    P(P&&) noexcept { std::cout << "move\n"; }
};

int main() {
    std::vector<P> v;
    v.reserve(2);           // room for two, so no regrowing
    v.push_back(P(1, 2));   // build P, then move it in
    v.emplace_back(1, 2);   // build P right in the vector
}
```

The output is:

```output
ctor
move
ctor
```

Line by line:

- Lines 4 to 8 define `P`. The constructor `P(int, int)` prints `ctor`. The copy constructor prints `copy`. The move constructor prints `move`. The `noexcept` promises that the move does not throw an exception.
- Line 11 creates an empty vector of `P`.
- Line 12 calls `reserve(2)`. This gives the vector room for two elements, so it does not grow in the middle of our test. We look at `reserve` closely at the end of the chapter.
- Line 13 builds a temporary `P` with `P(1, 2)`. That prints `ctor`. Then `push_back` moves it into the vector. That prints `move`. The temporary is then destroyed, which prints nothing here.
- Line 14 calls `emplace_back(1, 2)`. The arguments `1` and `2` are passed straight to the constructor. The new `P` is built in its final place. That prints `ctor`, and nothing else.

Think of it like a shop. With `push_back`, you buy a finished gift, and put it in the box. With `emplace_back`, you give the shop the ingredients, and the gift is made inside the box. No extra copy of the gift is needed.

```{=latex}
\begin{memdiagram}
\node[font=\sffamily\bfseries\small] at (1.6,2.6) {\texttt{push\_back(P(1, 2))}};
\node[font=\sffamily\bfseries\small] at (6.6,2.6) {\texttt{emplace\_back(1, 2)}};
\node[vzstep=plain, text width=3.4cm] (pa) at (1.6,1.1) {build a temporary\\ P: ctor};
\node[vzstep=plain, text width=3.4cm] (pb) at (1.6,-0.6) {move it into the vector};
\node[vzstep=plain, text width=3.4cm] (pc) at (1.6,-2.3) {destroy the temporary};
\draw[vzptr=plain] (pa) -- (pb);
\draw[vzptr=plain] (pb) -- (pc);
\node[vzstep=ok, text width=3.4cm] (ea) at (6.6,1.1) {forward 1 and 2 into the slot};
\node[vzstep=ok, text width=3.4cm] (eb) at (6.6,-0.6) {construct P right there: ctor};
\draw[vzptr=ok] (ea) -- (eb);
\end{memdiagram}
```

For an `int` or a small type, the extra move costs almost nothing, so the difference does not matter much. It matters when the type is big or expensive to move.

### Two traps

The first trap: when you already have an object, `emplace_back` gains nothing. Here both lines make a copy:

```cpp
#include <string>
#include <vector>

int main() {
    std::vector<std::string> v;
    std::string s = "hi";
    v.push_back(s);      // copies s
    v.emplace_back(s);   // also copies s: no gain
}
```

The second trap is about **explicit** constructors. A constructor marked `explicit` cannot be used for an automatic conversion. `std::unique_ptr` is an example. It is a **smart pointer**, a type that owns an object created with `new` and deletes it for you. Its constructor that takes a plain pointer is `explicit`.

```cpp
#include <memory>
#include <vector>

int main() {
    std::vector<std::unique_ptr<int>> w;
    // w.push_back(new int(1));    // compile error: explicit
    w.emplace_back(new int(1));    // compiles, but can leak
}
```

`new int(1)` creates an `int` on the **heap**, the part of memory your program gets while it runs. It gives you back a **pointer**, a variable that holds the address of that `int`. If the vector then fails to grow, the call throws before the `unique_ptr` is made. Nothing deletes the `int`. That is a **memory leak**, which means memory that is never given back. The fix is to build the smart pointer first with `std::make_unique<int>(1)`. Then nothing can leak.

::: answer
**Q79. What is the difference between `push_back()` and `emplace_back()`?**

`push_back()` takes an object you already have, and copies or moves it into the vector. `emplace_back()` takes the arguments for a constructor, and builds the new element in place, so there is no temporary and no extra move. Use `emplace_back` when you pass constructor arguments, and `push_back` when you already have the object. Be careful with `explicit` constructors, and prefer `std::make_unique` over `new`.
:::

## Choosing a sequence container: vector, deque, list

A **sequence container** keeps its elements in an order, one after another. Three of them are used all the time. They differ in how they lay out their elements in memory. That layout decides how fast each operation is.

**Contiguous** means "in one block, with no gaps." A **node** is a small separate piece of memory that holds one element and some links to other nodes. Keep these words in mind as you read the picture below.

```{=latex}
\begin{memdiagram}
\vznote[stack]{-0.6,6.0}{vector}
\widecell[stack]{v1}{0.5,6.0}{1.1}{}{1}
\widecell[stack]{v2}{1.6,6.0}{1.1}{}{2}
\widecell[stack]{v3}{2.7,6.0}{1.1}{}{3}
\widecell[stack]{v4}{3.8,6.0}{1.1}{}{4}
\widecell[stack]{v5}{4.9,6.0}{1.1}{}{5}
\widecell[stack]{v6}{6.0,6.0}{1.1}{}{6}
\vznote[stack]{8.4,6.0}{one contiguous block}
\vznote[plain]{-0.6,3.8}{deque}
\widecell[plain]{dp1}{0.5,3.8}{1.1}{}{ptr}
\widecell[plain]{dp2}{1.6,3.8}{1.1}{}{ptr}
\widecell[heap]{ck1}{0.5,1.8}{1.1}{}{1}
\widecell[heap]{ck2}{1.6,1.8}{1.1}{}{2}
\widecell[heap]{ck3}{2.7,1.8}{1.1}{}{3}
\widecell[heap]{ck4}{3.8,1.8}{1.1}{}{4}
\widecell[heap]{ck5}{5.5,1.8}{1.1}{}{5}
\widecell[heap]{ck6}{6.6,1.8}{1.1}{}{6}
\widecell[heap]{ck7}{7.7,1.8}{1.1}{}{\textunderscore{}}
\widecell[heap]{ck8}{8.8,1.8}{1.1}{}{\textunderscore{}}
\draw[vzptr=plain] (dp1.south) -- (ck1.north);
\draw[vzptr=plain] (dp2.south) -- (ck5.north);
\vznote[heap]{10.4,1.8}{fixed-size chunks}
\vznote[plain]{-0.6,0.0}{list}
\widecell[plain]{l1}{0.5,0.0}{1.1}{}{1}
\widecell[plain]{l2}{2.6,0.0}{1.1}{}{2}
\widecell[plain]{l3}{4.7,0.0}{1.1}{}{3}
\draw[vzptr=plain,<->] (l1.east) -- (l2.west);
\draw[vzptr=plain,<->] (l2.east) -- (l3.west);
\vznote[plain]{7.6,0.0}{one node per element,\\ each linked to neighbors}
\end{memdiagram}
```

A **vector** keeps everything in one block. Reading element number `i` is quick, because the address is simple arithmetic. Adding at the end is fast. Adding or removing at the front or middle means shifting the elements after that spot. That costs O(n).

A **deque** (pronounced "deck") keeps the elements in fixed-size chunks. A small index of pointers tells it where each chunk is. Adding at either end just fills a chunk, or adds a new one. Nothing shifts. Reading element `i` is still quick.

A **list** gives each element its own node. The nodes sit anywhere on the heap. Each node points at its previous and next neighbor. Inserting in the middle only changes a few pointers, so it is quick once you are at the right spot. The catch: to reach element number `i`, you must walk from the start, which costs O(n).

**Random access** means jumping straight to element `i`, as in `v[i]`, without walking past the others. Here is the short version:

- `vector`: quick random access, quick at the back, slow in the middle.
- `deque`: quick random access, quick at both ends, slow in the middle.
- `list`: slow random access, quick insert and erase at a known spot.

Here is a small deque example:

```cpp
#include <deque>
#include <iostream>

int main() {
    std::deque<int> d;
    d.push_back(2);
    d.push_front(1);   // quick at the front too
    d.push_back(3);
    std::cout << d[0] << ' ' << d[1] << ' ' << d[2] << '\n';
}
```

The output is `1 2 3`. Each `push` is O(1), so the whole thing is quick. The last line uses `d[0]`, `d[1]`, and `d[2]`. That is random access, which a deque allows and a list does not.

The list has one trick that the others cannot match. Its `splice` moves nodes from one list to another without copying a single element:

```cpp
#include <iostream>
#include <list>

int main() {
    std::list<int> l = {1, 2, 3};
    std::list<int> other = {7, 8};

    l.splice(l.begin(), other);   // moves the nodes

    for (int x : l) std::cout << x << ' ';
    std::cout << '\n';
    std::cout << "other now has " << other.size() << '\n';
}
```

The output is:

```output
7 8 1 2 3 
other now has 0
```

Line by line:

- Line 5 makes a list `l` with three elements, and line 6 makes a second list `other` with two.
- Line 8 splices `other` into the front of `l`. The two nodes are relinked. No value is copied.
- Line 10 prints the elements of `l`. Each one is followed by a space.
- Line 12 prints the size of `other`. It is zero, because its nodes now belong to `l`.

The `std::vector` is the default choice. The C++ Core Guidelines, a set of community rules for modern C++, also recommend it as the default. Use a deque when you push and pop at both ends, like a queue. Note that `std::stack` and `std::queue` use a deque underneath by default. Use a list when you need iterators that stay valid while other elements come and go, or when you need `splice`. Measure before you pick a list. Vectors are so cache-friendly that they often win even on middle inserts.

::: answer
**Q80. What is the difference between `vector`, `deque`, and `list`?**

A `vector` stores its elements in one contiguous block, so access is fast and it is cache friendly. A `deque` stores fixed-size chunks with an index, so adding or removing at both ends is O(1), and it still allows `d[i]`. A `list` stores one node per element, linked to its neighbors, so it has no random access, but inserts and splices are O(1) once you hold the right iterator. Default to `vector`, and choose the others for a specific reason.
:::

## Custom comparators

Sorting needs a rule for what "in order" means. For numbers, the usual rule is "smaller first". A **comparator** is a function that holds that rule. It answers one question: should `a` come before `b`? The standard library calls it with two elements, and it returns `true` or `false`.

We pass the comparator as an extra argument to `std::sort`. Here is the default, then a custom rule:

```cpp
#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>

void show(const std::vector<int>& v) {
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v = {3, 1, 4, 1, 5};

    std::sort(v.begin(), v.end());
    show(v);   // 1 1 3 4 5

    std::sort(v.begin(), v.end(),
              [](int a, int b) { return a > b; });
    show(v);   // 5 4 3 1 1

    std::sort(v.begin(), v.end(), std::greater<int>());
    show(v);   // 5 4 3 1 1
}
```

The output is:

```output
1 1 3 4 5 
5 4 3 1 1 
5 4 3 1 1 
```

Line by line:

- Lines 6 to 9 define `show`, a small helper that prints a vector.
- Line 12 makes the vector.
- Line 14 sorts with no comparator. The default is `<`, which gives ascending order.
- Lines 17 and 18 pass a **lambda**. Lambdas get a full chapter next, so here is just the syntax: `[](int a, int b) { return a > b; }`. The `[]` is a capture list, empty for now. `(int a, int b)` are the parameters. The `{ ... }` is the body, which returns `a > b`. The result is descending order.
- Line 21 uses `std::greater<int>`. This is a ready-made comparator from `<functional>`. It is a **function object**, a type you can call like a function. It gives the same result as our lambda.

A comparator can be a lambda, an ordinary function, or a function object. Anything you can call with two elements and that returns `bool` will do.

### Comparators in a set

In a `std::set` or `std::map`, the comparator is part of the container's type. It decides the order of the keys, and it also decides which keys count as the same. Here is a function object that orders strings by length:

```cpp
#include <iostream>
#include <set>
#include <string>

struct ByLength {
    bool operator()(const std::string& a,
                    const std::string& b) const {
        return a.size() < b.size();
    }
};

int main() {
    std::set<std::string, ByLength> s = {"kiwi", "fig", "pear"};
    for (auto& w : s) std::cout << w << ' ';
    std::cout << '\n';
}
```

The output is:

```output
fig kiwi 
```

Line by line:

- Lines 5 to 10 define `ByLength`. A struct with an `operator()` can be called like a function. The `operator()` takes two strings and returns whether the first is shorter.
- Line 13 makes a set that uses `ByLength`. The name `pear` is inserted after `kiwi`.
- Line 14 prints the set.

Where did `pear` go? A set keeps keys in order, and it treats two keys as equal when neither comes before the other. `kiwi` and `pear` both have four letters. So `pear` counts as a duplicate of `kiwi`, and the set drops it. The comparator decided that, not the spelling. This is a classic trap.

### The rule: a strict weak ordering

A comparator must follow a rule, called a **strict weak ordering**. You do not need the formal definition. Remember three promises:

- Comparing an element with itself gives `false`.
- If `a` comes before `b`, then `b` does not come before `a`.
- If `a` comes before `b`, and `b` before `c`, then `a` comes before `c`.

The most common mistake is writing `<=`. Here is the wrong and right version:

```cpp
// WRONG: <= breaks the first promise
std::sort(v.begin(), v.end(),
          [](int a, int b) { return a <= b; });

// RIGHT: strict less than
std::sort(v.begin(), v.end(),
          [](int a, int b) { return a < b; });
```

With `<=`, comparing `5` with `5` gives `true`. That breaks the rules, and the behavior of `std::sort` is **undefined behavior**, or UB. UB means the C++ standard promises nothing at all about what happens. The program might crash, read memory outside the vector, or look fine. Never rely on it.

For several keys, compare **tuples**. A tuple is a bundle of values. `std::tie` makes a tuple of references to existing values, so you can compare them in order:

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <tuple>
#include <vector>

struct Person { int age; std::string name; };

int main() {
    std::vector<Person> people = {
        {30, "Zed"}, {25, "Amy"}, {30, "Bo"}};

    auto byAgeThenName = [](const Person& a, const Person& b) {
        return std::tie(a.age, a.name) < std::tie(b.age, b.name);
    };
    std::sort(people.begin(), people.end(), byAgeThenName);

    for (const Person& p : people)
        std::cout << p.age << ' ' << p.name << '\n';
}
```

The output is:

```output
25 Amy
30 Bo
30 Zed
```

The lambda compares ages first. If the ages are equal, the tuple compares the names. The people end up sorted by age, and by name inside each age.

::: tip
The comparator also decides equality in a set or map. If your comparator says two keys are equivalent, the container keeps only one of them.
:::

::: answer
**Q81. What is a custom comparator?**

A comparator is a function that answers one question: should `a` come before `b`? You can write it as a lambda, a function, or a function object, and you pass it to `std::sort`, a set, a map, or a priority queue. It must be a strict weak ordering: comparing an element with itself returns `false`, so never use `<=`. In a set or map, the comparator also decides which keys count as duplicates.
:::

## How priority_queue works inside

A **priority queue** is a container that always gives you the biggest element first. You push elements in any order. Then `top()` returns the largest one, and `pop()` removes it.

Inside, a priority queue is not a sorted list and not a tree of pointers. It is a **binary heap**, stored in a plain vector. Here is what that means.

A **tree** is a shape with a top node, called the **root**, and nodes hanging below it. Each node is a **parent** of the nodes below it, which are its **children**. A **binary** tree has at most two children per node. A heap follows one rule: in a **max-heap**, every parent is at least as big as each of its children. So the largest element is always at the root.

Here is a small program. We push four numbers, and then pop them all:

```cpp
#include <iostream>
#include <queue>

int main() {
    std::priority_queue<int> pq;
    pq.push(5);
    pq.push(3);
    pq.push(8);
    pq.push(1);

    std::cout << pq.top() << '\n';
    while (!pq.empty()) {
        std::cout << pq.top() << ' ';
        pq.pop();
    }
    std::cout << '\n';
}
```

The output is:

```output
8
8 5 3 1 
```

Line by line:

- Lines 6 to 9 push 5, 3, 8, and 1, in that order.
- Line 11 prints `top()`, which is `8`, the largest.
- Lines 12 to 15 loop while the queue is not empty. Each time, we print the top and then `pop()` it. The values come out largest first.
- Line 16 prints a final newline.

Here is how the heap looks after the four pushes. It is shown as a tree, and as the vector that stores it:

```{=latex}
\begin{memdiagram}
\widecell[plain]{t8}{2.6,4.0}{0.9}{}{8}
\widecell[plain]{t3}{1.2,2.6}{0.9}{}{3}
\widecell[plain]{t5}{4.0,2.6}{0.9}{}{5}
\widecell[plain]{t1}{0.4,1.2}{0.9}{}{1}
\draw[vzmute, line width=0.9pt] (t8.south west) -- (t3.north east);
\draw[vzmute, line width=0.9pt] (t8.south east) -- (t5.north west);
\draw[vzmute, line width=0.9pt] (t3.south west) -- (t1.north east);
\arraycells[heap]{hv}{0.5,-0.4}{8,3,5,1}{vector}
\end{memdiagram}
```

Here is how the heap is built, step by step:

- Push 5. The heap is just `5`.
- Push 3. It goes below 5 as a child, which is fine, since 5 is bigger.
- Push 8. It goes in the next free slot, which is the right child of 5. But 8 is bigger than its parent, 5, so it swaps up to the root. The move up is called **sift up**.
- Push 1. It goes under 3. It is smaller than its parent, so it stays.

Pop works the other way. It removes the root, moves the last element to the root, and then pushes it down. The move down is called **sift down**. Each step swaps the element with its larger child, until the heap rule holds again.

The index math is the magic. There are no node pointers. For the element at index `i` in the vector, the children sit at `2i + 1` and `2i + 2`. Sifting up or down follows these index formulas. Since the tree is always balanced, the number of steps is at most about log n. So `push` and `pop` are O(log n). `top` is O(1), because the largest element is always at index 0.

### Changing the order

The default comparator is `std::less`, which gives a max-heap. For a min-heap, you pass `std::greater`. You must then also name the underlying container, which is the vector:

```cpp
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    std::priority_queue<int, std::vector<int>,
                        std::greater<int>> minq;
    minq.push(5);
    minq.push(3);
    minq.push(8);
    minq.push(1);

    while (!minq.empty()) {
        std::cout << minq.top() << ' ';
        minq.pop();
    }
    std::cout << '\n';
}
```

The output is `1 3 5 8` followed by a space and a newline.

For your own type, you give a comparator. Here the comparator says: a task with a higher number in `prio` has higher priority:

```cpp
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct Task { int prio; std::string name; };

int main() {
    auto cmp = [](const Task& a, const Task& b) {
        return a.prio < b.prio;   // higher prio goes on top
    };
    std::priority_queue<Task, std::vector<Task>,
                        decltype(cmp)> tasks(cmp);

    tasks.push({1, "low"});
    tasks.push({5, "urgent"});
    tasks.push({3, "normal"});

    while (!tasks.empty()) {
        std::cout << tasks.top().name << ' ';
        tasks.pop();
    }
    std::cout << '\n';
}
```

The output is `urgent normal low` with a trailing space.

The `decltype(cmp)` asks the compiler for the type of the lambda. A lambda has a type nobody can write by hand, so we ask for it. The comparator reads as "`a` has lower priority than `b`, if `a.prio` is smaller". That puts the highest `prio` on top. The same rule that sorts ascending gives you the largest element first. This is the twist interviewers like.

### What you can and cannot do

A priority queue can be built from a range in O(n), which is faster than pushing one by one. It is an **adaptor**, which means it wraps another container and gives it a smaller interface. Under the hood it uses the standard heap functions, `std::make_heap`, `std::push_heap`, and `std::pop_heap`, on a vector.

You cannot loop over it with iterators. You cannot search it. You cannot change the priority of an element that is already inside. If you need that, you use a different structure, such as a `std::set`. Finally, calling `top()` or `pop()` on an empty queue is UB. Always check `empty()` first, as the loops above do.

::: warning
`top()` and `pop()` on an empty priority queue are undefined behavior. Check `empty()` first.
:::

::: answer
**Q82. How does `priority_queue` work internally?**

A `priority_queue` is a binary heap stored in a vector. A heap is a tree where every parent is at least as large as its children, so the largest element sits at index 0. `top()` is O(1). `push()` sifts an element up, and `pop()` moves the last element to the root and sifts it down. Both are O(log n). It is a max-heap by default, and you pass `std::greater` for a min-heap.
:::

## Sort versus stable sort

Both `std::sort` and `std::stable_sort` put a range in order. The only difference is what happens to elements that compare as equal. A **sort is stable** if equal elements keep their original relative order. Stability is a promise. `std::sort` makes no such promise. `std::stable_sort` does.

Here is a set of four students, sorted by grade, highest first. Ann and Cid both have 90. Bob and Dan both have 85:

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct S { std::string name; int grade; };

int main() {
    std::vector<S> v = {{"Ann", 90}, {"Bob", 85},
                        {"Cid", 90}, {"Dan", 85}};

    auto byGrade = [](const S& a, const S& b) {
        return a.grade > b.grade;
    };
    std::stable_sort(v.begin(), v.end(), byGrade);

    for (const S& s : v)
        std::cout << s.name << ' ' << s.grade << '\n';
}
```

The output is:

```output
Ann 90
Cid 90
Bob 85
Dan 85
```

Line by line:

- Line 6 defines `S`, a struct with a name and a grade.
- Lines 9 and 10 build the four students, in the order Ann, Bob, Cid, Dan.
- Lines 12 to 14 define `byGrade`. The lambda says "a comes first if its grade is higher".
- Line 15 runs the stable sort.
- Lines 17 and 18 print each student.

Ann and Cid tie at 90. Ann was first in the input, so Ann stays first in the output. The same is true for Bob and Dan. A plain `std::sort` would be allowed to print `Cid 90` before `Ann 90`. It promises only that the grades are in order. It does not promise how ties come out. On tiny inputs, `std::sort` often happens to keep the order. Do not rely on that.

Stability matters when you sort in passes. Say you want the list ordered by grade, and names alphabetical inside each grade. Sort by the secondary key first, then do a stable sort by the primary key:

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct S { std::string name; int grade; };

int main() {
    std::vector<S> v = {{"Dan", 85}, {"Ann", 90},
                        {"Cid", 90}, {"Bob", 85}};

    auto byName = [](const S& a, const S& b) {
        return a.name < b.name;
    };
    auto byGrade = [](const S& a, const S& b) {
        return a.grade > b.grade;
    };

    std::sort(v.begin(), v.end(), byName);         // 1st: name
    std::stable_sort(v.begin(), v.end(), byGrade); // 2nd: grade

    for (const S& s : v)
        std::cout << s.name << ' ' << s.grade << '\n';
}
```

The output is:

```output
Ann 90
Cid 90
Bob 85
Dan 85
```

After the first pass, the list is alphabetical. The stable second pass keeps the tied students in that alphabetical order. This is how a spreadsheet works when you click one column and then another. If you can write one combined comparator, one plain sort does the same job:

```cpp
std::sort(v.begin(), v.end(), [](const S& a, const S& b) {
    if (a.grade != b.grade) return a.grade > b.grade;
    return a.name < b.name;
});
```

Now the cost. Both are O(n log n) in typical cases. `std::sort` is usually an **introsort**, which is a quicksort (it splits the data around a chosen pivot value) that switches to heapsort when it recurses too deep. `std::stable_sort` is usually a **merge sort**. A merge sort splits the data in halves, sorts each half, and merges them. It needs extra memory for a buffer to do the merging. If that memory is not available, `std::stable_sort` falls back to a slower method, about O(n log² n). `std::sort` works in place, using no extra buffer. So in practice `std::sort` is usually the faster one.

::: tip
Use `std::stable_sort` when the order of equal elements matters. Use `std::sort` when it does not.
:::

::: answer
**Q83. What is the difference between `std::sort()` and `std::stable_sort()`?**

Both sort a range in O(n log n) in the usual case. `std::stable_sort` keeps equal elements in their original relative order, and `std::sort` does not promise that. `std::stable_sort` usually uses a merge sort with a buffer, and `std::sort` usually uses an in-place introsort, so `std::sort` is often faster. Use `stable_sort` for sorting by several keys in passes, or whenever ties must keep their order.
:::

## The erase-remove idiom

To delete elements from a vector, you might think you would call a function named `remove`. You would be wrong, and that surprise is the reason this **idiom** exists. An idiom is a common pattern that experienced C++ programmers write the same way every time.

Here is the surprise. `std::remove` does not remove anything from the container. It cannot, because it only sees iterators, not the vector. Here is what it really does.

It walks the range. It moves each element it wants to keep forward, to fill the gaps left by removed values. It returns an iterator to the new **logical end**, which is the point after the last keeper. The elements past that point are **leftovers**. Their values are unspecified, so you must not use them. The vector's size has not changed yet.

Then `erase` does the real removal. It takes a range and destroys the elements in it, and it shrinks the container. Together they form the idiom:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 2, 5};

    auto it = std::remove(v.begin(), v.end(), 2);
    std::cout << "size before erase: " << v.size() << '\n';

    v.erase(it, v.end());
    for (int x : v) std::cout << x << ' ';
    std::cout << "\nsize " << v.size() << '\n';
}
```

The output is:

```output
size before erase: 5
1 3 5 
size 3
```

Line by line:

- Line 6 makes the vector: 1, 2, 3, 2, 5. (The output section below gives the result.)
- Line 8 calls `std::remove`. It shifts the keepers 1, 3, and 5 to the front. It returns `it`, which points at index 3, the new logical end.
- Line 9 prints the size. It is still 5. `remove` did not shrink anything.
- Line 11 erases from `it` to `v.end()`. This destroys the two leftovers and shrinks the vector to three elements.
- Lines 12 and 13 print `1 3 5` and the size, 3.

Those two steps, combined, are the idiom. Written as one line:

```cpp
v.erase(std::remove(v.begin(), v.end(), 2), v.end());
```

A condition works the same way. Use `std::remove_if` with a lambda that returns `true` for the elements to delete:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4, 5, 6};
    v.erase(std::remove_if(v.begin(), v.end(),
                           [](int x) { return x % 2 == 0; }),
            v.end());
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

The output is `1 3 5` with a trailing space and a newline. The `x % 2 == 0` checks for an even number. The `%` operator gives the remainder after division, so a remainder of 0 means even.

This is one pass over the vector, so it is O(n). The slow way would be to erase one match at a time. Each erase shifts all the elements after it. That makes the total O(n²), which is much slower for large vectors.

C++20 added shortcuts that do the same job for you. In C++20, you can write:

```cpp
std::erase(v, 2);
std::erase_if(v, [](int x) { return x % 2 == 0; });
```

Use these if your compiler supports C++20. The examples in this book use C++17, where the idiom is needed.

### The classic trap

The most common bug is forgetting the second argument to `erase`:

```cpp
v.erase(std::remove(v.begin(), v.end(), 2));   // BUG
```

With one argument, `erase` removes only the single element at the iterator. That is the first leftover. The other leftovers stay in the vector, and their values are not what you want. If nothing matched, `remove` returns `v.end()`, and erasing `end()` is UB. Always pass `v.end()` as the second argument.

For a list, there is a simpler member function, `remove`. It unlinks the matching nodes directly:

```cpp
std::list<int> l = {1, 2, 3, 2};
l.remove(2);   // no erase needed
```

::: warning
Forgetting the second argument of `erase` removes only one element, and leaves the leftovers behind.
:::

::: answer
**Q84. What is the erase-remove idiom?**

`std::remove` does not delete anything. It moves the elements you keep to the front, and returns an iterator to the new logical end. Then `erase(it, v.end())` destroys the leftovers and shrinks the vector. Together, `v.erase(std::remove(v.begin(), v.end(), x), v.end())` removes every `x` in one O(n) pass. In C++20, `std::erase` and `std::erase_if` do this for you. Never forget the second argument to `erase`.
:::

## Reserve versus resize

Chapter 9 taught you about **capacity**. The capacity of a vector is how many elements it can hold before it must get a bigger block of memory. The size is how many elements are actually in it right now. Two member functions both take a number, and both can change the vector: `reserve()` and `resize()`. They sound alike, but they do very different things.

Here is a side-by-side example:

```cpp
#include <iostream>
#include <vector>

void show(const char* name, const std::vector<int>& v) {
    std::cout << name << " size " << v.size() << ":";
    for (int x : v) std::cout << ' ' << x;
    std::cout << '\n';
}

int main() {
    std::vector<int> a, b;

    a.reserve(4);   // capacity 4, size 0: no elements
    b.resize(4);    // size 4: four elements, all 0

    a.push_back(7);
    b.push_back(7);

    show("a", a);
    show("b", b);
}
```

The output is:

```output
a size 1: 7
b size 5: 0 0 0 0 7
```

Line by line:

- Lines 4 to 8 define `show`, a helper that prints the size and the elements.
- Line 11 makes two empty vectors.
- Line 13 calls `a.reserve(4)`. This allocates memory for four `int`s, and leaves the size at 0. No element exists.
- Line 14 calls `b.resize(4)`. This creates four elements. Each `int` is set to 0, which is called **value-initialized**. The size is now 4.
- Line 16 pushes 7 onto `a`. It becomes the first element, at index 0.
- Line 17 pushes 7 onto `b`. It goes after the four zeros, at index 4.
- Lines 19 and 20 print both results.

```{=latex}
\begin{memdiagram}
\vznote[plain]{1.5,2.0}{reserve(4) on a}
\widecell[plain]{ra}{6.0,2.0}{5.0}{}{room for 4, no elements}
\vznote[plain]{10.0,2.0}{size 0}
\vznote[plain]{1.5,0.0}{resize(4) on b}
\widecell[plain]{rb1}{3.75,0.0}{1.1}{}{0}
\widecell[plain]{rb2}{4.85,0.0}{1.1}{}{0}
\widecell[plain]{rb3}{5.95,0.0}{1.1}{}{0}
\widecell[plain]{rb4}{7.05,0.0}{1.1}{}{0}
\vznote[plain]{10.0,0.0}{size 4}
\end{memdiagram}
```

The mistake that causes many bugs is this: you meant to call `reserve`, but you called `resize`. Then your loop of `push_back` calls adds the elements after the zeros. You end up with twice as many elements as you wanted. Remember the difference, and you will avoid it.

### Indexing and shrinking

Indexing with `[]` needs an element to exist. Here is a trap, and the fix:

```cpp
#include <iostream>
#include <vector>

void show(const std::vector<int>& w) {
    std::cout << "size " << w.size() << ":";
    for (int x : w) std::cout << ' ' << x;
    std::cout << '\n';
}

int main() {
    std::vector<int> v;
    v.reserve(3);
    // v[0] = 1;   // UB: size is 0, no element here

    std::vector<int> w;
    w.resize(3);    // three elements, all 0
    w[0] = 1;       // fine: the element exists
    show(w);        // size 3: 1 0 0

    w.resize(5, -1);   // add two copies of -1
    show(w);           // size 5: 1 0 0 -1 -1
    w.resize(2);       // shrink
    show(w);           // size 2: 1 0
}
```

The output is:

```output
size 3: 1 0 0
size 5: 1 0 0 -1 -1
size 2: 1 0
```

Line by line:

- Line 11 makes an empty vector, and line 12 reserves room for three. Writing `v[0] = 1` on line 13 would be UB. The memory exists, but the element does not. The comment shows the bug, and we leave it out.
- Line 15 resizes `w` to three. Each element is 0, so `w[0] = 1` on line 16 is fine.
- Line 20 uses `resize(5, -1)`. The second argument is a **fill value**, copied into each new element. The size becomes 5.
- Line 22 uses `resize(2)`. Elements past the new size are destroyed. The size becomes 2.

`resize` can shrink the size. The memory block is kept, so the capacity does not drop. `reserve` never shrinks anything. If you ask for less than the current capacity, it does nothing.

Here is the full comparison:

- `reserve(n)` changes only the capacity, to at least `n`. Size is unchanged. No elements are created.
- `resize(n)` changes the size to `n`. It creates elements when growing, and destroys them when shrinking.

Use `reserve` before a loop of `push_back` calls, when you know roughly how many elements will come. Use `resize` when you want `n` elements that you can index right away.

::: tip
If a vector has spare capacity after you shrink it, `shrink_to_fit()` asks for the spare memory back. It is only a request, so the implementation may ignore it.
:::

::: answer
**Q85. What is the difference between `reserve()` and `resize()`?**

`reserve(n)` only allocates memory: the capacity becomes at least `n`, but the size stays the same and no elements are created. `resize(n)` changes the size to `n`, creating value-initialized elements or copies of a fill value, and it can also shrink the vector. Calling `reserve` then indexing with `[]` is UB, because no elements exist yet. Use `reserve` before a loop of `push_back`, and `resize` when you need `n` elements right away.
:::

## Chapter summary

- `push_back` copies or moves an object you already have into a vector. `emplace_back` passes constructor arguments and builds the element in place.
- Watch out for `explicit` constructors. Prefer `std::make_unique` to a raw `new` inside a container.
- `vector` is one contiguous block, `deque` is fixed-size chunks with fast ends, and `list` is linked nodes with cheap splices.
- Default to `vector`. Measure before you pick a `list`.
- A comparator answers "should `a` come before `b`?" It must be a strict weak ordering, so never use `<=`.
- A `priority_queue` is a binary heap in a vector. `top()` is O(1), and `push` and `pop` are O(log n).
- `std::stable_sort` keeps equal elements in their original order. `std::sort` does not promise that, and is usually faster.
- The erase-remove idiom is `v.erase(std::remove(...), v.end())`. `remove` moves keepers forward, and `erase` removes the leftovers.
- `reserve(n)` allocates memory without creating elements. `resize(n)` creates or destroys elements.
