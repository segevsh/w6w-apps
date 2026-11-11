# Clockify

Track time entries, projects, clients, and workspaces via the [Clockify REST API v1](https://api.clockify.me/api/v1).

- **Triggers** — 16 (15 webhook, 1 poll)
- **Website** — https://clockify.me
- **API docs** — https://docs.clockify.me/

## Setup

Generate an API key from your Clockify profile: **clockify.me/user/settings** → *API* section, near the bottom of the page. Paste it into the `api-key` connection field.

## Auth

**`api-key`** (`type: "apiKey"`) — a single API key, sent as `X-Api-Key: <key>` on every request. Verified against n8n's `ClockifyApi.credentials.ts` and confirmed live: an unauthenticated `GET /workspaces` returns `401 {"message":"Multiple or none auth tokens present","code":1000}`.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `time-entry-create` | perform | `POST /workspaces/{id}/time-entries` |
| `time-entry-get` | read | `GET /workspaces/{id}/time-entries/{id}` |
| `time-entry-update` | perform | `PUT /workspaces/{id}/time-entries/{id}` |
| `time-entry-delete` | perform | `DELETE /workspaces/{id}/time-entries/{id}` |
| `project-list` | search | `GET /workspaces/{id}/projects` |
| `project-get` | read | `GET /workspaces/{id}/projects/{id}` |
| `project-create` | perform | `POST /workspaces/{id}/projects` |
| `project-delete` | perform | `DELETE /workspaces/{id}/projects/{id}` |
| `workspace-list` | search | `GET /workspaces` |
| `client-list` | search | `GET /workspaces/{id}/clients` |

**Starting a timer** is `time-entry-create` without an `end` — Clockify has no separate "start timer" endpoint, the same convention this pack's Toggl app uses. **Stopping** it is `time-entry-update` with an `end` set (Clockify's `PUT` requires `start` on every call; this action fetches the entry's current `start` automatically when you don't supply one, matching n8n's own documented workaround).

Deliberately not built: dedicated "get current running entry" / "stop" actions using a `user/{userId}/time-entries?in-progress=true`-style endpoint some third-party guides describe — it couldn't be confirmed against a primary source (n8n's own Clockify node doesn't implement it either), so nothing was invented for it. Use `time-entry-update` on the entry ID you already have instead.

## Health checks

- **`service`** — declared absent. No machine-readable status feed exists for Clockify (verified live 2026-08-01: the standard Statuspage path 404s, no linked status page found).
- **`quota`** — declared absent. No rate-limit response headers or headroom endpoint (verified live 2026-08-01).
- **`auth:api-key`** — derived automatically from the auth method's `test` hook.

## Triggers

Webhook triggers on Clockify's workspace webhooks. Each registers itself with
`POST /workspaces/{workspaceId}/webhooks` (event, `triggerSourceType: WORKSPACE_ID`, the callback URL)
and deletes the webhook again on unsubscribe. `project-list` and `client-list` are
covered by the webhook triggers for the same records (`new-project`, `new-client` and their
`-updated`/`-deleted` siblings); `workspace-list` backs the `new-workspace` poll.

| Trigger | Mechanism | Vendor event | What the run gets |
|---|---|---|---|
| `new-time-entry` — New Time Entry | webhook (API) | `NEW_TIME_ENTRY` | The time entry |
| `timer-started` — Timer Started | webhook (API) | `NEW_TIMER_STARTED` | The running time entry |
| `timer-stopped` — Timer Stopped | webhook (API) | `TIMER_STOPPED` | The time entry with its final interval |
| `new-project` — New Project | webhook (API) | `NEW_PROJECT` | The project |
| `new-client` — New Client | webhook (API) | `NEW_CLIENT` | The client |
| `new-task` — New Task | webhook (API) | `NEW_TASK` | The task |
| `time-entry-updated` — Time Entry Updated | webhook (API) | `TIME_ENTRY_UPDATED` | The edited time entry |
| `time-entry-deleted` — Time Entry Deleted | webhook (API) | `TIME_ENTRY_DELETED` | The deleted time entry |
| `project-updated` — Project Updated | webhook (API) | `PROJECT_UPDATED` | The edited project |
| `project-deleted` — Project Deleted | webhook (API) | `PROJECT_DELETED` | The deleted project |
| `client-updated` — Client Updated | webhook (API) | `CLIENT_UPDATED` | The edited client |
| `client-deleted` — Client Deleted | webhook (API) | `CLIENT_DELETED` | The deleted client |
| `task-updated` — Task Updated | webhook (API) | `TASK_UPDATED` | The edited task |
| `task-deleted` — Task Deleted | webhook (API) | `TASK_DELETED` | The deleted task |
| `any-event` — Any Event | webhook (API) | the events you list in **Events** (any name in Clockify's webhook enum: tags, invoices, users, approvals, time off, expenses, assignments, groups, rates, …) | The delivered record plus `webhookEvent` |
| `new-workspace` — New Workspace | poll | `GET /workspaces` (bounded list, diffed each check) | The workspace |

**Any Event** needs **Events** (comma-separated, required): Clockify's create-webhook call takes one
event per webhook, so the trigger registers one webhook per name (all to the same callback URL, each
with its own token; a delivery passes when its `Clockify-Signature` matches any of them). An empty
list is refused rather than registering all ~50 events, since the Free plan allows 3 webhooks.

Setup: set **Workspace ID**, or leave it blank when the account has exactly one workspace. Clockify
limits the number of webhooks per user and workspace by plan (3 on Free).

Trust model: creating a webhook returns a per-webhook token (`authToken`); Clockify says it "will
always be present in the header" of its deliveries (the header is `Clockify-Signature`; the docs
page names the token and "the header" but not the header's name, so the name is the planner's
survey's — **partly UNVERIFIED**). The trigger keeps the token in the subscription state;
`handleIngest` reads the raw body, requires the stored token to exist, and refuses any delivery
whose `Clockify-Signature` header is missing or differs (constant-time compare). A shared token proves
the sender knows it; it does not protect the body from tampering. If Clockify also sends a
`Clockify-Webhook-Event-Type` header that names another event, the delivery is acknowledged without
a run.

Vendor docs: <https://docs.clockify.me/> (Webhooks › Create a webhook), verified 2026-11-10 (event enum and `GET /workspaces` re-read).

Not covered: none — every list action is behind a trigger or covered by one.
