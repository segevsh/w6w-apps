# Alegra

Manage [Alegra](https://www.alegra.com) — Latin American cloud accounting and invoicing — from a
w6w workflow. API host `api.alegra.com`, prefix `/api/v1`. Every path, parameter and body field was
read from Alegra's own OpenAPI reference (`developer.alegra.com`, each page's `.md` form) on
2026-10-06.

## Auth

`basic`: the account **email** plus the **API token** from Alegra under
*Configuración > API - Integraciones con otros sistemas*. Sent as
`Authorization: Basic base64(email:token)`, built only in `auth/basic.ts` `sign`.

The connection test is `GET /company` (company profile — never the token). A 200 passes only when
the body is a company document. A 401 is a rejected credential; a 403 carrying Alegra's own
`{error, code}` envelope means the credential was accepted but the user cannot read company
settings, which is a working connection.

## Actions (24)

| Area | Actions |
|---|---|
| Sales invoices | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-void`, `invoice-delete` (drafts only), `invoice-send-email` |
| Contacts | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete` |
| Items | `item-list`, `item-get`, `item-create`, `item-update`, `item-delete` |
| Payments | `payment-list`, `payment-get`, `payment-create`, `payment-void` |
| Other reads | `estimate-list`, `bill-list`, `company-get`, `tax-list` |

Lists take `start` (a zero-based offset, **not** a record id) and `limit` (default and **maximum
30** — a larger value is a vendor error, so it is rejected locally). Every list sends
`metadata=true` and returns `{ items, total }`.

Create/update actions model the common core and accept an `additionalFields` JSON object merged
into the body, because Alegra's create bodies are `oneOf` per country version (Colombia, Mexico,
Costa Rica, Chile, …) — e.g. `{"stamp":{"generateStamp":true}}` for an electronic invoice.

## Health checks

| Check | What it does |
|---|---|
| `service` | `https://status.alegra.com/index.json` (Better Stack; verified `company_name` "Alegra"). Verdict comes **only** from the `API Alegra Contabilidad` resource (id `1608669`, name as fallback) — the page also lists the web app, POS, Payroll and Store, shown as detail but never driving the state. |
| `api` | Unsigned `GET /api/v1/company`. The gateway's schema-correct `401 {"message":"Unauthorized"}` is a **pass** (edge reachable); HTML or a 5xx is down. |
| `quota` | Signed `GET /terms`, reading the documented `X-Rate-Limit-Limit/Remaining/Reset` headers (150 requests/minute per user; Reset is seconds left, a delay). Informational. |
| `auth:basic` | Derived from the auth `test` hook. |

## Left out

- **Country-specific documents** beyond a pass-through: global invoices, transportation receipts,
  recurring invoices, debit/credit/income-debit notes, remissions, purchase orders, outgoing
  payments (`transaction-out`), inventory (warehouses, transfers, adjustments), journals, cost
  centres, banks and reconciliations, reports, webhooks-subscriptions, payroll (Nómina) and the MCP
  server (`mcp.alegra.com`). Documented, but outside the core loop this app targets.
- **Estimate / supplier-bill create and get.** Only lists are included; the bill and estimate
  create bodies are heavily country-conditional and were not verified field-by-field.
- **File attachments** (multipart) on invoices, bills, items.
- **OAuth** — Alegra documents Basic only.

## Gotchas (verified)

- **Ids are strings.** Alegra's 2025 change returns `"id": "1"` today and UUIDs for new records
  per resource, rolled out gradually. Request schemas in the docs still say `integer`; pass the
  string you were given.
- **The gateway 401s everything unauthenticated** — wrong token, missing header, even an unknown
  path all answer the identical `401 {"message":"Unauthorized"}`. A missing and a wrong token
  cannot be told apart, and an unsigned probe never proves a route exists.
- **Success bodies may carry `error`.** Delete Item answers 200 with
  `{"error": "El producto fue eliminado correctamente.", "code": 200}`. Never treat an `error` key
  as failure on a 2xx.
- **Error envelopes differ**: application errors are `{error, code}`, deletes/voids use
  `{code, message}`, the gateway uses bare `{message}`.
- **The invoice docs have a typo**: the simple-invoice example writes `"quant,ity"`. The field is
  `quantity`. The note field is spelled `anotation`.
- **An inactive item cannot be edited** unless `status: "active"` is sent in the same call.
- **Docs pages bundle several endpoints**, and some `$ref`s point at paths in another page, so a
  page's OpenAPI block is not a safe single source for one endpoint.
