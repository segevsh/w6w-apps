# Customer.io

Identify, delete, track events for, segment and merge people via Customer.io's write-side Track
API.

- **Categories** — marketing, email
- **Auth methods** — basic (Site ID + Track API Key)
- **Actions** — 7
- **Egress allowlist** — `track.customer.io`, `track-eu.customer.io`, `api.customer.io`

## Two different Customer.io APIs — this app only calls one

Customer.io exposes two unrelated APIs behind different hosts and different credential schemes,
and it is easy to conflate them:

| | Track API (this app) | App API |
|---|---|---|
| Host | `track.customer.io` / `track-eu.customer.io` | `api.customer.io` / `api-eu.customer.io` |
| Purpose | Write people, events, segment membership, merges | Campaigns, broadcasts, workspace/newsletter management |
| Auth | **Site ID** (username) + **Track API Key** (password), HTTP Basic | **App API Key**, Bearer |
| Direction | Write-only | Read/write over workspace resources |

This app implements only the Track API — the seven verbs below are its identify/delete/track/
segment/merge surface. `api.customer.io` is listed in the egress allowlist per this app's spec but
is **not currently called by any action or health check**: the `basic` Site-ID/Track-API-Key
credential this app collects cannot authenticate to it (it needs a Bearer App API Key), so wiring
it up would require a second, unrelated auth method. Noted here rather than silently dropped, since
the allowlist entry currently has no hook behind it — the same posture Segment's app takes with
`api.segmentapis.com`.

## Auth — Site ID & Track API Key

HTTP Basic with the workspace's **Site ID** as the username and its **Track API Key** as the
password: `Authorization: Basic base64("<siteId>:<apiKey>")`. Found under Workspace Settings → API
Credentials → Track API Keys.

Verified 2026-08-01 against the official `customerio-node` SDK (`customerio/customerio-node`,
`lib/request.ts`) and cross-checked against n8n's `CustomerIoApi.credentials.ts`, which builds the
identical header for `track.customer.io` / `track-eu.customer.io`.

### Region (US vs EU)

Customer.io runs two entirely separate data regions on two different hosts, and a workspace
created in one region only ever answers on that region's host — there is no cross-region fallback:

| Region | Host |
|---|---|
| United States (default) | `track.customer.io` |
| Europe | `track-eu.customer.io` |

`region` is collected once at connect time, alongside the Site ID and Track API Key, as a `select`
auth field. It is **not** a per-action param: `afterConnect` echoes it onto the connection's
redacted `display` data, and every action reads it from there via `lib/client.ts` — the same
pattern Zendesk's subdomain and Mailgun's region field use. Actions never see the credential, so
this is the only way for them to learn which host to call.

The Track API has no dedicated ping/whoami endpoint — it is write-only. `test` sends a minimal
`identify` PUT (`{}` attributes) to a fixed test person id (`w6w-connection-test`) and checks the
response status; repeated connection tests update one harmless profile rather than minting a new
one per check.

## Actions

| Key | Endpoint | Notes |
|---|---|---|
| `identify` | `PUT /customers/:id` | Create or update (upsert) a person. Body is the attributes object itself — no wrapper key. |
| `delete` | `DELETE /customers/:id` | Permanently delete a person. Does not suppress them. |
| `track` | `POST /customers/:id/events` | `eventName` required. `eventType: "page"` records a page view. |
| `track-anonymous` | `POST /events` | `eventName` required. Blank Anonymous ID + a `recipient` in Data sends an anonymous invite event. |
| `add-to-segment` | `POST /segments/:id/add_customers` | Up to 1,000 ids per call; `idType` selects id/email/cio_id. |
| `remove-from-segment` | `POST /segments/:id/remove_customers` | Same shape as `add-to-segment`. |
| `merge` | `POST /merge_customers` | Merges a secondary (duplicate) profile into a primary. Irreversible. |

All seven verbs were verified 2026-08-01 against the official `customerio-node` SDK
(`TrackClient.identify` / `destroy` / `track` / `trackAnonymous` / `addCustomersToSegment` /
`removeCustomersFromSegment` / `mergeCustomers`) and cross-checked against n8n's Customer.io node
(`CustomerIo.node.ts`, `CustomerDescription.ts`, `EventDescription.ts`, `SegmentDescription.ts`).
n8n implements customer upsert/delete, track/track-anonymous, and segment add/remove, but not
merge; merge is added here to complete the task's requested action set, grounded directly in the
official SDK.

### `attributes` / `data` are free-form JSON

`identify`'s `attributes` and `track`/`track-anonymous`'s `data` are open dictionaries — Customer.io
documents a couple of conventionally-special keys (`email`, `created_at`) but accepts arbitrary
additional attributes. Each is exposed here as a single `type: "json"` param — the action passes
the object straight through, with no lossy re-interpretation in between.

### `personIds` (segment actions)

Modeled as `type: "array"` with a string item schema (the same shape Webflow's `publish-items`
action uses for a plain id list), not `type: "json"` — the runtime delivers it as a native
`string[]`, so no parsing is needed in the action.

### Idempotency

| Action | `idempotent` | Why |
|---|---|---|
| `identify` | `true` | A PUT with the same id/attributes is a pure upsert. |
| `delete` | `true` | Deleting an already-deleted id is the same end state. |
| `track` / `track-anonymous` | `false` | The Track API documents no event id / dedupe key on these endpoints (unlike Segment's `messageId`) — a retry creates a second, distinct event. |
| `add-to-segment` / `remove-from-segment` | `true` | Set-membership operations; repeating is a no-op. |
| `merge` | `false` | The secondary profile is permanently deleted by a successful merge, so a retry targets an id Customer.io can no longer resolve. |

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.customerio.com> (`status.customer.io` 301-redirects here).

```
GET https://status.customerio.com/api/v2/summary.json
```

Atlassian Statuspage, confirmed live 2026-08-01: `status.indicator` gives a one-line rollup
(`none`/`minor`/`major`/`critical`) and `components[]` breaks out 9 tracked components (Javascript
Tracker, Data Collection, Data Processing, Message Sending, Management Interface, Knowledge Base,
plus a grouped "Third-Party Services" pair). Unauthenticated, cheap to poll, and identical for
every Connection regardless of region, so the check runs once (`scope: "app"`) and the result is
shared.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself. See [Auth — Site ID & Track API Key](#auth--site-id--track-api-key) above.

### Do we have quota left?

**Declared unavailable, honestly.** The official `customerio-node` SDK's retry policy treats `429`
as retryable and honors `Retry-After` — but that is reactive, only after a request has already
been rejected. No surface checked while building this app documents a proactive quota header on a
*successful* response. Rather than fake a check or silently omit one, `health/quota.ts` declares
`unavailable` with the reason, per
[`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md)'s
"declare absence" pattern — `severity: "informational"` so a permanent `unknown` never worsens this
App's roll-up verdict.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no probe exists |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

The host `status.customerio.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely because
the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time,
so a credential can never reach a status host.

## Icon

Sourced from Customer.io's own mark as shipped in n8n's `nodes-base` package
(`nodes/CustomerIo/customerio.svg` / `customerio.dark.svg`) — light and dark variants, copied
verbatim.

---

Researched and endpoint-verified 2026-08-01 against the official `customerio-node` SDK
(`github.com/customerio/customerio-node`, `lib/track.ts`, `lib/regions.ts`, `lib/request.ts`,
`lib/utils.ts`) and cross-checked against n8n's Customer.io node/credentials
(`CustomerIo.node.ts`, `CustomerIoApi.credentials.ts`, `GenericFunctions.ts`). Status surfaces
move; re-check if a probe starts failing for everyone at once.
