# PostgreSQL

Runs SQL directly against a PostgreSQL database over its own wire protocol
(v3.0) — the first app in the pack that speaks a raw TCP protocol instead of
HTTP, via the platform's `ctx.socket` capability rather than `ctx.fetch`.

- **Categories** — databases
- **Auth methods** — postgres (`custom`, SCRAM-SHA-256)
- **Actions** — 1 (`query`) in this node; `execute`, the health check and the
  catalog entry (`w6w-pack.json`) are added in a follow-up node (T2.1.2),
  along with the first live run against a real server
- **Capability** — `socket: true` (`package.json`'s `w6w.capabilities`)

## There is no vendor API to call

Every other app in this pack reaches a REST or GraphQL endpoint over HTTPS.
PostgreSQL has none — it is a database, and its client protocol is a binary,
stateful TCP exchange. So this app has no `lib/client.ts` HTTP wrapper; it
has `lib/wire.ts` (frame encoding/parsing for that binary protocol) and
`lib/scram.ts` (the SCRAM-SHA-256 mutual-authentication mechanism the
protocol's login step runs). Both are implemented from PostgreSQL's own
protocol documentation, not from a driver's source — the point of this app
is to hold a database credential without ever needing a native binding.

## Two halves of one connect form

The connect form's fields are host, port, database, TLS mode, username and
password — but only **username and password** become this Auth method's
opaque, encrypted `credential` (see `exchange` in `auth/postgres.ts`).
Host/port/database/TLS mode are **non-secret** and become
`Connection.target` (a structured field the Connection RFC defines
specifically for socket-backed apps) instead: the host needs to read them —
to resolve the hostname and refuse a loopback/private-range target before it
ever dials out — without decrypting anything, and a value inside an
encrypted `credential` blob is exactly what it cannot read without doing
that.

**Assembling `Connection.target` from the submitted form is the host's job,
not this app's.** This app only declares the fields; nowhere in its code
does it construct a `ConnectionTarget` object. That split is DC-2 from this
project's plan, and it is why `auth/postgres.ts`'s `exchange` hook returns
only `{ user, password }` even though `fields` carries six keys.

## SCRAM-SHA-256, not `sign`

Every other `custom`-typed auth in this pack signs a request in one shot
inside its `sign` hook (see `azure-blob/auth/shared-key.ts`) — the whole
signature is computable from the request already in front of it. SCRAM
cannot work that way: the client's second message depends on a nonce, salt
and iteration count the *server* only reveals after the first round trip.
That is what the ABI's `handshake` hook is for — an iterative, network-less
hook the host drives one protocol round trip at a time
(`StartupMessage -> AuthenticationSASL -> AuthenticationSASLContinue ->
AuthenticationSASLFinal`), threading everything it needs through
`HandshakeStep.state` because the hook itself holds no memory between calls.

`lib/scram.ts` implements the RFC 5802/7677 algorithm; `auth/postgres.ts`'s
`handshake` hook is the glue that drives it against the actual wire frames.
Its own doc comment enumerates every hard sub-feature this hand-rolled
implementation has to get right (nonce randomness, `,`/`=` escaping, the
server-nonce-prefix check, the iteration-count floor, SASLprep's scope, and
— the step most often missing from a hand-rolled SCRAM — verifying the
server's own `v=` signature in constant time before trusting the
connection).

## No parameter binding — and no plan to fake it with string concatenation

The `query` action sends the caller's `sql` string **verbatim** as a Simple
Query (`Q`) message. There is no `$1` placeholder syntax, no `params`
array, and nowhere in this app's source does a SQL string get built by
concatenating anything into it. If that looks like a gap compared to a
"proper" SQL client, it is a deliberate one: real parameter binding is
Postgres's Extended Query protocol (Parse/Bind/Execute) — a different,
larger feature this v1 does not implement (see `out_of_scope` in this
node's contract). Building SQL safely with the string interface that exists
today is the caller's responsibility, the same as it would be handing a
string to `psql -c`.

## Every SQL, not only `SELECT`

`query`'s Simple Query message can carry any statement Postgres accepts —
`SELECT`, `INSERT`, `UPDATE`, `DELETE`, DDL, multiple `;`-separated
statements. It is marked `type: "perform"` and `idempotent: false`
accordingly (the same convention `apps/snowflake`'s `statement-execute`
uses for the same reason): a workflow author, not this app, has to judge
whether their own statement is safe to retry.

## `test` cannot make a live check

`ctx.socket` is only ever handed to an action's `execute` — never to `test`,
`afterConnect`, or any other auth-phase hook (Hook Runtime RFC's sandbox
posture table marks it `Absent` for "Other auth hooks"). Since this app has
no HTTP surface for `ctx.fetch` to reach either, `auth/postgres.ts`'s `test`
hook validates only that the credential's shape is plausible (a
non-empty username and password); it cannot confirm the server is
reachable or the password is correct. The first real liveness check happens
when the host actually drives `handshake` against the live server — which
is T2.1.2's job, by design (see that node's contract for why the golden
path is a separate node with its own evaluator).

## Icon

`assets/icon.svg` is a small hand-drawn database-cylinder mark in
PostgreSQL's own brand blue (`#336791`), not a copy of the elephant
logotype — this app represents the protocol, not the PostgreSQL Global
Development Group's own mark. Checked with `_tools/icon-legibility.ts`.

## Tests

`tests/lib/scram.test.ts` reproduces RFC 7677 §3's own published exchange
byte-for-byte (transcribed from the RFC text, independently recomputed in
Python during authoring — see this node's result for that check — never
derived from this file's own output), and separately proves the
ServerSignature check actually rejects a corrupted one, the server-nonce
prefix check, the `,`/`=` escaping, and that two nonces are never the same.
`tests/lib/wire.test.ts` proves frame reassembly is buffer-based (one
buffer, byte-at-a-time, and two messages in one buffer all parse
identically), the `-1`-is-NULL vs `""`-is-empty-string distinction, the
absurd-length guard, and each Authentication/Error/RowDescription/
DataRow/CommandComplete/ReadyForQuery message shape. `tests/auth/
postgres.test.ts` drives the `handshake` hook through a full round trip
with a mocked server reply sequence. `tests/actions/query.test.ts` proves
`query` sends the caller's SQL unmodified over a mocked `ctx.socket` and
parses the response into rows.

```bash
deno task check && deno task test && deno task lint && deno task validate
```
