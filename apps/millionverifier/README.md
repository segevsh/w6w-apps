# MillionVerifier

Verify email addresses in real time, verify whole lists in bulk and check credits with
[MillionVerifier](https://www.millionverifier.com). 8 actions.

Verified 2026-10-06 against the vendor's API reference (`developer.millionverifier.com`, the
OpenAPI 3.0.0 document embedded in the page, `info.version` 3.1.0) and live probes of both API
hosts. `deprecat`/`sunset`/`end of life`/`will be removed` appear nowhere in the API content (the
only hits are inside the bundled Redoc/Prism JavaScript); v3 (single) and v2 (bulk) are the
documented live versions.

## Auth

**API key**, a **query parameter** added by the Auth `sign` hook (no action sees it). Copy it from
`app.millionverifier.com/api`. The two APIs name it differently, and `sign` chooses by hostname:

| Host | Parameter |
|---|---|
| `api.millionverifier.com` (single: verify, credits) | `api` |
| `bulkapi.millionverifier.com` (bulk: upload, fileinfo, filelist, download, stop, delete) | `key` |

There is no header form. The connect-time `test` calls `GET /api/v3/credits` (free; the body is
credit counters, never the key) and reads the **body**: a numeric `credits` passes, an `error` string
fails. The vendor's test key `API_KEY_FOR_TEST` returns random results for verification but is not
accepted by `/credits` (measured: `apikey_not_found`), so it cannot pass the connect test.

## Actions

| Group | Actions |
|---|---|
| Verify (single, real time) | `verify-email` |
| Account | `get-credits` |
| Verify (bulk) | `bulk-upload`, `bulk-get-file`, `bulk-list-files`, `bulk-download`, `bulk-stop`, `bulk-delete` |

Bulk flow: `bulk-upload` (an `emails` list, or your own file as base64) returns the file record with a
`fileId`; poll `bulk-get-file` until `status` is `finished`; `bulk-download` the report (filter `ok`,
`ok_and_catch_all`, `unknown`, `invalid`, `all` or `custom` with `statuses`/`free`/`role`);
`bulk-delete` when done. `bulk-list-files` pages by `offset`/`limit` (max 50).

`verify-email` spends a credit per call; a bulk upload spends one per unique address.

## Health checks

| Check | What it does |
|---|---|
| `service` | **Declared unavailable**, informational. MillionVerifier publishes no status page: `status.millionverifier.com` answers 200 but redirects to the marketing home page (51 KB, `<title>The #1 Email Verification Service`), and `millionverifier.statuspage.io` redirects to Atlassian's Statuspage marketing site. Nothing is invented. |
| `api` | Unsigned `GET /api/v3/credits`. The HTTP 200 `{"result":"error","error":"No apikey specified"}` body is a **pass** (the API is serving); 5xx is `down`; anything that is not MillionVerifier's JSON is `unknown`. |
| `quota` | Signed `GET /api/v3/credits`: `down` at zero credits, else `ok`, with the figure as quota. The vendor exposes no alert threshold, so there is no `degraded` band; an error body is `unknown`. |
| `auth:api-key` | Derived from the Auth `test` hook. |

## Not covered (and why)

- **Per-address bulk results as JSON**: the vendor only offers the downloadable report, returned here
  as text in `content`. A very large file is a very large output; narrow it with `filter`.
- **Upload formats other than the vendor's own example** (`.txt`, one address per line): the
  reference does not list the accepted file types, so the app writes `.txt` itself and passes through
  whatever file you supply (name and content type are yours).
- **Reselling, webhooks, dashboard-only features** (lists/exports in the web app, Chrome extension,
  integrations): no documented REST endpoints.

## Findings

- **Every error is HTTP 200.** A wrong key, a missing key, a missing email, too few credits and an
  unknown file all answer `200` with a JSON `error` string (`apikey_not_found`, `No apikey specified`,
  `invalid_api_key`, `empty_api_key`, `insufficient_credits`, `file_not_found`, ...). A status-code
  check, in the connection test or a health probe, calls a revoked key healthy. The client reads the
  body. A file record carries its own `error` next to `file_id`; that is data, not a failed request.
- **Two hosts, two names for one key** (`api=` vs `key=`), with no header option, and sending the
  wrong name looks exactly like sending none. The two APIs also disagree on error vocabulary
  (`apikey_not_found` vs `invalid_api_key`).
- **`download` is a file on success and JSON on failure** (still HTTP 200), and `stop` and `delete`
  are GET requests with side effects. The test key returns random verdicts: a probe returned
  `result: "invalid"` with `resultcode: 4` (the code table says 6), so treat `result` as the verdict
  and `resultCode` as secondary.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

The icon is MillionVerifier's own favicon (`www.millionverifier.com/content/images/2026/04/favicon.ico`,
16x16 and 32x32 frames), the only mark the vendor serves.
