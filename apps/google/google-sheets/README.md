# Google Sheets

Read and write Google Sheets: manage spreadsheets, sheets, rows and cells.

- **Categories** — spreadsheets, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 12
- **Triggers** — 4 (poll)
- **Egress allowlist** — `sheets.googleapis.com`, `www.googleapis.com`
- **Website** — https://sheets.google.com
- **API docs** — https://developers.google.com/workspace/sheets

## Triggers

Poll triggers, checked every minute. Each reads the sheet with the same request as the **Read Rows**
action (`GET /v4/spreadsheets/{id}/values/{sheet}`, unformatted values) and compares it with the
previous check. The first check only records what is already there; it starts no runs.

| trigger | title | mechanism | vendor event | what the run gets |
| --- | --- | --- | --- | --- |
| `row-added` | New Row | poll | a row appears below the header | `change`, the row's cells by header, and `rowNumber` (or `key`) |
| `row-updated` | Updated Row | poll | a known row's cells change | the same, with the new cells |
| `row-added-or-updated` | New or Updated Row | poll | either | the same, `change` says which |
| `new-sheet` | New Sheet | poll | a tab is added to the spreadsheet (`list-sheets` request, `sheets.properties`) | the tab's `sheetId`, `title`, `index`, `sheetType` and `gridProperties` |

`new-sheet` takes only `spreadsheetId`; it reads the tab list (a small, bounded collection), keeps only
tab ids between checks, and does not report renames or removed tabs.

Not covered: Google's push channels (Drive `files.watch`) say only that the file changed, never which
rows, and the channel expires with nothing in the trigger lifecycle to renew it; the row triggers poll
instead.

Row-trigger parameters: `spreadsheetId`, `sheetName` (the tab; row 1 must be its header row) and an optional
`keyColumn` (a header name).

- **Use a key column.** Without one, rows are identified by row number, so inserting or deleting a row
  shifts every row below it and they all read as updated. With `keyColumn` set to a column of unique
  values (an ID), rows are followed by that value, and moving a row is not a change. If two rows hold
  the same key the check fails with an error naming the column and value; fix the sheet or clear the key.
- Editing the header row is not an update; blank rows and rows with a blank key are skipped.
- Up to 5000 data rows; a larger sheet makes the check fail rather than miss rows.
- Removed rows are not reported.
- Only cell hashes are kept between checks, never cell values.
- Trust model: requests go out through the connection's own OAuth or service-account credential;
  nothing is received from Google.

Vendor docs: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
(verified 2026-11-10); tab list https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
(verified 2026-11-10); push limits https://developers.google.com/workspace/drive/api/guides/push (verified 2026-11-10).

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
| `service-account` | `GET https://www.googleapis.com/drive/v3/about?fields=user` (host-minted token) |

Like Docs, the Sheets API is per-spreadsheet and has no listing endpoint — enumerating
spreadsheets is Drive's job, not Sheets'. So the probe validates the token rather than
the Sheets service.

The service-account method has no user token to inspect either: the host mints the token
from the pasted JSON key and the runtime signs the probe, which makes the same Drive `about`
call as above (`drive.file` covers it).

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
