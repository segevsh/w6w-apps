# Zoom

Schedule and manage Zoom meetings, webinars, registrants, users and cloud recordings.

- **Categories** — video, communication
- **Auth methods** — server-to-server, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.zoom.us`, `zoom.us`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.zoom.us>

```
GET https://status.zoom.us/api/v2/status.json
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
GET /v2/users/me
```

The authenticated user. Works for both credential types and needs only `user:read`.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Category` response headers. Zoom bands endpoints
into Light / Medium / Heavy / Resource-intensive categories with separate daily
allowances.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
