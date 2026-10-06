# TimelinesAI

Send WhatsApp messages and notes, manage chats, labels, files, reactions and webhooks, and read
workspace quota through [TimelinesAI](https://timelines.ai), a shared WhatsApp inbox with a REST API.

- **Categories** — communication, marketing
- **Auth methods** — api-token (`Authorization: Bearer <token>`)
- **Actions** — 27
- **Egress allowlist** — `app.timelines.ai` (the only host any hook calls)
- **Website** — https://timelines.ai
- **API docs** — https://timelines.ai/docs (Mintlify; index at https://timelines.ai/docs/llms.txt).
  Append `.md` to any reference page URL to get its embedded OpenAPI 3.0.3 document ("Timelines
  Public API" v1.3.0). Every endpoint here was read from those pages on 2026-10-06.
- **Icon** — `assets/icon.svg` is the vendor's own wordmark, served verbatim from
  https://timelines.ai/images/logo.svg (357x54; TimelinesAI serves no `favicon.svg`).

## Setup

1. In TimelinesAI open **Integrations → Public API** (https://app.timelines.ai/integrations/api/)
   and copy the API token.
2. Paste it into the connection. That is the whole credential: one token per workspace, no OAuth,
   no scopes. Treat it like a password — it has full access to the workspace.
3. Connect at least one WhatsApp number in the workspace; a send needs one.

## Actions

| Key | Type | Endpoint (under `/integrations/api`) | Description |
|---|---|---|---|
| `workspace-get` | read | `GET /workspace` | Workspace identity, plan and current quota utilisation |
| `whatsapp-accounts-list` | read | `GET /whatsapp_accounts` | The WhatsApp numbers connected to the workspace |
| `teammates-list` | read | `GET /workspace/teammates` | Teammates and teams in the workspace |
| `chats-list` | search | `GET /chats` | List chats, newest activity first, 50 per page; filters combine with AND |
| `chat-get` | read | `GET /chats/{chat_id}` | Get one chat's details |
| `chat-update` | perform | `PATCH /chats/{chat_id}` | Rename a chat, assign a responsible teammate, close or reopen it, or change its read state |
| `messages-list` | read | `GET /chats/{chat_id}/messages` | A chat's message history, newest first, 50 per page |
| `message-get` | read | `GET /messages/{message_uid}` | Get one message by UID |
| `message-status-history` | read | `GET /messages/{message_uid}/status_history` | A message's delivery history from queued to read, with any failure reason |
| `message-send-to-chat` | perform | `POST /chats/{chat_id}/messages` | Send a message into an existing chat or group by its chat id |
| `message-send-to-phone` | perform | `POST /messages` | Send a WhatsApp message to a phone number; no earlier chat or contact is needed |
| `message-send-to-jid` | perform | `POST /messages/to_jid` | Send a message to a chat or group by its WhatsApp JID |
| `note-add` | perform | `POST /chats/{chat_id}/notes` | Add an internal note to a chat; nothing is sent to the contact |
| `labels-list` | read | `GET /chats/{chat_id}/labels` | The labels on a chat |
| `labels-add` | perform | `PUT /chats/{chat_id}/labels` | Add labels to a chat without removing the existing ones |
| `labels-replace` | perform | `POST /chats/{chat_id}/labels` | Replace ALL of a chat's labels with the given set |
| `files-list` | read | `GET /files` | Files uploaded to the workspace |
| `file-upload-url` | perform | `POST /files` | Upload a file from a publicly reachable URL so it can be attached to a message |
| `file-get` | read | `GET /files/{file_uid}` | A file's details and a temporary download URL, valid for 15 minutes |
| `file-delete` | perform | `DELETE /files/{file_uid}` | Delete an uploaded file |
| `webhooks-list` | read | `GET /webhooks` | The workspace's webhook subscriptions |
| `webhook-create` | perform | `POST /webhooks` | Subscribe an HTTPS URL to a TimelinesAI event |
| `webhook-get` | read | `GET /webhooks/{webhook_id}` | Get one webhook subscription |
| `webhook-update` | perform | `PUT /webhooks/{webhook_id}` | Change a webhook's event, URL or enabled flag; only supplied fields change |
| `webhook-delete` | perform | `DELETE /webhooks/{webhook_id}` | Permanently delete a webhook subscription; deliveries stop immediately |
| `reactions-get` | read | `GET /messages/{message_uid}/reactions` | The current reactions on a message |
| `reaction-update` | perform | `PATCH /messages/{message_uid}/reactions` | Set an emoji reaction on a message |

`message-send-*` spend message credits: one for text or a file, two for text plus a file. A message
that cannot be sent has its credit restored, usually within a couple of hours. Messages go out with a
random ~2 second gap to avoid WhatsApp spam detection; faster sends are queued, and each queued message
still consumes a credit.

## Health checks

| Check | What it answers |
|---|---|
| ~~`service`~~ | Declared unavailable (informational): TimelinesAI publishes no status page. `status.timelines.ai` does not resolve and `timelinesai.statuspage.io` is the unclaimed 127,718-byte Statuspage decoy. |
| `api` | Unsigned `GET /workspace`. The schema-correct `401 {"status":"error","error_code":"missing_credentials"}` proves the API is serving, so it is a pass. 5xx or no connection is `down`. |
| `quota` | `GET /workspace` messaging and API-call counters (`total` and `used`), informational. Exhausted API-call quota is `down`; exhausted messaging quota is `degraded`. |
| `auth:api-token` (derived) | The auth `test` hook: `GET /workspace`, classified from the body. |

## Quirks that shaped the design

- **Errors are told apart by `error_code`, not status.** Every failure is
  `{"status":"error","message":…,"error_code":…}`. A missing and a rejected token are both HTTP 401
  and differ only by `missing_credentials` vs `invalid_token` (measured live 2026-10-06). The client
  also treats a 2xx body with `status: "error"` as a failure.
- **Labels: PUT adds, POST replaces.** `PUT /chats/{id}/labels` appends and `POST` overwrites the whole
  set. This is the reverse of the usual REST reading, and is confirmed by the Managing Chats guide
  (`labels-add` = PUT, `labels-replace` = POST).
- **Message history has no documented page parameter.** The reference says it is paginated at 50 and
  returns `has_more_pages`, but lists only cursors (`after_message`, `before_message`) and dates.
  `messages-list` exposes exactly those; `chats-list` has a real `page`.
- **The rate limit is per IP, not per token** (30 req/s plus a 10-request burst, then HTTP 429),
  so several integrations behind one egress share it.
- The `reaction-update` verb is `PATCH` (the reference page title says "Update"); the reaction is a
  single emoji string.

## Not covered

- `POST /chats/{id}/messages` by chat name (documented as **deprecated** and to be removed).
- Voice notes and the multipart file upload (`POST /files_upload`): not read or verified against the
  wire in this first cut (the multipart form upload is superseded here by `file-upload-url`).
- Teammate invitations (`POST /workspace/invitations`, `DELETE …/{user_id}`) — seat and billing
  side effects, left out of a first cut.
- The whole WABA (WhatsApp Business Platform) surface — a separate set of endpoints with templates
  and a 24-hour window — and the separate Partner API.
- Inbound events: create a subscription with `webhook-create`; the app declares no trigger.
