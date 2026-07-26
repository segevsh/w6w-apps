# Jira

Create, search and transition Jira issues, and manage comments, users and projects.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-token, oauth2
- **Actions** — 15
- **Egress allowlist** — `*.atlassian.net`, `api.atlassian.com`

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

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
