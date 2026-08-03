# Google Tasks

Read and manage Google Tasks: task lists, tasks, completion, reordering, and clearing completed
work.

- **Categories** — productivity, project-management
- **Auth methods** — oauth2
- **Actions** — 13
- **Egress allowlist** — `tasks.googleapis.com`
- **Website** — https://tasks.google.com
- **API docs** — https://developers.google.com/workspace/tasks/reference/rest

## Base URL

```
https://tasks.googleapis.com/tasks/v1
```

The version prefix is part of the **path**, not the host, and the host is `tasks.googleapis.com` —
not the `www.googleapis.com` that Calendar, Drive, Docs and Sheets use. Both halves are
load-bearing; either alone 404s.

## Actions

| Key                     | Type    | Endpoint                                             |
| ----------------------- | ------- | ---------------------------------------------------- |
| `list-task-lists`       | read    | `GET /users/@me/lists`                               |
| `get-task-list`         | read    | `GET /users/@me/lists/{tasklist}`                    |
| `create-task-list`      | perform | `POST /users/@me/lists`                              |
| `update-task-list`      | perform | `PATCH /users/@me/lists/{tasklist}`                  |
| `delete-task-list`      | perform | `DELETE /users/@me/lists/{tasklist}`                 |
| `list-tasks`            | read    | `GET /lists/{tasklist}/tasks`                        |
| `get-task`              | read    | `GET /lists/{tasklist}/tasks/{task}`                 |
| `create-task`           | perform | `POST /lists/{tasklist}/tasks`                       |
| `update-task`           | perform | `PATCH /lists/{tasklist}/tasks/{task}`               |
| `complete-task`         | perform | `PATCH /lists/{tasklist}/tasks/{task}` (status only) |
| `delete-task`           | perform | `DELETE /lists/{tasklist}/tasks/{task}`              |
| `move-task`             | perform | `POST /lists/{tasklist}/tasks/{task}/move`           |
| `clear-completed-tasks` | perform | `POST /lists/{tasklist}/clear`                       |

`PUT` (full replace) variants exist for both resources and are deliberately not wrapped: `PATCH`
does the same job without silently clearing the fields you did not send.

### Things the API's shape forces on you

- **Task list ids are opaque and there is no `@default` alias.** `@me` is the only literal in the
  API and it is fixed in the path (`/users/@me/lists`). Discover ids with `list-task-lists`; there
  is no way to address "the user's default list" by name.
- **Placement is a query concern, not a body one.** `parent` and `position` are `readOnly` on the
  Task schema, so `create-task` takes `parent`/`previous` as query parameters and re-nesting or
  reordering an existing task goes through `move-task`. A `parent` sent in a patch body is ignored.
- **`due` records only a date.** Google stores the date portion of the RFC 3339 timestamp and
  discards the time of day. A due _time_ cannot be set through this API.
- **Completion is a field, not an endpoint.** `complete-task` is `tasks.patch` with
  `status: "completed"`; reopening is `update-task` with `status: "needsAction"`.
- **"Clear" hides, it does not delete.** `clear-completed-tasks` marks completed tasks `hidden` —
  the same thing the Tasks UI's "Delete completed tasks" does. They keep their ids and come back
  from `list-tasks` with `showHidden: true`.
- **`showCompleted` does not imply `showHidden`.** A task completed before the list was last cleared
  is hidden, so a default `list-tasks` call returns recent completions but not older ones.

## Auth

**`oauth2` only** — and that is not an omission. Google documents exactly one credential path for
the Tasks API, the standard user OAuth flow, with exactly two scopes:

| Scope                                            | Grants                                            |
| ------------------------------------------------ | ------------------------------------------------- |
| `https://www.googleapis.com/auth/tasks`          | Create, edit, organize, and delete all your tasks |
| `https://www.googleapis.com/auth/tasks.readonly` | View your tasks                                   |

This app requests `tasks` alone. It writes, and `tasks` is a superset of `tasks.readonly`, so asking
for both would add nothing.

**Why there is no `service-account` method**, unlike the sibling `google-calendar`, `google-drive`
and `gmail` apps: Tasks data is per-user and personal. A service account is its own principal with
no Google account behind it, so it has no task list of its own — every one of these endpoints would
return an empty or 4xx result. The only way a service account reaches real task data is domain-wide
delegation, i.e. impersonating a real user, which is a Workspace-admin configuration rather than
something this app can implement, and which the Tasks API's own auth page does not document.
Shipping a `service-account` method here would mean shipping one that cannot work; it is left out
rather than stubbed.

`www.googleapis.com` appears in the scope strings but is **not** in `w6w.network.allow`, because it
is never fetched — a Google OAuth scope is a URL-shaped _identifier_, not an endpoint. Allowing it
would open the sandbox to every Google API for no reason. The auth module composes those URNs from a
named constant so the distinction is visible in the source.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

Google Workspace publishes an incident **feed**, not a current-state rollup, so "up" is the absence
of an open incident: an entry with no `end` is still running. The feed covers all of Workspace, so
it is filtered by `service_name` — a Meet outage is not a Tasks outage.

Coverage was verified rather than assumed: **Google Tasks is a first-class product on that
dashboard**, listed as `"Google Tasks"` in
`https://www.google.com/appsstatus/dashboard/products.json`, so incidents affecting it do surface in
this feed under that name.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /users/@me/lists?maxResults=1
```

One entry from the task list index. There is no whoami on the Tasks API, and capping the page at 1
keeps it cheap. Two properties make this the right probe rather than, say, reading a task: it
succeeds for an account with **zero** task lists (an empty list is still a 200), and it is reachable
by `tasks.readonly` as well as `tasks` — so a legitimately read-only credential is never reported as
broken.

There is deliberately no `afterConnect`: the Tasks API exposes no identity endpoint, and Google's
userinfo endpoint would require an extra identity scope this app has no reason to hold. A connection
label is not worth widening consent for.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key           | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | ------------ | --------------------------------------------------- |
| `service`     | service    | app        | none       | degraded      | 120s         | `health/service.ts`                                 |
| `quota`       | quota      | connection | signed     | informational | —            | _declared absent_                                   |
| `auth:oauth2` | credential | connection | signed     | fatal         | —            | derived from the `oauth2` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** — not from
any action, and not from the other checks. The spec allows the widening precisely because the check
is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

**`quota` is declared absent.** Google publishes no headroom endpoint or rate-limit headers for the
Tasks API. Quota is per-project and visible only in the Google Cloud console; exhaustion surfaces as
429 `rateLimitExceeded` or 403 `userRateLimitExceeded`. The API also enforces per-user resource caps
that are likewise not readable over the wire — 20,000 non-hidden tasks per list, 100,000 tasks in
total, and 2,000 subtasks per task. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Links

| What                                    | URL                                                          |
| --------------------------------------- | ------------------------------------------------------------ |
| Product                                 | https://tasks.google.com                                     |
| API overview                            | https://developers.google.com/workspace/tasks                |
| REST reference (used to build this app) | https://developers.google.com/workspace/tasks/reference/rest |
| Scopes                                  | https://developers.google.com/workspace/tasks/auth           |
| Discovery document                      | https://tasks.googleapis.com/$discovery/rest?version=v1      |
| Status dashboard                        | https://www.google.com/appsstatus/dashboard/                 |
| Google Workspace samples (GitHub org)   | https://github.com/googleworkspace                           |
| Generated API clients (GitHub)          | https://github.com/googleapis/google-api-nodejs-client       |

Icon: the vendor's own mark, copied verbatim from n8n's `nodes-base`
(`nodes/Google/Task/googleTasks.svg`), matching the provenance of the other ported apps in this
pack.

---

Researched and endpoint-verified 2026-08-03 against the REST reference **and** the v1 discovery
document (`$discovery/rest?version=v1`), which is the machine-readable source for every path,
method, query parameter and `readOnly` field asserted above. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
