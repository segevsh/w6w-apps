# BigCommerce

Manage a BigCommerce store's **catalog, orders, customers, carts, inventory, price lists and
webhooks** from a workflow, over the REST Management API (`api.bigcommerce.com`).

38 actions, one auth method, five declared health checks.

## Sources

Everything in this app was verified on **2026-08-11** against, in order of authority:

1. **BigCommerce's own machine-readable OpenAPI 3.1 documents** — the primary source. The vendor
   publishes **78 distinct** specification documents, one per API family, at
   `https://docs.bigcommerce.com/openapi/<name>.json`, indexed at
   `https://docs.bigcommerce.com/docs/rest-catalog/openapi.json`. Twenty of them cover this app's
   surface; `admin-catalog-products.json` alone is 457,109 bytes. Every path, verb, query
   parameter, request-body field, required-field list and enum here is copied from them.
2. **The prose reference and guides** at `https://docs.bigcommerce.com/developer` — for the things
   a schema cannot say: the Deprecations and Sunsets list, rate limits, API accounts, and the
   Orders overview. Every page there serves a clean Markdown rendering if you append `.md`, and an
   index at `/llms.txt`.
3. **Live probes** against `api.bigcommerce.com` and `status.bigcommerce.com`, recorded inline
   wherever a code comment says "measured".

**What was deliberately not used:** `github.com/bigcommerce/api-specs`. It is the first result for
"bigcommerce openapi" and it is **archived** — GitHub reports `archived: true` with its last push
on 2024-01-09. It describes an API two years stale and nothing in this app came from it.

`developer.bigcommerce.com` 301s to `docs.bigcommerce.com/developer`; both hostnames appear in the
vendor's own links and neither is wrong.

## The five things most likely to go wrong

### 1. "v3 replaced v2" is true for some resources and false for others

This is the single most expensive misconception about BigCommerce, and it costs a day the first
time because the fix looks like a migration rather than a lookup.

The version number tells you **nothing** about whether an endpoint is current. The only complete
answer is the vendor's
[Deprecations and Sunsets](https://docs.bigcommerce.com/developer/docs/overview/api-fundamentals/deprecations-sunsets)
page. Read on 2026-08-11 it deprecates exactly:

| Deprecated                   | Replacement                            |
| ---------------------------- | -------------------------------------- |
| `/v2/products`               | `/v3/catalog/products`                 |
| `/v2/customers`              | `/v3/customers`                        |
| `/v2/categories`             | `/v3/catalog/trees/categories`         |
| `/v2/brands`                 | `/v3/catalog/brands`                   |
| `/v2/pages`, `/v2/redirects` | their v3 equivalents                   |
| `/v2/options`, `/v2/option_sets` | v3 modifiers + variant options     |
| `/v3/hooks/events`           | the webhook event reference            |
| `/v3/content/widgets/search` | `GET /v3/content/widgets`              |

**`/v2/orders` and `/v2/store` are not on it, and neither has a v3 replacement.**

- Order **CRUD exists only at `/v2/orders`**. "Orders V3" — the
  `admin-management-order-operations` document — contains transactions, refunds, metafields and
  settings, nothing else. The vendor's own Orders overview says so in its first paragraph, and its
  create/read/update examples all use `/v2/orders`.
- "Store Information V3" is a **different resource**: `/v3/store/metafields`. The store profile is
  `GET /v2/store` and has no v3 form.

So a single order is addressed under **two versions at once** and both are current: `/v2/orders/{id}`
for the order, `/v3/orders/{id}/transactions` for its payments. That is by design, not a migration in
progress.

### 2. A deprecation the machine-readable spec does not carry

**Not one of the 392 operations in the twenty OpenAPI documents this app was built from sets
`deprecated: true`.** Including `/v3/catalog/categories`, which the Deprecations page deprecates in
favour of the Category Trees endpoints.

The only in-spec signal is a sentence at the head of each operation's `description`: *"When
possible, use the [Catalog Trees — Get all categories] endpoint instead."* A client generated from
the spec alone — or written by grepping it for `deprecated` — ships the dead path and never notices.

It is also a **v3-to-v3** deprecation, which is the shape nobody looks for after being warned about
v2. And the old endpoint is not merely old: its own description says it is for "categories of a
default BigCommerce storefront (`channel_id=1`)", so on a multi-storefront store it quietly returns
a subset. `category-list` uses `GET /v3/catalog/trees/categories`.

### 3. Four different problems, one status code — and the body is the only discriminator

Measured live on 2026-08-11 against
`https://api.bigcommerce.com/stores/abc123/v3/catalog/products`:

| Request                          | Status  | Content-Type       | Body                                             |
| -------------------------------- | ------- | ------------------ | ------------------------------------------------ |
| no `X-Auth-Token` header         | **401** | `text/plain`       | `X-Auth-Token header is required`                |
| `X-Auth-Token:` with empty value | **401** | `text/plain`       | `X-Auth-Token header should have correct format` |
| `X-Auth-Token: <nonsense>`       | **401** | `application/json` | `{"status":401,"title":"Unauthorized",…}`        |
| wrong store hash                 | **403** | —                  | (per the vendor's troubleshooting table)         |

"The credential never got attached" and "the credential is wrong" are the same 401, and only the
content type and prose tell them apart. `lib/client.ts#classifyAuthFailure` does exactly that, and
`auth/access-token.ts` reports a different, actionable message for each.

The 403 is worse: BigCommerce's own troubleshooting entry gives **two** causes — a missing OAuth
scope *or* a wrong store hash ("Check the URL. Are the endpoint and store hash correct?") — and
nothing on the wire distinguishes them. This app reports both rather than picking one.

### 4. An unsigned probe proves the route exists, and cannot prove the store does

Also measured, and genuinely useful:

| Unauthenticated request              | Status  | Body                                    |
| ------------------------------------ | ------- | --------------------------------------- |
| `GET /stores/abc123/v2/time`         | **401** | `X-Auth-Token header is required`       |
| `GET /stores/abc123/v3/carts`        | **404** | `The route is not found, check the URL` |
| `POST /stores/abc123/v3/carts`       | **401** | `X-Auth-Token header is required`       |

BigCommerce resolves the **route** before authenticating — and does so per method, as the `carts`
pair shows. That gives a credential-free existence check for any endpoint, and **every route this app
calls was verified that way** before shipping: 39 (method, path) probes over 30 distinct path
templates — the 29 the actions reach, plus `/v2/time`, which only `auth/` and `health/` call.
`tests/index.test.ts` derives the action route set from the sources rather than keeping a list, and
asserts it equals those 29, so an unverified path cannot be added silently.

The same measurement caps what a health check may claim: BigCommerce authenticates **before**
resolving the store (`abc123` is not a real store and still answered 401), so **no 401 says anything
about the store hash**. `health/api.ts` reports reachability and says so explicitly; validating the
store is `health/store.ts`'s job and needs a credential.

That `GET /v3/carts` 404 is also a real API fact, not an accident: **there is no list-carts
endpoint.** A cart is reachable only if you already hold its UUID.

### 5. Two envelopes, two boolean spellings, three success codes

- **v3** answers `{"data": …, "meta": {"pagination": {total, count, per_page, current_page,
  total_pages, links}}}`. **v2** answers the resource **bare** — a naked array for a collection —
  with **no pagination metadata at all**. There is no `total` and no `total_pages` for orders; that
  is why `GET /v2/orders/count` exists as a separate endpoint, shipped here as `order-count`.
- **Booleans are spelled two ways in one query string.** On `GET /v3/catalog/products`, `is_visible`
  is `type: boolean` in the schema (send `true`/`false`) while `is_featured` and `is_free_shipping`
  are `type: integer`, documented as "`1` for true, `0` for false". Sending `is_featured=true`
  filters on nothing and silently returns the whole catalog. `lib/client.ts` has `bool()` and
  `flag01()` and every call site names which one the vendor documents.
- **Success codes are inconsistent.** `POST /v3/catalog/products` → 200. `POST /v3/carts` → 201.
  `POST /v2/orders/{id}/shipments` → 201. `DELETE /v3/hooks/{id}` → **200 with a body**, where most
  deletes are 204. And **204 is a normal answer to a GET**: an order's shipping quotes "return a 204
  … since a shipping quote is not generated" for any order created through the API or control panel.
  The client maps an empty body to `undefined` and an empty v2 collection to `[]`.

## Auth

One method, `access-token`, of type `custom` — because the type describes what goes on the wire and
BigCommerce does **not** use `Authorization` for this API. The token is its own header,
`X-Auth-Token`, with no scheme prefix. The companion header `X-Auth-Client` is documented as
"No longer required for any requests", so it is never sent and the client ID is never collected.

Two fields, and only one is a secret:

| Field         | Type     | Why                                                                          |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `storeHash`   | `string` | A **path** segment (`/stores/{hash}/v3/…`), not a hostname and not a secret. |
| `accessToken` | `secret` | The credential. Only `sign` ever sees it.                                    |

Because the store hash is path-scoped rather than a per-tenant hostname, this app's egress allowlist
is a single exact host — `api.bigcommerce.com` — with no wildcard. Compare Shopify, which needs
`*.myshopify.com`.

`afterConnect` republishes the store hash into the Connection's redacted `display`, which is where
`lib/client.ts` reads it from; an Action never touches the credential. The connect form also accepts
the whole **API path** (`https://api.bigcommerce.com/stores/abc123/v3/`) because that is the string
the control panel actually shows a merchant.

**Store-level and app-level tokens both work** — the guide says both are "passed as the value of the
`X-Auth-Token` header". **Account-level tokens are deliberately out of scope**: they are for the
GraphQL Account API and "provide direct access to **all** the account's stores", which is a far wider
blast radius than one workflow connection should carry.

### The probe is `GET /v2/time`, and the vendor named it

Not a guess, and not a whoami. BigCommerce's own OpenAPI document describes `/v2/time` verbatim as
*"useful for validating API authentication details and testing client connections"*. It is right on
all three axes:

- **It requires a credential.** Unauthenticated it answers `401 X-Auth-Token header is required`.
  There is no unauthenticated read anywhere on `api.bigcommerce.com` for a probe to pass by accident
  — every one of the 39 routes here was probed without a credential and every one 401'd.
- **It returns nothing secret.** `{"time": <unix seconds>}`; its schema `timeStamp_Full` has exactly
  that one property.
- **It is the cheapest call in the API.** No collection scan, nothing that grows with the store.

One caveat, stated rather than glossed: BigCommerce's OpenAPI documents attach the **file-level**
OAuth-scope table to every operation in a file, so the "Information & Settings" table shown against
`/v2/time` is the same one shown against `/v2/store` and is not evidence that `/v2/time` needs that
scope. Because the vendor does not say either way, `test` does not assume: it reports a **403** as
"either the store hash is wrong or the API account lacks the Information & Settings scope", which are
the two causes the vendor's own troubleshooting table lists, rather than picking one.

It is specifically **not `GET /v2/store`**, the obvious alternative, whose response carries
`admin_email`, `order_email`, the owner's first and last name and the `account_uuid`. A health
probe's response is stored and displayed; using that endpoint would copy the merchant's contact
details into the health surface on every check, forever. It is still available as the `store-get`
Action, where a human asked for it, and `health/store.ts` reads exactly three fields off it.

`test` classifies from the **body**, never the status, and reports the four failures separately
(§3 above), plus a fifth distinction: a **429** or **503** means the token could not be *verified* —
which says nothing about whether it is good — and is reported that way rather than as a bad
credential.

## Actions

| Resource       | Actions                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Catalog        | `product-list` · `product-get` · `product-create` · `product-update` · `product-delete` · `catalog-summary-get`      |
| Variants       | `variant-list` · `variant-get` · `variant-update`                                                                   |
| Brands         | `brand-list`                                                                                                        |
| Categories     | `category-list` · `category-tree-list`                                                                              |
| Orders         | `order-list` · `order-get` · `order-count` · `order-create` · `order-update` · `order-status-list`                  |
| Order details  | `order-product-list` · `order-shipping-address-list` · `order-shipment-create` · `order-transaction-list`           |
| Customers      | `customer-list` · `customer-create` · `customer-update` · `customer-address-list`                                   |
| Carts          | `cart-get` · `cart-create` · `abandoned-cart-get`                                                                   |
| Inventory      | `inventory-item-list` · `inventory-location-list` · `inventory-adjust-relative`                                     |
| Price lists    | `price-list-list` · `price-list-record-list`                                                                        |
| Webhooks       | `webhook-list` · `webhook-create` · `webhook-delete`                                                                |
| Store          | `store-get`                                                                                                         |

### Idempotency

Every `perform` action declares `idempotent` explicitly, and honestly:

- **`false`** — `product-create`, `order-create`, `customer-create`, `cart-create`,
  `order-shipment-create`, `webhook-create`, `inventory-adjust-relative`. BigCommerce mints every id
  and accepts **no client-supplied idempotency key** anywhere in this surface, so a retried create
  makes a second thing. `order-shipment-create` additionally emails the customer again, and
  `inventory-adjust-relative` moves stock twice — that is the honest price of the form that does not
  lose concurrent updates.
- **`true`** — `product-update`, `product-delete`, `order-update`, `variant-update`,
  `customer-update`, `webhook-delete`. Same body, same target, same result; a repeated delete 404s
  rather than doing something different.

### Notes on individual actions

- **`order-create` does not send the store's order email.** The vendor states this outright, and its
  documented remedy is to create a *cart* and convert it through checkout instead — which is what
  `cart-create` is for. Changing an order's `status_id` via `order-update` *is* what fires the
  store's customer notifications.
- **`order-create` and historical data.** Supply `external_source: "M-MIG"` when migrating orders
  from another platform. That code excludes them from the store's GMV and order count, which factor
  into BigCommerce's own pricing — getting it wrong changes what the merchant pays.
- **`order-shipment-create` takes two ids that are easy to swap.** `order_address_id` comes from
  `order-shipping-address-list`; `items[].order_product_id` is the line `id` from
  `order-product-list` and is **not** the catalog `product_id`.
- **`customer-create` and `customer-update` take a JSON *array*.** v3 Customers is a batch-only
  collection: there is no `/v3/customers/{id}` path at all, and an update carries each customer's
  `id` in the body. Posting a bare object is the most common way these 422, so both actions refuse
  it locally with an explanation. The vendor's limit is **10 per call**, enforced here before the
  request.
- **`variant-list` is how you find a product by variant SKU.** The `sku` filter on
  `product-list` matches only the product's own main SKU — the vendor's parameter description says
  so — so a variant SKU there returns nothing and looks like a missing product.
- **`variant-update`'s `inventory_level` is absolute.** For an order-driven change use
  `inventory-adjust-relative`, which is what the vendor recommends for exactly that case: two
  absolute writes racing each other silently discard one, while two deltas compose.
- **`webhook-list` is not a store-wide list.** Webhooks, metafields and scripts are "only accessible
  to the API account that created them", so an empty result means *this connection* created none.
  Deleting the API account destroys its webhooks with it. A webhook destination must be HTTPS on
  **port 443** (custom ports are accepted at create time and never deliver), must answer 200, and
  deactivates itself after **90 days** without an event.
- **`abandoned-cart-get` takes a token, not a cart id** — the `t` parameter of the recovery link the
  store emails a shopper. It is also the one operation in this surface that documents 502/503/504
  responses of its own; treat a 5xx there as retryable, not as a missing cart.
- **`price-list-record-list` records are keyed by variant *and* currency**, so without a `currency`
  filter the same variant appears once per currency and looks duplicated.

## Health checks

Five declared checks — four live probes and one declared absence — plus one `auth:access-token`
check the host derives from the `test` hook for free.

### `service` — the status page is real, checked three ways

`https://status.bigcommerce.com/api/v2/summary.json`, an Atlassian Statuspage.

**(a) Is it a catch-all?** No: `/api/v2/summary.json` → 200/6,811 B, `/api/v2/status.json` →
200/235 B, `/api/v2/definitely-not-real-zzz.json` → **404/0 B**. Three answers, and the nonsense path
is refused. This matters more than usual here — `bigcommerce.com` itself serves a ~378 KB catch-all
for asset paths that do not exist, so "200 means it is there" is demonstrably false on this domain.

**(b) Content type and body.** `application/json`, parsing as the Statuspage v2 schema. Neither
unclaimed-host signature matches (`*.statuspage.io` unclaimed is ~127,700 B of HTML;
`*.instatus.com` ~216,800 B).

**(c) Does it describe this product, and cover the API?** `page.name == "BigCommerce"`,
`page.id == "qbn4dyd29jby"`, and the first of its 18 components is **`API & Webhooks`**
(`m5fqcsrqnq7b`) — the component covering `api.bigcommerce.com`, the only host this app calls.

Four of the 18 components are **not BigCommerce** (Avalara, Braintree, Braintree PayPal, Stripe, in
the `3rd Party Services` group). They are reported, keyed by the vendor's component id, but the
verdict comes from the page-level `status.indicator` — deriving it from the component list would
report BigCommerce down because Braintree is having a bad day.

`credential: "none"`, and `network.allow` is `["status.bigcommerce.com"]` on the check itself, never
on the app: a status host must never see an access token.

### `api` — unsigned reachability, honest about its limits

`kind: "dependency"`, `credential: "context"`, probing `GET /v2/time` **without** a credential. A
**401 is a pass** — per §4 it proves the route resolved and the API is serving, which a
human-updated status page cannot tell you in the first minutes of an incident. A 404 means
BigCommerce stopped serving the route; 503 is a down or suspended store; 429 is a busy one.

It cannot check the store hash and the description says so.

### `quota` — a live probe, because BigCommerce actually publishes the numbers

`kind: "quota"`, `credential: "signed"`, reading four headers off a `GET /v2/time`:
`X-Rate-Limit-Requests-Quota`, `X-Rate-Limit-Requests-Left`, `X-Rate-Limit-Time-Window-Ms`,
`X-Rate-Limit-Time-Reset-Ms`. Header names are documented as case-insensitive, so every read goes
through `Headers.get`.

Same endpoint as the credential probe on purpose: the headers ride on *every* response, so the
cheapest request in the API is the correct one to spend. `minIntervalSeconds: 60` keeps it to one
call a minute — 0.7% of a Standard plan's window quota.

The quota is the **store's**, shared by every app touching it, so a low reading may be someone
else's traffic. Below 20% of the window is `degraded`, at or below 5% is `down`, and a 429 is read
rather than treated as a failed probe (it still carries the headers). **Absent headers report
`unknown`, not zero** — an Enterprise Unlimited Rate Plan store has no request rate limit at all,
and reading their absence as exhaustion would report the least constrained accounts as the most
starved.

### `store` — is *this* store live?

`kind: "dependency"`, `credential: "signed"`, reading `status`, `plan_name` and `plan_is_trial` from
`GET /v2/store`. BigCommerce can be perfectly healthy while one store is suspended for a billing
reason, down for maintenance, or out of trial — and the vendor reports that last one nowhere else.

It has to be signed: BigCommerce authenticates before resolving the store, so an unsigned request to
a dead store and to a live one are byte-identical 401s.

A **403 is `unknown`, not a failure**: `/v2/store` needs the Information & Settings scope, and an API
account scoped to orders only will legitimately be refused it. Reading that as broken is the exact
trap that made HubSpot and Shopify pick different probes elsewhere in this pack.

`status` is **reported verbatim** when it is not `live`. The field is documented ("The status of the
store") but its value vocabulary is not published anywhere in the OpenAPI documents or the guides, so
this check treats one value as good and shows the raw string for everything else rather than
inventing a mapping for strings it has never seen.

### ~~`plan-limits`~~ — a declared absence, at `informational` severity

BigCommerce publishes **no API for plan object limits** — how many products, variants, categories or
SKUs, or how much storage, the plan still allows. Exhausting one surfaces only as a
`507 Insufficient Storage` on the write that crosses it, after the fact. The vendor's own status-code
table defines 507 as "when the store has reached a limitation for the resource, according to their
BigCommerce plan (e.g., 500-product limit)".

Verified two ways: none of the 78 distinct OpenAPI documents the vendor publishes is a limits, usage
or entitlements resource, and no documented response header carries an object count. `GET /v2/store`
returns the plan's name, level and trial flag — its *identity*, never a count against it.
`GET /v3/catalog/summary` returns `inventory_count` and `variant_count`, which is consumption with
no ceiling to compare it to; it ships as the `catalog-summary-get` Action instead.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this single line would pin the
app's verdict at `unknown` forever.

## Scope: REST Management only

BigCommerce ships several API families. **This app implements exactly one.**

| Family                                                     | Status       | Why                                                                                                            |
| ---------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| **REST Management** (`/stores/{hash}/v2\|v3/…`)            | **built**    | The server-side admin API, authenticated by `X-Auth-Token`.                                                    |
| REST Storefront (`/api/storefront/…` on the store's domain) | not built    | Authenticates by **same-origin session cookie**, not a token — a server-side workflow cannot call it at all.    |
| GraphQL Storefront / Admin / Account                        | not built    | Different transports. The Account API additionally needs a token that reaches **every store on the account**.   |
| B2B Edition REST (`api-b2b.bigcommerce.com`)                | not built    | Different host and an extra `X-Store-Hash` header — a second egress host for a product most stores do not have. |

Within REST Management, the deliberate exclusions are:

- **Content and themes** — pages, widgets, page-builder, scripts, email templates, redirects,
  themes, custom templates.
- **Payments** — the Payments API and payment-access-token flow. It uses a *different*
  authentication scheme (a `PAT` bearer minted from the access token) and moves money; it deserves
  its own review, not a corner of this one.
- **Tax and shipping provider integrations** — these are APIs a partner *implements and hosts*, not
  ones a workflow calls.
- **Promotions, coupons, gift certificates, channels, sites, currencies, store settings, customer
  segmentation, wishlists, subscribers, system logs.**
- **Metafields on every resource**, and the absolute inventory-adjustment endpoint
  (`PUT /v3/inventory/adjustments/absolute`) — see `actions/inventory-adjust-relative.ts` for why.
- **Collection-wide destructive endpoints.** `DELETE /v3/catalog/products` (deletes everything
  matching a filter), `DELETE /v3/customers`, and `DELETE /v2/orders`, whose vendor summary is
  literally "Delete All Orders". A filter that resolves to "everything" is one typo away from
  emptying a store with no undo. Single-resource deletes are shipped; collection deletes are not.

### Left out because it could not be confirmed

Nothing in this app is guessed. Two things were dropped rather than shipped on an assumption:

- **The v2 error envelope.** No published OpenAPI document describes the body v2 returns on a
  failure — the Orders and Customers V2 documents declare no error schemas at all — and it cannot be
  observed without a live credential (every unauthenticated request 401s before reaching a handler).
  So `formatBigCommerceError` reads the v3 `{status, title, type, errors}` shape when it is there and
  falls back to the **raw body** rather than asserting a v2 shape this app cannot verify.
- **The `status` vocabulary on `GET /v2/store`.** Documented as a field, undocumented as a value set.
  Reported verbatim; see `health/store.ts`.

## Icon

`assets/icon.svg` is the **verbatim** [simple-icons](https://simpleicons.org) BigCommerce mark,
downloaded from `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/bigcommerce.svg` —
700 bytes, md5 `d4323e6672e045bda50cbbe2021da971`, carrying `<title>BigCommerce</title>`. Nothing
was drawn, redrawn or reformatted: `deno task fmt` is scoped to the source directories and never
touches `assets/`, and `tests/index.test.ts` asserts both the title and the byte count.

`bigcommerce.com` was **not** used as a source: it serves a ~378 KB catch-all page for every asset
path that does not exist, so a 200 from it is not evidence a file is there.

## Layout

```
bigcommerce/
├── package.json          # identity: id, categories, icon, network.allow
├── index.ts              # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts         # the v2/v3 client, error classification, rate-limit headers
│   └── params.ts         # shared Param fragments and vendor enums
├── auth/
│   └── access-token.ts   # X-Auth-Token + store hash; sign / test / afterConnect
├── actions/              # 38 files, one per action
├── health/
│   ├── service.ts        # status.bigcommerce.com          (unsigned)
│   ├── api.ts            # api.bigcommerce.com reachable   (unsigned, context)
│   ├── quota.ts          # X-Rate-Limit-Requests-*         (signed)
│   ├── store.ts          # this store's status and plan    (signed)
│   └── plan-limits.ts    # declared absence, informational
├── assets/icon.svg
└── tests/                # 194 tests: entry module, client, auth, health, every action
```

## Development

There is no `deno` binary on the devcontainer host; Deno lives in the `api` compose service with the
repo root bind-mounted at `/app`:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/bigcommerce && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```

Use `deno task fmt`, never bare `deno fmt` — the bare form would rewrite `assets/icon.svg` and
falsify the verbatim claim above.
