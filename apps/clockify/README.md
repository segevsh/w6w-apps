# Clockify

Track time entries, projects, clients, and workspaces via the [Clockify REST API v1](https://api.clockify.me/api/v1).

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
