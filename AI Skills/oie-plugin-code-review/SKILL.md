---
name: oie-plugin-code-review
description: Review OIE/Mirth (or general Java) plugin/server code the way an experienced, AI-skeptical developer would: code smells, stray/unused declarations, error handling, resource and thread safety, database access and transactions, migration safety, security, serialization, API contracts, tests, static-analysis findings, and OIE plugin-specific gotchas. Run before a release or when asked to review Java/plugin code. For channel/template JavaScript (Rhino), use the oie-channel-code-review skill instead.
disable-model-invocation: true
allowed-tools: Grep Read Bash
---

# Irritable Developer Check — Java / OIE plugin code

Review code the way an experienced, AI-skeptical Java developer would before signing off on a release. Be specific and cite `file:line`. Favor catching real problems over being agreeable.

> **Credit:** adapted from the **"Irritable Developer Check" by [@pacmano1](https://github.com/pacmano1)** —
> the checklist and its hard-won judgment are his. This is the **Java / plugin** half; channel/template
> JavaScript (Rhino) review lives in the companion **`oie-channel-code-review`** skill (different runtime,
> different rules). Thank you.

**First, ask which scope to review, and wait for the answer before reviewing anything:**

- **Recent work**: uncommitted changes plus recent commits. Check `git status` and `git diff`, diff against the base branch (e.g. `git diff main...`), and for committed work use `git diff HEAD~1` or the branch's commit range. Then widen to the files and declarations those changes touch.
- **Full source tree**: the entire codebase, not just what changed.

Ask this as a quick either/or up front. Only skip the question if the user already told you which scope they want. If the project is not a git repo, ask for the paths to review.

## Reviewer self-check `[BIAS]`

Before reporting, check yourself. These are the ways an AI reviewer gives a wrong answer, and they matter more than any single code rule.

- **False positives to look thorough**: don't invent findings so the review feels diligent. A clean category reported clean is a real result. Never manufacture concern to fill space.
- **Confident fabrication**: don't claim a library has a method, or that code does X, from memory. Read the line or grep for it first. Cite the `file:line` you actually looked at, not what you assume is there.
- **Sycophancy**: when the author explains or defends the code, re-check against the code, not the explanation. Agreement is not verification. Hold the finding until the code changes your mind, not the argument.
- **Over-engineering as "improvement"**: do not flag "this could be a strategy pattern / dependency injection / an interface" when the direct code is correct. Complexity is a cost. Flag simplification, never elaboration.
- **Novelty bias**: don't push the newest idiom because it is new. A record, stream, or switch expression is a tool, not a goal. Recommend it only when it is clearly better here.
- **Theory-chasing / anchoring**: don't latch onto the first plausible cause and chase it. Confirm the actual root cause before proposing a fix. (The classic trap: days lost on TLS/cipher theories when the real bug was `const`/`let` in a compiled Rhino loop.)
- **Severity inflation**: don't dress a cosmetic nit as a bug. Separate correctness from taste, and say which is which.
- **Imposing mainstream idioms over the codebase's own conventions**: match the surrounding code, don't normalize it to the "standard" way you were trained on. The canonical trap here is rewriting working OIE code to use `const`/`let` when the module deliberately uses `var` for Rhino compatibility.
- **Rule-gaming instead of fixing**: treat a change that adds `@SuppressWarnings`, `//NOSONAR`, or loosens a Checkstyle/SpotBugs/PMD/IntelliJ rule to make a violation pass as a finding in itself, not a resolution. Suppressing the alarm is not fixing the fire.
- **Prematurely dismissing real findings**: watch yourself using "pre-existing," "out of scope," or "we'll fix it later" to wave away a genuine problem. Report it and let the author decide; don't rationalize it out of the review.

## Code smells `[SMELL]`

- **Duplicated logic**: near-identical methods that should share a traversal, visitor, or callback.
- **Too many parameters**: methods with 5+ params that should take a request/config object or a builder.
- **God classes**: one class doing everything, 500+ lines.
- **Magic numbers/strings**: hardcoded values without constants or explanation.
- **Commented-out code**: dead code left "just in case."
- **Inconsistent naming**: mixing conventions (`getData` vs `fetchInfo` vs `retrieveResult` for the same pattern).
- **Code that "looks generated"**: repetitive structure, boilerplate-heavy, em-dash-laden prose, or patterns a human wouldn't write.
- **Deep nesting**: 4+ levels of `if`/`for`/`try` that should be flattened with guard clauses and early returns.
- **Long methods**: a single method running ~50+ lines through many sequential steps that should be extracted, even when the enclosing class is small.
- **Comments that restate the code**: `count++; // increment counter`. A comment should capture intent or the reason, not narrate the obvious; redundant narration is a classic generated-code tell.

## Strays: leftover or unused declarations `[STRAY]`

- **Unused declared dependencies**: every dep in `pom.xml` / `build.gradle` / `package.json` / `Cargo.toml` should actually be imported. For each declared dep, `grep -rln "import .*<libname>"` across `src/` and `test/`; zero hits means delete the dep AND its version property. A `WARNING` about a transitive POM often traces back to an unused direct dep. (Real example: `org.reflections:reflections:0.9.10` was a test dep no test imported; deleting it killed a javassist POM warning for free.)
- **Unused imports**: check every touched file.
- **Unused locals, parameters, private fields, and private methods**: declared but never read or called. Confirm with "Find Usages" or `grep -rn "name"`.
- **Orphan files**: source files no longer referenced by any classpath / module / build config; common after a refactor or rename.
- **Stale TODO / FIXME comments**: references to resolved issues, dropped features, or dead tickets.
- **Config keys / properties that nothing reads**: settings in `application.properties` / `*.yml` / `pom.xml` `<properties>` never accessed by code. The version property left dangling after deleting its consumer is the canonical case.
- **Empty packages / directories**: left behind after the last file moved or was deleted.
- **Committed build artifacts or binaries**: `target/`, compiled `.class` files, generated jars, IDE output, or large binaries that belong in `.gitignore`, not the tree.
- **Vendored source pasted into the tree**: upstream helper classes copied into `src/` that no dependency manifest tracks, so nobody patches them and they rot. Distinct from a declared-but-unused dependency.

## Error handling `[ERROR]`

- **Swallowed exceptions**: empty `catch` blocks, or `catch` that only logs and continues when it shouldn't.
- **Catching too broadly**: `catch (Exception e)` / `catch (Throwable t)` where specific exceptions should be handled differently.
- **Throwing raw `RuntimeException`**: use a meaningful custom or standard exception.
- **Dropping the cause when wrapping**: `throw new SomeException(msg, e)`, never `new SomeException(e.getMessage())` (loses the stack trace).
- **Swallowing `InterruptedException`**: at minimum restore the flag with `Thread.currentThread().interrupt()`; don't silently ignore it.
- **Exceptions for control flow**: throwing/catching to handle expected, non-exceptional cases.
- **`return` or `continue` inside `finally`**: silently discards exceptions and surprises everyone.
- **External calls with no timeout or bad retry logic**: network/HTTP/DB calls with no connect and read timeout hang a worker thread indefinitely; retry loops that retry non-retriable errors (4xx, auth failures) or hammer with no backoff make an outage worse. Integration and server code exists to talk to external systems, so this is a real hang-the-thread bug (the BIOTRONIK HTTPS integration is the canonical OIE case).

## Resource & thread safety `[SAFETY]`

- **Unclosed resources**: streams, connections, readers not in try-with-resources.
- **Thread safety**: mutable shared state without synchronization, non-thread-safe collections used concurrently, or a shared `SimpleDateFormat` / `DateFormat` (not thread-safe; use a local instance, `DateTimeFormatter`, or a `ThreadLocal`). Server-side code runs multi-threaded.
- **Reach for `java.util.concurrent`**: prefer `ConcurrentHashMap`, `Atomic*`, and `ExecutorService` over hand-rolled synchronization or raw `Thread`s.
- **Leaked executors/threads**: an `ExecutorService` or thread pool not shut down on `stop()` or a shutdown hook; ties into the lifecycle contract.
- **Synchronizing on the wrong lock**: a public field, a mutable object, a `String` literal, or a boxed `Integer`.
- **Wasteful instantiation**: creating expensive objects per-request when they could be shared (mind the thread-safety caveat above).
- **Ignored `Future` from `submit()`**: discarding the `Future` returned by `ExecutorService.submit()` swallows any exception the task threw; keep it and check it, or use `execute()` deliberately with its own error handling. Same for an unhandled `CompletableFuture` exceptional path.
- **Connection-pool misconfiguration**: if the code manages its own JDBC pool, watch for a max-lifetime/recycle set above the database's `wait_timeout` (stale connections after idle or failover), no validation/pre-ping, or an undersized pool paired with long transactions (exhaustion under load). These are classic, hard-to-reproduce production failures.

## Database access & transactions `[DATA]`

Much of this code runs against relational databases over JDBC, often from many threads at once. None of this is browser-tier concern; it is where server-side Java actually breaks under load.

- **N+1 / query in a loop**: one round-trip per item where a single set-based or batched query belongs. OIE transformers iterate HL7 segments and messages, so a per-item lookup turns one message into hundreds of queries.
- **Per-row `execute()` instead of a batch**: many single `PreparedStatement.execute()` calls where `addBatch()` / `executeBatch()` is far faster and lock-lighter for bulk inserts.
- **Long or wide transactions**: a transaction held open across parsing, transformation, or I/O, pinning a connection and holding locks. Keep transactions short.
- **External work inside an open transaction**: an HTTP call, message publish, or async operation made while a DB transaction is live pins the connection for the whole call and risks partial state. Do the external call before opening the transaction where possible.
- **Publish-before-commit (dual-write)**: emitting a message or event and then hitting a DB error that rolls back, leaving an emitted message with no committed record behind it.
- **No statement/query timeout**: a `Statement`/`PreparedStatement` with no `setQueryTimeout`, and no server-side statement timeout. One hung query blocks a worker thread and can stall the pipeline (an OIE channel, a request handler, a batch job).
- **Deadlock-prone lock ordering**: code paths that lock rows in different orders with no bounded retry on deadlock or lock-wait. Parallel messages writing the same tables will deadlock under load otherwise.
- **`SELECT *` / over-fetching in hot paths**: selecting every column wastes the buffer pool, over-fetches PHI, and breaks silently when the schema changes. Select the columns you use.
- **Deep `OFFSET` pagination**: `LIMIT ... OFFSET n` on a large table scans and discards `n` rows and degrades linearly; use keyset/cursor pagination for batch jobs.
- **Dialect-specific SQL assumed portable**: upsert syntax, `SHOW REPLICA` vs `SHOW SLAVE`, MySQL vs MariaDB row-alias forms. OIE connects to Oracle, SQL Server, MySQL/MariaDB, and Postgres, so hardcoded dialect syntax is a correctness trap.

## Database migration safety `[MIGRATE]`

For any code that ships schema changes or migrations. Most of these look harmless in the diff and only bite in production or on the next fresh environment build.

- **`NOT NULL` column added without a default**: locks the table and rewrites every row. Add nullable, backfill, then add the constraint.
- **Index built without `CONCURRENTLY` (Postgres) or online DDL (MySQL)** on a large table: blocks writes for the whole build.
- **DDL and DML mixed in one migration**: hard to roll back and produces long transactions; separate schema and data changes.
- **Editing an already-deployed migration**: deployed migrations are immutable. Altering one causes environment drift; fix forward with a new migration.
- **Large backfill in a single transaction**: works on 100 rows, locks on 10M. Batch it with progress.
- **Irreversible migration with no rollback path**: no `DOWN`, not marked irreversible, and no documented restore. Convert "we can undo it" into a checked artifact.
- **Dropping or renaming a column before its consumers are gone**: the app errors on the missing column. Use expand-contract: add the new, migrate readers/writers, then remove the old.
- **Relying on ORM auto-DDL or drop-and-create in production**: schema mutated on startup silently diverges across environments or destroys data. Ship versioned, additive, backward-compatible migrations instead.

## Security `[SECURITY]`

Higher stakes here: this is often server code that handles HL7/PHI and talks to databases.

- **SQL built by string concatenation**: use `PreparedStatement` with bound parameters, never string-interpolated SQL.
- **Unsafe deserialization**: XStream or Java `ObjectInputStream` on untrusted input is an RCE vector. Allow-list types (that is what `ObjectXMLSerializer.allowTypes()` is for); never deserialize attacker-controlled bytes blind.
- **Logging secrets, PII, or PHI**: never log credentials, tokens, or HL7 message content. Healthcare data does not belong in logs.
- **Hardcoded secrets**: credentials, keys, or tokens in source or config that should come from a secret store.
- **Weak randomness**: `java.util.Random` where security matters; use `SecureRandom` for tokens, IDs, or anything that must be unguessable.
- **XXE / unsafe XML parsing**: disable external entities and DTDs on parsers handling untrusted XML.
- **Path traversal**: validate and normalize any file path built from external input.
- **SSRF via message- or config-controlled outbound URLs**: an outbound HTTP host or URL built from HL7 message content or channel config lets an attacker reach internal services or cloud metadata endpoints. Allow-list target hosts.
- **Command injection**: `Runtime.exec` / `ProcessBuilder` / external-script invocation with arguments built from message or user input. Use an argument array, never a concatenated shell string.
- **Leaking internals in responses or errors**: stack traces, SQL text, internal paths, or PHI returned to a caller, shown in the panel, or shipped to an error-tracking/APM service. Return a generic message with an opaque ID; log the detail server-side only. This is distinct from the "don't log PHI" rule; it is about what leaves the server.
- **PHI in URLs or query strings**: patient identifiers (MRN, name, national ID) placed in the path/query of an outbound HTTP call land in proxy and server logs. Use opaque IDs or the request body.
- **PHI not encrypted in transit or at rest**: TLS missing on a JDBC link or endpoint that carries PHI, or stored messages/attachments left unencrypted. PHI in HL7 rows travels cleartext between OIE and the database otherwise.
- **Over-privileged DB account**: the runtime connection using an admin or `ALL PRIVILEGES` grant turns any SQL-injection or logic bug into a full-schema blast radius. Separate the runtime user from migration/admin work.
- **Trusting forwarded headers for security decisions**: reading `X-Forwarded-For` for auth, rate limiting, or audit without a trusted-proxy setup is trivially spoofed on an HTTP Listener connector.
- **Unverified webhook/callback payloads**: verify the signature before parsing or trusting any field of an inbound callback.
- **Known-vulnerable dependencies**: run OWASP Dependency-Check / Snyk and fail on published CVEs in declared deps. Distinct from the unused-dep hygiene in `[STRAY]`; a shipped dependency can be used and still be a CVE.

## OIE / Mirth plugin-specific `[OIE]`

- **Classpath conflicts**: bundling dependencies the OIE server already provides (commons-lang, log4j, etc.); shade or exclude them.
- **Plugin lifecycle misuse**: not respecting `start()`/`stop()` contracts, leaking resources on stop, or doing heavy work in the constructor.
- **Logging**: use the server's logging framework, not `System.out.println` / `System.err.println`; prefer parameterized logging (`log.debug("x={}", x)`) over string concatenation; use correct levels; don't log-and-rethrow (double logging). Never log secrets or PHI (see `[SECURITY]`).
- **Missing `ObjectXMLSerializer` allow-list registration**: every plugin that defines its own `ConnectorProperties` (or any XStream-serialized class) MUST register them via `ObjectXMLSerializer.getInstance().allowTypes(...)`, from both the client entry point (panel constructor) and the server entry point (servlet + dispatcher static block). Without it, channel saves silently break, most visibly as spurious "another user has edited" errors on brand-new channels. Grep for `allowTypes` in `shared/`; if absent, add a `SerializationController`.
- **Unguarded servlet endpoints**: every custom servlet operation a plugin registers must enforce the server's auth/role check, deny-by-default. An operation that exposes data or an action with no authorization gate is a direct PHI or auth-bypass exposure.
- **Plaintext stored connector credentials**: endpoint passwords and API secrets in `ConnectorProperties`/config must go through OIE's `Encryptor` (reversible, since they are replayed to endpoints), never stored or serialized in plaintext. Distinct from the hardcoded-secrets rule; this is about runtime-stored credentials.
- **Non-idempotent reprocessing**: OIE channels redeliver and reprocess messages by design. Writes, jobs, and inbound handlers must be safe to run twice. A plain `INSERT` on reprocess that should be an upsert or a dedup-guarded write is a real defect class here.
- **No fail-fast startup validation**: validate required config and prove dependency connectivity in `start()` and fail loudly, rather than surfacing an NPE or connection error mid-message. Ties into the lifecycle contract above.
- **No audit trail for PHI access**: reads, writes, prints, and exports of patient data should be auditable (who, what, when) via an insert-only log. A plugin that routes or transforms records with no audit hook is a compliance gap.
- **Unreviewed PHI egress**: any path that ships PHI to an external service (cloud API, LLM provider, analytics, error tracker) needs a confirmed BAA-covered destination, or redaction / a non-PHI event model. OIE routes data outward by design, so unreviewed egress is a real HIPAA exposure.

## API design & contracts `[API]`

- **Boolean parameters**: `doThing(true, false, true)` is unreadable at the call site; use enums or a config object.
- **Stringly-typed code**: `String` where an enum, type, or value object belongs.
- **Missing `@Override`**: overriding without the annotation.
- **Returning `null` for a collection or array**: return an empty one (`List.of()`, `Collections.emptyList()`) so callers don't have to null-check.
- **No fail-fast validation**: use `Objects.requireNonNull(x, "x")` on constructor/method params instead of letting a later NPE surface far from the cause.
- **`Optional` misuse**: use it as a return type, not for fields or parameters.
- **Leaking internal mutable state**: hand back a defensive copy or unmodifiable view instead of the internal array/collection; copy mutable inputs you store.
- **Declaring concrete types**: declare fields and returns to interfaces (`List`, `Map`), not implementations (`ArrayList`, `HashMap`).

## Serialization & validation `[SERDE]`

- **Hand-rolled serialization**: writing JSON/CSV/XML by hand when a library is on the classpath.
- **Incomplete escaping**: HTML, JSON, or SQL escaping that misses characters.
- **Missing input validation**: e.g. invalid regex surfacing as a raw exception instead of a user-friendly message.
- **Breaking a persisted/serialized format**: renaming, removing, or retyping a field in an XStream-serialized `ConnectorProperties` (or any persisted format) breaks already-saved channels with no migration or version guard. High-impact and OIE-specific; the failure shows up as channels that silently won't load.

## Reinvention `[REINVENT]`

- **Old-school workarounds**: `int[]` as a mutable holder instead of `AtomicInteger`, raw strings instead of enums.
- **Reinventing the wheel**: utilities that already exist in dependencies or `java.util`.
- **Not using available Java 17 idioms**: a verbose data class where a `record` fits, a long `if/else` chain where a switch expression reads cleaner, manual string building where a text block is clearer. Consider them; don't force them (a plain loop often beats a contrived stream).
- **Boolean-flag soup for mutually exclusive states**: carrying `isLoading` / `hasError` / `result` fields that allow contradictory combinations. Model the states with a sealed interface or enum so impossible states are unrepresentable.

## Tests `[TEST]`

- **New or changed logic with no test.**
- **Tests that never assert**, or assert nothing meaningful.
- **Disabled, ignored, or empty tests** left in the suite.
- **Testing implementation details** instead of observable behavior.
- **A bug fix with no regression test that would have caught it**: the accompanying test must fail without the fix, not merely pass after it. Ask whether the test proves the bug, or was written to match the new code.
- **Order-dependent tests**: tests that share mutable static state or depend on execution order, the classic "passes alone, fails in the suite." Common with shared JUnit fixtures.
- **Happy-path-only coverage**: no test for the null, empty, oversized-input, or exception branches. OIE handlers especially need the failure branch tested.
- **Vague test names**: `works()` / `test1()`. A name should state the scenario and the expected outcome.

## Static-analysis / IntelliJ inspections `[STATIC]`

Run the real tools first when they exist: the build, the linter, existing static analysis (`mvn`/`gradle` compile and any configured inspections). Report what the tools actually said. Only fall back to eyeballing for what no tool is configured to catch. Don't claim "tests pass" or "it compiles" unless you ran it.

The things IntelliJ (default profile plus a few stricter inspections) would underline. Many are real bugs, not just style. (Unused declarations live under `[STRAY]`; thread-unsafe shared state lives under `[SAFETY]`.)

**Likely bugs:**

- **`==` on Strings or boxed types** instead of `.equals()`: use `Objects.equals(a, b)` for null-safety.
- **Possible `NullPointerException`**: dereferencing a value that can be null; `Optional.get()` without an `isPresent()` / `isEmpty()` check.
- **`float`/`double` for money**: use `BigDecimal`; binary floating point can't represent currency exactly.
- **Integer overflow**: large `int` arithmetic that should be `long`, or use `Math.*Exact`. Compare floating-point with a tolerance, not `==`.
- **Ignored return value**: discarding the result of a side-effect-free method (`str.trim();`, a `stream()` with no terminal op).
- **Constant conditions**: conditions always true or false; unreachable code.
- **`switch` with no `default`, or unintended fall-through.**
- **Missing `serialVersionUID`** on a `Serializable` class.
- **Locale-sensitive calls without a Locale**: `toUpperCase()` / `toLowerCase()` / `String.format()` that should pin `Locale.ROOT`.

**Cleanup / redundancy:**

- **Redundant cast, redundant `else` after `return`, redundant `throws`, unnecessary boxing/unboxing.**
- **Diamond operator**: `new HashMap<String, String>()` can be `new HashMap<>()`.
- **Raw types**: `List` where `List<T>` is meant.
- **`isEmpty()` over `size() == 0`**; `String.isBlank()` where appropriate.
- **String concatenation in a loop**: use `StringBuilder`.
- **Field could be local; method could be `static` or `private`; field or class could be `final`.**
- **`equals()` without `hashCode()`** (or the reverse).
- **Deprecated API usage.**

## Six-month regrets `[REGRET]`

What will we be kicking ourselves for in six months? Not bugs, decisions whose cost arrives later. For each hit, name the future moment it bites ("the first Dependabot PR", "the next Gradle major", "when the cert rotates").

- **Processes that assume a human starts them**: any workflow that breaks the moment a bot, cron job, or new hire triggers it instead of the author. (Canonical case: a checksum-verification gate that fails every automated dependency-bump PR until a human runs a ritual by hand.)
- **Protection by procedure instead of mechanism**: safety that exists only because docs say "remember to run X before Y." Discipline decays; nothing enforces it. Ask what converts the habit into a check.
- **Documented bridges nobody walks**: an escape hatch or migration path written down but never exercised ("we'll enable it per-library during upgrades"). If no one has walked it once, assume it's a wall with a sign on it.
- **Friction that compounds**: a cost that's fine once but lands weekly: a ten-minute manual step per dependency bump, hand-enumerating transitive deps per new library. Multiply by the real frequency before calling it acceptable.
- **Loosened screws with a timer**: something relaxed because it's harmless *under current assumptions* (a verification scope narrowed, a check disabled "since we don't use that path"). When the assumption changes, nobody will remember the screw. Demand a re-tighten trigger in writing.
- **Pinned to a dying line**: dependencies on an EOL release train (fixes only exist in the next major), dead upstreams with no version to bump to, or libraries whose upgrade path crosses a license cliff (iText 2.x → AGPL is the classic).
- **"Temporary" with no removal trigger**: stubs, tombstones, suppression entries, `.skip`/`@Ignore`, compatibility shims, with no condition or date for removal. Temporary plus no trigger equals permanent.
- **Follow-ups that exist only in conversation**: "we'll do that later" with no filed issue number. No number, no later.
- **Reasoning that lives outside the repo**: decisions explained only in chat, PR comments, or a contributor's memory. The "why is this line like this" archaeology of the future needs it in a committed doc or an ADR.
- **Point-in-time evidence presented as ongoing**: baselines, benchmarks, or audits anchored to a moment, without a clear statement of what's frozen versus what re-verifies continuously. Six months on, someone will cite the stale number as current.
- **Architectural change with no ADR**: a PR that adopts a new framework, library, database, pattern, or schema-design choice with the rationale living only in chat or PR comments. Sharpen the "reasoning outside the repo" point into a concrete trigger: this decision needs an ADR.
- **Stale ADR not marked superseded**: a decision doc that no longer matches the code, with no link to its replacement. A silently-wrong "why" doc is worse than none.

## Reporting findings

Open with a one-line verdict: ship / ship with caveats / block, and the one or two risks that drive it. Then the findings.

Tag each finding with its category and give a location. Tags: `[SMELL]`, `[STRAY]`, `[ERROR]`, `[SAFETY]`, `[DATA]`, `[MIGRATE]`, `[SECURITY]`, `[OIE]`, `[API]`, `[SERDE]`, `[REINVENT]`, `[TEST]`, `[STATIC]`, `[REGRET]`.

Tag each finding with its category, a **severity** (`[Blocker]` / `[Should]` / `[Nit]`), and a **confidence** (`[Confirmed]` = you read the code or ran it; `[Suspected]` = needs a closer look). Labeling a guess as `[Suspected]` is required, not optional. Sort findings by severity, worst first.

Some findings are automatically `[Blocker]` regardless of judgment: missing auth on an endpoint exposing sensitive data or PHI, secrets committed to source or written to logs, a non-idempotent path that retry or reprocessing will double-execute, or a high-impact change with no rollback.

1. **[SECURITY][Blocker][Confirmed] SQL built by string concatenation in `Dao.lookup`** (`Dao.java:88`): switch to a `PreparedStatement` with bound params.
2. **[STRAY][Should][Confirmed] Unused dependency `commons-codec` in `pom.xml`**: no import hits; remove the dep and its `<version>` property.
3. **[OIE][Blocker][Confirmed] Missing `ObjectXMLSerializer.allowTypes()` for a custom `ConnectorProperties`**: channel saves will break; register in client + server entry points.
4. **[REGRET][Should][Confirmed] Dependency bumps need a manual metadata ritual** (`CONTRIBUTING.md`): every future Dependabot PR fails CI until a human runs it; bites at the first bot-generated bump. File the CI auto-regen issue now.

If a category is clean, say so briefly. "Clean on strays and error handling" is itself a useful result; don't pad with vague concerns.
