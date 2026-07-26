# GitHub

Manage GitHub issues, pull requests, releases, files, repositories and Actions
workflows.

- **Categories** — version-control, developer-tools
- **Auth methods** — access-token, oauth2
- **Actions** — 24
- **Egress allowlist** — `api.github.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://www.githubstatus.com>

```
GET https://www.githubstatus.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /user
```

The authenticated user. Works for classic and fine-grained PATs and for OAuth tokens.

`GET /rate_limit` is the better choice for a repeated probe: GitHub documents it as
**not** counting against the rate limit, it answers unauthenticated too (so it doubles
as a pure API-liveness check), and it reports the quota in the same call.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`GET /rate_limit`, plus `x-ratelimit-limit` / `-remaining` / `-reset` / `-used` headers
on every response. Secondary (abuse) limits are separate and surface as 403 with
`retry-after`.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
