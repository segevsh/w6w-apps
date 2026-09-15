# Shortcut

Manage Shortcut Stories, Epics, Iterations, Workflows and Labels — the project-management tool
formerly known as Clubhouse — on the **Shortcut REST API v3**.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-token
- **Actions** — 36
- **Health checks** — 2 (`service`, ~~`request-rate`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.app.shortcut.com` (the `service` check adds `status.shortcut.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://shortcut.com/
- **API docs** — https://developer.shortcut.com/api/rest/v3
- **OpenAPI** — https://developer.shortcut.com/api/rest/v3/shortcut.openapi.json
- **Status page** — https://status.shortcut.com/

> **Everything below was verified against Shortcut's own sources on 2026-09-15** — its
> machine-readable OpenAPI 3.0 document
> ([`developer.shortcut.com/api/rest/v3/shortcut.openapi.json`](https://developer.shortcut.com/api/rest/v3/shortcut.openapi.json),
> 568,325 bytes, `info.title` "Shortcut API 3.0"), the same page's rendered HTML reference, and live
> probes against `api.app.shortcut.com` and `status.shortcut.com`. Nothing here came from a
> third-party integration directory.

## The three things most likely to cost someone a day

### 1. Two id spaces, and mixing them up 404s or 400s rather than coercing

Every Story, Epic, Iteration, Label, Project and Workflow in this API is addressed by a **plain
integer** (`format: int64`) — Shortcut's legacy numeric id space, unchanged since the Clubhouse era.
**Members are the one exception**: they are addressed by **UUID**.

That split gets worse at exactly the point someone reaches for it. A Project requires a `team_id` —
the API's legacy field name for what Shortcut's UI has called a "Group" for years — and that field is
**also a plain integer**. But Stories, Epics and Iterations reference the *same* Group through a
`group_id` field that is a **UUID**. There is no way to derive one from the other through this API;
you need both numbers/UUIDs from wherever your workspace already tracks them. Passing a UUID where an
integer is expected (or vice versa) is rejected as a schema mismatch rather than silently coerced.

| Entity                        | Id type   |
| ------------------------------ | --------- |
| Story, Epic, Iteration, Label, Project, Workflow | integer (`int64`) |
| Project's `team_id` (→ a Group) | integer (`int64`), a **different** integer space than any of the above |
| Member                          | UUID |
| Group's own `group_id` (referenced from Stories/Epics/Iterations) | UUID |

`lib/params.ts` documents this at every id param; `story-create`/`epic-create` call it out explicitly
at `groupId`/`teamId`.

### 2. No response envelope, but three different list shapes

Unlike some vendors in this pack, **every ordinary read answers the resource JSON directly** — there
is no `{"data": …}` wrapper to strip. That consistency stops at list endpoints, which is where three
different shapes coexist:

| Shape                                  | Endpoints |
| --------------------------------------- | --------- |
| Bare, unbounded JSON array, no pagination at all | `GET /iterations`, `GET /workflows`, `GET /labels`, `GET /projects`, `GET /epics/{id}/stories`, `GET /iterations/{id}/stories`, `GET /labels/{id}/stories` |
| `{data, next, total}`, page-numbered    | `GET /epics/paginated` |
| Per-entity-type result sets, each with its own cursor `next` | `GET /search` |
| Bare array, from a `POST`               | `POST /stories/search` (`queryStories`) |

`epic-list` deliberately calls the **paginated** form (`GET /epics/paginated`) rather than the plain
`GET /epics`, which returns every Epic in one unbounded response — the same "vendor default is
enormous" trap this pack has hit before, just expressed as "there is no limit param at all" instead of
a huge default. Every other list in this app's surface genuinely has no pagination to ask for; that is
documented at the call site rather than worked around, since there is nothing to configure.

`story-search` (`POST /stories/search`) is a **structured filter**, not Shortcut's full-text search —
it answers a bare array with no `total` and no cursor, so it is best used for filters expected to
return a bounded set (one Epic's open bugs, one Member's started work). The separate `search` action
(`GET /search`) is free-text, across Stories/Epics/Iterations/Objectives at once, and is cursor-paged
via each result set's own `next`.

### 3. Errors are `{"message", "tag"}` — verified live, not from the OpenAPI document

The OpenAPI document's own `responses` blocks name only a 4xx status and a bare English
`description` for almost every operation — no response schema. Two live probes on 2026-09-15 filled
that gap:

```
$ curl -H "Shortcut-Token: fake" https://api.app.shortcut.com/api/v3/member
{"message":"Unauthorized","tag":"unauthorized"}

$ curl https://api.app.shortcut.com/api/v3/member   # no header at all
{"message":"Sorry, the organization context for this request is missing...","tag":"organization2_missing"}
```

`tag` is the stable machine code and is what `auth/api-token.ts`'s `test` hook branches on — "the
credential never reached the request" and "the token itself is wrong" are different problems with
different fixes, and both arrive as a bare `401` without it. `lib/client.ts`'s `formatShortcutError`
surfaces both `tag` and `message` on every thrown error, and falls back to the raw body for the rarer
case where the OpenAPI document's promised shape doesn't hold (a 5xx gateway page, for instance).

### A smaller trap: Iteration dates are dates, not timestamps

`start_date`/`end_date` on `iteration-create`/`iteration-update` are plain `YYYY-MM-DD` strings — the
vendor's own example is `"2019-07-01"` — unlike every other date field in this app (`deadline`,
`plannedStartDate`, a comment's `created_at` override, …), which are full ISO timestamps.

## Auth

One method: `api-token`, type `apiKey`.

Shortcut's `components.securitySchemes` declares exactly one scheme: an `apiKey` header named
`Shortcut-Token`, carrying the token **verbatim** — no `Bearer ` prefix, no alternative
query-parameter form. The token is generated per-member from Shortcut's web app (avatar menu >
Settings > API Tokens) and is the entire authentication story; Shortcut publishes no OAuth2 surface
for third-party integrations.

### The probe is `GET /api/v3/member`

Chosen by reading `MemberInfo`'s schema, not by its name:

- **It requires a credential.** Confirmed live: no header at all answers `401
  {"tag":"organization2_missing"}`; a syntactically-plausible but wrong token answers `401
  {"tag":"unauthorized"}`.
- **It returns nothing sensitive.** `MemberInfo` is `{id, is_owner, mention_name, name, role,
  workspace2, organization2}` — display metadata, never a secret. Unlike the pack's `/me`-shaped traps
  (Follow Up Boss, Mailjet, Apify's `users/me`), there is nothing here that needs to be stripped before
  `afterConnect` publishes the member's `name`.
- **It needs no workspace permission.** Every Member — Owner, Admin, or plain Member — can read their
  own `/member`, so a correctly-scoped token can never be reported broken by this probe.

## Actions

36 actions. `resource` groups them in the editor.

| Key                     | Type    | Endpoint                                          |
| ------------------------ | ------- | -------------------------------------------------- |
| `member-get`             | read    | `GET /api/v3/member`                                |
| `member-list`            | search  | `GET /api/v3/members`                               |
| `project-list`           | search  | `GET /api/v3/projects`                              |
| `project-get`            | read    | `GET /api/v3/projects/{id}`                         |
| `project-create`         | perform | `POST /api/v3/projects`                             |
| `project-update`         | perform | `PUT /api/v3/projects/{id}`                         |
| `epic-list`              | search  | `GET /api/v3/epics/paginated`                       |
| `epic-get`               | read    | `GET /api/v3/epics/{id}`                            |
| `epic-create`            | perform | `POST /api/v3/epics`                                |
| `epic-update`            | perform | `PUT /api/v3/epics/{id}`                            |
| `epic-delete`            | perform | `DELETE /api/v3/epics/{id}`                         |
| `epic-stories-list`      | search  | `GET /api/v3/epics/{id}/stories`                    |
| `epic-comment-list`      | search  | `GET /api/v3/epics/{id}/comments`                   |
| `epic-comment-create`    | perform | `POST /api/v3/epics/{id}/comments`                  |
| `iteration-list`         | search  | `GET /api/v3/iterations`                            |
| `iteration-get`          | read    | `GET /api/v3/iterations/{id}`                       |
| `iteration-create`       | perform | `POST /api/v3/iterations`                           |
| `iteration-update`       | perform | `PUT /api/v3/iterations/{id}`                       |
| `iteration-delete`       | perform | `DELETE /api/v3/iterations/{id}`                    |
| `iteration-stories-list` | search  | `GET /api/v3/iterations/{id}/stories`               |
| `workflow-list`          | search  | `GET /api/v3/workflows`                             |
| `workflow-get`           | read    | `GET /api/v3/workflows/{id}`                        |
| `label-list`             | search  | `GET /api/v3/labels`                                |
| `label-get`              | read    | `GET /api/v3/labels/{id}`                           |
| `label-create`           | perform | `POST /api/v3/labels`                               |
| `label-update`           | perform | `PUT /api/v3/labels/{id}`                           |
| `label-delete`           | perform | `DELETE /api/v3/labels/{id}`                        |
| `label-stories-list`     | search  | `GET /api/v3/labels/{id}/stories`                   |
| `story-get`              | read    | `GET /api/v3/stories/{id}`                          |
| `story-create`           | perform | `POST /api/v3/stories`                              |
| `story-update`           | perform | `PUT /api/v3/stories/{id}`                          |
| `story-delete`           | perform | `DELETE /api/v3/stories/{id}`                       |
| `story-search`           | search  | `POST /api/v3/stories/search`                       |
| `story-comment-list`     | search  | `GET /api/v3/stories/{id}/comments`                 |
| `story-comment-create`   | perform | `POST /api/v3/stories/{id}/comments`                |
| `search`                 | search  | `GET /api/v3/search`                                |

### Idempotency

Every `*-create` action (Stories, Epics, Labels, Projects, and both comment-create actions) is marked
`idempotent: false` — Shortcut documents no idempotency key on any create endpoint, so a retry after a
dropped response creates a second resource rather than returning the first. Every `*-update` and
`*-delete` action is marked `idempotent: true`: an update sends only the fields the caller set (a
partial overwrite, not additive), and a delete's end state is the same however many times it runs.

### Notes on individual actions

- **`epic-list` uses the paginated endpoint on purpose** — see "no response envelope, but three
  different list shapes" above.
- **`story-update` moves a Story between Workflow states** by setting `workflowStateId` alone; nothing
  else needs to be resent. `workflow-list` is where that id comes from, and Shortcut does not validate
  that a state id actually belongs to the Workflow the Story's Project/Group uses — picking one from
  the wrong Workflow moves the Story into a state that silently makes no sense on its own board.
- **`story-search` vs `search`.** `story-search` is a structured filter (Epic/Iteration/Label/owner)
  with no pagination; `search` is free-text across four entity types with cursor paging. Pick
  `story-search` when the result set is naturally bounded, `search` otherwise.
- **`search`'s `next` cursor is a full path+query string**, per the vendor's own schema description.
  This action accepts it verbatim in the `next` field and calls it directly (stripping a leading
  `/api/v3` if present, so the client's own prefix isn't doubled), rather than trying to re-derive a
  query from the other params.
- **Projects are the one place a *third* id space appears.** `project-create` requires `teamId` — see
  finding 1 above.

## Health checks

Two declared checks plus the derived `auth:api-token`.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json` answers `200` with 7,848
bytes of JSON; `/api/v2/definitely-not-real-zzz.json` answers **404** with an empty body.

**(b) Content-type and body.** `application/json; charset=utf-8`, parsing as the Statuspage v2 schema
— far short of the ~127,700 B of HTML an unclaimed `*.statuspage.io` page serves.

**(c) Does the page describe *this* product?** Yes — `"page": {"id": "27fcn0qntr9w", "name":
"Shortcut", "url": "https://status.shortcut.com"}`, with 23 components including `API`, `Web App`,
`Shortcut MCP`, `Shortcut Docs` and `Search`.

Several components are upstream dependencies rather than Shortcut itself — `AWS ec2-us-east-1`,
`GitHub Webhooks`/`GitHub API Requests`, `Atlassian Bitbucket Webhooks`/`API`, `Slack
Apps/Integrations/APIs`, `Zendesk`, `Fastly Edge Cloud Platform`, `ProductBoard` — and are reported
under the vendor's own component id so none is mistaken for a Shortcut outage. The verdict comes from
`status.indicator` (Shortcut's own roll-up), not from the worst component, so a bad day at Zendesk
does not report Shortcut down. Severity is left at the `degraded` default: Shortcut is SaaS-only, so
every Connection this app can hold runs on exactly the infrastructure this page describes.

### ~~`request-rate`~~ — a declared absence, at `informational` severity

Shortcut's only published limit is a **fixed 200 requests/minute** ceiling; requests over it answer
`429` and are refused outright. A live 401 response on 2026-09-15 carried no `X-RateLimit-*` header of
any kind (nor a `Retry-After`), and the vendor's own "Rate Limiting" section names the `429` itself as
the only signal. There is no separate plan-consumption meter to report in its place — unlike a
metered/billed API, this fixed request ceiling is Shortcut's whole limits surface — so there is no
`quota` check to fold this into. `severity: "informational"` is load-bearing: an `unavailable` entry
always reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other severity this would
pin the app's verdict at `unknown` forever.

## The legacy `clubhouse.io` hostname

Shortcut was formerly named Clubhouse, and `status.clubhouse.io` still resolves — as an HTTP redirect
straight to `status.shortcut.com` (confirmed live on 2026-09-15; both answer with the same
Statuspage). No `clubhouse.io` hostname appears anywhere in the current OpenAPI document, the auth
flow, or any webhook payload shape documented on the reference page, so nothing needs to be
allowlisted for it and nothing in this app calls it. A unit test
([`tests/index.test.ts`](tests/index.test.ts)) pins that no executable code in this app references
`clubhouse.io`, so a future edit that reintroduces the old host fails the suite rather than shipping.

## Deliberately not covered

Shortcut's API has 85 documented paths. This app covers the core model — Stories, Epics, Iterations,
Workflows, Members, Projects, Labels and comments — chosen as what a workflow actually manages. Left
out, and why:

- **Objectives/Milestones and Categories** (`/objectives/**`, `/milestones/**`, `/categories/**`) —
  the strategic-planning layer above Epics. Genuinely useful, omitted only for scope.
- **Custom Fields** (`/custom-fields/**`) and **Entity Templates** (`/entity-templates/**`) —
  workspace configuration rather than day-to-day work items.
- **Files, Linked Files and Repositories** (`/files/**`, `/linked-files/**`, `/repositories/**`) —
  attachment and VCS-linkage metadata rather than the work-tracking core.
- **Story Links, Tasks/Sub-tasks and History** (`/story-links/**`,
  `/stories/{id}/tasks/**`, `/stories/{id}/sub-tasks`, `/stories/{id}/history`) — Story-internal
  structure and audit trail; a real gap for anyone building a full Story editor, left out to keep this
  app's first surface to the CRUD-plus-comments core.
- **Groups** (`/groups/**`) — referenced throughout this app via the `groupId`/`teamId` params (see
  finding 1), but not directly manageable here; `listGroupStories` is also the *one* Stories-by-parent
  endpoint that supports real `limit`/`offset` pagination, which is a difference from every sibling
  list endpoint worth knowing if Groups are added later.
- **Webhook integrations** (`/integrations/webhook/**`) — delivery configuration, a different
  operational surface from the work-item CRUD this app focuses on.
- **`stories/bulk`, `stories/from-template`, `story-links`, and reactions/unlink-from-slack on a
  comment** — narrower, less commonly automated operations.
- **`entity-templates/disable`/`enable`, `iterations/disable`/`enable`** — workspace feature toggles.
- **`external-link/stories`** — a niche lookup by external URL rather than by id.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` is Shortcut's own mark, downloaded **verbatim** from
`https://shortcut.com/favicons/production/favicon.svg` on 2026-09-15 — 799 bytes, `image/svg+xml`, md5
`ac24ec1e2f8ea44a91fb9c312370603e`, a 48×48 rounded square (`#494BCB`) with a white glyph. A test
asserts the byte length and both colours, so a redraw fails the suite.

## Layout

```
shortcut/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ShortcutClient, error formatting, id/list helpers
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # Shortcut-Token header: sign, test, afterConnect
├── actions/                     # one file per action (36)
├── health/
│   ├── service.ts                # status.shortcut.com
│   └── request-rate.ts           # declared absence, informational
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # 103 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
