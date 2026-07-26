# Google Drive

Manage files, folders and shared drives on Google Drive.

- **Categories** — storage, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 18
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

See the Workspace Status Dashboard note above.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `oauth2` | `GET /about?fields=user` |
| `service-account` | `POST https://oauth2.googleapis.com/token (JWT grant)` |

Drive's own whoami. `fields=user` is what keeps it cheap — `about` returns a large
object if you do not narrow it, and Drive rejects the call outright without a `fields`
mask.

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
