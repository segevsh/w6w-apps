# Printful

Manage print-on-demand products, orders, shipping rates, print files and webhooks in **Printful**
over its **v1 REST API**.

- **Categories** — commerce
- **Auth methods** — access-token (`Authorization: Bearer <private token>`, plus an optional
  `X-PF-Store-Id` for an account-level token)
- **Actions** — 25
- **Health checks** — `service` (the `API` component of the Statuspage at `www.printfulstatus.com`),
  `api` (unsigned `GET /stores`, a schema-correct 401 passes), `quota` (rate-limit headers off a
  signed `GET /stores`, informational) + the derived `auth:access-token`
- **Egress allowlist** — `api.printful.com` (the status host is declared only on the `service` check)
- **API docs** — https://developers.printful.com/docs/
- **Icon** — `assets/icon.png`, the 512x512 `/icons-512.png` from Printful's own web manifest
  (`https://www.printful.com/manifest.json`), downloaded byte-for-byte (md5 `2621e672…`). The
  `<link rel=icon>` favicon is only 32x32.

Verified on 2026-10-06 against the OpenAPI 3.0 document embedded in `developers.printful.com/docs/`
and live unauthenticated probes of `api.printful.com`.

## v1, not v2

The reference at `developers.printful.com/docs/` documents the v1 API (`/orders`, `/store/products`,
`/products`, …) and carries no v2 operations; v1 is what this app is built on. v2 (`/v2/...`, e.g.
`GET /v2/catalog-products`) exists on the live host but is not part of that reference, so no v2
path was confirmable and none is used.

## Deprecations

The reference's deprecation wording was read before building:

- `POST /tax/rates` is **deprecated and removed 2025-09-08** (rate limit stepped down to 0). Not exposed.
  `GET /tax/countries` sits beside it and is also left out.
- "Fully customized inside labels" are deprecated for order creation (a file-type note); the order
  actions pass `files` through untouched and do not model label types.
- The `id` field of a file type is "deprecated, use `type`"; this app only uses `type`.

## Connecting

Create a private token at https://developers.printful.com/login (your app > Tokens) and paste it.
A **store-level** token works for one store and needs nothing else. An **account-level** token covers
every store: also enter the numeric **Store ID** (List Stores returns them), which is sent as
`X-PF-Store-Id` on every store-scoped call. The header is not sent to `/stores`, the one route the
reference documents without it.

## Actions

| Group | Actions |
| --- | --- |
| Stores | `store-list`, `store-get` |
| Catalog | `catalog-product-list`, `catalog-product-get`, `catalog-variant-get`, `catalog-size-guide-get`, `category-list` |
| Sync products | `sync-product-list`, `sync-product-get`, `sync-product-create`, `sync-product-delete` |
| Orders | `order-list`, `order-get`, `order-create`, `order-update`, `order-confirm`, `order-cancel`, `order-cost-estimate` |
| Shipping | `shipping-rate-calculate`, `country-list` |
| Files | `file-add`, `file-get` |
| Webhooks | `webhook-get`, `webhook-set`, `webhook-disable` |

An order or sync product id may be the numeric id or `@<external_id>`. Object results are returned
flat (an order's `id`, `status`, `items`…); list results come back as a named array plus `paging`
when Printful sends one. `order-create` and `order-update` default to a **draft**; set **Confirm**
to submit for fulfillment, which charges the store owner.

## Not covered

Mockup generator (`/mockup-generator/*`), product templates, approval sheets, warehouse products,
sync-variant writes (`/store/variants/*`, `/sync/*`), `/reports/statistics`, `/store/packing-slip`,
OAuth app scopes, and `/tax/*`. Their paths exist in the reference but were left out to keep the
surface to the core, confirmed flows. Order `branding_items` and file `options` are not modelled as
named params; pass a `json` item/line field to include extra keys inside `items`.

## Things that cost a day

- **Catalog reads are public.** `GET /products` answers 200 with no credential, so it proves nothing
  about a token. The probe is `GET /stores`.
- **Errors keep the success envelope.** `{"code":401,"result":"…","error":{"reason":"Unauthorized",
  "message":"…"}}` — the verdict is read from `error.reason`, never the status.
- **`status.printful.com` does not resolve.** The real Statuspage is `www.printfulstatus.com`, and it
  rolls up ~40 components (Shopify, Etsy, eBay…, fulfillment centres), so the top-level indicator is
  not an API statement; the check pins the `API` component by id.
- **Rate limit** is 120 calls/minute (`X-RateLimit-Limit/Remaining/Reset`, reset in seconds).
