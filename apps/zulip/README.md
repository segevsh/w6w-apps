# Zulip

Send, read, edit and react to messages, manage channels, topics and subscriptions, and look up
users on a **Zulip Cloud** organization, over the Zulip REST API (`/api/v1`).

- **Categories** — communication, productivity
- **Auth methods** — `basic` (organization subdomain + Zulip API email + API key, HTTP Basic)
- **Actions** — 25
- **Health checks** — `service` (status.zulip.com, Statuspage; the "Zulip Cloud" component
  decides), `site` (unauthenticated `GET /server_settings` on the connection's own org), `quota`
  (`X-RateLimit-*` headers off `GET /users/me`, informational) + the derived `auth:basic`
- **Egress allowlist** — `*.zulipchat.com` (the status host belongs to the `service` check only)
- **API docs** — https://zulip.com/api/ (OpenAPI source:
  https://github.com/zulip/zulip/blob/main/zerver/openapi/zulip.yaml)
- **Icon** — the vendor's mark, https://zulip.com/static/images/logo/zulip-icon-circle.svg, saved
  byte-for-byte as `assets/icon.svg`

Every endpoint, parameter and response field here was checked against that OpenAPI document and,
for the status, error and unauthenticated routes, against live probes of `*.zulipchat.com` and
`status.zulip.com` on 2026-10-06.

## Scope: Zulip Cloud only

Self-hosted Zulip servers (any hostname) and Cloud organizations on a **custom domain** are out of
scope: the sandbox's egress allowlist is `*.zulipchat.com`, and the app builds every URL as
`https://<subdomain>.zulipchat.com/api/v1`. The connection takes the subdomain (`acme` from
`acme.zulipchat.com`; a pasted URL is trimmed). A subdomain that is not a single DNS label is
refused, so a stored value cannot redirect requests to another host.

## Credentials

HTTP Basic: the *username* is the account's **Zulip API email**, the *password* its **API key**.

- A bot (recommended for automation): Settings → Personal settings → Bots; the bot's email looks
  like `my-bot@acme.zulipchat.com`.
- A user: Settings → Account & privacy → Manage your API key.

## Things most likely to go wrong

1. **Forms, not JSON.** Zulip takes every parameter as `application/x-www-form-urlencoded` (or the
   query string on a GET), and anything structured — `to` for a direct message, `narrow`,
   `message_ids`, `subscriptions`, `principals` — is a **JSON-encoded string inside that field**.
   A JSON request body is not accepted. This app encodes them; `false` and `0` are sent, not
   dropped.
2. **A bot sees nothing until it is subscribed.** A new bot is subscribed to no channels, and a
   user's message history does not include channels they joined later. `List Messages` on a fresh
   bot returns an empty list, not an error; use *Subscribe to Channels* first.
3. **`List Messages` is anchor-based, not paged.** Use `anchor` plus `num_before`/`num_after`
   (this app defaults to `newest`, 20 before, 0 after) and page back with the oldest returned id.
   `message_ids` is an alternative that must not be combined with the anchor fields, so it replaces
   them. Zulip returns HTML by default (`apply_markdown=true`); this app defaults to the Markdown
   the sender typed.
4. **Send Message `type` and recipients.** `channel` is sent to the API as `stream` (accepted by
   every server version); `to` for a channel is its name or numeric ID, for `direct` a
   comma-separated list of user IDs or emails. A purely numeric channel *name* would be read as an
   ID.
5. **Delete Topic is batched.** It answers `complete: false` when it stopped part-way; run it
   again until it says `true`. It is administrator-only.
6. **Create Channel needs Zulip 11.0+** (`POST /channels/create`, feature level 417), which
   Zulip Cloud runs. `Subscribe to Channels` also creates a channel that does not exist and works
   on every version; use it for private channels created by a bot you want auto-subscribed.
7. **Errors carry a machine `code`.** Failures are `{"result":"error","msg":…,"code":…}` with a 4xx
   status; this app surfaces `msg [CODE]`. `RATE_LIMIT_HIT` adds a `retry-after` in seconds. An
   unknown subdomain answers **400 `Invalid subdomain`**, while a wrong key on a real org answers
   401 `UNAUTHORIZED` — the credential test and the `site` check tell them apart by `msg`.
8. **Rate limits are per user and reported on every response** (`X-RateLimit-Limit`,
   `-Remaining`, `-Reset`; default 200 requests/minute). The `quota` check reads them.
9. **Permissions are the organization's.** Editing, moving, deleting messages, creating,
   renaming or archiving channels and adding other users all depend on role and on realm settings
   (including edit/delete time limits); a refusal is a 400/403 with a `msg`, not an app bug.

## Actions

| Area | Actions |
| ---- | ------- |
| Messages | `send-message`, `get-messages`, `get-message`, `update-message`, `delete-message` |
| Reactions | `add-reaction`, `remove-reaction` |
| Read state | `update-message-flags`, `mark-topic-as-read`, `mark-stream-as-read` |
| Channels | `get-streams`, `get-stream`, `get-stream-id`, `create-channel`, `update-stream`, `archive-stream`, `get-subscribers` |
| Topics | `get-stream-topics`, `delete-topic` |
| Subscriptions | `get-subscriptions`, `subscribe`, `unsubscribe` |
| Users | `get-users`, `get-user`, `get-own-user` |

Actions return the documented response fields without Zulip's `result`/`msg` envelope. Zulip's API
still calls channels "streams"; action keys follow the API (`get-streams`, `update-stream`) except
`create-channel`, which is Zulip's own name for that endpoint.

## Not covered

- **Real-time events** (`/register`, `/events`) and outgoing webhooks: long-lived queues and
  inbound deliveries, not request/response actions.
- **File uploads** (`/user_uploads`): multipart bodies are not expressible here.
- **Realm administration** — user creation/deactivation, user groups, invitations, custom emoji,
  linkifiers, data export — left out deliberately; each is an admin surface that deserves its own
  review.
- **Self-hosted servers and custom-domain organizations** (see Scope).
