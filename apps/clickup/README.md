# ClickUp

Tasks, lists, folders, comments, and time tracking via the ClickUp API (v2).

- **Categories** — project-management, productivity
- **Auth methods** — api-token, oauth2
- **Actions** — 12
- **Egress allowlist** — `api.clickup.com`
- **API docs** — https://clickup.com/api (reference: https://developer.clickup.com/reference)

## Actions

Grouped by resource; each maps to one nested ClickUp v2 endpoint.

| Key | Endpoint |
|---|---|
| `task-create` | `POST /list/{listId}/task` |
| `task-get` | `GET /task/{taskId}` |
| `task-get-many` | `GET /list/{listId}/task` |
| `task-update` | `PUT /task/{taskId}` |
| `task-delete` | `DELETE /task/{taskId}` |
| `list-create` | `POST /folder/{folderId}/list` or `POST /space/{spaceId}/list` |
| `list-get-many` | `GET /folder/{folderId}/list` or `GET /space/{spaceId}/list` |
| `folder-get-many` | `GET /space/{spaceId}/folder` |
| `comment-create` | `POST /{task\|list\|view}/{id}/comment` |
| `comment-get-many` | `GET /{task\|list\|view}/{id}/comment` |
| `time-entry-create` | `POST /team/{teamId}/time_entries` |
| `time-entry-get-many` | `GET /team/{teamId}/time_entries` |

ClickUp's REST surface is deeply nested — a task hangs off a list, a list off a
folder or a space, a time entry off a team (workspace). The actions collect the
parent id as a param and build the path from it rather than pretending the
resources are flat. Dates are collected as `datetime` and converted to the
epoch-millisecond integers ClickUp wants; a time-entry duration is collected in
minutes and sent as milliseconds.

Both auth methods sign with a **raw** `Authorization: <token>` header — ClickUp
does not use the `Bearer` scheme for either a personal token or an OAuth access
token, so this is a `custom`/`oauth2` pair whose `sign` writes the token
verbatim. A `Bearer ` prefix earns a 401.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Status.io rollup.

```
GET https://api.status.io/1.0/status/5b6e0963c662144d00913a09
```

ClickUp's status page (`status.clickup.com`) runs on **Status.io**, not Atlassian
Statuspage, so there is no `/api/v2/summary.json` — the `/api/v2/status.json` probe
404s. The machine-readable surface is Status.io's own JSON rollup, keyed by the
page's public id (read off the status page HTML). It carries a numeric
`result.status_overall.status_code` plus a per-service `result.status[]` array, so the
`service` check reports the overall state and attributes any non-operational service as
a named component. Status.io's codes map as: `100` operational → `ok`; `200`
maintenance / `300` degraded / `400` partial → `degraded`; `500` disruption / `600`
security → `down`.

`api.status.io` is reachable **only inside this hook's worker** — it is on the check's
own `network.allow`, not the app's egress allowlist, so an action can never call it. The
spec allows the widening precisely because the check is unsigned; pairing an extra host
with `credential: "signed"` is rejected at load time.

### Is this credential live?

This is what each Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /user
```

Returns the authenticated user. Free and scope-free.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Reset` response headers, present on every
response. ClickUp meters **per minute per token** — 100 req/min on Free through
Business, 1,000 on Business Plus, 10,000 on Enterprise — and answers `429` past the
limit. `-Reset` is an **absolute Unix epoch in seconds** (not a delta from now), which
is what the `quota` check converts to an ISO `resetAt`. The check probes the same free
`GET /user` the auth test uses.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `api.status.io` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
