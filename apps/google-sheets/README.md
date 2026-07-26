# Google Sheets

Read and write Google Sheets: manage spreadsheets, sheets, rows and cells.

- **Categories** — spreadsheets, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 12
- **Egress allowlist** — `sheets.googleapis.com`, `www.googleapis.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

See the Workspace Status Dashboard note above.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `oauth2` | `GET https://oauth2.googleapis.com/tokeninfo` |
| `service-account` | `POST https://oauth2.googleapis.com/token (JWT grant)` |

Like Docs, the Sheets API is per-spreadsheet and has no listing endpoint — enumerating
spreadsheets is Drive's job, not Sheets'. So the probe validates the token rather than
the Sheets service.

The service-account method proves the credential by exchanging its signed JWT for an
access token — there is no user token to inspect.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
