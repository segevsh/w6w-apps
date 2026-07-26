# Gmail

Send, read, and manage Gmail messages, drafts, labels, and threads.

- **Categories** — communication, email
- **Auth methods** — oauth2, service-account
- **Actions** — 25
- **Egress allowlist** — `gmail.googleapis.com`, `www.googleapis.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

The Google Workspace Status Dashboard publishes its incident history as JSON. It is a
feed of incidents rather than a current-state rollup: an empty tail means no recent
incident. Each entry names the affected `service_key`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /gmail/v1/users/me/profile
```

The mailbox profile — address, message total and history id. The cheapest authenticated
Gmail call, and it works under the read-only scope.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Gmail bills per-method quota units against a per-user per-second
budget; usage is visible in the Google Cloud console, and exhaustion surfaces as 429
`rateLimitExceeded` or 403 `userRateLimitExceeded`.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
