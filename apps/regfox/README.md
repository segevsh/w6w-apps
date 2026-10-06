# RegFox

Event registration on the Webconnex platform, driven through the Webconnex public API v2
(`https://api.webconnex.com/v2/public`). The same API and key also reach TicketSpice, RedPodium and
GivingFuel; every search takes a `product` (default `regfox.com`).

Every path, parameter and body field was read from `https://docs.webconnex.io/api/v2/` (one page,
~145 URLs) on 2026-10-06, and the unauthenticated behaviour of the API was measured live the same day.
No account key was available, so **no authenticated response was observed**: response field names
come from the reference's examples.

## Auth

One method, **API Key**, sent as the `apiKey` request header (Account Settings > Integrations). The
credential is stamped by `sign` only; no action touches it.

The connection check is `GET /forms?limit=1`, not `/ping`. `/ping` is the vendor's healthcheck and it
is public: it answers 200 with no key and with a wrong one. The verdict is read from the body.

## Things that differ from what you would guess

- **A wrong key is HTTP 404** (`{"error":{"code":4404,"description":"invalid apiKey"}}`), the same
  status as an unknown route; a missing key is 401 (code 4401). The reference documents neither.
- **Errors say `description`**, the reference says `message`. Both are read.
- **`/coupons/forms/{formId}` is plural.** The reference's endpoint table lists `/coupons/form/{id}`
  (404 route-not-found, measured); its detail section and examples use the plural, which routes.
- **Paging is cursor-based**: `limit` (1-50), `startingAfter`, and the envelope's `hasMore`. Search
  actions return `items`, `totalResults` (the match count, not the page size), `hasMore` and the
  `startingAfter` cursor to pass back in.
- **`product` is required on every search and view** except form list, which treats it as optional.
- **Webhook reads strip `signingSecret` and the legacy `token`.** Only Create Webhook returns the
  signing secret, once, because the receiver needs it for `X-Webconnex-Signature`.
- Dates accept `2006-01-02`, `01-02-2006`, `2006-01-02 15:04` and `2006-01-02T15:04:05Z`.
- Rate limit: 10,000 requests/day (reset 00:00 UTC) and 900 per 15 minutes by default, reported in
  `X-Daily-*` / `X-Burst-*` headers. A weekly maintenance window runs Tuesdays 09:00-10:00 UTC.

## Actions (31)

| Key | Request |
| --- | --- |
| `coupon-create` | `POST /coupons` |
| `coupon-delete` | `DELETE /coupons/{id}` |
| `coupon-get` | `GET /coupons/{id}` |
| `coupon-list-form` | `GET /coupons/forms/{formId}` |
| `coupon-list-global` | `GET /coupons/global` |
| `customer-get` | `GET /search/customers/{id}?product=` |
| `customer-search` | `GET /search/customers` |
| `form-get` | `GET /forms/{id}` |
| `form-inventory-get` | `GET /forms/{formID}/inventory` |
| `form-list` | `GET /forms` |
| `membership-get` | `GET /search/memberships/{id}?product=` |
| `membership-search` | `GET /search/memberships` |
| `order-get` | `GET /search/orders/{id}?product=` |
| `order-search` | `GET /search/orders` |
| `registrant-check-in` | `POST /registrant/check-in` |
| `registrant-check-out` | `POST /registrant/check-out` |
| `registrant-get` | `GET /search/registrants/{id}?product=` |
| `registrant-search` | `GET /search/registrants` |
| `subscription-get` | `GET /search/subscriptions/{id}?product=` |
| `subscription-search` | `GET /search/subscriptions` |
| `ticket-get` | `GET /search/tickets/{id}?product=` |
| `ticket-search` | `GET /search/tickets` |
| `transaction-get` | `GET /search/transactions/{id}?product=` |
| `transaction-search` | `GET /search/transactions` |
| `webhook-create` | `POST /webhooks` |
| `webhook-delete` | `DELETE /webhooks/{id}` |
| `webhook-get` | `GET /webhooks/{id}` |
| `webhook-list` | `GET /webhooks` |
| `webhook-log-get` | `GET /webhooks/{webhookid}/logs/{webhookLogid}` |
| `webhook-log-list` | `GET /webhooks/{id}/logs` |
| `webhook-resend` | `POST /webhooks/{webhookid}/resend/{logId}` |

## Not covered

- **Update Coupon / Update Webhook** (`PUT`): the reference describes a full-object replace and does
  not say which fields are optional; sending a partial body could blank the rest, so they are left out.
- **Webhook status**: Create Webhook always sends `status: 1` (the value in the reference's
  examples). The appendix names `enabled`/`disabled` but never says what disabled is on the wire.
- The webhook `events` list: the reference shows event names in examples but publishes no
  complete list, so Events is free text.
- Webhook *receiving* (triggers) is not implemented; the payloads are documented but need a trigger
  definition and signature verification.

## Health

- `service`: declared unavailable, `informational`. No status page was found for Webconnex or RegFox.
- `api`: unsigned `GET /ping`, passes on the documented `{responseCode:200,data}` envelope. It does not
  test the key (the derived `auth:*` check does).
- `quota`: signed `GET /forms?limit=1`, daily and burst headroom from `X-Daily-*` / `X-Burst-*`,
  `informational`. It spends one request of the daily allowance per run (minimum interval 15 minutes).

## Icon

`assets/icon.svg` wraps, unmodified, the 180x180 PNG
`https://cdn.prod.website-files.com/69b9489b2b9aba45e8c8f9a4/6a3e0c3ce880db90f5ccf7ff_f.png`
(12,117 bytes), the `apple-touch-icon` that `https://regfox.com/` itself links (fetched 2026-10-06),
as a base64 `<image>` in an SVG, the same way the Apollo app embeds its raster mark. `regfox.com/favicon.svg` is a 404.

## Layout

```
regfox/
├── index.ts
├── auth/api-key.ts
├── lib/            # client (envelope, errors, webhook redaction), params, search/get factories
├── actions/        # one file per action (31); search and view actions are declared via lib/factory.ts
├── health/         # service, api, quota
├── assets/icon.svg
└── tests/
```

## Development

From this directory, inside the `api` container: `deno task validate`, `check`, `lint`, `fmt`
(never bare `deno fmt`), `test`.
