# Hyros

Ad-attribution platform. This app pushes conversion events into Hyros (leads, orders, calls, clicks,
products, custom costs) and reads back leads, sales, calls, subscriptions, sources, ads, stages, tags
and the attribution reports Hyros computes.

- **API:** `https://api.hyros.com/v1/api/v1.0/...`
- **Auth:** API key from Hyros Settings > API, sent as the `API-Key` header.
- **Reference used:** Hyros' API Blueprint (v1.37) at `https://jsapi.apiary.io/apis/hyros.apib`
  (the `docs.hyros.com` site is a client-rendered shell that links to it).
- **Icon:** `assets/icon.svg` is Hyros' own logo, fetched verbatim from
  `https://go.hyros.com/assets/brand/hyros-logo-blue.svg`.

## Actions (19)

| Action | Verb and path | Notes |
| --- | --- | --- |
| `leads-list` | GET `/leads` | by id, email, join date; paged |
| `lead-create` | POST `/leads` | upsert by email; tags, stage, IPs, phones |
| `lead-update` | PUT `/leads` | found by email, id or phone |
| `sales-list` | GET `/sales` | recurring / refunded filters; paged |
| `sale-delete` | DELETE `/sales/{id}` | permanent |
| `order-create` | POST `/orders` | one sale per line item; set `orderId` to make retries safe |
| `order-refund` | DELETE `/orders/{id}` | optional `refundedAmount` |
| `calls-list` | GET `/calls` | qualification filters; paged |
| `call-create` | POST `/calls` | same `externalId` updates the call |
| `subscriptions-list` | GET `/subscriptions` | state filter; paged |
| `product-create` | POST `/products` | |
| `click-create` | POST `/clicks` | server-side click tracking |
| `custom-cost-create` | POST `/custom-costs` | up to 10 source tags |
| `sources-list` | GET `/sources` | paged |
| `ads-list` | GET `/ads` | paged |
| `stages-list` | GET `/stages` | paged |
| `tags-list` | GET `/tags` | not paged |
| `attribution-get` | GET `/attribution` | one level per request |
| `attribution-ad-account-get` | GET `/attribution/ad-account` | per ad account |

List-style inputs (`ids`, `emails`, `tags`, ...) are entered as comma-separated text.

## Things worth knowing

- **Failures can hide behind two shapes.** A missing key answers a bare `text/plain` 401
  `Unauthorized`; a wrong key answers JSON `{"result":"ERROR","message":["Api key not valid"]}`, and
  the reference documents that same message under 400 as well. The connection test therefore reads
  the message, not the status.
- **Reads and writes answer differently.** A write is `{request_id, result: "OK"}`; a read returns
  its data in `result` plus an opaque `nextPageId` cursor (`null` here on the last page).
- **Array filters are quoted.** The reference writes them as `"a","b"` and this app sends them that
  way (`emails="a@x.io","b@x.io"`); the attribution `ids`/`fields` and `subscriptionStates` are plain
  comma lists, as documented. Not verified against a live key.
- **Rate limit:** 30 requests per second and 1000 per minute; 429 on excess.
- **The attribution report is heavy.** Sending the same request again before the first finishes is
  refused with `Already processing a request for id: ...`.
- **Credential probe:** `GET /stages?pageSize=1`. `/user-info` is deliberately not used; it returns
  the account holder's profile, address and VAT number.

## Not covered

`leads/journey`, update-sale, update-call, delete-call, carts, keywords, `user-info`, domains and
the tracking-script endpoint. The reference's update-sale and update-call sections are ambiguous
about whether fields travel in the query or the body, so they were left out rather than guessed.

## Health

Hyros publishes no status page or feed (`status.hyros.com` does not resolve), so the service check
is declared `unavailable` with `informational` severity. Credential liveness is covered by the
auth test.
