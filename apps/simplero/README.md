# Simplero

Manage a [Simplero](https://simplero.com) account from a workflow: contacts, tags, email lists,
automations, courses, member sites, products and purchases, through **Simplero API v2**.

- API reference: <https://simplero.com/api/v2/docs/openapi.json> (OpenAPI 3.1.0, `info.version` "v2",
  682 paths). Every path, parameter, body field and enum in this app was read from that document on
  2026-10-06; the 401 and 404 behaviours below were probed on the wire the same day.
- The catalogue's GitHub link (`Simplero/Simplero-API`) documents the **deprecated v1** API. Nothing
  here comes from it.
- Host: `simplero.com`, paths under `/api/v2/`. One fixed host, so `network.allow` is the single
  literal `simplero.com`.

## Auth setup

1. In Simplero, open **Settings > Integrations** and copy your API key.
2. Create a w6w connection with the **API Key** method and paste it.

The key is sent as `X-API-Key: <key>` (the spec's only security scheme, `apiKeyHeader`; Simplero
also accepts HTTP Basic with the key as username and a blank password, which this app does not
use). It is stamped by the auth `sign` hook only; no action ever sees it.

**Connection test.** `GET /api/v2/lists?per_page=1`, passing only when the response body is
`{ "data": [...] }`. Simplero publishes no whoami endpoint in v2, and the probe was chosen because
its body is a page of lists, so it never echoes the key. A bad key is classified from the body
(`{"error":"Bad API key"}`), not from the status code, and a 200 that is not a data array (an HTML
page, say) is a failure.

**User-Agent.** The spec requires the app name and a contact in the `User-Agent` header. Every
request sends `w6w-simplero/0.1.0 (w6w integration platform)`. A real mailbox or URL is not
hardcoded because the pack audit reads any domain in source as an undeclared network host.

## Actions (35)

Simplero calls contacts `customers` in its paths; the action keys say `contact`.

| Action | Method and path | Notes |
|---|---|---|
| `contact-list` | `GET /customers` | filters: exact email, tag, status (customers/leads/clients), search |
| `contact-get` | `GET /customers/{id}` | |
| `contact-create` | `POST /customers` | email required; not idempotent |
| `contact-update` | `PATCH /customers/{id}` | sends only the fields set |
| `contact-tag-add` | `POST /customers/{id}/actions/add_tag` | |
| `contact-tag-remove` | `POST /customers/{id}/actions/remove_tag` | |
| `contact-list-subscribe` | `POST /customers/{id}/actions/list_subscribe` | skip welcome / auto-responses, double opt-in |
| `contact-list-unsubscribe` | `POST /customers/{id}/actions/list_unsubscribe` | |
| `contact-automation-start` | `POST /customers/{id}/actions/start_automation` | |
| `contact-automation-stop` | `POST /customers/{id}/actions/stop_automation` | |
| `contact-course-grant` | `POST /customers/{id}/actions/course_grant` | |
| `contact-course-revoke` | `POST /customers/{id}/actions/course_revoke` | |
| `contact-product-purchase` | `POST /customers/{id}/actions/product_purchase` | grants a product WITHOUT taking payment |
| `contact-product-cancel` | `POST /customers/{id}/actions/product_cancel` | |
| `contact-site-grant` | `POST /customers/{id}/actions/site_grant` | optional login email |
| `contact-site-revoke` | `POST /customers/{id}/actions/site_revoke` | |
| `list-list` / `list-get` | `GET /lists`, `GET /lists/{id}` | email lists |
| `tag-list` / `tag-get` / `tag-create` | `GET /tags`, `GET /tags/{id}`, `POST /tags` | |
| `product-list` / `product-get` | `GET /products`, `GET /products/{id}` | |
| `purchase-list` / `purchase-get` | `GET /purchases`, `GET /purchases/{id}` | filter by contact, product |
| `subscription-list` | `GET /subscriptions` | list subscriptions; filter by list, tag |
| `course-list` / `course-get` | `GET /courses`, `GET /courses/{id}` | filter by site, publish status |
| `access-grant-list` | `GET /access_grants` | filter by resource type / id / access state |
| `site-list` / `site-get` | `GET /sites`, `GET /sites/{id}` | |
| `broadcast-list` / `broadcast-get` | `GET /broadcasts`, `GET /broadcasts/{id}` | read-only; carries delivery and engagement counts |
| `automation-list` / `automation-get` | `GET /automations`, `GET /automations/{id}` | |

Collections take Simplero's own `page`, `per_page` (1-100, default 20) and `after` (cursor: records
with an id greater than this, always sorted by id). Results carry `items`, `page`, `perPage`,
`total`, `totalPages`, `nextAfter` and `hasMore`; under cursor paging `page`, `total` and
`totalPages` are null (Simplero skips counting), so `hasMore` is "a full page came back".

Every `POST .../actions/*` answers `{"data":{"success":bool,"message":string}}`; the app reads
`success` and throws on `false` even when the HTTP status is 200.

## Not yet covered

Of the 682 paths this app covers 35 operations. Left out, by choice or because Simplero's v2 does
not have them:

- **No contact delete.** v2 has only four `DELETE` operations in total (attachments, funnel
  connectors, and two page-builder nodes). A contact can only be archived (`mark_as_archived`,
  not implemented here).
- **No webhook management.** v2 has no webhooks resource. The only webhook-shaped operation is
  `POST /customers/{id}/actions/webhook` ("Post to webhook", body `outgoing_webhook_id`), which
  fires an already-configured outgoing webhook for a contact; not implemented.
- **No enrolments/participants resource.** Course access is granted with `course_grant` and
  inspected with `access-grant-list`; `event_occurrence_participants` (events) is not covered.
- Other contact actions (about 90 more): `mark_as_do_not_contact`, `mark_as_email_bounced`,
  `mark_as_archived`, `adjust_lead_score`, `set_affiliate`, `credit_issue`/`credit_consume`,
  `register_for_an_event`, `email`, `customer_sms`, `text_message`, `site_group_*`, `bot_tier_*`,
  `page_*`, `podcast_*`, `space_*`, `category_*`, countdown timers, deals, the Mailchimp pair,
  subscription suspend/resume, product pause/resume/auto-renew and similar.
- `on_customer` on `stop_automation`/`course_revoke`/`site_revoke`: the spec declares a boolean
  with no description, so its meaning is unconfirmed and it is not exposed.
- Filters whose semantics the spec does not describe (`list_id`/`product_id` on contacts, `state`
  on purchases and subscriptions) and the long tail of other filters.
- Creating or updating lists, products, courses, sites, automations; `customer_notes`,
  `transactional_emails`, `taggings`, deals/pipelines, funnels, landing pages, pages, blog posts,
  events, bots/chatbots, podcasts, affiliates and affiliate programs, coupons, prices, charges,
  installments, credits, surveys, quizzes, tickets, labels, facets, custom fields (`fields`,
  `field_values`), segments, triggers, assets, custom domains, agentic workflows.
- Changing a contact's custom-field values (`field_value_ids`) is accepted by the spec but not
  exposed.

## Response shapes

The spec's resource schemas do **not** declare an `id` property, although every path takes an
integer `{id}` and the cursor is documented as the "id of the last record". This app returns
records exactly as Simplero sends them and does not assume more than that; the `id` field was not
confirmed against a live account because no API key was available when it was built. Actions that
return a record put it under `record`.

## Health checks

| Check | Kind | Probe |
|---|---|---|
| `service` | service | `https://status.simplero.com/api/v2/summary.json`, unsigned |
| `quota` | quota | declared unavailable (`informational`) |
| derived `auth:api-key` | credential | the connection test above |

- **Status page.** `status.simplero.com` is an incident.io page that serves the Statuspage-compatible
  JSON schema (`page`, `status.indicator`, `components[]`). Verified 2026-10-06: `page.name` is
  `Simplero` (the check reads the name, not just the 200), `/api/v2/summary.json` answers JSON, an
  unknown path under `/api/v2/` answers 404, and the page has a component literally named `API`
  plus `Background processing`, `Website`, `Amazon Web Services`, `Spreedly`, `Stripe` and `Twilio`.
  `incidents` and `scheduled_maintenances` come back as `null`, not `[]`, and the check tolerates
  that.
- **The `API` component decides the verdict.** Every other component is reported but can only
  lower the verdict to `degraded`, since a Twilio or Website outage does not stop API calls. A
  failing or unreadable status page is `unknown`, never `down`.
- **Status host is not an API host.** `status.simplero.com` is in the check's own `network.allow`
  and deliberately not in the manifest's.
- **No quota check.** The v2 spec declares no 429 response and no rate-limit header anywhere (822
  operations), and the API description mentions only pagination and the User-Agent. A 200
  response's headers could not be inspected without a key, so the absence is declared rather than
  guessed.

## Icon

`assets/icon.png` is Simplero's own 192x192 favicon, downloaded verbatim (13,978 bytes, md5
`5d6c5e76ec513c2b32676ab65f1340b8`) from
`https://img.simplerousercontent.net/scaled_image/13180895/784a8dc30f894a270e1357517ea01aa5d39a9fdb/favicon-192w-192h.png`.
`simplero.com` serves no `favicon.svg` or `apple-touch-icon` (both answer 404 text/plain), so a PNG
is the only real mark available.

## Development

```
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```

Run these from this directory (use `deno task fmt`, never bare `deno fmt`). Tests use a mocked
`HookContext`: a fake `ctx.fetch` and a no-op `ctx.log`; nothing touches the network.
