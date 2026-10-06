# LiveChat

Run LiveChat (by Text) from a workflow: start a chat, send a message or an internal note into it,
transfer or close it, tag its threads, search chat history, look up and update customers, and read
the license's agents, groups, tags and channels. Built on the Agent Chat Web API and the
Configuration API, both v3.6 (`https://api.livechatinc.com/v3.6`).

App id `io.w6w.livechat` · categories `support`, `communication` · egress `api.livechatinc.com`
(every action) and `status.livechat.com` (the `service` health check only).

Every method and parameter was checked on 2026-10-06 against the vendor's reference:
<https://platform.text.com/docs/messaging/agent-chat-api> and
<https://platform.text.com/docs/management/configuration-api>.

## Auth setup

One method, **Personal Access Token** (`personal-access-token`, `basic`). In the Developer Console
open **Settings > Authorization > Personal Access Tokens**, create a token with the scopes the
actions you use need (each action below names its scope in its description), and paste the
**Account ID** and the **token** into the two fields. `sign` sends
`Authorization: Basic base64("<accountId>:<token>")`.

- The vendor's cURL samples write `Basic <your_personal_access_token>`, but that placeholder is the
  **encoded pair**, not the bare token. The console also shows a pre-encoded string; do not paste
  that one here, the app encodes the two parts itself.
- The OAuth 2.0 authorization-code flow (for an integration installed by many accounts) exists but
  is not implemented here; a PAT covers a single account.

The connection test calls `POST /configuration/action/list_channels`, which the vendor documents
with no required scope, so it works for a token with any scopes, changes nothing and returns
channel metadata, never the credential. The verdict is read from the response body: an array
passes, the `authentication` error type means the credential was rejected, and any other vendor
error is reported by its own type. The HTTP status is only a hint.

## Actions (22)

| Group | Actions |
| --- | --- |
| Chats | `list-chats`, `list-archives`, `get-chat`, `start-chat`, `deactivate-chat`, `transfer-chat` |
| Threads | `list-threads`, `tag-thread`, `untag-thread` |
| Messages | `send-event` |
| Customers | `get-customer`, `update-customer` |
| Agent availability | `list-routing-statuses`, `set-routing-status` |
| Agents and groups | `list-agents`, `get-agent`, `list-groups`, `get-group` |
| Tags and channels | `list-tags`, `create-tag`, `delete-tag`, `list-channels` |

Things worth knowing:

- **It is RPC over POST.** Reads are POSTs too:
  `POST /v3.6/<agent|configuration>/action/<action>` with a JSON body. The API version is in the
  path, so no `X-API-Version` header is sent.
- **Errors are an envelope.** Every failure is `{"error":{"type","message","data?"}}`; the action
  throws `LiveChat <status> for <action>: <type>: <message>`. An envelope on an HTTP 200 is still
  an error. `misdirected_request` ("Wrong region") names the right region in the message.
- **Pagination is `page_id`, and it is exclusive.** `list-chats`, `list-threads` and
  `list-archives` return `nextPageId` (absent on the last page). To continue, pass it as `Page ID`
  and nothing else: LiveChat remembers the filters, `limit` and sort order from the first request
  and rejects them alongside `page_id`, so the actions refuse that mix before sending. A page id
  expires after one month. Default page sizes are small (10 chats, **3 threads**); the maximum is
  100.
- **Group ids are integers and 0 is a real group** (the default one). Group-id inputs take a
  comma-separated list and `0` is kept. Agent ids are emails.
- **A tag name is case-insensitive on create and case-sensitive on delete and when tagging a
  thread.** `list-tags` requires the group filter.
- **Scopes differ per action.** Chat reads need `chats--all:ro` or `chats--access:ro` (the latter
  limits results to the token's own groups, so a list can look short rather than fail); writes
  need `:rw`; customers need `customers:ro`/`customers:rw`; agents, groups and tags have their own
  `--all`/`--my`/`--groups` scopes.
- **Sending needs the sender in the chat.** `send-event` fails if the token's agent is not a user
  of the chat; internal notes use visibility `agents`. `deactivate-chat` and `transfer-chat` also
  require the requester to be present unless the "ignore requester presence" flag is set.
- **`deactivate-chat` is not idempotent**: closing a closed chat is a `chat_inactive` error.
- **Empty successes.** Many mutations answer "No response payload (200 OK)"; the app returns a
  simple flag (`closed`, `tagged`, ...) for those.

## Health checks

| Check | What it does |
| --- | --- |
| `service` | Reads `status.livechat.com/api/v2/summary.json` (incident.io, Statuspage-compatible JSON, verified real: `page.name` "LiveChat", a bogus sibling path 404s, no redirect). The component named `API` decides the verdict; `Chat widget`, `Agent apps`, `Integrations`, `Support chat on www.livechat.com` and `Subprocessors' service` are reported but never move it. If `API` ever disappears, the page indicator is used. |
| `api` | Unsigned `POST list_channels`. LiveChat's `{"error":{"type":"authentication",...}}` answer (HTTP 401, measured for both "No `Authorization` header" and "Invalid access token") proves the API is answering and is a **pass**. A 2xx, HTML or a 5xx is not. Severity `degraded`. |
| `quota` | Declared unavailable (`informational`): rate limits are documented in prose only, with no headroom endpoint and no rate-limit header. A breach is the `too_many_requests` error type. |
| `auth:personal-access-token` | Derived from the auth `test` hook above. |

## Not covered

Left out because the app is deliberately a focused slice, not because the API lacks them:

- Chat properties (`update_/delete_chat_properties`, thread and event properties), `add_user_to_chat`
  / `remove_user_from_chat`, `follow_chat` / `unfollow_chat`, `resume_chat`, `ban_customer`,
  `mark_events_as_seen`, typing and thinking indicators, `send_event_preview`,
  `send_rich_message_postback`, `multicast`, `list_agents_for_transfer`, `request_thread_summary`.
- `upload_file` (multipart, not expressible through the JSON `ctx.fetch` wrapper used here).
- The rest of the Configuration API: creating and editing agents, bots, groups, greetings,
  auto-access rules, webhooks and properties.
- `list_threads`' `min_events_count` (mutually exclusive with `limit` and date filters), and
  `list_archives`' highlights and its form/sales/goal/greeting/ecommerce filter families. Use
  `list-archives`' text, date, id, customer, agent and tag filters instead.
- Webhooks and the RTM (WebSocket) API: this app only makes outbound calls.
- The Customer Chat API and the `accounts.livechat.com` OAuth host.
