# MailerLite

Manage MailerLite subscribers, groups, fields, segments, and email campaigns.

- **Categories** — marketing, email
- **Auth methods** — api-key (Bearer token)
- **Actions** — 16
- **Egress allowlist** — `connect.mailerlite.com`

## Which MailerLite API this targets

MailerLite runs **two generations of API side by side**, with different hosts, different auth
schemes and non-interchangeable keys. This matters more here than at most vendors, because
both are live, both are documented, and both are called "the MailerLite API" in the wild.

| | Current API — **what this app uses** | Classic API |
|---|---|---|
| Base URL | `https://connect.mailerlite.com/api` | `https://api.mailerlite.com/api/v2` |
| Auth header | `Authorization: Bearer <token>` | `X-MailerLite-ApiKey: <key>` |
| Docs | <https://developers.mailerlite.com/docs> | <https://developers-classic.mailerlite.com/docs> |

This app is built **exclusively against the current API**. A Classic API key will not
authenticate against it, and vice versa: the credential is minted in a different place and
sent under a different header name. If a connection fails with `401 {"message":
"Unauthenticated."}` and the token looks right, check which generation it came from.

The Classic API is not deprecated-and-gone — MailerLite still runs it, and its own status page
tracks the two platforms as separate components ("MailerLite Classic API & integrations" vs
"MailerLite API & integrations"). The `service` health check reports both, so a Classic-only
incident is visible without being mistaken for an outage of the API this app calls.

## Auth

One method: a MailerLite **API token**, pasted at connect time.

Mint it in the MailerLite dashboard: **Integrations → MailerLite API → Generate new token**.
It is shown once and never again — MailerLite does not store tokens in plaintext, so a lost
token has to be replaced rather than recovered.

Every request signs with `Authorization: Bearer <token>`, injected by the auth `sign` hook.
No action in this app touches the credential.

One failure mode worth knowing, because it looks like nothing changed: **tokens are bound to
the user who created them.** If that user is removed from the account or their account is
deleted, the token stops authenticating — without anyone having rotated or revoked it.

The `test` hook probes `GET /api/subscribers?limit=0` (see below for why that one).

## Actions

### Subscriber

| Key | Type | Endpoint |
|---|---|---|
| `list-subscribers` | read | `GET /api/subscribers` |
| `get-subscriber` | read | `GET /api/subscribers/(:id or :email)` |
| `upsert-subscriber` | perform | `POST /api/subscribers` |
| `update-subscriber` | perform | `PUT /api/subscribers/:id` |
| `delete-subscriber` | perform | `DELETE /api/subscribers/:id` |

### Group

| Key | Type | Endpoint |
|---|---|---|
| `list-groups` | read | `GET /api/groups` |
| `create-group` | perform | `POST /api/groups` |
| `list-group-subscribers` | read | `GET /api/groups/{group_id}/subscribers` |
| `assign-subscriber-to-group` | perform | `POST /api/subscribers/{subscriber_id}/groups/{group_id}` |
| `unassign-subscriber-from-group` | perform | `DELETE /api/subscribers/{subscriber_id}/groups/{group_id}` |

### Campaign

| Key | Type | Endpoint |
|---|---|---|
| `list-campaigns` | read | `GET /api/campaigns` |
| `get-campaign` | read | `GET /api/campaigns/{campaign_id}` |
| `create-campaign` | perform | `POST /api/campaigns` |
| `schedule-campaign` | perform | `POST /api/campaigns/{campaign_id}/schedule` |

### Lookups

| Key | Type | Endpoint |
|---|---|---|
| `list-fields` | read | `GET /api/fields` |
| `list-segments` | read | `GET /api/segments` |

`list-fields` and `list-segments` are here to make the write actions usable: `upsert-subscriber`
takes a `fields` object keyed by the names `list-fields` returns, and `create-campaign` takes
the segment ids `list-segments` returns.

### Four things about this API that will bite you

**1. `POST /subscribers` is an upsert, and it merges in one direction only.** "If a subscriber
already exists, it will be updated with new values" — 201 on create, 200 on update. The merge is
non-destructive on *both* fields and groups: omitting either leaves it alone. `PUT
/subscribers/:id` behaves differently — a supplied `groups` array is **authoritative**, and the
subscriber is removed from anything not listed. Use `upsert-subscriber` to add someone to a
group; use `update-subscriber` with `groups` to set membership exactly.

**2. Two pagination styles, not one.** Subscribers (and group subscribers) page by an **opaque
cursor**: read `meta.next_cursor` and hand it back as `cursor`. Groups, fields, segments and
campaigns page by **`page` + `limit`**. Every action here surfaces the whole `{data, links,
meta}` envelope precisely so a caller can drive whichever style applies without a second call.

**3. `GET /campaigns` defaults to `filter[status]=ready`, not to "everything".** This app does
not send a status filter unless you set one, so MailerLite's default applies — meaning an
unfiltered call returns *ready* campaigns, not drafts or sent ones. Set the status explicitly.

**4. Nothing sends until `schedule-campaign` runs.** `create-campaign` only drafts. The send
button is `POST /campaigns/{id}/schedule` with `delivery: "instant"` — which is why that action
is marked **not** idempotent: re-running it is a second send, not a no-op.

### Deliberate omissions

Verified as real endpoints, left out on purpose rather than missed:

- `POST /subscribers/:id/forget` — the GDPR erase. Irreversible after 30 days; not something a
  workflow should be able to fire by accident.
- `POST /groups/{id}/import-subscribers` and `POST /subscribers/import` — bulk import. Rate
  limited to 5 requests/minute on a separate bucket and asynchronous (returns a progress URL to
  poll), so it needs a job-shaped design rather than a one-shot action.
- `POST /campaigns/{id}/cancel`, `DELETE /campaigns/{id}`,
  `GET /campaigns/{id}/reports/subscriber-activity`
- `GET /automations`, `GET /automations/{id}`, `GET /automations/{id}/activity`
- `GET /forms/{type}` (`popup` | `embedded` | `promotion`) and the rest of the forms surface
- `/webhooks` (full CRUD), `POST /api/batch`, `GET /timezones`, `GET /campaigns/languages`
- `GET /subscribers/:id/activity-log`, `GET /subscribers/import/:import_id`
- Segment `PUT` / `DELETE` and `GET /segments/{id}/subscribers`
- Field `POST` / `PUT` / `DELETE`

Also worth stating plainly: **MailerLite's current API publishes no account or `whoami`
endpoint.** There is nothing to read an account name, plan or owner email from, which is why
this app declares no `afterConnect` hook and no `connectionLabel` — there is no account
metadata to label a connection with, and inventing one would mean guessing.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.mailerlite.com>

```
GET https://status.mailerlite.com/api/v2/summary.json
```

Statuspage-format and unauthenticated. `summary.json` costs the same single request as
`status.json` but carries the per-component breakdown, which is what earns its keep here: the
page tracks the Classic platform and the current one as **separate components**, so the
`service` check can report "Classic API degraded, current API operational" instead of flattening
both into one rollup indicator. Verified live against the real endpoint (14 components at the
time of writing).

A status page that itself fails reports `unknown`, never `down` — a broken status page says
nothing about the vendor.

### Is this credential live?

This is what the Auth `test` hook does — the app's own check, and the only one of the three it
performs itself.

```
GET /api/subscribers?limit=0
```

MailerLite publishes no account/ping/whoami endpoint on the current API, so the probe is the
cheapest scope-free read it *does* publish: `limit=0` is a documented special case that returns
a bare `{"total": 100}` and no subscriber rows. It needs no scope beyond what any token has, and
an invalid token answers `401 {"message": "Unauthenticated."}`.

### Do we have quota left?

Global limit: **120 requests/minute**. Import-creation endpoints have a separate, much tighter
bucket of **5 requests/minute** (not probed here — this app exposes no import action).

The counters ride on `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `Retry-After` — but
MailerLite **documents them only on the 429 response**, and does not promise them on a 2xx. The
`quota` check is written to that reality rather than around it: it reads the headers when they
are present, handles a 429 explicitly (the one response the counters are guaranteed on, and the
one where the reading matters most), and reports `unknown` when a healthy response carries no
headers — rather than manufacturing a "119 of 120 remaining" from the documented ceiling.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.mailerlite.com` (for `service`) is reachable **only inside that hook's worker**
— not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at
load time, so a credential can never reach a status host.

## Links

- **Website** — <https://www.mailerlite.com>
- **API docs (current — what this app targets)** — <https://developers.mailerlite.com/docs>
- **API docs (Classic — a different API)** — <https://developers-classic.mailerlite.com/docs>
- **Status page** — <https://status.mailerlite.com>
- **GitHub org** (official SDKs) — <https://github.com/mailerlite>

Icon: MailerLite's own mark, copied verbatim from n8n's `nodes-base`
(`nodes/MailerLite/MailerLite.svg`).

---

Researched and endpoint-verified against the live documentation on 2026-08-03: every path,
query parameter, request-body field and enumerated value above was read off
`developers.mailerlite.com`, and the status endpoint was called for real. Status surfaces move;
re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
