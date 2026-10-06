# Lodgify

Manage Lodgify vacation-rental data from a workflow: properties and room types, availability,
rates, bookings, enquiries, quotes and payment links, guest message threads and webhooks.

Built from the Lodgify Public API reference at <https://docs.lodgify.com/reference>. Every
endpoint page embeds its OpenAPI 3.0.3 document (append `.md` to a page URL to read it; a bare
`curl` gets 403 without a browser User-Agent). Paths, parameters and fields were checked against
those documents on 2026-10-05, plus live probes of `api.lodgify.com`.

- App id `io.w6w.lodgify`, categories `crm`, `calendar`
- Host: `api.lodgify.com` (v1 and v2 both live there; v2 is used wherever it covers the operation)
- Auth: a Lodgify API key in the `X-ApiKey` header (Lodgify > Settings > Public API)
- Icon: the vendor's apple-touch-icon PNG, embedded unmodified as base64 in `assets/icon.svg`

## Actions (30)

| Area | Actions |
| --- | --- |
| Properties | `list-properties`, `get-property`, `list-rooms`, `list-deleted-properties` |
| Availability | `get-availability` (all / one property / one room type), `update-availability` |
| Rates | `get-rates-calendar`, `get-rate-settings`, `update-rates` |
| Bookings | `list-bookings`, `get-booking`, `create-booking`, `update-booking`, `delete-booking` (to trash), `change-booking-status` (book / tentative / decline / reopen / recover), `check-in-booking`, `check-out-booking`, `update-booking-key-codes` |
| Enquiries | `get-enquiry`, `create-enquiry` |
| Quotes | `get-quote` (price a stay), `get-booking-quote`, `create-booking-quote`, `get-payment-link`, `create-payment-link` |
| Messages | `get-message-thread`, `send-message` (to a booking or an enquiry) |
| Webhooks | `list-webhooks`, `subscribe-webhook`, `unsubscribe-webhook` |

List endpoints that answer a bare array come back as `{ items: [...] }`; v1 creates that answer a
bare integer come back as `{ id }`; calls with no response body return `{ ok: true }`.
`subscribe-webhook` returns the signing `secret`, which Lodgify only ever shows at creation.

## Deprecation

The reference deprecates individual **fields**, not the API. The deprecated ones are left out of
every request this app builds, and the replacement is used instead:

| Deprecated | Used instead |
| --- | --- |
| room `people` | `guest_breakdown.adults` (and children / infants / pets) |
| guest `name` | `guest_name.first_name` / `last_name` |
| guest `phone` (on reads) | `phone_numbers` |
| quote `expiration_hours` | `guest_expiration_hours` / `owner_expiration_hours` |
| booking-level `people` (v1 reads) | `total_guest_breakdown` |

Responses are returned as the vendor sends them, so the deprecated fields still appear in reads.

## Health

`service` is declared unavailable, `api` and `reachability` are live probes, `quota` is declared
unavailable, plus 1 derived `auth:api-key` check.

- **Status page: none usable.** `status.lodgify.com` answers 403 with a Cloudflare "Just a
  moment..." challenge to any non-browser client (including `/api/v2/summary.json` and
  `/index.json`), so nothing can be fetched host-side. `lodgify.statuspage.io` is the unclaimed
  Statuspage decoy that redirects to atlassian.com's marketing page.
- **`api`** (signed) is `GET /v2/properties?size=1`, judged by a `{items: []}` body.
- **`reachability`** (unsigned, informational) is the public `GET /v1/countries` list.
- **Credential probe** is `GET /v2/properties?size=1`. `GET /v1/countries` and `/v1/currencies`
  were measured answering **200 with no key at all**, so they cannot prove a credential. A
  missing or wrong key answered **403 with an empty body** live (the docs describe a 401 with
  `{message, code: 999, ...}`), so for a rejection the status is the only signal; success is
  decided from the body. The probe response is a page of properties and carries no credential.
- **Quota:** Lodgify documents 600 requests/minute (v1) and 750 (v2) with a 429, but no header or
  usage endpoint, and none was seen live.

## Not covered

Left out because the reference did not let them be built with confidence, or to keep the set
coherent:

- `POST /v1/reservation/callmeback`, `/v1/reservation/delete`, `/replied`, `/not_replied`,
  `/not_read` and the per-booking `replied` / `not_replied` / `request_payment` flags (inbox
  bookkeeping, not integration surface).
- Enquiry status transitions (`decline`, `recover`, `reopen`, `replied`, `not_replied`) and
  enquiry deletion; `GET /v1/reservation` (the v1 booking list, superseded by v2 `list-bookings`).
- v1 duplicates of v2 reads: `GET /v1/properties`, `/v1/properties/{id}`,
  `/v1/availability*`, `/v1/rates/calendar`, `/v1/quote/{propertyId}`, and the v1 booking read.
- `GET /v1/properties/{id}/rooms/{rid}`, `/rates/addons`, `/payments`, the booking
  `externalBookings` read, `GET /v1/countries/{code}`, `/v1/currencies*`, the booking `request_payment` PUT, `/v2/rates/...` beyond the calendar and
  settings, and the `/v1/channel/xml` OTA feed.
- Receiving webhooks: this app manages subscriptions only. Deliveries carry an `ms-signature`
  header, an HMAC-SHA256 of the body keyed by the secret returned at subscribe time.

## Notes

- `get-quote` sends the array parameters in the form the reference documents for this endpoint
  (`roomTypes[0].Id=...&roomTypes[0].guest_breakdown.adults=...&addOns[0].Id=...`), because the
  document says its generated samples are invalid for it.
- `update-booking`: Lodgify warns "not all fields can be updated via this endpoint"; only the
  fields you set are sent.
- Date inputs are passed through as written; `YYYY-MM-DD` is accepted for the date-time fields.
