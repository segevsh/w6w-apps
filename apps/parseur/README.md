# Parseur

Turn incoming emails and documents into structured JSON with Parseur's AI mailboxes, and manage the
templates, webhooks and custom downloads that shape what comes out.

- **Categories** — ai, documents, productivity
- **Auth methods** — api-key
- **Actions** — 29
- **Health checks** — 2 (`service`, `quota`), both declared absences + the derived `auth:api-key`
- **Egress allowlist** — `api.parseur.com`
- **Website** — https://parseur.com/
- **API docs** — https://developer.parseur.com
- **OpenAPI** — https://api.parseur.com/openapi.json

Parseur receives documents — forwarded emails, direct file uploads, or raw email/text posted straight
to the API — into a **mailbox** (called a "parser" throughout the API and this app's code, to match
the wire), and an AI or layout template extracts the fields you configure into a **document** record.

> **Everything below was verified against Parseur's own sources on 2026-09-15** — its
> machine-readable OpenAPI 3.1 document
> ([`api.parseur.com/openapi.json`](https://api.parseur.com/openapi.json), 120,307 bytes, `info.title`
> "Parseur", 21 paths / 29 operations), the hand-written guides at
> [`developer.parseur.com`](https://developer.parseur.com) (Authentication, Upload emails and
> documents, Pagination/Searching/Sorting, Rate limits), and live probes against `api.parseur.com`.
> Nothing here came from a third-party integration directory.

## The findings that would have cost someone a day

### 1. The generated OpenAPI security description is stale — do not send `Token `

`components.securitySchemes.TokenAuth.description` in the OpenAPI document says to send
`Authorization: Token YOUR_API_KEY`. The current, hand-written
[`authentication.md`](https://developer.parseur.com/authentication.md) guide explicitly supersedes
that:

> In previous versions of this documentation we recommended to prefix your API key with the string
> literal `Token`... While prefixing your API key with `Token` still works, it is not required any
> longer.

This app follows the current guide and sends the bare key (`auth/api-key.ts`). A `Token `-prefixed
implementation copied from the OpenAPI document's own description would still technically work, but
it's testing against documentation the vendor itself says is outdated.

### 2. Two operations answer an async "please wait", never the result

`POST /document/{id}/process` (`document-reprocess`) and `DELETE /parser/{id}` (`mailbox-delete`)
both answer `{"notification_set": {"info": [...]}}` — a fixed acknowledgement string, never the
reprocessed Document or a confirmation the mailbox is actually gone. The upload guide states the same
thing for the whole API: "a successful response means the document was received, not that the
document was successfully processed." Poll `document-get` / `mailbox-list` afterwards for the real
outcome.

### 3. An upload's `DocumentID` is not a document's `id`

`POST /parser/{id}/upload`'s response calls its identifier `DocumentID` — a hex string like
`"1e2e34cba5c678a9012f3e456c789a0f"` — completely unlike the numeric `id` every read/write document
action (`document-get`, `document-delete`, `document-skip`, ...) uses. The vendor's own guide says to
use it via the "DocumentID Metadata field" mechanism to correlate later, not as a literal path
parameter. `document-upload.ts` returns it verbatim and documents the distinction rather than
pretending the two are interchangeable.

### 4. `POST /email` silently drops a document sent to the wrong address

Parseur routes a posted "email" to a mailbox by matching the mailbox's own inbound address —
`{email_prefix}@{email_domain}` (e.g. `acme@in.parseur.com`) — against `recipient`, `to`, `cc` **or**
`bcc`. The guide states it plainly: "your mailbox address must appear in at least one of recipient,
to, cc, or bcc." Posting to an arbitrary address still answers `201` `{"message":"OK"}` — there is no
error to notice. Build the address from a mailbox's `email_prefix` (`mailbox-get`) and the account's
`email_domain` (`bootstrap-get`).

### 5. No plan-usage or rate-limit-headroom endpoint is reachable at all

The OpenAPI document declares an `Account` schema with real billing fields (`current_period`,
`monthly_processed_document_max`, ...) — but **no path in the document references it**. There is no
`/account` or `/me` operation of any kind. Separately, [`api-rate-limits.md`](https://developer.parseur.com/api-rate-limits.md)
documents a fixed "5 requests/second per IP, burst 20" ceiling in prose, but a live 403 response
carried no `X-RateLimit-*`/`RateLimit-*`/`Retry-After` header of any kind. Both are declared
unavailable in `health/quota.ts` rather than guessed at.

### 6. Parseur publishes no status page

`status.parseur.com` does not resolve (DNS times out). `parseur.statuspage.io` and
`parseur.instatus.com` both resolve — but to the *Statuspage*/*Instatus* vendors' own marketing
pages, the unclaimed-decoy pattern this pack has documented for several other apps.
`parseur.com/status` bare-404s, and the help center links no status page. Declared absent in
`health/service.ts`.

## Auth

One method: `api-key`, type `apiKey`, header `Authorization`, **no prefix** — see finding 1.

A Parseur API key is account-wide: it authorizes every mailbox, document and template the account
owns. Parseur publishes no OAuth surface, so the key is the whole authentication story.

### The probe is `GET /`, exactly as the vendor's own docs recommend

`authentication.md` names the API root as "the quickest smoke test" and documents its success body —
`{"document": "...", "parser": "..."}`, a fixed routing map, not account data. Confirmed live on
2026-09-15:

| Request                        | Status | Body                                              |
| ------------------------------- | ------ | -------------------------------------------------- |
| No `Authorization` header       | 403    | `{"non_field_errors":"Not authenticated"}`          |
| `Authorization: <garbage>`      | 403    | `{"non_field_errors":"Authentication failed"}`      |

Both arrive as **403** — Parseur never uses 401 for this — and the two failure modes are
distinguished only by the body, never by status code alone, which is why `test` reads
`non_field_errors` instead of trusting the 403.

There is no `afterConnect`: the whole documented surface has no `/account`, `/me` or `/whoami`
operation of any kind, so there is nothing to fetch to label a Connection with beyond the fixed app
name.

## Actions

29 actions. `resource` groups them in the editor.

| Key                     | Type    | Endpoint                                                   |
| ------------------------ | ------- | ----------------------------------------------------------- |
| `mailbox-list`            | search  | `GET /parser`                                                |
| `mailbox-create`          | perform | `POST /parser`                                               |
| `mailbox-get`             | read    | `GET /parser/{id}`                                           |
| `mailbox-update`          | perform | `PUT /parser/{id}`                                           |
| `mailbox-delete`          | perform | `DELETE /parser/{id}`                                        |
| `mailbox-schema-get`      | read    | `GET /parser/{id}/schema`                                    |
| `mailbox-copy`            | perform | `POST /parser/{id}/copy`                                     |
| `document-list`           | search  | `GET /parser/{id}/document_set`                              |
| `document-get`            | read    | `GET /document/{id}`                                         |
| `document-delete`         | perform | `DELETE /document/{id}`                                      |
| `document-log-list`       | search  | `GET /document/{id}/log_set`                                 |
| `document-upload`         | perform | `POST /parser/{id}/upload`                                   |
| `email-create`            | perform | `POST /email`                                                |
| `document-reprocess`      | perform | `POST /document/{id}/process`                                |
| `document-skip`           | perform | `POST /document/{id}/skip`                                   |
| `document-copy`           | perform | `POST /document/{id}/copy/{target_mailbox_id}`                |
| `template-list`           | search  | `GET /parser/{id}/template_set`                              |
| `template-get`            | read    | `GET /template/{id}`                                         |
| `template-delete`         | perform | `DELETE /template/{id}`                                      |
| `template-copy`           | perform | `POST /template/{id}/copy/{target_mailbox_id}`                |
| `webhook-create`          | perform | `POST /webhook`                                              |
| `webhook-enable`          | perform | `POST /parser/{mailbox_id}/webhook_set/{id}`                 |
| `webhook-disable`         | perform | `DELETE /parser/{mailbox_id}/webhook_set/{id}`                |
| `webhook-delete`          | perform | `DELETE /webhook/{id}`                                       |
| `export-config-list`      | search  | `GET /parser/{id}/export_config`                             |
| `export-config-create`    | perform | `POST /parser/{id}/export_config`                            |
| `export-config-update`    | perform | `PATCH /parser/{mailbox_id}/export_config/{id}`               |
| `export-config-delete`    | perform | `DELETE /parser/{mailbox_id}/export_config/{id}`              |
| `bootstrap-get`           | read    | `GET /bootstrap` (public — `requiresAuth: false`)             |

"Custom downloads" in the Parseur app UI are the `ExportConfig` resource (`export-config-*` here).

### Idempotency

**Every create, upload, submit, reprocess and copy action is `idempotent: false`**
(`mailbox-create`, `mailbox-copy`, `document-upload`, `email-create`, `document-reprocess`,
`document-copy`, `template-copy`, `webhook-create`, `export-config-create`) — none of Parseur's write
endpoints documents an idempotency-key mechanism of any kind (unlike, say, Apify's webhooks), so a
retried call is a second real mailbox/document/webhook/download, or a second billed reprocessing run.

**Update, delete, enable/disable and skip actions are `idempotent: true`** — `PUT`/`PATCH`/`DELETE`
and skip all leave the same end state no matter how many times they run.

### Notes on individual actions

- **`mailbox-create` / `mailbox-update`.** The `Parser` object has well over 80 fields (sender
  allow/deny lists, split-page rules, per-field export flags, ...). Both actions expose the handful a
  workflow most plausibly sets directly, plus an "Extra fields" JSON escape hatch for the rest —
  merged **under** the named fields, so a value typed into a named field always wins over the same key
  repeated in Extra fields.
- **`document-list`'s `withResult` toggle** maps to the vendor's `with_result=true`, the only way to
  get every document's parsed `result` string inline in one list call instead of one `document-get`
  per document.
- **`document-upload` / `email-create` custom parameters.** Both endpoints accept extra query-string
  parameters that get merged into the parsed result once processing finishes (`?user.name=John` adds
  `"user.name": "John"`); repeating a key builds an array. Both actions expose this as a JSON object
  param and translate it to the wire's repeated-key form.
- **`email-create`'s message headers** are documented as an array of `[name, value]` pairs
  (`message_headers`). This action accepts a plain `{"X-Header": "value"}` object for ergonomics and
  converts it — see `toMessageHeaderPairs` in `actions/email-create.ts`.
- **`webhook-enable` / `webhook-disable`** answer the whole mailbox record's `webhook_set` /
  `available_webhook_set`, not a `Webhook` object — both actions return only those two fields.
- **`mailbox-copy` / `document-copy` / `template-copy`** all document a bare `201` with **no response
  schema at all**. The actions pass whatever body comes back through as `result` rather than assuming
  a shape.
- **Download links carry an embedded access token, by design.** A `Document`'s
  `original_document_url`, `ocr_ready_url`, `json_download_url`, `csv_download_url` and
  `xls_download_url` (and an `ExportConfig`'s `csv_download`/`xls_download`) each embed a per-resource
  secret directly in the URL path — Parseur's own bootstrap config even labels the related fields "no
  auth required for download". That's the intended mechanism for fetching parsed output outside the
  API, not a credential leak on the scale of, say, a proxy password: it grants read access to one
  document's own data, which is the whole point of these fields, so this app returns them unmodified.
  Treat a stored `Document`/`ExportConfig` record as carrying a shareable link, the same as you would
  treat any other signed download URL.
- **No metered-usage endpoint.** `health/quota.ts` explains why plan headroom cannot be read at all
  through this API (see finding 5 above).

## Rate limits

5 requests/second per IP, burst allowance 20 (`GET`/`POST`/etc. alike) — documented in prose only, no
response header of any kind was observed carrying the current count. Exceeding it answers
`429 Too Many Requests`; `lib/client.ts`'s error formatter adds a retry hint on that status.
