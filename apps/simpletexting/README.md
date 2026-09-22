# SimpleTexting

Send SMS/MMS, manage contacts, lists, segments and custom fields, send campaigns, and subscribe
webhooks to messaging events, on **SimpleTexting's API v2**.

- **Categories** — communication, marketing
- **Auth methods** — api-key
- **Actions** — 27
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api-app2.simpletexting.com` (the `service` health check adds
  `status.simpletexting.com` to its own hook allowlist, never to the app's)
- **Website** — https://simpletexting.com/
- **API docs** — https://simpletexting.com/api/docs/v2/ (human page) →
  https://api-doc.simpletexting.com/ (renders the full OpenAPI 3.0 document inline)
- **Status page** — https://status.simpletexting.com/

> **Everything below was verified on 2026-09-22** against the OpenAPI 3.0 document embedded in
> `https://api-doc.simpletexting.com/` (extracted via a balanced-brace scan of the page's inline
> spec — the page is a static renderer, and no `.json`/`.yaml` file is published at any stable
> URL), cross-checked against live probes of `https://api-app2.simpletexting.com/v2` and its status
> page on the same day. Nothing here came from a third-party integration directory or a sibling
> app.

## The findings most likely to cost someone a day

### 1. The docs describe `apiKey`; the wire wants `Bearer`

`components.securitySchemes.api_key` is declared `type: apiKey, name: Authorization, in: header` —
a scheme that, read literally, says the raw token goes in the header. Its own description and
every code sample say the opposite: send `Authorization: Bearer <token>`. Live-verified against
`GET /v2/api/tenant`: a token sent *without* the `Bearer ` prefix answers `401
ERR_AUTH_TOKEN_INVALID` — it fails as a wrong token, not as a malformed header, so the missing
prefix reads exactly like a bad key. `auth/api-key.ts` sends the prefix unconditionally.

### 2. Both credential failures are HTTP 401 — the body is the only signal

| Sent | Answer |
|---|---|
| no `Authorization` header at all | `401`, body `errorCode: "ERR_AUTH_TOKEN_MISSING"` |
| a well-formed but wrong token | `401`, body `errorCode: "ERR_AUTH_TOKEN_INVALID"` |
| a valid token | `200`, body `{"email": "..."}` (`TenantInfo`) |

The status code alone cannot tell "no credential reached the request" from "the credential was
rejected" — both are `401`. `auth/api-key.ts`'s `test` hook classifies on the `application/
problem+json` body's `errorCode` (falling back to `code`), never on the status line.

### 3. The vendor's own campaign example contradicts its own schema

The `POST /api/campaigns` endpoint description shows a request body containing `"listsOrSegments":
[...]` and a `title` field nested inside `messageTemplate`. Neither field exists in
`ImmediatelyCampaignRequest` or `MessageTemplate` — the schema declares separate `listIds` and
`segmentIds` arrays, and `title` only at the top level. One of the schema's own example URLs is
also missing a path segment (`GET .../v2/api/507f1f77…` instead of `.../v2/api/campaigns/507f1f77…`
for "Get a Campaign"). `actions/campaign-send.ts` and `actions/campaign-get.ts` follow the
**schema**, since that is what the server validates, not the prose.

## What this app covers

The v2 API (`https://api-app2.simpletexting.com/v2`) is REST, JSON in and out, with two answer
shapes: an entity directly (`GET /api/tenant` → `{email}`, a contact, a list, a message, a
campaign), or a page envelope (`{content, totalPages, totalElements}`) for every collection.
Deletes answer `204` with no body. 27 of the document's 38 operations are covered:

- **Tenant & phones** (`tenant-info-get`, `phone-list`) — the account's own email, and the numbers
  a message can be sent from.
- **Messages** (`message-send`, `message-list`, `message-get`, `message-evaluate`) — send a single
  SMS/MMS, list and read past messages, and price a message body (credits, SMS vs extended-SMS vs
  MMS) before sending it.
- **Contacts** (`contact-create`, `contact-list` [search], `contact-get`, `contact-update`,
  `contact-delete`) — full CRUD, addressed by phone number or hexadecimal ID.
- **Contact lists** (`contact-list-create`, `contact-list-list`, `contact-list-get`,
  `contact-list-update`, `contact-list-delete`, `contact-list-add-contact`,
  `contact-list-remove-contact`) — full CRUD plus single-contact membership changes that do not
  disturb the rest of a contact's lists.
- **Segments & custom fields** (`segment-list`, `custom-field-list`) — read-only lookups; the
  document exposes no write endpoint for either, so they are managed only in the SimpleTexting
  dashboard.
- **Campaigns** (`campaign-list`, `campaign-send`, `campaign-get`) — send an immediate campaign to
  lists and/or segments, list past campaigns with filters, and read one campaign's full state and
  delivery outcome.
- **Webhooks** (`webhook-create`, `webhook-list`, `webhook-update`, `webhook-delete`) — subscribe a
  URL to any of the platform's eight message/conversation events, optionally scoped to one sending
  number or one contact.

### Deliberately left out of this build, by resource

- **Media items** (`POST /api/mediaitems/upload`, `POST /api/mediaitems/loadByLink`, `GET /api/
  mediaitems`, `GET /api/mediaitems/{id}`, `DELETE /api/mediaitems/{id}`) — MMS attachments can
  already be sent by URL (`mediaItems` on `message-send`/`campaign-send` accepts a public image
  URL, per the schema), so managing SimpleTexting's own hosted media library is a separate concern
  left for a future build.
- **Contacts batch** (`POST /api/contacts-batch/batch-update`, `POST /api/contacts-batch/batch-
  delete`, `GET /api/contacts-batch/batch-update/{taskId}`) — an async, poll-for-completion shape
  that does not fit this app's synchronous action model without a second, task-polling action;
  `contact-create`/`contact-update`/`contact-delete` cover the single-contact case.
- **Report webhooks** (`POST /report/unsubscribe`, `POST /report/incoming`, `POST /report/
  delivery`) — unauthenticated (`security: []`) convenience endpoints that each create a webhook
  scoped to exactly one of the eight triggers `webhook-create` already exposes. Deliberately
  excluded: they need no credential at all, so wiring one as an action would let any caller with
  network access subscribe a URL without a Connection — the authenticated `webhook-create` (with
  a `triggers` multi-select) covers the same ground safely.

This is scope discipline, not an unconfirmed-detail gap: every operation above was read off the
same verified document as the 27 that are built.

## Auth

**API token** (`auth/api-key.ts`), a personal access token minted in the SimpleTexting web app
under *Settings > API*, sent as `Authorization: Bearer <token>` — the entire authentication story;
the document publishes no OAuth surface.

The credential probe is `GET /api/tenant` — the cheapest authenticated read in the document (no
parameters, no pagination, no resource scope), reachable by any token that can call anything at
all, and its response (`{email}`) carries nothing secret, so the probe cannot echo the credential
back into a stored health report. The three unauthenticated `/report/*` endpoints were considered
and rejected as probes for the same reason `timezone-list` was rejected in a sibling app: a probe
that needs no credential would pass a Connection whose token never reached the request.

## Health

- **`service`** (`kind: "service"`) — component status from `status.simpletexting.com`, unsigned,
  anchored on the page's dedicated `API` component (matched by name, never by id). The messaging-
  pipeline components (`SMS`, `MMS`, `Incoming` ×2, `Outgoing` ×2) and `Login` are reported
  alongside it but do not decide the verdict — a workflow that only manages contacts should not
  read as broken because the dashboard's `Login` component is degraded.
- **`quota`** (`kind: "quota"`) — a **declared absence**, `severity: "informational"`. The document
  returns credit figures only as the *cost of a send already made* (`credits` on a send response,
  `creditsTotal` in a campaign's outcome) — never a balance — and the string "rate limit" appears
  nowhere in it; no `RateLimit-*`/`X-RateLimit-*` header was present on the live `401` read
  2026-09-22. `message-evaluate` prices one message without sending it, which is not a quota
  reading either, so this app declares the absence instead of presenting one as the other.
- **`auth:api-key`** — derived automatically from the Auth method's `test` hook.

## Development

```bash
deno task validate   # manifest + sandbox rules (@w6w/validator via _tools/audit.ts)
deno task check       # typecheck
deno task lint        # deno lint
deno task fmt         # format — always via this task, never a bare `deno fmt`
deno task test        # unit tests, every action + auth + both health checks
```
