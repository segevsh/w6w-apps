# Upstash Redis

**This app is Upstash Redis over Upstash's HTTP REST API — not generic/raw Redis.** w6w Apps run
in a network-less sandbox that reaches the network only via `ctx.fetch` over HTTP(S) to hosts on a
static allowlist; there is no raw TCP socket access. Generic Redis speaks the RESP wire protocol
over a TCP socket, which this sandbox genuinely cannot support for *any* Redis deployment,
self-hosted or otherwise. Upstash is the real fit: every Upstash Redis database exposes the full
command set over a first-class HTTP REST API at its own fixed `*.upstash.io` host, which is exactly
what `ctx.fetch` plus a static allowlist was built for. If you need to reach a self-hosted or other
cloud-provider Redis instance, this app cannot do it — that would require a raw socket this platform
does not give Apps.

- **Categories** — databases
- **Auth method** — rest-token (bearer)
- **Actions** — 15
- **Egress allowlist** — `*.upstash.io`
- **Website** — https://upstash.com
- **API docs** — https://upstash.com/docs/redis/features/restapi

## Setup

In the [Upstash console](https://console.upstash.com), open your database → **REST API** panel, and
copy:

- `UPSTASH_REDIS_REST_URL` → the **REST URL** field (e.g. `https://usw1-example-12345.upstash.io`)
- `UPSTASH_REDIS_REST_TOKEN` → the **REST Token** field (secret)

Every Upstash Redis database has its **own** unique REST URL and token — there is no shared API
host. The REST URL identifies which database to talk to, so it is collected as a Connection field
(like Zendesk's per-account subdomain) rather than an Action param: `afterConnect` echoes it onto
the connection's display data, and every action reads it from there. It is not secret; only the
token is.

## Auth

**`rest-token`** (`apiKey`, bearer) — fields `restUrl` (string, required) and `restToken` (secret,
required). `sign` stamps `Authorization: Bearer <restToken>` on every outbound request; actions
never see the token. `test` calls `PING` (`POST /ping` → `{"result":"PONG"}`), the cheapest possible
round trip and the one the [REST API docs](https://upstash.com/docs/redis/features/restapi)
document explicitly.

## Actions

Each action is a thin wrapper over Upstash's path-style REST command format —
`POST /<COMMAND>/<arg1>/<arg2>/...` — and returns `{ result }`, the exact shape of Upstash's
response body (see the [REST API docs](https://upstash.com/docs/redis/features/restapi)).

| Key | Type | Command | Notes |
|---|---|---|---|
| `get` | read | `GET` | |
| `set` | perform | `SET` | Optional `ttlSeconds` appends `EX <seconds>` |
| `del` | perform | `DEL` | `keys` is comma-separated for multiple keys |
| `incr` | perform | `INCR` | Not idempotent — a retry double-counts |
| `decr` | perform | `DECR` | Not idempotent — a retry double-counts |
| `expire` | perform | `EXPIRE` | |
| `exists` | read | `EXISTS` | |
| `lpush` | perform | `LPUSH` | Not idempotent — a retry pushes twice |
| `rpush` | perform | `RPUSH` | Not idempotent — a retry pushes twice |
| `lrange` | read | `LRANGE` | `stop: -1` means the last element |
| `hget` | read | `HGET` | |
| `hset` | perform | `HSET` | |
| `hgetall` | read | `HGETALL` | Folds Upstash's flat `[field, value, ...]` array into an object |
| `sadd` | perform | `SADD` | |
| `smembers` | read | `SMEMBERS` | |

This covers the Redis commands most commonly automated in a workflow tool. Anything beyond it
(sorted sets, streams, scripting, transactions, pub/sub, `SCAN`) is out of scope for this first
pass — each would be another thin wrapper over the same REST call shape if added later.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.upstash.com>, a real Atlassian Statuspage instance with a JSON
summary API: `GET https://status.upstash.com/api/v2/summary.json`. Verified live 2026-07-31 —
`status.indicator` (`none | minor | major | critical`) is the page-wide verdict; `components`
includes four top-level groups (`Redis Global`, `Redis Regional`, `Vector`, `QStash`), each rolling
up its own regions.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself: `POST /ping` → `{"result":"PONG"}`.

### Do we have quota left?

**Not implemented.** Unlike Zendesk's `ratelimit-*` response headers, the REST API docs describe no
rate-limit, quota, or usage header or endpoint on the REST API surface — only "max request size" and
"daily request limit" mentioned in prose as causes for a rejected request, not as something a
response exposes. No `quota` check is declared rather than inventing a mechanism the docs don't
describe.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` |
| `host` | dependency | connection | context | degraded (default) | 120s | `health/host.ts` |
| `auth:rest-token` | credential | connection | signed | fatal | — | derived from the `rest-token` auth method's `test` hook |

**`host`** answers a question the derived credential check cannot: since every database has its own
REST URL, "wrong/renamed URL" and "expired token" are different failures (the same distinction
Zendesk's per-account subdomain check draws). It probes `POST /ping` **unauthenticated** — the REST
API docs state a missing or invalid token returns `401`, so a 401 here still proves DNS resolved,
TLS terminated, and the database is answering; only a `404` (database gone) or `5xx` counts as
`down`.

**No `service` absence needed.** Unlike Zendesk, Upstash's status page ships a genuine JSON API, so
this app implements `service` directly rather than declaring it unavailable.

---

Researched and endpoint-verified 2026-07-31 against
[upstash.com/docs/redis/features/restapi](https://upstash.com/docs/redis/features/restapi) and a
live fetch of `status.upstash.com/api/v2/summary.json`. Status surfaces move; re-check if a probe
starts failing for everyone at once.
