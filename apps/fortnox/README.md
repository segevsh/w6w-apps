# Fortnox

Customers, suppliers, articles, customer invoices, orders, offers, supplier invoices, vouchers, the
chart of accounts, invoice payments, projects and cost centers in Fortnox, the Swedish cloud
accounting / invoicing / ERP platform, over the REST API v3 (`api.fortnox.se`).

- **Categories** — finance, productivity
- **Auth method** — oauth2 (authorization code with PKCE, `access_type=offline`)
- **Actions** — 54
- **Health checks** — `service` (Statuspage, `Fortnox API` + `Fortnox ID` components), `quota` (declared absence), plus the derived `auth:oauth2`
- **Egress allowlist** — `api.fortnox.se` (the status host `status.fortnox.se` is allowlisted only on the unsigned `service` check)
- **Website** — https://www.fortnox.se
- **API docs** — https://api.fortnox.se/apidocs (a Redoc page with the OpenAPI 3.0.3 document embedded in
  the HTML, 6,819,482 bytes fetched 2026-10-06; the older `apps.fortnox.se` docs link is dead) and the
  guides under https://www.fortnox.se/developer

Everything below was read from the reference and guides on 2026-10-06. **No Fortnox credential was
available, so no action was exercised against the live API**; the unit tests pin each request's
verb, path, query and body to what the reference documents.

## Actions

Each maps to one endpoint. Reads are `read`/`search`; everything that writes is `perform`.

| Key | Endpoint | Retry |
|---|---|---|
| `company-information-get` | `GET /3/companyinformation` | — |
| `me-get` | `GET /3/me` | — |
| `financial-year-list` | `GET /3/financialyears` | — |
| `financial-year-get` | `GET /3/financialyears/{id}` | — |
| `customer-list` | `GET /3/customers` | — |
| `customer-get` | `GET /3/customers/{customerNumber}` | — |
| `customer-create` | `POST /3/customers` | not idempotent |
| `customer-update` | `PUT /3/customers/{customerNumber}` | idempotent |
| `customer-delete` | `DELETE /3/customers/{customerNumber}` | idempotent |
| `supplier-list` | `GET /3/suppliers` | — |
| `supplier-get` | `GET /3/suppliers/{supplierNumber}` | — |
| `supplier-create` | `POST /3/suppliers` | not idempotent |
| `supplier-update` | `PUT /3/suppliers/{supplierNumber}` | idempotent |
| `article-list` | `GET /3/articles` | — |
| `article-get` | `GET /3/articles/{articleNumber}` | — |
| `article-create` | `POST /3/articles` | not idempotent |
| `article-update` | `PUT /3/articles/{articleNumber}` | idempotent |
| `article-delete` | `DELETE /3/articles/{articleNumber}` | idempotent |
| `invoice-list` | `GET /3/invoices` | — |
| `invoice-get` | `GET /3/invoices/{documentNumber}` | — |
| `invoice-create` | `POST /3/invoices` | not idempotent |
| `invoice-update` | `PUT /3/invoices/{documentNumber}` | idempotent |
| `invoice-bookkeep` | `PUT /3/invoices/{documentNumber}/bookkeep` | not idempotent |
| `invoice-cancel` | `PUT /3/invoices/{documentNumber}/cancel` | not idempotent |
| `invoice-credit` | `PUT /3/invoices/{documentNumber}/credit` | not idempotent |
| `invoice-send-email` | `GET /3/invoices/{documentNumber}/email` | not idempotent |
| `order-list` | `GET /3/orders` | — |
| `order-get` | `GET /3/orders/{documentNumber}` | — |
| `order-create` | `POST /3/orders` | not idempotent |
| `order-update` | `PUT /3/orders/{documentNumber}` | idempotent |
| `order-create-invoice` | `PUT /3/orders/{documentNumber}/createinvoice` | not idempotent |
| `offer-list` | `GET /3/offers` | — |
| `offer-get` | `GET /3/offers/{documentNumber}` | — |
| `offer-create` | `POST /3/offers` | not idempotent |
| `offer-update` | `PUT /3/offers/{documentNumber}` | idempotent |
| `offer-create-order` | `PUT /3/offers/{documentNumber}/createorder` | not idempotent |
| `supplier-invoice-list` | `GET /3/supplierinvoices` | — |
| `supplier-invoice-get` | `GET /3/supplierinvoices/{givenNumber}` | — |
| `supplier-invoice-create` | `POST /3/supplierinvoices` | not idempotent |
| `supplier-invoice-bookkeep` | `PUT /3/supplierinvoices/{givenNumber}/bookkeep` | not idempotent |
| `voucher-list` | `GET /3/vouchers` | — |
| `voucher-get` | `GET /3/vouchers/{voucherSeries}/{voucherNumber}` | — |
| `voucher-create` | `POST /3/vouchers` | not idempotent |
| `voucher-series-list` | `GET /3/voucherseries` | — |
| `account-list` | `GET /3/accounts` | — |
| `account-get` | `GET /3/accounts/{number}` | — |
| `account-create` | `POST /3/accounts` | not idempotent |
| `account-update` | `PUT /3/accounts/{number}` | idempotent |
| `invoice-payment-list` | `GET /3/invoicepayments` | — |
| `invoice-payment-create` | `POST /3/invoicepayments` | not idempotent |
| `project-list` | `GET /3/projects` | — |
| `project-get` | `GET /3/projects/{projectNumber}` | — |
| `project-create` | `POST /3/projects` | not idempotent |
| `cost-center-list` | `GET /3/costcenters` | — |

Conventions shared by all of them:

- **Wrapped bodies.** Fortnox sends and returns a record under its resource name:
  `{"Customer": {...}}`; a list is `{"Customers": [...], "MetaInformation": {"@TotalResources", "@TotalPages", "@CurrentPage"}}`.
  Actions return the raw wrapper. Voucher series are the odd one out (`VoucherSeriesCollection`).
- **Pagination.** List actions take `page` and `limit` (1–500, Fortnox default 100). The reference lists
  neither parameter on any operation; they come from the Parameters guide, which applies them to every
  list. `lastModified` is offered wherever the reference lists `lastmodified`.
- **Explicit fields plus `additionalFields`.** Create/update actions expose the common fields as typed
  params. Every other field of the record (the reference lists 60+ on a customer) goes in
  `additionalFields`, a JSON object keyed by the Fortnox field name, merged last. Send `""` there to clear a value.
- **Rows are raw JSON** (`invoiceRows`, `orderRows`, `offerRows`, `supplierInvoiceRows`, `voucherRows`):
  each document's row schema carries ~20 fields, so it is not modelled field by field.
- **Updates are partial `PUT`s**: an omitted property is left unchanged. The exception is document
  rows: send every row you want to keep, or give each kept row its `RowId`, otherwise the others are dropped.
- **`invoice-send-email` is a `GET`** in Fortnox's API but sends an email; it is marked `perform`, not idempotent.
- **Deleting** answers `204`; the actions return `{ "deleted": true }`. A deleted customer number stays reserved (error 2000637).
- **Rate limit**: 25 requests per 5 seconds per access token (300/min), HTTP 429 beyond it.

## Auth

`oauth2` — authorization-code flow against `https://apps.fortnox.se/oauth-v1/auth` and
`https://apps.fortnox.se/oauth-v1/token`, as listed in the reference's `fortnoxOAuth2` scheme. The
spec's second scheme, `oryHydraOAuth2` (`hydra.demo.ory.sh`), is an example and is ignored; so is the
client-credentials flow (service accounts) and the bank-service `basic`/`bearer` schemes.

- **Scopes** are not in the reference (it names only `developerapi`, the partner API). They come from the
  Scopes guide: `companyinformation profile customer supplier article invoice order offer supplierinvoice bookkeeping payment project costcenter`.
  Each grants read and write. The Fortnox company must hold the licence behind a scope or consent fails.
- **`access_type=offline`** is sent as an extra authorize parameter; the guide shows it on every authorize URL and it is how a refresh token is obtained.
- **Tokens**: access token 1 hour, refresh token 45 days, authorization code 10 minutes. **Refresh tokens rotate** — every refresh
  returns a new one and invalidates the old one, so the host must store each refresh response.
- **Signing**: `Authorization: Bearer <accessToken>` plus `Accept: application/json`, only in the `sign` hook.
- **Unverified**: the guide's token-endpoint examples send client id/secret as an HTTP Basic header; the host's generic exchange sends them as form fields. Confirm against a live client before relying on it.

## Health checks

| Check | Probe | Notes |
|---|---|---|
| `auth:oauth2` (derived from `test`) | `GET /3/companyinformation` | Needs only the `companyinformation` scope, no licence ("Any"), returns the company's own name/org number — never the token. Classified from the body's error `Code`: 2000310 / 2000311 / 2003275 = token rejected; 2000663 / 2001101 = token fine, scope or licence missing (reported ok); anything else non-2xx = failed. Status code alone is never trusted. Not `/3/me`: it needs the separate `profile` scope. |
| `service` | `GET https://status.fortnox.se/api/v2/summary.json`, unsigned | Real Atlassian Statuspage: HTTP 200 (no redirect), 20,318 bytes, `page.id` `59p4x6wt7tfd` (pinned), `page.name` `Fortnox`, ~60 components. The page covers the whole company (banks, phone, marketing site), so the page indicator is ignored; the verdict is the worst of the **`Fortnox API`** (`dlc79kkln1cj`) and **`Fortnox ID`** (`z4z7jl1vhtw8`, the login the OAuth flow uses) components. A wrong page id or missing API component is `unknown`, never `ok`. |
| `quota` | — (declared absence, `severity: informational`) | The limit is documented but no header or endpoint reports headroom. |

## Icon

`assets/icon.png` is the vendor's own apple-touch-icon, downloaded verbatim from
`https://www.fortnox.se/favicon/apple-icon-180x180.png` on 2026-10-06 (15,459 bytes, PNG, 180x180 RGBA, md5
`78bcfd3212881674a7ae0c60db860dab`). Fortnox publishes no SVG: `/favicon.svg` and `/favicon/favicon.svg`
return the site's 404 page, and neither simple-icons nor n8n's `nodes-base` carries a `fortnox` mark. It is
referenced as `appearance.icon.url`.

## Not covered

The reference has 249 paths; this app deliberately covers the core accounting objects. Left out:
payroll (employees, salary transactions, absence, attendance, schedule times, expenses, vacation debt),
assets and asset types, contracts / contract templates / accruals (invoice, supplier invoice, contract),
archive and inbox files, file connections (article, asset, supplier invoice, voucher) and URL connections,
price lists and prices, tax reductions (ROT/RUT), labels, currencies, units, modes/terms/ways of
payment and delivery, predefined accounts and voucher series settings, locked period, company settings,
SIE export, print templates, e-mail senders, Nox Finans, the invoice
`preview` / `print` / `eprint` / `einvoice` / `externalprint` / `warehouseready` / `printreminder` actions,
offer and order `cancel`/`email`/`print`, supplier-invoice credit/cancel/approval/payments, invoice
payment bookkeeping, `financialyears` create, and the whole `/api/*` family (warehouse, recurring
billing, time registrations, bank process orders and webhooks, file attachments, and the partner
integration-developer APIs). The warehouse bank-process order `POST .../documents` carries `deprecated: true`
in the reference; nothing deprecated is used. `grep` of the reference for deprecat/sunset/end-of-life
found only that operation and asset *depreciation* fields.

## Decisions and caveats

- `voucher-create` requires `year`: the reference marks `Year` required on the voucher payload even though the prose says the preselected financial year is used without the `financialyear` query.
- Supplier-invoice create requires only `supplierNumber` (the reference's one required field); Fortnox will still reject an unbalanced debit/credit (error 2000755).
- Error bodies are read in both spellings (`ErrorInformation.Message/Code` per the reference, lower-case per the guide) — not verified against a live response.
- The reference never documents `limit`/`page` per operation; they are applied to list endpoints from the Parameters guide.
