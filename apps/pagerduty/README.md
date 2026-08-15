# PagerDuty

Manage PagerDuty incidents, services, on-call schedules and escalation
policies.

- **Categories** — monitoring, devops
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.pagerduty.com`
- **Website** — https://www.pagerduty.com
- **API docs** — https://developer.pagerduty.com/api-reference

## Setup

### API Token

1. In PagerDuty, go to **My Profile → User Settings → API Access** and create
   a personal REST API key, or **Integrations → API Access Keys** for an
   account-wide key.
2. Paste it into the connection's **API Key** field. It is sent as
   `Authorization: Token token=<key>` — PagerDuty's own scheme, not
   `Authorization: Bearer`.

### OAuth (Sign in with PagerDuty)

Requires a PagerDuty OAuth app registered on this w6w installation
(`client_id` / `client_secret` / `redirect_uri` live on the w6w server, not in
this package). The authorization-code flow uses:

- Authorize — `https://app.pagerduty.com/oauth/authorize`
- Token — `https://app.pagerduty.com/oauth/token`
- Scope — `write` (PagerDuty's classic scope; it implicitly includes read
  access)

## Actions

| Key | Type | Description |
|---|---|---|
| `incident-list` | read | List incidents, optionally filtered by status, urgency, service or assignee |
| `incident-get` | read | Get a single incident by ID |
| `incident-create` | perform | Trigger a new incident on a service |
| `incident-update` | perform | Update an incident's title, priority, urgency, or escalation policy/level |
| `incident-acknowledge` | perform | Mark an incident as acknowledged |
| `incident-resolve` | perform | Mark an incident as resolved |
| `incident-reassign` | perform | Reassign an incident to one or more users |
| `incident-note-create` | perform | Add a note to an incident |
| `service-list` | read | List services, optionally filtered by name or team |
| `service-get` | read | Get a single service by ID |
| `schedule-list` | read | List on-call schedules, optionally filtered by name |
| `schedule-get` | read | Get a single on-call schedule, including its rendered entries |
| `oncall-list` | read | List who is on-call, optionally filtered by schedule, escalation policy or user |
| `escalation-policy-list` | read | List escalation policies, optionally filtered by name, user or team |

### The `From` header

PagerDuty requires every incident-mutating call (create, update, acknowledge,
resolve, reassign, add a note) to carry a `From: <email>` header naming a
valid user on the account, so it can attribute the change. This is not
optional on PagerDuty's side — verified against PagerDuty's OpenAPI schema
(`from_header`, `required: true` on each of those endpoints) — so it is
threaded through as a required `from` param on every action that needs it,
rather than invented or silently dropped.

### Acknowledge / resolve / reassign have no dedicated endpoint

PagerDuty exposes one incident-update endpoint (`PUT /incidents/{id}`);
acknowledging, resolving and reassigning are all status/field transitions on
that same endpoint (`status: "acknowledged" | "resolved"`, an `assignments`
array). This app gives each of those a dedicated, narrowly-scoped action
(`incident-acknowledge`, `incident-resolve`, `incident-reassign`) rather than
exposing only the general `incident-update`, because they are what a workflow
author actually reaches for — `incident-update` remains available for the
rest of the endpoint's fields (title, priority, urgency, escalation
policy/level).

### Deliberately out of scope

- **Log entry read actions** (`GET /log_entries`, `GET /log_entries/{id}`) —
  the spec asked for a note/log-entry-CREATE action, which
  `incident-note-create` covers; a bare log-entry reader adds little a
  workflow author would reach for on its own, so it was left out to keep the
  action surface focused.

## Health check

Three different questions get confused with each other, so this section
keeps them apart: is the *vendor* up, is *this credential* live, and do we
have *quota* left.

### Is the vendor up?

**Declared unavailable.** `status.pagerduty.com` exists and is linked from
PagerDuty's own support docs, but — verified 2026-07-31 — it is PagerDuty's
own "Status Pages" product (self-hosted, not Atlassian Statuspage): the page
is a client-rendered SPA shell with incident data embedded in an inline
`<script id="data">` blob, not a separate documented endpoint.

```
GET https://status.pagerduty.com/api/v2/status.json   -> 404
GET https://status.pagerduty.com/api/v2/summary.json  -> 404
GET https://status.pagerduty.com/index.json            -> 200, identical HTML shell
GET https://status.pagerduty.com/incidents.json         -> 200, identical HTML shell
GET https://status.pagerduty.com/history.atom           -> 200, identical HTML shell
GET https://status.pagerduty.com/history.rss             -> 200, identical HTML shell
GET https://pagerduty.statuspage.io/api/v2/status.json  -> 401 (legacy host, not public)
```

Parsing the embedded JSON would mean depending on an undocumented, unstable
internal shape (versioned by a `pdt-layout-version` cookie that changes with
PagerDuty's own frontend deploys) — exactly the kind of guess this pack's
convention is to avoid. So `health/service.ts` declares
`unavailable: { reason }` rather than inventing a probe.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

Both auth methods probe:

```
GET /abilities
```

Lists the account's feature abilities. It needs no scope of its own and
works for a user-level key, an account-level key, and an OAuth token alike —
unlike `GET /users/me`, which rejects account-level keys. This is what
`afterConnect` uses `/users/me` for instead (best-effort connection-label
data only; a failure there does not fail the connect flow).

Nothing in this app calls `/abilities` from an action: it is out-of-band
context for whoever is diagnosing a failure.

### Do we have quota left?

`ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` response
headers on every authenticated call — verified against PagerDuty's own
support docs (`https://support.pagerduty.com/main/docs/rest-api-rate-limits`,
fetched 2026-07-31). No `X-` prefix (the IETF draft `RateLimit-*` form).
`ratelimit-reset` is documented as "how many seconds to wait before
retrying" — a duration, not an epoch timestamp — so `health/quota.ts`
converts it to an absolute `resetAt` by adding it to the current time.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | — | — | — | — | declared `unavailable` — no verifiable status API |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |


## Icon

`assets/icon.svg` — PagerDuty's mark is a white P on brand green, not the lowercase pd wordmark.

Taken from <https://www.pagerduty.com/favicon/prod/icon.svg> on 2026-08-15.

- **506 bytes**, `image/svg+xml`, md5 `180c6f201779c85efd95df5c28134875`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-07-31 against PagerDuty's OpenAPI
schema (`https://github.com/PagerDuty/api-schema`), PagerDuty's support docs,
and n8n's `PagerDuty` node/credentials. Status surfaces move; re-check if a
probe starts failing for everyone at once.
