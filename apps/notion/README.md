# Notion

119 workflow actions covering all 107 operations in Notion's public and Admin OpenAPI schemas,
plus compatibility and convenience actions. Public requests use `Notion-Version: 2026-03-11`;
Admin requests use `2026-06-01`. Documentation was downloaded on 2026-10-19.

## Create Page: choosing a parent

**Parent Page ID and Title are optional.** The parent requirement depends on your connection:

- **OAuth or Personal Access Token:** leave **Create in** and the parent fields empty, or select
  **Workspace (private page)**. This creates a private page in the connected user's workspace.
- **Internal Integration Secret:** choose **Existing page** and paste that page's Notion URL or ID.
  Share/connect the parent page with the integration first. **Search Pages** can find accessible
  page IDs. A workspace-level private page requires a user-associated connection instead.
- **Database row:** choose **Data source**, enter its **Data Source ID**, and supply **Properties**
  matching its schema. **Search Data Sources** finds IDs; **Get Database** returns the container's
  `data_sources`. A database ID and a data source ID identify different objects.

For an ordinary page, the optional **Title** field builds the Notion title property. For a row,
set the title property by its schema name, for example:

```json
{
  "Name": {
    "title": [{ "text": { "content": "Hello" } }]
  }
}
```

Content can be Markdown, an array of child blocks, or a template. Choose one content source.
Template application is asynchronous. Markdown writes with **Allow Async** may return an async
task instead of a page; poll **Get Async Task**. Markdown `v2` is an opt-in preview.

[Notion's Create Page reference](https://developers.notion.com/reference/post-page)
explains the parent and content rules.

## Coverage

| Area | Actions include |
| --- | --- |
| Pages | Create, retrieve, update, move, trash/restore, retrieve property items, read/write Markdown |
| Databases and data sources | Create, retrieve, update schema/metadata, query, list templates, search |
| Blocks | Retrieve, update, delete, list children, append/position children |
| Comments | Create, retrieve, update, delete, list; rich text or Markdown |
| Files | Create upload, send binary contents/parts, complete multipart upload, retrieve, list |
| Views | Create, retrieve, update, delete, list, create/read/delete cached view queries |
| Users and emojis | List/retrieve users, retrieve connected bot, list custom emojis |
| Meeting notes | Create from uploaded media or an existing block, query |
| Agents and sessions | Query, retrieve, insights, status/credit limits, batch management, conversations/events, cancel |
| Agent skills | List plugins, retrieve plugin and skill directories |
| OAuth tokens | Create, refresh, introspect, revoke |
| Enterprise Admin | Legal holds, workspace exports, users/groups/members, agent permissions/credits/policies, personal tokens, MCP connections, analytics reports |

[endpoint-coverage.json](docs/endpoint-coverage.json) maps every public/Admin HTTP operation to an
exported action. Private/internal operations in `openapi-undocumented.json` are excluded from the
supported action surface. Old reference pages that describe the same operation map to its current
endpoint. Webhook event documentation is included in the download; these events are not REST
endpoints or newly implemented subscription triggers.

List/query actions return Notion's response and pagination fields. Pass `next_cursor` into
**Start Cursor** to continue. **Get Many Databases** walks pages and deduplicates containers.
Notion search is indexed and is not an exhaustive inventory of every accessible object.
Search/list database convenience actions search data sources and retrieve their database containers,
which adds one retrieval request per unique container on a page.

Complex Notion objects retain the API's nested snake_case fields in JSON inputs. Top-level action
fields use camelCase. **Filter Properties** sends repeated query parameters correctly.
Explicit `null` values and `false` flags are preserved. Error responses retain HTTP status and
`Retry-After`; the app does not automatically retry mutations.

File uploads accept base64 bytes (or a base64 data URL), filename, MIME type, and an optional part
number. Requests use `multipart/form-data` with a generated boundary. For externally hosted files,
**Create File Upload** also supports Notion's `external_url` import mode. Session event streaming
returns the completed stream as `eventStream`; workflow actions do not deliver live incremental SSE.

## Connections

| Connection | Purpose | Credential check |
| --- | --- | --- |
| Internal Integration Secret | Content shared with an internal integration | `GET /v1/users/me` |
| OAuth (Sign in with Notion) | User-authorized content and private workspace pages | `GET /v1/users/me` |
| Personal Access Token | User-scoped API access, including private workspace pages | `GET /v1/users/me` |
| Organization Bot Token | Enterprise Admin actions; requires appropriate organization scopes | Local required-field check only |
| OAuth Client | Token-management actions using client ID and client secret | Local required-field check only |

The last two connection checks explicitly report that they validate supplied fields locally.
They do not claim remote credential liveness or permissions. Those are checked by Notion when an
action runs. Enterprise organization tokens and OAuth client credentials cannot sign content requests.

Browser OAuth declares JSON token requests, HTTP Basic client authentication, and `owner=user`.
It requires the accompanying core OAuth configuration fields and server token-exchange/callback
changes; update those packages with this app. Existing providers retain form-encoded token requests
and credentials in the body by default. The host stores returned access and refresh tokens.
**Refresh Token** returns the replacement pair; it does not update another stored w6w connection or
add automatic token rotation to the host. Token management uses the separate **OAuth Client** connection.

All outbound API requests use the runtime's signed `ctx.fetch`. The egress allowlist remains
`api.notion.com`.

## Upgrade from 0.2.1

Version 0.3.0 retains all 17 existing action keys and moves their requests to the current API:

- `create-page` supports parentless creation and builds the full title property object.
- `create-database-page` and `get-many-database-pages` accept **Data Source ID**. Existing
  **Database ID** inputs resolve the container's sole data source. Multiple data sources require
  an explicit choice; the app does not silently pick one.
- `list-databases`, `search-databases`, and `get-many-databases` still return database containers.
  Their underlying searches use the current `data_source` filter.
- `archive-page` and `restore-page` send `in_trash`. The existing `archived` input on
  `update-database-page` is translated to `in_trash`; an explicit **In Trash** value takes precedence.
- `append-block-children` translates its existing `after` input to
  `position: {type: "after_block", after_block: {id: "…"}}`. New workflows can use **Position**.
- Responses are current Notion responses. Update downstream mappings from `archived` to `in_trash`.
  Database property schemas now live on data sources; use **Get Data Source**. See Notion's
  [2025 migration guide](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03)
  and [2026 migration guide](https://developers.notion.com/guides/get-started/upgrade-guide-2026-03-11).

## Documentation snapshot and validation

[source-snapshot.json](docs/source-snapshot.json) records source URLs, API versions, and schema hashes.
To download the full documentation index, linked pages, and all three published OpenAPI specs:

```sh
python3 scripts/download-docs.py /path/to/notion-api-docs
```

The downloader preserves paths and writes a manifest with SHA-256 hashes and final URLs. A link to
Notion's public Postman workspace redirects to HTML and is saved as HTML. Failed downloads make the
script exit unsuccessfully. Downloaded upstream files are reference material, separate from the
runtime package.

```sh
deno task check
deno task lint
deno task test
# From the apps repository:
deno run --no-check -A --config _tools/deno.json _tools/audit.ts notion
```

The test suite includes transport fixtures derived from the public/Admin schemas, regression tests
for migration behavior, binary multipart uploads, pagination, null/false handling, and auth boundaries.
Tests use mocked responses; they do not create or modify a live Notion workspace.

## Health checks

The service/quota declarations remain informational and report `unknown`. The vendor status page is
<https://status.notion.so>; this app declares no machine-readable service probe. Notion exposes no
quota-headroom endpoint. The published integration allowance averages three requests per second;
429 responses supply `Retry-After`. Workspace credential tests use `/users/me`, which does not
require sharing a page first. Admin/token-management credential checks are local only, as noted above.
