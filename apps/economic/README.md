# e-conomic (Visma e-conomic)

Cloud accounting for small and mid-sized businesses, mostly Denmark and the Nordics. This app
reads and writes an agreement's customers, products and invoices through the e-conomic REST API.

- Host: `https://restapi.e-conomic.com` (the only host called for the API, plus
  `status.e-conomic.com` for the status check). Reference: <https://restdocs.e-conomic.com/>.
- Auth: **two secret tokens**, both sent as headers on every request (set in `sign`):
  `X-AppSecretToken` (identifies the integration) and `X-AgreementGrantToken` (granted by the
  customer, Settings > Integrations > Access to e-conomic). The public `demo`/`demo` pair works
  for GETs only and is useful for evaluation.
- Version: the root document (`GET /`) lists every resource under `stable`; `experimental` is
  empty and nothing is marked deprecated. Verified 2026-10-06 against the reference and live
  demo-account responses. e-conomic also publishes newer per-module OpenAPI services (an
  "OpenAPI" component sits beside "REST API" on its status page); the reference this app is built
  on does not document them for these resources, so they are not used.

## Actions (29)

| Area | Actions |
| --- | --- |
| Agreement | `self-get` (curated subset: company, base currency, modules) |
| Customers | `customer-list`, `customer-get`, `customer-create`, `customer-delete`, `customer-group-list` |
| Products | `product-list`, `product-get`, `product-create`, `product-delete`, `product-group-list`, `unit-list` |
| Invoices | `invoice-template-get`, `invoice-draft-create`, `invoice-draft-list`, `invoice-draft-get`, `invoice-draft-delete`, `invoice-book`, `invoice-booked-list`, `invoice-booked-get` |
| Reference data | `payment-terms-list`, `vat-zone-list`, `layout-list`, `employee-list` |
| Other reads | `order-draft-list`, `supplier-list`, `account-list`, `accounting-year-list`, `entry-list` |

Every list takes e-conomic's `filter` (`name$like:acme$and:barred$eq:false`) and `sort`
(`-customerNumber`) expressions plus `pageSize` (1-1000, default 100) and `skipPages`, and returns
`{items, count, total, hasMore, nextSkipPages}`.

Creating an invoice: pick the reference numbers with the List actions (or have
`invoice-template-get` return a draft pre-filled from the customer), `invoice-draft-create`, then
`invoice-book` (optionally `sendBy` `Email` or `ean`).

## Health checks

- `auth:api-key` (derived): `GET /self` with both tokens. The verdict is read from the body
  (numeric `agreementNumber`, or e-conomic's `{message, errorCode}` error). `/self` does not echo
  either secret token (it does return the app's *public* token, so the action `self-get` returns a
  curated subset instead of the raw body).
- `api`: unsigned `GET /self`; the documented 401 JSON error is the healthy answer.
- `service`: `status.e-conomic.com` is a real Atlassian Statuspage (page id `834xxvq1gy9f`). It
  covers the whole product, so the verdict is its dedicated **REST API** component only; the
  page-level indicator is ignored.
- `quota`: declared unavailable (`informational`); no rate limit or usage endpoint is documented.

## Decisions and gaps

- **Icon**: `assets/icon.svg` is the vendor's own mark, downloaded byte-for-byte from
  `https://secure.e-conomic.com/client/v0.2760.0/favicon.svg` (the SVG favicon the e-conomic web app
  links; viewBox 95.64 x 95.82, square-ish, 666 bytes). The 16x16 PNG favicon from www.e-conomic.com
  was replaced by it.
- **Not covered** (no update actions on purpose): `PUT` replaces the whole object and the reference
  does not say which read-only properties a PUT tolerates, which I could not verify without write
  credentials. Also not covered: orders/quotes beyond listing draft orders, supplier create,
  journals/vouchers/entries writes, contacts and delivery locations, attachments/PDF download,
  accounting-year periods and totals, projects and time registration.
- Only `GET` could be exercised live (the demo tokens are read-only). Request bodies follow the
  reference's documented required properties and examples; validation errors are surfaced with
  their per-property detail.
- Tokens can only be created by e-conomic (app secret) and the customer (grant), so there is no
  self-service sign-up flow here.
