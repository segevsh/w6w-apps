# Printavo

Work a print shop's order book from a workflow: customers, contacts, quotes, invoices, statuses,
tasks, inquiries and payments, over Printavo's GraphQL API v2.

- **Categories** — crm, finance, commerce
- **Auth methods** — `credentials` (`custom`: Printavo email + API token, sent as the `email` and `token` headers)
- **Actions** — 38
- **Triggers** — 2 (poll)
- **Health checks** — ~~`service`~~, ~~`quota`~~ (both declared unavailable, informational) + the derived `auth:credentials`
- **Egress allowlist** — `www.printavo.com`
- **API docs** — https://www.printavo.com/docs/api/v2 (GraphQL reference; every field, argument and
  type here was read from its query, mutation, object, input and enum pages on 2026-10-06)

## Connecting

Enter the email of the Printavo user and that user's API token (My Account in Printavo). The
connection test runs `{ user { id name } }`: the session user, no secret in the response.

## Things most likely to go wrong

1. **Errors come back as HTTP 200.** A bad credential answers `200 {"errors":[{"message":"Unauthorized",
   "extensions":{"code":403}}],"data":null}` (observed live). The client and the connection test
   read `errors[]` from the body and never the status. A failed action throws
   `Printavo GraphQL error: <message>`.
2. **Rate limit: 10 requests per 5 seconds.** A busy workflow (e.g. listing then fetching each
   quote) can hit it. The reference documents no remaining-requests header, so the quota check is
   a declared absence.
3. **Lists are cursor-paged.** Each returns `{ nodes, totalNodes?, hasNextPage, endCursor }`; pass
   `endCursor` back as `after`. Orders (quotes + invoices together) have no `totalNodes` in the
   reference. `first` defaults to 25 here; the reference states no maximum.
4. **Quotes and invoices share almost every field**, but statuses are typed: Set Order Status takes
   a quote status for a quote and an invoice status for an invoice (List Statuses with `type`).
5. **Order status is not an update field.** Update Quote / Update Invoice cannot change it; use
   Set Order Status.
6. **Dates**: `customerDueAt`, `invoiceAt`, `paymentDueAt` are ISO 8601 dates; `dueAt`, `startAt` are
   datetimes.
7. **Address JSON** (billing/shipping) is passed as the reference's `AddressInput` (customers) or
   `CustomerAddressInput` (quotes/invoices); their field sets differ.
8. **Create Quote needs a contact**, a customer due date and a production due date (all required by
   `QuoteCreateInput`).

## Actions

| Group | Actions |
| --- | --- |
| Account | `user-get`, `account-get` |
| Customers | `customer-list`, `customer-get`, `customer-create`, `customer-update`, `customer-delete` |
| Contacts | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete` |
| Quotes | `quote-list`, `quote-get`, `quote-create`, `quote-update`, `quote-duplicate`, `quote-delete` |
| Invoices | `invoice-list`, `invoice-get`, `invoice-update`, `invoice-duplicate`, `invoice-delete` |
| Orders | `order-list`, `order-get`, `order-status-set` |
| Statuses | `status-list` |
| Tasks | `task-list`, `task-get`, `task-create`, `task-update`, `task-delete` |
| Inquiries | `inquiry-list`, `inquiry-get`, `inquiry-create` |
| Payments | `payment-create`, `payment-request-list` |
| Catalog | `product-search` |

## Not covered

Documented in the reference but left out of this version: line items, line item groups, imprints,
mockups, fees, production files, custom addresses (including nesting them in Create Quote),
approval requests, payment request create/delete, payment terms, delivery methods, preset tasks,
email messages, threads, merch orders and stores, transactions, transaction payment
update/delete, inquiry update/delete, and the `login`/`logout` session mutations (this app uses the
static email + token headers instead). The v1 REST API (apiary) is not used.

## Health

Printavo publishes no status page: `status.printavo.com` answers a hosting provider's
"Unknown Domain" 404 and the Statuspage/Better Stack/Atom paths all 404, so `service` is a declared
absence. `quota` is a declared absence too (limit documented, no headroom signal). Credential
liveness is the derived `auth:credentials` check.


## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-task` — New Task | Poll | `task-list` | Each newly created record |
| `new-payment-request` — New Payment Request | Poll, snapshot | `payment-request-list` (`status: OPEN`) | Each payment request that newly appears among the open ones |

This poll wraps the existing `task-list` action; the first check records the current page without emitting events. Source: [vendor API docs](https://www.printavo.com/docs/api/v2) (verified 2026-11-09).

The payment-request trigger reads the OPEN list (up to 5 pages of 100) and diffs the ids; a longer list fails with a clear error.

Not covered: `quote-list`, `invoice-list` and `order-list` (the sort enum has no created-at key and `VISUAL_ID` is a string ID with undocumented ordering, so there is no documented newest-first read), `customer-list`, `contact-list` and `inquiry-list` (the customers and inquiries connections document no sort or filter, and contacts sort only by email, name, customer name or order count, so there is no newest-first read and the lists are unbounded), `status-list` (order statuses are account configuration, a reference list) and `product-search` (the API requires a caller-supplied search term; it is a catalog lookup, not a feed).

Vendor docs (read 2026-11-10): [Printavo API v2](https://www.printavo.com/docs/api/v2).
