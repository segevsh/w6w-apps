# Anchor

Manage [Anchor](https://www.sayanchor.com/) proposals, agreements, invoices, payouts, contacts and
webhooks from a workflow, on the **Anchor API** (`https://api.sayanchor.com`).

- **Categories** — finance, crm
- **Auth methods** — api-key (an API key **plus** the acting user's email)
- **Actions** — 33
- **Health checks** — `service` (declared unavailable, informational), `quota` (rate-limit headers)
  \+ the derived `auth:api-key`
- **Egress allowlist** — `api.sayanchor.com`
- **Website** — https://www.sayanchor.com/
- **API docs** — https://docs.sayanchor.com/reference/get-started (the help-center article this app
  was suggested from is only a Zapier connection guide; the real reference is the readme.io site)
- **Icon** — `assets/icon.svg` embeds Anchor's own wordmark SVG
  (`white anchor logo.svg` from sayanchor.com) unmodified, on its brand purple `#643cff`. Anchor
  publishes the mark in white only, so the purple tile is the only addition.

Verified 2026-10-06 against the per-operation OpenAPI 3.0.3 documents embedded in each page of
https://docs.sayanchor.com (index: `/llms.txt`) and live probes of `api.sayanchor.com`. There is no
single `openapi.json`; the app was built from the individual operation pages.

## What a workflow can do

| Area            | Actions |
| --------------- | ------- |
| Business        | `business-get` |
| Contacts        | `contact-list`, `contact-get`, `contact-create` |
| Proposals       | `proposal-template-list/get`, `proposal-draft-list/get/create-from-template/update`, `proposal-list/get/publish/withdraw-for-editing/republish/cancel-edit/approve-on-behalf` |
| Agreements      | `agreement-list/get/rename`, `adhoc-agreement-get-or-create` |
| Billing         | `credit-add`, `charges-submit`, `service-template-list`, `legal-terms-list` |
| Money in        | `invoice-list/get`, `payout-list/get`, `payout-invoice-list` |
| Webhooks        | `webhook-subscription-list`, `webhook-subscribe`, `webhook-unsubscribe` |

**Deliberately left out:** the ~35 draft service/package/bundle/legal-terms editing routes, the CSV
exports, agreement amendment routes (`add/update/terminate service`, `update settings`), service
template creation and rich-text legal terms writes. They are documented, but their request bodies
are deeply nested pricing trees (`v2_types.Pricing`, billing triggers, bundles) that this first
version does not model; build a draft from a template and use `charges-submit` for one-off charges.
Deprecated routes (`POST /proposal-drafts`, `GET /service-templates` legacy list) are not used.

## Three things that would cost a day

### 1. A key alone is not a credential

Every request needs `Authorization: Bearer anc-…` **and** `Anchor-User-Email`, the email of a
registered user in the key's business. Anchor attributes and permission-checks each call against that
user (403 = valid key, user may not). The connection therefore stores both fields and `sign` stamps
both; actions never see either.

### 2. Auth failures come in three shapes, and the docs state one

Measured live: no `Authorization` -> `401 text/plain "Unauthorized"`; a malformed bearer ->
`401 json {"error":"token contains an invalid number of segments"}`; a well-formed unknown key ->
`401 json {"error":"INVALID_API_KEY"}`. The client reads the vendor code from the JSON `error` field
or, failing that, the whole text body, and the credential test classifies on that — not on the status.

### 3. The docs, the wire and the schema disagree in small ways

- **Rate limit** — the docs say 200 requests/minute; responses carry `ratelimit-limit: 2000` with
  the user-email header and `50` without it. The `quota` check reports the headers.
- **Publish** — the page prose says `notifyClient=false`, the request schema says
  `notifyPolicy: "notify" | "silent"`. This app follows the schema.
- **Mixed versions** — list and get routes are split across `/…` and `/v2/…` (`GET /proposal-templates`
  but `GET /v2/proposal-templates/{id}`; `GET /proposals/{id}` but `/v2/proposals/{id}/republish`).
  Paths here are copied per operation, not inferred.
- `POST /contacts` and `POST /proposals/{id}/approve/vendor` answer with a **bare JSON string**, not an
  object; the client wraps it (`contactId`, `value`).
- `webhook-subscribe` returns an `encryptionKey` for verifying payloads. It is the only time Anchor
  shows it, so it is returned as-is — treat the step output as a secret and store it. Each call
  **replaces** the URL's event list.

## Health

`service` is a declared absence: `anchor.statuspage.io` exists but is Statuspage's unconfigured
starter (components named `API (example)` and `Management Portal (example)`, created 2026-01-23) and
is linked from nowhere Anchor publishes, so it would report `ok` whatever happens. `quota` reads the
IETF `RateLimit-*` headers from `GET /me`; the credential probe is the same endpoint, which returns
only the business id and name.
