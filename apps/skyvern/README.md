# Skyvern

Automate any website with Skyvern's AI browser agents: start a one-off task from a plain-language
goal, run a saved agent (workflow), and manage the runs, persistent browser sessions, browser
profiles and stored credentials around them. Skyvern Cloud only (`api.skyvern.com`).

- **Categories** — ai, developer-tools
- **Auth methods** — api-key
- **Actions** — 20
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.skyvern.com` (the `service` check adds `status.skyvern.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.skyvern.com/
- **API docs** — https://www.skyvern.com/docs/ (index: https://docs.skyvern.com/llms.txt)
- **OpenAPI** — https://api.skyvern.com/openapi.json
- **Status page** — https://status.skyvern.com/

> **Everything below was verified on 2026-10-06** against Skyvern's own OpenAPI document
> (`info.title` "Skyvern API", version 1.0.0, 566,818 bytes) and live, unauthenticated probes of
> `api.skyvern.com` and `status.skyvern.com`. No operation this app uses carries `deprecated: true`.

## Actions

| Group            | Actions                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Runs             | `run-task`, `run-agent`, `run-get`, `run-list`, `run-cancel`, `run-retry`, `run-artifacts`, `run-timeline` |
| Agents           | `agent-list`, `agent-get`                                                                     |
| Browser sessions | `browser-session-create`, `browser-session-list`, `browser-session-get`, `browser-session-close`, `browser-session-extend` |
| Browser profiles | `browser-profile-list`, `browser-profile-get`, `browser-profile-delete`                       |
| Credentials      | `credential-list`, `credential-get` (read-only)                                               |

`run-task` and `run-agent` return as soon as the run is created. Poll `run-get` until `status` is
terminal (`completed`, `failed`, `terminated`, `timed_out`, `canceled`), or pass a `webhookUrl`.

## The things most likely to cost someone a day

### 1. "Workflow" is now "agent", and the operation ids still say workflow

The current surface is `/v1/agents` and `POST /v1/run/agents`; the request names the agent
`agent_id` (`wpid_…`), with `workflow_id` accepted as an alias. The OpenAPI operation ids
(`run_workflow_v1_run_agents_post`, `get_workflows_v1_workflows_get`) and most older blog posts and
SDK snippets still say workflow and use `/v1/workflows`. This app uses only the `/v1/agents` paths
the spec publishes.

### 2. Auth failures are HTTP 403, not 401, and the two cases differ only by body

An authenticated route answers `403 {"detail":"Invalid credentials"}` with no key and
`403 {"detail":"Could not validate credentials"}` with a wrong one. `/v1/version` answers 200 to
anyone, so it proves reachability but never a key. The credential probe is
`GET /v1/browser_profiles?page_size=1`, which needs a key and returns only a JSON array of the
account's profiles; it passes only on that array, and the failure text is chosen from `detail`.

### 3. One id prefix per thing, and two different run shapes behind `GET /v1/runs/{id}`

A task run is `tsk_…` and an agent run is `wr_…`; `run-get` takes either and the response union
differs (agent runs add `attempt`, `attempts`, `retry_pending`, `script_id`). `run-retry` only
accepts an agent run, and `run-timeline` only covers agent (and task_v2) runs. Browser sessions are
`pbs_…`, profiles `bp_…`, agents `wpid_…`. List endpoints return a bare array with no total, paged
by `page` / `page_size`, and `GET /v1/runs` caps `page_size` at 100. Multi-value filters
(`status`, `workflow_permanent_id`, `artifact_type`) are a repeated query key, which this app sends
as such.

Skyvern bills per step, so set `maxSteps` on `run-task` (and `maxElapsedTimeMinutes` on
`run-agent`).

## Health checks

- **`service`** — [Statuspage](https://status.skyvern.com/api/v2/summary.json), verified real
  (`page.id` `vz1pz14l5w34`, `page.name` Skyvern; `skyvern.statuspage.io` serves the same page). The
  page is pinned by id on every run. Its three components are `Skyvern API` and
  `Skyvern Async Workers` (which executes every run), which decide the verdict as the worse of the
  two, and `Skyvern Cloud (Web Application)`, reported as detail and never driving it.
- **`api`** — unsigned `GET /v1/version`. A 200 carrying a `version` string, or a 403 carrying
  Skyvern's `{"detail": …}`, proves the API is serving; a 5xx or a non-JSON shell is down.
- **`quota`** — declared unavailable at informational severity. Responses carry only a static
  `ratelimit-policy: "submit-run";q=50;w=60` and there is no remaining-quota header, balance or
  plan-limit endpoint in the spec.
- **`auth:api-key`** — derived from the auth `test` hook above.

## Not yet covered

Left out rather than guessed at; all are real operations in the spec:

- Creating, updating and deleting agents (`POST /v1/agents`, `…/{id}`, `…/{id}/delete`), agent
  versions, folder moves and the persisted-profile reset.
- Scripts (`/v1/scripts`, deploy, run) and schedules (`/v1/agents/{id}/schedules…`,
  `/v1/schedules`).
- Writing credentials (create / update / delete) and sending a TOTP code, so no secret is ever
  accepted by this app; the login (`/v1/run/tasks/login`) and file-download
  (`/v1/run/tasks/download_files`) task shortcuts.
- Tags, folders, custom LLMs, job recipes, bulk cancel, webhook replay, artifact content download,
  file upload (`/v1/upload_file`) and delete, browser-session update (PATCH), browser-profile create
  and update, the SDK `run_action` endpoint and audit-event export.
- Self-hosted Skyvern (the spec lists a localhost server). The app is Cloud-only because the manifest
  has no per-connection base URL.

`browser_address` on a browser session is a CDP connection URL; whether it embeds a credential was
not verifiable without a key, so treat that field as sensitive in downstream steps.

## Tests

`deno task test` runs 54 tests: the entry module, one file per action under `tests/actions/`, the
client, auth and the health checks, all against a mocked `HookContext`.
