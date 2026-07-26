# Klaviyo

Klaviyo profiles, lists, events, segments, campaigns, and templates.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 23
- **Egress allowlist** — `a.klaviyo.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.klaviyo.com>

```
GET https://status.klaviyo.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /api/accounts/
```

Klaviyo's account endpoint — the documented lightweight call, and the only one reachable
with the `accounts:read` scope alone.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` response headers. Klaviyo
runs separate burst and steady buckets per endpoint.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
