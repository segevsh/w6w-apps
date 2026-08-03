# TickTick

Manage TickTick projects, tasks, focus records and habits through the **TickTick Open API**.

- **Categories** — productivity, project-management
- **Auth methods** — oauth2
- **Actions** — 23
- **Egress allowlist** — `api.ticktick.com`
- **API version** — Open API **v1** (`https://api.ticktick.com/open/v1`). The `/open/v1` path segment
  is the entire version contract; there is no version header and no OpenAPI document.

## Where the documentation actually lives

Worth stating precisely, because the human-facing URL renders nothing to a fetcher and the link that
circulates for "TickTick API" is usually wrong.

| URL                                              | What it is                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://developer.ticktick.com/docs#/openapi`   | What a human sees — a docsify shell.                                                                                                              |
| `https://developer.ticktick.com/docs/openapi.md` | **The actual spec.** 67,340 bytes of markdown on 2026-08-03. This is what every endpoint below was read from.                                     |
| `https://developer.ticktick.com/docs`            | **404**, serving the developer-portal SPA's HTML. Fetching it gets you nothing.                                                                    |
| `https://developer.ticktick.com/manage`          | The Developer Center, where you register an app and get a `client_id` / `client_secret`.                                                          |
| `support.ticktick.com/.../Add-a-new-task-via-email` | **Not an API.** A support article about emailing a task into your inbox. It circulates as TickTick's "API docs" link and is nothing of the sort. |

### What the live docs corrected

The received wisdom about this API — repeated by most third-party libraries, and by the candidate
entry this app was built from — is that it is **tiny**: project list, get-task-by-id, create, update,
complete, delete, and *no way to list or search tasks at all*. That was true of an older revision. As
of the reference read on 2026-08-03 it is not:

| Believed                                                | Actually documented                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| No way to list or search tasks                          | **`POST /task/filter`** — by project, start-date range, priority, tags and status                          |
| No way to see completed tasks                           | **`POST /task/completed`** — by project and completion-time range                                          |
| No way to move a task between projects                  | **`POST /task/move`** — a batch endpoint                                                                   |
| Projects are read-only                                  | Full CRUD, plus `GET /project/{id}/data` for the project with its tasks and kanban columns                 |
| Tasks are the whole product surface                     | **Focus** (pomodoro / timing sessions) and **Habit** (with check-ins) are documented resources too         |

That is 21 documented endpoints, not 6. Where the old belief still holds — no webhooks, no tags API,
no comments, no attachments — it is recorded under [Not covered, and why](#not-covered-and-why).

## Vocabulary: a "project" is what the apps call a "List"

TickTick's UI has Lists; its API has Projects. They are the same thing, and this app uses the API's
word throughout so that a param name matches a doc heading. A project's `kind` is `TASK` or `NOTE`,
and its `viewMode` is `list`, `kanban` or `timeline`.

## Actions

### Projects (6)

| Action                  | Endpoint                            |
| ----------------------- | ----------------------------------- |
| List Projects           | `GET /open/v1/project`              |
| Get Project             | `GET /open/v1/project/{id}`         |
| Get Project With Data   | `GET /open/v1/project/{id}/data`    |
| Create Project          | `POST /open/v1/project`             |
| Update Project          | `POST /open/v1/project/{id}`        |
| Delete Project          | `DELETE /open/v1/project/{id}`      |

### Tasks (8)

| Action               | Endpoint                                                  |
| -------------------- | --------------------------------------------------------- |
| Get Task             | `GET /open/v1/project/{p}/task/{t}`                       |
| Create Task          | `POST /open/v1/task`                                      |
| Update Task          | `POST /open/v1/task/{taskId}`                             |
| Complete Task        | `POST /open/v1/project/{p}/task/{t}/complete`             |
| Delete Task          | `DELETE /open/v1/project/{p}/task/{t}`                    |
| Move Task            | `POST /open/v1/task/move`                                 |
| Filter Tasks         | `POST /open/v1/task/filter`                               |
| List Completed Tasks | `POST /open/v1/task/completed`                            |

### Focus — pomodoro and timing sessions (3)

| Action       | Endpoint                                     |
| ------------ | -------------------------------------------- |
| List Focuses | `GET /open/v1/focus?from=&to=&type=`         |
| Get Focus    | `GET /open/v1/focus/{focusId}?type=`         |
| Delete Focus | `DELETE /open/v1/focus/{focusId}?type=`      |

### Habits (6)

| Action                | Endpoint                                          |
| --------------------- | ------------------------------------------------- |
| List Habits           | `GET /open/v1/habit`                              |
| Get Habit             | `GET /open/v1/habit/{habitId}`                    |
| Create Habit          | `POST /open/v1/habit`                             |
| Update Habit          | `POST /open/v1/habit/{habitId}`                   |
| Check In Habit        | `POST /open/v1/habit/{habitId}/checkin`           |
| List Habit Check-Ins  | `GET /open/v1/habit/checkins?habitIds=&from=&to=` |

Every documented endpoint has exactly one action. Nothing is invented, and nothing documented is
left out.

## Six things about this API that will bite you

These are the reasons `lib/client.ts` exists, and each one is covered by a unit test.

**1. `POST` is the update verb.** There is no `PUT` and no `PATCH` anywhere. Update Task is
`POST /task/{taskId}`; Update Project is `POST /project/{projectId}`. TickTick's own doc still
carries an `<a name="updateusingput">` anchor above Update Task — a fossil.

**2. The date format is not what JavaScript emits.** TickTick documents
`"yyyy-MM-dd'T'HH:mm:ssZ"`, where `Z` is Java's *numeric offset* — `+0000`, not the letter, and not
`+00:00`:

```
Date#toISOString()  →  2026-08-10T17:00:00.000Z     ✗
a datetime control  →  2026-08-10T17:00+02:00       ✗
what TickTick wants →  2026-08-10T17:00:00+0000     ✓
```

Every date field is normalised on the way out. Fractional seconds are stripped (the documented
pattern has none; the two newest endpoints happen to show `.000` in *their* examples, and a parser
that accepts millis necessarily accepts their absence).

**3. There is no pagination. Anywhere.** No cursor, no `limit`, no `offset`, no `total`, no envelope.
Collections come back as bare top-level JSON arrays and you get all of them. That is fine at
TickTick's scale but the cost is not tunable, and a workflow reading a very large completed-task
range should narrow the range rather than expect a page size.

**4. Update semantics are undocumented.** TickTick never says whether Update Task / Update Project
merge the body into the existing record or replace it. Both actions send **only the fields you set**
— the safe direction if it merges, the recoverable direction if it replaces. If you need certainty,
read first and pass everything back.

**5. `startDate` means two different things.** In **Filter Tasks**, `startDate`/`endDate` bracket the
task's own `startDate`. In **List Completed Tasks**, the same two parameter names bracket
`completedTime`. That is why they are two actions with two sets of hints rather than one action with
a mode switch.

**6. Habit dates are `YYYYMMDD` integers, task dates are timestamps.** A habit check-in's `stamp` is
`20260407`, an integer. `List Habit Check-Ins`' `from`/`to` are the same. But the *same request's*
`time` and `opTime` are ordinary timestamps. Both shapes, one body.

### One documentation bug this app deliberately does not copy

Filter Tasks' parameter table names the priority filter **`proiority`**. Its own worked example, in
the same section, sends `"priority": [0]`. The example is what a running service accepts, so
`priority` is what this app sends. (The same table also spells "Mediunm(3)". Neither typo reaches the
wire, and a test asserts `proiority` never appears in a request body.)

## Auth

**`oauth2` only.** TickTick documents exactly one credential path.

| Endpoint  | URL                                    |
| --------- | -------------------------------------- |
| Authorize | `https://ticktick.com/oauth/authorize` |
| Token     | `https://ticktick.com/oauth/token`     |

Note the host: OAuth lives on `ticktick.com`, the API on `api.ticktick.com`. Only the latter is on
the manifest allowlist, because the token exchange happens host-side and no action has business
reaching the OAuth host.

### Scopes

TickTick documents **two** scopes and no others: **`tasks:read`** and **`tasks:write`**,
space-separated. Both are requested — this app reads and writes, and there is no finer grain on
offer.

> **The scope caveat, stated plainly.** The Focus and Habit endpoints are documented in the same
> reference, under the same `Authorization: Bearer` scheme, but TickTick's Authorization section
> still lists only the two `tasks:*` scopes and it publishes no scope-to-endpoint table. Whether
> those endpoints are covered by `tasks:read`/`tasks:write`, or by a scope that is simply not
> documented, **cannot be determined from the docs**. They ship because the vendor documents them.
> If a Focus or Habit action returns `403` on a connection whose task actions work, that is the
> answer, and it is not a bug in this app.
>
> TickTick's own doc also spells the scope value two ways in two tables — `tasks:write tasks:read`
> in the authorize step and `tasks: write, tasks: read` (with spaces) in the token step. The former
> is correct; a test asserts no scope this app sends contains a space.

### Three flow details that differ from the usual

**1. No refresh grant is documented.** The token-exchange table says `grant_type` is *"now only
authorization_code"*. There is no `refresh_token` grant, no refresh URL, and no documented
`refresh_token` in the response. **This is a real operational caveat**: an expired connection is
re-authorised by the user, not renewed in the background. No `refresh` hook is declared, because a
hook guessing at an undocumented grant would fail at exactly the moment it was needed. (If TickTick
does return a `refresh_token`, the host stores it — `oauth-flow.ts` reads the standard field — so it
is there the day a grant is documented.)

**2. Client credentials are documented as `Basic` header, and the host sends them in the body.**
TickTick's table says the client id and secret are *"located in the **HEADER** using the **Basic
Auth** authentication method"*. The w6w host's generic exchange
(`packages/server/packages/api/oauth-flow.ts`) sends them as form fields — the RFC 6749
`client_secret_post` form. **Whether TickTick's token endpoint also accepts that form could not be
determined without a real client**: probed on 2026-08-03, `POST /oauth/token` returns an identical
Tomcat `401` HTML page for bogus credentials in either position, so the two cases are
indistinguishable from outside. If connecting fails at the exchange step, this is the first thing to
look at, and the `AuthDefinition.exchange` hook is the documented extension point.

**3. No PKCE.** TickTick documents neither `code_challenge` nor `code_challenge_method`, so `pkce` is
`false` rather than left at the spec default of `true`.

### No connection label

The Open API exposes no user, profile or account endpoint — there is nothing to read a name or email
from — so there is no `afterConnect` hook and no `connectionLabel`. A template interpolating
variables nobody sets would render as literal `{{user.name}}`.

## Health checks

Three questions that get confused with each other: is the **vendor** up, is **this credential** live,
and do we have **quota** left.

### Is this credential live? — `GET /open/v1/project`

The Auth `test` hook, projected by the runtime into an `auth:oauth2` credential check.

It is the smallest documented read in the API: no parameters, a bare array back, and it needs only
`tasks:read`, which every connection holds. There is no cheaper probe — TickTick has no `/me`, no
token-introspection endpoint, and every other read needs an id the probe would have to invent.

The failure message reports the HTTP status **and nothing else**. That is not boilerplate caution:
TickTick's real `401` body echoes the token back verbatim —
`{"error":"invalid_token","error_description":"Invalid access token: <your token>"}` (confirmed on
the wire). A test asserts the token never appears in a message.

### Is the vendor up? — a live probe of the API's own auth gate

**TickTick publishes no status page.** Every candidate was probed on the wire on 2026-08-03, and both
required tests applied to each survivor — (a) a deliberately bogus sibling path on the same host, and
(b) content-type *and* body:

| Candidate                                   | Result                                                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status.ticktick.com`                       | **NXDOMAIN.** Does not resolve.                                                                                                                                            |
| `ticktick.statuspage.io/`                   | `200 text/html`, **127,720 bytes**, after redirecting to `https://www.atlassian.com/software/statuspage`.                                                                  |
| `ticktick.statuspage.io/api/v2/status.json` | The **same 127,720 bytes**, md5 `8d3c480a2267…` — byte-identical to the root. Fails test (a) *and* test (b): the known unclaimed-Atlassian-subdomain trap, hit exactly.   |
| `ticktick.instatus.com`                     | `200 text/html`, 216,836 bytes, after redirecting to `https://instatus.com/` — the same trap in Instatus's colours.                                                        |
| `status.dida365.com`                        | **NXDOMAIN.** (`dida365.com` is TickTick's China edition.)                                                                                                                 |
| `ticktick.status.io`, `ticktickstatus.com`  | **NXDOMAIN.**                                                                                                                                                              |

A naive "did it 200?" check pointed at `ticktick.statuspage.io` would report TickTick healthy forever
while parsing Atlassian's product page. It is not used.

**What is probed instead:** `GET https://api.ticktick.com/open/v1/project` **with no `Authorization`
header**. TickTick's own API tier answers:

```
HTTP/2 401
content-type: application/json
{"error":"unauthorized","error_description":"Full authentication is required to access this resource",…}
```

That `401` is the healthy answer. It proves the exact host every action calls is serving, is running
its OAuth filter, and is returning its documented JSON envelope rather than a load-balancer error
page. It is side-effect-free, costs one request, and needs no credential — the `postbin` app's
"narrowest honest probe" precedent applied to an API whose every route requires auth. The check
guards the *shape*, not just the code: a `401` carrying `text/html`, or JSON that is not the error
envelope, reports `unknown` rather than `ok`.

**What this probe does not claim.** A deliberately bogus sibling — `/open/v1/bogus-nonexistent` —
returns byte-identical `401` output, because the OAuth filter runs *before* routing. So this cannot
confirm that any particular endpoint exists; it confirms only that the service and its auth tier are
alive. **Consequently, no endpoint in this app was verified on the wire** — the routes are
docs-verified, from the vendor's own `openapi.md`. What *was* wire-verified is listed at the bottom
of this file.

**Severity is left at the `degraded` default, deliberately.** The sibling `discourse` app downgrades
its live service check to `informational` because its status page speaks only for Discourse's hosting
business and says nothing about a self-hosted forum — the signal does not apply to every tenant. That
reasoning does not transfer. TickTick is single-tenant SaaS on one documented host; every connection
in this app talks to `api.ticktick.com`, and this probe hits that host directly. When it says `down`,
it is down for everyone, and `degraded` is the truthful weight.

### Do we have quota left? — declared **unavailable**

TickTick publishes nothing. The 67 KB reference contains no rate-limit section, no quota endpoint, no
documented `429`, and no `Retry-After` guidance — the per-endpoint response tables enumerate `200`,
`201`, `401`, `403`, `404` and stop. Probed the same day, `api.ticktick.com` returns **no rate-limit
headers**: the complete set on a `401` is `date`, `content-type`, two `AWSALB*` cookies, `vary`,
`x-frame-options`, `strict-transport-security`, `www-authenticate`, `cache-control`, `pragma`,
`x-content-type-options`, `x-xss-protection`.

> **On the numbers you will find by searching.** Several third-party pages state specific TickTick
> limits — "100 requests per minute per user, burst 10/second", "300 per 5 minutes",
> "`X-RateLimit-Remaining` is returned". **None trace to a TickTick source.** They come from
> integration-marketing and API-directory sites that publish generated guides for hundreds of
> vendors, they disagree with each other, and the header they promise is demonstrably absent from
> live responses. Recorded here so the next reader knows they were checked and rejected, not missed.

### Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key           | Kind       | Scope      | Credential | Severity          | Probe                                                |
| ------------- | ---------- | ---------- | ---------- | ----------------- | ---------------------------------------------------- |
| `service`     | service    | app        | none       | degraded *(default)* | unsigned `GET /open/v1/project`, 401 = healthy     |
| `quota`       | quota      | connection | signed     | **informational** | _declared absent_                                    |
| `auth:oauth2` | credential | connection | signed     | fatal             | derived from the `oauth2` auth method's `test` hook  |

`quota` carries `severity: "informational"` **on purpose**: an `unavailable` entry always reports
`unknown`, and the default `degraded` would pin this app's roll-up verdict there permanently. A unit
test asserts the invariant for every declared-absent check so it cannot regress.

## Sandbox posture

- **Network only through `ctx.fetch`.** `lib/client.ts` is the single egress point; no action calls a
  global `fetch`.
- **No `Deno.*` anywhere** outside `Deno.test` in the test files.
- **The credential appears only in the auth `sign` hook.** There is no `Authorization` header
  anywhere in `lib/client.ts` — the runtime injects it. The `test` hook is the one other place that
  reads the token, as the spec requires, and its message is built from the HTTP status alone.
- **Error messages carry the path, never the URL.** `describeFailure` reports `url.pathname`, so a
  query string can never end up in a log line. Tested.
- **One host on the allowlist:** `api.ticktick.com`. The `service` health check restates that same
  host rather than widening anything; `ticktick.com` (the OAuth host) is deliberately absent, because
  the token exchange happens host-side.
- **Every id is percent-encoded before it becomes a path segment.** TickTick ids are 24-character hex
  ObjectIds and URL-safe by construction, but they arrive from workflow expressions, which are not.
  Tested with `../../project` as input.

## Not covered, and why

### Capabilities the product has that the Open API does not expose

| Capability                | Why it is not here                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Webhooks / triggers**   | The Open API has no subscription endpoint of any kind. Change detection means polling Filter Tasks. There is no `TriggerDefinition` here because there is nothing to build one on.                       |
| **Un-completing a task**  | `POST .../complete` sets `status: 2` and has no counterpart. Update Task does not document `status` as writable. Reopening a task is **not expressible** in this API.                                    |
| **Tags**                  | No tag endpoint — no list, create, rename or delete. A tag is created implicitly by naming it in a task's `tags` array, and that is the only way to make one. Filter Tasks can filter by tag but not enumerate them. |
| **Comments**              | TickTick has task comments in its clients. No endpoint.                                                                                                                                                 |
| **Attachments**           | Same: a product feature with no documented endpoint.                                                                                                                                                    |
| **Sharing / collaborators** | `Project.permission` (`read`/`write`/`comment`) is *readable* on the project list, but nothing sets it and there is no member or invite endpoint.                                                     |
| **Project groups**        | A project's `groupId` is readable, but there is no endpoint to create, rename or list groups. A project created through this API is always top-level.                                                    |
| **Kanban columns**        | Readable via Get Project With Data. No write endpoint, so a task cannot be assigned to a column through the API.                                                                                        |
| **Archiving**             | `Project.closed` is readable; nothing in the API sets it. Delete is the only removal, and it is not undoable — there is no trash or restore endpoint.                                                    |
| **Calendar / smart lists** | Today, Next 7 Days and calendar subscriptions are client-side views over data the API already returns. No endpoints.                                                                                    |
| **Notes**                 | A project's `kind` can be `NOTE`, and note content rides in the task `content` field. There is no separate note resource.                                                                               |

### Deliberately declined: the private web-app API

TickTick's web client is backed by an **undocumented** `https://api.ticktick.com/api/v2/*` surface —
`/api/v2/user/signon`, `/api/v2/batch/check/0`, and so on. Several popular third-party libraries use
it, because it exposes things the Open API does not (tags, comments, a full sync feed) and because it
predates the Open API.

**Nothing in this app touches it.** It is authenticated by username-and-password sign-on rather than
OAuth, it carries no versioning or deprecation contract, it is not documented anywhere by TickTick,
and using it would mean asking users to hand over their account password. A unit test asserts the
string `/api/v2` appears nowhere in this app. If a capability above is missing, it is missing —
that is the honest state of the public contract.

### Also not built

- **Batch moves.** `POST /task/move` takes an array, and **Move Task** sends a one-element one. A
  batch parameter would be a single opaque JSON blob in the editor, and TickTick documents no
  per-item error contract for a partial failure, so there would be nothing honest to report about
  which elements succeeded. One move per node keeps it visible in the graph.
- **Per-subtask actions.** Subtasks (`items`) exist only as a field of their parent task; there is no
  endpoint for one. They pass through as JSON on Create/Update Task.
- **A retry/backoff layer.** Nothing is known about TickTick's throttling (see `quota`), so there is
  no documented signal to back off on.

## Links

| What                                   | URL                                              |
| -------------------------------------- | ------------------------------------------------ |
| Product website                        | https://www.ticktick.com/                        |
| Web app                                | https://ticktick.com/webapp                      |
| **API docs** (used to build this)      | https://developer.ticktick.com/docs#/openapi     |
| **API docs, raw markdown** (fetchable) | https://developer.ticktick.com/docs/openapi.md   |
| Developer Center (app registration)    | https://developer.ticktick.com/manage            |
| Help centre                            | https://help.ticktick.com/                       |
| API support contact                    | support@ticktick.com (named in the reference)    |

**Source / git repo.** TickTick is closed-source and publishes **no SDK, no client library and no
GitHub organisation** — `https://api.github.com/orgs/ticktick` returns `404`. Unlike the sibling apps
in this pack, there is no first-party repository of any kind to cite, not even a docs repo: the
reference is served as a single markdown file from the developer portal. The community libraries that
come up in search (`lazeroffmichael/ticktick-py` and others) are third-party and several of them wrap
the private `/api/v2` surface, so none is cited here as a source.

**Icon.** `assets/icon.svg` is **drawn for this pack** — a rounded square with a white checkmark,
TickTick's basic mark shape. It is **not** a copy of a vendor asset:

- n8n's `nodes-base` has **no TickTick node** (307 node directories checked; the only `tick*` match
  is `StickyNote`), so there was nothing to port verbatim the way the other apps in this pack do.
- TickTick publishes no downloadable brand mark.

The one thing that *is* sourced from the vendor is the colour: `#4772FA` is the `themeColor` TickTick
sets in its own documentation site's docsify config (`developer.ticktick.com/docs/config.js`).
Replace the file if an official mark is ever obtained. **This is a new exception to the pack README's
promise of vendor marks** and should be listed alongside `google-forms` and `odoo`.

---

Researched and endpoint-verified 2026-08-03 against `developer.ticktick.com/docs/openapi.md`.

**Verified on the wire** (unauthenticated, against the live service): the API host and its `/open/v1`
prefix; the `401` shape and JSON error envelope for both a missing and an invalid token, including
the fact that `error_description` **echoes the token back**; the complete response header set, and
therefore the absence of any rate-limit header; that `GET /oauth/authorize` `302`s to `/signin` for a
signed-out user; that `POST /oauth/token` answers a Tomcat HTML `401` for bogus credentials in either
the header or the body; the docsify shell, its `_sidebar.md`, and the 67,340-byte `openapi.md`; every
status-page candidate in the health table, with byte counts and md5s.

**Docs-verified, not wire-verified**: every endpoint path, parameter name, request body and response
shape. TickTick's OAuth filter runs before routing, so an unauthenticated probe returns byte-identical
`401`s for real and invented paths alike — endpoint existence is not testable without a live
credential, and this app does not pretend otherwise.
