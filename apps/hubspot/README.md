# HubSpot

Work with HubSpot CRM: contacts, companies, deals, tickets, engagements, lists, owners
and forms.

- **Categories** — crm, marketing
- **Auth methods** — private-app-token, oauth2, api-key
- **Actions** — 42
- **Egress allowlist** — `api.hubapi.com`, `api.hsforms.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.hubspot.com>

```
GET https://status.hubspot.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 3 auth methods probe:

```
GET /account-info/v3/details
```

Portal id, time zone and data-hosting region. Cheap, and — unlike a CRM object read — it
needs no object scope, so it works for a narrowly-scoped private app.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-HubSpot-RateLimit-Daily` / `-Daily-Remaining` / `-Secondly` / `-Secondly-Remaining`
response headers.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
