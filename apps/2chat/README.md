# 2Chat

Send WhatsApp messages and statuses, manage contacts, groups, webhooks and connected numbers, and
send WhatsApp Business API (WABA) templates through [2Chat](https://2chat.co).

- **Categories** — communication, marketing
- **Auth methods** — api-key (`X-User-API-Key` header)
- **Actions** — 28
- **Egress allowlist** — `api.p.2chat.io` (the only host any hook calls)
- **Website** — https://2chat.co
- **API docs** — https://developers.2chat.co (Docusaurus; indexed by https://developers.2chat.co/llms.txt,
  the only real machine-readable index — `llms-full.txt` is the site's 404 shell). Every endpoint
  here was read from its reference page on 2026-10-06.

## Setup

1. In 2Chat, open **Developers → API Access** (https://app.2chat.io/developers?tab=api-access) and
   generate an API key.
2. Paste it into the connection. That is the whole credential — no OAuth, no scopes, one key per
   account.
3. To message anyone you also need a channel: connect a WhatsApp number at
   https://app.2chat.io/channels. A WhatsApp Web number is a real phone **paired by QR code**; a
   WABA number is a Meta Business API number. They are different channels with different actions
   (see below).

### API credits are billed per call

2Chat deducts **one API credit for every API call** from the plan's pool (billing guide), and
number checks have their own separate pool. A workflow that polls (`conversations-list`,
`channel-status-get`) spends credits on every poll — prefer a webhook (`webhook-subscribe`). The
`auth:api-key` test and the `quota` health check both call `GET /info`, so each costs a credit
too; `quota` is therefore polled at most every 15 minutes. The `service` check is unsigned (rejected at the gateway before any key is read, so it should
spend none — not measured against a billed account).

### WhatsApp Web numbers are paired phones, not the Cloud API

`message-send` and the group, status and number-check actions drive a phone you paired by QR code.
2Chat's own docs warn that WhatsApp can ban a number that messages cold contacts or creates many
groups; create the contact first (`contact-create`) before messaging a new number, and expect
WhatsApp's unpublished soft limits (about 30 group creations a day). `waba-*` actions are the
Business API: templates only outside the 24-hour window, free text only inside it.

## Actions

| Key | Type | Endpoint (under `/open`) | Description |
|---|---|---|---|
| `users-list` | read | `GET /users` | List the active users on the 2Chat account |
| `contact-create` | perform | `POST /contacts` | Create a contact |
| `contacts-list` | read | `GET /contacts` | List contacts, paginated |
| `contact-get` | read | `GET /contacts/{contact-uuid}` | Get one contact by UUID |
| `contact-update` | perform | `PUT /contacts/{contact-uuid}` | Edit a contact |
| `contact-delete` | perform | `DELETE /contacts/{contact-uuid}` | Delete a contact from the 2Chat directory |
| `contacts-search` | search | `GET /contacts/search` | Search contacts by phone number or name |
| `webhook-subscribe` | perform | `POST /webhooks/subscribe/{event-name}` | Subscribe a URL to a 2Chat event |
| `webhooks-list` | read | `GET /webhooks` | List the enabled webhook subscriptions on the account |
| `webhook-delete` | perform | `DELETE /webhooks/{webhook-uuid}` | Delete a webhook subscription |
| `numbers-list` | read | `GET /whatsapp/get-numbers` | List the WhatsApp Web numbers connected to 2Chat |
| `channel-status-get` | read | `GET /whatsapp/channel/{channel-uuid}/status` | Get a connected number's connection status and its last 10 events |
| `channel-command` | perform | `POST /whatsapp/channel/{channel-uuid}/{command}` | Run a command on a connected number: connect brings it online and starts a QR code; disconnect takes it offline without deleting it |
| `message-send` | perform | `POST /whatsapp/send-message` | Send a WhatsApp Web message from a connected number to a phone number, a username ID or a group |
| `messages-list` | read | `GET /whatsapp/messages/{your-number}[/{remote-number}]` | List the messages on a connected number, newest first, 100 per page |
| `conversations-list` | read | `GET /whatsapp/conversations/{channel-uuid}` | List a connected number's conversations, 10 per page |
| `message-get` | read | `GET /whatsapp/message/{session-key}/{message-uuid}` | Get one message and its delivery state |
| `message-delete` | perform | `DELETE /whatsapp/message/{session-key}/{message-uuid}` | Delete a message from 2Chat and from WhatsApp |
| `group-messages-list` | read | `GET /whatsapp/groups/messages/{group-uuid}` | List the messages of a WhatsApp group, newest first, 50 per page |
| `number-check` | read | `GET /whatsapp/check-number/{your-number}/{number-to-check}` | Check whether a phone number has a WhatsApp account |
| `status-post` | perform | `POST /whatsapp/set-{text|image|video}-status/{number}` | Post an ephemeral WhatsApp status |
| `groups-list` | read | `GET /whatsapp/groups/{phone-number}` | List the WhatsApp groups a connected number is in |
| `group-get` | read | `GET /whatsapp/group/{group-uuid}` | Get a WhatsApp group's details and participant list |
| `group-create` | perform | `POST /whatsapp/group/create` | Create a WhatsApp group from a connected number with up to 10 participants |
| `group-participants-update` | perform | `POST /whatsapp/group/{group-uuid}/{add|remove|promote|demote}-participant` | Add, remove, promote to admin or demote participants of a WhatsApp group, up to 10 per call |
| `waba-message-send` | perform | `POST /waba/send-message` | Send a WhatsApp Business API |
| `waba-templates-list` | read | `GET /waba/templates` | List the message templates of a WABA number, 10 to 200 per page |
| `waba-conversation-window-get` | read | `GET /waba/conversation-window/{from}/{to}` | Check whether the 24-hour customer-service window is open between a WABA number and a contact |

Pagination is **zero-based** everywhere (`page_number`, `page` on the WABA template list) and the
page size differs per endpoint (contacts 1-100, messages 100, group messages 50, conversations 10,
templates 10-200). Phone numbers are international format with a leading `+`; the app keeps `+`
and `@` literal in URL paths exactly as 2Chat's own examples write them.

## Where the docs disagree (and what this app sends)

- **Contact details key.** The create page's field table says `contact_details`; every curl,
  Python and JS example on the same page — and the vendor's own `2chat-contacts` agent skill —
  send `contact_detail`. `contact-create` sends `contact_detail`. `contact-update` sends
  `contact_details`, which is what the update page's table and the vendor skill both say, and is
  passed through as given. Not exercised against a live account.
- **Search term.** The docs' search page says `?query=`; the vendor skill says `?q=`.
  `contacts-search` sends both. Not exercised against a live account.
- **Error envelopes.** The docs describe `{success:false, error:true, error_message}` (plus
  `error_code` on WABA). The API gateway in front of it answers `{"detail": "..."}` instead —
  measured 2026-10-06: no key is `403 {"detail":"Not authenticated"}`, a wrong key is
  `401 {"detail":"Invalid API Key"}`. The client reads both, and treats `success:false` /
  `error:true` inside a 2xx as a failure.
- **Rate limits.** The send-message page says trial accounts get 10 requests a minute; the
  response-codes page says 30; `GET /info` reports 80/min on a paid plan. None is enforced
  client-side; a `429` surfaces as an error.
- **`check-number` has no `success` field** — its body is `{is_valid, on_whatsapp, whatsapp_info}`.
- **`send-group-message`** is listed in `llms.txt` but its page is a stub that points back at Send
  Message. Groups are messaged through `message-send` with `toGroupUuid`, the one documented route.
- **WABA's query string is `?page=&limit=`**, WhatsApp Web's is `?page_number=&results_per_page=`.
- The `+` in a query value (`phone_number=+5215…` in the docs) is a space to most servers; the
  client percent-encodes it (`%2B`).

## What is *not* covered

Read in the docs but deliberately left out of v0.1.0 — each is one more action to add:

- **Channel lifecycle**: create QR connection (`POST /whatsapp/channel/create`), get QR code,
  delete channel, get one number (`GET /whatsapp/channel/{uuid}`; `numbers-list` returns the same
  fields). A QR pairing needs a human with the phone, so it is not a workflow step.
- **WhatsApp Web account**: set profile picture, set status text (away/only-calls).
- **Groups**: set picture, set description, `send-group-message` (stub page, see above).
- **Catalog**: add/list/edit/delete products, images and collections (10 endpoints).
- **WABA**: create, delete, sync and fetch one template; get a WABA number; the WABA message and
  conversation read endpoints; interactive messages.
- **SMS** (6), **virtual phone numbers** (12, they purchase numbers and spend money),
  **phone calls** (5), the Voice SDK token, Slack linking.
- **Webhook payload parsing**: this app subscribes webhooks; it declares no `triggers`.

## Health checks

| Check | Kind | How |
|---|---|---|
| `service` | service | Unsigned `GET /open/info`. A schema-correct `403 Not authenticated` / `401 Invalid API Key` refusal is a **pass** — it proves the gateway and auth layer answer. 5xx or unreachable is `down`; an unsigned 200 or an unrecognisable body is `unknown`. |
| `quota` | quota (informational) | `GET /info` → `usage.api_request_count` vs `max_api_request_count`, and the same for number checks. `down` only when the request allowance is used up or the account is blocked. |
| `auth:api-key` | derived | The auth `test` hook: `GET /info`, classified from the body (`success:true` plus an `account` object), never from the status code. |

2Chat publishes **no status page**: `status.2chat.co` does not resolve and nothing on the site,
docs or vendor skills links one (searched 2026-10-06). That is why `service` probes the API's own
front door instead of declaring a feed, and why it is the unsigned refusal, not a 200, that
counts as healthy. `/info` was chosen as the credential probe because it returns the account's
own name, uuid, limits and usage — **never the key** — unlike Mailjet's `/apikey` or Follow Up
Boss's `/me`.

## Sandbox posture

Every request goes through `ctx.fetch` to `api.p.2chat.io`; no action holds a credential — the
`sign` hook stamps `X-User-API-Key`. There are no runtime dependencies beyond `@w6w/types`
(types only).

## Icon provenance

`assets/icon.png` is the vendor's own apple-touch-icon, downloaded verbatim from
`https://2chat.co/favicon/apple-touch-icon.png` on 2026-10-06 (1,698 bytes, PNG, 256x256 RGBA,
md5 `91d0c967e77a9bbf7148d6c3df927a18`). 2Chat publishes no SVG: `https://2chat.co/favicon.svg`
and `/favicon/favicon.svg` both return the site's 404 HTML page, so the PNG is referenced as
`appearance.icon.url`.

## Links

- API reference: https://developers.2chat.co
- Agent skills (cross-check): https://github.com/2ChatCo/agent-skills
- Dashboard: https://app.2chat.io
