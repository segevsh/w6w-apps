# Pipedrive

- **Triggers** — 13 (webhook)

## Triggers

| Key | Title | Mechanism | Vendor event | What the run gets |
| --- | --- | --- | --- | --- |
| `new-deal` | New Deal | Webhook (API-registered) | `create.deal` | The new deal |
| `deal-updated` | Deal Updated | Webhook (API-registered) | `change.deal` | The deal now and the previous values of the changed fields |
| `deal-deleted` | Deal Deleted | Webhook (API-registered) | `delete.deal` | The deal as it was (in `previous`) |
| `new-person` | New Person | Webhook (API-registered) | `create.person` | The new person |
| `person-updated` | Person Updated | Webhook (API-registered) | `change.person` | The person now and the previous values |
| `person-deleted` | Person Deleted | Webhook (API-registered) | `delete.person` | The person as it was |
| `new-organization` | New Organization | Webhook (API-registered) | `create.organization` | The new organization |
| `organization-updated` | Organization Updated | Webhook (API-registered) | `change.organization` | The organization now and the previous values |
| `organization-deleted` | Organization Deleted | Webhook (API-registered) | `delete.organization` | The organization as it was |
| `new-activity` | New Activity | Webhook (API-registered) | `create.activity` | The new activity |
| `new-note` | New Note | Webhook (API-registered) | `create.note` | The new note |
| `new-lead` | New Lead | Webhook (API-registered) | `create.lead` | The new lead |
| `any-event` | Any Event | Webhook (API-registered) | the `<action>.<object>` pairs you list in `events`, or every event (`*.*`) when empty | What happened, the object now, the previous values and the merge ids |

**Setup.** None by hand. Subscribing calls `POST /v1/webhooks` (webhook version 2.0) with the host's callback URL, one webhook per event; unsubscribing deletes them (`DELETE /v1/webhooks/{id}`; one Pipedrive no longer has counts as deleted). The connected user's permission level limits which objects are delivered, and Pipedrive allows 40 webhooks per user. Created events (`new-*`) deliver the object itself; the other triggers deliver `{ action, entity, entityId, timestamp, eventId, mergedFromId, mergedToId, current, previous }`. In Webhooks v2 a merge arrives as a `change` event carrying `mergedFromId` and a `delete` event carrying `mergedToId`, so `any-event` with `change.person, delete.person` reaches merges. `events` takes Pipedrive's own names (`create`, `change`, `delete` or `*` before the dot; any object type after it, for example `change.deal, delete.lead, create.product`).

**Trust model.** Pipedrive does not sign webhook deliveries: neither the v1 nor the v2 webhook guide describes a signature header. What it offers is HTTP Basic auth on the subscription URL, which Pipedrive sends "in the header of every HTTP request". Every trigger except `new-deal` registers a random per-subscription password (`http_auth_user` / `http_auth_password`), keeps it in the subscription state and refuses a delivery whose `Authorization` header does not carry it (constant-time compare; an unset password refuses everything). `new-deal` predates this and relies on the callback URL alone, which is the secret.

**Not covered.** `deal-get-many`, `person-get-many` and `organization-get-many` are served by the `new-deal`, `new-person` and `new-organization` webhook triggers (same records, registered through the API, no dashboard setup). No poll is shipped for them: the actions call `GET /v1/deals`, `/v1/persons` and `/v1/organizations`, and the current Pipedrive reference no longer documents those v1 list endpoints or their `sort` argument (it documents `GET /api/v2/deals` with `sort_by=add_time`), so a newest-first order could not be cited.

Sources (verified 2026-11-10): https://pipedrive.readme.io/docs/guide-for-webhooks-v2 ,
https://developers.pipedrive.com/docs/api/v1/Webhooks ,
https://developers.pipedrive.com/docs/api/v1/Deals ,
https://developers.pipedrive.com/docs/api/v1/Persons ,
https://developers.pipedrive.com/docs/api/v1/Organizations

Manage Pipedrive deals, persons, organizations, activities, notes and leads through the REST API.

- **Categories** — crm
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.pipedrive.com`
- **Website** — https://www.pipedrive.com
- **API docs** — https://developers.pipedrive.com/docs/api/v1

## Actions

Fourteen actions across the six core CRM resources, built on `https://api.pipedrive.com/v1`.
Every response is Pipedrive's `{ success, data, additional_data }` envelope, returned verbatim.

| Resource | Actions |
|---|---|
| Deal | create, get, get-many, update, delete |
| Person | create, get-many, update, delete |
| Organization | create, get-many |
| Activity | create |
| Note | create |
| Lead | create |

The webhook trigger, file upload/download, and the `*/search` endpoints are deliberately out
of scope — the first is a Trigger rather than an Action, the second is a binary-stream surface,
and the search endpoints were dropped to hold the action count to the most-used CRUD operations.

## Auth

Two methods, signing differently:

- **api-token** (`apiKey`, `in: query`) — a personal API token from *Settings → Personal
  preferences → API*. Pipedrive does **not** accept it in an Authorization header; it travels
  as a `?api_token=<token>` query param, appended by the runtime's `apiKey` wiring (and mirrored
  in `sign` for direct callers).
- **oauth2** (`Bearer`) — a public OAuth flow against a Pipedrive OAuth app registered on this
  w6w installation. The authorize/token endpoints live on `oauth.pipedrive.com` (added to the
  auth hook's allowlist implicitly, so it is not restated in `network.allow`); the access token
  authenticates against the same `api.pipedrive.com/v1` base.

Both methods `test` with `GET /users/me`.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — declared absent.

status.pipedrive.com is **not** an Atlassian Statuspage — it is hosted by Sorry™
(sorryapp.com), which exposes no machine-readable surface we could verify. The Statuspage
`GET /api/v2/status.json`, `/rss`, `/feed`, `/history.rss`, `/notices.rss` and the page-level
JSON all return 404; the public page ships no `<link rel="alternate">` feed and no embedded
page id to reach the (key-gated) Sorry™ API. Verified 2026-07-27.

Declaring the absence is a positive fact, not an omission: a host can render "not knowable"
instead of leaving an operator to conclude the publisher forgot to wire a probe. A declared
absence always reports `unknown`, so it carries `severity: "informational"` — otherwise it
would pin every verdict for this app at `unknown` forever.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /users/me
```

The current user — free, scope-free, and the smallest signed call Pipedrive offers.

### Do we have quota left?

`x-ratelimit-limit` / `-remaining` / `-reset` response headers meter a per-2-second **burst**
window; `x-daily-requests-left` reports the remaining daily **token budget** for write
endpoints (POST/PUT/DELETE), populated only for `api_token` auth. Header names verified against
the Pipedrive rate-limiting docs, 2026-07-27. Probed with the same `GET /users/me` call.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.pipedrive.com is a Sorry™ status page with no
verifiable machine-readable surface. The derived `auth:*` credential check is the only
automatable liveness signal.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
