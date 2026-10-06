# Quaderno

Tax-compliant invoicing for w6w workflows: manage contacts, create and deliver invoices, refund them
with credit notes, record expenses and estimates, read the product catalog, and call Quaderno's tax
calculator directly.

- **Spec used:** the vendor's OpenAPI 3.1 document, version `20241028`
  (`developers.quaderno.io/redocusaurus/openapi-v20241028.yaml`), plus its "API features" guide.
- **Base URL:** `https://{account}.quadernoapp.com/api` — one host per account, so the manifest
  allows `*.quadernoapp.com` (the wildcard does not match the apex).
- **Rate limit:** 100 calls per 15 seconds (`429` beyond it).

## Connecting

One auth method, `api-key` (`basic`): the API key goes in as the Basic **username** with a **blank
password** (`curl -u <key>:`). Create the key under Developers → API keys. The connection also takes the
**account name** — the `acme` in `acme.quadernoapp.com` — which `afterConnect` records on the
connection so the client can address the right host without seeing a credential.

The credential test calls `GET /ping`, the vendor's documented credential check. Its body is
`{ "status": … }` and never echoes the key; a rejection is `{ "error": "Wrong API key or the user does
not exist." }`, and the verdict is read from the body, not the status code.

## Actions (24)

| Resource | Actions                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Contact  | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`                                        |
| Invoice  | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-deliver`, `invoice-record-payment`, `invoice-void`               |
| Expense  | `expense-list`, `expense-get`, `expense-create`                                                                            |
| Estimate | `estimate-list`, `estimate-get`, `estimate-create` (Quaderno's `/proformas`)                                               |
| Credit   | `credit-list`, `credit-get`, `credit-create` (refunds an invoice)                                                          |
| Item     | `item-list`, `item-get` (Quaderno's `/items`, the product catalog)                                                         |
| Tax      | `tax-calculate` (`GET /tax_rates/calculate`)                                                                               |
| Webhook  | `webhook-list`                                                                                                             |

List actions return `{ items, hasMore, nextCursor }`. Quaderno paginates with `created_before=<id>`
and an `X-Pages-HasMore` response header (default 25, max 100); pass `nextCursor` back as
`createdBefore` for the next page.

Quirks worth knowing: `invoice-deliver` is a **GET** on Quaderno's side (it sends an email);
`invoice-create` with a payment method records a full payment and marks the invoice paid; money in
responses is in cents (`total_cents`) while amounts you send are in currency units; a contact's
`first_name` is required even for a company (it holds the company name).

## Health checks

| Check               | Probe                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service`           | `quaderno.statuspage.io/api/v2/summary.json` — Atlassian Statuspage, `page.name` = `Quaderno`; verdict from the `Quaderno APIs` component (id `hqy8fjhlb31h`) only, not the web app. Allowlisted on the hook, not in the manifest |
| `quota` (info)      | Signed `GET /ping`; `X-RateLimit-Limit/Remaining/Reset` headers                                                                                                                                         |
| `account` (context) | Unsigned `GET /contacts`; a JSON `401 {"error": …}` is a pass (proves the API tier is answering). An unknown subdomain gets the same 401, so a mistyped account is caught by `auth:api-key`, not here    |
| `auth:api-key`      | Derived from the auth `test` hook (`GET /ping`)                                                                                                                                                         |

## Not covered

Endpoints in the spec that this app does not wrap (left out rather than guessed at): receipts, recurring
documents, proforma accept/decline/revert/convert/deliver and update, invoice/credit update, credit
void/deliver/payments, expense update/delete, item create/update/delete, contact tax IDs (`/tax_ids`),
tax codes, jurisdictions and registrations, evidence, checkout sessions and coupons, reporting requests,
accounts/addresses (Connect), the `/transactions` endpoint, and webhook create/update/delete. File
attachments on documents are not exposed.

## Icon

`assets/icon.svg` is the vendor's own mark, fetched verbatim from `https://quaderno.io/favicon.svg`
(1,286 bytes). Format with `deno task fmt`, never bare `deno fmt`, which rewrites it.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
