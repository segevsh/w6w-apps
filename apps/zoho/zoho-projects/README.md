# Zoho Projects

Manage Zoho Projects portals, projects, task lists, tasks, milestones, issues and time logs.

Scoped to **Zoho Projects specifically** (the V3 API). This pack also ships `zoho` (CRM),
`zoho-workdrive`, `zohodesk` and others — separate products with separate API surfaces.

- **Categories** — project-management
- **Auth methods** — oauth2 (authorization code), one per Zoho data centre — **eleven**
- **Actions** — 34
- **Egress allowlist** — `projects.{zoho.com,zoho.eu,zoho.in,zoho.com.au,zoho.jp,zohocloud.ca,zoho.com.cn,zoho.sa,zoho.uk,zoho.ae,zoho.sg}`

## Actions

| Group | Actions |
| --- | --- |
| Portals | `portal-list`, `portal-get` |
| Users | `user-list`, `user-get`, `project-user-list` |
| Projects | `project-list`, `project-get`, `project-create`, `project-update`, `project-trash`, `project-restore` |
| Task lists | `tasklist-list`, `tasklist-create`, `tasklist-update`, `tasklist-delete` |
| Tasks | `task-list`, `task-get`, `task-create`, `task-update`, `task-delete` |
| Milestones | `milestone-list`, `milestone-get`, `milestone-create`, `milestone-update`, `milestone-delete` |
| Issues | `issue-list`, `issue-get`, `issue-create`, `issue-update`, `issue-delete` |
| Time logs | `timelog-list`, `timelog-get`, `timelog-create`, `timelog-update` |

Typical flow: `portal-list` → `project-list` (portal id) → `task-list` / `issue-list` (project id).
List actions return `{ items, hasNext, page }`; every other action returns `{ item }` holding the
vendor's JSON response (deletes return `{ deleted: true }`). IDs are strings on purpose — some Zoho
ids exceed 2^53 and would lose precision as numbers.

## What was verified, and where

Everything was read from the V3 reference (`https://projects.zoho.com/api-docs`, "Zoho Projects V3
API Documentation") on 2026-10-06, plus unauthenticated probes of the live API. The older
`/restapi/` pages are marked "will be deprecated soon", so this app targets V3 only.

- Base `https://projects.<tld>/api/v3/portal/{portal_id}/…` (only `GET /api/v3/portals` is not
  portal-scoped). The API host is `projects.<tld>` per data centre, not the `www.zohoapis.<tld>`
  host other Zoho APIs use; Zoho's table lists 11 data centres.
- Header `Authorization: Bearer <token>` (stamped only in `sign`). V3 documents `Bearer`; the older
  Zoho APIs' `Zoho-oauthtoken` prefix is not used.
- Bodies are plain JSON; long ids are strings. Milestones use `/api/v3.1/.../phases` (the v3
  `/phases` shapes are superseded in the reference).
- **Pagination**: `page` + `per_page` (1-200, default 100); lists answer
  `{ "page_info": { "page", "per_page", "has_next_page" }, "<collection>": [...] }`. The reference's
  samples occasionally show a bare array or an array-valued `page_info`; the client tolerates both.
- **Errors**: `{ "error": { "status_code", "title", "error_type", "details": [{ "message" }] } }`.
  `title` is the vendor's stable code. Live probes: no token → `401 INVALID_TICKET`, bad token →
  `401 INVALID_OAUTHTOKEN`.
- **Rate limit**: each API 200 calls / 2 minutes, then blocked for 10 minutes (`Retry-After`).
- **Scopes**: `ZohoProjects.portals.READ`, `projects.ALL`, `tasklists.ALL`, `tasks.ALL`,
  `milestones.ALL`, `bugs.ALL`, `timesheets.ALL`, `users.READ`.

## Regional accounts

Zoho hosts each account in one data centre and a token only works against that data centre's API
host. Pick the connection method matching the domain your Zoho Projects URL ends in:
`.com` US · `.eu` Europe · `.in` India · `.com.au` Australia · `.jp` Japan · `zohocloud.ca` Canada ·
`.com.cn` China · `.sa` Saudi Arabia · `.uk` United Kingdom · `.ae` UAE · `.sg` Singapore. Register
a client in the Zoho API console of the same data centre.

## Health checks

- `service` — Zoho's StatusIQ RSS (`us.zohostatus.com/rss`), matched on the exact `Zoho Projects`
  component (one entry, `Zoho Projects - Operational`). The feed is host-fetched and not on
  `network.allow`.
- `quota` — declared unavailable (informational): the `RateLimit*` headers are per-endpoint response
  headers and there is no usage endpoint.
- Credential probe (derived from `auth.test`) — `GET /api/v3/portals`, which returns the caller's
  portals, never the token. Classified by the body's `error.title`, not the HTTP status.

## Not covered

Left out because the endpoint's shape was ambiguous in the reference or it is outside the core
surface; each can be added later:

- The `filter` query on list endpoints (the reference's example encodes the parameter name as
  `%22filter%22`, which looks like a documentation artifact — not guessed).
- Task `duration` (the parameter table says `type`, the example body says `unit`) and updating task
  owners (`add`/`remove` shape unclear); task-list `clone`, `move`, `reorder`, subtask conversion.
- Time log delete (the reference lists a required `module` parameter without saying whether it is a
  query or body field), bulk time logs, bulk task update, timesheet approval.
- Project permanent delete, the portal bin, comments, attachments and WorkDrive links, followers,
  dependencies, baselines, custom fields/layouts/modules, templates, automation, users
  administration and invitations, clients/contacts, calendar events, forums, documents.
