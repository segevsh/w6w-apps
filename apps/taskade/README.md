# Taskade

Manage workspaces, folders, projects, tasks, assignees, due dates, notes and AI agents in
**Taskade** over the **Taskade REST API v1**.

- **Categories** — project-management, productivity
- **Auth methods** — personal-token (`Authorization: Bearer <Personal Access Token>`)
- **Actions** — 35
- **Health checks** — `service` (the "App" component of Taskade's Statuspage), `api` (unsigned
  `GET /workspaces`, a schema-correct `UNAUTHORIZED` envelope passes), `quota`
  (`x-rate-limit-*` headers off a signed `GET /workspaces`, informational) + the derived
  `auth:personal-token`
- **Network** — `www.taskade.com`, `taskade.statuspage.io` (status feed only)

## Verified against

The OpenAPI 3.0.3 document ("Taskade Public API (v1)", `servers: https://www.taskade.com/api/v1`)
that the reference pages under `https://docs.taskade.com/developers/comprehensive-api-guide/`
render from, found through `https://docs.taskade.com/llms.txt` (each `.md` page links the
`api-0.1.0.json` file). Every path, body field and enum below was read from it on 2026-10-06, and
the failure envelope, rate-limit headers and status feed were measured live without credentials.
Nothing in the v1 reference or its changelog is marked deprecated; the only `deprecated` hit in
the v2 reference is the old `subscribeWebhook`/`unsubscribeWebhook` operations, which this app
does not use.

## Auth

A **Personal Access Token** (Taskade > Settings > Developer > Personal Access Tokens). The
OpenAPI document also declares an OAuth 2.0 authorization-code scheme
(`www.taskade.com/oauth2/authorize` / `/oauth2/token`) but publishes no scope list or
self-serve client registration, so it is **not modelled** here. The credential is applied only in
`sign`. The check and the connection label use `GET /workspaces`, which returns workspace names
and ids and never echoes the token.

A missing and an invalid token answer a byte-identical HTTP 401
`{"ok":false,"message":"Unauthorized","code":"UNAUTHORIZED","statusMessage":"Unauthorized"}`,
so credential validity is decided from the body (`ok` + `code`), with the status as a hint.

## Actions

| Resource | Actions |
| --- | --- |
| workspace / folder | `workspace-list`, `folder-list`, `folder-project-list`, `folder-agent-list`, `folder-media-list`, `folder-template-list` |
| project | `my-project-list`, `project-get`, `project-create`, `project-create-in-workspace`, `project-create-from-template`, `project-copy`, `project-complete`, `project-restore`, `project-member-list`, `project-field-list`, `project-share-link-get` |
| task | `task-list`, `task-get`, `task-create`, `task-update`, `task-move`, `task-complete`, `task-uncomplete`, `task-delete`, `task-assignee-list`, `task-assignee-set`, `task-date-get`, `task-date-set`, `task-date-delete`, `task-note-get`, `task-note-set`, `task-note-delete` |
| agent | `agent-get`, `agent-conversation-list` |

Notes:

- **Pagination** is two schemes. Most lists take `limit` + `page`; `task-list` takes `limit`
  (default 100, max 1000) plus `after` / `before` task-id cursors. `task-list` returns
  `nextAfter` (the last task id) when a page came back full, else `null`.
- `task-create` sends one task per call (the API accepts up to 20 per request, content up to
  2000 characters). Placement `beforebegin` / `afterend` needs a reference task; this is checked
  locally and the API accepts only `afterbegin` / `beforeend` without one.
- `task-assignee-set` replaces the whole assignee list with the given user handles.
- `project-create` takes Markdown; Taskade turns headings and lists into the task outline.
- `project-create` and `project-create-in-workspace` are two documented endpoints
  (`POST /projects` with `folderId`, and `POST /workspaces/{id}/projects`).

## Not covered

Left out deliberately, either because it is not a plain JSON call or because the surface is
unstable or credential-adjacent:

- Media upload / download (`/medias/spaces/{id}/upload`, `/download`) — binary bodies.
- Bundle export / import (`/bundles/*`) — whole-workspace transfers, ZIP bodies.
- Agent write operations (create, generate, update, delete, public access, knowledge sources) and
  `GET /projects/{id}/blocks`, `PUT /projects/{id}/shareLink`, task custom-field value
  read/write (`/tasks/{id}/fields/{fieldId}` — the value type depends on the field definition).
- The "Action API v2" (RPC-over-HTTP) and the signed webhook registration endpoints
  (`/api/v2/webhooks`) — a separate surface from v1; webhooks need a paid plan.
- OAuth 2.0 (see Auth).

## Icon

`assets/icon.svg` is the vendor's own mark, downloaded byte-for-byte from
`https://www.taskade.com/favicon.svg` (200, `image/svg+xml`, 13,780 bytes; `cmp` against a fresh
fetch is identical). Format with `deno task fmt`, never bare `deno fmt`.

## Decisions and gotchas

- **Status page.** `status.taskade.com` answers its HTML shell for `/api/v2/summary.json` and
  `/index.json` (a 200 that is not a feed). The real Statuspage feed is at
  `taskade.statuspage.io/api/v2/summary.json` (`page.id: qh8w33xczvyl`, `page.name: Taskade`), and
  that host is what the check declares. There is no component named "API"; the check keys off the
  top-level **"App"** component (`crq065nyd9sb`) and reports the AWS / Cloudflare / Stripe
  components for visibility only, so an AWS SES or Stripe incident does not mark Taskade down.
- **Rate limits.** The headers are hyphenated (`x-rate-limit-limit`, `-remaining`, `-reset`) and
  `-reset` is seconds-until-reset as a decimal. An unauthenticated probe measured a limit of 40.
- **Failures.** Every failure is `{ok:false, message, code, statusMessage}`; the client also throws
  if a 2xx body is an `ok:false` envelope.
- **Tests.** Every action has a mocked-`ctx.fetch` unit test; no live credential was available, so
  success-path response shapes are from the OpenAPI schema, not from a live account.
