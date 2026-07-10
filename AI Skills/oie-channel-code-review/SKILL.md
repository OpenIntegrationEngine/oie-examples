---
name: oie-channel-code-review
description: Review OIE/Mirth channel & code-template JavaScript (the Rhino runtime) the way an experienced, AI-skeptical developer would — Rhino/ES5 constraints and the one real block-scoping trap, E4X/HL7 field access, scope-map lifetime, per-message cost, unclosed DB connections, PHI in logs, and channel test coverage. Run before deploying a channel or when asked to review transformer/filter/code-template JS. For Java/plugin/server code, use the oie-plugin-code-review skill instead.
disable-model-invocation: true
allowed-tools: Grep Read Bash
---

# Irritable Developer Check — OIE channel / JavaScript (Rhino)

Review channel and code-template JavaScript the way an experienced developer would before deploying it. Be
specific and cite `file:line`. Favor catching real problems over being agreeable.

> **Credit:** adapted from the "Irritable Developer Check" by [@pacmano1](https://github.com/pacmano1).
> This is the **channel/JavaScript (Rhino)** half; Java/plugin/server review lives in the companion
> **`oie-plugin-code-review`** skill (different runtime, different rules).
>
> **Note for review:** the `const`/`let` rule below has been **changed** from the original ("`var` only,
> never `const`/`let`") to target the *actual* Rhino bug while keeping modern block scoping. Reconcile with
> pacmano1 before this ships.

**First, ask which scope to review, and wait for the answer:** recent changes (git diff) vs. the full set of
channel/template scripts. If it's not a git repo, ask for the paths (exported channel XML, code-template
files, or a `src/` of deployed JS).

## Principle: follow JS best practice; deviate only where Rhino forces it
Channels, code templates, transformers, and filters run as JavaScript on **Rhino** (ES5-era, partial ES6,
compiled to JVM bytecode) with **Java interop**. That forces a *specific, documented* set of deviations from
modern JS — listed below. **Flag violations of those forced rules.** Do **not** flag modern JS that runs
fine on Rhino, and do **not** push `var`-for-its-own-sake or other downgrades: over-correcting away from
best practice is its own smell. Every forced deviation should be understood (and ideally commented) as *why*,
not cargo-culted.

## Reviewer self-check `[BIAS]`
Before reporting, check yourself — these matter more than any single rule.
- **False positives to look thorough**: don't invent findings to seem diligent. A clean category reported clean is a real result.
- **Confident fabrication**: don't claim a global exists or that code does X from memory. Read the line or grep for it; cite the `file:line` you actually looked at.
- **Sycophancy**: when the author defends the code, re-check the code, not the argument. Hold the finding until the code changes your mind.
- **Over-engineering as "improvement"**: don't flag "this could be a class/framework" when the direct code is correct. Flag simplification, never elaboration.
- **Theory-chasing / anchoring**: confirm the actual root cause before proposing a fix. (Classic trap: days lost on TLS/cipher theories when the real bug was a `const` reused inside a compiled Rhino loop.)
- **Imposing mainstream idioms over what runs on Rhino**: match the runtime's reality. But the inverse is also a bug — don't downgrade correct, Rhino-safe modern JS to legacy forms out of superstition.
- **Severity inflation**: separate correctness from taste; say which is which.
- **Prematurely dismissing real findings**: don't wave a genuine problem away as "pre-existing" or "later." Report it; let the author decide.

## Rhino runtime rules `[RHINO]`
These differ from Java and catch bugs the Java sections never will. Confirm exact signatures/globals against
the OIE version in use.

- **Block scoping inside loops — the one real trap.** Default to `const`/`let` (modern best practice: no
  hoisting surprises, no accidental reassignment). The *forced* exception: Rhino mis-compiles a `const`/`let`
  **declared inside a loop body and reused across iterations** — it hoists the binding to function scope, so
  every iteration silently shares one value, with no error thrown (canonical case: a `while` loop over HTTP
  response headers returned six identical `Date` values). **Flag `const` declared inside a loop body; require
  `let` there** so the per-iteration assignment takes effect. Do **not** flag `const`/`let` at function
  scope, and do **not** rewrite working code to `var` — that discards block-scoping safety to dodge one bug.
  (Some report the mis-alias in `if`/`switch` blocks too on certain builds — verify against your Rhino
  version; when a binding declared inside any block is reused and behaves oddly, this is the first suspect.)
- **No template literals, `async`/`await`, `Promise`, optional chaining `?.`, nullish `??`, spread, or
  `for...of`** — Rhino's partial ES6. Flag these as runtime-breakers; use `+`/`.join()`, callbacks/retries,
  a `$t(() => …)` try/catch helper, `||`, and indexed/`.forEach()` loops instead. (These are forced
  deviations, not style — see the principle above.)
- **Use the channel `logger`, not `System.out`/`System.err`** — output goes through the provided `logger` at
  the right level, never `println`. And never log HL7 content, PHI, or credentials (see `[SECURITY]`).
- **Unclosed database connections**: a connection from `DatabaseConnectionFactory` must be closed in a
  `finally`. One leak per message drains the pool and eventually wedges the channel.
- **Scope-map misuse**: `channelMap`/`connectorMap`/`sourceMap` are per-message and don't persist to the next
  message; `globalMap`/`globalChannelMap` live in memory until restart, so large/unbounded objects parked
  there are a slow leak. Pick the narrowest scope that still carries where you need it. (`globalChannelMap`
  can't store `null` — guard reads with `|| {}`.)
- **E4X / HL7 access assumes fields exist**: a missing segment/field comes back as an empty `XMLList`, not
  `null`, so `if (field == null)` never fires and a naive `.toString()` yields `""` that reads like
  real-but-empty data. Guard with an existence/length check before trusting a value.
- **Java/JavaScript type traps**: values from `msg`, the maps, or Java calls are often Java objects, not JS
  primitives. `==` between a Rhino string and a Java `String`, or between two E4X nodes, doesn't compare what
  you expect; coerce explicitly (`String(x)`, `.toString()`) and compare deliberately.
- **Per-message expense**: compiling a regex, constructing a `SimpleDateFormat`, or opening a connection on
  *every* message runs at full channel throughput. Hoist what you safely can (mind thread-safety for anything
  shared — a `SimpleDateFormat` is not thread-safe).

## Channel data access `[DATA]`
- **Query in a loop / N+1**: transformers iterate HL7 segments and messages, so a per-item DB lookup turns
  one message into hundreds of queries. Batch or set-based instead.
- **No statement timeout**: a query with no `setQueryTimeout` can hang the channel's worker thread.
- **Long/wide work inside a live connection**: keep DB work short; close in `finally` (above).

## Security `[SECURITY]`
Channels carry HL7/PHI outward by design.
- **Logging PHI/secrets**: never log message content, patient identifiers, credentials, or tokens — not even
  at debug. Healthcare data does not belong in logs.
- **SQL by string concatenation**: use parameterized queries via `DatabaseConnectionFactory`, never
  message-interpolated SQL.
- **Unreviewed PHI egress**: any HTTP/API/LLM/analytics call that ships message content to an external
  service needs a BAA-covered destination or a non-PHI/redacted model. OIE routes data outward by design, so
  unreviewed egress is a real HIPAA exposure.
- **PHI in outbound URLs**: identifiers in a path/query string land in proxy/server logs — use the body.

## Tests `[TEST]`
- **Untestable-by-design logic**: Rhino code can't run under a Node test runner directly. Pure logic should
  live in functions a test can call with **mocked OIE globals** (`msg`, maps, `logger`); flag transformers
  that bury testable logic inline with no seam.
- **Happy-path only**: no test for the missing-segment, empty-`XMLList`, or error branch — exactly where the
  E4X and type traps above bite.
- **A bug fix with no regression test that fails without the fix.**

## Six-month regrets `[REGRET]`
Decisions whose cost arrives later — name the future moment each bites.
- **Forced-deviation with no "why" comment**: a `var`/`let`-in-loop or `.join()`-instead-of-template-literal
  that a future reader will "clean up" back into a bug because nothing says it was deliberate.
- **Reasoning that lives outside the repo/channel**: why a value is coerced, why a scope map is used — if it's
  only in someone's memory, the next editor breaks it. Put it in a comment or a committed note.
- **"Temporary" channel hacks with no removal trigger**: a hardcoded endpoint, a disabled filter, a `// TODO`
  with no ticket — temporary plus no trigger equals permanent.

## Reporting findings
Open with a one-line verdict: **ship / ship with caveats / block**, and the one or two risks that drive it.
Then the findings, sorted worst-first. Tag each with its category — `[RHINO]`, `[DATA]`, `[SECURITY]`,
`[TEST]`, `[REGRET]` — a **severity** (`[Blocker]`/`[Should]`/`[Nit]`), and a **confidence**
(`[Confirmed]` = you read/ran it; `[Suspected]` = needs a closer look; labeling a guess `[Suspected]` is
required). Auto-`[Blocker]`: PHI/secrets in logs or outbound URLs, unreviewed PHI egress, a `const`-in-loop
reuse bug, or SQL built by concatenation.

If a category is clean, say so briefly — "clean on scope-maps and E4X guards" is a useful result; don't pad.
