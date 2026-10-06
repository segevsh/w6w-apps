# Ninox

Read and write records in a [Ninox 4](https://ninox.com) workspace, inspect its modules, tables,
fields, views and reports, poll change feeds for incremental sync, run scripts, and render reports
to PDF — over the Ninox 4 public API v1 (`https://go.ninox.com/api/v1`).

Everything here was verified on 2026-10-06 against the vendor's OpenAPI 3.0 document
(`https://go.ninox.com/api/docs-json`, `info.version` 1.0.0) and live probes against `go.ninox.com`.
The prose docs are at
<https://docs.ninox.com/ninox-api/api-reference/introduction-to-ninox-public-api>.

## Connect

One **Workspace API key** belongs to exactly one workspace, so a Connection is two fields:

| Field        | Notes                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| API Key      | Ninox app > Workspace Integration. Sent as `Authorization: Bearer <key>`.       |
| Workspace ID | 12 lowercase letters/digits. Every API path starts with `/workspace/{id}`.      |

Keys carry scopes (the document names `records:write`, `schema:write`,
`schema:manage-permissions`); an operation the key lacks answers 403 `Insufficient API key scope`.
`afterConnect` echoes the workspace id (and name) onto the Connection so actions can build URLs
without ever seeing the key.

## Actions (22)

| Area       | Actions                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Workspace  | `workspace-get`, `schema-changes-list`                                                          |
| Structure  | `module-list`, `module-get`, `table-list`, `table-get`, `field-list`, `field-get`, `function-list` |
| Records    | `record-list`, `record-get`, `record-changes-list`, `record-create`, `record-update`, `record-delete`, `record-upsert` |
| Scripts    | `script-exec`                                                                                   |
| Views      | `view-list`, `view-get`                                                                         |
| Reports    | `report-list`, `report-get`, `report-print`                                                     |

Lists use `limit`/`offset` (records and change feeds accept 1-100) and return `hasMore` from the
vendor's `page_info.has_more`. `record-list` sends the current `filter` parameter; the document's
only deprecation is the Ninox 3 alias `filters`, which is never sent.

## Things that cost a day

- **Singular vs plural.** One record is read at `.../record/{id}`; everything else is `.../records`.
- **The gateway does not speak the documented error envelope.** A missing and a wrong key are the
  same `401 text/plain` (`Workspace orchestrator error`), not `{"error": {...}}`; the body cannot
  tell them apart. An unknown path under `/api/v1` answers **200 with the HTML web-app shell**, so
  success is always judged by a `{"data": …}` body, never by status.
- **Batch writes are transactional.** One bad record in an update or delete rolls back the batch.
- **Record ids** are positive integers on the way in and strings on the way out. This app validates
  ids locally rather than silently dropping a bad one from a DELETE.
- `record-changes-list` only works on tables with history tracking on (400 otherwise).
- `script-exec` runs with writes and trigger cascades enabled and needs `records:write`.

## Health

- `service` — **declared unavailable** (informational). Ninox publishes no status page or feed for
  the API; `status.ninox.com` answers 401 behind HTTP Basic (a Nagios realm).
- `api` — unsigned `GET /workspace/aaaaaaaaaaaa`. A non-HTML 401/403 proves the gateway is
  answering (**ok**); an HTML body, even at 200, is the web-app shell (**unknown**); 5xx is **down**.
- `auth:api-key` (derived from `test`) — `GET /workspace/{id}/modules?limit=1`, passing only on a
  `{"data": [...]}` body. It needs the key, is bound to the Connection's workspace, and its body
  carries app structure, not credentials.

## Not covered

Creating or changing modules, tables, fields (single and batch), views, reports, components and
global function scripts; module definition apply/get; label updates; file upload and record file
attachment; CSV import; XLSX view export. Sending these safely needs the `schema:*` scopes and
their per-type field rules, and the file endpoints a multipart/presigned-URL flow this version does
not model. No rate-limit or usage endpoint is documented, so there is no quota check.

## Icon

`assets/icon.svg` embeds the vendor's own 256x256 PNG webclip
(`Ninox_webclip.png` from Ninox's site CDN, 11,934 bytes) verbatim as a base64 `<image>`; the
vendor serves no SVG mark (`ninox.com/favicon.svg` redirects to an HTML page).
