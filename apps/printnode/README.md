# PrintNode

Cloud printing through the PrintNode API (`https://api.printnode.com`): send PDF or raw documents
to printers attached to computers running the PrintNode Client, track print job state, read USB
scales, and manage webhooks.

Every path, verb, parameter and field was verified on 2026-10-06 against PrintNode's own reference
(`https://www.printnode.com/en/docs/api/curl`) plus live unauthenticated probes of
`api.printnode.com`. The reference's only deprecation notices are on the `firstname` / `lastname`
fields of child-account creation, which this app does not cover.

## Auth

One method, **API Key**: HTTP Basic with the key as the username and an **empty** password
(`base64("<key>:")`; the colon is part of the value). Stamped by `sign` only. Create keys in the
PrintNode dashboard; use one per connection so it can be revoked on its own.

The connection check is `GET /noop` — the vendor's "check credentials, do nothing else" endpoint,
which answers the JSON-encoded Request-Id. `GET /whoami` is deliberately **not** the probe: it
returns the account holder's name and email. (It does not echo the API key; that was checked.)
`afterConnect` reads `/whoami` once and keeps only the email and account id for the connection
label. The verdict is read from the body, never the status alone.

## Things that differ from what you would guess

- **Unusual response shapes.** Lists are bare arrays (the total is only in the `Records-Total`
  header; list actions return `{ items, count, total? }`). `POST /printjobs` answers a bare integer
  (wrapped as `{ printJobId }`). Deletes answer an array of affected ids. `/printjobs/states` is an
  **array of arrays**. Webhook create/update/delete answer the **whole webhook list**.
- **Webhooks return their `secret` in clear** on every read and write. It is removed before an
  action returns.
- **Bulk-delete forms are never built.** `DELETE /computers` and `DELETE /printjobs` with no id set
  remove everything; every delete/cancel action requires ids.
- **The live 401 does not match the docs.** Documented code `InvalidCredentials`; the API actually
  sends `{"code":"BadRequest","message":"API Key not found"}` (or `... header ('Authorization')
  missing`). Classify by message.
- **Singular vs plural paths.** Scales live under `/computer/{id}/scales` and
  `/computer/{id}/scale/{name}/{n}` (singular `computer`); webhooks are `/webhooks` to read and
  `/webhook` to write.
- **Sets** (`COMPUTER SET`, `PRINTER SET`, `PRINT JOB SET`) are comma-separated positive integers
  spliced into the path; the app validates them so nothing can escape the URL.
- **No idempotency key.** A retried print job prints twice, so `printjob-create` is not idempotent.
- **Pagination** is `limit` (default 100; this app prefills 25), `after` (id cursor) and `dir`
  (`asc`/`desc`, default newest first).
- **Rate limit:** 10 requests/second per account, bursts tolerated, then `429`.
- Scale data is kept 45 seconds; `mass[0]` is in micrograms.

## Actions (18)

| Key | Request | Description |
|---|---|---|
| `account-get` | `GET /whoami` | The account the key belongs to. |
| `computer-list` | `GET /computers` | Computers running the PrintNode Client. |
| `computer-get` | `GET /computers/{set}` | One or more computers by id. |
| `computer-delete` | `DELETE /computers/{set}` | Remove computers; returns ids removed. |
| `printer-list` | `GET /printers`, `GET /computers/{set}/printers` | Printers, with capabilities. |
| `printer-get` | `GET /printers/{set}`, `GET /computers/{set}/printers/{set}` | Printers by id. |
| `printjob-create` | `POST /printjobs` | Print a PDF or raw document (URL or base64) with print options. |
| `printjob-list` | `GET /printjobs`, `GET /printers/{set}/printjobs` | Print job history. |
| `printjob-get` | `GET /printjobs/{set}`, `GET /printers/{set}/printjobs/{set}` | Print jobs by id. |
| `printjob-cancel` | `DELETE /printjobs/{set}` | Cancel jobs not yet delivered. |
| `printer-printjobs-cancel` | `DELETE /printers/{set}/printjobs[/{set}]` | Cancel undelivered jobs on printers. |
| `printjob-states-list` | `GET /printjobs/states`, `GET /printjobs/{set}/states` | State history per job. |
| `scale-list` | `GET /computer/{id}/scales[/{name}]` | Latest scale readings. |
| `scale-get` | `GET /computer/{id}/scale/{name}/{n}` | One scale's latest reading. |
| `webhook-list` | `GET /webhooks` | Webhooks and delivery counters (secret removed). |
| `webhook-create` | `POST /webhook` | Register a webhook (max five). |
| `webhook-update` | `PATCH /webhook/{id}` | Change URL, secret or message types. |
| `webhook-delete` | `DELETE /webhook/{id}` | Delete a webhook. |

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service | Declared absence (informational): PrintNode publishes no status page. `status.printnode.com` does not resolve and `printnode.statuspage.io` redirects to statuspage.io's marketing site (unclaimed). |
| `api` | dependency | Unsigned `GET /ping`; the JSON string `"OK"` passes, as does a schema-correct PrintNode error object. 5xx or HTML is down. |
| `quota` | quota | Declared absence (informational): only a fixed 10 req/s limit, enforced by 429, no remaining/reset header. |
| `auth:api-key` | derived | From the auth `test` hook (`GET /noop`). |

## Not yet covered

Child-account / Integrator management (`POST/PATCH/DELETE /account`, `/account/state`,
`/account/controllable`, the `X-Child-Account-By-*` impersonation headers), account tags and API-key
descriptions (`/account/tag/*`, `/account/apikey/*`), client software downloads and client keys
(`/download/*`, `/client/key/*`), the `PUT /scale` test-scale simulator, and the websocket scales
API.

## Icon

`assets/icon.svg` is PrintNode's own mark, byte-for-byte as served from
`https://www.printnode.com/ui/images/printnode.svg` (md5 `3180b396bf35aa69df7b8886b5327c50`).
