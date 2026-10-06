# Contentstack

Manage Contentstack content from a workflow through the **Content Management API (CMA) v3**:
read the content model, create/update/delete entries, publish and unpublish entries and assets
(singly or in bulk), build and deploy releases, move entries through workflow stages and manage
webhooks.

Verified 2026-10-06 against the CMA reference
(`https://www.contentstack.com/docs/developers/apis/content-management-api.md`) and the OpenAPI file
it links (`cma-openapi-3.json` v3.0.1, 138 paths). Every endpoint below is in that file.

## Auth

One method, `management-token`: a **stack API key** (`api_key` header) plus a **management token**
(`authorization` header), plus the stack's **region**. Management tokens are stack-level and need no
user login, which is why the user-session `authtoken` is not offered. Both values are secrets and are
only ever stamped on the request by `sign`; actions never see them. Create the token under
*Settings > Tokens > Management Tokens* and give it write access if you use the write actions.

`test` lists one content type (`GET /v3/content_types?limit=1`) and reads the **body**: success needs
the documented `content_types` array, rejection is the vendor's own `error_code` (109 unknown stack
API key, 105 token not valid), whatever the HTTP status.

### Regions

A stack answers only on its own region's host (seven, from the reference's "Base URL" list):

| Region | Host |
|---|---|
| `na` AWS North America | `api.contentstack.io` |
| `eu` AWS Europe | `eu-api.contentstack.com` |
| `au` AWS Australia | `au-api.contentstack.com` |
| `azure-na` Azure North America | `azure-na-api.contentstack.com` |
| `azure-eu` Azure Europe | `azure-eu-api.contentstack.com` |
| `gcp-na` GCP North America | `gcp-na-api.contentstack.com` |
| `gcp-eu` GCP Europe | `gcp-eu-api.contentstack.com` |

The region is echoed onto the connection's `display` by `afterConnect`; only these seven hosts are in
`network.allow`. The OpenAPI file's own `servers` block lists `azure-na-cdn.contentstack.com` and
omits GCP, so it was not used; all seven hosts above were probed live and each answers the identical
JSON `412 {"error_code":109}` for an unknown API key.

## Actions (34)

| Area | Actions |
|---|---|
| Stack | `get-stack`, `list-branches` |
| Content model | `list-content-types`, `get-content-type`, `list-global-fields`, `get-global-field`, `list-locales`, `list-environments`, `get-environment` |
| Entries | `list-entries`, `get-entry`, `create-entry`, `update-entry`, `delete-entry`, `publish-entry`, `unpublish-entry`, `set-entry-workflow-stage` |
| Assets | `list-assets`, `get-asset`, `delete-asset`, `publish-asset`, `unpublish-asset` |
| Bulk | `bulk-publish`, `bulk-unpublish`, `get-job-status` |
| Releases | `list-releases`, `get-release`, `create-release`, `add-release-item`, `deploy-release` |
| Webhooks and workflows | `list-webhooks`, `create-webhook`, `delete-webhook`, `list-workflows` |

Notes that matter when wiring them:

- Branch-aware actions take an optional `branch` and send it as the `branch` header.
- Lists return up to 100 items; page with `limit` / `skip` and `includeCount` (the reference points
  Get all entries/assets at the Content Delivery API's pagination).
- `query` (list-entries, list-assets) is a JSON object sent as the `query` parameter.
- Bulk actions take at most 10 items per request and are limited to 1 request per second; they send
  `api_version: 3.2` (the documented value for the nested-reference flow and job logs). The returned
  `job_id` goes to `get-job-status`.
- `publish-*`/`unpublish-*` take comma-separated `environments` (names) and `locales`; add
  `scheduledAt` (ISO 8601) to schedule.
- `create-webhook` creates destinations with authentication type `None` only; basic, bearer and OAuth
  destinations carry a second party's credentials and are not exposed.
- The CMA allows 10 requests/second per organization; excess answers 429.

### Not covered

Left out rather than guessed: asset upload and replace (multipart), content type / global field /
taxonomy / term writes and import/export, entry variants and variant groups, localize/unlocalize and
version naming, bulk delete / workflow / add-to-release, branch create/delete/compare/merge and
aliases, roles, tokens, labels, extensions and custom fields, metadata, audit log, publish queue,
workflow and publish-rule authoring, stack settings/sharing/ownership, user management, webhook
update/executions/retry, and release item removal/clone/lock. Basic/OAuth authtoken and OAuth
app-token auth are not offered.

## Health

- **`service`** — Atlassian Statuspage at `status.contentstack.com/api/v2/summary.json`. Verified real
  (`page.name` "Contentstack", `page.id` `v2x965mxjrv3`, Statuspage schema). The page rolls up Delivery,
  Image, GraphQL, Launch, Personalize, AgentOS, Lytics and more, so the page-level indicator is not
  used. Components are grouped per cloud region, each group with one `Content Management API` child;
  the check reads that child of **this connection's own region group** (matched by `group_id`).
  Context posture: it reads the connection for the region, sends no credential. A failing status page
  or an unrecognised page reports `unknown`, never `down`.
- **`quota`** — declared absent, `informational`. The CMA sends `X-RateLimit-*` headers but the window
  is one second and shared across the organization, so a periodic probe says nothing about headroom.
- **`auth:management-token`** — derived from `test`.

## Icon

`assets/icon.svg` is the simple-icons mark
(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/contentstack.svg`, 1611 bytes), byte-identical
to the download. Contentstack's own `/favicon.svg` answers 404. It is single-colour black, so
`assets/icon.dark.svg` is the same artwork re-inked white for dark tiles, generated by
`_tools/icon-legibility.ts fix contentstack`.

## Develop

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
