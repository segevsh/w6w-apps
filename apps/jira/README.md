# Jira

Create, search and transition Jira issues, and manage comments, users and projects.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-token, oauth2
- **Actions** — 15
- **Egress allowlist** — `*.atlassian.net`, `api.atlassian.com`
- **Website** — https://www.atlassian.com/software/jira
- **API docs** — https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://jira-software.status.atlassian.com>

```
GET https://jira-software.status.atlassian.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

Atlassian runs one Statuspage per product; `status.atlassian.com` is the cross-product
rollup and also serves `/api/v2/status.json`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `api-token` | `GET /rest/api/3/myself` |
| `oauth2` | `GET https://api.atlassian.com/oauth/token/accessible-resources` |

The authenticated user. Works on any Jira Cloud site and needs no project permission.

The two differ because the hosts differ. An API-token connection talks to the site
directly, so `myself` is reachable. An OAuth connection has no site yet —
`accessible-resources` is what both proves the token and resolves the `cloudId` every
later call needs, so it cannot be skipped.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Atlassian applies dynamic, cost-based limits and answers 429 with
`Retry-After`; `X-RateLimit-*` headers appear on some endpoints.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `jira-software.status.atlassian.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Atlassian applies dynamic, cost-based limits with no published headroom endpoint. `X-RateLimit-*` headers appear on some endpoints but not reliably, so there is nothing a probe can read for a stable answer; a 429 carries `Retry-After`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
