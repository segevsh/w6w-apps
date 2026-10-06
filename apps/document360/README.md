# Document360

Manage a Document360 knowledge base from a workflow: browse projects, workspaces and the category
tree, read, create, update, publish, unpublish, fork, archive and delete articles, manage
categories, search a workspace, work with the Drive, and read team accounts, groups and readers —
on the **Document360 Customer API v3**.

- **Categories** — cms, documents
- **Auth methods** — api-key (`X-API-Key`)
- **Actions** — 37
- **Health checks** — 3 (~~`service`~~, `api`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `apihub.document360.io`, `apihub.us.document360.io`,
  `apihub.ca.document360.io` (the three documented data centers, nothing else)
- **Website** — https://document360.com/
- **API docs** — https://apidocs.document360.com/apidocs
- **OpenAPI** — https://apihub.document360.io/swagger/v3/swagger.json
- **Status page** — https://status.document360.com/ (HTML only; see Health checks)

> **Everything below was verified on 2026-10-06** against Document360's own OpenAPI 3.0.1 document
> (4,544,745 bytes, `info.title` "Document360 Customer API", `info.version` 3.0.0, 149 paths), the v3
> pages of `apidocs.document360.com`, and live probes of all three hosts and the status page.

## The things most likely to go wrong

1. **There are three API generations; this is v3.** The docs portal carries v1, v2 and v3. v1/v2
   authenticate with an `api_token` header; v3 uses `X-API-Key` and `snake_case` everywhere. A v1/v2
   token does not work against v3, and `Authorization: Bearer` is reserved for OAuth access tokens.
   v1/v2 are not covered.
2. **The host is per data center, and it is a Connection field.** Europe (`apihub.document360.io`,
   the default), United States (`apihub.us.document360.io`), Canada (`apihub.ca.document360.io`). A
   key only works against its own data center. The OpenAPI `servers[]` also lists a templated
   private-hosting host (`apihub.{private_hosting}.document360.io`); a manifest cannot enumerate it,
   so private hosting is not supported.
3. **A 401 has an empty body.** Missing and invalid keys both answer `401` with `content-length: 0`
   and `www-authenticate: Bearer` on all three hosts (measured). Every other failure is RFC 7807
   `application/problem+json`, and a `403` can mean four different things — `FORBIDDEN` (role or
   scope), `FEATURE_NOT_IN_LICENSE` (plan), `PREMIUM_FEATURE_NOT_IN_LICENSE` (premium add-on),
   `LICENSE_LIMIT_EXCEEDED` (seats) — that only `errors[].code` tells apart. The connection test and
   the error messages read the code, never the status alone.
4. **API access is plan-gated.** It needs a Business, Enterprise or Trial plan; otherwise *every*
   endpoint answers `403 FEATURE_NOT_IN_LICENSE`, including for keys created earlier. The connection
   test reports that as a plan problem, not a bad key.
5. **Every path is project-scoped** (`/v3/projects/{project_id}/…`). The project id is a Connection
   default, overridable per action (`projectId`), and filled in automatically when the key can see
   exactly one project. Creating articles and categories also needs a **workspace id**
   (`workspace-list`), and publishing needs a workspace id **and** a version number
   (`article-version-list`).
6. **Two rate-limit buckets.** Reads and writes are limited per key per minute, independently
   (Business 120/60, Enterprise and Trial 200/100). Every 2xx carries `X-RateLimit-Limit` and
   `X-RateLimit-Remaining`; a 429 adds `Retry-After`.
7. **Drive file URLs may be signed.** On private or mixed knowledge bases, file URLs in Drive
   responses include a time-limited SAS token. They are returned as the vendor sends them; treat the
   output as sensitive.

## Auth

One method, **API Key (v3)** — `X-API-Key: d360_sk_…`. Create it in the portal under Settings >
Knowledge base portal > API keys (choose "Enhanced keys (v3)"); the secret is shown once. The key
carries a portal role, a content role and a content-access scope, so a workflow can do exactly what
that key was granted and no more.

Connection fields: **API Key** (secret), **Data center** (Europe, United States, Canada) and an
optional **Project ID**. `sign` is the only code that sees the key.

**Connection test** — `GET /v3/projects?page_size=1` (the docs' own first request; it returns project
names and ids, never the key). The verdict is classified from the response, not the status:

| Response | Verdict |
| --- | --- |
| `200`, `success: true`, `data` array | live |
| `401` (empty body) | rejected, naming the data center |
| `403 FORBIDDEN` | live — the key just lacks `ViewProjectSettings`; set the project id on the Connection |
| `403 FEATURE_NOT_IN_LICENSE` / `PREMIUM_FEATURE_NOT_IN_LICENSE` / `LICENSE_LIMIT_EXCEEDED` | not usable — plan or seats |
| `200` that is not the documented envelope | fail (wrong data center or a shell page) |

`afterConnect` publishes `region`, `projectId` and `projectName` only.

## Actions

Lists return `{ items, pagination }` (`has_more`, `next_cursor`, optional `total_count`); single
resources return the vendor's `data` object; deletes, publishes and unpublishes return a small
confirmation object because the vendor sends no body. `page_size` defaults to 25 and caps at 100.

| Key | Title | Type | Verb |
| --- | --- | --- | --- |
| `article-archive` | Archive Article | perform | POST |
| `article-create` | Create Article | perform | POST |
| `article-delete` | Delete Article | perform | DELETE |
| `article-fork` | Fork Article Version | perform | POST |
| `article-get` | Get Article | read | GET |
| `article-publish` | Publish Article | perform | POST |
| `article-settings-get` | Get Article Settings | read | GET |
| `article-unarchive` | Restore Archived Article | perform | POST |
| `article-unpublish` | Unpublish Article | perform | POST |
| `article-update` | Update Article | perform | PATCH |
| `article-version-list` | List Article Versions | read | GET |
| `category-create` | Create Category | perform | POST |
| `category-delete` | Delete Category | perform | DELETE |
| `category-get` | Get Category | read | GET |
| `category-publish` | Publish Category | perform | POST |
| `category-update` | Update Category | perform | PATCH |
| `document-get-by-url` | Get Document by URL | read | GET |
| `workspace-article-list` | List Workspace Articles | read | GET |
| `workspace-category-list` | List Workspace Categories | read | GET |
| `workspace-get` | Get Workspace | read | GET |
| `workspace-list` | List Workspaces | read | GET |
| `workspace-search` | Search Workspace | search | GET |
| `drive-file-get` | Get Drive File | read | GET |
| `drive-folder-create` | Create Drive Folder | perform | POST |
| `drive-folder-get` | Get Drive Folder | read | GET |
| `drive-folder-list` | List Drive Folders | read | GET |
| `drive-search` | Search Drive | search | GET |
| `label-list` | List Labels | read | GET |
| `language-list` | List Languages | read | GET |
| `project-get` | Get Project | read | GET |
| `project-list` | List Projects | read | GET |
| `tag-list` | List Tags | read | GET |
| `workflow-status-list` | List Workflow Statuses | read | GET |
| `reader-list` | List Readers | read | GET |
| `user-get` | Get Team Account | read | GET |
| `user-group-list` | List Team Groups | read | GET |
| `user-list` | List Team Accounts | read | GET |

Perform actions state `idempotent` explicitly: creates and forks are **not** idempotent (each call
mints a new row), updates, deletes, publishes and archives are.

## Health checks

| Check | Kind | Verdict |
| --- | --- | --- |
| `service` | service | Declared **unavailable** at `informational` severity. |
| `api` | dependency (connection) | Unsigned `GET /v3/projects` on the Connection's data center. The gateway's empty `401` with `www-authenticate: Bearer`, a problem+json body, or a 2xx passes; a 5xx or an HTML shell is `down`; anything else is `unknown`. |
| `quota` | quota (connection, signed) | Read-bucket headroom from `X-RateLimit-Limit` / `-Remaining` on `GET /v3/projects?page_size=1`; `degraded` at 90% used, `down` at 0 or on 429, `unknown` when the headers are absent or the key cannot list projects. The write bucket is not observable without writing. |
| `auth:api-key` | credential (derived) | The connection test above. |

**Why `service` is a declared absence.** `status.document360.com` is real (title "Document360 Status";
its history names "API Hub" and "API Hub - US"), but it is server-rendered HTML: `/api/v2/summary.json`,
`/index.json`, `/history.atom` and a nonsense path all answer the same `200 text/html` "Status page
disabled" shell, so there is nothing machine-readable to declare, and this app does not scrape HTML.
`document360.statuspage.io` is a different, abandoned Statuspage (last updated 2022, a component named
"Management Portal (example)") and is deliberately not used.

## Deliberately not covered

The v3 API is large (149 paths). Not yet covered, with nothing guessed:

- Bulk article and category operations (create, update, delete, publish, unpublish), article and
  category version get/delete/fork, category versions and content.
- Comments, labels on articles and categories, label/tag creation, article attachments.
- Workflow-status updates, content-access permissions, redirect rules, custom scripts, roles and
  permission matrix, SSO schemes, custom-field definitions, translations, operations polling.
- Creating or deleting team accounts, groups and readers; user role and group edits.
- Drive uploads, file copy/move/rename/tag/delete, folder update/delete.
- Snippets, variables, glossaries, article templates, API-reference import/resync/publish/logs,
  project import/export, and the AI search endpoints.
- **Premium endpoints** (analytics, AI search analytics, AI writer style guides) — they answer `403
  PREMIUM_FEATURE_NOT_IN_LICENSE` without the add-on.
- v1 and v2 of the API, OAuth 2.0 bearer tokens, and private-hosting hosts.

## Icon

`assets/icon.svg` is Document360's own favicon (`https://document360.com/favicon.svg`, 10,989 bytes),
used verbatim. Format with `deno task fmt`, never bare `deno fmt`, which rewrites the SVG.

## Layout

```
index.ts            entry module: actions, auth, health checks
auth/api-key.ts     X-API-Key, connection test, afterConnect
lib/client.ts       regions, project scoping, envelope + problem+json handling
lib/params.ts       shared Param fragments
actions/            one file per action
health/             service (declared absence), api, quota
tests/              entry module, auth, health, client and every action
```

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
