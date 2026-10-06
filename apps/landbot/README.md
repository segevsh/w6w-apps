# Landbot

Conversational chatbots over web chat, WhatsApp and Messenger. This app drives Landbot's Platform
API: channels, customers (conversations) and their transcripts, outbound messages and WhatsApp
templates, conversation assignment, per-customer custom fields and channel message hooks.

- App id: `io.w6w.landbot` · categories: `communication`, `support`, `marketing`
- Host: `api.landbot.io`, prefix `/v1` (the only entry in `network.allow`)
- Source of truth: Landbot's OpenAPI 3.1 document,
  `https://dev.landbot.io/api-reference/platform/openapi.json` (28 operations on 22 paths, fetched
  2026-10-06), plus unauthenticated live probes of `api.landbot.io`. The old `api.landbot.io` docs
  page now only says "moved".
- Icon: the 32x32 favicon `https://cdn.prod.website-files.com/5e1c4fb5db4d5243c0021d34/61fbe54dd69d2648ebd13cb5_favicon.png`
  (651 bytes, `<link rel="shortcut icon">` on landbot.io), saved verbatim as `assets/icon.png`.
  The only SVG on the site is the 2066x416 horizontal wordmark lockup, which is not an icon shape;
  `dev.landbot.io` declares no icon of its own, and simple-icons has no `landbot` entry (404).

## Auth

One method, `agent-token` (type `apiKey`): `Authorization: Token <agent_token>`. The `Token `
prefix is **literal** and part of the header value; a bare token is a 401. The token is on
app.landbot.io > Settings > Account and is workspace-wide: it can read and message every customer.
The connect form takes the token only; `sign` adds the prefix, and `test` rejects a pasted
`Token ...` value instead of sending `Token Token ...`.

`sign` is the only code that sees the token.

### The probe is `GET /customers/?limit=1`

It returns the documented `{ success, total, customers }`. It is deliberately **not** `GET
/channels/`: channel objects carry their own `token`. `test` keeps only a boolean. A pass is a 2xx
whose body has a `customers` array; a 401/403 is a rejection quoting the vendor's `detail`; any
other status (or a 200 with another body) is "not judged", never "bad token". Measured
2026-10-06 on `GET /channels/`:

| Request | Status | Body |
|---|---|---|
| no `Authorization` | 401 | `{"detail":"Authentication credentials were not provided."}` |
| `Authorization: Token bogus` | 401 | `{"detail":"Invalid token."}` |

A 200 with a real token was **not observed** (no token available); that path is from the OpenAPI
schema.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service | Statuspage `status.landbot.io` (page id `x7zvlhcyj2mx`, name `Landbot`) |
| `api` | dependency | Unsigned `GET /v1/channels/`; a 401 with a string `detail` passes |
| `quota` | quota | Declared absence (`severity: informational`) |
| `auth:agent-token` | derived | From the auth `test` hook |

**Status page.** A real Atlassian Statuspage (`/api/v2/summary.json` answers the standard schema,
`status.indicator` shape). It has **no component named for the API**, so the verdict reads what
the actions touch: `Chats` (`7g64ghy9tqmt`) drives `down`; `WhatsApp services`, `WhatsApp bots`,
`landbots`, `Messenger bots` and `Webhooks` can only degrade it (a dead channel does not stop the
API working on the others). `Builder`, `Zapier`, `Google Sheets`, `Metrics`, `AI Agents` and email
notifications are detail. A page that no longer self-identifies as Landbot, or has no `Chats`
component, reports `unknown`. The status host is granted to that one hook via its own
`network.allow`, not the manifest.

**Quota.** The OpenAPI document mentions no rate limit, header or usage endpoint; declared absence.

## Actions (28)

| Group | Actions |
|---|---|
| Channels | List Channels, Get Channel, List WhatsApp Templates |
| Customers | List Customers, Get Customer, Get Customer Messages, Archive, Unarchive, Block, Unblock, Assign to Me, Assign to Agent, Assign to Bot, Unassign, Opt Out, Delete |
| Messages | Send Text, Send Image, Send Location, Send WhatsApp Template |
| Fields | Get, Create, Update, Delete Customer Field |
| Message hooks | List, Get, Create, Delete Message Hook |

Behaviours worth knowing:

- Every Landbot path ends in a **trailing slash**; the client always sends it.
- Lists page with `offset` + `limit` (0-100, default 20). List outputs add `count` and
  `nextOffset` (null on the last page) next to Landbot's `total`.
- Single-object reads are unwrapped (`{success, customer}` becomes the customer).
- State changes answer `200` with no documented body, deletes `204`; both return `{ ok: true }`.
- **Transcripts are unordered and unpaginated**: Get Customer Messages returns the whole
  conversation in no guaranteed order; sort by `message_datetime` (`"YYYY-MM-DD HH:MM:SS"`, not a
  Unix time). Message types are open-ended.
- Archive, Assign and Unassign answer **412** when the customer belongs to another agent;
  Opt Out answers 412 when the customer never opted in; sends answer 412/403 when the channel
  cannot message the customer.
- Custom field names must match `^[a-z0-9_]+$` (checked before the request). The `value` param is
  text and is coerced by `type`: `integer`/`float` to numbers, `boolean` from `true`/`false`.
- Channel `token` and message-hook `token` fields are working secrets that the read endpoints
  return in the clear. They are replaced with `[redacted]` in every output. Create Message Hook
  still *accepts* a token for your endpoint to check.

## Not built

- **APIchat** (`chat.landbot.io`) is a different host and surface; it is not in the Platform
  OpenAPI document and no action calls it, so it is not in `network.allow`.
- Trigger/webhook ingestion: message hooks are managed here, but receiving their calls is not an
  action.
