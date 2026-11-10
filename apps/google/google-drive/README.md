# Google Drive

Manage files, folders and shared drives on Google Drive.

- **Categories** — storage, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 18
- **Triggers** — 5 (poll)
- **Egress allowlist** — `www.googleapis.com`
- **Website** — https://drive.google.com
- **API docs** — https://developers.google.com/workspace/drive

## Triggers

| Key — title | Mechanism | Wrapped list action | What the run gets |
|---|---|---|---|
| `new-file` — New File | poll | `file-list`, ordered `createdTime desc` | The new Google Drive file or folder |
| `new-or-updated-file` — New or Updated File | poll | `file-list`, ordered `modifiedTime desc`; optional folder or single file | The file or folder with its modified time; an edit is a new event |
| `new-folder` — New Folder | poll | `file-list` restricted to folders, ordered `createdTime desc` (`folder-list` is the same query) | The new folder |
| `new-or-updated-folder` — New or Updated Folder | poll | `file-list` restricted to folders, ordered `modifiedTime desc` | The folder with its modified time |
| `new-shared-drive` — New Shared Drive | poll | `drive-list`, whole collection compared with the last check (up to 500 shared drives) | The new shared drive |

The triggers poll the existing `files.list` / `drives.list` requests rather than registering a
callback; the first check records the current page and emits no historical files. The Drive API
supports the `createdTime desc` and `modifiedTime desc` sorts used here. `new-or-updated-file`
also fires for a newly created file (its modified time starts at creation); its optional `folderId`
keeps the files directly inside one folder and `fileId` keeps one file's changes.

No webhook trigger: Drive's push notifications arrive with an empty body (no file data), and
"there's no automatic way to renew a notification channel", so a registered channel would go
silent when it expires. Polling is the dependable path.

Not covered: none of the list actions is skipped; `file-list` backs the file and folder triggers,
`folder-list` is covered by `new-folder`, and `drive-list` backs `new-shared-drive`.

Verified 2026-11-10:
https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list ,
https://developers.google.com/workspace/drive/api/guides/push ,
https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list

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
| `service-account` | `GET /about?fields=user` |

Drive's own whoami. `fields=user` is what keeps it cheap — `about` returns a large
object if you do not narrow it, and Drive rejects the call outright without a `fields`
mask.

The service-account method probes the same endpoint. The host mints the access token from
the pasted key and signs the request; the app never sees the key, so a passing probe proves
the token the host derived can reach Drive.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Google publishes no headroom endpoint or rate-limit headers. Quota is per-project, billed in method-specific units and visible only in the Google Cloud console; exhaustion surfaces as 429 `rateLimitExceeded` or 403 `userRateLimitExceeded`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
