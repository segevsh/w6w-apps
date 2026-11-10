# Aidbase

Drive [Aidbase](https://aidbase.ai) AI support agents from a workflow: manage knowledge sources,
attach them to chatbots, email inboxes and ticket forms, get chatbot replies, and read, reply to,
update or block chats, emails and tickets.

- **Base URL** `https://api.aidbase.ai/v1` (the only host in `network.allow`)
- **Auth** one API key, sent as `Authorization: Bearer <key>` by the Auth `sign` hook only
  (Aidbase > Settings > API Keys; scopes are chosen when the key is created)
- **Source of truth** the Aidbase API reference pages (knowledge, chatbot, email inbox, ticket
  form) plus the introduction and get-started guides, fetched 2026-10-06. Aidbase publishes no
  OpenAPI document and no `llms.txt` (both 404). No deprecated endpoints are documented; the
  API is labelled beta.
- **Triggers** — 12 (poll)

## Actions (43)

| Area | Actions |
|---|---|
| Account | `account-status` |
| Knowledge | `knowledge-list`, `knowledge-get`, `knowledge-sub-page-list`, `knowledge-faq-item-list`, `knowledge-website-create`, `knowledge-video-create`, `knowledge-document-create`, `knowledge-document-finalize`, `knowledge-faq-create`, `knowledge-faq-item-create`, `knowledge-faq-item-delete`, `knowledge-delete`, `knowledge-train` |
| Chatbots | `chatbot-list`, `chatbot-get`, `chatbot-reply`, `chatbot-knowledge-list`, `chatbot-knowledge-add`, `chatbot-knowledge-remove`, `chatbot-chat-list`, `chatbot-chat-get`, `chatbot-chat-block` |
| Email inboxes | `email-inbox-list`, `email-inbox-get`, `email-inbox-knowledge-list`, `email-inbox-knowledge-add`, `email-inbox-knowledge-remove`, `email-list`, `email-get`, `email-update`, `email-reply`, `email-block` |
| Ticket forms | `ticket-form-list`, `ticket-form-get`, `ticket-form-knowledge-list`, `ticket-form-knowledge-add`, `ticket-form-knowledge-remove`, `ticket-list`, `ticket-get`, `ticket-update`, `ticket-reply`, `ticket-block` |

Typical flow: Add Website Knowledge, Train Knowledge, poll Get Knowledge until `is_training` is
false and `trained_at` is set, then Add Knowledge to a chatbot / inbox / form.

## Behaviour worth knowing

- **Envelope.** Every response is `{ success, data }`. A body with `success: false` is treated as a
  failure whatever the HTTP status; the error thrown quotes Aidbase's `message`.
- **Pagination.** Knowledge, sub-page, FAQ-item, chat, email and ticket lists take `limit` and
  `nextCursor` and return `{ items, total, hasMore, nextCursor, count }`. `nextCursor` is null on
  the last page. List Chatbots / Email Inboxes / Ticket Forms are not paginated and return
  `{ items, count }`.
- **Writes with no body** (`{"success": true}`) return `{ ok: true }`.
- **Scopes.** Writes need a key scope: `CHATBOTS_WRITE` (block chat), `EMAILINBOXES_WRITE` (block
  email), `TICKETFORMS_WRITE` (block ticket), `EMAILS_WRITE` (update / reply to email),
  `TICKETS_WRITE` (update / reply to ticket). A 403 usually means the key lacks one.
- **Updates** accept only `status` (`open`, `assigned`, `need_more_info`, `resolved`, `closed`)
  and/or `priority`; at least one is required, and Aidbase answers 400 to any other field, so the
  app refuses an empty update before calling out.
- **Documents** are a three-step flow: Create Document Upload returns a signed `upload_url`, the
  file is uploaded there (outside this app, which only reaches `api.aidbase.ai`), then Finalize
  Document completes it.
- **IDs.** Aidbase's chatbot and ticket-form examples use the `public_id`; email-inbox knowledge
  endpoints also accept the inbox alias. The hints say so; whether the internal `id` is accepted in
  those paths is not documented, so it is not promised.

## Health checks

| Check | What it does |
|---|---|
| `auth:api-key` (derived) | `GET /status` with the key; passes only on `{ success: true, data: { status: "ok" } }`. The masked key Aidbase echoes (`absk-........a3d0`) is never read or returned. A missing and an invalid key are both `401` and differ only in `message` ("API key is missing" / "is invalid"). |
| `api` | Unauthenticated `GET /status`; a schema-correct `401 {"success":false,"message":...}` is a pass (reachability), an HTML or 5xx answer is down. |
| `service` | Declared absence, `informational`: Aidbase has no status page (`status.aidbase.ai` does not resolve; the docs link none). |
| `quota` | Declared absence, `informational`: no rate limit, header or usage endpoint is documented. |

## Not covered, and why

- **Ticket Form "Create Ticket"** (listed in the docs sidebar under the embeddable form): it is the
  public form-submission surface of the embed, not part of the authenticated `/v1` API reference.
- **Webhooks** (docs section "Webhooks"): an inbound-event feature with its own page, not an API
  endpoint set; not built.
- **Chatbot/inbox/form create, update and delete**, and **persona management**: the API reference
  documents no such endpoints.
- **`POST /knowledge/:id/finalize` verb.** The heading says POST but the copy-paste curl example on
  the same page says `--request GET`. The app follows the heading (POST); unauthenticated probes
  cannot distinguish them (auth answers first). If Finalize Document answers 404/405 against a real
  account, that is the first thing to check.

## Icon

`assets/icon.svg` embeds the vendor's own favicon PNG (`https://docs.aidbase.ai/favicon.png`,
273x272) byte-for-byte as a data URI inside an SVG wrapper; `aidbase.ai/favicon.svg` does not exist
(404). Always run `deno task fmt`, never bare `deno fmt`.

## Develop

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-ticket` — New Ticket | Poll | `ticket-list` | Each newly created ticket |
| `new-chat` — New Chat | Poll (since-filter) | `chatbot-chat-list` | Each new chat of the chatbot you pick |
| `new-email` — New Email | Poll (since-filter) | `email-list` | Each new email in the inbox you pick (optional status filter) |
| `new-chatbot` — New Chatbot | Poll (snapshot) | `chatbot-list` | Each chatbot newly created in the account |
| `new-email-inbox` — New Email Inbox | Poll (snapshot) | `email-inbox-list` | Each email inbox newly created |
| `new-ticket-form` — New Ticket Form | Poll (snapshot) | `ticket-form-list` | Each ticket form newly created |
| `new-knowledge-item` — New Knowledge Item | Poll (snapshot) | `knowledge-list` | Each knowledge item newly added to the account |
| `new-chatbot-knowledge` — New Chatbot Knowledge | Poll (snapshot) | `chatbot-knowledge-list` | Each knowledge item newly attached to the chatbot you pick |
| `new-email-inbox-knowledge` — New Email Inbox Knowledge | Poll (snapshot) | `email-inbox-knowledge-list` | Each knowledge item newly attached to the inbox you pick |
| `new-ticket-form-knowledge` — New Ticket Form Knowledge | Poll (snapshot) | `ticket-form-knowledge-list` | Each knowledge item newly attached to the form you pick |
| `new-knowledge-sub-page` — New Knowledge Sub-Page | Poll (snapshot) | `knowledge-sub-page-list` | Each sub-page newly crawled under the website knowledge item you pick |
| `new-faq-item` — New FAQ Item | Poll (snapshot) | `knowledge-faq-item-list` | Each question/answer newly added to the FAQ knowledge item you pick |

Polled through `ticket-list` with the documented `created_after` filter and a two-minute overlap. Source: [Aidbase Ticket Form API reference](https://docs.aidbase.ai/apis/ticket-form-api/reference/) (verified 2026-11-09).

`new-chat` and `new-email` use the documented `created_after` filter on [chat](https://docs.aidbase.ai/apis/chatbot-api/reference) and [email](https://docs.aidbase.ai/apis/email-inbox-api/reference) lists with a two-minute overlap, follow the documented `next_cursor` page token, and never send a page-size. The snapshot triggers read the whole list (chatbots, inboxes and forms are unpaginated; the rest follow `next_cursor`) and emit only ids not seen before; Aidbase documents no order or date filter on them. Sub-pages are keyed by `page_url`. Sources: the [Chatbot](https://docs.aidbase.ai/apis/chatbot-api/reference), [Email Inbox](https://docs.aidbase.ai/apis/email-inbox-api/reference) and [Knowledge](https://docs.aidbase.ai/apis/knowledge-api/reference) API references (verified 2026-11-10).
