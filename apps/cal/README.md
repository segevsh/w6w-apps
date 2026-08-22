# Cal.com

Read and manage Cal.com bookings, event types and schedules — the open-source scheduling
platform.

- **Categories** — calendar
- **Auth methods** — api-key
- **Actions** — 8
- **Egress allowlist** — `api.cal.com`
- **Website** — https://cal.com
- **API docs** — https://cal.com/docs/api-reference/v2/introduction

## API version note

Cal.com's API v2 versions each endpoint **group** — sometimes each endpoint — independently
via a `cal-api-version` request header, rather than a single API-wide version. Omitting the
header (or sending the wrong value) silently falls back to an older, undocumented response
shape, so every action supplies the value it was verified against:

| Group | `cal-api-version` |
|---|---|
| Bookings — list (`GET /bookings`) | `2026-05-01` |
| Bookings — get / create / cancel / reschedule | `2026-02-25` |
| Event types — list / get | `2024-06-14` |
| Schedules — list | `2024-06-11` |
| `GET /me` (used by auth) | none — takes no version header |

`lib/client.ts` exports these as `CAL_API_VERSION`; each action passes its own entry, never a
shared default.

## Auth

**API Key** (`api-key`, `bearer`) is the only auth method. Cal.com's API v2 authenticates
every request with `Authorization: Bearer <api-key>`. Keys are minted from the account's
Settings → Developer → API Keys page and are prefixed `cal_` (test) or `cal_live_` (live).

Cal.com's own docs point new public integrators at "Platform OAuth" instead, but Platform
OAuth stopped accepting new signups on 2025-12-15 — so a per-account API key is the only path
currently open, and is what a single-account connection would use regardless.

## Actions

Bookings are addressed by their `bookingUid` (returned by `booking-get-many` /
`booking-create`); event types by their numeric `eventTypeId`.

| Key | Resource | Endpoint |
|---|---|---|
| `booking-get-many` | booking | `GET /bookings` |
| `booking-get` | booking | `GET /bookings/{uid}` |
| `booking-create` | booking | `POST /bookings` |
| `booking-cancel` | booking | `POST /bookings/{uid}/cancel` |
| `booking-reschedule` | booking | `POST /bookings/{uid}/reschedule` |
| `event-type-get-many` | event-type | `GET /event-types` |
| `event-type-get` | event-type | `GET /event-types/{id}` |
| `schedule-get-many` | schedule | `GET /schedules` |

`booking-create`'s `location` param is a `json` field, not a string — Cal.com v2 expects a
structured object (`{"type":"attendeeAddress","address":"…"}`,
`{"type":"integration","integration":"cal-video"}`, etc.), not a bare string.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second is
something the app itself performs.

### Is the vendor up?

**Service status** — an openstatus.dev-powered page, not Atlassian Statuspage.

```
GET https://status.cal.com/api/status/summary.json
```

One request carries both the rollup `status.indicator` / `status.description` and a
per-component `components[]` breakdown, so a single probe can attribute a partial outage to
the affected component rather than greying out the whole platform.

The status host is reachable **only inside this hook's worker** — it is not in
`w6w.network.allow`, so no action can call it. The spec permits the widening precisely because
the check is unsigned (`credential: "none"`): a signed request must never reach a third-party
status host.

### Is this credential live?

This is what the `api-key` auth method's `test` hook does — the app's own health check, and
the only one of the three it performs itself:

```
GET /me
```

Cheap, always available, and takes no `cal-api-version` header.

### Do we have quota left?

**Declared absence.** Cal.com's API v2 docs state a default rate limit of 120 requests/minute
per API key (raisable on request), but document no `X-RateLimit-*` / `RateLimit-*` response
headers and no dedicated quota-headroom endpoint. Exhaustion is presumably a `429`, but
headroom cannot be read ahead of time. The `quota` check is declared `unavailable` (reporting
`unknown`, `severity: informational`) rather than omitted, so a host can tell "we cannot know"
from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | `health/quota.ts` (declared `unavailable`) |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the API Key auth method's `test` hook |

The host `status.cal.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.


## Icon

`assets/icon.png` — Cal.com's app icon; the previous artwork was the wordmark, which reads as a text block on a square tile.

Taken from <https://cal.com/> on 2026-08-15.

- **68,346 bytes**, `image/png`, 1024 × 1024, md5 `bf7a4518f834149389469008c60a4a63`
- raster, because the vendor publishes no vector of this mark

Cal.com's logo is a wordmark, which is what this app used to ship and what a square tile cannot hold. Their app icon is a separate, square lockup. No vector of it is published, so this is the 1024px raster — four times the pack's largest render, and sharper than a scaled wordmark could ever be.

---

Researched and endpoint-verified 2026-08-01. `cal-api-version` values and status-page shape
move; re-check them if a probe or action starts failing for everyone at once.
