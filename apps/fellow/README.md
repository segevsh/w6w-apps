# Fellow

AI meeting notes ([fellow.ai](https://fellow.ai), formerly fellow.app): notes, recordings and
transcripts, action items, recording upload and webhooks, over the Fellow Developer API.

- App id: `io.w6w.fellow`
- Auth: Developer API key (`X-API-KEY`) plus the workspace subdomain
- API host: `https://{subdomain}.fellow.app/api/v1` (per workspace) — `network.allow` is
  `*.fellow.app`
- Icon: the vendor's own 180x180 PNG mark (from fellow.ai's favicon link, framerusercontent.com),
  embedded verbatim as base64 in `assets/icon.svg` (no SVG exists).

Every path, verb, body field, enum and response key here was checked on 2026-10-05 against the
OpenAPI 3.1 document that `developers.fellow.ai/reference/*` embeds in each page
(`servers[0].url = https://{subdomain}.fellow.app`; 19 paths, 23 operations), plus live probes of
`{subdomain}.fellow.app/api/v1/me` and `status.fellow.ai`.

## Actions (23)

| Resource | Actions |
|---|---|
| user | `me-get` |
| recording | `recording-get`, `recording-list`, `recording-delete`*, `recording-upload`, `upload-get`, `upload-list` |
| note | `note-get`, `note-list`, `note-delete`*, `note-agenda-write`, `note-agenda-append`, `note-agenda-prepend`, `note-agenda-find-replace` |
| action item | `action-item-get`, `action-item-list`, `action-item-complete`, `action-item-archive` |
| webhook | `webhook-create`, `webhook-get`, `webhook-update`, `webhook-delete`, `webhook-list` |

\* Super Admin key required (Enterprise plan).

Every action also takes an optional **Act on behalf of** (`X-On-Behalf-Of`, Super Admin keys only).

List actions return `{ items, cursor, pageSize, hasMore }` for **one page**. To walk the dataset,
feed the `cursor` back in until it is null.

## Findings worth knowing

1. **The host is per workspace and the subdomain is validated.** `acme.fellow.app/api/v1/me`
   answers `401 {"detail":"Unauthorized"}`; an unknown subdomain answers an **HTML 404** (so a 404
   means "wrong subdomain", not "no such user"); the bare label `app` 302s to `app0.fellow.app`.
   The subdomain is normalised to a single DNS label before it is put in a URL, so a pasted value
   cannot send the request (and its `X-API-KEY`) to another host. The API host is `.fellow.app`
   even though the product and docs moved to `fellow.ai`; no `fellow.ai` API host is documented
   or used. The status page, however, is `status.fellow.ai` (`status.fellow.app` 301s to it).
2. **List endpoints are POST with a JSON body** (`/recordings`, `/notes`, `/action_items`,
   `/recordings/upload/list`) — only `/webhooks` is a GET, with `page_size`, `cursor` and a
   JSON-encoded `filters` query string. Cursor pagination, `page_size` 1–50 (default 20), and
   `page_info.cursor` is null on the last page. Transcripts, AI notes, attendees and note bodies
   are opt-in `include` flags because they are large.
3. **Two markdown fields, only one is writable.** `content_markdown` is a lossy read-only
   rendering; `content_fellow_markdown` is the round-trip format the agenda write actions accept.
   `find-replace` requires the text to match **exactly once** (zero or several is a 422 that
   changes nothing). `note-agenda-write` replaces the whole agenda.
4. **The webhook signing `secret` is returned only by Create Webhook**, and creation succeeds only
   if your endpoint answers Fellow's `url_verification` POST with a 2xx (not 204/205) whose body
   is the raw challenge string. Changing the URL re-runs the challenge. `scope` (`user` or
   `workspace`) is fixed at creation; a workspace webhook needs a Super Admin key and cannot be
   created through `X-On-Behalf-Of`.
5. **Docs disagree on the auth header.** The Super Admin page's samples show
   `Authorization: ApiKey …`; the OpenAPI security scheme and the Authentication page say
   `X-API-KEY`. This app sends `X-API-KEY`.
6. **Rate limits:** 3 requests/second and 10,000/day per key, answered with 429 `rate_limited`.
   Errors are `{"detail": …}`; a 422/400 detail may be a list.

## Auth

`api-key` (type `apiKey`, header `X-API-KEY`). The key is per user and inherits that user's access;
the Developer API must be enabled by a workspace admin (Workspace settings > Security) before the
key section appears in User settings. `test` calls `GET /me` and judges the response **body**
(`user.id` present), never the status code alone; `/me` returns the caller's own id, email and
name — not the key. `afterConnect` labels the connection with the workspace name and email.

## Health checks

- `service` — `status.fellow.ai/api/v2/summary.json` (a real Statuspage-schema page named
  "Fellow"; an unknown path 404s with an empty body, so it is not a catch-all). The verdict is the
  page's **Developer API** component, not the page-wide indicator that also rolls up Website, MCP,
  bot recording and Glean. Unreadable page = `unknown`, never `down`.
- `rate-limit` — a declared absence (`severity: informational`): Fellow documents the limits but no
  remaining-count header or usage endpoint.
- The credential check (`auth:api-key`) is derived from `test`.

## Not covered

- **Webhook triggers.** Event payload shapes and the signature algorithm are not documented in
  the pages this app was built from (only the four event names and the verification handshake),
  so no trigger is declared; the webhook actions let a workflow register an endpoint.
- Workspace-admin features, the MCP server and Okta SCIM described in Fellow's help centre are not
  part of the Developer API reference.
- Auto-paginating "fetch all" actions: each list action returns one page by design.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
