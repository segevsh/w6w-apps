# Kudosity

Send SMS, MMS, WhatsApp and RCS messages, check RCS reachability, read message history and manage
webhooks on **Kudosity's Transmit Message API v2**.

- **Categories** — communication, marketing
- **Auth methods** — api-key (`x-api-key` header)
- **Actions** — 18
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.transmitmessage.com`
- **Website** — https://www.kudosity.com/
- **API docs** — https://developers.kudosity.com/reference/transmit-message-api
- **Status page** — none (`status.kudosity.com` does not resolve)
- **Icon** — `assets/icon.svg` is Kudosity's own `https://kudosity.com/favicon/favicon.svg`,
  byte-for-byte (967 B).

## Actions

| Area | Actions |
| --- | --- |
| SMS | `sms-send`, `sms-get`, `sms-list` |
| MMS | `mms-send`, `mms-get` |
| WhatsApp | `whatsapp-send` (text, template, custom), `whatsapp-get`, `whatsapp-list` |
| RCS | `rcs-send` (text, media), `rcs-get`, `rcs-list`, `rcs-capability-check` |
| Webhooks | `webhook-list`, `webhook-get`, `webhook-create`, `webhook-update`, `webhook-delete` |
| Senders | `sender-registration-list` |

## Connecting

Create an API key in the Kudosity dashboard (Settings > API Settings) and paste it as the API Key.
The connection test calls `GET /v2/webhook` and passes only on the documented `{"webhooks": [...]}`
body.

## Notes

- **Two response families under `/v2`.** SMS, MMS and webhooks answer the bare resource with
  `{"error": "text"}`; WhatsApp, RCS and senders answer `{data, meta}` with RFC 9457 errors. The
  actions unwrap both, so output is always the resource (lists return `messages`/`smses`,
  `webhooks` or `registrations`, plus `pagination` where the vendor gives it).
- **Paging differs.** SMS and sender registrations are page-numbered; WhatsApp and RCS lists use
  opaque cursors (`pagination.next_cursor`).
- **Webhook updates are a full replace.** The vendor resets omitted fields to defaults.
  Subscriptions go in `filter.event_type`; the top-level `event_type` is deprecated and never sent.
- **Deprecations.** The only deprecated fields in the v2 reference are `is_sandbox` (responses and
  request bodies) and the top-level webhook `event_type`. Neither is used.
- **RCS send is beta** per the vendor and may change.

## Not covered

- The legacy **Transmit SMS v1** API (`api.transmitsms.com`, HTTP Basic key and secret). It is a
  separate credential and a second auth method; the v2 API covers sending and webhooks.
- Sender registration creation, verification codes and deletion (`POST /v2/senders/registrations`
  and siblings) — registration is a one-off onboarding step.
- CSV export of SMS lists (`format=CSV`).

## Health

- `service` — unsigned `GET /v2/webhook`. The gateway answers `401 {"status": "..."}`; that
  schema-correct refusal passes. 5xx or a network failure is `down`; anything else is `unknown`.
- `quota` — declared unavailable (informational): no rate-limit headers, no usage or balance
  endpoint in the v2 reference.
- `auth:api-key` — derived from the connection test.
