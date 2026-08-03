# Grist

Grist documents, tables, columns and records — plus read-only SQL — on the **Grist API v1**, against
hosted **and** self-hosted sites.

- **Categories** — spreadsheets, databases, productivity
- **Auth methods** — api-key, oauth2
- **Actions** — 15
- **Egress allowlist** — `*` (see below — the site is per-connection)
- **Website** — https://www.getgrist.com/
- **Source repository** — https://github.com/gristlabs/grist-core (Apache-2.0)
- **API docs** — https://support.getgrist.com/api/

Grist is a spreadsheet whose cells are a SQLite database. That is not a metaphor: every document is
literally a SQLite file, formulas are Python, and the API exposes both a records interface and a
`SELECT` interface over the same rows. It is also open source and widely self-hosted, which shapes
almost every decision in this app.

## The three things most likely to go wrong

### 1. There is no `api.grist.com` — the site is part of the connection

Grist has no central API host. The REST API lives at `<site>/api` on whichever server the user's
documents are on, and there are three shapes of `<site>`:

| Deployment | Base |
| --- | --- |
| Hosted, personal | `https://docs.getgrist.com` |
| Hosted, team site | `https://<team>.getgrist.com` |
| Self-hosted | whatever origin the operator chose |

All three are the same program (grist-core) and take the same requests. So `siteUrl` is an **auth
field**, republished onto `connection.display.siteUrl`, and `lib/client.ts` resolves the base URL
per request. An API key is only valid on the site it was minted on, which is exactly why the two
belong together on one Connection.

`resolveBaseUrl` also strips a trailing slash **and** a trailing `/api`. Users paste the URL out of
their browser bar, and `https://docs.getgrist.com/api` is as plausible a paste as the bare origin;
silently producing `/api/api/orgs` would be a baffling 404.

#### Why the egress allowlist is `*`

Two independent reasons, either of which alone would be enough:

1. **Self-hosting is first-class and the domain is unknowable.** grist-core is Apache-2.0 (11.4k
   stars, `v1.7.17` at the time of writing), Grist Labs ships `gristlabs/grist` and
   `gristlabs/grist-oss` Docker images, and https://support.getgrist.com/self-managed/ is official
   documentation with an enterprise tier behind it. A tenant's Grist may be at any hostname; no
   manifest can enumerate it.
2. **Even hosted-only would need a wildcard.** Team sites are `<team>.getgrist.com`, an
   arbitrary user-chosen label, so the narrowest honest hosted allowlist is already
   `*.getgrist.com`.

Given that hosted-only would buy `*.getgrist.com` and cost the entire self-hosted install base, `*`
is the honest scope — the same call `apps/wordpress`, `apps/odoo` and `apps/strapi` already make.
The consequence is that this App's egress is not restricted at all, and a host **should** surface
that at install time. `tests/index.test.ts` compensates in the one place it can: no action may
hard-code a host, build an absolute URL, or take a site/host/origin as a parameter — every action
must resolve its base from the Connection.

### 2. There is no cursor. `limit` truncates; it does not paginate

`GET .../records` returns `{ "records": [{ "id", "fields" }] }` with **no offset, no cursor and no
total**. `limit` is documented as "Return at most this number of rows. A value of 0 is equivalent to
having no limit" — it caps the result, and there is no parameter that says "the next page".

So a naive `limit=100` loop silently re-reads the same first hundred rows forever. To walk a large
table, either:

- filter forward on a stable column (`filter` + `sort`), or
- use **`run-sql`** with `ORDER BY … LIMIT … OFFSET …`, which is the reason that action exists.

`limit: 0` is deliberately *sent* rather than treated as empty — `0` means "no limit" to Grist, and
so does `hidden: false` mean something distinct from omitting it. `lib/client.ts` skips only
`undefined`, `null` and `""`; `tests/lib/client.test.ts` pins that.

### 3. `filter` is exact-match only, and it is JSON inside a query string

`filter` is "a JSON object mapping column names to arrays of allowed values" — `{"pet": ["cat",
"dog"]}` — url-encoded into the query string. There is **no operator syntax**: no ranges, no `LIKE`,
no negation, no `OR` across different columns. Multiple columns are ANDed; multiple values within a
column are ORed. Anything richer is `run-sql`.

The param is typed `json` and accepts either an object or a ready-made string, because a `json` param
arrives as either shape depending on whether a human typed it or a previous step produced it.
`encodeFilter` normalises both, and `URL.searchParams` does the percent-encoding.

## Other conventions this app encodes

**IDs are normalized, and are not labels.** `tableId` is the `TABLE ID` shown in Raw Data, `colId` is
the id under the column configuration — not the display name. Grist normalizes and de-conflicts them
on create, so `create-tables` may hand back `My_Table2` for a requested `My Table`; the action's
output is the assigned id, and downstream steps should read it from there.

**`colId` has no `$`.** Formulas display columns as `$popularity`; the API wants `popularity`. It is
the obvious paste-and-fail, so `delete-column`'s hint says so and a test asserts the hint says so.

**Deleting records is `POST .../records/delete` with a bare array.** Not `DELETE`, and not
`{"records": …}` — the body is `[101, 102, 103]`, the only write on the table that has no envelope.

**Upsert matches on `require`, not `id`.** `PUT .../records` takes `{"require": {...}, "fields":
{...}}`: Grist looks for a record matching every column in `require`, applies `fields` if it finds
one, and otherwise creates a row from the two merged with `fields` winning. `allow_empty_require` is
exposed and defaults off because an empty `require` matches **every row in the table** — combined
with `onmany: "all"` that rewrites the whole table in one call. Grist gates it behind a flag; so does
this action, rather than letting `{}` through as a plausible no-op.

**Several writes return nothing.** `PATCH`, `PUT` and the delete endpoints answer `200` with an empty
body. Those actions echo the ids they submitted, so a downstream step has something to key on instead
of `undefined`. `add-records` and the schema creates do return real ids, and those are passed
through unchanged.

**`widgetOptions` is a JSON string nested inside JSON.** `{"type": "Choice", "widgetOptions":
"{\"choices\":[\"New\",\"Old\"]}"}` — not an object. A test pins that it stays a string.

**`noparse` is a real semantic switch.** Off (the default), Grist coerces a string against the column
type — `"1/2/2026"` becomes a Date. On, it stores the value verbatim and marks the cell invalid.
Neither is right for every caller, so it is exposed on all three record writes.

## Actions

### Records

| Action | Endpoint | Notes |
| --- | --- | --- |
| `list-records` | `GET .../tables/{t}/records` | Exact-match `filter`, `sort`, `limit`, `cellFormat` |
| `add-records` | `POST .../tables/{t}/records` | Bare `{colId: value}` maps are wrapped for you |
| `update-records` | `PATCH .../tables/{t}/records` | Patch semantics; `null` clears, omission leaves alone |
| `upsert-records` | `PUT .../tables/{t}/records` | `require` is the match key, not `id` |
| `delete-records` | `POST .../tables/{t}/records/delete` | Bare array body |
| `run-sql` | `POST /docs/{d}/sql` | Read-only `SELECT` with bound `args` |

`run-sql` uses the **POST** form, not `GET /sql?q=`, because only POST accepts bound parameters —
interpolating a value into the statement is the injection bug the action exists to avoid. Grist's own
constraints are quoted in the source: a single `SELECT` with no trailing semicolon, `WITH` permitted,
writes rejected, and a `timeout` that "cannot be exceeded, only reduced" from the server's default
of 1000 ms. It is typed `search`, not `perform`, because the endpoint cannot mutate.

### Tables and columns

| Action | Endpoint | Notes |
| --- | --- | --- |
| `list-tables` | `GET /docs/{d}/tables` | `expand: true` → `?expand=column`, the whole schema in one call |
| `create-tables` | `POST /docs/{d}/tables` | `columns` is required — Grist will not create an empty table |
| `download-table` | `GET /docs/{d}/download/{csv,tsv}` | The one non-JSON response |
| `list-columns` | `GET .../tables/{t}/columns` | `hidden: true` reveals `manualSort` |
| `add-columns` | `POST .../tables/{t}/columns` | Text/Int/Numeric/Bool/Date/DateTime/Choice/`Ref:<Table>` |
| `delete-column` | `DELETE .../columns/{colId}` | Deletes the data with it; no API undo |

`download-table` is the only action that reads its response as text. `dsv` is deliberately not
offered: Grist documents it as "a custom delimiter" but exposes no parameter to choose one, and its
own specification gives the example delimiter as 💩 — not a format anything can consume.

### Discovery

| Action | Endpoint | Notes |
| --- | --- | --- |
| `list-orgs` | `GET /orgs` | Bare array, no envelope; `domain` is `null` for a personal area |
| `list-workspaces` | `GET /orgs/{orgId}/workspaces` | **Documents are nested inline** — this is the docId lookup |
| `describe-doc` | `GET /docs/{docId}` | Metadata and your `access` level; reads no data |

There is no `GET /docs` collection. A docId comes from `list-workspaces` or from the URL of a doc
someone already opened. `list-workspaces` defaults `orgId` to the literal `current`, which Grist
documents as "the org is implied by the domain in the url".

### Not implemented

Real endpoints deliberately left out, so their absence is a decision rather than an oversight:

- **Attachments.** Upload is `multipart/form-data` and download is binary; both are worth doing
  properly rather than half-doing, and neither has a workflow shape settled in this pack yet.
- **Webhooks** (`/docs/{d}/webhooks`). This app ships no Triggers, and webhook *management* without
  a trigger to receive them is surface without a purpose.
- **Document lifecycle** — create/copy/fork/move/pin/remove/replace/recover, snapshots, states and
  `compare`. Powerful, destructive, and none of it is what a spreadsheet-automation workflow reaches
  for first.
- **Access control** (`/docs|workspaces|orgs/{id}/access`), **SCIM** (`/scim/v2/*`), **service
  accounts** and **user disable/enable**. These are administration, not automation, and several are
  Enterprise-edition or owner-only.
- **`POST /docs/{d}/apply`** — the raw UserAction bus. It can do everything the typed endpoints do
  and much they cannot, with no schema and no guardrails. It belongs behind a deliberate design, not
  a `json` param.
- **`GET /orgs/{orgId}/usage`** — see the `quota` health check below for why it is not what it looks
  like.
- **Forms, timing, proposals, templates, widgets.** Narrow or preview-shaped surfaces.

## Auth

### `api-key` — the default

Bearer key from Account settings → Developer (`<site>/account` on any deployment). One key per user
at a time; "Remove" revokes it immediately. There are **no scopes** — the key inherits its owner's
access exactly. It is the only method that works against a self-hosted install without registering
an OAuth app, which is why it is listed first.

**The `test` hook checks more than `res.ok`, and this is the single most important thing the live
docs corrected.** Verified on the wire against `docs.getgrist.com` on 2026-08-03:

```
GET /api/profile/user                              → 200 {"id":40,"email":"anon@getgrist.com",
  (no Authorization header)                                "name":"Anonymous","anonymous":true}
GET /api/profile/user  Authorization: Bearer <bad> → 401 {"error":"Bad request: invalid API key"}
GET /api/orgs                                      → 200 []
  (no Authorization header)
```

An unauthenticated request does **not** 401 — it succeeds *as the anonymous user*. A `res.ok` test
would therefore pass for a Connection that is not authenticated at all, most visibly on a self-hosted
server that permits anonymous access. `test` asserts `anonymous !== true`, and a test pins the exact
anonymous payload above.

The same trap rules out `GET /api/orgs` as a probe: anonymous, it returns `200 []`. "No orgs" and
"not logged in" are indistinguishable.

### `oauth2` — hosted only, and honestly labelled

Grist runs a real OIDC server. Every value in `auth/oauth2.ts` was read off the live discovery
document at `https://login.getgrist.com/.well-known/oauth-authorization-server` on 2026-08-03:
`authorization_endpoint`, `token_endpoint`, `revocation_endpoint`, `code_challenge_methods_supported:
["S256"]`, and the seven `scopes_supported`. `tests/auth/oauth2.test.ts` asserts every requested
scope against that published list, so a vendor change fails a test rather than a production run.

`offline_access` is requested because without it Grist issues no refresh token and the Connection
dies at the first expiry — fatal for unattended runs. `user.profile:read` is requested because the
`doc:*` scopes grant nothing on `/profile/user`, which is what `test` probes.

**It is declared hosted-only, deliberately.** A self-hosted Grist runs its own OAuth server, with
endpoints discovered from `https://<your-server>/.well-known/oauth-authorization-server`, and OAuth
apps are part of the paid full edition rather than `grist-oss`. `OAuth2Config` carries one static
`authorizationUrl`/`tokenUrl` pair for the whole App, so a single declaration cannot follow a
per-Connection issuer — pointing a self-hosted user at `login.getgrist.com` would silently
authenticate them against the wrong server. Self-hosted installs use the API key.

## Health checks

Three checks: one real probe and two declared absences. Both absences carry
`severity: "informational"`, which is load-bearing — an `unavailable` entry always reports `unknown`,
`unknown` outranks `ok` in the roll-up, and at any other severity a declared absence would pin the
App at `unknown` forever. `tests/index.test.ts` enforces that for every `unavailable` check.

### `site` — the real probe (`kind: "dependency"`)

`GET <site>/status?db=1`, unsigned, per Connection.

**Why `dependency` and not `service`.** There is no single vendor platform to speak for. A `service`
check is `scope: "app"` — one answer shared by every Connection — and roughly half of this App's
Connections point at a Grist the tenant runs themselves, for whom Grist Labs being up is neither news
nor reassurance. The answerable question is per-Connection, so `scope: "connection"` and
`credential: "context"`: the check needs the Connection to know *which* host to call and needs no
credential to interpret the answer, so `sign` must not run.

**Why `/status` over the obvious alternative.** The obvious probe is an authenticated API call —
`GET /api/orgs`, say. That conflates three different failures into one: the server is gone, the
server is up but broken, and the credential stopped working. The third already has its own check (the
derived `auth:api-key`), and `/status` separates the first two: it is grist-core's own health
endpoint, unauthenticated, present on every deployment, and the thing a Kubernetes liveness probe
points at.

**Why `?db=1` and nothing else.** This is the trap that would have shipped. grist-core's handler
(`app/server/lib/FlexServer.ts`, the `/status(/hooks)?` route) adds one sub-check per `?<name>=1`
flag and fails the **entire response with HTTP 500** if any of them fails. The richer-looking
`?db=1&redis=1` works perfectly on the hosted service — and would report every ordinary
single-container self-hosted install as **down**, because the handler runs
`this._docWorkerMap.getRedisClient()?.pingAsync()`, an unconfigured Redis yields `undefined`, and
`undefined` counts as a failed check. `db` has no such hole: every deployment has a home database by
construction.

**The endpoint is real, verified two ways on 2026-08-03.**

(a) *Bogus sibling on the same host* — the path is not a catch-all:

| Path | Result |
| --- | --- |
| `/status` | 200, 28 B, `Grist server(home) is alive.` |
| `/status?db=1` | 200, 36 B, `Grist server(home) is alive (db ok).` |
| `/status?db=1&redis=1` | 200, 46 B, `Grist server(home) is alive (db ok, redis ok).` |
| `/status/hooks` | **500**, `Grist server(home) is unhealthy (hooks not ok).` |
| `/status/zzz-bogus-sibling` | **404**, 3951 B of the Grist SPA shell |

The `/status/hooks` row is the useful one: it proves the 500 branch is reachable and that this is a
real handler with real semantics, not a 200-everything wildcard. (It is a test-harness gate, never
healthy in production, and is probed here only as evidence.)

(b) *Content-type and body* — the response is `text/html; charset=utf-8` (Express's default for a
string) but the body is a 28-byte plain sentence, not markup, and its content varies with the flags
sent. The bogus sibling by contrast returns 3951 bytes of real HTML. The two are trivially
distinguishable, and the check requires the literal `is alive` before reporting `ok`: a 200 from an
nginx welcome page reports `unknown`, never `ok`.

The parser reads the inline `(db ok, redis not ok)` list into per-component states. Its regex is
anchored at the **end** of the line because the server names itself `server(home)` — a first-match
regex would parse `home`, find no components, and report nothing. There is a test for exactly that.

### `service` — declared `unavailable`

Grist Labs publishes no machine-readable status service. Both plausible candidates were checked and
both are traps:

**`status.getgrist.com` is a wildcard onto the Grist app itself.** `*.getgrist.com` resolves to the
same Express server:

```
GET https://status.getgrist.com/api/v2/summary.json
  → 404 application/json  {"error":"not found: /api/v2/summary.json"}
    x-powered-by: Express · set-cookie: grist_sid_prod=…; Domain=.getgrist.com
GET https://status.getgrist.com/definitely-not-a-real-path-zzz
  → 404 text/html, 3953 B — the Grist SPA shell, <base href="https://grist-static.com/…">
```

The plausible path and the deliberately bogus one land on the same server, and neither is a status
API. The `grist_sid_prod` cookie scoped to `.getgrist.com` is the giveaway: that is Grist's own
session cookie, not a status page's.

**The `*.statuspage.io` subdomains are unclaimed.** `getgrist.statuspage.io`, `grist.statuspage.io`
and `gristlabs.statuspage.io` all answer **302 → `https://www.statuspage.io`**, discarding the
requested path, landing on Atlassian's marketing site. This is the known trap in its redirect form:
`curl -L` reports a cheerful 200 for 127 KB of HTML that says nothing about Grist.

(`grist.statut.mte.incubateur.net` surfaces in search results and is a genuine status page — for one
French public-sector *deployment* of Grist. It speaks for its own operator and nobody else.)

**And no substitute was invented.** `https://docs.getgrist.com/status` is live and would make a tidy
app-scoped probe, but a `service` check is shared across all Connections and this App's Connections
do not share a platform. Reporting Grist Labs' hosted status to a self-hosted tenant would be
confidently wrong in both directions. The per-Connection question is the one with a true answer, and
`site` asks it.

### `quota` — declared `unavailable`

Grist publishes no request headroom. Verified three ways:

1. **Nothing on the wire.** `GET https://docs.getgrist.com/api/profile/user` returned its full header
   set — `date`, `content-type`, `content-length`, `x-powered-by`, `content-language`, the CORS trio,
   `cache-control`, `etag`, `set-cookie` — with no `RateLimit-*`, no `X-RateLimit-*` and no
   `Retry-After`.
2. **Nothing in the specification.** Grist's OpenAPI document (`gristlabs/grist-help`,
   `api/grist.yml`, 4416 lines) contains **zero** occurrences of `429`, `rate limit`, `Retry-After`
   or `throttl`. No endpoint declares a throttled response.
3. **Nothing that would generalise.** A self-hosted Grist is limited by whatever its own reverse
   proxy does, which the app cannot read.

**The endpoint that exists is not this check.** `GET /api/orgs/{orgId}/usage` is real and documented,
but it meters **document data**, not request allowance: `countsByDataLimitStatus` (how many docs are
approaching their row limit, in a grace period, or delete-only) and `attachments.totalBytes`. Row
counts do not predict a throttle. It is also unusable as an unattended probe on two counts — its own
description says "Only accessible to organization owners", so a perfectly good non-owner key would
report a failure that is not one; and the limits it reports are a property of getgrist.com's billing
plans, which do not exist on a self-hosted install.

Reporting `unknown` every run, or dressing an owner-only billing metric up as rate-limit headroom,
are both worse than saying plainly that there is no headroom to read.

### `auth:api-key` / `auth:oauth2` — derived, free

The runtime projects each Auth `test` hook into the health surface. Both probe `/api/profile/user`
with the `anonymous` guard described above — the right liveness probe precisely because it needs no
permission beyond existing. Probing a document or an org instead would report a working credential as
broken whenever the user simply has not been shared the thing.

## Icon

`assets/icon.svg` is **Grist's own mark**, copied byte-for-byte from grist-core's
`static/ui-icons/Logo/GristLogo.svg` (Apache-2.0), 4469 bytes,
`sha256:5d57e094c3623a5981fa7bf210ccc9f9de2edbc50e99c48a09233e0b11b31950`. Nothing was redrawn or
re-coloured, so this app needs no entry in the pack README's icon-exception list.

> `deno task fmt` is scoped to `index.ts actions/ auth/ health/ lib/ tests/` precisely so it cannot
> reach `assets/`. Do **not** run bare `deno fmt` in this directory — it rewrites the SVG and
> falsifies the byte-for-byte claim above.

## Development

```sh
cd apps/grist
deno task test    # 120 unit tests
deno task check
deno task lint
deno task fmt     # never bare `deno fmt` — see above
```

Tests use a mocked `HookContext` (`tests/_helpers.ts`) — no network, no server. `actionCtx()` wraps
it with a Connection carrying a `siteUrl`, because every action resolves its base URL from the
Connection rather than a constant.

Beyond per-action coverage, `tests/index.test.ts` enforces the sandbox rules in source: no action may
reference a credential, name `apiKey`/`accessToken`, set an Authorization header, call global
`fetch`, or touch `Deno.*`; none may hard-code a `getgrist.com` host, build an absolute URL, or take
a site/host/origin as a parameter; every action must build its client via
`GristClient.fromConnection(ctx)`; every `unavailable` health check must be `informational` with a
real reason and no egress widening; and the only probing check must be unsigned. A further test
guards the comment-stripper those checks depend on.

## Known auditor false positives

Running `deno run --no-check -A _tools/audit.ts grist` reports one error that is a bug in the
auditor, not in this app:

```
ERR [network/undeclared-host] lib/client.ts — calls `docs.getgrist.com` but it is not in w6w.network.allow
```

`w6w.network.allow` **is** `["*"]`, which the runtime treats as "any host" —
`packages/core/packages/runtime/src/runtime.ts`, `hostAllowed()`:

```ts
for (const entry of allowlist) {
  if (entry === "*") return true;
```

The auditor's coverage predicate has no `*` arm:

```ts
const covered = [...allowed].some((a) => host === a || host.endsWith(`.${a}`));
```

`"docs.getgrist.com".endsWith(".*")` is false, so any literal host in an app whose allowlist is `*`
is flagged. The one-line fix is `some((a) => a === "*" || host === a || host.endsWith(`.${a}`))`.
It has not shown up before because the other `*` apps (`wordpress`, `odoo`, `strapi`) have no
non-OAuth host literal in code — OAuth endpoint hosts are added to `allowed` separately, which is why
`login.getgrist.com` in `auth/oauth2.ts` is not flagged here either.

The literal in question is `DEFAULT_SITE_URL`, the pre-filled value for the `siteUrl` auth field. It
is a suggestion offered to a user, not a host the client calls unconditionally.

## Links

Every URL below was fetched and its response body inspected on 2026-08-03 — not merely checked for
a 200.

- **Vendor site** — https://www.getgrist.com/
- **Source repository** — https://github.com/gristlabs/grist-core (Apache-2.0, 11,403 stars,
  latest tag `v1.7.17`). Docker images `gristlabs/grist` and `gristlabs/grist-oss`.
- **REST API reference** — https://support.getgrist.com/api/ (the full endpoint reference; ~2.4 MB
  of Redoc, which is why the machine-readable spec below is the better source)
- **OpenAPI specification** — https://raw.githubusercontent.com/gristlabs/grist-help/master/api/grist.yml
  (4416 lines; **this app was built from it**, not from the rendered page)
- **REST API usage guide** — https://support.getgrist.com/rest-api/ (base URLs, minting and revoking
  an API key)
- **Interactive API console** — https://docs.getgrist.com/apiconsole (runs real calls as your
  logged-in user)
- **Self-managed / self-hosting** — https://support.getgrist.com/self-managed/
- **OAuth apps** — https://support.getgrist.com/oauth-apps/ · discovery document:
  https://login.getgrist.com/.well-known/oauth-authorization-server
- **Grist data format** (what a `typed` cell value means) —
  https://github.com/gristlabs/grist-core/blob/main/documentation/grist-data-format.md
- **Documentation repository** — https://github.com/gristlabs/grist-help

**Correction to the candidate entry.** The candidate listed
`https://docs.getgrist.com/welcome/start` as Grist's documentation link. It is not documentation: it
is an in-product onboarding route, and an anonymous request to it **redirects to
`https://login.getgrist.com/signup?state=…`**. Use https://www.getgrist.com/ for the product and
https://support.getgrist.com/ for documentation. The candidate's API-docs link
(`https://support.getgrist.com/rest-api/`) is live and correct, but it is the *usage guide* — the
endpoint *reference* is https://support.getgrist.com/api/, and the machine-readable spec behind it is
`api/grist.yml` above.
