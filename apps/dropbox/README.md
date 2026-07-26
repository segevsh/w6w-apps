# Dropbox

Upload, download, and manage files and folders in Dropbox.

- **Categories** — storage
- **Auth methods** — access-token, oauth2
- **Actions** — 12
- **Egress allowlist** — `api.dropboxapi.com`, `content.dropboxapi.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.dropbox.com>

```
GET https://status.dropbox.com/api/v2/status.json
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
POST /2/users/get_current_account
```

Identifies the account, which also supplies the connection label.

Dropbox also ships a purpose-built echo endpoint: `POST /2/check/user` with
`{"query":"…"}` returns the same string back. It needs no scope at all, so it is the
better probe when you only want liveness and not identity (`/2/check/app` is its
app-auth twin).

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Dropbox answers 429 with `Retry-After`.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
