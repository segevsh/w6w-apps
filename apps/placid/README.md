# Placid

Generate images, PDFs and videos from [Placid](https://placid.app) templates, and manage the
templates, collections, fonts and uploaded media behind them. Built against the REST API v2.0
reference linked from <https://placid.app/docs> (`/docs/2.0/rest/*`), verified 2026-10-06. The
reference carries no deprecation or sunset notice for the REST API.

- **Host**: `https://api.placid.app/api/rest` (the only host in `network.allow`)
- **Auth**: project API token, `Authorization: Bearer {TOKEN}`, injected by `sign`. Tokens are
  project-specific, so one connection is one Placid project.
- **Rate limit**: 60 requests/minute; `X-RateLimit-Limit`, `-Remaining`, `-Reset` (epoch seconds).
- **Icon**: Placid's own `apple-icon-180x180.png` from placid.app, unmodified.

## Actions (26)

| Group | Actions |
|---|---|
| Images | `image-create`, `image-get`, `image-delete` |
| PDFs | `pdf-create`, `pdf-merge` (2 to 10 existing PDFs by URL), `pdf-get`, `pdf-delete` |
| Videos | `video-create`, `video-get`, `video-delete` |
| Templates | `template-list`, `template-get`, `template-create` (also duplicates), `template-update`, `template-delete` |
| Collections | `collection-list`, `collection-get`, `collection-create`, `collection-update`, `collection-delete` |
| Fonts | `font-list`, `font-get`, `font-upload`, `font-update`, `font-delete` |
| Media | `media-upload` |

Every render is asynchronous: create answers `{id, status: "queued", <file>_url: null,
polling_url}`. Poll the matching `-get` action until `status` is `finished`, or pass
`webhook_success` and Placid POSTs the finished record. Layer content is one JSON object keyed by
the template's layer names, as the API takes it. List actions return `{data, nextCursor,
prevCursor, perPage}`; feed `nextCursor` back as `cursor`.

## Health checks

| Check | Probe |
|---|---|
| `service` | Declared unavailable, informational. `status.placid.app` is a real page (title "placid.app Status") but client-rendered Next.js with no feed: `index.json`, `summary.json`, `api/v2/*.json`, `feed.rss` answer a 404 HTML shell and `history.atom` a plain-text 404. `placid.statuspage.io` redirects to Atlassian's marketing page. |
| `api` | Unsigned `GET /templates`. A 401 carrying Placid's `{"message":"Unauthenticated."}` JSON passes; HTML or a 5xx is down. |
| `quota` | Signed `GET /collections?per_page=1`, read `X-RateLimit-*`. Informational; `unknown` when the headers are absent. Credit balance has no endpoint, so only request rate is covered. |
| `auth:bearer-token` (derived) | `GET /templates`, passes only on a body with a `data` array. A bad token is `{"message":"Unauthenticated."}`, classified from the body, never the status. Placid has no whoami endpoint, so nothing echoes the token. |

## Not covered

- **URL API, Editor SDK, WordPress plugin API, MCP server**: separate surfaces, not the REST API.
- **Multi-file upload** on `media-upload` and `font-upload`: one file per call (the API allows up
  to 5 media files per request).
- **Uploads are not live-tested.** `media-upload` and `font-upload` hand-build the documented
  `multipart/form-data` body and send it as bytes; the unit tests check the framing, but no
  authenticated call was made (no token available).
- **Quota headers are documented but not observed**: they need a token to see.

## Findings

- The video object table names its URL field `image_url`; the example next to it, and the create
  body, say `video_url`. `video-get` declares `video_url`. Check both until Placid fixes the page.
- The image page's `modifications.dpi` row says "output DPI of the PDF" (copy-paste). Image DPI
  values are 72, 150, 300 and PDF DPI values are 96, 150, 300.
- Delete is not uniform: image, PDF and video answer 204; template delete answers 200; fonts answer
  409 with `templates_using_font` while referenced unless `force=1`.
- `GET /collections` returns every collection in one response until `per_page` or `cursor` is set,
  then switches to the cursor envelope. The `list` action accepts both shapes.
- `PATCH /collections/{id}` `template_uuids` REPLACES the list; use `add_template_uuids` and
  `remove_template_uuids` for incremental edits.
- Placid token scope is per project, so a 404 on a template id from another project is
  indistinguishable from a deleted one.

## Develop

```
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
