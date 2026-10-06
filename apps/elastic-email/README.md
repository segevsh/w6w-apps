# Elastic Email

Send transactional and bulk email through Elastic Email and manage its contacts, lists,
templates, campaigns, suppressions and statistics. Verified 2026-10-06 against the vendor's
OpenAPI 3.0.3 document (`https://elasticemail.com/api/redoc-spec/api-v4`, 74 paths). This is
**API v4**, host `api.elasticemail.com`, prefix `/v4` — not the legacy v2 API.

## Auth

One method, **`api-key`**: the `X-ElasticEmail-ApiKey` header (the spec's `apikey` scheme), set only
in `sign`. Create a key under Settings > Manage API Keys; its access level (ViewReports,
ModifyContacts, SendHttp, …) decides which actions work.

The credential probe is `GET /v4/statistics?from=<today>` — it returns only counters, never the key.
It needs `ViewReports`; a send-only key is reported as "accepted but lacks ViewReports", not broken.
Measured: a missing or unknown key answers **HTTP 400** `{"Error":"APIKey Expired"}` (not 401), and
the vendor has no machine error code, so verdicts are classified from the `Error` text, and a 2xx
that is not a statistics object is never a pass.

## Actions (20)

| Area | Actions |
|---|---|
| Email | `email-send` (`POST /emails/transactional`), `email-send-bulk` (`POST /emails`), `email-status` (`GET /emails/{id}/status`) |
| Contacts | `contact-add`, `contact-get`, `contact-list`, `contact-delete` |
| Lists | `list-list`, `list-create`, `list-contacts`, `list-add-contacts`, `list-remove-contacts` |
| Templates | `template-list`, `template-get` |
| Campaigns | `campaign-list`, `campaign-get` |
| Suppressions | `suppression-list`, `suppression-get`, `suppression-delete` |
| Statistics | `statistics-get` |

Sends are not idempotent (the API offers no idempotency key). List endpoints answer a bare JSON array;
the list actions return `{ items, count }`. Page with `limit` + `offset` (add `count` to the offset).

## Not yet covered

Left out deliberately, not forgotten — all are in the OpenAPI file: contact update (`PUT`),
import/export and bulk delete (`/contacts/import|export|delete`), list get/update/delete, template
create/update/delete, campaign create/update/delete/pause and automation trigger, segments, files,
domains, inbound routes, webhooks, API keys, SMTP credentials, subaccounts, email verifications,
event logs and channel statistics, bounce/complaint/unsubscribe add and import, `emails/mergefile`,
`emails/{msgid}/view`. The `listnames` (contact-add) and `scopeType`/`templateTypes` (template-list)
array query parameters are sent repeated (`a=1&a=2`, the OpenAPI default); this could not be
measured live without a key.

## Health checks

- **`service`** — Atlassian Statuspage at `https://elasticemail.statuspage.io/api/v2/summary.json`
  (`page.name` "Elastic Email Status Page", `page.id` `qqs7zd1q0z5q`, checked on every run). The
  verdict comes from the `API.ELASTICEMAIL.COM` component (`nfj1bq4byr9f`); the web app, SMTP and
  inbound components are detail only. The page's incident list is empty and its settings were last
  touched in 2021, so a green reading is weak evidence.
- **`api`** — unsigned reachability: `GET /v4/statistics` answering the vendor's `{"Error": …}` JSON
  is a pass (proves DNS, TLS and the auth layer), 5xx or a non-JSON body is down.
- **`auth:api-key`** — derived from the auth `test` hook.
- **`quota`** — declared `unavailable`, `informational`: no rate-limit header and no usage endpoint
  exist in the spec or on live responses.

## Quirks

- Property names are PascalCase; errors are a single `{"Error": "text"}` string.
- Names (lists, templates, campaigns) are path segments and are percent-encoded.
- `templates` requires `scopeType` (Personal and/or Global).
- Contacts are added as an array body (up to 1000); this app sends one at a time.
- `lists/{name}/contacts` adds EXISTING contacts only, by emails or a segment rule, never both.

## Icon

`assets/icon.svg` wraps the vendor's own favicon, byte-for-byte: `https://elasticemail.com/favicon.ico`
(5,920 bytes) is actually a 270x270 RGBA PNG, embedded unmodified as a base64 `<image>` (verified by
decoding it back and comparing md5 `b64a23a96eb09e7823dea2481513781b`). `/favicon.svg` and
`/apple-touch-icon.png` answer an HTML shell, not an image. Nothing was redrawn.
