# Harvest

Track time entries, projects, tasks, clients, and users via the Harvest API v2.

- **Categories** — productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 11
- **Egress allowlist** — `api.harvestapp.com`, `id.getharvest.com`
- **API docs** — https://help.getharvest.com/api-v2/

## Actions

Eleven actions across five resources, all on `https://api.harvestapp.com/v2`:

- **time-entry** — `time-entry-get-many`, `time-entry-get`, `time-entry-create`,
  `time-entry-update`, `time-entry-delete`, `time-entry-restart`, `time-entry-stop`
- **project** — `project-get-many`
- **task** — `task-get-many`
- **client** — `client-get-many`
- **user** — `user-get-many`

`time-entry-delete` answers with no usable body; that action returns `{ success: true }`.
`time-entry-restart` / `time-entry-stop` are Harvest's dedicated timer-control endpoints
(`PATCH .../restart`, `PATCH .../stop`); a *new* running timer is started by
`time-entry-create` when both `hours` and `startedTime`/`endedTime` are left blank — there
is no separate "start" endpoint in the real API, so this app doesn't invent one.

Deliberately absent from the n8n node this was ported from: company, contact, estimate,
expense, and invoice resources. Those belong to Harvest's billing/CRM surface rather than
time tracking; this first cut stays with the resources actually asked for.

## Auth

Every Harvest API v2 request needs **two** things on the wire, regardless of auth method:
`Authorization: Bearer <token>` and `Harvest-Account-Id: <accountId>` — a token (personal
or OAuth) can be scoped to, or see, more than one Harvest/Forecast account, so the account
to operate on is always a separate, explicit value.

### Personal Access Token (`apiKey`)

Generate one at `id.getharvest.com/developers` — Harvest hands you the Account ID
alongside the token in the same step. Fields: `accountId` (string, required),
`accessToken` (secret, required).

### OAuth2 (`oauth2`)

```
Authorize: https://id.getharvest.com/oauth2/authorize
Token:     https://id.getharvest.com/api/v2/oauth2/token
```

Both verified against Harvest's own API v2 authentication docs — `id.getharvest.com` is a
separate identity host from `api.harvestapp.com`. A Harvest OAuth token can grant access to
several accounts at once (the authorizing user's Harvest **and** Forecast accounts), so
`accountId` is collected as an explicit required field here too. `afterConnect` cannot
resolve it *for* `sign`: per the Auth hook contract, `afterConnect` only supplies display
data — it never writes back into the stored credential. So this app's `afterConnect` calls
Harvest's account-discovery endpoint (`GET https://id.getharvest.com/api/v2/accounts`,
which needs only the bearer token, not `Harvest-Account-Id`) purely to enrich the
connection label with the account's name and to confirm the id the user typed actually
resolves to a `product: "harvest"` account.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second
is something the app itself performs directly (via `Auth.test`).

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://www.harveststatus.com/api/v2/summary.json
```

Harvest runs a standard Atlassian Statuspage instance at `www.harveststatus.com` (linked
from Harvest's own authentication docs as "Status"). `summary.json` returns an overall
`status.indicator` (`none` / `minor` / `major` / `critical`) plus a `components` array with
Statuspage's own per-component vocabulary (`operational`, `degraded_performance`,
`partial_outage`, `major_outage`, `under_maintenance`) — one request, several components
lit up independently. A status page that itself fails to respond reports `unknown`, never
`down` — a broken status page says nothing about Harvest.

`www.harveststatus.com` is reachable **only inside this hook's worker**: it is widened onto
the check's own `network.allow`, not the app's egress list, which the spec permits
precisely because the check is unsigned. Pairing an extra host with `credential: "signed"`
is rejected at load time, so a credential can never reach the status host.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself. Both auth methods probe the same scope-free endpoint:

```
GET /users/me
```

Needs no special scope, so a narrowly-scoped token still passes its own liveness check.

### Do we have quota left?

Declared **absent**. Harvest documents a rate limit (100 requests per 15 seconds per
access token) but publishes no proactive headroom to read: API v2 responses carry no
`X-RateLimit-*` / `RateLimit-*` response headers, and there is no dedicated limits
endpoint. The only signal is reactive — a `429` with a `Retry-After` header once the limit
is already exceeded — so there is nothing to probe *ahead of time*. The absence is declared
(not omitted) so a host can tell "we cannot know" from "nobody looked"; an `unavailable`
entry reports `unknown` and is `informational`, so it never worsens a verdict.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared absence (`unavailable`) |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `www.harveststatus.com` (for `service`) is reachable only inside that hook's
worker — not from any action, and not from the other checks. The OAuth authorize/token
host (`id.getharvest.com`) is on the app's own egress allowlist because both auth methods'
`test`/`afterConnect` hooks call it directly (the accounts-discovery endpoint), not only
through the host-mediated OAuth redirect.

## Icon

`assets/icon.png` is the real Harvest mark, copied unmodified from n8n's
`nodes-base/nodes/Harvest/harvest.png` (152×152 PNG) — no icon was invented for this app.

---

Researched and endpoint-verified 2026-08-01 against Harvest's own API v2 documentation
(`help.getharvest.com/api-v2`) and cross-checked against n8n's `Harvest` node. Status
surfaces and undocumented behavior (e.g. rate-limit headers) move; re-check if a probe
starts failing for everyone at once.
