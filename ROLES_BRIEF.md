# Interview-prep video scripts for micro1 roles (non-C++ series)

Read `BRIEF.md` first: format, layout, spoken-text and validator rules ALL still apply. This file only adds/overrides.

## Who watches and why
The viewer has applied to micro1 contract roles (Backend SWE, Software Engineer, Competitive Coder, Puzzle Solver,
Frontend/UI, AI evaluation). micro1 screens with (1) a ~30 min AI voice interview (Zara) asking technical
concepts and experience out loud, getting harder fast, then (2) a ~30 min timed LeetCode-style coding test.
The job itself: writing hard, realistic coding tasks + deterministic verifiers + reference solutions for AI training.
So every video must leave the viewer able to (a) EXPLAIN the concept out loud in 30–60 seconds and (b) USE it.
The viewer knows C++ well; other languages are fine in examples.

## Files
- Script: `scripts/<id>.json`, with `"id": "<id>"`, `"num": N`, `"series": "<Series>"` (shown on screen as "Backend · 3").
  ids: be01.. (series "Backend"), sw01.. ("SWE"), cp01.. ("DSA"), fe01.. ("Frontend"), ai01.. ("AI Eval").
- `"question"` = the interview question as the interviewer would ask it.
- Code panel language comes from `"file"`: `app.py`, `server.ts`, `query.sql`, `Main.java`, `main.cpp`, `App.tsx`, `run.sh`.
  DSA/competitive videos: C++ (`sol.cpp`), short and contest-style. Backend: mostly Python or TypeScript + SQL.
  Frontend: TypeScript/TSX. Keep panels ≤ 16 lines.
- Validate: `node validate.mjs scripts/<id>.json` until `ok`. Don't run TTS/build/render.

## Content
- One concrete worked example as spine (a request flowing through boxes, an index lookup, a window sliding over an array,
  a heap updating). Use `diagram` heavily: boxes = servers/DB/cache/array cells/graph nodes, `changes` to animate state.
- For DSA: state the pattern's trigger ("sorted array + pair condition → two pointers"), walk the example step by step
  with diagram changes, show the code, give complexity, name 2–3 classic LeetCode problems that use it (in `say`).
- Include the follow-up the interviewer asks next ("what if it doesn't fit in memory?", "how would you scale this?").
- `take` scene = the 2–3 sentence answer to say out loud.
- Correctness: real HTTP status codes, real SQL, real complexities. Code must be correct. If unsure, say less.

## Extra spoken conventions
- Spell acronyms with spaces: `H T T P`, `A P I`, `S Q L`, `J S O N`, `J W T`, `C P U`, `T C P`, `D N S`, `C S S`, `D O M`, `L L M`.
  (Captions auto-join spaced capitals.) Complexity: `O of n log n`, `O of n squared`.
- camelCase identifiers: say them as words and add caps, e.g. `"caps": [["use effect", "useEffect"]]`.
- Never put symbols in `say` (`=>`, `===`, `()`, `[]`, `{}`, `<>`).

## Topic list (write exactly these, in this order)
### Backend (be)
1 What happens when a client calls your API — request lifecycle (DNS, TCP/TLS, load balancer, app, DB, response)
2 REST API design: resources, methods, status codes, idempotency
3 Database indexes: how a B-tree index makes lookups fast, and when indexes hurt
4 Transactions, ACID and isolation levels (lost update example)
5 SQL vs NoSQL: how to choose
6 The N+1 query problem and reading a query plan (EXPLAIN)
7 Caching: cache-aside, TTL, invalidation, Redis
8 Authentication: sessions vs JWT, password hashing, OAuth in one picture
9 Rate limiting with a token bucket
10 Message queues and background jobs: at-least-once delivery, idempotent consumers
11 Scaling a service: vertical vs horizontal, stateless apps, replicas, sharding
12 Consistency: CAP and eventual consistency explained with replicas
13 Race conditions in backends: locks, optimistic locking with a version column
14 System design walkthrough: a URL shortener
15 Debugging a slow production endpoint: logs, metrics, traces, profiling
### SWE (sw)
1 Big-O: analysing your code out loud
2 Processes, threads, and async/await (event loop)
3 OOP and SOLID with one refactoring example
4 Design patterns that actually come up: strategy, factory, observer, dependency injection
5 Testing: unit vs integration vs end-to-end, mocks, deterministic tests
6 Hunting a subtle bug: reproduce, minimize, bisect (git bisect)
7 Refactoring legacy code safely: characterization tests, small steps
8 Performance optimization: measure first, algorithmic wins vs constant factors
9 Python gotchas interviewers love: mutability, default arguments, GIL, generators, decorators
10 Git: merge vs rebase, resolving conflicts
11 Designing a coding task with a deterministic verifier (accept any correct solution, reject hard-coding)
12 Talking about your projects: the STAR method for "tell me about a hard bug"
### DSA (cp)
1 Reading constraints: n → allowed complexity (the 10^8 operations rule)
2 Hash maps: two-sum and frequency counting
3 Two pointers
4 Sliding window
5 Prefix sums and difference arrays
6 Binary search, and binary search on the answer
7 Stacks and the monotonic stack
8 Heaps: top-k and merging sorted lists
9 BFS and DFS on graphs and grids
10 Dijkstra's shortest path
11 Union-Find (disjoint set union)
12 Dynamic programming from scratch: recursion → memo → table
13 Classic DP: knapsack, LIS, LCS
14 Greedy algorithms and the exchange argument (interval scheduling)
15 Backtracking: subsets, permutations, pruning
16 Topological sort
17 Bit manipulation tricks and bitmask subsets
18 Number theory for contests: modular arithmetic, fast power, sieve, gcd
19 Fenwick tree and segment tree (range queries)
20 Tries for prefix problems
### Frontend (fe)
1 How the browser renders a page: DOM, CSSOM, layout, paint, reflow
2 The JavaScript event loop: microtasks vs macrotasks
3 Closures, scope and `this`
4 Promises and async/await, error handling
5 React rendering and reconciliation; why keys matter
6 Hooks: useState, useEffect dependencies, stale closures
7 React performance: memo, useMemo, useCallback, virtualization
8 State management: lifting state, context, external stores
9 TypeScript: types vs interfaces, generics, narrowing, utility types
10 CSS layout: box model, flexbox vs grid, specificity
11 Accessibility basics: semantic HTML, labels, keyboard, ARIA
12 Web performance and security: Core Web Vitals, XSS, CSRF, CORS
### AI Eval (ai)
1 How an LLM works, just enough to evaluate one: tokens, next-token prediction, temperature
2 Grading LLM answers: rubrics, correctness, instruction following, pairwise comparison
3 Evaluating AI agents: trajectories, tool calls, success criteria
4 Common model failures: hallucination, sycophancy, reward hacking, how to catch them
5 AI safety and privacy: jailbreaks, prompt injection, PII, data protection
6 Human data for AI: annotation guidelines, consistency, why RLHF needs careful labels

## MUST: easy to follow, useful right before an interview
- Start from zero: first teaching scene gives an everyday analogy (restaurant kitchen for a server, library index for a DB index), then the real thing.
- One idea per scene. Define every term the moment it appears. No jargon stacks.
- Slow and visual: every key sentence has something appear or change on screen at that moment (cues). Never a static screen with long narration.
- Concrete numbers and names in the example (users table, 1 million rows, array [2,7,11,15], target 9), not abstract.
- Second-to-last scene "In the interview": a short compare/flow or code-notes scene with
  (1) the likely follow-up questions and a one-line answer to each, (2) the one mistake candidates make.
- `take` = exactly what to say out loud, 2–3 short sentences.
- Total length 2–3 minutes. If a topic is too big, cover the core well and skip the rest.
### DSA additions (cp, continue numbering)
21 Sorting I: how sorting works — insertion sort (why O(n^2)), merge sort (divide and conquer, O(n log n), stable)
22 Sorting II: quicksort and partitioning, what std::sort really is (introsort), stable_sort, custom comparators, counting sort when values are small
23 Linked lists I: nodes and pointers, insert/delete at head and middle, linked list vs array (cache, O(1) insert, O(n) access)
24 Linked lists II: interview techniques — reverse a list, fast/slow pointers (middle, cycle detection), merge two sorted lists, the dummy head node
