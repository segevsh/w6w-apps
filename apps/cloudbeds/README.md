# Cloudbeds

Search and create reservations, check room-type availability and rate plans, and read or update
guest and property records, on the **Cloudbeds PMS API v1.3**.

- **Categories** — crm, commerce, calendar
- **Auth methods** — oauth2 (authorization_code, technology-partner flow)
- **Actions** — 13
- **Health checks** — `service` (component-scoped) + `quota` (declared absence, `informational`) +
  the derived `auth:oauth2`
- **Egress allowlist** — `api.cloudbeds.com` (the `service` check adds `status.cloudbeds.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.cloudbeds.com
- **API docs** — https://developers.cloudbeds.com/reference/about-pms-api
- **Status page** — https://status.cloudbeds.com

> **Everything below was verified against Cloudbeds' own sources on 2026-09-22** — the OpenAPI 3.0.1
> document embedded in every `developers.cloudbeds.com/reference/<slug>.md` page, the vendor's own
> guide pages (`docs/alternative-oauth-20-authentication-method`, `docs/common-api-errors-in-progress`,
> `reference/tech-specs`), and live probes against `api.cloudbeds.com` and `status.cloudbeds.com`.
> Nothing here came from a third-party integration directory, and nothing was inferred from a sibling
> app's shape.

## The three things most likely to go wrong

### 1. HTTP 200 is not success

Cloudbeds documents, in "Common API errors & How to handle", that some failures answer
**`200 {"success": false, "message": "…"}`** instead of a 4xx:

```json
{ "success": false, "message": "User who approved this connection is not active anymore" }
```

with siblings for a property whose status is no longer active and for a requested property the
token does not cover. `res.ok` alone would treat every one of these as success.
[`lib/client.ts`](lib/client.ts)'s `CloudbedsClient.request` parses every 2xx body and throws when it
sees a literal `success === false`, with the vendor's own `message` in the error — the check is
`=== false` rather than falsy, because `GetMetadataResponse.success` is typed as a **string** in the
vendor's own schema and a truthiness test would misfire on it. This applies to the auth probe too: a
200 with `success: false` from `/userinfo` is a failed probe, not a live one.

### 2. The base URL and the OAuth endpoints are not the obvious guess

The real API base is `https://api.cloudbeds.com/api/v1.3/{method}` — the `/api/v1.3/` segment is
easy to drop and the guessed `…/{method}` answers a **404 HTML marketing page**, not a JSON refusal,
so the mistake is quiet. The real OAuth authorize/token endpoints, read from the vendor's own worked
example (`GET https://api.cloudbeds.com/api/v1.3/oauth?client_id=…&redirect_uri=…&state=…`) and the
`access_token` operation, are:

| | URL |
|---|---|
| Authorization | `https://api.cloudbeds.com/api/v1.3/oauth` |
| Token | `https://api.cloudbeds.com/api/v1.3/access_token` |

No `scope`/`response_type` query parameter is sent — permission scopes are chosen once on the
partner's "App Details" page in the developer portal, not per authorization request. See
[`auth/oauth2.ts`](auth/oauth2.ts) for the full citation.

### 3. A usable reservation is not a schema-valid one

`POST /postReservation` marks **no field required** in its own schema. That's not an oversight to
correct — it's the vendor's own answer — so [`actions/reservation-create.ts`](actions/reservation-create.ts)
declares nothing required either, and instead says in each param's hint what a usable reservation
actually needs: `propertyID`, `startDate`, `endDate`, `guestFirstName`, `guestLastName`, `rooms`,
`adults`. The same judgement applies to `putReservation`/`putGuest`: `reservationID`/`guestID` are
declared required here even though the vendor's schema marks nothing required, because without them
the request names no target.

## Auth

**OAuth 2.0, authorization_code** — the Cloudbeds technology-partner flow. Requires a Cloudbeds
developer app (`client_id`/`client_secret`/`redirect_uri`) registered on this w6w installation, with
permission scopes selected on the app's own "App Details" page (not passed per-request). `pkce:
false` — PKCE is documented nowhere on Cloudbeds' side. Signed requests carry
`Authorization: Bearer <accessToken>`.

- Access tokens last `expires_in` seconds (28800 / 8 hours per the vendor); refresh tokens have no
  fixed expiry but go stale after 365 days without a successful use.
- Cloudbeds also documents API keys as "the preferred authentication method" for a property-level
  integration, but this app ships the partner OAuth flow the marketplace registration produces — the
  two share a host and header shape, so an `api-key` method could sit beside this one later without
  touching `lib/client.ts`.

### The probe is `GET /userinfo`

Almost every other Cloudbeds read returns guest, reservation or property data. `/userinfo` returns
`{user_id, first_name, last_name, email, acl?, roles?}` and **no credential material of any kind** —
there is no token, key or secret anywhere in its schema — so it is safe to run as a health probe and
safe to read a display label from. Classification is from the **body**, never the status alone: both
live 401s observed carry the same status and a different `hint` —

| Cause | `hint` |
|---|---|
| No `Authorization` header reached the request | `Missing "Authorization" header` |
| A bad/expired token | `Access token is invalid` |

and a `200` carrying `success: false` is a failed probe, exactly as for any other Cloudbeds call.

## Actions

| Action | Method + path | Notes |
|---|---|---|
| `hotel-list` | `GET /getHotels` | The properties this credential can see |
| `hotel-get` | `GET /getHotelDetails` | One property's full detail |
| `dashboard-get` | `GET /getDashboard` | Basic current-state summary for a property |
| `room-type-list` | `GET /getRoomTypes` | Room type inventory; rates only when a date window is given |
| `room-type-availability-list` | `GET /getAvailableRoomTypes` | The only action with vendor-required params: `startDate`, `endDate`, `rooms`, `adults`, `children` |
| `rate-plan-list` | `GET /getRatePlans` | Sellable rate plans for a date window |
| `reservation-list` | `GET /getReservations` | Search by status, date window, room, guest or source |
| `reservation-get` | `GET /getReservation` | One reservation by ID |
| `reservation-create` | `POST /postReservation` | See "A usable reservation is not a schema-valid one" above |
| `reservation-update` | `PUT /putReservation` | Status, rooms, arrival time, custom fields |
| `guest-list` | `GET /getGuestList` | Search by name, contact, stay window or reservation status |
| `guest-get` | `GET /getGuest` | One guest, by guest ID or reservation ID |
| `guest-update` | `PUT /putGuest` | Contact, address, document, company details |

### Idempotency

No write operation in this API accepts an idempotency key, so all three write actions
(`reservation-create`, `reservation-update`, `guest-update`) declare `idempotent: false`. A retried
`reservation-create` after a dropped connection can double-book a room; a workflow that must not
double-book has to reconcile with `reservation-list` (by `sourceReservationId`) before retrying.

## Health checks

### `service` — component-scoped, not page-scoped

`status.cloudbeds.com` is real (confirmed 2026-09-22: distinct 200/404 responses, JSON body,
self-identifying `page.name: "Cloudbeds"`) and is **not** Statuspage- or Instatus-shaped — no
`status.indicator`, no `group`/`group_id`, components carry `isParent`/`children` instead. It lists
ten components (Property Management System, Booking Engine, Insights & Reporting, Channel
Distribution, Guest Experience, Digital Marketing Suite, Payments, Websites, API, Cloudbeds
University). This app only calls the PMS API, so the verdict comes from **one** component —
"Property Management System" (`clbp4hte222218iemzfsaycg8v`) — not the page-level roll-up: on
2026-09-22 the Digital Marketing Suite carried an open Tripadvisor-connectivity incident that
dragged the page status down while the PMS component itself read `OPERATIONAL`. Rolling the page up
into the verdict would have reported this app's API down for an unrelated reason. The other nine
components are still reported in `components` detail. Severity is left at the `degraded` default —
not `informational` — since Cloudbeds is SaaS-only and the check already reads a single component
scoped to this app's own surface, so an incident there is real evidence.

### `quota` — a declared absence, at `informational` severity

Documented: 10 requests/second on every endpoint (`reference/tech-specs`). Not published: any way to
read the remaining allowance. Live 401 responses from `/getHotels` and `/userinfo` on 2026-09-22
carried no `X-RateLimit-*`/`RateLimit-*` header of any kind, and there is no quota/usage endpoint in
the reference navigation. `severity: "informational"` is load-bearing — an `unavailable` entry always
reports `unknown`, which outranks `ok` in the roll-up, so any other severity would pin the app's
health at `unknown` forever.

## Not yet covered

Cloudbeds' PMS API has roughly 253 documented operations; this app covers the reservation/guest/
inventory core. Everything below exists in the vendor's reference nav and was deliberately left out
of this first pass:

- **Allotment/group blocks** — `createAllotmentBlock`, `getAllotmentBlocks`, `updateAllotmentBlock`,
  `deleteAllotmentBlock`, block notes, `getGroups`/`putGroup`.
- **Payments, items and adjustments** — `postPayment`, `postVoidPayment`, `postCharge`,
  `postCreditCard`, `postCustomPaymentMethod`, `getPaymentMethods`, `getItems`/`postItem`/
  `postCustomItem`/`postVoidItem`, `postAdjustment`/`deleteAdjustment`.
- **Housekeeping** — `getHousekeepingStatus`, `postHousekeepingStatus`, `postHousekeepingAssignment`.
- **Webhooks subscription management** — `postWebhook`, `deleteWebhook` (this app calls no webhook
  endpoints; a workflow trigger is a separate concern from these CRUD calls).
- **Room blocks** — `postRoomBlock`, `getRoomBlocks`, `putRoomBlock`, plus room-level
  assign/check-in/check-out (`postRoomAssign`, `postRoomCheckIn`, `postRoomCheckOut`).
- **Accounting / fiscal documents** — the whole `fiscal-document/v1` surface (invoices, credit
  notes, rectify invoices, certificates, series rules).
- **Insights / Datasets API** — `getDatasets`, stock/custom reports, report formats.
- **Channel-manager callbacks** — `ARIUpdate`, `GetBookingList`, `CheckAvailability`, `GetARI` (these
  run against a different host, `api.myallocator.com`, and are OTA-facing rather than PMS-facing).
- **Property/app configuration** — email templates/schedules, custom fields, app property settings,
  app state, currency settings, payment capabilities, sources, packages, files, government receipts.

A future app or a later pass through this one can pick any of these up without touching the shape
established here.

## Icon

`assets/icon.svg` wraps the vendor's real favicon
(`https://developers.cloudbeds.com/favicon.ico`, confirmed 200, `image/png`, 192×192, 3,804 bytes) as
a `data:image/png;base64,…` `<image>` inside an SVG, the same wrapper shape as
[`apps/apollo/assets/icon.svg`](../apollo/assets/icon.svg). The apex `www.cloudbeds.com`
apple-touch-icon was checked and rejected — it is a 0-byte fake.

## Development

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api sh -c \
  'cd /app/apps/cloudbeds && deno task validate && deno task check && deno task lint && deno task test'
```
