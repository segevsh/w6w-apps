# Superchat

Send and receive customer messages on WhatsApp, SMS, email, Instagram, Facebook Messenger and
Telegram through one workspace, and manage the contacts, conversations, notes, templates and webhook
subscriptions around them, on Superchat's public REST API.

- **Categories** — communication, crm
- **Auth methods** — api-key (`X-API-KEY`, workspace-wide read + write)
- **Actions** — 53
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.superchat.com` (the `service` check adds `status.superchat.de` to its own
  hook allowlist, never to the app's)
- **Website** — https://superchat.com
- **API docs** — https://developers.superchat.com/reference/welcome
- **Status page** — https://status.superchat.de (Better Stack)

> Verified 2026-10-06 against the vendor's reference at `developers.superchat.com` — every operation
> page embeds its own OpenAPI 3.1 definition (60 operations; read via the `.md` form of each page,
> indexed at `/llms.txt`) — plus live unauthenticated probes of `api.superchat.com` and
> `status.superchat.de`. No call was made with a real key, so response shapes are the documented ones.
> The `swagger-ui` link in older directories (`api.superchat.de/v1/swagger-ui/`) is a 404 now.

## The things most likely to cost you a day

1. **The version segment is `v1.0`, not `v1`.** `https://api.superchat.com/v1.0/me` answers;
   `/v1/me` is a JSON 404 on both `.com` and `.de`, as is every old swagger path. The `.de` host serves
   the same API, but the reference names `.com`, so that is the only host this app allows.
2. **A wrong key is a bare `403`, a missing key a bare `401`, and both have an empty body.** There is
   no vendor error code to read, so `auth.test` and the `api` health check classify by status alone:
   `401`/`403` = key problem, `5xx` = Superchat. Every other failure carries
   `{"errors":[{"title","detail","status_code"}]}`, which the client formats.
3. **`PATCH /contacts/{id}` requires `first_name`, `last_name` and `gender` on every call** (nullable
   but required keys), so a partial update would be read as clearing the others. `contact-update`
   therefore reads the contact first and re-sends whatever you did not change. `handles` and
   `custom_attributes` are "the full list that should remain", so they are sent only when you pass
   them — and passing them replaces the list.
4. **The webhook signing `secret` comes back in the clear from every read.** `webhook-list`,
   `webhook-get` and `webhook-update` replace it with `[redacted]` so it does not sit in run records;
   `webhook-create` returns it once, which is when you must store it. The target URL must be HTTPS and
   not one of Superchat's own domains.

Also worth knowing: lists are cursor-paged — pass a page's `nextCursor` as `after` (use `after` or
`before`, never both; the client refuses). The limit is 2500 requests per 5 minutes shared by the
whole workspace (`429`). WhatsApp only allows free-form text inside the 24-hour window — outside it,
use `contentType: whats_app_template`. Instagram and Messenger cannot start a conversation.

## Actions

| Area | Actions |
| --- | --- |
| Account | `me-get`, `user-list`, `user-get`, `inbox-list`, `inbox-get`, `channel-list`, `channel-get`, `label-list`, `label-get` |
| Messages | `message-send`, `message-get`, `message-analytics-get` |
| Contacts | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`, `contact-search`, `contact-conversations-list`, `contact-contact-lists-list`, `contact-add-to-list`, `contact-remove-from-list` |
| Contact lists | `contact-lists-list`, `contact-lists-get` |
| Custom attributes | `custom-attribute-list`, `custom-attribute-create`, `custom-attribute-delete` |
| Conversations | `conversation-list`, `conversation-get`, `conversation-update`, `conversation-delete`, `conversation-messages-list`, `conversation-export-create`, `conversation-export-get` |
| Notes | `note-list`, `note-create`, `note-update`, `note-delete` |
| Templates | `template-list`, `template-get`, `template-delete`, `template-analytics-get`, `template-folder-list`, `template-folder-create`, `template-folder-delete` |
| Files | `file-list`, `file-get`, `file-delete` |
| Webhooks | `webhook-list`, `webhook-get`, `webhook-create`, `webhook-update`, `webhook-delete` |

`message-send` builds the `content` object from `contentType` (text, media, email, generic template,
WhatsApp template); WhatsApp quick-reply and list messages go through the `custom` type with the raw
`content` JSON.

### Not covered

- **File upload** (`POST /files`) is `multipart/form-data` with a binary part; actions here exchange
  JSON, so upload through Superchat's UI and reference the file id.
- **Template create/update** (`POST /templates`, `PATCH /templates/{id}`) — the body is a deep union
  (generic vs WhatsApp content with buttons, categories and ~60 languages) that could not be verified
  against a live workspace, so it is left out rather than guessed.
- **Single-note get**, **custom-attribute update** and **template-folder update** — thin variants of
  covered calls; the list actions return the same data.
- **Webhook delivery verification** is not an action: the signing scheme is not described in the
  reference pages, so this app only manages subscriptions.

## Health checks

| Check | Kind | What it does |
| --- | --- | --- |
| `service` | service | `status.superchat.de/index.json` (Better Stack; the Statuspage-style paths 301 to `/`). Page-level `aggregate_state` drives the verdict; each resource (WebApp, API, Webchat, Worker, Webhook Infrastructure, Review Seite) is a component. The page's company name is the legal entity "SuperX GmbH", so the identity guard accepts that or a `superchat.de/.com` URL. |
| `api` | dependency | Unsigned `GET /v1.0/me`; the empty `401` passes, `5xx` is down, anything else is `unknown`. |
| `quota` | quota | Declared absent (informational): the 2500 / 5 min limit is documented, but no header or usage endpoint reports it. |
| `auth:api-key` | credential | Derived from `auth.test` (`GET /me`, which never echoes the key). |

## Development

```bash
deno task validate && deno task check && deno task lint && deno task test
deno task fmt          # never bare `deno fmt` — it rewrites assets/icon.svg
```

`assets/icon.svg` is the vendor's own mark, cropped verbatim from the logo SVG at
`files.readme.io/6102345-logo_developers.svg` (the three chevron paths and their gradients; the
wordmark paths dropped, only the `viewBox`/size changed).
