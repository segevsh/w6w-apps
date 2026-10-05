# SamCart

Read SamCart orders, charges, failed charges, customers, products, refunds and subscriptions, and
add a product to an order, refund a charge, cancel or reschedule a subscription, on the
**SamCart Public API**.

- **Categories** — commerce
- **Auth methods** — api-key (`sc-api` header)
- **Actions** — 38
- **Health checks** — `quota` (live, reads `RateLimit-*`), `service` (declared absence,
  `informational`) + the derived `auth:api-key`
- **Egress allowlist** — `api.samcart.com`
- **Developer portal** — https://developer.samcart.com/
- **OpenAPI document** — https://developer.samcart.com/specs/openapi.yaml

> Every path, verb, parameter and body field was read from SamCart's own OpenAPI document, fetched
> 2026-10-05 ("SamCart Public API", base `https://api.samcart.com/v1`). Nothing was exercised with a
> real key; the only live requests were unauthenticated probes of `api.samcart.com` and
> `status.samcart.com`. A grep of the document for `deprecat|depreciat|sunset|will be removed`
> found nothing, and its changelog (2021-06 to 2022-06) removes nothing. The API is described as
> a **private beta**, and access depends on the plan (403 otherwise).

## Auth

One method: an API key from SamCart under **Settings > API Keys**, sent in the `sc-api` header.
The reference also says to send `Accept: application/json`; the client always does. The reference
mentions OAuth (a 100 requests/minute per-user cap) but states no authorization or token URL, so
no OAuth method is declared.

The credential test calls `GET /v1/products?limit=1`: it reads the catalogue, returns no PII and
nothing that carries the key. The result is classified from the body, not the status. The gateway
answers `{"message": "Invalid authentication credentials"}` (invalid key) or `{"message": "No API
key found in request"}` (no key), observed unauthenticated, both with HTTP 401. A success is a body
with a `data` array.

## Actions

| Resource | Actions |
|---|---|
| Orders | list, get, charges, customer, subscriptions, update custom field, add product, batch add product, batch status |
| Funnels / upsells | list orders of a funnel, list orders of an upsell |
| Charges | list, get, list refunds, get refund, list failed charges, get failed charge |
| Customers | list (filter by email), get, addresses, charges, orders, subscriptions |
| Products | list, get, list orders |
| Refunds | list, get, refund a charge |
| Subscriptions | list, get, charges, customer, history, plan, cancel, schedule cancelation, update next rebilling date |

All ids are integers and are checked before they reach a path.

## Things worth knowing

1. **Two list shapes.** Bulk lists answer `{data, pagination: {next, prev}}`, paged by `offset` (a
   record id, not a page number) and `dir` (`next`/`prev`), at most 100 per page. Per-resource lists
   (a customer's orders, an order's charges...) answer a bare array with no paging. Actions return
   `{data, next, prev, nextOffset}` for the first and `{data}` for the second; pass `nextOffset`
   back as Offset.
2. **Three actions move money and are not idempotent**: Add Product to Order, Batch Add Products
   to Orders and Refund Charge. Nothing in the document deduplicates a repeat. The batch call is
   asynchronous (HTTP 202); poll Get Batch Add Status.
3. **Some documented responses have no schema**: add-to-order, batch add and its status. Those
   actions return the body untouched as `response`.
4. **`GET /refunds` is documented with `data` as a single Refund object**, not an array, unlike
   every other list. The action returns whatever `data` holds, wrapped into an array if it is a
   lone object.
5. **`POST /refunds/charges/{id}/` keeps its trailing slash**, as documented.
6. **Dates**: filters accept ISO 8601 with a timezone, or a bare date (min = 00:00:00 UTC, max =
   23:59:59 UTC). Record timestamps come back as `YYYY-MM-DD HH:MM:SS` UTC.
7. **Test mode** is a tri-state select (test only / live only / empty for both) so an untouched
   form does not silently filter to live data.
8. **Error bodies have two shapes**: the gateway's `{"message"}` and a validation failure's
   `{"success": false, "error": ...}`. The vendor's text is kept verbatim in the thrown error.

## Health checks

- `service` — **declared absence**. `status.samcart.com` 302s to `samcart.com`, then 301s to
  `www.samcart.com`, which answers HTML for every path (including `/api/v2/summary.json` and
  `/index.json`); `samcart.statuspage.io/api/v2/summary.json` answers 401 "Your page is inactive".
  No status page is linked from the marketing site or the developer portal.
- `quota` — **live**, signed, `informational`. The reference says every authenticated response
  carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` (per marketplace, 120 or
  240 requests per 60 seconds by plan). This check reads them off a one-row product list and
  degrades under 5% remaining. The headers are documented, not observed (no key was available); if
  they are absent it reports `unknown`, never `down`.

## Left out

- OAuth (no endpoints documented).
- Nothing in the OpenAPI document is skipped: all 38 operations are wrapped.

## Icon

`assets/icon.svg` is the vendor's square favicon mark, byte-for-byte
(`https://framerusercontent.com/images/LNrcom7l4rBkvwjucathz4Gc.svg`). The primary logo at
`developer.samcart.com/samcart-logo-primary.svg` is a 1200x220 wordmark that does not read at icon
size. Format with `deno task fmt`, never bare `deno fmt`, which rewrites the SVG.
