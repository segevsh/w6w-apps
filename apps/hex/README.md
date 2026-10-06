# Hex

Run published Hex projects from a workflow, poll or cancel the runs, and read the workspace's
projects, users, groups, collections and data connections.

- App id: `io.w6w.hex` · categories: `analytics`, `data-warehousing`
- API: `https://app.hex.tech/api/v1`, checked against Hex's OpenAPI 3.0.3 document
  (`https://static.hex.site/openapi.json`, 2026-10-06).
- Egress: `app.hex.tech` only.

## Auth

One method, `api-token` (`bearer`): paste a Hex API token (workspace token or personal access token)
from Hex > Settings > API keys. The `sign` hook sends it as `Authorization: Bearer <token>`.

- A **personal** token acts as its user. A **workspace** token acts as the workspace and `users/me`
  returns no user fields, so the connection label falls back to the org id.
- Scope the token to what the workflows need; a missing scope surfaces as a 403 from the route.
- `test` calls `GET /users/me`. Its response carries the token's expiry (`token.exp`), never the token.
  A bad or missing token is answered at the edge with 401 and the plain text `Unauthorized`; a 403
  with a structured JSON error comes from a route, so the token did authenticate and `test` passes.

## Actions (15)

| Action | Endpoint |
|---|---|
| `project-list` | `GET /v1/projects` |
| `project-get` | `GET /v1/projects/{projectId}` |
| `project-run` | `POST /v1/projects/{projectId}/runs` |
| `project-runs-list` | `GET /v1/projects/{projectId}/runs` |
| `run-get` | `GET /v1/projects/{projectId}/runs/{runId}` |
| `run-cancel` | `DELETE /v1/projects/{projectId}/runs/{runId}` |
| `project-queried-tables-list` | `GET /v1/projects/{projectId}/queriedTables` |
| `me-get` | `GET /v1/users/me` |
| `user-list` | `GET /v1/users` |
| `group-list` / `group-get` | `GET /v1/groups`, `GET /v1/groups/{groupId}` |
| `collection-list` / `collection-get` | `GET /v1/collections`, `GET /v1/collections/{collectionId}` |
| `data-connection-list` / `data-connection-get` | `GET /v1/data-connections`, `GET /v1/data-connections/{id}` |

Things worth knowing:

- **Run Project runs the latest published version** and answers 201 with a run handle (`runId`,
  `runUrl`, `runStatusUrl`), not a result. Poll `run-get` until the status is `COMPLETED`, `ERRORED`,
  `KILLED` or `UNABLE_TO_ALLOCATE_KERNEL`. It is not idempotent: there is no idempotency key.
- **`updateCache` is deprecated** and never sent. `project-run` exposes `updatePublishedResults`
  (Hex default false) and `useCachedSqlResults` (Hex default true) and sends only what you set.
- **Two pagination styles.** Every list uses `limit` + an opaque `after` cursor (pass the response's
  `pagination.after`), except `project-runs-list`, which uses `limit`/`offset` (max 100).
  Page-size ceilings differ: 100 everywhere, 500 for users.
- **Three error shapes**: `{code,message,issues}`, `{reason,details,traceId}`, and bare text. The
  client formats all three and appends the `x-trace-id` header.
- **Rate limits** are documented per group (default `hex-api` 30/min, 1,800/hour; `hex-run-kernel`
  for run starts) but no header reports headroom.
- `run-cancel` answers 204 with no body, so the action returns `{ cancelled: true, projectId, runId }`.
  Cancelling a finished run is refused by Hex.

## Not yet covered

Left out on purpose; each is a write or admin surface that deserves its own review:
`POST /v1/projects` (create), `PATCH /v1/projects/{id}`, project sharing (`/sharing/*`),
`POST /v1/projects/export`, `POST /v1/projects/compute-profile/batch`, groups/collections/data-connection
create/edit/delete, `DELETE`/deactivate user, cells (`/v1/cells*`), chart images (binary),
suggestions, threads, guides, context topics, semantic project ingest/update, and embedding
presigned URLs.

## Icon

`assets/icon.svg` is Hex's own mark, byte-identical to `https://hex.tech/favicon.svg` (280x280, 632 B).

## Health checks

| Key | Kind | Notes |
|---|---|---|
| `service` | service | `https://status.hex.tech/api/v2/summary.json` (Statuspage, page id `x0hffrksr5vy`, `page.name` "Hex"). The page has no "API" component, and the API shares a host with the product, so `Main site` (may be `down`), `Kernels` and `Data Connections` (capped at `degraded`) decide the verdict. `Login` and `Single tenant stacks` are shown as detail only. A page whose id differs reports `unknown`. |
| `quota` | quota | Declared unavailable, `informational`: no remaining-count header or usage endpoint. |
| `auth:api-token` | credential | Derived from the auth `test` hook. |
