# Metabase

Saved questions, ad-hoc SQL and MBQL, exports, collections, dashboards and schema discovery on the
**Metabase REST API**, against Metabase Cloud **and** self-hosted instances alike.

- **Categories** — analytics, databases
- **Auth methods** — api-key
- **Actions** — 17
- **Health checks** — 3 (`service`, `instance`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `*` (see below — the instance is per-connection)
- **Website** — https://www.metabase.com/
- **Source repository** — https://github.com/metabase/metabase (AGPL-3.0 core; Clojure backend,
  React frontend)
- **API docs** — https://www.metabase.com/docs/latest/api

Metabase is a BI tool you point at a database: people build "questions" in a graphical query builder
or in raw SQL, save them into collections, and pin them onto dashboards. This app's centre of
gravity is therefore **running a question someone already built** and getting today's number out of
it — everything else exists to find the question, or to describe what it can be asked.

> **Everything below was verified against Metabase's own sources on 2026-08-03** — its OpenAPI
> document (`metabase/metabase`, `docs/api.json`, OpenAPI 3.1, 561 paths, 1.9 MB), the Clojure
> source that document is generated from, and a live `metabase/metabase:latest` container running
> **v0.63.2.7** (released 2026-07-31). Nothing here came from a third-party integration directory.
> Where the OpenAPI document and the source disagree, the source won — the document is lossy, and
> §"The spec is incomplete" says exactly where.

## The four things most likely to go wrong

### 1. A successful query returns HTTP **202**, not 200

Query results stream, and Metabase's streaming response defaults its status to `202`:

```clojure
;; src/metabase/server/streaming_response.clj
(.setStatus response (or status 202))
```

Measured on the wire, v0.63.2.7:

| Call | Status | Body |
| --- | --- | --- |
| `POST /api/dataset` (valid SQL) | **202** | `{"status":"completed", …}` |
| `POST /api/dataset` (invalid SQL) | 400 | `{"status":"failed","error":…}` |
| `POST /api/card/40/query` | **202** | `{"status":"completed", …}` |
| `POST /api/card/40/query/csv` | 200 | `text/csv` |
| `POST /api/card/40/query/json` | 200 | `application/json` |

So the JSON API path is 202 and the export paths are 200. `res.ok` covers both; `res.status === 200`
would break every query in the app. `lib/client.ts` compares against neither, and
`tests/lib/client.test.ts` uses a 202 fixture for every query test so that a regression to a
200-comparison fails immediately.

### 2. A query can **fail inside a 2xx**

`metabase.query-processor.schema.query-result` marks `status` a **required** field with the enum
`["completed", "failed"]`, alongside `error` and `error_type`. On the happy path Metabase knows the
query failed before any bytes are on the wire and sets 400/403/500/503 — that is the second row of
the table above. But that branch is explicitly conditional on the response being *uncommitted*:

```clojure
;; write-error!
(committed?) → (abort-connection!)          ; the status line is already sent
:else        → (set-status! (or status-code 500))
```

A query that starts streaming rows and *then* fails has already sent its `202`. Current versions
abort the connection (which surfaces as a transport error); older ones appended the error blob to
the 2xx body. Either way the status code is not the whole answer.

**Every query in this app therefore goes through `MetabaseClient.runQuery`, which reads the body's
own verdict and throws on `status: "failed"` regardless of how healthy the status line looked.** A
workflow branching on `data.rows.length === 0` would otherwise treat a SQL typo as "no results
today", which for an alerting workflow is the worst possible failure mode.

The vendor's `error` string is surfaced verbatim — `no such table: orders_2024` is the whole answer
— but `stacktrace` and `via` are stripped first. Metabase attaches ~30 Clojure frames to a one-line
SQL typo.

### 3. There is a silent row ceiling, and it applies to only half the endpoints

`query_processor/middleware/constraints.clj`:

```clojure
(def ^:private ^:const default-unaggregated-query-row-limit 2000)
(def ^:private ^:const default-aggregated-query-row-limit  10000)
```

These are applied by `qpapi.clj` **only when the export format is `:api`** — the JSON API shape. The
result is *silently truncated*: `row_count` reports what came back, not what matched, and no flag
says there was more.

Measured on one question, one instance, one day:

| Action | Endpoint | Rows returned |
| --- | --- | --- |
| `question-run` | `POST /api/card/1/query` | **2,000** |
| `question-export` | `POST /api/card/1/query/csv` | **18,760** |

There is no offset parameter to page past it. The two ways out, both deliberate:

- **`question-export` / `query-export`** — the export formats drop the constraints entirely.
- **`query-run`** with an explicit `LIMIT`/`OFFSET` in native SQL.

### 4. Multi-valued query params **repeat**. Comma-joining them is a hard 400

`models` on `/api/search` and `/api/collection/{id}/items` is typed as an array of enum strings:

```
?models=card&models=dashboard   → 200, "models": ["dashboard","card"]
?models=card,dashboard          → 400
  {"specific-errors":{"models":[["should be either \"dashboard\", … or \"card\",
                                 received: \"card,dashboard\""]]}}
```

Both verified on the wire. The comma form is not ignored and does not fall back to unfiltered — it
fails the whole request. `lib/client.ts` appends array values rather than setting one joined value,
and `tests/lib/client.test.ts` pins it.

## Other conventions this app encodes

**There is no `api.metabase.com` — the instance is part of the connection.** Metabase's own OpenAPI
document lists exactly one server: `{"url": "http://localhost:3000", "description": "Localhost"}`,
i.e. "wherever you put it". The site URL is an **auth field**, republished onto
`connection.display.siteUrl` by `afterConnect`, and `lib/client.ts` resolves it per request. An API
key is only valid on the instance it was minted on, which is exactly why the two belong on one
Connection.

`normalizeSiteUrl` strips a trailing slash, a trailing `/api` **and** any path. Users paste the URL
of the page they were looking at, and Metabase's own docs example is
`curl … 'http://localhost:3000/api/permissions/group'` — so `…/api` is as plausible a paste as the
bare origin. Producing `/api/api/dataset` would be a baffling 404.

**Pagination exists on two endpoints and nowhere else.** `/api/search` and
`/api/collection/{id}/items` return `{data, total, limit, offset}` and honour `limit`/`offset`.
`/api/card`, `/api/collection` and `/api/dashboard` return **bare arrays** with no pagination at all
— verified: `GET /api/card?limit=2` still returned all 40 questions. On a large instance, `search`
(with `q` omitted and `models` set) is the only bounded way to enumerate.

**`root` is a real collection id, and it is a string.** `GET /api/collection/root/items` lists the
top level ("Our analytics"); `trash` is the other word-shaped id. `collection-items` therefore takes
its id as a `string` param — a numeric type would make the most useful collection on every instance
unreachable.

**Exports use display names, not column names.** A CSV header row comes back as
`ID,User ID,Product ID,Subtotal ($),Tax ($),…` with foreign keys rendered as their remapped labels
(`Hudson Borer`, not the numeric id). Right for a spreadsheet a human opens; wrong for a downstream
join. `question-run` returns raw positional rows instead.

**`data.rows` is positional.** `{"rows": [[1,"a"]], "cols": [{"name":"one"},{"name":"letter"}]}` —
arrays, with the names alongside in the same order. A caller wanting `{column: value}` objects
should use `question-export` with `format: "json"`, the one path where Metabase does the zipping.

### The spec is incomplete — where the source was needed

Metabase's OpenAPI document is generated and lossy, so the Clojure source is authoritative wherever
they disagree. Two cases mattered here:

- **`POST /api/card/{id}/query`** — the document's request schema lists only `collection_preview`,
  `dashboard_id` and `ignore_cache`. `queries_rest/api/card.clj` shows `parameters` as well, which
  is the entire point of running a parameterised question. Shipped from the source.
- **`POST /api/dataset`** — the document's request schema is `{"database": integer|null}` and
  nothing else; the query body is left completely unspecified. This is why `query-run` takes the
  query as a `json` param rather than a generated form: there is no published schema to generate
  from, and inventing one would be wrong the first time someone used a feature it did not
  anticipate.

### Why the egress allowlist is `*`

Metabase is AGPL-3.0 and shipped as a JAR and an official Docker image; self-hosting is
first-class, and a tenant's instance may be at any hostname. No manifest can enumerate it. Even a
hosted-only allowlist would have to be `*.metabaseapp.com`, and would cost the entire self-hosted
install base — the same call `apps/grist`, `apps/discourse` and `apps/wordpress` already make.

The consequence is that this App's egress is not restricted at all, and a host **should** surface
that at install time. `tests/index.test.ts` compensates where it can: no action may contain an
absolute URL literal, hard-code a host, or take a site/host/origin/domain as a parameter. Every
action resolves its base from the Connection.

## Actions

### Questions

| Key | Endpoint | Notes |
| --- | --- | --- |
| `question-run` | `POST /api/card/{id}/query` | The main event. 202 + body-verdict checked. Capped at 2,000/10,000 rows |
| `question-export` | `POST /api/card/{id}/query/{format}` | csv · json · xlsx. **Not** row-capped |
| `question-list` | `GET /api/card` | Bare array, no pagination |
| `question-get` | `GET /api/card/{id}` | The source of `parameters`, `dataset_query` and `result_metadata` |
| `question-create` | `POST /api/card` | Sends `visualization_settings: {}` for you — it is required |
| `question-update` | `PUT /api/card/{id}` | Behaves like PATCH. Also archives / un-archives |

### Ad-hoc queries

| Key | Endpoint | Notes |
| --- | --- | --- |
| `query-run` | `POST /api/dataset` | Native SQL or MBQL. Capped at 2,000/10,000 rows |
| `query-export` | `POST /api/dataset/{format}` | Nests the query under `query` — the flat shape is a 400 |

### Collections, dashboards, discovery

| Key | Endpoint | Notes |
| --- | --- | --- |
| `collection-list` | `GET /api/collection` | Bare array. Kebab-case params (`personal-only`) |
| `collection-items` | `GET /api/collection/{id}/items` | Paginated. `root` and `trash` are valid ids |
| `collection-create` | `POST /api/collection` | Only `name` required |
| `dashboard-list` | `GET /api/dashboard` | Bare array, **without** dashcards |
| `dashboard-get` | `GET /api/dashboard/{id}` | The only source of `dashcards` |
| `dashboard-card-run` | `POST /api/dashboard/{d}/dashcard/{dc}/card/{c}/query` | The number a human sees, with dashboard filters applied |
| `database-list` | `GET /api/database` | `{data,total}`, no pagination. Source of the `database` id |
| `database-metadata` | `GET /api/database/{id}/metadata` | Tables and fields, from Metabase's last **sync** |
| `search` | `GET /api/search` | The only paginated, text-filterable listing endpoint |

Note that `dashcardId` ≠ `cardId`: the first is the *placement* (`dashcards[].id`), the second is
the *question* (`dashcards[].card_id`). Verified live — dashcard 1 holds card 21 on the sample
dashboard. Both params name their source field explicitly, because confusing them is a 404.

### Not implemented, and why

- **`DELETE /api/card/{id}`, `DELETE /api/dashboard/{id}`, `DELETE /api/collection/{id}`** —
  archiving covers the reversible case and is what the Metabase UI itself does. A hard delete of a
  question that a dozen dashboards depend on is not something a retrying workflow step should be
  able to do by accident. `question-update` with `archived: true` is offered instead.
- **`POST /api/database/{id}/sync_schema`, `rescan_values`, `discard_values`** — admin-scoped,
  potentially long-running side effects on a shared resource. An action whose honest description is
  "make the whole instance busy for a while" does not belong beside read-only introspection.
- **Dashboard authoring (`PUT /api/dashboard/{id}/cards`, `POST /api/dashboard`)** — building a
  dashboard means constructing `dashcards` with grid coordinates, `parameter_mappings` and
  `visualization_settings`. That is a UI's job, and a workflow that needs it is better served by
  Metabase's serialisation export/import.
- **Alerts, subscriptions and pulses** — they overlap with what the workflow engine itself is for.
  A workflow that wants to be notified should run `question-run` on a schedule, not ask Metabase to
  email it.
- **`/api/api-key`** — deliberately excluded, and enforced. See the auth section.
- **User, group and permission administration** — a large, admin-only surface with real blast
  radius, and orthogonal to the analytics job this app does.
- **The session-token auth scheme** — see below.
- **Enterprise-only surfaces** (sandboxing, serialisation, audit) — not verifiable on the OSS
  container this app was built against, so nothing was invented for them.

## Auth

### `api-key` — the only method, and the right one

Metabase's OpenAPI document declares exactly one security scheme:

```json
"securitySchemes": {
  "ApiKeyAuth": { "type": "apiKey", "in": "header", "name": "X-API-Key",
                  "description": "API key for authentication" }
}
```

A key is minted at **Admin settings → Authentication → API keys → Create API key**, against a
**group**, and inherits that group's permissions exactly. Metabase shows it once. Keys are prefixed
`mb_` and carry no documented expiry.

**The site URL is a field, not a param.** A key minted on `metabase.acme.com` is meaningless on
`analytics.example.org`, so the two halves live on one Connection. It is a plain `string`, not a
`secret` — a URL is an address, and masking it would make a typo impossible to spot.

#### Why not the session-token flow

Metabase's older mechanism is `POST /api/session` with a username and password, returning
`{"id": "<uuid>"}` for use as the `X-Metabase-Session` header. It still works — verified: both the
login and the header returned 200 on v0.63.2.7 — and it is what n8n's Metabase node uses. It is
deliberately not shipped, for three reasons in descending order of severity:

1. **`sign` cannot make a network call.** A session token must be fetched before it can be attached,
   so a session flow needs `exchange` at connect time (the `apps/odoo` precedent) — which then has
   to cope with the token expiring underneath a Connection that looks fine.
2. **Session tokens expire on a deadline nothing reveals.** The lifetime is an instance setting
   (`MAX_SESSION_AGE`, default 14 days) and can be shortened further by an admin's session-timeout
   policy. The login response carries no expiry, so an unattended workflow would fail at an
   unpredictable time with a 401 indistinguishable from a revoked credential.
3. **It requires storing a human's password**, not a scoped credential. An API key is bound to a
   group and can be regenerated without touching anyone's account.

If a Metabase old enough to lack API keys ever needs supporting, add a second `AuthDefinition` with
an `exchange` hook rather than bending this one.

#### The probe, and the one that was rejected

`test` probes **`GET /api/user/current`** — but it was chosen by reading its response body, not by
its name. The concern is the Follow Up Boss / Mailjet failure mode, where a `/me`-shaped endpoint
echoes the caller's own credential back. Metabase does not. For an API-key caller the full response
is a **synthetic user record describing the key**:

```json
{"id":2, "email":"api-key-user-54b19524-…@api-key.invalid",
 "first_name":"w6w probe", "common_name":"w6w probe", "last_name":"",
 "group_ids":[1,2], "is_superuser":true, "is_active":true,
 "permissions":{"can_create_queries":true,"can_create_native_queries":true},
 "date_joined":"…", "last_login":null, "locale":null}
```

Every field is an identifier, a timestamp or a permission flag. The only thing derived from the key
is its **display name**, which the admin chose and which is already visible in the Metabase UI to
anyone who can see the key list. No key material.

It is also the narrowest thing a key can be asked — it needs no permission beyond existing. Probing
a collection or a database would report a correctly-scoped key as broken whenever its group has not
been granted that data, which is the *desired* configuration.

`afterConnect` publishes `{siteUrl, site.host, user.{id,name,isSuperuser}}`. The synthetic
`…@api-key.invalid` address is deliberately **not** republished — it is not a real mailbox and would
mislead a UI.

**The rejected probe, kept rejected.** `GET /api/api-key` lists the instance's keys, and
`POST /api/api-key` genuinely does return an `unmasked_key`. The list endpoint turns out to return
only `masked_key` (verified) — but it is admin-scoped and exposes metadata about *other people's*
credentials, so it would be the wrong probe regardless. A source-grep test bans the api-key routes
and the `unmasked_key` field from every module in the app, not just from actions.

#### Failure modes, verified end-to-end

Metabase's rejections are blunter than most: a bad key is **`401` with the plain-text body
`Unauthenticated`** — not a 403, and not JSON. Verified identical for a malformed key, an empty
header and no header at all. The app's own `test` hook, run against the live container:

| Credential | Result |
| --- | --- |
| Valid key | `{ok: true}` |
| `mb_bogus` | `{ok: false, "Metabase rejected the key (401)…"}` |
| Empty key | `{ok: false, "credential missing apiKey"}` — no network call |
| No site URL | `{ok: false, "credential missing siteUrl"}` — no network call |

A 200 that is not a user record is also a failure ("is this URL really Metabase?"). Metabase is very
commonly behind a reverse proxy, so a login page or captive portal answering 200 is not theoretical.

## Health checks

Three declared, plus the `auth:api-key` check the runtime derives from the `test` hook above for
free.

### `instance` — the real probe (`kind: "dependency"`)

Unauthenticated `GET <site>/api/health` against **this connection's own** Metabase.

- `scope: "connection"` — every Connection has its own `siteUrl`; there is no shareable answer.
- `credential: "context"` — it needs the Connection to know *which* host, and no credential to
  interpret the answer, so `sign` must not run. `/api/health` is unauthenticated by design and
  sending a key to it would be gratuitous exposure.
- `severity` stays at the `degraded` default; `auth:api-key` already covers a broken credential.

**Why `/api/health` and not the two obvious alternatives.** Metabase mounts three probes
(`src/metabase/server/routes.clj`):

```clojure
(GET "/api/health" [] health-handler)   ; checks init status AND the app-db
(GET "/readyz"     [] health-handler)   ; same implementation
(GET "/livez"      [] livez-handler)    ; "does not perform any database checks"
```

**`/livez` is the trap**, and it is the mirror image of the one `apps/grist` hit. There, the *richer*
probe lied (a `redis` sub-check 500ing on healthy single-container installs). Here the *poorer* one
does: `livez-handler` is literally `{:status 200, :body {:status "ok"}}` with no conditions, so a
Metabase whose application database has gone away answers it cheerfully while being unable to run a
single query. Picking a probe by its name — "liveness, that sounds right" — yields a check that can
never fail. `tests/index.test.ts` bans `/livez` and `/readyz` from any `ctx.fetch` in `health/`, and
asserts positively that this check fetches `/api/health`.

`/readyz` is the same handler, but it lives at the root, outside `/api`, where a reverse proxy is
far likelier to have rewritten it. `/api/health-inspector` is richer and unusable: authenticated and
admin-scoped (verified `401 Unauthenticated` unsigned, `200 []` as admin), which a `context` check
cannot satisfy by construction.

**Wire evidence, v0.63.2.7:**

| Path | Status | Body |
| --- | --- | --- |
| `/api/health` | 200 | `{"status":"ok"}` |
| `/api/health` (during boot) | **503** | `{"status":"initializing","progress":0.2 … 0.95}` |
| `/readyz` | 200 | `{"status":"ok"}` |
| `/livez` | 200 | `{"status":"ok"}` — unconditionally |
| `/api/health-inspector` | 401 | `Unauthenticated` (plain text) |
| `/api/notreal-zzz` | 404 | `"API endpoint does not exist."` |

The last two rows are what make this a real handler rather than a 200-everything catch-all: a
nonsense sibling under the same `/api` prefix is refused with a distinct 404, and a real sibling
refuses to answer without a credential. The 503 row was captured by restarting the container and
polling during boot — the failure branch is reachable, not merely written down.

The two 503 bodies are **not** conflated: `initializing` reports `degraded` with the progress
percentage (a rolling restart is not an outage, and paging someone for one is how a check trains
people to ignore it); anything else is the app-db branch and reports `down`.

**A transport failure reports `down`, not `unknown`.** The runtime wraps a throwing hook as
`{state: "unknown", message: "probe failed: …"}`, which is right for a check whose subject is
elsewhere and wrong here: connection refused, DNS failure and TLS errors against this connection's
own host *are* the most common way for a Metabase to be down. Caught explicitly. Verified live
against a closed port, a nonexistent host, and `example.com` (a real host that is not Metabase → the
distinct "no Metabase at this URL" answer).

### `service` — real, and deliberately `informational`

`status.metabase.com` is a genuine Atlassian Statuspage. It passes all three required checks:

**(a) Bogus sibling path — is it a catch-all?** No.

| Path | Status | Bytes | md5 (first 12) |
| --- | --- | --- | --- |
| `/api/v2/status.json` | 200 | 222 | `eb03ef240bd1` |
| `/api/v2/summary.json` | 200 | 1,031 | `9e572d1b029f` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |

Three different answers, and the nonsense path is refused outright.

**(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as the Statuspage v2
schema. Neither known unclaimed-host signature matches — `*.statuspage.io` unclaimed is 127,720 B /
md5 `8d3c480a2267`, `*.instatus.com` unclaimed is 216,836 B / md5 `b9120253d885`; these are 222 B and
1,031 B. (`metabase.statuspage.io` returns the identical payload with the same `page.id`, so it is
the same claimed page reached by its Statuspage-native name, not a separate unclaimed one.)

**(c) Does it describe THIS product?** Yes — the check `circle.statuspage.io` fails.

```json
"page": {"id":"ktwqzqlh6n4y","name":"Metabase Cloud","url":"https://status.metabase.com"}
"components": [{"name":"Metabase Cloud Platform","status":"operational"},
               {"name":"Metabase Store","status":"operational"}]
```

`page.url` is on `metabase.com`, and the component names are Metabase's own services. The check
re-asserts this at runtime: if `page.url` ever stops being a `metabase.com` host, it reports
`unknown` rather than relaying another company's uptime.

**Why `informational` nonetheless.** Read what those two components actually cover: Metabase's
*hosting business* and its *store*. Metabase is AGPL-3.0 and shipped as a Docker image; a large
share of installs are somebody's own container. This check is `scope: "app"`, so it cannot tell
which Connections are Cloud. Left at the `degraded` default, an incident on Metabase Cloud would pin
every self-hosted tenant's App at `degraded` — a plain untruth about their instance. This is the
same call `apps/discourse` makes about `status.discourse.org`. Nothing is lost: `instance` gives
every Connection a strictly better, per-connection signal at `degraded`.

`credential: "none"` is stated explicitly rather than inherited from the `kind: "service"` default,
because it is the precondition for the `network: {allow: ["status.metabase.com"]}` widening beside
it — a check that reaches a third-party host must never be signed, and a rule that load-bearing
should be legible in the manifest.

### `quota` — declared `unavailable`

Metabase publishes no request headroom. Verified three ways:

1. **Nothing on the wire.** A live `GET /api/user/current` returned `Date`, `X-Frame-Options`,
   `Last-Modified`, `Strict-Transport-Security`, `Set-Cookie`,
   `X-Permitted-Cross-Domain-Policies`, `Cache-Control`, `X-Content-Type-Options`,
   `Content-Security-Policy`, `x-metabase-version`, `Content-Type`, `Expires`, `Content-Length` —
   and no `RateLimit-*`, `X-RateLimit-*` or `Retry-After`.
2. **Nothing in the specification.** The 1.9 MB OpenAPI document contains **zero** occurrences of
   `429`, `RateLimit`, `X-Rate`, `Retry-After`, `rate limit` or `throttl`.
3. **Nothing that would generalise.** A self-hosted instance is bounded by its own reverse proxy,
   which this app cannot read.

What Metabase *does* limit is queries, not requests: the 2,000/10,000 row truncation ceiling (a cap
on one result set, not a depleting allowance) and a connection-pool 503 when too many queries run at
once (`connection-pool-saturated?` — back-pressure revealed only by refusing). Neither is readable
before it bites. Reporting a row ceiling as if it were rate-limit headroom would be worse than
saying plainly there is none.

`severity: "informational"` is load-bearing on both `unavailable` entries: an `unavailable` check
reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other severity a declared
absence would pin the App at `unknown` forever.

## Icon

`assets/icon.svg` is Metabase's own dot-grid mark, **not drawn here**. It is reproduced byte-for-byte
(md5 `d8ad5aac3285435f3329de134ac18914`, 1,548 B) from n8n's `nodes-base/nodes/Metabase/metabase.svg`
— the upstream vendor mark carried by that project's Metabase node. Single `#509EE3` fill (Metabase's
brand blue) with the characteristic 5×6 ellipse grid at two opacities. It is untouched: `deno task
fmt` formats only `index.ts actions/ auth/ health/ lib/ tests/`, so `assets/` is never rewritten.

> Use `deno task fmt`, **never** bare `deno fmt` — the bare form walks the whole directory and
> rewrites `assets/icon.svg`, which would falsify the verbatim claim above.

## Development

```bash
cd packages/apps/apps/metabase
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — see above
deno task test     # 118 tests
```

There is no `deno` on this devcontainer host; run tasks in the `api` container:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/metabase && deno task test'
```

Pack audit:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps && deno run --no-check -A _tools/audit.ts metabase'
```

### Verifying against a real Metabase

Everything in this README was checked against a throwaway container, which is cheap enough to be the
default way to check a change:

```bash
docker run -d --name mb-probe -p 3939:3000 metabase/metabase:latest
# ~90s to boot; poll GET /api/health until it stops returning 503 "initializing"
# then POST /api/setup with the setup-token from GET /api/session/properties,
# and mint a key with POST /api/api-key {"name":"probe","group_id":2}
```

All 17 actions, both auth hooks and both probing health checks were run end-to-end against that
container using the app's real code (including its `sign` hook) before this app was considered done.

## Known auditor false positives

Two, both filed as `.ai/projects/backlog/26-08-03-02`. Do not chase or code around them.

- **`entry/import — Import "@w6w/types" not a dependency`** at `health/service.ts`. This app imports
  `worstHealthState` as a runtime **value** (not a type) from `@w6w/types`, which the auditor's
  module loader does not resolve. It affects 28 apps; `apps/discourse` produces the identical error
  at the identical line of its own `health/service.ts`. `deno task check` typechecks the same import
  cleanly.
- **`network/undeclared-host`** — not currently triggered here, but it would be the moment any host
  literal appeared in `lib/client.ts` beside the `*` allowlist, as it does for `apps/grist`. This app
  keeps `lib/client.ts` entirely host-free; the only literal host in the App is
  `status.metabase.com`, declared on the `service` check that reaches it.

Anything else the auditor reports is real.

## Links

Every URL below was verified on 2026-08-03 by fetching it and inspecting the response body, not by
checking for a 200.

- **Vendor site** — https://www.metabase.com/
- **Source repository** — https://github.com/metabase/metabase — AGPL-3.0 core, Clojure backend.
  Genuinely open source and self-hostable, which is why `network.allow` is `*` and why the `service`
  check is informational
- **API docs** — https://www.metabase.com/docs/latest/api
- **OpenAPI document** — https://raw.githubusercontent.com/metabase/metabase/master/docs/api.json —
  1.9 MB, OpenAPI 3.1, 561 paths, one security scheme (`X-API-Key`). The authoritative source for
  every path, parameter and enum in this app, except where noted in §"The spec is incomplete"
- **API keys guide** — https://www.metabase.com/docs/latest/people-and-groups/api-keys — the ground
  truth for `X-API-Key`, group-inherited permissions and one-time display
- **Health/liveness routes** —
  https://github.com/metabase/metabase/blob/master/src/metabase/server/routes.clj — the ground truth
  for `/api/health` vs `/readyz` vs `/livez`, and for the 503 branches
- **Streaming response** —
  https://github.com/metabase/metabase/blob/master/src/metabase/server/streaming_response.clj — the
  ground truth for the **202** default and for `write-error!`'s committed/uncommitted split
- **Query constraints** —
  https://github.com/metabase/metabase/blob/master/src/metabase/query_processor/middleware/constraints.clj
  — the ground truth for the 2,000 / 10,000 row ceilings
- **Card API** — https://github.com/metabase/metabase/blob/master/src/metabase/queries_rest/api/card.clj
  — the ground truth for `parameters` on the query endpoint, which the OpenAPI document omits
- **Dataset API** — https://github.com/metabase/metabase/blob/master/src/metabase/query_processor/api.clj
  — the ground truth for which endpoints apply default constraints
- **Docker image** — https://hub.docker.com/r/metabase/metabase
- **Status page** — https://status.metabase.com/ (Atlassian Statuspage, page id `ktwqzqlh6n4y`) ·
  API: `https://status.metabase.com/api/v2/summary.json`
- **Statuspage API reference** — https://metastatuspage.com/api — the component-status and
  page-indicator vocabularies this app maps
- **Icon provenance** — https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Metabase/metabase.svg
