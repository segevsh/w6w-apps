# Docparser

Send documents to Docparser and read back the data it parsed, from a workflow: list parsers and
their model layouts, import a document by public URL or as base64 content, check its processing
status, fetch parsed results for one document or many, and re-parse or re-integrate documents.
Built on `https://api.docparser.com` (reference: https://docparser.com/api/).

App id `io.w6w.docparser` · categories `documents`, `ai` · egress `api.docparser.com` only (the
status host is allowlisted on the health check itself, not on the app).

## Auth setup

One method, **API Key** (`api-key`). In Docparser open **Account > API Settings**
(`app.docparser.com/myaccount/api`), copy the secret key and paste it into the connection. The key
is sent as the `api_key` header by `sign`. Docparser also accepts HTTP Basic (key as username), a
post field and a query parameter; the header form is used because it keeps the key out of URLs.

The connection test calls `GET /v1/ping`, which answers `{"msg":"pong"}` and carries no credential.
An invalid key answers HTTP 403 `{"error":"api key not valid"}` (probed live); the verdict is read
from the body (`msg === "pong"`, or an error mentioning the key), never from the status alone.

## Actions (10)

| Group | Actions |
| --- | --- |
| Account | `ping` |
| Parsers | `parser-list`, `parser-model-list` |
| Documents | `document-import-url`, `document-upload-content`, `document-status-get`, `document-reparse`, `document-reintegrate` |
| Parsed data | `results-get`, `results-list` |

Things worth knowing:

- **API versions are per route.** URL import (`/v2/document/fetch`) and status
  (`/v2/document/status`) are v2; everything else is v1.
- **Request bodies are form-encoded**, not JSON. Base64 content survives because it is
  percent-encoded. The docs show the content upload as a form post; the exact encoding the server
  prefers (urlencoded vs multipart) is not stated, and urlencoded is used because the reparse
  example uses `-d` and the key can be sent as a post field.
- **Imports are asynchronous.** URL import returns `document_id`; content upload returns `id`.
  Poll `document-status-get` (`processing_in_progress`, `processed_at`, `failed_jobs`) before
  fetching results.
- **Result lists are bare arrays**, wrapped as `{items, count}`. They are not paginated: use
  `limit` (default 100, max 10,000) or `uploaded_after` / `processed_after` with `date`.
- **Rate limits:** 60 calls/minute for one document's results, 30 for the multi-document list.
- Results only include fully processed documents unless `includeProcessingQueue` is set.

## Not covered

The API reference documents no other routes. Not implemented: upload by multipart file (the
`file` field; a workflow has no local path, use content upload instead). Parser creation/editing,
account/quota endpoints and webhook management are not in the API reference. The reference was
last updated by the vendor in 2018 with v2 routes added later, so response shapes beyond the
documented examples were not verifiable without a key.

## Icon

`assets/icon.png` is the vendor's own `https://app.docparser.com/assets/img/apple-touch-icon.png?v=2`
(PNG, 180 x 180, 1,917 bytes), saved verbatim.

## Health checks

- **`service`**: reads `https://status.docparser.com/api/v2/summary.json`. The page is real and is
  Atlassian Statuspage (`page.name` "Docparser", Statuspage v2 schema; a nonsense sibling path is a
  404). The verdict is pinned to its **HTTP REST API** component; Docparser Application, Webhook
  Integrations and Email Reception Server are reported but never move it.
- **`auth:api-key`** (derived from the auth `test` hook): `GET /v1/ping` as above.
- No quota check: the API only reports quota inside upload responses (`quota_left`,
  `quota_refill`), not on a read endpoint.
