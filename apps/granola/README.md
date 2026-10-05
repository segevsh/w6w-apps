# Granola

Read Granola meeting notes, transcripts and folders, manage webhook endpoints, and administer legal
holds and the audit log, on the **Granola public API** (`public-api.granola.ai/v1`).

- **Categories** — ai, productivity, legal
- **Auth methods** — api-key (HTTP bearer, `grn_...`)
- **Actions** — 17
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `public-api.granola.ai` (the `service` check adds `status.granola.ai` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.granola.ai/
- **API docs** — https://docs.granola.ai/
- **OpenAPI** — https://docs.granola.ai/api-reference/openapi.json
- **Status page** — https://status.granola.ai/

> Everything here was verified on 2026-10-05 against Granola's own OpenAPI 3.1 document (all 17
> operations are implemented; nothing was left out) and live probes of `public-api.granola.ai` and
> `status.granola.ai`.

## Actions

| Group         | Actions                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| Notes         | `note-list`, `note-get`, `transcript-get`                                          |
| Folders       | `folder-list`                                                                      |
| Audit         | `audit-event-list`                                                                 |
| Webhooks      | `webhook-create`, `webhook-list`, `webhook-update`, `webhook-delete`               |
| Legal holds   | `legal-hold-create`, `-list`, `-get`, `-update`, `-release`                        |
| Custodians    | `custodian-add`, `custodian-list`, `custodian-remove`                              |

## Things worth knowing

1. **Host.** The API is `public-api.granola.ai`. `api.granola.ai` is not it.
2. **Auth is a plain bearer key.** `Authorization: Bearer grn_...`, created in the desktop app under
   Settings > Connectors > API keys (admins can issue workspace keys). Scope (personal, public,
   workspace) belongs to the key; the app never chooses it. A 401 carries a body `code`:
   `MISSING_API_KEY` (no header) or `INVALID_API_KEY` (bad format); the auth test classifies from
   that code, not the status alone. The probe is `GET /v1/folders?page_size=1`: Granola has no
   whoami, and folders carry no user content and never echo the key.
3. **Get Note can answer 413 `TRANSCRIPT_TOO_LARGE`** when `include=transcript` does not fit. The
   action then re-reads the note without it and sets `transcript_too_large: true`; use
   `transcript-get` to page the transcript (up to 100 items per page).
4. **A webhook's `signing_secret` is returned once**, by `webhook-create` (Standard Webhooks
   HMAC-SHA256). Store it from that response; `webhook-list` never shows it. For endpoints you did
   not create, `url` is reduced to its origin (`url_redacted: true`). A 404 on the webhook routes
   means the webhooks API is not enabled for the workspace.
5. **Paging.** Cursors are opaque; stop on `hasMore`, not on page length. Notes, folders, audit
   events, holds and custodians cap at 30 per page (transcripts 100). Webhook list is unpaginated.
6. **Dates** accept `YYYY-MM-DD` or an ISO 8601 timestamp. Audit dates must be within the one-year
   retention window (earlier is a 400). Audit `data` is camelCase and varies with `action`.
7. **`private_notes_*`** on a note are only filled when the key belongs to the note's owner.
8. **Legal holds.** Release is terminal (no un-release) and idempotent; adding custodians is
   idempotent (1-100 per call, by email and/or `usr_` id); removal takes the custodian *entry* id
   (`lhc_...`) from `custodian-list`, and keeps the history with `removed_at`.

## Idempotency

`legal-hold-release`, `custodian-add`, `webhook-update` and `legal-hold-update` are marked
idempotent. `webhook-create`, `webhook-delete`, `legal-hold-create` and `custodian-remove` are not:
creates add another row, and the spec documents 404/409 for repeats.

## Health

- **`service`** reads `status.granola.ai/api/v2/summary.json` (an incident.io page; checked real:
  `page.name` Granola, a nonsense sibling path 404s, and it has a dedicated `API and webhooks`
  component). The verdict is that one component only; the page also covers Desktop, Mobile, MCP and
  Web notes, which must not mark the REST API down. incident.io spells Statuspage's `major_outage`
  as `full_outage`; both map to down. A broken or unrecognisable page is `unknown`, never `down`.
- **`quota`** is declared unavailable with `informational` severity: the OpenAPI document has no
  rate-limit headers and no 429 response, and states no ceiling.
- **`auth:api-key`** is derived from the auth `test` hook.

## Icon

`assets/icon.svg` is byte-identical (md5 `1ea7f3c0d727...`) to the file served at
`https://www.granola.ai/favicon/favicon.svg`, the `<link rel="icon" type="image/svg+xml">` on
granola.ai. It is the vendor's own mark (a RealFaviconGenerator wrapper around an embedded PNG).
Format with `deno task fmt`, never bare `deno fmt`, which would rewrite it.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
