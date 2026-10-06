# Dixa

Work Dixa customer-service conversations from a workflow: open an email conversation, read it and
its messages and notes, reply, add a private note, assign it, move it between queues, tag it, set
custom attributes, and close or reopen it — plus the end users, agents, tags, queues and custom
attribute definitions around it. Verified 2026-10-06 against Dixa's own OpenAPI 3.0 document
(`docs.dixa.io/_bundle/openapi/dixa-api/@v1/v1.yaml`, 547 KB; portal at
`docs.dixa.io/openapi/dixa-api/v1`). Host: `dev.dixa.io`, prefix `/v1`.

## Auth

One method, **`api-token`** (`apiKey`, header `Authorization`): the RAW token, **no `Bearer`
prefix** — the spec's `securitySchemes` is `ApiKeyAuth: {type: apiKey, name: Authorization, in:
header}`. Create the token in Dixa under Settings > Integrations > API tokens. It is stamped only in
`sign`; no action touches it.

The credential probe is `GET /v1/agents?pageLimit=1`: it returns `{data: [{id, displayName, email,
roles…}], meta}` and never the caller's token. The verdict comes from the body: only the documented
`{data: [...]}` shape is a pass. Dixa answers every unauthorised request — missing token, wrong
token, or a token whose user may not do the thing — with the same API Gateway body
`{"message":"Unauthorized"}`, so the failure message quotes it rather than guessing which.

## Actions (28)

| Area | Actions |
|---|---|
| Conversations | `conversation-create-email`, `conversation-get`, `conversation-list-by-end-user`, `conversation-search`, `conversation-close`, `conversation-reopen`, `conversation-assign`, `conversation-transfer-queue`, `conversation-custom-attributes-update` |
| Messages & notes | `message-add`, `message-list`, `note-add`, `note-list` |
| Conversation tags | `conversation-tag-list`, `conversation-tag-add`, `conversation-tag-remove` |
| End users | `end-user-create`, `end-user-get`, `end-user-list`, `end-user-update`, `end-user-custom-attributes-update` |
| Agents | `agent-list`, `agent-get` |
| Tags | `tag-list`, `tag-create` |
| Queues | `queue-list`, `queue-get` |
| Custom attributes | `custom-attribute-list` |

`conversation-assign` is `PUT /conversations/{id}/claim`. Create/add actions (`*-create*`,
`message-add`, `note-add`) are not idempotent; close/reopen/assign/transfer/tag/patch are.

## Not yet covered

Left out deliberately, not forgotten — all are in the OpenAPI document; add them when a workflow
needs them: creating chat / contact-form / SMS / callback conversations (the `Email` arm of
`POST /conversations` is covered; the others each take a different required field set), conversation
import, bulk notes/tags/agents/end users, anonymisation (conversation, message, end user), ratings,
follow-up and link/linked, activity log, flows, agent presence and working channel, agent/team
management (create, update, delete, membership), queue create and membership/availability, tag
activate/deactivate, contact endpoints, templates, business-hours schedules, webhook subscriptions
and delivery logs, the filtered `POST /search/conversations`, the whole Knowledge API, analytics
metrics and records, and `GET /organization`.

## Health checks

- **`service`** — `status.dixa.io` is an Atlassian Statuspage (`page.name` `Dixa`, `page.id`
  `3thm1ndd6lgx`, Statuspage `components` / `status.indicator`). The verdict is the
  `Dixa API and Exports API` component (`k3z0jwsfc3y3`); the other ~35 components are reported as
  detail and never move it. The page id is checked on every run. The status host is declared on the
  check, not in the manifest's `network.allow`, which holds only `dev.dixa.io`.
- **`auth:api-token`** — derived from the `test` hook (`GET /agents?pageLimit=1`).
- **`quota`** — declared `unavailable`, severity `informational`: the OpenAPI document mentions no
  rate limit, header or usage endpoint.

## Quirks

- Responses are wrapped `{"data": …}`; lists add `{"meta": {"next": "/v1/…?pageKey=…"}}`. The
  paginated actions fold that into `nextPageKey` — pass it back as `pageKey`; Dixa says never to
  construct one. Only agents, end users, an end user's conversations and search paginate; tags,
  queues and custom attributes return everything. There is **no "list all conversations"** endpoint:
  use end-user listing or search.
- Conversation ids are int64 integers (the `csid`); every other id is a UUID.
- Union bodies carry a `_type` discriminator (`Email`, `Inbound`/`Outbound`, `Text`/`Html`/
  `Markdown`); the actions set it from friendly selects.
- An **outbound** message needs an `agentId`; an inbound one is authored by the requester.
- Close, reopen, assign, transfer and tag add/remove answer `204` with no body, so those actions
  return `{ok: true, conversationId}`.
- The agents `email` and `phone` filters are mutually exclusive; `agent-list` refuses both.

## Icon

`assets/icon.png` is the vendor's own 180x180 apple-touch icon, byte-for-byte, from the
`rel="apple-touch-icon"` link on `www.dixa.com` (a Webflow CDN file named `logo dark.jpeg` that is
in fact a PNG). `www.dixa.com/favicon.svg` and `/apple-touch-icon.png` both 404, and the 32 px PNG
on `docs.dixa.io` is the same mark at lower resolution.
