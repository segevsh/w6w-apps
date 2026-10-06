# Recruit CRM

Search and manage Recruit CRM candidates, companies, contacts and jobs, assign candidates to jobs
and move them through hiring stages. REST API at `https://api.recruitcrm.io/v1`, read from the
vendor's OpenAPI 3.0 document (`https://api.recruitcrm.io/docs`); the unsigned error shapes were
probed live on 2026-10-06.

## Auth setup

One method, `api-token` (bearer). Copy the API token from Recruit CRM > Admin Settings > API (the
vendor's docs also say Account Management) and **activate it there** — an inactive token is refused
(`token_not_active_error`). `sign` stamps `Authorization: Bearer <token>`; no action touches the
credential. The connection test calls `GET /v1/users`, whose response is the account's users
(`id`, `first_name`, `last_name`, `email`, `contact_number`) and never contains the token. The
verdict comes from the response body (an error string in `error`, `message` or `errorMessage`), not
the status code: an unsigned call answers `{"error":"Unauthorized"}`, a bad token
`{"message":"credential could not be resolved"}`.

## Actions (24)

| Resource | Actions |
| --- | --- |
| Candidate | `candidate-list`, `candidate-search`, `candidate-get`, `candidate-create`, `candidate-update`, `candidate-delete`, `candidate-assign`, `candidate-unassign`, `candidate-hiring-stage-update` |
| Company | `company-list`, `company-search`, `company-get`, `company-create` |
| Contact | `contact-list`, `contact-search`, `contact-get`, `contact-create` |
| Job | `job-list`, `job-search`, `job-get`, `job-assigned-candidates` |
| Other | `note-create`, `hiring-pipeline-list` (stage ids for `candidate-hiring-stage-update`), `user-list` (owner ids) |

Quirks worth knowing: edits are `POST /{entity}/{id}` (there is no PUT/PATCH); candidate create and
edit are `multipart/form-data` as the spec declares (every other write is JSON); the path "slug" is a
numeric id; lists are Laravel paginators (`page`, `limit` max 100) folded to
`{items, count, currentPage, perPage, hasMore}`; search endpoints document no paging parameters.
The assign/unassign endpoints take the job as `?job_slug=` in the query.

## Not yet covered

Left out because the spec is thin or the shape could not be confirmed without a live key:

- Job create/edit (a 35-field body with nested arrays), company edit/delete, contact edit/delete.
- Candidate resume/avatar upload, `salary_type`, and `custom_fields` on any entity (and the
  `custom_fields` search filter, which the spec passes as a JSON-encoded query value).
- Hiring-stage reads (`GET /candidates/{id}/hiring-stages[/{job}]`, `.../history`,
  `/jobs/{id}/stage-history/{candidate}`) — the spec documents no response schema for them.
- Candidate visibility, profile-update request, apply-to-job, hotlists, deals, call logs, meetings,
  tasks, subscriptions (webhooks), custom-field catalogues and the reference lists (currencies,
  industries, qualifications, note types, other pipelines, collaborators).
- Hiring-stage update sends `status: {status_id, label?}` and `remark`, `stage_date`,
  `visibility` as the spec's `AssignedJob` schema shows; the spec marks nothing as required.

## Icon

`assets/icon.svg` embeds, byte for byte, the 180x180 PNG Recruit CRM links from its own site as
`<link rel="apple-touch-icon" href="/apple-icon.png">` (`https://recruitcrm.io/apple-icon.png`).
`favicon.ico` there is itself a 96x96 PNG; no vendor SVG exists (`/favicon.svg` is a 404 HTML page,
and the logo in the spec's `x-logo` answers 403). Nothing was redrawn.

## Health checks

- `service` (informational) — `status.recruitcrm.io/api/v2/summary.json`, `page.name` "RecruitCRM",
  Statuspage-compatible schema (`/api/v2/incidents.json` exists, nonsense paths 404, no Better
  Stack/Instatus shape). Its 24 components are regions only (`Asia`, `Europe`, `North America`
  repeated across unnamed groups) and none names the API, so the verdict is the page-level
  `status.indicator`.
- `api` — unsigned `GET /v1/users`; a JSON `{"error": …}` 401 proves reachability and passes.
- `quota` — declared unavailable: the docs promise 60 requests/minute per token and an
  `X-RateLimit` header, but the only measured (unsigned) headers show an anonymous traffic class
  with limit 30000, and a signed token's values could not be checked.
- `auth:api-token` is derived from the connection test.
