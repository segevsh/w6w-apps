# Ecwid

Manage an **Ecwid by Lightspeed** store over its REST API v3 (`app.ecwid.com`): the product
catalog and its stock, the category tree, orders, customers, discount coupons and the store's own
profile and settings.

- **Categories** — commerce, productivity
- **Auth methods** — api-key (a store id plus a custom app's secret access token)
- **Actions** — 23
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `app.ecwid.com` (the `service` health check adds `status.ecwid.com` to its
  own hook allowlist, never to the app's — no action ever reaches it)
- **Website** — https://www.ecwid.com/
- **API docs** — https://docs.ecwid.com/api-reference/rest-api/rest-api-overview
- **Status page** — https://status.ecwid.com/

> **Verified against Ecwid's own sources on 2026-09-22** — the vendor's documentation site
> (`docs.ecwid.com`, which serves clean Markdown at `<page>.md`; the full index is
> `https://docs.ecwid.com/llms.txt`) for every path, verb, query parameter, body field, response
> envelope and access scope used here, plus live probes of `app.ecwid.com` and
> `status.ecwid.com` the same day. Nothing came from a third-party integration directory, a
> sibling app, or Ecwid's marketing pages.

## Auth

Ecwid's REST API is nominally OAuth 2.0, but that story is for **public** apps installed into many
stores — and a workflow connection is not one. The vendor's own quickstart says so: *"If you
customize your own store, however, you can skip OAuth and easily get an access token for your
store"*, from **my.ecwid.com → Develop Apps → your app → Details**. So the credential is exactly two
values:

| Field | What it is | Where it goes |
| --- | --- | --- |
| `storeId` | Numeric Ecwid store id | **A path segment** on every request: `/api/v3/{storeId}/…` |
| `token` | The custom app's **secret** access token (`type: "secret"`) | `Authorization: Bearer <token>` |

The public token is explicitly *not* accepted here: per the same page it "allows only public data
to be received", while the secret token is what reaches the REST API.

Because the store id is part of the **path**, `lib/client.ts` builds
`/api/v3/__storeId__<path>` and `auth/api-key.ts`'s `sign` hook substitutes the real id — the same
division of labour as `apps/folk`'s `networkId` placeholder. `sign` is the only hook that holds the
credential, so it is the only place either half can go on the wire, and the token never appears in a
URL (a workflow host logs URLs, not headers).

**The probe is `GET /profile`.** It returns store settings and never echoes the token, and it is the
one read a correctly-scoped connection always reaches. A body-carrying failure is classified from
the vendor's own `errorCode` (`STORE_NOT_FOUND`, `INVALID_API_TOKEN`, `INSUFFICIENT_APP_SCOPE`,
`STORE_IS_SUSPENDED`, …).

### The one documented exception to "never judge from the status code"

Live probing on 2026-09-22 against the documentation's own demo store (`1003`) returned a bare
**`403` with an empty body** (`content-length: 0`) for *both* a missing `Authorization` header and a
fake token, while an out-of-range store id returned the documented
`404 {"errorCode":"STORE_NOT_FOUND","errorMessage":"Store not found"}`. Ecwid also documents both of
its token errors (`INVALID_API_TOKEN`, `INSUFFICIENT_APP_SCOPE`) as 403.

So for this vendor, a bodyless 401/403 *is* the credential being refused, and `sign`'s counterpart
in `auth/api-key.ts` classifies it that way — while still preferring `errorCode` whenever a body
*is* present (a `STORE_NOT_FOUND` body is authoritative, whatever status carries it). The exception
is called out in the code comments in both `lib/client.ts` and `auth/api-key.ts`, because it
otherwise contradicts the pack's usual rule.

## Actions (23)

| Resource | Actions |
| --- | --- |
| Store profile | Get, Update |
| Product | Search, Get, Create, Update, Delete, **Adjust Stock** |
| Category | Search, Get, Create, Update, Delete |
| Order | Search, Get, Create, Update |
| Customer | Search, Get, Create, Update |
| Discount coupon | Search, Create |

Every action calls `/api/v3/{storeId}/…` and nothing else. All search actions expose `offset` and
`limit` — **defaulting to 50, not to Ecwid's own maximum of 100** — and return the vendor's page
(`items` plus `total`, `count`, `offset`, `limit`).

Write actions follow one shape: the handful of fields a workflow actually sets are typed params, and
everything else the endpoint documents comes through an `extraFields` JSON object that is merged
over them (and wins). Ecwid's write bodies are large — `POST /products` documents 40+ properties,
`PUT /profile` a whole nested settings tree — so a generated form for all of them would be
unusable.

### `product-stock-adjust` is deliberately not idempotent

`PUT /products/{productId}/inventory` takes `{"quantityDelta": n}`: positive adds, negative
subtracts. That is the safe way to reflect a sale or a return, because it does not require reading
the product first and cannot clobber a concurrent change the way an absolute `quantity` write can.
It is also the reason the action is marked `idempotent: false` alongside the five creates — applying
`-1` twice sells two units. `product-update`'s `quantity` field is the absolute write, for callers
that really do mean "the stock is now N".

## Health checks

- **`service`** (`kind: service`, default `degraded` severity) — reads
  `status.ecwid.com/api/v2/summary.json`, a genuine Atlassian Statuspage whose page self-identifies
  (`page.name` = `"Ecwid"`, `page.id` = `nb703gphjy4r`). Its verdict follows **only** the component
  named `API` (id `7qn5f4cpf4g8`, matched by id first and exact name as a fallback) — the storefront,
  checkout, admin, billing and third-party components are reported as detail but never drive the
  state, because a checkout incident is not evidence that `app.ecwid.com` is failing. When the
  page-level indicator is worse than `API`'s own state, the message says so without changing the
  verdict. A broken, unreadable or re-pointed status page reports `unknown`, never `down`.
- **`quota`** (`kind: quota`, `severity: informational`, `unavailable`) — a declared **absence**,
  stated as a positive fact rather than left as a gap. Ecwid's only documented limit is 600
  requests/minute per token, signalled solely by a `429` with `Retry-After` in seconds; no remaining
  count, balance, spend ceiling or usage endpoint is published anywhere in the REST API reference.
  A workflow can budget calls and react to the `429` (this app's client surfaces the vendor's own
  `Retry-After`), but "how much is left" cannot be read. `informational` is load-bearing: an
  `unavailable` entry reports `unknown`, which outranks `ok`.

There is **no `kind: "dependency"` check**, and that is a deliberate absence too: a dependency check
exists to probe *this tenant's own host* (a self-hosted instance, a per-tenant subdomain), and
Ecwid has neither — every connection talks to the same fixed `app.ecwid.com`. That host is what the
`service` check's `API` component describes, so a second probe would duplicate it. `apps/apify`,
which has the same fixed-host shape, declares none either.

## What was deliberately left out, and why

Ecwid's REST API reference is 271 pages across products, variations, categories, orders, customers,
discounts, shipping, payments, staff, reports and the app platform. This build covers the 23 that a
store-management workflow reaches for first. Everything below is a scope decision, not an unverified
detail — the endpoints exist and are documented; none of them was left out because its shape could
not be confirmed.

- **Product variations** (search/get/update/create/delete, variation stock, variation images) — a
  whole sub-resource with its own combination ids. The base-product stock action is here; a
  variation-aware stock write needs its own design.
- **Product images and videos, product files, product types and attributes, product reviews, size
  charts** — file-upload and merchandising surfaces, several of which are multi-step async uploads
  that an action's single request/response shape does not fit.
- **Promotions** (the newer automatic-discount engine) and the coupon update/get/delete endpoints —
  coupons are covered search + create, which is what a campaign workflow needs; the rest of the
  discount family is a follow-up.
- **Abandoned carts, recurring subscriptions, order invoices/PDFs, order statuses and order extra
  fields, order deletion, Calculate Order Details** — order sub-resources. `calculate-order-details`
  is the most tempting omission: it is how a workflow would compute a correct `total` rather than
  trusting its own arithmetic, and it is a natural next addition.
- **Customer groups, customer contacts, customer extra fields, customer deletion** — related
  records that belong to a customer-focused follow-up build.
- **Staff accounts, application/billing endpoints, batch requests, webhooks, store reports,
  Instant Site, domains, shipping and payment options** — administration and platform surfaces that
  a store-management workflow does not need, or that belong to Ecwid's *app* platform rather than
  its store API.
- **`POST /orders`'s `subtotal`/`total` are typed but never computed for you.** The API stores what
  it is told; a workflow must send correct figures (see Calculate Order Details, above). Likewise
  `order-update` deliberately does not expose `subtotal`/`total` as typed fields, because recomputing
  the accounting figures is not a status change — they remain reachable through `extraFields`.
- **A customer `password` is not reachable from any action**, even though `POST /customers`
  documents one for stores on the legacy sign-in. Handing a workflow step a customer's password is a
  liability this app does not need.
- **`GET /categories/{id}`'s `productIds=true`** *is* implemented, even though the page's
  query-param table does not list it: two of that page's response-field descriptions say the field
  requires it ("Requires `productIds=true` query param"), so it is documented, just not where a
  reader would look first. The same page's `productIds` field on **update** is *not* exposed, because
  assigning products has dedicated endpoints that cannot replace a category's whole membership by
  accident.

## Notable API quirks (see the file-level doc comments for the full detail)

- **Three response envelopes.** Searches answer `{total, count, offset, limit, items}`, creates
  answer `{id}` (`{id, code}` for coupons), and updates/deletes answer `{updateCount: 1}` /
  `{deleteCount: 1}`. There is no single envelope to unwrap, so `lib/client.ts` exposes one
  `json()` that hands the body back whole.
- **`enabled: false` is a filter, not an absent flag.** "Set `true` to get only enabled products.
  Set `false` to get only disabled products." The client therefore keeps `false` in a query string
  instead of dropping it — and the same is true of `inStock`, `taxExempt`, `acceptMarketing` and
  `hidden_categories`.
- **Order ids are strings.** `get-order.md` types `orderId` as a number and then says it "can
  contain prefixes and suffixes, for example: `EG4H2,J77J8`"; its own search example answers
  `"id": "EBJFT"`. Every order id in this app is a string.
- **Search orders has no `status` and no `orderNumber` filter.** Order state is filtered through
  `fulfillmentStatus` and `paymentStatus`, both of which accept several comma-separated values in
  one param (declared as strings here, not single-choice selects).
- **Coupon filter names differ from coupon body names**: the search filters are `discount_type` and
  `availability`; the create body's same fields are `discountType` and `status`.
- **Dates are strings, not `date` params**: Ecwid accepts either a UNIX timestamp or
  `2023-01-15 19:27:50`, and coupon dates carry a UTC offset (`2024-06-06 08:00:00 +0400`) that the
  API then corrects to UTC+0.
- **`POST /products` marks `sku`, `name` and `price` Required.** All three are declared required
  here, per the page.
- **`PUT /customers/{id}` requires `read_customers`** — the vendor's page says so, and there is no
  `update_customers` scope to ask for.
- **Deleting a category does not delete its products.** They stay in the catalog and simply lose the
  assignment, so "remove this category and everything in it" is two actions.
- **Skip-paging is the caller's job.** `offset`/`limit` are exposed, and Ecwid pages by offset with
  no cursor, so a workflow that walks a large catalog should page on a stable sort (`ADDED_TIME_ASC`
  or an explicit `sortBy`), not on the relevance default.
- **The icon is the vendor's raster mark**, wrapped as a base64 PNG data URI inside a minimal SVG
  (Ecwid publishes no SVG logo, and redrawing a vendor mark is not this app's job) — the same
  treatment the pack already gives 36 other PNG-only marks.

## Testing

Unit tests mock `HookContext` (`ctx.fetch`, no-op `ctx.log`) via [`tests/_helpers.ts`](tests/_helpers.ts)
— no network access, no real credential. The helpers resolve the `__storeId__` placeholder the way
`sign` would, so path and query assertions read like the real request. Run with `deno task test` from
this directory; `deno task check`, `deno task lint`, `deno task fmt` and `deno task validate` (the
pack auditor) are the rest of the gate.
