# Segment

Send `identify`, `track`, `page`, `group`, `alias` and `batch` calls to Segment's write-side
Tracking API.

- **Categories** — analytics
- **Auth methods** — write-key
- **Actions** — 6
- **Egress allowlist** — `api.segment.io`, `api.segmentapis.com`
- **Website** — https://segment.com
- **API docs** — https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/

## Two different Segment APIs — this app only calls one

Segment exposes two unrelated APIs behind two different hosts and two different credential
schemes, and it is easy to conflate them:

| | Tracking API (this app) | Config/management API |
|---|---|---|
| Host | `api.segment.io` | `api.segmentapis.com` |
| Purpose | Write events into a Source | Read/manage workspace config (sources, warehouses, …) |
| Auth | Source **Write Key**, HTTP Basic, empty password | **Bearer** access token minted in the Segment web app |
| Direction | Write-only | Read/write over workspace resources |

This app implements only the Tracking API — the six verbs above are Segment's actual Tracking API
surface (`identify`/`track`/`page`/`group`/`alias`/`batch`). `api.segmentapis.com` is listed in the
egress allowlist per this app's spec but is **not currently called by any action or health check**:
the `basic` Write-Key credential this app collects cannot authenticate to it (it needs a Bearer
token), so wiring it up would require a second, unrelated auth method. Noted here rather than
silently dropped, since the allowlist entry currently has no hook behind it.

## Auth — Write Key

HTTP Basic with the source's **Write Key** as the username and an **empty password**:
`Authorization: Basic base64("<writeKey>:")` — the trailing colon with nothing after it is
load-bearing. Found under Source Settings → API Keys → Write Key in the Segment web app.

Verified 2026-08-01 against Segment's HTTP API Source docs and cross-checked against n8n's
`SegmentApi.credentials.ts`, which builds the identical header
(`Buffer.from(\`${writekey}:\`).toString("base64")`).

The Tracking API has no dedicated ping/whoami endpoint — it is write-only. `test` sends a minimal
`identify` call (`anonymousId: "w6w-connection-test"`, empty traits) and checks the response status;
repeated connection tests update one harmless anonymous profile rather than minting a new one per
check.

## Actions

| Key | Endpoint | Identity required | Notes |
|---|---|---|---|
| `identify` | `POST /v1/identify` | `userId` or `anonymousId` | Ties a user to their traits. |
| `track` | `POST /v1/track` | `userId` or `anonymousId` | `event` required. Reserves `revenue`/`currency`/`value` in `properties`. |
| `page` | `POST /v1/page` | `userId` or `anonymousId` | `category` has no top-level wire field — folded into `properties.category` client-side (see below). |
| `group` | `POST /v1/group` | `userId` or `anonymousId` | `groupId` required. |
| `alias` | `POST /v1/alias` | `userId` | Merges `previousId` into `userId`. Spec marks `userId` required, `previousId` optional. |
| `batch` | `POST /v1/batch` | per-item | Up to 2,500 items; each item carries its own `type`. |

All six verbs are Segment's actual Tracking API surface — there is no seventh write endpoint beyond
these (the API also exposes `/v1/screen` for mobile screen views, which this app does not implement,
matching the task's six-verb scope).

### `traits` / `properties` / `context` / `integrations` are free-form JSON

Segment's `traits`, `properties`, `context` and `integrations` objects are open dictionaries — the
spec documents a handful of reserved keys per call (e.g. `email`/`name`/`phone` for traits,
`revenue`/`currency`/`value` for track properties) but accepts arbitrary additional keys. Rather
than modelling every documented sub-field as its own form control (as some client-library UIs do),
each of these is exposed here as a single `type: "json"` param — the action passes the object
straight through to Segment, so the wire shape is exactly what the caller supplies, with no lossy
re-interpretation in between.

### `page`'s `category` field

Segment's `page` spec documents `category` as "added to the properties object" — the raw HTTP API's
JSON payload has no top-level `category` field (confirmed against a documented wire example: only
`name` sits alongside `properties`, `context`, etc.). Client libraries like analytics.js perform this
merge before the call reaches the wire; this action does the same merge itself
(`properties.category = category`) rather than sending a field the raw API doesn't have.

### `batch`

Top-level shape: `{ batch: [...], context?, integrations? }`. Each `batch` item carries its own
`type` (`"identify" | "track" | "page" | "group" | "alias"`) plus that call's own fields; a
top-level `context`/`integrations` is merged into items that don't set their own. Documented limits
(verified 2026-08-01): 500 KB total per request, 2,500 events max, 32 KB max per individual event.
This action checks the event count client-side and fails fast with a clear message; it does not
estimate payload byte size, since that would only approximate what Segment itself measures.

### `messageId` / idempotency

Every action is `idempotent: true`. `messageId` is stamped from `ctx.invocation.invocationId` when
present — Segment dedupes on `messageId` within a rolling window, so a host retry of the same
invocation lands the same `messageId` twice and Segment drops the duplicate, rather than the retry
being interpreted as a second event or trait update.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.segment.com>

```
GET https://status.segment.com/api/v2/summary.json
```

Atlassian Statuspage, confirmed live 2026-08-01: `status.indicator` gives a one-line rollup
(`none`/`minor`/`major`/`critical`) and `components[]` breaks out roughly 59 tracked components
(Tracking API, web/CDN, and per-destination delivery for streaming/warehouse/blobstore/Engage/
Reverse ETL, mostly split US/EU). Unauthenticated, cheap to poll, and identical for every
Connection, so the check runs once (`scope: "app"`) and the result is shared.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself. See [Auth — Write Key](#auth--write-key) above.

### Do we have quota left?

**Declared unavailable, honestly.** The Tracking API documents a 1,000 requests/second per-workspace
rate limit, but a successful response carries no `X-RateLimit-Remaining`/`-Limit` (or equivalent)
headers — the only documented rate-limit signals (`Retry-After`, `X-RateLimit-Reset`) appear solely
on an already-rejected `429`, which is useless as a proactive "how much headroom is left" probe.
Rather than fake a check or silently omit one, `health/quota.ts` declares `unavailable` with the
reason, per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md)'s
"declare absence" pattern — `severity: "informational"` so a permanent `unknown` never worsens this
App's roll-up verdict.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no probe exists |
| `auth:write-key` | credential | connection | signed | fatal | — | derived from the `write-key` auth method's `test` hook |

The host `status.segment.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against Segment's official documentation
(`segment.com/docs/connections/spec/*` and `.../sources/catalog/libraries/server/http-api/`, read via
their Netlify-hosted mirror since `segment.com` itself returns 403 to automated fetches) and cross-
checked against n8n's Segment node/credentials (`identify`, `track`, `page`, `group` — n8n does not
implement `alias` or `batch`, both added here to complete the Tracking API's real verb set per this
app's spec). Status surfaces move; re-check if a probe starts failing for everyone at once.
