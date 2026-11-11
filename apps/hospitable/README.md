# Hospitable

- **Triggers** — 9 (poll)

## Triggers

| Key — title | Mechanism | Wrapped action | What the run gets |
|---|---|---|---|
| `new-reservation` — New Reservation | poll | `reservation-list` | Each newly booked reservation |
| `new-property` — New Property | Poll | `property-list` | each property newly added to the account (whole list compared, 100 per page) |
| `new-payout` — New Payout | Poll | `payout-list` | each Airbnb payout that newly appears (whole list compared) |
| `new-teammate` — New Teammate | Poll | `teammate-list` | each teammate newly added (whole list compared) |
| `new-property-image` — New Property Image | Poll | `property-images-list` | each image newly added to the chosen property |
| `new-property-review` — New Property Review | Poll | `property-reviews-list` | each review newly posted for the chosen property |
| `new-reservation-message` — New Reservation Message | Poll | `reservation-messages-list` | each message newly added to the chosen reservation's conversation |
| `new-task` — New Task | Poll | `task-list` | each operations task newly created for the chosen properties |
| `new-or-updated-inquiry` — New or Updated Inquiry | Poll | `inquiry-list` | each pre-booking inquiry that is new or has a new message (`last_message_at` filter, id includes the stamp) |

Not covered: `channel-list` (reference data: the connected booking channels), `property-search` (an availability query that needs stay dates and guest counts, not a record feed), `transaction-list` (every payment line across all reservations: page/per_page only, no sort or date filter, so it exceeds the 5000-row snapshot cap).

Per-parent triggers take the parent id as a required parameter. Every new trigger's first check records what exists without firing. Source: https://developer.hospitable.com/ (Public API v2: properties, payouts, teammates, tasks, inquiries, reviews, messages), verified 2026-11-10.

Hospitable documents reservations at https://developer.hospitable.com/ (verified 2026-11-09).

Manage a short-term-rental business on [Hospitable](https://hospitable.com) from a w6w
workflow: properties and their calendars, reservations, guest messages, reviews, tasks and
payouts, through the Public API v2 (`https://public.api.hospitable.com/v2`).

**Categories:** calendar, communication, commerce.

## Authentication

One method, **Personal Access Token** (`Authorization: Bearer <token>`). Generate it in Hospitable
under *Apps > API access*.

- A PAT is documented as being for **your own integration**. Building a product for other
  Hospitable customers needs OAuth, which is vendor-approved (partner portal) and is not shipped
  here.
- The token's scopes decide which actions work (`pat:read` / `pat:write`). An `include` the token
  may not read is silently left out of the response with a 200, not refused.
- A PAT can carry an IP allowlist (set on the API access page); calls from other addresses fail.
- The connection test calls `GET /v2/user`. It echoes no token, and the verdict is read from the
  body (`{"data": {...}}`), because a missing and an invalid token both answer
  `401 {"message":"Unauthenticated."}`.

## Actions (28)

| Group | Actions |
| --- | --- |
| Account | `user-get`, `channel-list` |
| Properties | `property-list`, `property-get`, `property-search`, `property-images-list`, `property-reviews-list` |
| Calendar | `property-calendar-get`, `property-calendar-update` |
| Reservations | `reservation-list`, `reservation-get`, `reservation-create`, `reservation-update`, `reservation-cancel` |
| Messaging | `reservation-messages-list`, `reservation-message-send`, `inquiry-list`, `inquiry-get`, `inquiry-message-send`, `review-respond` |
| Tasks | `task-list`, `task-get`, `task-create`, `task-update`, `task-delete`, `teammate-list` |
| Finance | `transaction-list`, `payout-list` |

Money is in the vendor's minor units (cents). List actions take `page` / `per_page`; the response
keeps the vendor's `{data, links, meta}` envelope.

## Health checks

- `service` — the `Public API` component on the real Better Stack page
  `status.hospitable.com/index.json` (matched by resource id 8821069, name as fallback). Other
  components are shown but never move the verdict; an unrecognisable page is `unknown`.
- `api` — unauthenticated `GET /v2/user`; a JSON `401 {"message": ...}` is a pass, an HTML or
  non-Hospitable body is not.
- `quota` — declared unavailable (`informational`): rate limits are documented only as prose, with
  no header and no usage endpoint.

## Icon

`assets/icon.svg` embeds Hospitable's own apple-touch icon (PNG) unchanged inside an SVG wrapper.

## Behaviours worth knowing

- `reservation-list` with no date, `booked_at`, conversation or code filter returns only check-ins
  in the next two weeks. `property_ids` is required on reservations, inquiries and tasks.
- `reservation-update` is partial-only on Direct/OTA bookings. A manual booking edited in the
  Hospitable UI answers a vendor token with 409. A booking created through a PAT ignores minimum
  stay.
- Message sends are rate-limited (2/min per reservation, 50 per 5 minutes).
- Airbnb channels authorised before 2024-01-12 must reconnect before payouts and transactions
  return data.

## Not covered

Webhook subscription management, OAuth, coupons/quotes, listings write-back and the V1 API (end of
life since 2025-02-03).
