# Elastic Email

Send transactional and bulk email through Elastic Email and manage its contacts, lists,
templates, campaigns, suppressions and statistics. Verified 2026-10-06 against the vendor's
OpenAPI 3.0.3 document (`https://elasticemail.com/api/redoc-spec/api-v4`, 74 paths). This is
**API v4**, host `api.elasticemail.com`, prefix `/v4` — not the legacy v2 API.

- **Triggers** — 7 (1 poll, 6 webhook)

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

## Triggers

| trigger — title | mechanism | vendor event or wrapped action | what the run gets |
|---|---|---|---|
| `new-list` — New List | poll | `list-list` | each contact list newly created in the account |
| `email-sent` — Email Sent | webhook (API-registered) | notification `Sent` | the transaction id, recipient, sender, subject, channel and time |
| `email-opened` — Email Opened | webhook (API-registered) | notification `Opened` | the same, plus the recipient's IP address and country |
| `email-clicked` — Email Clicked | webhook (API-registered) | notification `Clicked` | the same, plus the clicked link |
| `email-unsubscribed` — Email Unsubscribed | webhook (API-registered) | notification `Unsubscribed` | the transaction id, recipient, subject, channel and time |
| `email-error` — Email Bounced or Failed | webhook (API-registered) | notification `Error` (bounces included) | the same, plus the bounce category |
| `abuse-report` — Abuse Report | webhook (API-registered) | notification `AbuseReport` (complaints included) | the transaction id, recipient, subject, channel and time |

### New List (poll)

The v4 `GET /lists` "returns all your existing lists". Each check asks for up to 5000, diffs the
answer against the previous check and emits only additions (an answer that fills the request fails
the check with an error naming the cap). The first check only records what exists. Contacts,
campaigns, templates and suppressions page by `limit`/`offset` with no documented created-since filter
or newest-first order, so they have no poll trigger.

### Webhook triggers

**Setup.** Nothing to paste. Subscribing runs `POST /v4/webhook` with the host's callback URL, the one
`NotificationFor…` flag the trigger is for, `EnableSigning: true` and `DeliveryMethod: "PostJson"`;
Elastic Email answers with the webhook's `WebhookID` and its `SigningSecret` once, and both are kept in
the subscription's state. Unsubscribing runs `DELETE /v4/webhook/{id}` (a webhook already gone counts as
deleted). The API key needs the `ModifyWebNotifications` access level, and Elastic Email offers
notification webhooks on its PRO plans only. When a webhook is created Elastic Email sends one sample
`Opened` notification for `test@test.com` to the URL (signed with a secret the host does not hold yet);
it never starts a run.

**Trust model.** Elastic Email signs a webhook created with signing. Each delivery carries
`X-ElasticEmail-Timestamp` (Unix seconds), `X-ElasticEmail-Signature` (a comma-separated list of
`v1=<hex>` entries) and `X-ElasticEmail-Webhook-Id`. The signature is the HMAC-SHA256, keyed by the
subscription's secret, of `<timestamp>\nPOST\n<request target>\n<raw body>`, where the request target is
the path and query of the callback URL the webhook was registered with. The app verifies it before it
parses the body (constant-time compare, any one `v1=` entry may match) and refuses a timestamp more
than five minutes from its clock. A missing or wrong signature, a stale timestamp, an absent raw body
or an unset secret refuses the delivery (one failed row, no run). If Elastic Email ever returns a
webhook without a secret, the app deletes it and refuses to subscribe. Elastic Email retries a
rejected delivery for up to 24 hours, re-signed each time, so the five-minute window never blocks a
retry. Because the signature covers the request target, the public URL the host registered must be the
one deliveries arrive on (a proxy that rewrites the path breaks verification).

Docs (verified 2026-11-10):
https://help.elasticemail.com/en/articles/17578018-webhook-request-signing-and-json-delivery ,
https://help.elasticemail.com/en/articles/4804685-notification-settings ,
https://elasticemail.com/api/redoc-spec/api-v4
