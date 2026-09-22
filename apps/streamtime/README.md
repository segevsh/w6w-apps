# Streamtime

Job tracking and project management for creative agencies — jobs, phases, job items, quotes,
invoices, logged time and expenses — on the **Streamtime Public API v2**.

- **Categories** — project-management, finance, productivity
- **Auth methods** — api-token (bearer)
- **Actions** — 84 (every operation in the vendor's OpenAPI document)
- **Health checks** — 3 (`service`, `credential`, `quota`) + the derived `auth:api-token`
- **Egress allowlist** — `api.streamtime.net`, `streamtime.statuspage.io` (the status host is only
  reached by the `service` health check, never by an action)
- **Website** — https://streamtime.net/
- **API docs / OpenAPI** — https://api.streamtime.net/swagger.json
- **Status page** — https://streamtime.statuspage.io/

> Everything below was verified against Streamtime's own OpenAPI 3.1 document
> (`https://api.streamtime.net/swagger.json`, fetched 2026-09-22, 200, `application/json`,
> 348,536 bytes, `info.title` "Public API", `info.version` "1.0.0", 58 paths / 84 operations) and
> live probes of `api.streamtime.net` and `streamtime.statuspage.io` on the same day. Nothing here
> came from a third-party integration directory.

## The three things most likely to trip you up

### 1. There is no error envelope, and the credential gate runs before routing

Streamtime answers **every** unauthorised request with `401` and a body that is literally the
plain sentence `You are not authorised to make this request` (43 bytes,
`content-type: text/html; charset=UTF-8`, no JSON wrapper). Verified byte-identical across three
separate cases on 2026-09-22:

- `GET /v2/organisation` with no `Authorization` header;
- the same request with a syntactically plausible but invalid bearer token;
- `GET /v2/definitely-not-a-path` — a path that does not exist at all.

A missing token, a revoked token and a typo'd path are indistinguishable by status code alone. So
every credential verdict in this app — the auth `test` hook, the `credential` health check, and
`lib/client.ts`'s own error formatting — classifies from that exact body string, never from the
`401` alone. See `lib/client.ts`'s `isNotAuthorised`/`formatStreamtimeError` and
`auth/api-token.ts`'s `readProbe`.

### 2. Most resources have no list endpoint — `POST /search` is how you find ids

Companies, jobs, logged time, logged expenses, quotes and invoices are **create-only at the
collection level**: `POST /companies`, `POST /jobs`, `POST /logged_expenses`,
`POST /logged_times` exist, but there is no matching `GET` list — each is readable only one id at
a time (`GET /{resource}/{id}`). Only four collections have a real `GET` list with no pagination:
`branches`, `rate_cards`, `roles`, `users`.

Listing or filtering the create-only resources goes through **`POST /search`**
(`search-records`), a generic query endpoint over 24 named views with its own small
filter-expression DSL (`=`, `!=`, `>`, `>=`, `<`, `<=`, `CONTAINS`, `NOT CONTAINS`, `IN`,
`NOT IN`, joined with `AND`/`OR`, grouped with parentheses). This app exposes the DSL verbatim as
a text parameter rather than building a query-builder UI that could only express a subset of it —
see `lib/params.ts`'s `SEARCH_QUERY_HINT`, copied from the endpoint's own description.

The vendor's own guidance, reproduced in `search-records`' hint: fetch `search-setup-get`
(`GET /search/setup`) once per session to learn the valid selectors, sort columns and
`additionalData` keys for a view, then reuse it — it does not change except across releases.
`report-setup-get` / `report-run` (`GET /report/setup`, `POST /report`) cover the aggregate
questions (totals, averages, grouped breakdowns) without pulling every record back.

### 3. Statuses, costing and allocation methods are `{ id, name }` objects, not enums

Every `*Status` field in the document (`jobStatus`, invoice/quote statuses, and similarly-shaped
costing/allocation-method fields) is a nested `{ id, name }` object whose `name` is a label the
customer can rename in their own organisation. A static option list would be wrong the moment
somebody renames a status, so write actions that touch one (`job-create`, `job-status-update`, …)
take it as a small JSON object instead, with a hint pointing at `search-setup-get` or the record
itself for valid ids — see `lib/params.ts`'s `modelObjectParam`.

## Auth

One method: `api-token`, type `bearer`. Header: `Authorization: Bearer {token}`.

The vendor's own scheme description (`components.securitySchemes.bearerAuth` in the OpenAPI
document) names two ways to obtain a token:

- **Via App** — a Streamtime subscriber opens **Company Settings** inside the Streamtime app and
  follows the process to request a bearer token. This is the credential this app models: one
  opaque, long-lived token pasted into one secret field.
- **Via OAuth** — for third parties integrating on behalf of *any* Streamtime user, requires
  registering as a Streamtime Partner ("get in touch with us"). That is a program enrolment made
  directly with the vendor, not something completable from a connection form, so no OAuth method
  is declared here.

### The probe is `GET /organisation`

Chosen for three reasons (see `auth/api-token.ts`):

1. It requires a credential — it is not one of the handful of routes documented as public.
2. It returns no credential material — success is the organisation's own record (`name`, `domain`,
   `currency`, `address`, `country`); it never echoes the token.
3. Status alone tells you nothing here (finding 1 above), so the verdict comes from the body:
   `accepted` (2xx + an `Organisation`-shaped body with a non-empty `name`), `rejected` (the exact
   `You are not authorised to make this request` string), or `unexpected` (anything else — a
   captive-portal 200, a 5xx, a transport error) — never reported as a dead credential.

`afterConnect` publishes only the organisation's own `name` (and `domain` when present) as the
connection label; nothing else from the record is kept.

## Actions

84 actions — every operation in the vendor's OpenAPI document. `resource` groups them in the
editor: organisation, branches, companies & contacts, jobs (plus phases / items / item roles /
item sub-items / item users / milestones / activity entries), quotes, invoices, logged expenses,
logged time, rate cards, roles, users, labels, and search & reports.

### Idempotency

Every `create` (`POST`) action is `idempotent: false` — the API documents no idempotency-key
mechanism anywhere, so a retry is a second, distinct record. `PUT` (update) and `DELETE` actions
are `idempotent: true`: a full overwrite or a delete's end state is the same however many times it
runs.

### Notes on individual actions

- **`job-create` exposes `companyId` even though the `Job` schema marks it `readOnly: true`.**
  Every other field that identifies *which* job this is (`jobGroupId`, `isBillable`,
  `exchangeRate`, the cost/revenue totals) is genuinely read-only and stays out of the action's
  input — but a job with no `companyId` is not a thing that can exist, and the field is present in
  the document's own `Job` model. Only the annotation looks wrong, so it is exposed here as a
  deliberate, documented deviation; nothing else read-only is.
- **`invoice-payment-create`** similarly exposes fields the schema marks read-only where the
  create is meaningless without them: `paymentDate`, `notes` and `amountPaidIncTax` are the
  `InvoicePayment` model's only content fields besides `invoiceId`, so a strictly-writable reading
  would make the route accept nothing but an id. All three stay optional. Mirrors `job-create`'s
  reasoning.
- **`quote-html-get` / `quote-pdf-get` / `invoice-html-get` / `invoice-pdf-get`** are the only
  non-JSON responses in the API: the HTML routes answer `text/html`, the PDF routes answer
  `application/pdf` bytes (returned base64-encoded, since an Action output is JSON). Every other
  action reads and writes plain JSON — entities come back bare, with no `{data: …}` envelope, and
  list-shaped endpoints answer a bare JSON array.
- **`search-records` / `search-setup-get` / `report-setup-get` / `report-run`** — see "Most
  resources have no list endpoint" above.

## Health checks

Three declared checks, plus the derived `auth:api-token`.

### `credential` — signed, classified from the body

Reads `GET /organisation` with the connection's own token (same probe as the `test` hook, sharing
`readProbe` so the two surfaces cannot drift apart). `state: "down"` only when the response body is
the vendor's exact "not authorised" sentence; a 2xx with an `Organisation` body is `ok`; anything
this app cannot classify — a 5xx, a transport error, an unrecognised body — is `unknown`, never
guessed as a dead credential.

### `service` — Streamtime's own status page, one specific component

`https://streamtime.statuspage.io/api/v2/summary.json` — a genuine Atlassian Statuspage instance,
verified live: `page.name` = `"Streamtime"`, `page.url` = `"https://streamtime.statuspage.io"`.
The page carries four components — `Frontend`, `API`, `Streamtime.net`, `MCP API` — and the verdict
is taken from the component matched **exactly** by name `"API"`, not from the page-level
`status.indicator` and not from the worst of all four: a `Frontend` deploy blip says nothing about
whether a workflow's job read will succeed, and `MCP API` is a different product surface entirely
(the vendor's own description: "Dedicated API for our MCP Server") that a `contains "API"` rule
would wrongly match. All four components are still reported under `components` for visibility. The
check also guards against a rebrand or redirect silently repointing the probe at a different
vendor's page, by checking `page.url` self-identifies as `streamtime.statuspage.io`.

`credential: "none"` with its own `network: { allow: ["streamtime.statuspage.io"] }` — a status
host is a third party that must never see the user's bearer token, and this pack's validator
enforces that a check widening egress beyond the app's own allowlist must be unsigned.

### `quota` — a declared absence, at `informational` severity

Streamtime publishes no quota, credit or rate-limit surface at all: the words "rate limit",
"quota" and "throttle" do not occur anywhere in the 348,536-byte OpenAPI document, and no response
observed on 2026-09-22 — across `/organisation`, `/branches`, `/users`, `/search/setup`,
`/report/setup` and an unknown path — carried an `X-RateLimit-*`, `RateLimit-*` or `Retry-After`
header of any kind. This is a declared absence with a stated basis, not a probe that failed once.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in a health roll-up — at any other severity this would pin the whole app at
`unknown` forever.

## Deliberately not covered

All 84 documented operations have an Action here. Nothing was left out for being hard to find —
everything above and below was read directly out of the vendor's own OpenAPI document. What has no
action, and why:

- **Nothing.** Every path in `paths` has a corresponding action key; `tests/index.test.ts` pins
  the action count against the entry module's own exports. If a future Streamtime release adds
  operations, they will show up as a gap here, not as something silently skipped.

Scope that *was* deliberately narrowed within existing actions, rather than left off entirely:

- **`job-create` and `invoice-payment-create`** expose exactly the read-only-flagged fields a
  create cannot function without (see "Notes on individual actions"), and nothing else read-only.
- **Structured queries.** `search-records` exposes Streamtime's own filter-expression language as
  a single text parameter rather than a bespoke query-builder UI, because the vendor documents it
  only as prose on the endpoint, not as a schema a builder could target completely.

## Icon

`assets/icon.svg` is Streamtime's own mark, downloaded **verbatim** on 2026-09-22 from the
`<link rel="shortcut icon">` in `streamtime.net`'s own page `<head>` —
`https://cdn.prod.website-files.com/6807989b8d233f8b34bccb3e/68616ed17970bd7925340f12_ST_Logo_RGB_Favicon_Black_Yellow_Web_32x32px%20(1)%201.svg`
(200, `image/svg+xml`, 2,493 bytes). `streamtime.net/favicon.svg` and `apple-touch-icon.png` both
404 at the site root — it's a Webflow site and those conventional paths aren't wired — so the mark
had to be found in the page's own `<head>` rather than guessed at a well-known path.

## Layout

```
streamtime/
├── package.json                 # manifest — the `w6w` identity block, network.allow
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # StreamtimeClient, error classification, request/text/bytes
│   └── params.ts                # shared Param fragments, view/statistic-mode enums, search DSL hint
├── auth/api-token.ts            # bearer token: sign, test, afterConnect
├── actions/                     # one file per action (84)
├── health/
│   ├── credential.ts            # signed — GET /organisation
│   ├── service.ts               # streamtime.statuspage.io, the `API` component
│   └── quota.ts                 # declared absence, informational
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # 224 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly, matching the sibling `apify` app.
