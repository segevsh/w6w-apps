# Mem

Drive **Mem** (the AI note-taking workspace) from a workflow: notes, collections, Mem It, and the
tasks, projects and follow-ups Mem derives from your notes, over the v2 API at `api.mem.ai`.

- **Categories** — productivity, ai
- **Auth methods** — api-key (bearer)
- **Actions** — 26
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.mem.ai` (the `service` check adds `status.mem.ai` to its own hook
  allowlist, never to the app's)
- **API docs** — https://docs.mem.ai/api-reference/overview/introduction
- **Status page** — https://status.mem.ai/

> Read on 2026-10-06 from Mem's OpenAPI document (`docs.mem.ai/api-reference/openapi.json`) and
> prose pages, and probed live for the auth and status behaviour below.

## Connecting

Create an API key in Mem under **Settings > API**. It acts as its owner on all of their notes. The
connection test calls `GET /v2/collections?limit=1` (collection titles only; never the key). The
verdict comes from the body's `error_metadata.error_kind` (`NOT_AUTHORIZED`), not the status code.

## Things most likely to go wrong

1. **`/v2/*` only.** The spec still lists legacy `/v0` and `/v1` routes; they are not wrapped.
2. **Note writes replace the whole body.** The first line of `content` is the title. Update Note needs
   the exact `version` (from Get Note or the last write) and Mem rejects a stale one, so it is marked
   non-idempotent. A trashed note must be restored before it can be updated.
3. **Three pagination styles.** Lists use a `page` cursor; Search Notes uses `limit`/`offset` plus a
   `snapshotId`; Extended Search uses `nextPageCursor`. All return `{items, ..., hasMore}`.
4. **Limits.** 100 requests and 200 complexity tokens per minute, 4,000 / 8,000 per day; Mem It costs
   40 tokens. A 429 can also be a plan quota (`error.type: quota_exceeded`, with `Retry-After`).
5. **Mem It is asynchronous.** It answers only an acknowledgement; the notes appear later.
6. **List-valued inputs are comma-separated text** (collection IDs/titles, exclude IDs).
7. **Delete Note is permanent**; Trash Note is the recoverable form.

## Actions

| Group       | Actions |
| ----------- | ------- |
| Notes       | `note-list`, `note-get`, `note-create`, `note-update`, `note-delete`, `note-trash`, `note-restore`, `note-search`, `note-extended-search`, `note-related-list` |
| Collections | `collection-list`, `collection-get`, `collection-create`, `collection-update`, `collection-delete`, `collection-search`, `collection-add-note`, `collection-remove-note`, `collection-move-note` |
| Mem It      | `mem-it` |
| Derived     | `task-list`, `task-get`, `project-list`, `project-get`, `follow-up-list`, `follow-up-get` |

## Not covered

Legacy `/v0`, `/v1`; calendar (calendars, connections, events, settings, OAuth); sessions and
session events; audio recordings; attachments (read / answer-question / download URL); events and
event types; the agent message endpoint; the MCP/ChatGPT helper routes; Set Note Created At;
`/v1/service-info`. Left out to keep the app to the notes surface; none was found broken.

## Health checks

- **`service`** — `https://status.mem.ai/api/v2/summary.json` (an incident.io page serving the
  Statuspage-compatible schema; `page.name` "Mem", `page.id` pinned to `01HSH3R704JC0MAEVQYDPBEK3K`).
  Reads the page's single component, `API`. A failing page, a changed page id or a missing
  component is `unknown`, never `down`.
- **~~`quota`~~** — declared unavailable (informational): headroom is reported only in headers of
  authenticated calls and there is no usage endpoint, so a probe would spend what it measures.
- **`auth:api-key`** — derived from the auth `test` hook above.
