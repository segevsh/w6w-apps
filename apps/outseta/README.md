# Outseta

Manage an [Outseta](https://www.outseta.com/) account — people, accounts, deals, email lists,
support cases, plans, subscriptions and invoices — from a workflow.

- **Spec:** the vendor's OpenAPI 3.0 document, <https://docs.outseta.com/api-reference/openapi.json>
  (the older Postman collection is marked "moved" and is not used). Every path, parameter and body
  field here was read from it.
- **Icon:** `assets/icon.svg` is the vendor's own `favicon.svg` from the marketing site's CDN
  (`cdn.prod.website-files.com/663cf90ca192fe7e5bcb8bd7/66eecaacfd5fecee18b038f8_favicon.svg`),
  byte-for-byte.
- **Actions:** 39. **Auth:** one method, `api-key`.

## Connecting

Outseta serves every account from its own host, `https://<subdomain>.outseta.com/api/v1`. The
subdomain is a field on the Connection (a pasted URL is normalised), the manifest allows
`*.outseta.com` rather than `*`, and `afterConnect` publishes the subdomain on
`connection.display` so actions build the URL without ever seeing the credential. A subdomain that
is not a single DNS label is refused before any request, so the host can never leave the vendor
domain.

Credentials are an API key and secret from **Settings > Integrations > API Keys**, sent as
`Authorization: Outseta <key>:<secret>` by the auth `sign` hook only. The pair grants full access to
the account. Client-side bearer tokens (`POST /tokens`) are intentionally not offered — they belong
to a logged-in end user, not a server integration.

Custom domains are not supported: only `*.outseta.com` is reachable.

## Actions

| Action | Type | Endpoint |
|---|---|---|
| `add-account-member` | perform | `POST /api/v1/crm/accounts/{accountUid}/memberships` |
| `add-custom-activity` | perform | `POST /api/v1/activities/customactivity` |
| `add-usage` | perform | `POST /api/v1/billing/usage` |
| `cancel-account` | perform | `PUT /api/v1/crm/accounts/{accountUid}/cancel` |
| `create-account` | perform | `POST /api/v1/crm/accounts` |
| `create-case` | perform | `POST /api/v1/support/cases` |
| `create-deal` | perform | `POST /api/v1/crm/deals` |
| `create-person` | perform | `POST /api/v1/crm/people` |
| `delete-account` | perform | `DELETE /api/v1/crm/accounts/{accountUid}` |
| `delete-deal` | perform | `DELETE /api/v1/crm/deals/{dealUid}` |
| `delete-person` | perform | `DELETE /api/v1/crm/people/{personUid}` |
| `get-account` | read | `GET /api/v1/crm/accounts/{accountUid}` |
| `get-case` | read | `GET /api/v1/support/cases/{caseUid}` |
| `get-deal` | read | `GET /api/v1/crm/deals/{dealUid}` |
| `get-email-list` | read | `GET /api/v1/email/lists/{emailListUid}` |
| `get-invoice` | read | `GET /api/v1/billing/invoices/{invoiceUid}` |
| `get-person` | read | `GET /api/v1/crm/people/{personUid}` |
| `get-plan` | read | `GET /api/v1/billing/plans/{planUid}` |
| `get-subscription` | read | `GET /api/v1/billing/subscriptions/{subscriptionUid}` |
| `list-accounts` | search | `GET /api/v1/crm/accounts` |
| `list-activities` | search | `GET /api/v1/activities` |
| `list-articles` | search | `GET /api/v1/support/articles` |
| `list-cases` | search | `GET /api/v1/support/cases` |
| `list-deals` | search | `GET /api/v1/crm/deals` |
| `list-email-lists` | search | `GET /api/v1/email/lists` |
| `list-email-subscribers` | search | `GET /api/v1/email/lists/{emailListUid}/subscriptions` |
| `list-invoices` | search | `GET /api/v1/billing/invoices` |
| `list-people` | search | `GET /api/v1/crm/people` |
| `list-plan-families` | search | `GET /api/v1/billing/planfamilies` |
| `list-plans` | search | `GET /api/v1/billing/plans` |
| `list-subscriptions` | search | `GET /api/v1/billing/subscriptions` |
| `list-transactions` | search | `GET /api/v1/billing/transactions/{accountUid}` |
| `remove-account-cancellation` | perform | `PUT /api/v1/crm/accounts/{accountUid}/remove-cancellation` |
| `remove-account-member` | perform | `DELETE /api/v1/crm/accounts/{accountUid}/memberships/{membershipUid}` |
| `subscribe-to-email-list` | perform | `POST /api/v1/email/lists/{emailListUid}/subscriptions` |
| `unsubscribe-from-email-list` | perform | `DELETE /api/v1/email/lists/{emailListUid}/subscriptions/{subscriptionUid}` |
| `update-account` | perform | `PUT /api/v1/crm/accounts/{accountUid}` |
| `update-deal` | perform | `PUT /api/v1/crm/deals/{dealUid}` |
| `update-person` | perform | `PUT /api/v1/crm/people/{personUid}` |

Every list action shares `limit`, `offset`, `fields`, `orderBy` and `filters`. **`offset` is a page
number, not a record offset** (with `limit` 20, page two is `offset: 1`). `limit` caps at 100, or 25
when `fields` expands child objects. `filters` is a JSON object of property filters
(`{"AccountStage": 3, "Created__gt": "2026-01-01"}`; operators `__gt __gte __lt __lte __ne
__isnull`, `*` wildcards). Write actions take the common fields as typed params plus a `properties`
JSON object for everything else, including custom properties; typed params win on a clash.

## Not covered, and why

- **Login, magic-link and 2FA token endpoints** — end-user bearer flows, not server-side API keys.
- **First-time subscription, change subscription and their previews, add-on and discount writes,
  plan/plan-family/coupon writes, invoice writes** — the request bodies are deep nested billing
  objects that could not be typed honestly from the schema alone. Use the read actions plus a
  future dedicated action.
- **Extend trial** — the body is `{ToDate, ExpirationDate}` and the docs do not say which is the new
  expiry.
- **Support case replies** — the OpenAPI entry documents no request body.
- **Tags, segments, drip/broadcast campaigns, templates, custom-attribute definitions.**

## Health

- `service` — an RSS `feed`, since there is no JSON. `status.outseta.com` is an Oh Dear
  page (title "No problems detected. | Outseta Status"). `/api/v2/summary.json`, `/index.json` and
  `/history.atom` all 404 and `outseta.statuspage.io` redirects to Atlassian's marketing page.
  `https://status.outseta.com/rss` answers 200 with a valid, empty channel, so the check reads it as
  a `feed`. The feed has never held an item, so the title convention of an open incident is a best
  reading (same as the `lemonsqueezy` app, same platform).
- `quota` — declared unavailable at `informational` severity: no headroom endpoint or rate-limit
  headers; the only documented limit is about 4 requests/second per API key.
- Derived `auth:api-key` — the `test` hook, `GET /billing/planfamilies?limit=1&fields=Uid,Name`
  (plan-family names only; nothing echoes the key). Success needs the `{metadata, items}` envelope,
  not just a 200.

## Things that would cost a day

1. **Failures have almost no body.** Measured 2026-10-06 against a real account with a made-up key:
   a rejected key/secret is **403 with an empty body** (the docs say 401); an unknown subdomain is
   **404 with an empty body**; a request Cloudflare dislikes (for example no `Authorization`) is a
   **403 HTML page** from the edge, identical for real and fake subdomains. Only validation errors
   carry `{ErrorMessage, PropertyName}`. There is no vendor error code to classify on, so the app
   classifies by body *shape* (HTML vs empty vs JSON) and decides success only on the documented
   list envelope.
2. **`offset` is a page index**, so `offset=20` with `limit=20` is page 21. A client that
   increments by `limit` silently skips data.
3. **Unknown `fields` paths are dropped, not rejected**, and referenced objects deeper than one
   level come back `null` unless asked for — a typo in `fields` looks exactly like a null value.
   Action endpoints (cancel, remove-cancellation) are documented as `application/octet-stream`, so
   the client returns `{raw}` for a non-JSON success body.

Nothing here was exercised against a live account (no credentials); request shapes are from the
OpenAPI document and the failure behaviour above is the unauthenticated/garbage-key surface only.
