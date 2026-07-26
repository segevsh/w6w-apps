# Google Docs

Create, read and structurally update Google Docs documents.

- **Categories** — productivity, documents
- **Auth methods** — oauth2, service-account
- **Actions** — 20
- **Egress allowlist** — `docs.googleapis.com`, `www.googleapis.com`

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

The Docs API is addressed strictly per document — there is nothing to list, so it offers
no endpoint that can be called without already knowing a document id. The probe
therefore validates the token itself rather than the Docs service. A Docs call would
only be possible against a document the connection may not have.

The service-account method has no user token to inspect, so it proves the credential by
doing the thing that would fail if the key were wrong: exchanging the signed JWT for an
access token.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
