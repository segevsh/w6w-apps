# Axonaut

- **Triggers** — 9 (poll)

## Triggers

| Key — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-invoice` — New Invoice | poll | `invoice-list` filtered by `creation_date_after` | Each newly created invoice |
| `new-or-updated-invoice` — New or Updated Invoice | poll | `invoice-list` filtered by `updated_after` | Each newly created or updated invoice |
| `new-company` — New Company | poll | `company-list` | Each company (customer, prospect, supplier) newly created |
| `new-employee` — New Contact Person | poll | `employee-list` | Each employee (company contact person) newly created |
| `new-product` — New Product | poll | `product-list` | Each product newly added to the catalogue |
| `new-opportunity` — New Opportunity | poll | `opportunity-list` | Each sales opportunity newly created |
| `new-project` — New Project | poll | `project-list` | Each project newly created |
| `new-task` — New Task | poll | `task-list` | Each task newly created |
| `new-quotation` — New Quotation | poll | `quotation-list` filtered by `date_after` | Each quotation dated in the last 31 days that newly appears |

Vendor reference: https://axonaut.com/api/v2/doc (verified 2026-11-10). The spec documents `GET /invoices`
filters `creation_date_after` and `updated_after` in `DD/MM/YYYY` (date-only), with no sort argument.
The triggers therefore filter, not sort: each check sends the cursor minus one day (UTC) as
`DD/MM/YYYY`, reads up to 5 pages, and dedupes by id (up to 1000 remembered). The first check records
the current window and the cursor "now" and emits nothing. Live filter semantics (inclusive or strict
`after`) are unverified; the one-day overlap plus id dedupe makes either safe.

The seven record triggers (company, employee, product, opportunity, project, task, quotation) cover lists the spec
serves with no usable order: `sort` on companies and quotations has no direction, and the other lists have no sort or
date filter at all. Each check therefore reads every page (the `page` header, until the first empty page) and diffs
the ids against the previous check, added records only; the first check records what is there and emits nothing. A
list longer than 5000 records, or 200 pages, fails the check loudly rather than reading on. `new-quotation` reads only
quotations dated in the last 31 days (`date_after`, YYYY-MM-DD), so its check stays small; a quotation backdated
beyond that is not seen. Checks of these seven run every 15 minutes.

Not covered: `company-invoice-list` (one company's invoices: `new-invoice` already delivers every invoice).

French all-in-one CRM and invoicing for small businesses, driven through the Axonaut REST API v2
(`https://axonaut.com/api/v2`). Docs are mostly French; this app is in English.

Every path, verb, parameter and enum was verified on 2026-10-06 against the OpenAPI 3.0 document
embedded in `https://axonaut.com/api/v2/doc` (`<script id="swagger-data">`, 78 paths). The catalog's
old `/manager/ecommerceApi` documentation URL is a 404.

## Auth

One method, **API Key**: the user's Axonaut API key, sent as the `userApiKey` request header (the
only security scheme the spec declares). The key acts as its owner. The credential is stamped by
`sign` only; no action touches it.

The connection check is `GET /api/v2/languages`. `GET /api/v2/me` is deliberately **not** used: its
documented response includes `user_api_key`, i.e. it echoes the caller's own key. The verdict is
read from the body (a JSON array passes; the `{"error": {"message", "status_code"}}` envelope fails),
never from the status alone.

## Things that differ from what you would guess

- **Pagination is a header.** List endpoints take the page number in a `page` *header*, not a query
  parameter. Lists return a bare array; the app wraps it as `{ items, count, page, nextPage }`.
  No page size or total is documented, so `nextPage` is the next number until a page comes back
  empty.
- **Errors carry a string status.** `{"error": {"message": "Forbidden access", "status_code": "403"}}`.
  A missing header is `400 Bad request - Missing header : "userApiKey"`; a wrong key is `403`.
- **Booleans in the spec are declared as a string enum** (`true`/`false`); this app sends real JSON
  booleans / `true`/`false` query values.
- **Date formats are inconsistent**: most documents take ISO 8601, task dates are shown as
  `25/04/2023`, opportunity due dates are Unix seconds (`due_date_ts`).
- **Nested phone keys differ**: employees nested in Create Company use `phoneNumber` /
  `cellphoneNumber`; the standalone employee endpoints use `phone_number` / `cellphone_number`.
- Custom fields go in `custom_fields` as `{"customFieldName": value}`; names come from the
  account's custom fields list (not wrapped here).

## Actions (31)

| Key | Request | Description |
|---|---|---|
| `company-create` | `POST /api/v2/companies` | Create a company, optionally with its first employees. |
| `company-delete` | `DELETE /api/v2/companies/{companyId}` | Delete a company. The vendor answers 202 Accepted with no body. |
| `company-get` | `GET /api/v2/companies/{companyId}` | Get one company by id. |
| `company-invoice-list` | `GET /api/v2/companies/{companyId}/invoices` | List the invoices of one company. |
| `company-list` | `GET /api/v2/companies` | List companies (customers, prospects and suppliers), optionally filtered. |
| `company-update` | `PATCH /api/v2/companies/{companyId}` | Update a company; only the fields you send change. |
| `employee-create` | `POST /api/v2/employees` | Create an employee (contact) on a company. |
| `employee-get` | `GET /api/v2/employees/{employeeId}` | Get one employee by id. |
| `employee-list` | `GET /api/v2/employees` | List contacts (employees), optionally filtered; pass a company id to list one company. |
| `employee-update` | `PATCH /api/v2/employees/{employeeId}` | Update an employee; only the fields you send change. |
| `invoice-create` | `POST /api/v2/invoices` | Create an invoice from an order (contract), with its product lines. |
| `invoice-get` | `GET /api/v2/invoices/{invoiceId}` | Get one invoice by id. |
| `invoice-list` | `GET /api/v2/invoices` | List invoices, optionally for one company and filtered by date or paid state. |
| `opportunity-create` | `POST /api/v2/opportunities` | Create a sales opportunity on a company, in a pipe. |
| `opportunity-get` | `GET /api/v2/opportunities/{opportunityId}` | Get one opportunity by id. |
| `opportunity-list` | `GET /api/v2/opportunities` | List sales opportunities, optionally by status. |
| `opportunity-lost` | `PATCH /api/v2/opportunities/{opportunityId}/lost` | Register an opportunity as lost. |
| `opportunity-update` | `PATCH /api/v2/opportunities/{opportunityId}` | Update an opportunity; only the fields you send change. |
| `opportunity-won` | `PATCH /api/v2/opportunities/{opportunityId}/won` | Register an opportunity as won. |
| `product-create` | `POST /api/v2/products` | Create a product. |
| `product-get` | `GET /api/v2/products/{productId}` | Get one product by id. |
| `product-list` | `GET /api/v2/products` | List products, optionally filtered. |
| `product-update` | `PATCH /api/v2/products/{productId}` | Update a product; only the fields you send change. |
| `project-get` | `GET /api/v2/projects/{projectId}` | Get one project by id. |
| `project-list` | `GET /api/v2/projects` | List projects, optionally filtered by name or number. |
| `quotation-create` | `POST /api/v2/quotations` | Create a quotation with its product lines. |
| `quotation-get` | `GET /api/v2/quotations/{quotationId}` | Get one quotation by id. |
| `quotation-list` | `GET /api/v2/quotations` | List quotations, optionally filtered by status, company or date. |
| `task-create` | `POST /api/v2/tasks` | Create a task. |
| `task-list` | `GET /api/v2/tasks` | List tasks. |
| `task-update` | `PATCH /api/v2/tasks/{taskId}` | Update a task; only the fields you send change. |

Left out on purpose: `Create Task` has no `priority` (the spec types it as integer but its example
is the word `haute`, and Update documents the words; Update Task is the one that sets it); file
upload/download endpoints (documents, delivery notes), bank, supplier, expense, payslip and timetracking
endpoints are not built in this version. `GET /me` is never called (see Auth).

## Health checks

| Check | What it does |
|---|---|
| `service` | Declared unavailable (informational): no Axonaut status page was found. |
| `api` | Unsigned `GET /api/v2/languages`; a schema-correct 400/403 `error` envelope proves the API is serving, so it passes. An HTML or non-envelope body does not. |
| `quota` | Declared unavailable (informational): no rate limit, header or usage endpoint is documented; `/me`'s counter sits next to the API key. |
| `auth:api-key` | Derived from the auth `test` hook above. |

## Network

`axonaut.com` only.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

The icon is the vendor's `apple-touch-icon.png` (180x180), byte-for-byte.
