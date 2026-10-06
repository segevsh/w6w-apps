# Outreach

Work prospects, accounts, opportunities, sequences, tasks and webhooks in **Outreach** (the sales
engagement platform) over its **REST API v2**, a JSON:API 1.0 service.

- **Categories** — crm, marketing
- **Auth methods** — oauth2 (authorization code)
- **Actions** — 30
- **Health checks** — 2 (`quota` live, ~~`service`~~ declared absence) + the derived `auth:oauth2`
- **Egress allowlist** — `api.outreach.io` only
- **API docs** — https://developers.outreach.io/api/ · reference https://developers.outreach.io/api/reference/
- **OpenAPI 3.0.3** — https://outreach-developer-portal.redocly.app/_bundle/api/reference.yaml
- **Icon** — https://cdn.prod.website-files.com/696ea7504e736c595e9a2313/699fa8741dc26f0119aa1286_webclip.png
  (Outreach's own webclip PNG, 256x256, embedded as a base64 data URI in `assets/icon.svg`)

> **Verified on 2026-10-06** against Outreach's OpenAPI document (1,010,345 bytes) and the
> developer-portal pages `/api/oauth`, `/api/getting-started`, `/api/making-requests`,
> `/api/common-patterns`, `/api/webhooks` and `/api/deprecated-features` (fetched as Markdown), plus
> live probes of `api.outreach.io` and `status.outreach.io`. Liveness: the API is current (v2 is the
> only version). The deprecation page lists dated behaviour changes — none removes an endpoint this
> app calls; see "Deprecations" below.

## Setup

1. In the Outreach developer portal create an app (**My apps**), add a redirect URI and tick the
   OAuth scopes you need. Development credentials work for up to 10 users of the owning org; other
   users must re-authorize weekly, so publish the app for real use.
2. Put the app's client ID, secret and redirect URI in this w6w installation's OAuth config for
   `oauth2`, then connect.

Scopes are `<resource>.<read|write|delete|all>` and are **not additive** (`prospects.write` does not
grant read). The defaults requested here cover every action. Outreach's pages print only
`prospects.*`, `users.read` and `accounts.read` verbatim; the others follow the documented rule using
the collection path segment (`sequenceStates.all`, `webhooks.all`, …). If a scope name is rejected at
authorize time, override the scope list in the server-side OAuth config — the scopes that count are
the ones registered on the Outreach app.

## The things most likely to cost you a day

### 1. Webhook configuration holds two live credentials

A webhook's `secret` (the HMAC key behind `Outreach-Webhook-Signature`) and `cleanupToken` (a bearer
token that can delete the webhook) are ordinary attributes of the `webhook` resource, and Outreach's
own docs say the creating app sees them. A workflow step result is persisted and echoed into logs,
so `webhook-list` and `webhook-create` **delete both attributes from every response** (`stripWebhookSecrets`
in [`lib/client.ts`](lib/client.ts)). You already know the secret — you supplied it. A test asserts the
action files for both call the stripper.

### 2. Two error shapes, and 403 does not mean "bad token"

Application errors are JSON:API: `{"errors":[{"id","title","detail","source":{"pointer"}}]}` (the 415
body spells the field `details`). But a token the edge cannot decode is answered by the gateway with a
bare `{"error":"Invalid JWT token.","description":"The JWT token could not be decoded."}` (measured live,
HTTP 401, on `/api/v2`, `/prospects` and `/users` alike). The client reads both.

A 403 is either `unauthorizedOauthScope` (token fine, scope missing) or `unauthorizedRequest` (token
fine, governance permission missing). The credential probe therefore classifies **from the body**: those
two ids and 429 mean the token authenticated; only a 401 fails it.

### 3. Rotating tokens

Access tokens last 2 hours, refresh tokens 14 days, and **every refresh issues a new refresh token**
that must replace the old one. A user/app pair may hold at most 100 live tokens and can fetch a token at
most once per 60 seconds (429 beyond that).

### Also worth knowing

- **`Content-Type: application/vnd.api+json` is required on every request, reads included** (else 415).
  The client sets it, and `Accept`, on all calls.
- **Ids are integers.** Every id param is validated as a positive integer before a request is made, so a
  stray `../users` cannot rewrite a path.
- **Counting is off by default.** Since Oct 2024 new apps get `count=false` semantics (`meta.count` is
  `null`); list actions send `count=false` unless you set *Count total*, because counting is the most
  expensive stage of a collection query.
- **Cursor pagination.** Lists send `page[size]` (default 25, max 1000) and return `nextCursor` — the
  `page[after]` value from `links.next` — to pass back as *After cursor*. Offset pagination is deprecated.
- **Filtering.** *Filters* is an object mapped to `filter[attr]`: lists (`1,2,3`), ranges (`5..10`,
  `2026-01-01..inf`), `__null__`/`__notnull__`, and nested relationship ids (`{"account": {"id": "1"}}`).
  Relationship-*attribute* filters and sorts (`filter[account][name]`, `sort=account.name`) were removed in
  Oct 2023 — filter by id, or `include` and sort locally. Not every attribute is filterable.
- **Prospect `contactHistogram`** left the default payload on 1 Oct 2026; ask for it with *Fields*. Once you
  set *Fields* only the listed attributes are returned.
- **No idempotency key.** Creates are marked non-idempotent; retrying one can duplicate. Updates (PATCH)
  are idempotent.
- **Rate limit** is 10,000 requests per hour **per user**; every response carries `X-RateLimit-Limit`,
  `-Remaining` and `-Reset`.

## Actions

| Area | Actions |
|---|---|
| Prospects | `prospect-list`, `prospect-get`, `prospect-create`, `prospect-update`, `prospect-delete` |
| Accounts | `account-list`, `account-get`, `account-create`, `account-update`, `account-delete` |
| Opportunities | `opportunity-list`, `opportunity-get`, `opportunity-create` |
| Sequences | `sequence-list`, `sequence-get` |
| Sequence states | `sequence-state-list`, `sequence-state-create` (add a prospect to a sequence), `sequence-state-pause`, `sequence-state-resume`, `sequence-state-finish` |
| Tasks | `task-list`, `task-get`, `task-create`, `task-mark-complete` |
| Notes | `prospect-note-create` |
| Mailings | `mailing-list` |
| Users | `user-list` |
| Webhooks | `webhook-list`, `webhook-create`, `webhook-delete` |

Write actions take the common attributes as named fields and an **Other attributes** JSON object for the
rest (including `custom1`…`customN`); a named field wins over the same key there. Relationships are
integer id fields (`accountId`, `ownerId`, …). Results are the JSON:API document as Outreach sent it
(`data`, `included`, plus `meta` and `nextCursor` on lists).

Enrolling a prospect needs three ids — prospect, sequence, and the **mailbox** the emails go out from.

## Health checks

- **`auth:oauth2`** (derived from `test`) — `GET /users?page[size]=1&count=false&fields[user]=`, one
  record, no attributes, so nothing personal comes back. The API root (`GET /api/v2`) was deliberately
  not used: the docs say it returns "information about your current OAuth application and token", it is
  absent from the OpenAPI document, and its body could not be shown not to echo the token. A scope or
  governance 403 passes (it proves the token is live); only a 401 fails.
- **`quota`** — reads `X-RateLimit-Limit` / `X-RateLimit-Remaining` off the same signed probe and goes
  `degraded` at 10% remaining. It judges headroom only: a 401 reports `unknown` and points at the auth
  check. `X-RateLimit-Reset`'s format is undocumented beyond "when the counter resets", so `resetAt` is
  reported only if it parses as a timestamp.
- **`service`** — declared absent, `informational`. https://status.outreach.io answers HTTP 200
  `text/html` with the same 1,382-byte single-page-app shell for every path tried
  (`/api/v2/summary.json`, `/api/v2/status.json`, `/api/v2/components.json`, `/summary.json`,
  `/api/v1/summary`, `/feed`, `/rss`, `/history.atom`) — a catch-all, not an API. Its JS bundle is the
  Outreach web app. There is no JSON or feed to read. Maintenance reaches the API as a 503
  `scheduledServerMaintenance` with a `Retry-After`.

## Deprecations checked

`/api/deprecated-features` lists: `contactHistogram` out of the default prospect payload (1 Oct 2026,
handled via *Fields*); `count=false` as the default for collections (handled: explicit `count`); the old
Audit Log API (Sept 2024 — this app has no audit-log action); and the May 2023 removal of relationship
attribute filters/sorts and of `include` on create/update (none are used here).

## Not covered

Left out deliberately, not because they don't exist: sequence steps and sequence templates, sequence
activate/deactivate/lock/unlock, templates and snippets, calls and call dispositions/purposes, email
addresses and phone numbers as their own resources (set `emails` on a prospect instead), mailboxes,
personas, teams, roles/profiles/rulesets, stages, opportunity stages and prospect roles, favorites,
products/purchases, content categories, kaia recordings, the bulk **batches** and **imports** APIs, audit
logs, compliance requests, custom objects, and the other nine task member actions (snooze, reschedule,
reassign, …). The service-to-service (S2S) token, which reaches only a small endpoint subset, and the
undocumented-in-the-spec `POST /webhooks/cleanup` endpoint are not used.
