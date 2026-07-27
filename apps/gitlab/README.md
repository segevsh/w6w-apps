# GitLab

Manage GitLab projects, issues, merge requests, files and releases on GitLab.com or a
self-managed instance.

- **Categories** — developer-tools, version-control
- **Auth methods** — access-token, oauth2
- **Actions** — 16
- **Egress allowlist** — `gitlab.com`
- **API docs** — https://docs.gitlab.com/ee/api/

## Auth

Two methods, both targeting GitLab's REST API v4 (`<instance>/api/v4`):

- **access-token** (`custom`) — a personal, project, or group access token. GitLab does
  NOT accept it as a Bearer credential: it rides in GitLab's own `PRIVATE-TOKEN` request
  header, which is why the method is `type: "custom"` and sets that header in `sign`. The
  method also carries an optional **Instance URL** field defaulting to `https://gitlab.com`
  — set it to target a **self-managed** instance. That base URL is republished on
  `connection.display.baseUrl` so action and quota code resolve the right host without ever
  seeing the credential.
- **oauth2** — the authorization-code flow against GitLab.com (scope `api`). PKCE is off
  because w6w holds the confidential app's `client_secret` server-side. The OAuth endpoints
  are GitLab.com's, so use the access-token method for self-managed OAuth targets.

### Self-managed instances

The manifest's egress allowlist ships only `gitlab.com`. Pointing a connection at a
self-managed host (via the access-token **Instance URL** field) therefore also requires
**adding that host to the connection's own egress allowlist** — the same dynamic-host note
that the WordPress and other self-hostable apps in this pack carry.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second
is something the app itself performs.

### Is the vendor up?

**Service status** — status.io, NOT Atlassian Statuspage.

```
GET https://api.status.io/1.0/status/5b36dc6502d06804c08349f7
```

GitLab's `status.gitlab.com` is hosted on **status.io** (verified 2026-07-27), unlike the
Statuspage-backed GitHub/Bitbucket apps in this pack — so the parser is bespoke. The JSON
carries `result.status_overall.status_code` plus a per-service `result.status[]` array. The
`service` check maps status.io's documented status codes (`100` Operational → ok, `200`/
`300`/`400` maintenance-or-partial → degraded, `500`/`600` disruption-or-security → down)
and reports one component per service, so a Container Registry incident doesn't grey out the
whole platform. `api.status.io` is widened onto this hook's own allowlist (not the app's
egress list, and not reachable by any action), which the spec permits because the probe is
unsigned. It only speaks for GitLab.com; a self-managed instance has no status.io page.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

Both auth methods probe:

```
GET /user
```

Returns the account behind the credential — the cheapest scope-free call GitLab offers. The
access-token method sends `PRIVATE-TOKEN`, the oauth2 method sends `Authorization: Bearer`.

### Do we have quota left?

`RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` response headers — GitLab's
RFC-draft header names, with **no `x-` prefix** (verified against
docs.gitlab.com/administration/settings/user_and_ip_rate_limits). GitLab.com meters per
minute; `RateLimit-Reset` is a Unix epoch second. The `quota` check reads them off a signed
`GET /user`, resolving the base URL from the connection so a self-managed probe stays on that
connection's allowlisted host.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

The host `api.status.io` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because
the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load
time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check if a probe starts
failing for everyone at once.
