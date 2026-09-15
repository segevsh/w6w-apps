# Float

Manage people, projects, allocations, time off, milestones, clients, statuses and logged time in
**Float** — resource scheduling and team capacity planning — over the **Float API v3**.

- **Categories** — project-management, hr
- **Auth methods** — api-token
- **Actions** — 40 (full list/get/create/update/delete for each of 8 resources)
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-token`
- **Egress allowlist** — `api.float.com` (the `service` check adds `status.float.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.float.com/
- **API docs** — https://developer.float.com/
- **OpenAPI (Swagger 2.0)** — https://developer.float.com/swagger-api-v3.yaml (fragments under
  `paths/*.yaml`)
- **Status page** — https://status.float.com/

> **Everything below was verified against Float's own sources on 2026-09-15** — its Swagger 2.0
> document (`developer.float.com/swagger-api-v3.yaml`, `info.version` `3.0.0`, and every
> `paths/*.yaml` fragment it references), the prose pages linked from `developer.float.com`, and live
> probes against `api.float.com` and `status.float.com`. Nothing here came from a third-party
> integration directory.

## The four things most likely to cost you a day

### 1. A missing `Authorization` header never reaches Float's own API

Live probes on 2026-09-15 found an edge/WAF layer sitting in front of Float's own Kong gateway:

| Request | Response |
| --- | --- |
| No `Authorization` header at all | `403 Forbidden`, `text/html`, no JSON, regardless of `User-Agent` |
| `Authorization: Bearer <anything, even garbage>` | `401`, real JSON: `{"name":"Unauthorized","message":"Your request was made with invalid credentials.","code":0,"status":401}`, plus real `ratelimit-*` headers |

The moment an `Authorization` header is present — valid or not — the request reaches Float and gets
Float's real error shape. A health check or error handler that calls `res.json()` on every 401/403
alike throws on the first case. [`lib/client.ts`](lib/client.ts)'s `formatFloatError` and
[`auth/api-token.ts`](auth/api-token.ts)'s `test` both check `content-type` before parsing, and both
are unit-tested against exactly this non-JSON body.

### 2. `logged-time` create breaks the pattern every other create in this app follows

`POST /v3/logged-time` is the one create endpoint in Float's own schema that:

- answers **`200`, not `201`** — every other create in this app answers `201`, and
- answers a **bare JSON array of entries**, not a single object — even though the request creates
  exactly one entry.

[`actions/logged-time-create.ts`](actions/logged-time-create.ts) returns `{ entries: [...] }` rather
than pretending the array is a single record. Its id field, `logged_time_id`, is also a **string**
(a Mongo-style id like `5e38963be429adc74664c777`) — every other Float resource id in this app is an
integer. `hours: 0` is a documented soft-delete of a matching entry, not an error, and this action
sends it through unchanged rather than treating it as "no value."

### 3. `status` create/update answer a `{status: [...]}` wrapper, because create can delete

Creating a [`status`](actions/status-create.ts) (a short note like "Travelling" or "Office" tied to a
person and a date range) that **overlaps an existing status for that person** silently deletes the
old one — and Float's response is `{"status": [old, new]}`, both records in one array under the
`status` key. `status-create` and `status-update` both pass this shape through untouched rather than
unwrapping it, since collapsing it would hide the delete that just happened.

Separately: `status_type_id` (1 = Home, 2 = Travel, 3 = Custom, 4 = Office by default) has **no
listing endpoint anywhere in this API** — a team can add its own types in Float's Admin Settings, and
the only way to learn the exact set is to look there. `status-list` and `status-create` both say so
in their param hints rather than offering a dropdown this app cannot populate correctly.

### 4. Float explicitly asks every integration to identify itself

`overview_authentication.html` asks for a `User-Agent` header naming the integration plus a contact
email (its own example: `"Glenn's People Import Integration (glenn@example.com)"`). Measured on
2026-09-15, the edge does **not** enforce this — a request without one still succeeds once
`Authorization` is present — but it is the vendor's own explicit, printed request and costs nothing to
honour, so [`lib/client.ts`](lib/client.ts) sends one on every request unconditionally, rather than
leaving it to be discovered as a "please identify yourself" support ticket later.

## Resources covered

Full `list` / `get` / `create` / `update` / `delete` for each of:

| Resource (this app) | Float's own endpoint | Notes |
| --- | --- | --- |
| `person` | `/v3/people` | Creating a person does NOT create an Account (UI-only). Setting `active: false` revokes Account access, also UI-only to restore. |
| `project` | `/v3/projects` | Team composition (`project_team`) is a `{set, add, del}` instruction object, not a plain array — `set`/`del` **cascade-delete** allocations and logged time for removed members. Exposed via `extraFields`, never a typed param, so a generated form cannot silently trigger that. |
| `client` | `/v3/clients` | Simplest resource — just a `name`. |
| `milestone` | `/v3/milestones` | `date`/`end_date` are `YYYY-MM-DD HH:mm` datetime strings, not plain dates. |
| `timeoff` | `/v3/timeoffs` | `people_ids` assigns several people to one time-off record. |
| `allocation` | `/v3/tasks` | Float's API calls a scheduled allocation a `task` — a name collision with **Project Tasks** (`task_meta_id`, the reusable label an allocation points at). This app always says "allocation" in its own action names to keep the two apart. |
| `status` | `/v3/status` | See finding #3 above. `GET` answers `204` (no body) rather than `200` with an empty array when nothing matches. |
| `logged-time` | `/v3/logged-time` | See finding #2 above. Every Logged Time endpoint (list/get/create/update/delete) also answers `403` with `"Time Tracking is not enabled for this team"` when that Float feature is off — not a credential problem, so reconnecting will not fix it. |

Left out, because they fall outside this app's scope of core scheduling objects rather than because
anything about them is unconfirmed: Departments, Roles, Currencies, Rate Cards, Project Stages, Project
Tasks (the label resource, distinct from Allocations), Phases, Project Expenses, Templating Projects,
Public/Team Holidays, Reports, and the Delete Log (`/v3/deleted/*`, the one part of this API that uses
cursor-based pagination instead of `page`/`per-page`).

## Auth

**API Token** (`bearer`) — one token per Float account, minted from **Float > Team Settings >
Integrations**, sent as `Authorization: Bearer <token>`. Float's own docs describe it as granting
access "on behalf of the account owner," with no scoped-token concept — unlike some other vendors in
this pack, there is no "correctly scoped but refused" case to design around.

The credential probe is `GET /v3/departments?per-page=1` rather than `GET /v3/accounts`, even though
both are cheap reads that prove the token works: an `Account` record carries a real teammate's name
and email address, and a health check's stored result has no reason to carry that when a `Department`
(just an id and a name like "Engineers") proves the same thing.

## Health checks

- **`service`** (`kind: service`, unsigned) — reads `status.float.com/api/v2/summary.json`, a real,
  claimed Atlassian Statuspage (verified: the nonsense-path probe 404s rather than answering a page
  shell, and the page names itself "Float" with four genuine components: `Float App`, `API - public`,
  `www.float.com`, `Float Payments & Subscriptions`).
- **`quota`** (`kind: quota`, signed, per-connection) — reads the `ratelimit-limit` /
  `ratelimit-remaining` / `ratelimit-reset` headers (also duplicated as `x-ratelimit-*-minute`) on a
  live signed request, reporting headroom against Float's documented 200 requests/minute GET ceiling.
  The separate 100/minute non-GET ceiling and the stricter per-second burst floor (10/s GET, 4/s
  non-GET) carry **no header at all** — Float's own docs say the only signal for either is the `429`
  itself, so this check does not claim to read them.
- **`auth:api-token`** (derived) — projected automatically from the Auth method's `test` hook.

## Pagination

Every list endpoint in this app uses Float's offset pagination: `page` (default 1) and `per-page`
(default 50 vendor-side, max 200) as query params, with the page metadata reported entirely in
response headers (`X-Pagination-Total-Count`, `-Page-Count`, `-Current-Page`, `-Per-Page`) — never in
the response body, which stays a bare array. `list`/`get` actions in this app return
`{ items, pagination }`, where `pagination` mirrors those four headers.

## Errors

A real Float error is `{"name", "message", "code", "status"}` (e.g. `{"name":"Unauthorized",
"message":"Your request was made with invalid credentials.","code":0,"status":401}`). See finding #1
above for the one case where you get something else entirely.
