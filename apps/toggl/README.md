# Toggl Track

Track time entries, projects, workspaces, and clients via the Toggl Track API v9.

- **Categories** — productivity
- **Auth method** — api-token (`basic`)
- **Actions** — 10
- **Egress allowlist** — `api.track.toggl.com`
- **API docs** — https://engineering.toggl.com/docs/track/ (OpenAPI spec linked from
  https://engineering.toggl.com/docs/track/openapi/)

## Actions

Ten actions across four resources, all on `https://api.track.toggl.com/api/v9`:

- **time-entry** — `time-entry-start`, `time-entry-stop`, `time-entry-get-current`,
  `time-entry-get-many`, `time-entry-update`, `time-entry-delete`
- **project** — `project-get-many`, `project-create`
- **workspace** — `workspace-get-many`
- **client** — `client-get-many`

There is no separate "start timer" endpoint in Toggl's API: `time-entry-start` is
`POST /workspaces/{workspace_id}/time_entries` with `duration: -1` and no `stop`, exactly as
the vendor's own schema documents ("For running entries should be negative, preferable -1").
`created_with` is required by that same schema and is always sent as the literal `"w6w"` — it
identifies the calling integration, not something a user configures.

`time-entry-delete` answers with no usable body; that action returns `{ success: true }`.
Most write endpoints are workspace-scoped in the path (`/workspaces/{workspace_id}/...`), so
`workspaceId` is a required param wherever the real endpoint requires it.

This app was built directly against Toggl's own published OpenAPI/Swagger spec — unlike most
of this pack, n8n's `Toggl` node ships **only** a polling trigger
(`nodes-base/nodes/Toggl/TogglTrigger.node.ts`), no action node, so there was no reference
node to port from. Every path, HTTP verb, and body field below was verified against
`engineering.toggl.com`'s published spec (`api-*.json`, Swagger 2.0) rather than assumed.

## Auth

### API Token (`basic`)

Toggl's API v9 uses HTTP Basic auth in a non-standard way, and Toggl's own Swagger spec says
so explicitly (`info.description` of the published spec): *"We use BasicAuth in a specific
way. By the standard you provide `Authentication` header with `base64(user_name:password)` as
a credential. In our case it will be `base64(user_name:api_token)`."* — the user's API token
goes in the **username** slot, and the literal string `api_token` is the **password**; there
is no real password. Cross-checked against Toggl's authentication docs
(`engineering.toggl.com/docs/authentication`) and against n8n's `TogglApi.credentials.ts`
(`GET /me` as the credential-test request, HTTP Basic).

Fields: `apiToken` (secret, required) — generate one at `track.toggl.com/profile`. This app
deliberately does not collect email/password: Toggl's legacy password-based Basic auth still
works but the token is the vendor-recommended path and is what every current integration
guide uses.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second is
something the app itself performs directly (via `Auth.test`).

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.toggl.com/api/v2/summary.json
```

Verified directly: `status.toggl.com` is footed "Powered by Atlassian Statuspage" (its
`history.atom` / `history.rss` feed links confirm the platform), and a live request to
`summary.json` returns the standard Statuspage shape — an overall `status.indicator` (`none` /
`minor` / `major` / `critical`) plus a `components` array (observed to include "Track Webapp",
"Track API", and others) using Statuspage's own per-component vocabulary (`operational`,
`degraded_performance`, `partial_outage`, `major_outage`, `under_maintenance`). One request,
several components lit up independently. A status page that itself fails to respond reports
`unknown`, never `down` — a broken status page says nothing about Toggl.

`status.toggl.com` is reachable **only inside this hook's worker**: it is widened onto the
check's own `network.allow`, not the app's egress list, which the spec permits precisely
because the check is unsigned.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself:

```
GET /me
```

### Do we have quota left?

Declared **absent**. Toggl documents API quotas — verified directly against Toggl's own "API &
Webhook limits" support article (`support.toggl.com/api-webhook-limits`, last updated
2026-06-16): a **sliding-window** counter per user per workspace (Free 30 req/hr, Starter 240,
Premium 600, higher on Enterprise custom plans; a separate flat 30 req/hr limit on
user-scoped endpoints like `/me`) — but publishes **no response headers or endpoint** exposing
remaining headroom ahead of time. The only signal is reactive: an **HTTP 402** (not the more
common 429) once the quota is already exhausted. A different search pass surfaced claims of
`X-Toggl-Quota-Remaining` / `X-Toggl-Quota-Resets-In` headers, but that could not be confirmed
against the vendor's own article text (fetched and read directly, in full) — so this app does
not declare them. The absence is declared (not omitted) so a host can tell "we cannot know"
from "nobody looked"; an `unavailable` entry reports `unknown` and is `informational`, so it
never worsens a verdict.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared absence (`unavailable`) |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

The host `status.toggl.com` (for `service`) is reachable only inside that hook's worker — not
from any action, and not from the other checks.

## Icon

`assets/icon.png` is the real Toggl mark, copied unmodified from n8n's
`nodes-base/nodes/Toggl/toggl.png` (60×61 PNG) — no icon was invented for this app.

---

Researched and endpoint-verified 2026-08-01 directly against Toggl's own published OpenAPI
spec (`engineering.toggl.com/docs/track/openapi`), its authentication docs, and its "API &
Webhook limits" support article — not against an n8n reference node, since none exists for
Toggl actions. Status surfaces and undocumented behavior move; re-check if a probe starts
failing for everyone at once.
