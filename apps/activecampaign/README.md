# ActiveCampaign

- **Triggers** — 16 (11 webhook, 1 any-event webhook, 4 poll)

## Triggers

| Key | Title | Mechanism | Vendor event / wrapped list action | What the run gets |
| --- | --- | --- | --- | --- |
| `new-contact` | New Contact | Webhook | `subscribe` | The subscribing contact |
| `contact-updated` | Contact Updated | Webhook | `update` | The updated contact |
| `contact-unsubscribed` | Contact Unsubscribed | Webhook | `unsubscribe` | The contact that unsubscribed (and the campaign it came from) |
| `contact-tag-added` | Contact Tag Added | Webhook | `contact_tag_added` | The contact and the tag |
| `contact-tag-removed` | Contact Tag Removed | Webhook | `contact_tag_removed` | The contact and the tag |
| `deal-added` | Deal Added | Webhook | `deal_add` | The new deal |
| `deal-updated` | Deal Updated | Webhook | `deal_update` | The updated deal and the fields that changed |
| `campaign-sent` | Campaign Sent | Webhook | `sent` | The campaign that was sent |
| `campaign-opened` | Campaign Opened | Webhook | `open` | The campaign and the contact that opened it |
| `campaign-link-clicked` | Campaign Link Clicked | Webhook | `click` | The campaign, the link and the contact |
| `email-bounced` | Email Bounced | Webhook | `bounce` | The campaign, the bounce and the contact |
| `any-event` | Any Event | Webhook | the `events` you list (default: all 30) | The event name, contact/deal/campaign and the full payload |
| `new-or-updated-contact` | New or Updated Contact | Poll | `list-contacts` (`GET /contacts?orders[udate]=DESC`) | Each contact created, imported or changed |
| `new-sent-campaign` | New Sent Campaign | Poll | `list-campaigns` (`GET /campaigns?orders[sdate]=DESC`) | Each campaign newly sent, automation campaigns included |
| `new-automation` | New Automation | Poll | `list-automations` (`GET /automations?orders[cdate]=DESC`) | Each automation newly created |
| `new-or-updated-automation` | New or Updated Automation | Poll | `list-automations` (`GET /automations?orders[mdate]=DESC`) | Each automation created or modified |

Every webhook trigger registers itself (`POST /webhooks`) with the callback URL w6w minted, for the
sources admin, api, public and system, and removes it (`DELETE /webhooks/{id}`) when unsubscribed;
stale registrations for the same URL are removed before a replacement is created. Nothing to set up
by hand. `any-event` registers one webhook for the events in its `events` parameter
(comma-separated; empty = all 30 ActiveCampaign documents), and only those are delivered.

`list-deals` is covered by `deal-added` (a webhook fires for every deal created, whatever the source).
`list-contacts` also feeds `new-or-updated-contact`, which sees contacts added by an import (the
`subscribe` webhook does not run for imports).

**Trust model.** ActiveCampaign does not HMAC-sign a delivery. Its webhook API does accept custom
headers, one of which can be marked `is_signature: true` (the value is hidden in later reads), so
every trigger above except `new-contact` registers a fresh random per-subscription secret as the
header `X-W6W-Webhook-Secret` and refuses (constant-time comparison, before it reads the body) any
delivery whose header is missing or wrong. That is a shared secret, not a body signature: it does not
prove the body is unmodified and a captured delivery can be replayed; keep the callback URL private.
`new-contact` (shipped earlier) registers no header: for it the callback URL is the secret. A
delivery of an event other than the one a trigger registered for is dropped. ActiveCampaign never
retries a webhook and deactivates one that answers HTTP 410.

Vendor documentation, verified 2026-11-10: [Webhooks](https://developers.activecampaign.com/page/webhooks)
(events and payload fields), [Create a webhook](https://developers.activecampaign.com/reference/create-webhook)
(`events`, `sources`, `headers` with `is_signature`),
[List all webhook events](https://developers.activecampaign.com/reference/get-a-list-of-webhook-events),
and the list endpoints [contacts](https://developers.activecampaign.com/reference/list-all-contacts),
[campaigns](https://developers.activecampaign.com/reference/list-all-campaigns) and
[automations](https://developers.activecampaign.com/reference/list-all-automations) (`orders[...]`).

Manage ActiveCampaign contacts, deals, campaigns and automations.

- **Categories** — marketing, crm
- **Auth methods** — api-key
- **Actions** — 13
- **Egress allowlist** — `*`
- **Website** — https://www.activecampaign.com
- **API docs** — https://developers.activecampaign.com

## Why `network.allow` is `*`

ActiveCampaign gives every account its own API host — `https://<accountname>.api-us1.com` is the
common shape, but ActiveCampaign's own docs are explicit that this is not guaranteed:

> It is explicitly not a guarantee that `api-us1.com` is always a supported API Base URL for all
> current and future users.

(<https://developers.activecampaign.com/reference/url>). The account's own Settings → Developer
tab is the only authoritative source, and it shows the full URL rather than just an account name —
so this app collects it as a connect-time field (`apiUrl`) rather than a fixed suffix like
`*.zendesk.com`. Actions build request URLs from `connection.display.apiUrl`, which the `api-key`
auth method's `afterConnect` hook republishes from the credential.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs — plus a fourth, ActiveCampaign-specific
question: is *this account's own API host* reachable at all.

### Is the vendor up?

**Service status** — <https://status.activecampaign.com>

```
GET https://status.activecampaign.com/api/v2/summary.json
```

Atlassian Statuspage. `summary.json` carries the per-component, per-region breakdown (API
Availability, Email, SMS, CRM, Automations, Campaigns, Conversations, Integrations, Custom
Objects, E-commerce, Web Personalization — across US/EU/APAC groups). Unauthenticated,
CORS-enabled and cheap enough to poll.

### Is this account's API host reachable?

ActiveCampaign's per-account host is a dependency of a different kind than the vendor's own
platform: a status-page "operational" verdict says nothing about whether *this* account's host
resolves, since it isn't a fixed vendor endpoint. `health/site.ts` probes it directly:

```
GET {apiUrl}/api/3/contacts?limit=1   (unauthenticated)
```

A 401/403 passes — it proves the host resolves and the ActiveCampaign API answers behind it,
which is exactly the question. A 404 or 5xx is `down`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three RFC questions it performs itself as `auth:api-key`.

The single auth method probes:

```
GET /api/3/contacts?limit=1
```

The cheapest documented read, needing no scope beyond a working token.

### Do we have quota left?

`RateLimit-Limit` / `RateLimit-Remaining` response headers
(<https://developers.activecampaign.com/reference/rate-limits>). ActiveCampaign enforces a flat
**5 requests/second per account** — there is no documented `RateLimit-Reset` header, only a
`Retry-After` sent on an actual `429`, so `resetAt` is left unset.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.activecampaign.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. `site` and `quota` need no extra
allowlisting: `w6w.network.allow` is already `"*"`, since the per-account API host cannot be
enumerated.

## Actions

Contacts: `list-contacts`, `get-contact`, `create-contact`, `update-contact`, `delete-contact`.
Deals: `list-deals`, `get-deal`, `create-deal`. Campaigns: `list-campaigns`, `get-campaign`.
Automations: `list-automations`, `get-automation`, `add-contact-to-automation`.

Automations are **read-only** in ActiveCampaign's own API — "it is not possible to create, edit,
update, or delete automations via API"
(<https://developers.activecampaign.com/reference/automation>). Build and edit them in the
ActiveCampaign app itself; this app can list, read, and enroll contacts into them.

## Endpoints, verified against ActiveCampaign's own docs

All confirmed against `developers.activecampaign.com/reference/*` (API v3) directly, not assumed
from a third-party client:

| Action | Method | Path |
|---|---|---|
| `list-contacts` | GET | `/contacts` |
| `get-contact` | GET | `/contacts/{id}` |
| `create-contact` | POST | `/contacts` |
| `update-contact` | PUT | `/contacts/{id}` |
| `delete-contact` | DELETE | `/contacts/{id}` |
| `list-deals` | GET | `/deals` |
| `get-deal` | GET | `/deals/{id}` |
| `create-deal` | POST | `/deals` |
| `list-campaigns` | GET | `/campaigns` |
| `get-campaign` | GET | `/campaigns/{id}` |
| `list-automations` | GET | `/automations` |
| `get-automation` | GET | `/automations/{id}` |
| `add-contact-to-automation` | POST | `/contactAutomations` |

---

Researched and endpoint-verified 2026-08-01.
