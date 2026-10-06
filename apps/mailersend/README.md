# MailerSend

Transactional email on the **MailerSend API v1**: send and bulk-send, read message and activity
records, manage templates, domains, sender identities, suppression lists and webhooks, and pull
analytics.

- **Categories** — email, communication
- **Auth methods** — api-token (Bearer)
- **Actions** — 43
- **Egress allowlist** — `api.mailersend.com`
- **Website** — https://www.mailersend.com
- **API docs** — https://developers.mailersend.com
- **Status** — https://status.mailersend.com

Endpoints, parameters and limits were read from the developer docs on **2026-10-06** and the live
behaviours below were probed against `api.mailersend.com` the same day. The docs site is now a
Next.js app (it used to be VuePress); the general pages (`/general`) 404 but the `.html` variants
still serve the content.

## Things that cost time

1. **Sending answers 202 with an EMPTY body.** `POST /v1/email` returns the message id only in the
   `x-message-id` response header; `x-send-paused: true` means the domain is paused and the mail
   was accepted but will not go out. If every recipient is suppressed there is no id at all, and
   when some are suppressed the 202 carries a JSON `warnings` array. Send Email surfaces all three
   as `{ accepted, messageId, paused, warnings }`.
2. **Array filters must be `status[]=sent`.** `?status=sent` is a 422. The app always encodes
   arrays with brackets.
3. **A token is scoped per area and per domain, and there is no whoami.** A token that can send may
   get `403 #MS40301` on `/domains`. The connection test therefore probes `GET /v1/domains` and
   treats that 403 as a live token. An unauthenticated and a wrong-token request are byte-identical
   (`401 {"message":"Unauthenticated."}`).
4. **`GET /v1/emails` is the odd list.** It requires `domain_id`, `date_from` and `date_to`, allows
   `limit` up to 1000 and `page` up to 100, and returns no total (follow `links.next`). Every other
   list is `limit` 10-100.
5. **Rate limits differ per route:** 60/min in general, 120/min for `/email`, 10/min for
   `/bulk-email`, and 10/min shared by `/activity` and `/emails`, plus a daily plan quota. A 429
   carries `retry-after`, which the error message repeats.
6. **No idempotency key is documented**, so sends and creates are declared non-idempotent.
7. **Webhook responses carry a `signing_secret`** that is not in the documented schema. The
   webhook actions strip any key containing "secret" at any depth.

## Auth

`api-token` — `Authorization: Bearer <token>`, set only in `sign`. Create it under Integrations >
API tokens and grant just the scopes the workflows need. The connection test never echoes the token.

## Actions

| Area | Actions |
|---|---|
| Sending | send-email, send-bulk-email, get-bulk-email-status |
| Email records | list-emails, get-email, list-activities, get-activity, list-messages, get-message |
| Scheduled | list-scheduled-messages, get-scheduled-message, delete-scheduled-message |
| Templates | list-templates, get-template, create-template, update-template, delete-template |
| Domains | list-domains, get-domain, create-domain, update-domain-settings, get-domain-dns-records, verify-domain, delete-domain |
| Sender identities | list-sender-identities, get-sender-identity, create-sender-identity, update-sender-identity, resend-sender-identity-verification, delete-sender-identity |
| Recipients | list-recipients, get-recipient, delete-recipient |
| Suppressions | list-suppressions, add-suppressions, delete-suppressions (one `type` select over blocklist, hard-bounces, spam-complaints, unsubscribes, on-hold-list; on-hold cannot be added to) |
| Analytics | get-analytics-by-date, get-opens-analytics (`breakdown`: country, ua-name, ua-type) |
| Webhooks | list-webhooks, get-webhook, create-webhook, update-webhook, delete-webhook |

List actions return the vendor page verbatim (`{ data, links, meta }`).

## Health checks

- `service` — `status.mailersend.com` (an incident.io page serving the Statuspage v2 shape). The page
  id is pinned; the worst of Email sending API, Bulk endpoint and MailerSend APP decides.
- `api` — unauthenticated `GET /v1/domains`; the documented JSON 401 proves the API is serving.
- `quota` — signed, `informational`: remaining daily requests (`x-apiquota-remaining`) and per-minute
  budget from the probe's headers. The headers are documented only in a 429 example, so a missing
  header reads `unknown` rather than an invented state.

## Not covered

`/v1/api-quota` (response shape undocumented), API tokens, SMTP users, account users, DMARC and
blocklist monitoring, inbound routing, email verification, the SMS and WhatsApp APIs, by-email
variants of sender-identity routes, per-domain recipient routes and bulk-email webhooks.

## Icon

`assets/icon.svg` is the vendor favicon (`https://www.mailersend.com/favicon/favicon.svg`),
verbatim, 1079 bytes. Format with `deno task fmt`, never bare `deno fmt`.
