# Synthflow AI

Place single and batch voice AI calls, read finished-call transcripts, manage contacts and text
chats, and read the agent, phone-number, voice and knowledge-base catalogs on Synthflow's voice AI
agent platform.

- **Categories** — ai, communication
- **Auth methods** — api-key (Bearer, plus a region field)
- **Actions** — 26
- **Health checks** — `service`, ~~`quota`~~ + the derived `auth:api-key`
- **Egress allowlist** — `api.synthflow.ai`, `api.us.synthflow.ai`, `api.eu.synthflow.ai` (the
  `service` check adds `status.synthflow.ai` to its own hook allowlist only)
- **API docs** — https://docs.synthflow.ai/ · **OpenAPI** — https://docs.synthflow.ai/openapi.json
- **Status page** — https://status.synthflow.ai/

> Verified 2026-10-05 against Synthflow's OpenAPI 3.1 document (`info.version` 1.0.0, 69 paths) and
> live probes of all three API hosts and the status page. No operation is marked deprecated; a few
> *fields* on agent bodies are (`end_call_reasons`, `run_action_before_call_starts`), and no action
> here sends them.

## Things worth knowing

1. **Region is part of the connection.** Global, US and EU are separate clusters serving the same
   `/v2` paths. A workspace lives in one forever, and a key sent to the wrong cluster is refused
   like a wrong key. The auth form asks for the region (find it under Admin > Workspace Settings >
   Preferences > Customer Region); `sign` pins each request to that host, and `afterConnect`
   records it for the client. Synthflow is retiring the legacy Global cluster during Q4 2026 (docs:
   "Data Region"), so expect to re-connect with `us` or `eu` then.
2. **Envelope.** Most successes are `{status, response}` and the actions return `response`.
   Exceptions: `GET /numbers/{slug}` answers bare; deletes and `PATCH /contacts` answer `{status}`;
   `GET /calls/{id}` and `GET /assistants/{id}` answer a one-element array, returned here as `call`
   / `assistant`.
3. **Three pagination styles.** List actions return `{items, pagination}`. Most use
   `limit`/`offset`; contacts return `total`/`page_size`/`page_number` (no paging input is
   documented); chats use a cursor and are not listed here.
4. **`workspace` is required** on Phone Numbers and Voices only.
5. **Chat ids are client-chosen UUIDs.** `chat-create` generates one when blank.
6. **Probe.** `GET /assistants/` (the call Synthflow's own docs use to verify a key). Rejection is
   classified from the body description (`Unauthorized: Invalid or expired token.` vs `Missing or
   invalid Authorization header`), never the status code; both are `401` today.

## Actions

| Resource | Actions |
|---|---|
| Agent | `assistant-list`, `assistant-get`, `assistant-delete` |
| Call | `call-make`, `call-list`, `call-get` |
| Batch call | `batch-call-create`, `batch-call-list`, `batch-call-get`, `batch-call-list-recipients`, `batch-call-pause`, `batch-call-resume`, `batch-call-cancel` |
| Phone number | `phone-number-list`, `phone-number-get` |
| Voice | `voice-list` |
| Knowledge base | `knowledge-base-list`, `knowledge-base-get` |
| Contact | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete` |
| Chat | `chat-create`, `chat-send-message`, `chat-get` |

## Health

- `service` — the `Synthflow API` and `End to End calling` components of the incident.io page at
  `status.synthflow.ai/api/v2/summary.json` (page name "Synthflow AI Status Page", five components;
  `/index.json` is a 404). The dashboard, marketing website and status-page components are
  reported but never decide the verdict. A broken or foreign page is `unknown`, never `down`.
- ~~`quota`~~ — declared unavailable (`informational`): the spec declares no `429` and no
  rate-limit header, and none was seen live.

## Deliberately left out

Agent create/update, action authoring, knowledge-base and source management, phone-book, memory
store, subaccount, simulation (cases, suites, scenarios), analytics export, MCP configuration,
webhook logs, WebSocket-media calls, phone-number attach/detach/update/import and chat
list/delete/outbound. Agent, action and knowledge-base bodies are deeply nested configuration meant
to be built once in the dashboard and referenced by id; the rest are outside the core call-and-catalog
surface and can be added in a follow-up.

## Icon

`assets/icon.svg` embeds the vendor's own mark verbatim: the 256x256 PNG served at
`https://docs.synthflow.ai/api/fern-docs/favicon.ico` (despite the `.ico` name the bytes are
`PNG image data`), base64-embedded in an SVG `<image>`.
