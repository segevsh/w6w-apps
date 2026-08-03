# Microsoft To Do

Manage To Do task lists, tasks, checklist items and linked resources through the Microsoft Graph
**To Do API**.

- **Categories** — productivity, project-management
- **Auth methods** — oauth2
- **Actions** — 19
- **Egress allowlist** — `graph.microsoft.com`
- **API version** — Microsoft Graph **v1.0** (`https://graph.microsoft.com/v1.0`). `beta` is not
  used.

## The API this app is built on — and the one it is not

There are **two** tasks APIs in Microsoft Graph, and only one of them works.

| API                    | Path                        | Status                                                                                   |
| ---------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `outlookTask` (legacy) | `/me/outlook/tasks`         | **Dead.** `beta` only, and it _stopped returning data on 20 August 2022_.                |
| `todoTask` (current)   | `/me/todo/lists/{id}/tasks` | **GA on v1.0.** The API behind every Microsoft To Do client. This is what is built here. |

Microsoft's own `outlookTask` page carries the notice verbatim:

> The Outlook tasks API is deprecated and stopped returning data on August 20, 2022. Use the To Do
> API instead.

This is worth stating loudly because `outlookTask` still appears in search results and in older
integration write-ups, and an app built against it would type-check, deploy, and return nothing.
Every path in this app was read off the **v1.0** reference on 2026-08-03 and none of them touches
`/outlook/tasks`.

The four To Do resources — `todoTaskList`, `todoTask`, `checklistItem`, `linkedResource` — are all
GA on v1.0. **Nothing in this app is sourced from `beta`.**

## Scope: To Do, not "Microsoft tasks"

Microsoft ships several things that look like task management, and they are different products with
different APIs. The boundary here is **Microsoft To Do only** — what `/me/todo` addresses.

**Deliberately left out, and why:**

| Surface                            | Graph offers                       | Why it is not here                                                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Planner**                        | `/planner/plans`, `/planner/tasks` | A different product (team task boards), a different resource model, and different consent scopes (`Tasks.ReadWrite` does not cover it in the way it covers To Do). It deserves its own app, not a second personality in this one.   |
| **To Do task attachments**         | `/tasks/{id}/attachments`          | GA, but the write path is an **upload session** (`createUploadSession` + chunked `PUT` with `Content-Range`) for anything over 3 MB, which needs a binary return contract this action surface does not have. See "Not implemented". |
| **Open extensions**                | `/tasks/{id}/extensions`           | Arbitrary custom properties on a task. Real, but it is a schema-design feature, not an automation step — and `$expand=extensions` already exposes them read-side.                                                                   |
| **Acting on another user's To Do** | `/users/{id}/todo/...`             | Every action here targets `/me`. The `/users/{id}` form needs `Tasks.ReadWrite.All` — an application permission with admin consent — and the blast radius of a mistake is every mailbox in the tenant.                              |
| **Change notifications**           | `/subscriptions`                   | Would be a `TriggerDefinition`, not an Action. The `delta` actions cover the polling half of the same need — see "Not implemented".                                                                                                 |
| **`outlookTask`**                  | `/me/outlook/tasks` (beta)         | Dead since 2022. See above.                                                                                                                                                                                                         |

## Actions

### Task lists (6)

| Action                 | Graph endpoint               |
| ---------------------- | ---------------------------- |
| List Task Lists        | `GET /me/todo/lists`         |
| Get Task List          | `GET /me/todo/lists/{id}`    |
| Create Task List       | `POST /me/todo/lists`        |
| Update Task List       | `PATCH /me/todo/lists/{id}`  |
| Delete Task List       | `DELETE /me/todo/lists/{id}` |
| List Task List Changes | `GET /me/todo/lists/delta`   |

### Tasks (7)

| Action            | Graph endpoint                                            |
| ----------------- | --------------------------------------------------------- |
| List Tasks        | `GET /me/todo/lists/{listId}/tasks`                       |
| Get Task          | `GET /me/todo/lists/{listId}/tasks/{taskId}`              |
| Create Task       | `POST /me/todo/lists/{listId}/tasks`                      |
| Update Task       | `PATCH /me/todo/lists/{listId}/tasks/{taskId}`            |
| Complete Task     | `PATCH /me/todo/lists/{listId}/tasks/{taskId}` (`status`) |
| Delete Task       | `DELETE /me/todo/lists/{listId}/tasks/{taskId}`           |
| List Task Changes | `GET /me/todo/lists/{listId}/tasks/delta`                 |

### Checklist items — subtasks (4)

| Action                | Graph endpoint                                               |
| --------------------- | ------------------------------------------------------------ |
| List Checklist Items  | `GET .../tasks/{taskId}/checklistItems`                      |
| Create Checklist Item | `POST .../tasks/{taskId}/checklistItems`                     |
| Update Checklist Item | `PATCH .../tasks/{taskId}/checklistItems/{checklistItemId}`  |
| Delete Checklist Item | `DELETE .../tasks/{taskId}/checklistItems/{checklistItemId}` |

### Linked resources (2)

| Action                 | Graph endpoint                            |
| ---------------------- | ----------------------------------------- |
| List Linked Resources  | `GET .../tasks/{taskId}/linkedResources`  |
| Create Linked Resource | `POST .../tasks/{taskId}/linkedResources` |

A **linked resource** is To Do's back-pointer to whatever caused a task — the email, the ticket, the
CRM record. It is the most integration-relevant thing in this API: `externalId` is where a workflow
stores "this task is about that record", and `webUrl` is what renders as a clickable route home in
the task's detail pane. Microsoft documents `webUrl` as genuinely optional ("the linked item can be
from a custom business app or native platform app"), so it is not marked required here.

### Things the API does not have, that you might reach for

- **There is no cross-list task query.** `/me/todo/tasks` does not exist; tasks are only addressable
  through their list. "All my open tasks" is List Task Lists followed by List Tasks per list, and
  doing that fan-out in the workflow graph rather than hiding it inside one action keeps the request
  count visible.
- **There is no move-between-lists call.** Graph's note on `todoTask.id` ("this value changes when
  the item is moved from one list to another") describes what the To Do _clients_ do internally, not
  an endpoint a caller can reach. Moving means Create Task in the target list, then Delete Task.
- **There is no complete endpoint.** The dead `outlookTask` API had `POST .../complete`; on
  `todoTask`, completion is the `status` field. **Complete Task** is that one-field PATCH spelled
  out, because "mark this done" is the single most common thing a workflow wants and routing it
  through Update Task means hand-typing an enum. Reopening is Update Task with `notStarted`.

### Delta: how a change-tracking round works

`List Task List Changes` and `List Task Changes` wrap Graph's `delta` functions, which report
additions, updates **and deletions** — the last of which a `lastModifiedDateTime` poll can never
give you, because a deleted task simply stops appearing.

1. First run — leave **Delta link** empty. You get the current state plus an `@odata.deltaLink`.
2. Store that `deltaLink`.
3. Next run — pass it back. Only what changed since comes back, plus a fresh `deltaLink`.

Graph bakes any query parameters into the state token, so `$select` / `$top` /
`Prefer:
odata.maxpagesize` apply on the **first** call of a round only. Both actions therefore send
a resumed link completely bare — re-adding parameters to a token-bearing URL is redundant at best
and a `400` at worst.

The task delta function is the one To Do endpoint where Microsoft is specific about OData, and the
constraints are unusual enough that the action hints quote them rather than paraphrase: `$select`,
`$top` and `$expand` are supported; `$filter` accepts **only** `receivedDateTime ge|gt {value}`;
`$orderby` accepts **only** `receivedDateTime desc`; `$search` is not supported. (`receivedDateTime`
is not even a `todoTask` property — it is an Outlook-item field showing through the shared backing
store. That is the sort of thing worth writing down.)

### On the other OData parameters

Every other list endpoint's reference says only that it "supports **some** of the OData query
parameters" and never enumerates which. `$filter`, `$orderby`, `$select`, `$expand` and `$top` are
therefore offered as **pass-throughs with that uncertainty stated in the hint**, not as guaranteed
behaviour. Two consequences the app takes seriously:

- **No client-side defaults are invented.** A List Tasks call with nothing set sends _no_ query
  string at all, so Graph's own defaults are what you get.
- **The Auth `test` probe sends no query parameters either** — see below.

## Auth

**`oauth2` only.** Microsoft documents exactly one credential path for delegated To Do access: the
Entra ID (Microsoft identity platform) v2.0 authorization-code flow.

| Endpoint  | URL                                                              |
| --------- | ---------------------------------------------------------------- |
| Authorize | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| Token     | `https://login.microsoftonline.com/common/oauth2/v2.0/token`     |

The `common` tenant segment is the only value that accepts **both** work-or-school and personal
Microsoft accounts. That matters more here than for the sibling Graph apps: To Do is a consumer
product as much as a work one, and Microsoft lists `Tasks.ReadWrite` as a delegated permission for
both account kinds on every endpoint this app calls. A deployment that must be locked to one tenant
registers its own app and overrides the URLs.

### Scopes

| Scope             | Why                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tasks.ReadWrite` | Every action. Documented as the higher-privileged form of `Tasks.Read`, so one scope covers reads and writes both.                          |
| `User.Read`       | `afterConnect` only — reads `/me` to label the connection.                                                                                  |
| `offline_access`  | Microsoft issues a refresh token only when this is requested. It is a **scope**, not a parameter (contrast Google's `access_type=offline`). |

Verified per-endpoint against the v1.0 reference: reads are least-privileged at `Tasks.Read`, all
writes and both `delta` functions at `Tasks.ReadWrite`. `Tasks.Read.All` and `Tasks.ReadWrite.All`
are the **application** (app-only) permissions and are deliberately not requested — this is a
delegated flow acting as the signed-in user, and the `.All` scopes need tenant-admin consent.

PKCE is on: Microsoft calls `code_challenge` "recommended for all application types, both public and
confidential clients", and supports `S256`.

## Health checks

Three different questions get confused with each other, so this section keeps them apart: is the
**vendor** up, is **this credential** live, and do we have **quota** left. Only the second is
something this app can actually perform.

### Is this credential live? — `GET /me/todo/lists`

The Auth `test` hook, projected by the runtime into an `auth:oauth2` credential check.

**Why this probe and not the obvious alternative.** The sibling `outlook` app probes `GET /me`
deliberately: it holds four scopes, and a credential legitimately missing one of them should not be
reported as broken. That reasoning does not transfer. This app holds exactly **one** functional
scope and every action needs it, so a credential without `Tasks.ReadWrite` is not partially useful —
it is unusable, and the probe should say so. `GET /me` would answer `200` for such a credential and
call a dead connection healthy.

**Why no `$top=1`.** Shrinking the probe is the reflex, and it is the wrong one here: Microsoft
documents this method as supporting only "some of the OData query parameters" without saying which,
so an unsupported parameter would risk a `400` on a credential that is actually fine. A user's
task-list collection is small by construction — the built-in **Tasks** list, the built-in **Flagged
email** list, and whatever they made. Sending nothing is both safer and barely more expensive.

`afterConnect` reads `GET /me` separately for the connection label; that is what `User.Read` is for,
and it is allowed to fail quietly (a missing label is not a broken connection).

### Is the vendor up? — declared **unavailable**

Not inherited from the sibling Graph apps: **re-probed for To Do on 2026-08-03**, on the theory that
a consumer-facing product might have a status surface the enterprise workloads do not. It does not.
What the probes returned:

| Candidate                                          | Result                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status.cloud.microsoft`                           | **Catch-all.** `/`, `/api/status` and `/definitely-not-a-real-path-zzz9` all return `200 text/html` with the **same 2058 bytes**. A path returning identical bytes to a deliberately bogus sibling is not an endpoint.                               |
| `status.office365.com/api/v2/status.json`          | `301` onto `status.cloud.microsoft`, which answers `401` with an empty body.                                                                                                                                                                         |
| `microsofttodo.statuspage.io/api/v2/status.json`   | **Unclaimed subdomain.** `200 text/html`, 127,720 bytes, after redirecting to `https://www.atlassian.com/software/statuspage` — Atlassian's marketing page, not a status document.                                                                   |
| `microsoft.statuspage.io/api/v2/status.json`       | `401 application/json` — "Your page is inactive."                                                                                                                                                                                                    |
| `todo.microsoft.com`                               | `404` at the root. It is a redirector, not a host with a status document.                                                                                                                                                                            |
| Graph `/admin/serviceAnnouncement/healthOverviews` | Semantically right, operationally wrong: needs `ServiceHealth.Read.All` with **tenant-admin consent**, is scoped to the calling tenant's subscribed services, and is unsupported for personal Microsoft accounts — which this app explicitly serves. |
| Service Health Dashboard RSS                       | Retired. Current guidance points humans at the status site and `@MSFT365Status` — neither is a machine surface.                                                                                                                                      |

Both tests the pack requires were applied and both failed for every candidate: the
bogus-sibling-path test (identical bytes ⇒ catch-all) and the content-type/body test (HTML served
for a `.json` path ⇒ fake). So the check is **declared absent with the evidence recorded**, rather
than pointed at something that would return `200 OK` forever regardless of whether To Do was
working. Outages reach this app the honest way: `5xx` from `graph.microsoft.com`.

### Do we have quota left? — declared **unavailable**

Microsoft's throttling model for the Outlook family (which backs To Do) is reactive: you learn you
are over the line by being told to go away. A throttled call answers `429` with error code
`TooManyRequests` and a `Retry-After` header; **successful calls carry no rate-limit headers at
all**, so there is nothing to poll from a cold start.

The one proactive signal Graph documents — `x-ms-throttle-limit-percentage`, emitted past 0.8 of
budget — belongs to the _identity and directory_ ResourceUnit model (users, groups, applications),
not to the Outlook family. It would never appear on a To Do response.

The documented ceilings are recorded in the check's `reason` so an operator diagnosing a burst of
429s has the numbers to hand: 10,000 requests per 10 minutes per app-and-mailbox pair, 4 concurrent
requests, 150 MB of PATCH/POST/PUT payload per 5 minutes.

### Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key           | Kind       | Scope      | Credential | Severity          | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ----------------- | --------------------------------------------------- |
| `service`     | service    | app        | none       | **informational** | _declared absent_                                   |
| `quota`       | quota      | connection | signed     | **informational** | _declared absent_                                   |
| `auth:oauth2` | credential | connection | signed     | fatal             | derived from the `oauth2` auth method's `test` hook |

Both declared absences carry `severity: "informational"` **on purpose**. An `unavailable` entry
always reports `unknown`; the default severity for these kinds is `degraded`, which would pin this
app's roll-up verdict at `unknown` permanently. A unit test asserts the invariant so it cannot
regress. Neither check widens `network.allow` or declares a `feed`, because neither makes a call.

## Sandbox posture

- **Network only through `ctx.fetch`.** `lib/client.ts` is the single egress point; no action calls
  a global `fetch`.
- **No `Deno.*` anywhere.**
- **The credential appears only in the auth `sign` hook.** There is no `Authorization` header
  anywhere in `lib/client.ts` — the runtime injects it. The `test` hook is the one place that reads
  the token directly, as the spec requires, and its failure message reports only the HTTP status
  (asserted by a test that checks the token never appears in the message).
- **One host on the allowlist:** `graph.microsoft.com`. `login.microsoftonline.com` is the OAuth
  endpoint host, which the runtime handles implicitly — an action has no business reaching it, so it
  is not widened.
- **Every id is percent-encoded before it becomes a path segment.** To Do ids are base64-ish and
  routinely contain `=`, `+` and `/`, so an unencoded interpolation is both a correctness bug and a
  path-traversal shape. Tested with `../../me` as input.

## Not implemented

- **Triggers.** Change notifications (`/subscriptions`) would be a `TriggerDefinition`, which is a
  different surface than an Action; the two `delta` actions cover the polling half of the same need
  and are honest about being a poll.
- **Attachments.** `taskFileAttachment` is GA, but writes above 3 MB require a
  `createUploadSession` + chunked `PUT`/`Content-Range` dance and reads return raw bytes — a
  different return contract than every other action here. Better omitted than half-built.
- **`/users/{id}/todo/...`.** Requires application permissions with admin consent; see the scope
  table above.
- **Planner.** A different product. It should be its own app.

## Links

| What                                  | URL                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Product website                       | https://www.microsoft.com/en-us/microsoft-365/microsoft-to-do-list-app                  |
| Web app                               | https://to-do.office.com/tasks/                                                         |
| **API docs** (used to build this)     | https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0 |
| `todoTask` reference                  | https://learn.microsoft.com/en-us/graph/api/resources/todotask?view=graph-rest-1.0      |
| `todoTaskList` reference              | https://learn.microsoft.com/en-us/graph/api/resources/todotasklist?view=graph-rest-1.0  |
| Permissions reference                 | https://learn.microsoft.com/en-us/graph/permissions-reference                           |
| Delta query overview                  | https://learn.microsoft.com/en-us/graph/delta-query-overview                            |
| Paging (`@odata.nextLink`)            | https://learn.microsoft.com/en-us/graph/paging                                          |
| OAuth 2.0 auth code flow              | https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow      |
| Deprecated `outlookTask` (do not use) | https://learn.microsoft.com/en-us/graph/api/resources/outlooktask?view=graph-rest-beta  |
| Status page (human only)              | https://status.cloud.microsoft/                                                         |

**Source / git repo.** Microsoft To Do is closed-source and has **no product repository**. The
nearest first-party source of truth is Microsoft's Graph organisation on GitHub:

| What                                | URL                                                            |
| ----------------------------------- | -------------------------------------------------------------- |
| Microsoft Graph on GitHub (SDK org) | https://github.com/microsoftgraph                              |
| API documentation source            | https://github.com/microsoftgraph/microsoft-graph-docs-contrib |
| JavaScript SDK                      | https://github.com/microsoftgraph/msgraph-sdk-javascript       |

Every endpoint asserted in this README traces to a page in `microsoft-graph-docs-contrib`, which is
where the `learn.microsoft.com` pages above are authored — the `original_content_git_url` on each
page names the exact file.

Icon: the vendor's own mark, copied verbatim from n8n's `nodes-base`
(`packages/nodes-base/nodes/Microsoft/ToDo/todo.svg`), matching the provenance of the other ported
apps in this pack. It is **not** drawn for this pack — no new exception is needed in the pack
README.

---

Researched and endpoint-verified 2026-08-03 against the Microsoft Graph **v1.0** reference. The
`401 InvalidAuthenticationToken` shape and the
`WWW-Authenticate: Bearer …
authorization_uri=https://login.microsoftonline.com/common/oauth2/authorize`
header were confirmed on the wire against `graph.microsoft.com`; everything requiring a token is
docs-verified rather than wire-verified, since the To Do endpoints have no unauthenticated surface.
All status-page candidates in the health section **were** probed on the wire — see the table for
what each returned.
