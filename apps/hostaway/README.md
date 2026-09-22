# Hostaway

Manage Hostaway vacation-rental listings, calendars, reservations, guest conversations,
reviews, tasks and financial reports.

- **Categories** — crm, calendar
- **Auth methods** — client-credentials
- **Actions** — 21
- **Health checks** — `service` (declared absence) · `api` · `reachability` · `quota`
  (declared absence) · 1 derived (`auth:client-credentials`)
- **Egress allowlist** — `api.hostaway.com`
- **Website** — https://www.hostaway.com
- **API docs** — https://api.hostaway.com/documentation

## How this was researched

The spec is `https://api.hostaway.com/documentation` — a ~2.9MB static Postman-Documenter
HTML page, fetched and read in full on 2026-09-22 (HTTP 200, `text/html`). It is **not** a
Redoc/Swagger shell: there is no OpenAPI document or Postman collection behind it, the prose
and its `curl` examples *are* the reference. Every base URL, path, request body and response
field in this app was read off that page; where a live probe was possible without credentials
it was confirmed on the wire on the same day, and the probes are quoted in the relevant doc
comments.

Two live facts shaped the design and are worth stating up front:

- **`scope` is always the literal string `general`**, and `client_id` is the numeric
  **Hostaway account ID** — not an OAuth application id (`POST /v1/accessTokens`).
- **Failures are classified from the response body, not the HTTP status.** The docs'
  "Standard Response" section defines `status: "success" | "fail"`; an unsigned request to
  any real endpoint answers `403 {"status":"fail","message":"..."}` (verified live), while
  the token endpoint answers a non-envelope `401 {"error":"invalid_client",...}`.

## Setup

1. In the Hostaway dashboard, open **Settings → Hostaway API** and copy the **Account ID**
   (a number) and the **Client Secret**.
2. When connecting the app in w6w, paste both. There is no browser sign-in step.

The connection is account-wide: the token sees the same listings, reservations and
conversations the dashboard does. Nothing here is scoped to a single listing or user.

### Auth: Client Credentials (`custom`)

Hostaway's Authentication section: "We use Client Credentials Grant of OAuth 2.0 protocol for
API authentication", via

```
POST https://api.hostaway.com/v1/accessTokens
content-type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={accountId}&client_secret={secret}&scope=general
```

→ `200 {"token_type":"Bearer","expires_in":15897600,"access_token":"<JWT>"}`, and every
subsequent call carries that token as `Authorization: Bearer <access_token>` (injected by the
auth `sign` hook — no Action ever sees it).

- `exchange` mints the first token from the pasted Account ID + Client Secret.
- `refresh` re-mints it when the runtime sees it expire (the pair itself never expires).
- `sign` stamps the bearer header on every request.
- `test` re-runs the same exchange — the narrowest live-credential probe there is, because
  `/v1/accessTokens` is the only endpoint every account can call regardless of which Hostaway
  features it has, and its response never echoes either secret back.

`type: "custom"` rather than `"oauth2"`: the `oauth2` type in this spec models the browser
authorization-code flow (`authorizationUrl` + PKCE), which Hostaway does not use for
server-to-server integrations.

**Two documented quirks worth knowing:**

- The token "will be valid 1 second after being returned", so a mint-then-immediately-call
  sequence can see a 403 on the very first request. That is Hostaway's behaviour; nothing in
  this app works around it.
- The docs say the token lasts **24 months** in prose while their own example returns
  `expires_in: 15897600` (~184 days). The live `expires_in` wins here — it is trusted and
  nothing is hardcoded (`auth/client-credentials.ts`).

## Actions

21 actions, grouped by resource.

### Listings

| Action | Endpoint |
|---|---|
| `list-listings` | `GET /v1/listings` (limit, offset, city, country, contactName, propertyTypeId, match, sortOrder, includeResources) |
| `get-listing` | `GET /v1/listings/{listingId}` (includeResources) |
| `update-listing` | `PUT /v1/listings/{listingId}` (partial update) |

`update-listing` exposes 16 of the documented Listing object's ~90 fields, each one named in
the docs' own property table: `name`, `internalListingName`, `externalListingName`,
`description`, `houseRules`, `propertyTypeId`, `city`, `country`, `price`, `cleaningFee`,
`personCapacity`, `minNights`, `maxNights`, `cancellationPolicy`, `contactName`,
`contactEmail`. Unset params are dropped, never sent as `null`. The docs' warning about
`cancellationPolicy` (only `flexible`, `moderate`, `firm`, `strict`, `no_refund`) is a select
list, and the less obvious warning — "an empty listingAmenities, listingBedTypes or
listingImages array in the same request is applied before the value is checked, so those rows
are deleted even though the update is rejected" — is why those arrays are not exposed at all.

### Calendar

| Action | Endpoint |
|---|---|
| `get-calendar` | `GET /v1/listings/{listingId}/calendar` (startDate, endDate, includeResources) |
| `update-calendar` | `PUT /v1/listings/{listingId}/calendar` (one interval) |

`update-calendar` sends the documented calendar-day object with `startDate`/`endDate`
defining the interval: `isAvailable`, `desiredUnitsToSell`, `price`, `minimumStay`,
`maximumStay`, `closedOnArrival`, `closedOnDeparture`, `note`. Blocking is a field value, per
the docs — single units set `isAvailable` to 0, multi-units set `desiredUnitsToSell` to 0.

### Reservations

| Action | Endpoint |
|---|---|
| `list-reservations` | `GET /v1/reservations` (limit, offset, listingId, channelId, match, dateType, startDate, endDate, sortOrder, hasUnreadConversationMessages, includeResources) |
| `get-reservation` | `GET /v1/reservations/{reservationId}` |
| `create-reservation` | `POST /v1/reservations` (+ `forceOverbooking`, `provider`) |
| `update-reservation` | `PUT /v1/reservations/{reservationId}` (+ `forceOverbooking`) |
| `cancel-reservation` | `PUT /v1/reservations/{reservationId}/statuses/cancelled` |

`create-reservation` enforces the four fields the documented Reservation object marks
required (`channelId`, `listingMapId`, `arrivalDate`, `departureDate` — `guestName` and
`numberOfGuests` are documented as optional), restricts `channelId` to the three values the
docs allow on create (2000 direct, 2002 homeaway, 2020 partner), and rejects a `provider`
longer than the documented 50 characters before spending a request. `listingMapId` is
deliberately absent from `update-reservation`: "It's not possible to update the listingMapId
of a reservation with this request."

`POST /v1/reservations` has its own documented limit of 200 requests per 10 seconds per
account.

### Conversations

| Action | Endpoint |
|---|---|
| `list-conversations` | `GET /v1/conversations` (limit, offset, reservationId, includeResources) |
| `get-conversation` | `GET /v1/conversations/{conversationId}` |
| `list-conversation-messages` | `GET /v1/conversations/{conversationId}/messages` |
| `send-conversation-message` | `POST /v1/conversations/{conversationId}/messages` |

`send-conversation-message` is **rate-limited to 30 requests per minute per account** — one
of the few endpoints Hostaway gives its own counter, and that limit is stated in the action's
own description. The body is `{ body, communicationType }` only; the docs are explicit that
attachments are not supported. `communicationType` defaults to `email` and accepts
`email`/`channel`/`sms`/`whatsapp`.

### Reviews

| Action | Endpoint |
|---|---|
| `list-reviews` | `GET /v1/reviews` (limit, offset, listingMapIds, reservationId, type, statuses, guestName, ratingMin, ratingMax, sortBy, sortOrder) |
| `get-review` | `GET /v1/reviews/{reviewId}` (preview) |

### Finance

| Action | Endpoint |
|---|---|
| `get-finance-standard-report` | `POST /v1/finance/report/standard` (multipart form data; returns CSV) |

**Requires the account feature.** The docs' Financial Reporting section opens with: "Before
using those endpoints please make sure financial reporting feature is enabled for your
account". That is a doc-comment on the action, not a runtime check — there is no endpoint to
read the feature flag from, and an account without it gets the documented failure envelope.
Parameters travel as POST **`multipart/form-data`**, not JSON and not urlencoded — the docs'
curl example uses `--form` and the PHP example passes `CURLOPT_POSTFIELDS` as an array, both
of which are multipart, not `application/x-www-form-urlencoded` — and the response is CSV
text, so the action returns `{ csv }` rather than pretending the body is the JSON envelope.

### Tasks

| Action | Endpoint |
|---|---|
| `list-tasks` | `GET /v1/tasks` (limit, offset, channelId, reservationId, match, status, date windows) |
| `create-task` | `POST /v1/tasks` |

`create-task` enforces only `title`, the single field the documented Task object marks
required; `status`, when sent, is restricted to the five documented values.

### Reference data

| Action | Endpoint |
|---|---|
| `list-amenities` | `GET /v1/amenities` |
| `list-property-types` | `GET /v1/propertyTypes` |

Both are static reference data, documented as plain `{id, name}` objects — the only documented
way to resolve the `amenityId` / `propertyTypeId` values the listing write endpoints expect.

## Health checks

Hostaway publishes **no status page**, so there is no `service` probe to wire up:

- `status.hostaway.com` does not resolve at all (verified 2026-09-22 — the connection fails
  before HTTP starts).
- `hostaway.statuspage.io`, the conventional Statuspage subdomain, is **unclaimed**: it
  302-redirects to `https://www.statuspage.io/`, the status-page vendor's own marketing site,
  not a Hostaway board.
- Neither `www.hostaway.com` nor the docs page links any status/statuspage/instatus host; the
  docs point at `support@hostaway.com` instead.

So `service` is a **declared absence** (`unavailable`, `severity: "informational"`), which is
the honest answer rather than a silent gap — and at any stronger severity it would pin the
App's verdict at `unknown` forever. What answers the question instead:

- **`api`** — a **signed** `GET /v1/users?limit=1`, classified from Hostaway's own `status`
  field rather than the HTTP code. That endpoint is lightweight, account-scoped, and its
  documented User object carries no credential material. It reports `X-RateLimit-*` headroom
  when a 429 carries it, converting `X-RateLimit-Retry-After` from the documented Unix
  **timestamp** into a reset time.
- **`reachability`** — the same endpoint **unsigned** (`credential: "none"`), for the case
  where no usable credential exists. A reachable Hostaway answers a well-formed
  `{"status":"fail",...}` envelope even to an anonymous caller (verified live: `403` with the
  documented body), and *that* is the "the API is there" signal. This check is
  `severity: "informational"` and **never returns `down`**, so a dead or absent credential can
  never be read as a Hostaway outage.
- **`quota`** — a **declared absence**: Hostaway documents fixed per-endpoint windows and
  states its `X-RateLimit-*` headers "appear on 429 responses only", so there is nothing to
  read until the limit is already hit.
- **`auth:client-credentials`** — derived automatically from the Auth method's `test` hook,
  which re-runs the token exchange.

## Findings worth knowing

- **The envelope, not the status code.** Every endpoint answers
  `{status, result, limit, offset, count, page, totalPages}`; `status: "fail"` is the failure
  signal. The docs put the error text in `result`, but their own Update-a-listing error
  example *and* the live 403 body use `message` — so both carriers are read.
- **The finance report is multipart, not urlencoded, despite the docs just saying "form
  data".** The curl example uses `--form` (curl's multipart flag), and the PHP example passes
  `CURLOPT_POSTFIELDS` as an array, which php-curl always multipart-encodes — sending
  `application/x-www-form-urlencoded` there would not match what the server expects.
- **`expires_in` contradicts the prose.** The docs say the token lasts "24 months" and then
  show `expires_in: 15897600` (≈184 days). The response wins.
- **The calendar has two write shapes.** `PUT /v1/listings/{listingId}/calendar` updates one
  interval ("A calendar day object should be provided in the request body. Additionally
  starDate and endDate parameters should be specified to define dates interval to update"),
  while the docs' own "Batch calendar update" section documents a *different* path,
  `PUT /v1/listings/{listingId}/calendarIntervals`, taking an **array** of interval objects.
  Only the former is built here (it is the endpoint this app's action list names); the fields
  it sends are exactly the ones the array elements use.
- **The `X-RateLimit-*` headers are reactive.** They appear on 429 only, and
  `X-RateLimit-Retry-After` is a Unix timestamp to retry *at*, not a delay — an easy way to
  accidentally retry immediately.
- **`GET /v1/conversations` has no `listingMapId` filter.** The docs list `reservationId`
  only; to reach a listing's conversations, filter this endpoint by the reservation ids.
- **Creating a listing is a different credential surface in practice.** This app does not
  build it, but note that `channelId` on `POST /v1/reservations` only accepts 2000/2002/2020,
  where `2001`/`2007` appear in older examples.

## Not yet covered (deliberately)

Left out of this pass, all of them real and documented endpoints:

- **Listing creation / deletion** (`POST /v1/listings`, `DELETE /v1/listings/{id}`), listing
  **images** (`POST /v1/listings/{id}/images`), **fee settings**, **agreements**, **price
  settings** and the Airbnb export endpoint.
- **Webhooks** (create/list/update/delete and the reservation & conversation-message webhook
  logs). The docs' own "Recommendations around polling" section is the reason a workflow might
  want them; they are simply out of scope here.
- **Stripe / payment-card endpoints** (`/v1/paymentCards/*`), payment-method validation on
  create, and the finance sub-surfaces beyond the standard report (`financeField`,
  `financeStandardField`, `financeCalculatedField`, `financeCustomFormula`, and the
  consolidated/calculated reports).
- **Message templates** (`/v1/messageTemplates`) and the single-message GET.
- **Reservation sub-resources**: `GET /v1/reservations/{id}/logs`, rental agreement,
  `/v1/reservations/{id}/conversations`, coupons, `DELETE /v1/reservations/{id}`, and the
  other status transitions (`noShow`, `cancelledDueToInvalidCreditCard`).
- **Cancellation policies** (`/v1/cancellationPolicies/*`), `listingUnits`, `bedTypes` and
  `GET /v1/users` as an action (it is used only as the health probe).
- **Cursor paging** (`afterId`). The docs mention it as a better-performing alternative to
  `offset` on `GET /v1/reservations`; this app uses the `limit`/`offset` form every example in
  the docs is written with, and surfaces `count`/`page`/`totalPages` from the envelope so a
  caller can page correctly either way.
- **`attachObjects[]`** on the listing endpoints, and the `specialStatus[]` /
  `availabilityDateStart` / `availabilityDateEnd` filters on `GET /v1/listings` — documented,
  but the docs never enumerate the full set of attachable objects or special statuses, so
  exposing a free-text parameter for them would have been guessing.
- **`DELETE /v1/accessTokens`** (token revocation): the action list does not include a revoke
  action.
