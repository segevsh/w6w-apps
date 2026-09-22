# Squarespace Commerce

The merchant-side commerce APIs for **one Squarespace website**: its orders, inventory, products,
store pages, customer profiles and transaction documents, on **`api.squarespace.com`**.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 21
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.squarespace.com` (the `service` check adds `status.squarespace.com`
  to its own hook allowlist, never to the app's)
- **Website** — https://www.squarespace.com/
- **API docs** — https://developers.squarespace.com/commerce-apis/overview
- **Status page** — https://status.squarespace.com/

This is deliberately **not** the general Squarespace website-builder integration. The Content API,
the Forms API, Webhook Subscriptions, Contacts, Discounts and Analytics all sit in the same docs
tree and none of them is here — every operation in this app is one of the 21 endpoints under the
Commerce reference pages.

> **Everything below was verified against Squarespace's own live reference pages on 2026-09-22** —
> `https://developers.squarespace.com/commerce-apis/*` (each bare URL server-renders the full
> parameter tables, example requests and example responses; no separate OpenAPI document is
> published), plus live probes against `api.squarespace.com` and `status.squarespace.com`. Nothing
> here came from a third-party integration directory.

## The six things most likely to go wrong

### 1. `User-Agent` is a required header on every single request

Squarespace marks it `required: true` on all 21 operations, with `YOUR_CUSTOM_APP_DESCRIPTION` as
the documented placeholder. This app sends a fixed value (`w6w-squarespace-commerce/1.0`)
unconditionally on every request — see [`lib/client.ts`](lib/client.ts).

### 2. The version segment is not uniform

Website/authorization, store pages, orders, inventory, profiles and transactions are all under
`/1.0/…`. **Products are under `/v2/…`** — Squarespace versions that resource separately, and a
client that assumes one segment for the whole API will 404 every products call.

### 3. `Idempotency-Key` is required on two endpoints, and its absence fails silently

`POST /1.0/commerce/orders` (create order) and `POST /1.0/commerce/inventory/adjustments` (adjust
stock quantities) both mark the header required — and both document that a repeat call **without**
a fresh key short-circuits to "the previous operation was successful, no new changes were made", a
bare `204` with **no error**. That is the worst failure mode: it looks like success. This app
stamps a key per invocation — the host's own invocation id when one exists (so a runtime retry of
the same step replays rather than duplicates), a fresh `crypto.randomUUID()` otherwise — never a
constant (`SquarespaceClient.idempotencyKey`, [`lib/client.ts`](lib/client.ts)).

### 4. The Products *update* endpoints wrap every field in a `{present, value}` Change object

`POST /v2/commerce/products/{productId}` and
`POST /v2/commerce/products/{productId}/variants/{variantId}` are updates — verified live to be
`POST`, not `PATCH` or `PUT` — but their request bodies are not plain objects. Every updatable
field is `{ "present": true, "value": … }`, which is how the API lets a caller distinguish "leave
this alone" from "set it to null/empty/false". A field a caller does not pass is simply absent
from the body (never sent as a wrapped `null`); a field set to `""` or `false` is still sent,
wrapped, because those are real values. `update-product` and `update-product-variant` both declare
plain fields and build the wrapper for you (`changeBody()` in [`lib/client.ts`](lib/client.ts)) —
nobody calling these actions ever writes `{"present": …}` by hand. Sending an update with no fields
set is rejected client-side before the request goes out, because an empty Change body is a no-op
the vendor would otherwise silently accept.

### 5. Two `paymentGatewayError` enum values are misspelled by the vendor, kept verbatim

`GATEWAY_FEE_PROCEESING_ERROR` (three E's) and `GATEWAY_DISCONNNECTED` (three N's) are exactly how
Squarespace's own Transactions API spells them. A matcher written against the "correct" spelling
would never fire — `list-transactions`/`get-transactions` and their tests use the vendor's actual
strings.

### 6. Create order has its own, far tighter rate limit

The general Commerce API ceiling is 300 requests/minute. **`POST /1.0/commerce/orders` with an API
key is limited to 100 requests/hour, per website** — a hundred times tighter in absolute terms.
This does not apply when authenticating with OAuth. `formatSquarespaceError()` names both ceilings
whenever a `429` comes back, so a caller sees which limit was actually hit.

## Actions (21)

| Group | Action | Method / path |
|---|---|---|
| Website | `get-website-profile` | `GET /1.0/authorization/website` |
| Store pages | `list-store-pages` | `GET /1.0/commerce/store_pages` |
| Orders | `list-orders` | `GET /1.0/commerce/orders` |
| Orders | `get-order` | `GET /1.0/commerce/orders/{id}` |
| Orders | `create-order` | `POST /1.0/commerce/orders` |
| Orders | `fulfill-order` | `POST /1.0/commerce/orders/{id}/fulfillments` |
| Inventory | `list-inventory` | `GET /1.0/commerce/inventory` |
| Inventory | `get-inventory-items` | `GET /1.0/commerce/inventory/{variantIdCsvs}` |
| Inventory | `adjust-inventory` | `POST /1.0/commerce/inventory/adjustments` |
| Products | `list-products` | `GET /v2/commerce/products` |
| Products | `get-products` | `GET /v2/commerce/products/{productIdCsvs}` |
| Products | `create-product` | `POST /v2/commerce/products` |
| Products | `update-product` | `POST /v2/commerce/products/{productId}` |
| Products | `delete-product` | `DELETE /v2/commerce/products/{productId}` |
| Products | `create-product-variant` | `POST /v2/commerce/products/{productId}/variants` |
| Products | `update-product-variant` | `POST /v2/commerce/products/{productId}/variants/{variantId}` |
| Products | `delete-product-variant` | `DELETE /v2/commerce/products/{productId}/variants/{variantId}` |
| Profiles | `list-profiles` | `GET /1.0/profiles` |
| Profiles | `get-profiles` | `GET /1.0/profiles/{profileIdCsvs}` |
| Transactions | `list-transactions` | `GET /1.0/commerce/transactions` |
| Transactions | `get-transactions` | `GET /1.0/commerce/transactions/{documentIds}` |

Pagination is a vendor-issued opaque `cursor` on every list endpoint (never an offset, and there
is no `limit` parameter anywhere in this API — the page size is fixed by the vendor at 50). The
comma-separated `{…Csvs}` / `{documentIds}` routes accept up to 50 ids per request except
`get-profiles`, which the docs state no ceiling for.

## Not implemented, on purpose

- **Products `type: DIGITAL` cannot be created** through the API at all — Squarespace's own docs
  state this; a digital product can only be read/updated/deleted once it exists (created in the
  admin UI). `create-product`'s `type` select therefore offers only `PHYSICAL`, `SERVICE` and
  `GIFT_CARD`.
- **The Profiles API is in vendor-declared maintenance mode.** It is still fully live and both of
  its endpoints (`list-profiles`, `get-profiles`) are implemented, because it is real, documented,
  and part of the Commerce surface — but Squarespace's own docs point new integrations at a
  **Contacts API** instead, which is out of scope for this app (Contacts sits alongside Discounts,
  Analytics, Webhook Subscriptions and the general website Content/Forms APIs as surfaces this app
  deliberately does not cover; see the top of this README).
- **Contacts, Discounts, Analytics and Webhook Subscriptions** are real Commerce-adjacent APIs
  this app does not implement — out of scope by design, not by omission. Revisit if a future app
  covers Contacts as the Profiles replacement.

## Health checks

- **`service`** (informational) — Squarespace's Statuspage feed at
  `status.squarespace.com/api/v2/summary.json`, scoped to the **`Commerce`** component (id
  `qgtfn3dyv6pl`, matched by id first and by exact name as a fallback), never the page-level
  rollup — the page also carries unrelated components (Site Loading, the site editor, Domains,
  Email Campaigns, Acuity Scheduling, Accounts & Billing, …) whose own incidents must not make this
  app report degraded. Severity is `informational` both because the page describes the whole
  Squarespace platform (weak evidence even on an exact component match) and because an unreachable
  feed must never pin the app's verdict at permanent `unknown`.
- **`quota`** — declared **absent** (`~~quota~~`). Squarespace documents fixed numeric ceilings
  (300 requests/minute generally, 100/hour on Create order with an API key — see finding 6 above)
  but publishes no rate-limit response headers of any kind and no balance/usage endpoint anywhere
  in the Commerce surface. Inferring headroom from whether a signed call happens to succeed is a
  guess, not a probe, so this is declared unavailable rather than faked.
- **`auth:api-key`** (1 derived) — projected automatically from the `api-key` auth method's `test`
  hook: `GET /1.0/authorization/website`, classified by response body (`type ===
  "AUTHORIZATION_ERROR"` on failure), never by status code alone. The 200 body (`WebsiteProfile`)
  carries no credential material, so it is safe to reuse as both the probe and the `get-website-
  profile` action.

## Auth

**API key only.** Squarespace documents two ways in: an API key generated in a site's own
Settings → Developer Tools → API Keys (tied to that one website), and OAuth, which exists solely
for registered Squarespace Extensions — not a fit for a workflow Connection. This app implements
the API key, sent as `Authorization: Bearer <key>` (stamped only in `auth/api-key.ts`'s `sign`
hook, never inside an action).
