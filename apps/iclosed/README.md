# iClosed

## Triggers

- **Triggers** — 9 (poll)

Poll triggers built on the app's existing list actions (same client, endpoint and authentication; no new API path). The host checks every 5 minutes; the first check only records what already exists, so enabling a trigger never replays history.

| Trigger | Mechanism | Wrapped list action | What the run gets |
|---|---|---|---|
| `new-deal` — New Deal | poll | `deal-list` | Each newly recorded deal. |
| `new-call` — New Call | poll | `call-list` | Each call newly booked (`orderColumn=createdAt&orderBy=desc`, every time window). |
| `new-or-updated-call` — New or Updated Call | poll | `call-list` | Each call booked or changed (`orderColumn=updatedAt`), once per change. |
| `new-contact` — New Contact | poll | `contact-list` | Each newly created contact (`orderColumn=createdAt&orderBy=desc`). |
| `new-transaction` — New Transaction | poll | `transaction-list` | Each newly recorded payment transaction (`sort=desc`, by `createdAt`). |
| `new-product` — New Product | poll | `product-list` | Each newly created product (`orderColumn=createdAt&orderBy=desc`). |
| `new-or-updated-product` — New or Updated Product | poll | `product-list` | Each product created or edited (`orderColumn=updatedAt`), once per edit. |
| `new-event` — New Event | poll | `event-list` | Each newly created event type (`latestFirst=true`, ordered by `createdAt`). |
| `new-user` — New User | poll | `user-list` | Each user newly added to the account; the user list is small and read whole, compared check to check. |

The newest-first feeds read one page of 100 per check. There is no edited-contact or edited-transaction trigger: the documented contact object has no update stamp and the transaction list sorts by `createdAt` only.

Not covered, by reason: field and stage definitions (reference data) — `field-list`, `field-list-all`, `contact-stage-list`; availability calendars rather than records — `event-dates-list`, `user-availability-list`; `contact-note-list` (the notes of ONE contact; `GET /v1/contacts/notes` documents no order and no since filter).

Trust model: polling only — no inbound endpoint, no webhook secret; the connection's own API key makes the request.

Vendor docs: <https://developer.iclosed.io> and the OpenAPI file <https://api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml> (verified 2026-11-10).

Sales-call scheduling and CRM for closers, over the iClosed public API v1
(`https://public.api.iclosed.io/v1`). 36 actions, API-key auth, three health checks.

Docs: <https://developer.iclosed.io> (guides) and the OpenAPI 3.0 file
`https://api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`. Every path, verb,
parameter and enum here was read from that file and cross-checked against the guide pages and live
unauthenticated probes on 2026-10-06. The Scribe "connect Zapier" walkthrough is a screenshot
tutorial, not a reference.

## Auth

API key, sent as `Authorization: Bearer iclosed_<key>` (Settings → Developer → API Keys; Business or
Enterprise plan). The key acts as the user who created it. Credentials are stamped only in `sign`.

iClosed also documents OAuth 2.1 with PKCE, but it needs a client registered with iClosed, so it is
not offered.

## Actions

| Area | Actions |
|---|---|
| Contacts | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-note-list`, `contact-note-create` |
| Calls | `call-list`, `call-create`, `call-reschedule`, `call-cancel`, `call-slot-free-set`, `outcome-set` |
| Events | `event-list`, `event-get`, `event-status-set`, `event-slots-troubleshoot`, `event-dates-list` |
| Deals and products | `deal-list`, `deal-create`, `deal-update`, `product-list`, `product-create`, `product-update` |
| Transactions | `transaction-list`, `transaction-create`, `transaction-update`, `transaction-delete` |
| Custom fields | `field-list`, `field-list-all`, `contact-stage-list`, `field-create`, `field-update`, `field-answer-set`, `field-answer-bulk-set` |
| Users | `user-list`, `user-availability-list` |

Every action returns the vendor's parsed body verbatim. The envelope is not consistent (see below),
so nothing is unwrapped. Pagination is page-based: `page` (zero-based) and `limit`; there is no
cursor. `GET /eventCalls` returns `data.count`; `GET /fields/objects` also returns `hasMore` and
`nextPage`.

## Findings that would cost a day

1. **The key prefix is `iclosed_`, not `iclosed-`.** The OpenAPI `bearerAuth` description says
   `iclosed-<token>`; the authentication guide says `iclosed_<token>`. Live: `Bearer iclosed-x` ->
   `401 {"message":"API key is required"}` (treated as no key), `Bearer iclosed_x` -> `401
   {"message":"Invalid API key"}`. The connection test rejects a key without the underscore locally.
2. **Every credential failure is a 401, told apart only by `message`**: `API key is required`
   (missing or wrong prefix), `Invalid API key` (unknown or revoked), `API key expired`. The test
   hook classifies from the body.
3. **Three error shapes.** A 400 puts an *object* in `message`
   (`{status, details: {formErrors, fieldErrors}, endpoint, method}`); a 429 is
   `{code: RATE_LIMIT_EXCEEDED, retryAfter, limit}`; the rest are `{message, code?}`. The errors
   page says 20 requests/second on 429 while the rate-limit page says 20 (Startup) or 100 (Business)
   per endpoint per 10 seconds; the app follows the rate-limit page and reports whatever `limit` the
   429 body carries. There are no rate-limit headers.
4. Inconsistent envelopes: `GET /fields/contact-stage` is a bare object, `GET /transactions` and
   `GET /contacts/notes` put `count` beside `data`, and the spec documents `GET /eventCalls` as 201.

## Health checks

- `service` — `status.iclosed.io/api/v2/summary.json` (an incident.io page serving the Statuspage v2
  schema; page id `01KKXK0JRVR5PP6KT6XG704E9E` pinned, a nonsense sibling path is a real 404). Only the
  `iClosed API` component decides; the website, app and billing components are detail, capped at
  `degraded`. `iclosed.statuspage.io` and `iclosed.instatus.com` are unclaimed decoys.
- `api` — unsigned `GET /v1/users`; the schema-correct `401 {"message":"API key is required"}` is a
  pass (it proves reachability), not an outage.
- `quota` — declared unavailable at `informational` severity: limits are published but nothing on the
  wire exposes headroom.
- plus the derived `auth:api-key` check. The credential probe is `GET /v1/fields/contact-stage`
  (needs a key, no parameters, no personal data, no credential echoed). It was **not** exercised with
  a live key — none was available — only its unsigned 401 was observed.

## Not covered

- `POST /v1/fields/inviteeAnswers` — part of the public booking-form flow (needs a `previewId`
  session), not back-office automation.
- OAuth 2.1 (see Auth).
- Webhooks are documented separately at `developer.iclosed.io/docs/webhooks`; this app declares no
  triggers.
- Request and response bodies were not exercised against a live account, so the declared `output`
  keys are the shapes in the OpenAPI document.

## Icon

`assets/icon.svg` is the vendor's own mark, byte-for-byte from the light-scheme favicon declared in
`iclosed.io`'s `<head>` (`framerusercontent.com/images/OAcC9hOvGrcvNZ4fmyTjAzY0QSs.svg`);
`assets/icon.dark.svg` is the dark-scheme favicon from the same page. Neither is regenerated or
reformatted.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task test
deno task fmt
```
