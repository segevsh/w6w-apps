# Baremetrics

Read SaaS subscription metrics (MRR, ARR, churn, LTV, trials) and manage the customers, plans,
subscriptions and charges held in Baremetrics' API source, over the **Baremetrics API v1**.

- **Categories** — analytics, finance
- **Auth methods** — api-key (`Authorization: Bearer <key>`)
- **Actions** — 30
- **Health checks** — `quota` (hourly request headroom), `service` (declared unavailable) + the
  derived `auth:api-key`
- **Egress allowlist** — `api.baremetrics.com`
- **API docs** — https://developers.baremetrics.com/reference
- **Icon** — the vendor's own mark, https://baremetrics.com/hubfs/baremetrics-mark.png (256x256 PNG,
  embedded as a base64 data URI in an SVG wrapper)

Everything here was verified on 2026-10-06 against the per-page OpenAPI definitions on
developers.baremetrics.com and live probes of `api.baremetrics.com`. The reference marks no endpoint
deprecated (`"deprecated": true` appears nowhere in the 74 pages fetched).

## Things most likely to go wrong

1. **Almost everything is scoped by `source_id`.** Paths are `GET /v1/{source_id}/customers`, not
   `/v1/customers`. Call **List Sources** first. Metrics (`/v1/metrics…`), goals and annotations are
   account-wide and take no source.
2. **You can read any source but only modify the API source.** Payment-provider sources (Stripe,
   Recurly, Braintree) are read-only; create/update/delete only works on data added through the API.
3. **Two time formats.** Metric endpoints take `start_date`/`end_date` as `YYYY-MM-DD`; charge, refund
   and customer timestamps are unix seconds. Money is in cents.
4. **Pagination is page-based**, default 30 per page, max 200 (`per_page`, `page`); the response's
   `meta.pagination` carries `has_more`. The vendor's examples show `page` starting at 0.
5. **Rate limit is 3,600 requests/hour**, reported in `X-RateLimit-Limit`/`-Remaining`.

## Actions

| Area          | Actions                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Account       | `sources-list`, `account-get`                                                                    |
| Customers     | `customer-list`, `customer-get`, `customer-create`, `customer-update`, `customer-delete`, `customer-events-list` |
| Plans         | `plan-list`, `plan-get`, `plan-create`, `plan-update`, `plan-delete`                             |
| Subscriptions | `subscription-list`, `subscription-get`, `subscription-create`, `subscription-update`, `subscription-cancel`, `subscription-delete` |
| Charges       | `charge-list`, `charge-get`, `charge-create`, `charge-delete`, `refund-list`                      |
| Metrics       | `metrics-summary`, `metric-get`, `metric-customers`, `metric-plans`                              |
| Goals / notes | `goals-list`, `annotations-list`                                                                 |

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /v1/account`. That response is the
  company, currency and creation time; it does not echo the key. Validity is read from the body
  (`{"error":"Unauthorized. API Key not found (001)"}`), and a 200 without an `account` object is not a
  pass.
- **quota** — reads the `X-RateLimit-*` headers off a signed `GET /v1/account`; missing headers are
  `unknown`, never `ok`.
- **service** — declared unavailable (informational). `status.baremetrics.com` redirects to
  `baremetrics.statuspage.io`, whose summary.json answers `401 "Your page is inactive"`.

## Not covered

Left out, not guessed: refund/charge-free areas that are write-only or low value — `create-refund` /
`delete-refund` / `show-refund`, events (`/{source_id}/events`) and Cancellation Insights
(reasons, events), segments, attributes and attribute fields, goals/annotations writes, users,
cohorts (`/v1/metrics/cohorts`, whose parameters the reference does not document), and OAuth (the app
takes an API key). The sandbox host `api-sandbox.baremetrics.com` is not on the allowlist.
