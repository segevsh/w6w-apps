# FareHarbor

Booking software for tour and activity operators. This app reads FareHarbor's companies, items
(bookable products), availability and bookings, and can validate, create, cancel and check in
bookings, over the External API.

- App id: `io.w6w.fareharbor` · categories: `calendar`, `commerce`
- Host: `fareharbor.com` (the only entry in `network.allow`) · API prefix `/api/external/v1`
- Source of truth: FareHarbor's OpenAPI 3.1 document, the file the Redoc page at
  developer.fareharbor.com loads
  (`https://fareharbor.com/api/external/v1/FareHarbor-External-API.yaml/home`, 27 paths, fetched
  2026-10-06), plus unauthenticated live probes against `fareharbor.com` and
  `status.fareharbor.com` the same day. The Zapier help page named in the candidate list is not
  an API reference.
- Icon: the FareHarbor mark from simple-icons, byte-identical (`assets/icon.svg`);
  `assets/icon.dark.svg` is the same path re-inked white for the dark tile.

## Auth

One method, `api-keys` (type `custom`): two headers, `X-FareHarbor-API-App` and
`X-FareHarbor-API-User`, both set in `sign`. Keys are UUIDs, issued by FareHarbor after a
partnership request (strategicpartnerships@fareharbor.com) and API certification — there is no
self-serve signup. The **user key is per currency**, so use one connection per currency.

The spec also accepts `api-app` / `api-user` query parameters. This app never uses them: a URL
reaches logs, a header does not.

### The probe is `GET /companies/`

It lists the suppliers the keys may book (name, shortname, currency) and never echoes a key.
`GET /ping/` is not the probe: it answers 200 with an empty body and no keys at all. Verdicts
come from the body's `code`; the status is only a hint. Measured 2026-10-06:

| Request | Status | Body |
|---|---|---|
| no key headers | 400 | `{"error":"X-FareHarbor-API-App header or api-app parameter is required","status":400,"code":"key-missing"}` |
| bad app key | 403 | `{"error":"API app key is invalid","status":403,"code":"app-key-invalid"}` |
| bad user key | 403 | `user-key-invalid` (spec error table; not sampled live) |

A 403 is **also** what rate limiting can answer, so only the documented key codes are called a
bad credential.

## Actions (24)

| Resource | Actions |
|---|---|
| Company | List Companies, Get Company, List Company Users, List Roles, List Lodgings, List Check-in Statuses, List Agents, List Desks |
| Item | List Items, Get Item |
| Availability | List Availabilities by Date, List Availabilities by Date Range, Get Availability, List Availability Lodgings, List Crew Members |
| Booking (read) | List Bookings for Availability, List Bookings by Create Date, Get Booking, Validate Booking |
| Booking (write) | Create Booking, Cancel Booking, Update Booking Note, Check In Booking, Resend Confirmation Email |

Notes:

- **Flags are `yes`/`no`**, not `true`/`false`. Boolean params are written that way.
- **Validate reports refusal inside a 200** (`is_bookable: false`, `code`, `error`). Run it before
  Create Booking; FareHarbor requires it before instant confirmation.
- **Availability ranges time out** with a 504 after 60 seconds. FareHarbor recommends 7-day
  segments. Both availability actions use the documented *minimal* endpoints, which exclude
  custom-field detail.
- List Agents / List Desks need **affiliate** keys.
- Cancel Booking is governed by the company's cancellation policy (always allowed within 5
  minutes of creating the booking; no refund inside 48 hours of the start).
- Resend Confirmation Email searches **all** bookings by contact email and start date, not just the
  ones the keys can see, and never says whether anything matched. Limits: 5/minute per key pair, 1
  per 5 minutes per email.
- Dates are `YYYY-MM-DD` in the company's local time; a full date-time is trimmed to its date.
- Responses are returned as the vendor sends them (`{companies: [...]}`, `{booking: {...}}`, ...).

## Health

- `service` — [Statuspage](https://status.fareharbor.com/api/v2/summary.json), verified real
  (`page.name` FareHarbor, id `d45pv7z52qcf`; `fareharbor.statuspage.io` serves the same page).
  Declared `informational` because **no component is named API**: Booking, Calendar and Booking
  Webhook (ids pinned) decide the verdict, which is an inference; the other 38 components
  (payments, websites, support lines, OTA and accounting integrations) are reported but cannot
  make the app down.
- `api` — unsigned `GET /companies/`; the 400 `key-missing` JSON envelope counts as reachable.
- `quota` — declared unavailable, informational: limits (30 requests/second and 3,000 per 5
  minutes) are per IP, and no rate-limit header or usage endpoint exists.
- derived `auth:api-keys` from the `test` hook.

## Deliberately absent

- The **demo environment** (`demo.fareharbor.com`). The manifest allows one API host and sandbox
  keys differ from production keys, so this is production-only.
- QR-code check-in (`PUT /companies/{shortname}/checkin/`), crew-member create/update/delete,
  customer custom-field value updates, resource-use patches: unverified against a live account.
- Webhooks: FareHarbor pushes booking and item notifications to a URL it is configured with
  (support-assisted); that is inbound and not an action.

## Testing

`deno task test` — 102 tests: every action (request path, query, body, vendor-error surfacing, path
guards), the entry module, auth `sign`/`test`, the client, and the three health checks, all against
a mocked `HookContext`.
