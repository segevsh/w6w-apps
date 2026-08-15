# Thinkific

Manage Courses, Users, Enrollments, Orders, Products and Bundles on the **Thinkific Admin API v1**.

- **Categories** — commerce, crm
- **Auth methods** — api-key
- **Actions** — 20
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.thinkific.com` (the `service` check adds `status.thinkific.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.thinkific.com/
- **API docs** — https://developers.thinkific.com/api/api-documentation/
- **OpenAPI** — https://developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml
- **Status page** — https://status.thinkific.com/

Thinkific is an online course and membership platform. A **Course** is content; a **Product** is its
sellable wrapper (price, publish status); a **Bundle** groups several Courses behind one purchase; an
**Enrollment** ties a User to a Course (or, via a Bundle Enrollment, to several at once); an **Order**
is the purchase record.

> **Everything below was verified against Thinkific's own sources on 2026-08-15** — its
> machine-readable OpenAPI 3.0.1 document
> ([`developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml`](https://developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml),
> 164,389 bytes), the "REST API Response Format", "REST API Rate Limits", "Authorization using API
> Key" and "REST Permissions and Scopes" support articles, and live probes against
> `api.thinkific.com` and `status.thinkific.com`. Nothing here came from a third-party integration
> directory.

## The three things most likely to cost someone a day

### 1. The Site "subdomain" is a header value, not a hostname

Pattern-matching this app onto the other "subdomain" SaaS integrations in this pack (BambooHR,
Zendesk, Shopify — all of which build `https://{subdomain}.vendor.com`) would be wrong. Thinkific's
OpenAPI document declares exactly **one** server, `https://api.thinkific.com/api/public/v1` — the
subdomain never enters a URL. It travels as the `X-Auth-Subdomain` **header**, alongside
`X-Auth-API-Key`, which is exactly what the vendor's own "Authorization using API Key" article shows
in its test command:

```
curl https://api.thinkific.com/api/public/v1/courses \
  -H 'X-Auth-API-Key: my-api-key' \
  -H 'X-Auth-Subdomain: my-subdomain'
```

So [`lib/client.ts`](lib/client.ts)'s `API_BASE` is a constant, and no action ever derives a host from
a param or the credential — see [`auth/api-key.ts`](auth/api-key.ts).

### 2. A `401 Authentication Error` can mean "wrong key" *or* "wrong plan" — same body, either way

The "Authorization using API Key" article states this in as many words: *"This 401 error will occur
if the site's Thinkific pricing plan does not allow access to the API. Thinkific customers must be on
the Grow/Pro + Growth Plan or above."* The response body is identical either way —
`{"error":"Authentication Error"}`, 32 bytes, confirmed live — so `auth/api-key.ts#test` reports both
possibilities rather than always blaming the credential. This is compounded by a second, genuinely
different 403 (`ErrorForbiddenAppsNotAvailableResponse`, *"Access to Apps is not available on your
plan"*), which this app's API-key auth can also hit and which `test` reports distinctly.

### 3. The vendor's own OpenAPI document disagrees with itself on error and filter shapes

- **Three `errors` shapes on a 422.** The "REST API Response Format" article shows an object keyed by
  field name (`{"errors": {"email": ["has already been taken"]}}`); the OpenAPI document's own worked
  example for `POST /enrollments` shows a bare array of strings
  (`{"errors": ["Course could not be found.", "User could not be found."]}`); and the
  `UnprocessableEntityError` *schema* declares yet a third shape, an array of `{"field_name": "..."}`
  objects. [`lib/client.ts#formatValidationErrors`](lib/client.ts) handles all three.
- **Bundle Enrollment `completed`/`expired` filters are typed as dates, described as booleans.** The
  OpenAPI parameter description reads *"Filter for only completed Bundle Enrollments when set to
  true"* (boolean semantics) but its `schema` is `{type: string, format: date-time}` — looks like a
  copy-paste slip from the date filters listed right below it, especially since the equivalent filters
  on plain `GET /enrollments` are declared as ordinary booleans. `bundles-enrollments-list` follows the
  description and the sibling endpoint's precedent, and exposes both as booleans (documented in that
  action's own header comment).
- **`OrderResponse.amount_dollars` is a string; the same field on a nested order `Item` is a number.**
  Real, not a transcription error — see `orders-get.ts`.

## Auth

One method: `api-key`, type `custom` (two headers at once — `ApiKeyConfig` can only express one).

Thinkific also has an OAuth 2.0 flow (`OAuthAccessToken`, bearer) for apps distributed through the
Partner Portal that need multi-Site access. This app ships only the API key, which is what the vendor
frames as the right choice for a single-Site integration ("a simple way to gain access to the API for
an individual Thinkific Site... for the purpose of building a private or one-off app") and needs no
app registration, client secret or redirect URI.

**OAuth scopes never apply here.** "REST Permissions and Scopes" states explicitly: *"This does not
apply to apps using the API Key Authorization."* So a 403 seen through this Connection is never the
scope-gap error ("App does not have permission... check the access token permissions") — it is the
plan-gating one instead. See `auth/api-key.ts#test`.

### The probe is `GET /courses?limit=1` — the vendor's own documented smoke test

Not a guess: it is the literal command the "Authorization using API Key" article tells a developer to
run to *"test your connection"*. It also independently satisfies the usual bar:

| Property | `GET /courses` |
|---|---|
| Requires a credential? | ✅ `401 {"error":"Authentication Error"}` unauthenticated, 32 bytes, measured live |
| Needs an OAuth scope? | Moot (API-key auth is scope-exempt) — but even the OAuth "Courses" scope it sits behind is one of the narrowest read-only ones in the vendor's table |
| Leaks anything? | ✅ Course catalogue data only — names, slugs, descriptions, never a credential |

`afterConnect` calls no further endpoint: Thinkific's Admin API publishes no whoami / site-info route
(confirmed absent from the OpenAPI document), so there is nothing more to fetch. It only normalizes
the subdomain a user may have pasted as a full URL.

## Actions

20 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
|---|---|---|
| `courses-list` | read | `GET /courses` |
| `courses-get` | read | `GET /courses/{id}` |
| `users-list` | read | `GET /users` |
| `users-get` | read | `GET /users/{id}` |
| `users-create` | perform | `POST /users` |
| `users-update` | perform | `PUT /users/{id}` |
| `users-delete` | perform | `DELETE /users/{id}` |
| `enrollments-list` | read | `GET /enrollments` |
| `enrollments-get` | read | `GET /enrollments/{id}` |
| `enrollments-create` | perform | `POST /enrollments` |
| `enrollments-update` | perform | `PUT /enrollments/{id}` |
| `orders-list` | read | `GET /orders` |
| `orders-get` | read | `GET /orders/{id}` |
| `products-list` | read | `GET /products` |
| `products-get` | read | `GET /products/{id}` |
| `bundles-get` | read | `GET /bundles/{id}` |
| `bundles-courses-list` | read | `GET /bundles/{id}/courses` |
| `bundles-enrollments-list` | read | `GET /bundles/{id}/enrollments` |
| `bundles-enrollment-create` | perform | `POST /bundles/{id}/enrollments` |
| `bundles-enrollment-update` | perform | `PUT /bundles/{id}/enrollments` |

### Why Courses, Orders and Products are read-only here

The OpenAPI document declares no `POST`/`PUT`/`DELETE` under `/courses`, `/orders` or `/products` at
all — a Course is authored in the Thinkific course builder, an Order is a purchase record, and a
Product's sellable metadata is edited alongside its Course/Bundle, none of it through this surface. So
this app ships no create/update/delete actions for those three resources rather than inventing ones
the reference does not support.

### Bundles have no list endpoint

`/bundles` only ever appears id-scoped (`/bundles/{id}`, `/bundles/{id}/courses`,
`/bundles/{id}/enrollments`) — confirmed by reading every path in the OpenAPI document. To discover a
Bundle's id, use `products-list` and filter for `productable_type == "Bundle"`, then read
`productable_id`.

### Idempotency

`users-create`, `enrollments-create` and `bundles-enrollment-create` are `idempotent: false`: each
call genuinely mints a new resource (or, for the Bundle Enrollment endpoint, several — one per Course
in the Bundle), and Thinkific's API accepts no idempotency key for any of them. `users-update`,
`users-delete`, `enrollments-update` and `bundles-enrollment-update` are `idempotent: true`: a `PUT`
overwrites to the same end state and a delete's end state does not change no matter how many times it
runs.

### Notes on individual actions

- **`enrollments-create` / `bundles-enrollment-create` default to a free trial.** Per the vendor's own
  field description: *"If not provided, the Enrollment is a free trial"* — preview content only, not
  full access. Set `activatedAt` to the current time for full access immediately. Both actions' param
  hints say this plainly, since an enrollment created without it "succeeds" while the student still
  cannot see the paid content.
- **`users-update`'s `email` field can be silently ignored by an OAuth-scoped app.** The
  `UpdateUserRequest` schema note: *"This can only be updated by private integrations."* This app's
  API-key auth is exactly that kind of private integration, so the field works here — the hint exists
  for anyone who copies this action's shape into an OAuth-based app.
- **`users-get`/`users-update`/`users-delete`'s `id` accepts a Thinkific numeric ID or an External
  ID.** The External ID form requires `provider` (`SSO` or `OPENID_CONNECT`) and, unlike every
  `query[...]`-namespaced list filter in this app, is sent as a **bare** `provider` query parameter —
  the OpenAPI document names it plainly, not namespaced.
- **`bundles-enrollment-update` takes `userId` in the body, not the path.** Unlike
  `PUT /enrollments/{id}`, the Bundle Enrollment endpoints are addressed by `(bundleId, userId)`
  together — there is no single Enrollment id to path against, since one call touches several rows (the
  Bundle Enrollment plus one per Course).
- **`bundles-enrollment-create` reports the raw HTTP status (201 or 202), not invented fields.** The
  vendor documents both response codes ("created synchronously" / "created asynchronously") with no
  body schema for either. Poll `bundles-enrollments-list` or `enrollments-list` (filtered by `userId`)
  to see the resulting rows.
- **List pagination caps at 250, not the 25 default.** "REST API Response Format": *"You can override
  this limit to a maximum of 250 items."* Every list action's `limit` param states this ceiling.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked two ways

**(a) Content-type and body.** `GET /api/v2/summary.json` answers `application/json`, 7,321 bytes,
parsing as the Statuspage v2 schema — not the ~127,700 B HTML an unclaimed `*.statuspage.io` serves.

**(b) Does the page describe *this* product?** Yes —
`"page": {"id": "w1vms1jfy8ry", "name": "Thinkific", "url": "https://status.thinkific.com"}`, with 20
components: Thinkific's own (`Thinkific Application`, `Thinkific.com`, `Thinkific Help Center`,
`Thinkific Webhooks`, `Thinkific Partner Portal`) plus its infrastructure dependencies (AWS
eks/elasticache/elasticsearch/lambda/rds/route53/sqs, Stripe API, Stripe Dashboard, Mailgun,
Filestack, Fastly, Wistia).

Unlike a lot of vendors in this pack, **no component is literally named "API"**. The Admin API this
app calls is served from the same platform `Thinkific Application` covers — there is no separate
`api.*` entry on the page — so this check treats that component's own status as the App's health
signal (worsening the verdict even if the page-level `status.indicator` has not yet rolled up), while
still reporting every other component so a real incident is never hidden.

Severity is left at the `degraded` default: Thinkific is SaaS-only, so an incident here is evidence
about every Connection this app can hold.

### ~~`quota`~~ — a declared absence, at `informational` severity

Thinkific's "REST API Rate Limits" article documents **120 requests/minute** per Site plus a **10
concurrent** requests ceiling, both producing a `429` with a `RateLimit-Reset` header (epoch
milliseconds until the window clears) — and nothing else. No response, ordinary or otherwise, carries
a remaining-count header of any kind, so there is nothing to read *before* the account is already
being throttled. Reporting a number here would mean fabricating one; reporting "ok" until the first
429 would just be `service`'s job with extra steps. See `health/quota.ts` for the full reasoning and
what was actually checked live.

## Deliberately not covered

Thinkific's Admin API surface is broader than the six resources named for this app. Left out, and why:

- **Chapters/Contents** (`/courses/{id}/chapters`, `/chapters/{id}`, `/chapters/{id}/contents`,
  `/contents/{id}`) — course curriculum structure, read-only in the API and one level below what a
  workflow typically automates (enroll/notify/report), not course *authoring*.
- **Coupons, Promotions** (`/coupons/**`, `/promotions/**`) — a full CRUD surface of their own; out of
  scope for this pass, not unsupported by the reference.
- **Categories/Collections, Category Memberships** (`/collections/**`, `/collection_memberships/{id}`)
  — site taxonomy management, likewise a full surface of its own.
- **Groups, Group Analysts, Group Users** (`/groups/**`, `/group_analysts/**`, `/group_users`) —
  B2B/team seat management, a distinct feature area from the six named resources.
- **Instructors** (`/instructors/**`) — course-authoring metadata, not a workflow automation target in
  this pass.
- **External Orders** (`/external_orders/**`) — the vendor's own tag description is a caveat this app
  takes seriously: *"any External Orders created through the API do not appear on the orders report or
  dashboard in your Thinkific site."* A workflow action that silently writes data nowhere visible in
  the product it is named after is a footgun; left out rather than shipped with that caveat buried in a
  hint.
- **Product Publish Requests** (`/product_publish_requests/**`) — an approval workflow for a specific
  multi-instructor site configuration, out of scope for this pass.
- **Course Reviews** (`/course_reviews/**`), **Custom Profile Field Definitions**
  (`/custom_profile_field_definitions`), **Site Scripts** (`/site_scripts/**`) — each a small, separate
  surface; none of them Courses, Users, Enrollments, Orders, Products or Bundles.
- **`users/{id}/authentications/{provider}`** — SSO authentication-record lookup, a detail of the
  External ID mechanism already covered by the `provider` param on the Users actions, not a resource
  of its own.
- **`products/{id}/related`** — a read the reference supports but that adds little beyond
  `products-get`'s own `related_product_ids` field.

Nothing was left out because it could not be confirmed: every endpoint named above is documented in
the vendor's OpenAPI document and was read there. Nothing in the six covered resources was omitted for
that reason either — courses/orders/products are read-only in the API itself, not under-covered by
this app.

## Icon

`assets/icon.png` is Thinkific's own mark, downloaded **verbatim** from
`https://www.thinkific.com/apple-touch-icon.png` on 2026-08-15 — 180×180, `image/png`, 2,333 bytes,
md5 `177352de61b3e042329dc2c64109ea48`. It is byte-identical to the download. A test asserts the exact
byte length and the PNG signature, so a re-encode fails the suite.

The mark is dark ink on a transparent ground, which the pack's icon-legibility audit
(`_tools/icon-legibility.ts`) correctly flags as illegible on the dark app tile (`#1f232c`) — a raster
icon gets no automatic fix, only "needs a hand-authored plate". `assets/icon.dark.svg` is that plate:
a white rounded-rect backdrop with the **untouched** `icon.png` bytes composed on top via a base64
`<image>`, declared as `appearance.darkMode.icon`. The artwork itself is never re-inked or redrawn —
only the backdrop it sits on changes for the dark tile.

## Layout

```
thinkific/
├── package.json                       # manifest — the `w6w` identity block
├── index.ts                           # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                      # ThinkificClient, the 3 error-body shapes, error formatting
│   ├── params.ts                      # shared Param fragments (pagination, id, datetime hint)
│   └── users.ts                       # Users-specific Param fragments and enums
├── auth/api-key.ts                    # X-Auth-API-Key + X-Auth-Subdomain: sign, test, afterConnect
├── actions/                           # one file per action (20)
├── health/
│   ├── service.ts                     # status.thinkific.com
│   └── quota.ts                       # declared absence, informational
├── assets/
│   ├── icon.png                       # vendor mark, verbatim
│   └── icon.dark.svg                  # dark-tile plate: same PNG bytes, white backdrop
└── tests/                             # entry module, every action, auth, health, lib
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
