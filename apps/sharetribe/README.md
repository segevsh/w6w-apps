# Sharetribe

Manage marketplace users, listings, transactions and stock through Sharetribe's
**Integration API**, plus read-only marketplace config/content assets via the separate
**Asset Delivery API**.

- **Categories** — commerce, developer-tools
- **Auth methods** — integration-app (Integration API application: Client ID + Client Secret)
- **Actions** — 19 (17 Integration API + 2 Asset Delivery API, `requiresAuth: false`)
- **Health checks** — 2 (`service`, ~~`request-rate`~~) + the derived `auth:integration-app`
- **Egress allowlist** — `flex-integ-api.sharetribe.com` (Integration API),
  `flex-api.sharetribe.com` (Authentication API — token minting only), `cdn.st-api.com`
  (Asset Delivery API). `service` adds `status.sharetribe.com` to its own hook allowlist,
  never to the app's.
- **Website** — https://www.sharetribe.com/
- **API docs** — https://www.sharetribe.com/api-reference/index.html
- **Status page** — https://status.sharetribe.com/

> **Everything below was verified against Sharetribe's own sources on 2026-09-29** — the API
> reference's four pages (`index`, `integration`, `authentication`, `asset-delivery-api`
> — a hand-written static reference, no formal OpenAPI document, the same class of docs-only
> vendor as this pack's `cloudconvert` app) and live probes against `flex-integ-api.sharetribe.com`,
> `flex-api.sharetribe.com`, `cdn.st-api.com` and `status.sharetribe.com`. Nothing here came from a
> third-party integration directory.

## Sharetribe is a marketplace-as-a-service platform

An operator runs a marketplace (listings, users, bookings/orders, payments) on Sharetribe without
building the marketplace engine. This app is aimed at the operator's own backend automation —
approving pending listings, reacting to transaction events, reconciling stock — not at building a
Sharetribe-hosted storefront.

## Two API surfaces, one host determination

Sharetribe's reference splits its API into a **Marketplace API** (what a marketplace's own
end-user client authenticates against, as one logged-in marketplace user or anonymously) and an
**Integration API** ("trusted secure applications … your own backend systems … authorized
marketplace operators" — the vendor's own words, full read/write access to all marketplace data).

**This app covers the Integration API only.** The Marketplace API's own auth model doesn't fit a
workflow-host Connection: its authenticated form is a real marketplace user's own email+password
(`grant_type=password`), and its unauthenticated form (`grant_type=client_credentials` with only a
public client ID) grants nothing but anonymous `public-read` access. Modelling "connect as this one
shopper" would mean storing an end user's own password; there is nothing else to build actions on.

**Neither surface — nor the Authentication API used to mint a token — is addressed by a
per-tenant hostname.** Every marketplace on Sharetribe is reached through exactly the same fixed
hosts: `flex-api.sharetribe.com` (Authentication API *and* Marketplace API) and
`flex-integ-api.sharetribe.com` (Integration API), verified from the reference's own curl examples
on every endpoint page. A marketplace is identified by which `client_id`/`client_secret` pair
authenticates, not by subdomain or path segment — so, unlike an app that has to fall back to a
`*.vendor.com` wildcard for a per-tenant host, both entries in `w6w.network.allow` here are exact
hostnames. The separate, read-only **Asset Delivery API** is a *third* fixed host,
`cdn.st-api.com` — see "Asset Delivery API" below.

## Auth

One method: `integration-app`, `type: "custom"` — an Integration API application's Client ID and
Client Secret, exchanged for a bearer access token via `POST /v1/auth/token`,
`grant_type=client_credentials`, `scope=integ`.

### Refresh uses `grant_type=refresh_token`, per the vendor's own recommendation

Sharetribe's docs list `refresh_token` as present in the token response "when grant_type is
password or client_credentials **with a client_secret**" — which the Integration API grant always
has (unlike, say, Auth0's Management API grant in this pack's `auth0` app, which returns none).
`refresh` uses it via `grant_type=refresh_token` — the vendor's own stated reason: "reduces the
number of HTTP requests in which your long-lived application secret is used." `exchange` falls back
to a fresh `client_credentials` grant only if a stored credential somehow carries no refresh token.

### The probe is `GET marketplace/show`

Sharetribe's Integration API documents no per-application scoping narrower than "is this a valid
Integration API credential" — unlike Apify or CloudConvert in this pack, there is no partially-
scoped Integration API token to work around. `marketplace/show` is the cheapest read that proves
the token: it needs a credential, returns only the marketplace's public `name`/`description`
(nothing secret), and is the reference's own first curl example. Measured live 2026-09-29: an
unauthenticated request answers `401 {"errors":[{"code":"auth-missing-access-token",...}]}`, and a
syntactically-plausible but wrong bearer token answers
`401 {"errors":[{"code":"auth-invalid-access-token",...}]}` — the two are distinguishable, unlike
CloudConvert's identical-either-way `UNAUTHENTICATED`.

## Actions

17 Integration API actions, plus 2 Asset Delivery API actions that opt out of auth entirely
(`requiresAuth: false` — see "Asset Delivery API" below). `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `marketplace-get` | read | `GET /marketplace/show` |
| `user-get` | read | `GET /users/show` |
| `user-list` | search | `GET /users/query` |
| `listing-get` | read | `GET /listings/show` |
| `listing-list` | search | `GET /listings/query` |
| `listing-create` | perform | `POST /listings/create` |
| `listing-update` | perform | `POST /listings/update` |
| `listing-close` | perform | `POST /listings/close` |
| `listing-open` | perform | `POST /listings/open` |
| `listing-approve` | perform | `POST /listings/approve` |
| `transaction-get` | read | `GET /transactions/show` |
| `transaction-list` | search | `GET /transactions/query` |
| `transaction-transition` | perform | `POST /transactions/transition` |
| `transaction-transition-speculative` | perform | `POST /transactions/transition_speculative` |
| `transaction-update-metadata` | perform | `POST /transactions/update_metadata` |
| `stock-set` | perform | `POST /stock/compare_and_set` |
| `event-list` | search | `GET /events/query` |
| `asset-get` | read | `GET cdn.st-api.com/v1/assets/pub/{clientId}/a/latest/{path}` |
| `asset-list` | search | `GET cdn.st-api.com/v1/assets/pub/{clientId}/a/latest/[prefix/]?assets=…` |

Every path above is prefixed `/v1/integration_api` except the two Asset Delivery actions.

### Two findings that shaped the design

1. **Command (`POST`) endpoints return only a bare resource reference by default** — no
   `attributes` — unless `?expand=true` is sent. `lib/client.ts`'s `SharetribeClient.command`
   sends it on every call, so a workflow step actually has something to chain on.
2. **The response envelope is JSON:API-flavoured** (`{id, type, attributes, relationships?}`), kept
   as-is rather than flattened — mirroring this pack's `kustomer` app, the other JSON:API-shaped
   vendor here, rather than Apify/CloudConvert's already-flat resources.

### Idempotency

`listing-update`, `listing-close`, `listing-open`, `stock-set` and `transaction-update-metadata`
are `idempotent: true` — each converges to the same end state on a retry with the same input
(a merge-update, a state-set, or a guarded compare-and-set). `listing-create` and
`transaction-transition` are `false`: both start real, side-effecting work (a new listing; a
process transition that Sharetribe's own reference notes can carry a payment side effect), and a
retry after success hits a documented conflict rather than repeating harmlessly.
`listing-approve` is `false` for the same state-precondition reason — it targets a listing
"currently in pendingApproval state," and calling it again after success targets an
already-published listing. `transaction-transition-speculative` is `true`: nothing is ever
persisted, by design — it exists to preview a transition's price breakdown or validate its
`params` without changing anything.

### Extended-data filters and per-marketplace search config are not exposed

`users/query`, `listings/query` and `transactions/query` all document `pub_*`/`priv_*`/`prot_*`/
`meta_*` extended-data filters, and `listings/query` additionally documents geolocation/
availability search (`origin`, `bounds`, `start`, `end`, `seats`, `availability`, `minDuration`,
`stockMode`, `minStock`). None of these is exposed as a static `param` here: they depend entirely
on each marketplace's own configured extended-data/search schema, which this app has no way to
introspect, and several combinations disable pagination past 100 results per the vendor's own
documented caveats. The plain filters each action does expose (state, author, time range,
keywords, price, sort, …) cover the general case; anything schema-specific needs a Function step
that builds the query string directly.

### `listings/create`'s `availabilityPlan` and `protectedFileAttachments` are not exposed

`availabilityPlan` is a nested object whose full shape lives on a separate reference page this
app's research did not reach, and `protectedFileAttachments` needs a `fileId` minted by the
file-upload endpoints (`files/create`, `file_uploads/create`) this app does not cover. Both are
still reachable by round-tripping a plain `json` body through a Function step calling
`listings/update` directly if needed — `listing-update`'s own extended-data params cover the more
common case.

## Health checks

Two declared checks plus the derived `auth:integration-app`.

### `service` — `status.sharetribe.com` is a real, claimed Statuspage

Verified three ways on 2026-09-29. **(a)** Genuinely claimed: `/api/v2/summary.json` answers `200`
with 8,067 bytes of Statuspage v2 JSON; a nonsense path under the same page answers `404`.
**(b)** Self-identifies: `page.name` is `"Sharetribe"`. **(c)** Names this app's own API surface —
four components are, verbatim, `Marketplace API`, `Integration API`, `Authentication API` and
`Asset Delivery API`; every host this app declares in `network.allow` has a named component here.

The remaining components (Chargebee billing, Intercom support, SendGrid email, AWS S3/imgix asset
rendering infra, Sharetribe's no-code product) are genuinely upstream of *Sharetribe the company*
rather than of the APIs this app calls, but are still reported — keyed by the vendor's own
component id, with a note that they're outside this app's API surface, so a reader skimming names
never mistakes `Image Storage - AWS S3` for one of this app's own hosts. Severity is left at the
`degraded` default: there is no self-hosted Sharetribe, so every marketplace this app can hold a
Connection to runs on exactly the infrastructure this page describes.

### ~~`request-rate`~~ — a declared absence, at `informational` severity

Sharetribe's Integration API exposes no remaining-request-count header or quota endpoint of any
kind. Verified live 2026-09-29 — a `GET marketplace/show` response, both successful and a 401,
carried no `X-RateLimit-*`/`RateLimit-*`-shaped header. The reference's own "Rate limits" section
states fixed ceilings in prose only (1 query request/second and 1 command request/2 seconds per
client IP, **dev and test environments only**; 100 req/min total for `listings/create`; 5 req/30min
for `users/verify_email`; 10 concurrent requests per client IP in every environment) and documents
no remaining-count signal beyond the `429` itself. `severity: "informational"` keeps a declared
absence from pinning the app's overall verdict at `unknown` forever.

## Asset Delivery API

`cdn.st-api.com` — a **third**, separate, fixed host, entirely read-only and unauthenticated in
the credential sense. The vendor's own words: "Requests to the Asset Delivery API are authenticated
with a client ID of a valid Marketplace API application. The client ID is given as part of the
request URL path and **is not sent as a separate header**." A Marketplace API client ID is a public
value, meant to ship inside a browser bundle — the same shape as a Stripe *publishable* key — so it
is not a secret to route through an Auth connection's `sign` hook; `asset-get` and `asset-list` take
it as an ordinary required `param` and declare `requiresAuth: false`, the same shape this pack's
`cloudconvert` app uses for its public `operation-list` action.

A made-up/unknown client ID does not distinguish itself from a made-up asset path — both answer the
identical `404 {"errors":[{"code":"not-found",...}]}`, measured live 2026-09-29 — so there is no
"is this client ID even real" probe to build a dedicated health check on; `service` above covers
this surface via the vendor's own status page component instead.

`asset-get` reads one asset by its `latest` alias; `asset-list` reads several at once via the
`assets=` query parameter, optionally scoped by a shared `pathPrefix`. Access **by concrete
version** (`/v/{version}/`, rather than the `latest` alias) is not exposed — it exists mainly for
long-lived caching of an already-known asset tree version, a concern that belongs to the caller
building the URL rather than to a workflow action.

## Deliberately not covered

Sharetribe's Integration API reference documents well over twenty endpoints; this app's first pass
covers the marketplace/user/listing/transaction/stock/event lifecycle above. Left out, and why:

- **`users/update_profile`, `users/update_permissions`, `users/verify_email`, `users/approve`** —
  real, documented user-management commands this pass did not reach. None was left out because it
  could not be confirmed against the reference.
- **`availability_exceptions/*`** (query/create/delete) — a booking-availability surface adjacent
  to, but distinct from, the listing/transaction lifecycle this app centres on.
- **`images/upload`** — the endpoint `listing-create`/`listing-update`'s `images` param depends on
  to mint an image ID in the first place; left out to keep this pass's scope to the listing
  lifecycle rather than the upload pipeline behind it.
- **`messages/query`** — read-only access to a transaction's chat messages.
- **`files/*`, `file_attachments/*`, `file_downloads/create`** — the file-upload/attachment
  surface `listings/create`'s `protectedFileAttachments` param depends on; see "listings/create's
  availabilityPlan and protectedFileAttachments are not exposed" above.
- **`stock_adjustments/query`, `stock_adjustments/create`** — the stock-adjustment history behind
  `stock-set`; `stock-set` (`stock/compare_and_set`) covers the common "set the total" case.
- **`stock_reservations/show`** — read-only access to a single stock reservation.
- **The Marketplace API and its OAuth2 authorization-code/password flows** — see "Two API
  surfaces, one host determination" above.
- **Asset access by concrete version** — see "Asset Delivery API" above.

Nothing above was left out because it could not be confirmed: every endpoint named is documented on
Sharetribe's own reference pages.

## Icon

`assets/icon.png` is Sharetribe's own mark, downloaded **verbatim** from
`https://www.sharetribe.com/apple-touch-icon.png` on 2026-09-29 — 7,882 bytes, `image/png`, served
directly by the vendor as its own touch-icon. Sharetribe publishes no separate SVG mark reachable
from its marketing site, so this app declares `appearance.icon.url`/`sizes` (a raster source)
rather than `appearance.icon.svg` — the same pattern this pack's `affinity` app uses for a vendor
with no SVG mark.

## Layout

```
sharetribe/
├── package.json                    # manifest — the `w6w` identity block
├── index.ts                        # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                   # SharetribeClient (Integration API) + error formatting
│   ├── asset-client.ts             # AssetDeliveryClient (cdn.st-api.com, no auth)
│   └── params.ts                   # shared Param fragments and output shapes
├── auth/integration-app.ts         # Client ID + Client Secret -> client_credentials grant
├── actions/                        # one file per action (19)
├── health/
│   ├── service.ts                  # status.sharetribe.com (Statuspage)
│   └── request-rate.ts             # declared absence, informational
├── assets/icon.png                 # vendor mark, verbatim
└── tests/                          # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
