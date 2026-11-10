# Baremetrics

Read SaaS subscription metrics (MRR, ARR, churn, LTV, trials) and manage the customers, plans,
subscriptions and charges held in Baremetrics' API source, over the **Baremetrics API v1**.

- **Categories** — analytics, finance
- **Auth methods** — api-key (`Authorization: Bearer <key>`)
- **Actions** — 30
- **Triggers** — 8 (poll)
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

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-customer` — New Customer | Poll | `customer-list` | Each newly created customer in the selected source |
| `new-subscription` — New Subscription | Poll | `subscription-list` | Each newly created subscription in the selected source |
| `new-charge` — New Charge | Poll | `charge-list` | Each charge created in the selected source |
| `new-refund` — New Refund | Poll | `refund-list` | Each refund created in the selected source |
| `new-plan` — New Plan | Poll | `plan-list` | Each newly created plan in the selected source |
| `new-goal` — New Goal | Poll | `goals-list` | Each newly created revenue goal |
| `new-source` — New Source | Poll | `sources-list` | Each newly connected source |
| `new-customer-event` — New Customer Event | Poll | `customer-events-list` | Each newly recorded event of the chosen customer (customer picked as a parameter) |

Customers and subscriptions are polled newest-first (`sort=created&order=desc`, `order=desc`; the subscription docs state "Defaults to desc … newest to oldest"); the first check records what exists without firing, later checks emit only unseen items. Charges and refunds use the documented `start` unix-timestamp filter (`start = last check − 120 s`), page through `per_page=200` pages and resume from the saved page when a window is longer than five pages; the first check stores a floor and later checks drop anything created before it. Plans, goals and sources are small collections read whole and diffed by id.

Customer events take the customer as a parameter and read the first five pages (1,000 events) of that customer's log, diffed by event id, because the [reference](https://developers.baremetrics.com/reference/list-customer-events) lists only `per_page`/`page` (no order or date filter); events beyond that window are not seen. Not covered: `annotations-list` (the docs list no sort or date filter, so there is no way to read only the newest entries). Sources: [customers](https://developers.baremetrics.com/reference/list-customers), [subscriptions](https://developers.baremetrics.com/reference/list-subscriptions), [charges](https://developers.baremetrics.com/reference/list-charges), [refunds](https://developers.baremetrics.com/reference/list-refunds), [plans](https://developers.baremetrics.com/reference/list-plans), [pagination](https://developers.baremetrics.com/reference/pagination) (verified 2026-11-10).
