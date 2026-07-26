# Google Calendar

Read and manage Google Calendar events: check availability, create, update, and delete
calendar events.

- **Categories** — calendar, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 8
- **Egress allowlist** — `www.googleapis.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

See the Workspace Status Dashboard note above; Calendar appears under its own
`service_key`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /users/me/calendarList?maxResults=1
```

One entry from the calendar list. There is no whoami on the Calendar API, and capping
the page at 1 keeps it cheap. It succeeds even for an account with no calendars — an
empty list is still a 200.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
