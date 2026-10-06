# Loyverse

Read and manage a Loyverse POS back office from a workflow: receipts, items, categories,
customers, inventory, stores, employees, shifts, discounts, taxes and payment types.
Verified 2026-10-06 against the vendor's OpenAPI 3.0 document
(`developer.loyverse.com/docs/API-Reference__v1.0.yaml`, 33 paths). Host: `api.loyverse.com`,
prefix `/v1.0`.

## Auth

Two methods, both `Authorization: Bearer <token>` (set only in `sign`):

- **`access-token`** (bearer) — a personal access token from Back Office > Integrations >
  Access tokens. It grants full access to the account.
- **`oauth2`** — authorization-code flow. `https://api.loyverse.com/oauth/authorize`,
  `https://api.loyverse.com/oauth/token`; scopes are the vendor's permission list
  (`ITEMS_READ`, `RECEIPTS_READ`, …). Needs a developer app from developer.loyverse.com.
  Access tokens last 12 h and come with a refresh token.

The credential probe is `GET /v1.0/merchant` — it returns `{id, business_name, email, country,
currency}`, no credential material, and needs only `MERCHANT_READ`. Verdicts are classified from
the vendor's error `code` (`UNAUTHORIZED`, `PAYMENT_REQUIRED`, `FORBIDDEN`), not the status.

## Actions (21)

| Area | Actions |
|---|---|
| Merchant | `merchant-get` |
| Stores | `store-list`, `store-get` |
| Employees | `employee-list`, `employee-get` |
| Categories | `category-list`, `category-get`, `category-save` |
| Items | `item-list`, `item-get` |
| Customers | `customer-list`, `customer-get`, `customer-save` |
| Receipts | `receipt-list`, `receipt-get` |
| Inventory | `inventory-list`, `inventory-update` |
| Reference data | `discount-list`, `tax-list`, `payment-type-list`, `shift-list` |

`*-save` is Loyverse's single create-or-update POST: an `id` in the body updates. They are
not idempotent (no id = a new record each call). `inventory-update` sets absolute stock
(`stock_after`) and is idempotent.

## Not yet covered

Left out deliberately, not forgotten: item create/update (needs variant bodies with store
pricing — too large to verify blind), receipt create and refund, deletes of every resource,
item images, modifiers, suppliers, variants, POS devices, webhook management, discount/tax
writes, `/userinfo`. All are documented in the OpenAPI file; add them when a workflow needs them.

## Health checks

- **`service`** — Loyverse runs an Atlassian Statuspage. The probe reads
  `https://loyverse.statuspage.io/api/v2/summary.json` (`page.name` `Loyverse`, `page.id`
  `0pphh991mx84`, which matches the CNAME of `status.loyverse.com`) and drives the verdict from
  the `Loyverse API` component (`qxrrr61qq9pr`). `status.loyverse.com/api/v2/summary.json` itself
  answers `302 https://www.statuspage.io/`, so the custom domain is not used. Page id is checked on
  every run.
- **`auth:*`** — derived from each method's `test` hook (`GET /merchant`).
- **`quota`** — declared `unavailable`, severity `informational`: the only limit is 300
  requests / 300 s per account (429 `RATE_LIMITED`); no rate-limit header or usage endpoint is
  documented.

## Quirks

- Lists are keyed by resource name (`{"items":[…],"cursor":"…"}`); `cursor` is absent on the last
  page. `limit` is 1-250, default 50.
- Only items, categories, customers, employees, inventory, receipts, shifts and variants
  paginate. Stores, discounts, taxes and payment types return everything.
- The ids filter on items is `items_ids` and on categories `categories_ids` (the vendor's
  spelling); the others are `<singular>_ids`.
- Receipts are addressed by receipt **number** (`1-1001`), not a uuid.
- Customers are hard-deleted; other records are soft-deleted (`show_deleted=true`).

## Icon

`assets/icon.svg` is the vendor's own favicon, byte-for-byte:
`https://loyverse.com/sites/default/files/user1/icons/favicon.svg` (2,109 bytes).
