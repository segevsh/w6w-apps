# MoonClerk

Read payment forms, customers and payments in **MoonClerk**, the Stripe-backed payment-form
builder, over its **read-only v1 API**.

- **Categories** — commerce
- **Auth methods** — api-key (`Authorization: Token token=<key>`)
- **Actions** — 6 (all `read`/`search`)
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  `GET /forms?count=1`, the plain-text `Access denied` 401 passes), `quota` (declared unavailable,
  informational) + the derived `auth:api-key`
- **Egress allowlist** — `api.moonclerk.com`
- **API docs** — https://github.com/moonclerk/developer/blob/master/api/README.md
- **Icon** — the vendor's own 256x256 PNG from `https://www.moonclerk.com/icons/icon-256x256.png`
  (the homepage's linked app icon), saved byte-for-byte; the vendor serves no SVG mark.

Verified on 2026-10-06 against `api/README.md` and `api/v1/{forms,customers,payments}.md` in
`github.com/moonclerk/developer`, and live unauthenticated probes of `api.moonclerk.com`. The
reference contains no deprecation, sunset or end-of-life wording.

## Connecting

Copy the API key from https://app.moonclerk.com/settings/api-key into the one field. It reads the
whole account, so keep it private. The app sends `Authorization: Token token=<key>` and the
versioned `Accept: application/vnd.moonclerk+json;version=1` on every call.

## Actions

| Action | Endpoint |
| --- | --- |
| `form-list` | `GET /forms` |
| `form-get` | `GET /forms/:id` |
| `customer-list` | `GET /customers` (filters: form, checkout dates, next-payment dates, status) |
| `customer-get` | `GET /customers/:id` |
| `payment-list` | `GET /payments` (filters: form, customer, charge dates, status) |
| `payment-get` | `GET /payments/:id` |

List calls take `count` (1-100, default 10) and `offset`; when a full page comes back the result
carries `nextOffset` to pass to the next call (MoonClerk returns no total).

## Decisions and gaps

- **Read only.** MoonClerk's API is documented "READ ONLY", so there are no create, update, cancel
  or refund actions, and none can be added without a vendor API change. Webhooks and the
  integration methods (`custom_id`) are configured in the MoonClerk dashboard, not the API.
- **"Customers" are "Plans".** The `/customers` endpoint returns what the MoonClerk dashboard calls
  plans (customer + subscription + plan).
- **Payment status filter.** The reference's own example `status=active` for payments is not one of
  its documented options; the action exposes only `successful`, `refunded` and `failed`.
- **Bad key is plain text.** HTTP 401 `text/plain` `HTTP Token: Access denied.` for a missing and a
  bogus key alike (measured with and without the versioned `Accept`); there is no JSON error code,
  so the credential check reads the body text and reports any other failure as itself.
- **No status feed.** `status.moonclerk.com` is a real Next.js page ("MoonClerk Status") but
  `/summary.json`, `/api/v2/summary.json`, `/history.rss`, `/history.atom` and `/feed.rss` all
  return its HTML 404; `moonclerk.statuspage.io` is Atlassian's marketing page. Declared absent.
- **No quota signal.** Throttling (HTTP 429) is documented with no limit, header or usage endpoint.
- **Not live-tested.** No vendor credentials were available; response shapes follow the reference
  and the tests mock `ctx.fetch`.
