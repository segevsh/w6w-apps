# ActiveCampaign

Manage ActiveCampaign contacts, deals, campaigns and automations.

- **Categories** — marketing, crm
- **Auth methods** — api-key
- **Actions** — 13
- **Egress allowlist** — `*`

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
