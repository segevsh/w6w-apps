# Lexware Office

German cloud accounting and invoicing (formerly **lexoffice**, renamed May 2025). This app reads and
writes an organization's contacts and articles, creates invoices, quotations, order confirmations
and credit notes, searches the voucher list, reads payment status and downloads rendered documents.

- App id: `io.w6w.lexware-office` · category: `finance`
- Host: `api.lexware.io` (the only entry in `network.allow`) · API prefix `/v1`
- Source of truth: Lexware's single-page reference, `https://developers.lexware.io/docs/`
  (`developers.lexoffice.io` redirects there), plus unauthenticated probes of `api.lexware.io`,
  both on 2026-10-06. The old `api.lexoffice.io` gateway was retired in December 2025 and is not
  allowlisted.

## Auth

One method, `api-key` (type `bearer`): `Authorization: Bearer <key>`. An organization admin
generates the key at `https://app.lexware.de/addons/public-api`. It acts for the whole
organization. Paste the bare key, without a `Bearer ` prefix.

### The probe is `GET /v1/profile`

It needs no document scope and returns organization data (`organizationId`, `companyName`,
`created{userName,userEmail,...}`, `connectionId`, `features`, `businessFeatures`,
`subscriptionStatus`, `taxType`, `smallBusiness`) — no field echoes the key. Verdicts are taken from
the body's `message`, with the status as a hint. Measured 2026-10-06:

| Request | Status | Body |
|---|---|---|
| no `Authorization` header | 401 | `{"message":"Unauthorized"}` |
| `Bearer garbage` | 401 | `{"message":"Unauthorized"}` |

The reference also lists a `403 {"message":"'…' not a valid key=value pair …"}` for a malformed
header (reported as "paste the bare key") and `402` for a Lexware contract problem. A **200 with a
real key was not observed** (no key was available); that path is from the reference. `afterConnect`
keeps `companyName` and `organizationId` for the connection label and drops the user name and email.

## Actions (22)

| Key | Type | Endpoint |
|---|---|---|
| `profile-get` | read | `GET /v1/profile` |
| `contact-list` | search | `GET /v1/contacts` |
| `contact-get` | read | `GET /v1/contacts/{id}` |
| `contact-create` | perform | `POST /v1/contacts` |
| `contact-update` | perform | `PUT /v1/contacts/{id}` |
| `article-list` | search | `GET /v1/articles` |
| `article-get` | read | `GET /v1/articles/{id}` |
| `article-create` | perform | `POST /v1/articles` |
| `voucher-list` | search | `GET /v1/voucherlist` |
| `invoice-get` | read | `GET /v1/invoices/{id}` |
| `invoice-create` | perform | `POST /v1/invoices[?finalize=true]` |
| `quotation-get` | read | `GET /v1/quotations/{id}` |
| `quotation-create` | perform | `POST /v1/quotations[?finalize=true]` |
| `order-confirmation-get` | read | `GET /v1/order-confirmations/{id}` |
| `order-confirmation-create` | perform | `POST /v1/order-confirmations[?finalize=true]` |
| `credit-note-get` | read | `GET /v1/credit-notes/{id}` |
| `credit-note-create` | perform | `POST /v1/credit-notes[?finalize=true]` |
| `payment-get` | read | `GET /v1/payments/{voucherId}` |
| `document-file-get` | read | `GET /v1/{invoices,quotations,order-confirmations,credit-notes,delivery-notes,dunnings,down-payment-invoices}/{id}/file` |
| `country-list` | search | `GET /v1/countries` |
| `posting-category-list` | search | `GET /v1/posting-categories` |
| `payment-condition-list` | search | `GET /v1/payment-conditions` |

All `perform` actions are `idempotent: false`: Lexware documents no idempotency key.

### Things that bite

1. **There is no "list invoices" endpoint.** Invoices (and credit notes, quotations, ...) are listed
   through `voucher-list` (`GET /v1/voucherlist`), which returns metadata only; `voucherType` and
   `voucherStatus` are mandatory (comma list or `any`). Fetch the full document by `id` with the
   matching `*-get` action.
2. **2 requests per second, whole API, token bucket.** Exceeding it is a 429 — except the AWS gateway
   documents it as a `500 "Internal server error or rate limit exceeded"`, so a 500 may be a rate
   limit. Loop with a delay.
3. **Three error bodies.** Gateway `{"message"}`, legacy `{"IssueList":[...]}` (contacts, files,
   vouchers) and regular `{status, message, details[{field, violation}]}` (everything else). Errors
   are surfaced with the field path and violation.
4. **Paging is `page`/`size` (zero-based, max size 250) returning `content`, `last`,
   `totalPages`, `totalElements`.** Searches stop at 10,000 results ("Maximum search window size
   exceeded") — narrow the dates. Countries, posting categories and payment conditions are bare
   arrays, returned here as `{items}`.
5. **Documents are drafts unless `finalize` is on, and a finalized document cannot be changed through
   the API.** Draft documents have no rendered file: `document-file-get` on one is a 406/409.
   Only an XRechnung invoice has an XML form; everything else is PDF.
6. **Writes use optimistic locking.** `PUT` needs the entity's current `version` (409 if stale);
   a contact with more than one email, phone, address or contact person cannot be updated through
   the API at all.
7. **Sales documents are passed as the vendor's own JSON** (`voucher` param) rather than flattened:
   line items, tax conditions and shipping conditions nest and vary by tax type. Each action's hint
   lists the required fields.
8. **Quotations need a re-generated key** if the key was created before the quotations endpoint
   existed (the vendor's note) — a 403 on quotations with a working key means this.

## Health checks

| Check | Kind | Result |
|---|---|---|
| `auth:api-key` | derived | the auth `test` hook above |
| `api` | dependency, unsigned, app-scoped | `GET /v1/profile` with no credential. A 401 carrying the gateway's JSON `{"message": ...}` **passes**: it proves the API gateway answers. It is the same body a wrong key gets, so it cannot see behind the gateway. Non-JSON or 5xx is `down`. |
| `service` | declared absence (`informational`) | **No usable status page.** `status.lexware.de` answers HTTP 406 to every probe; the docs name no machine-readable source. |
| `quota` | declared absence (`informational`) | 2 requests/second is documented, but there is no rate-limit header and no usage endpoint. |

The health check is the auth probe only, plus the unsigned reachability check.

## Not yet covered

Left out to keep the surface to what was read and confirmed end to end:

- **Pursuing a document** (`POST /v1/{invoices,order-confirmations,credit-notes,delivery-notes,dunnings}?precedingSalesVoucherId=`):
  the reference describes the query parameter but not the request body it expects.
- Delivery notes, dunnings, down-payment invoices (create/get — only their files are downloadable)
- Bookkeeping vouchers (`/v1/vouchers`, create/update/filter, and `/v1/vouchers/{id}/files`)
- `POST /v1/files` (file upload) and `GET /v1/files/{id}`
- Article update/delete, and the deprecated `/{id}/document` render endpoints (superseded by `/file`)
- Recurring templates, print layouts
- Event subscriptions (webhooks): create/list/get/delete. A trigger concern, not an action.

## Icon

`assets/icon.svg` is the vendor's own favicon, `https://www.lexware.de/favicon.svg` (1,089 bytes),
saved verbatim. `deno task fmt` is scoped to the code directories and never touches it.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
