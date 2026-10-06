# Slite

Team knowledge base. This app creates, reads, updates, archives, verifies and deletes notes, searches
them, asks Slite's AI a question over them, and looks up the users and groups that own them.

- App id: `io.w6w.slite` · categories: `productivity`, `documents`, `ai`
- Host: `api.slite.com` (the only entry in `network.allow`) · API prefix `/v1`
- Source of truth: Slite's readme.io reference, `https://developers.slite.com/` (branch 1.0), read
  through the per-operation OpenAPI document behind each `/reference/*` page and the index at
  `/llms.txt`, fetched 2026-10-06, plus unauthenticated live probes against `api.slite.com` the same
  day. The reference was checked for `deprecat|sunset|will be removed|end of life`: the only hits
  are `deprecated: true` on the three `/ask/index` operations (see "Not covered"); API version 1 is
  the live one.

## Auth

One method, `api-key` (type `apiKey`): a personal API key from Slite's organization menu >
Settings > API > "Create a new key". It is shown once. It acts as the user who created it ("authorize
access to all the user content"), so a workflow sees what that user sees.

### Two documented header shapes, both sent

Slite's docs disagree. The guide ("Authentication - Get your API key") says to send
`x-slite-api-key: <key>`. Every operation's OpenAPI document says `securitySchemes.bearer`
(`type: http`, `scheme: bearer`), i.e. `Authorization: Bearer <key>`. Without a real key the
gateway's choice cannot be measured, and an unauthenticated probe cannot tell either: a request with
no key, with `x-slite-api-key: bogus` and with `Authorization: Bearer bogus` all answer the same 401
(measured 2026-10-06):

```
{"id":"auth/unauthorized","message":"Invalid apiKey"}
```

So `sign` stamps both headers with the same value. Both are vendor documented; neither is guessed.
The credential only ever appears in `sign` (and in the hand-built headers of the `test` probe, which
`sign` does not cover).

### The probe is `GET /v1/me`

Chosen by the response body: `{email, organizationDomain, organizationName, displayName}` — the
caller's own profile and workspace names, nothing that echoes the key. `test` passes only on a 200
whose body has a string `email`; a rejection is recognised from `id: "auth/unauthorized"` in the
body, never from the status alone, and a 200 that is not a profile (an edge shell) is not a pass.

## Actions (23)

| Key | Type | Endpoint |
|---|---|---|
| `ask` | read | `GET /v1/ask` |
| `group-get` | read | `GET /v1/groups/{groupId}` |
| `group-search` | search | `GET /v1/groups` |
| `km-empty-note-list` | search | `GET /v1/knowledge-management/notes/empty` |
| `km-inactive-note-list` | search | `GET /v1/knowledge-management/notes/inactive` |
| `km-note-list` | search | `GET /v1/knowledge-management/notes` |
| `km-public-note-list` | search | `GET /v1/knowledge-management/notes/public` |
| `me-get` | read | `GET /v1/me` |
| `note-archive-set` | perform | `PUT /v1/notes/{noteId}/archived` |
| `note-children-list` | search | `GET /v1/notes/{noteId}/children` |
| `note-create` | perform | `POST /v1/notes` |
| `note-delete` | perform | `DELETE /v1/notes/{noteId}` |
| `note-flag-outdated` | perform | `PUT /v1/notes/{noteId}/flag-as-outdated` |
| `note-get` | read | `GET /v1/notes/{noteId}` |
| `note-list` | search | `GET /v1/notes` |
| `note-owner-update` | perform | `PUT /v1/notes/{noteId}/owner` |
| `note-search` | search | `GET /v1/search-notes` |
| `note-update` | perform | `PUT /v1/notes/{noteId}` |
| `note-verify` | perform | `PUT /v1/notes/{noteId}/verify` |
| `thread-get` | read | `GET /v1/threads/{threadId}` |
| `tile-update` | perform | `PUT /v1/notes/{noteId}/tiles/{tileId}` |
| `user-get` | read | `GET /v1/users/{userId}` |
| `user-search` | search | `GET /v1/users` |
`note-create` and `note-delete` are `idempotent: false` (Slite documents no idempotency key, and a
second create makes a second note). The other `perform` actions set a state and are `idempotent: true`.

### Things that bite

- **Pagination is two different things.** Notes, children, knowledge-management, users and groups
  use an opaque `cursor`; read `nextCursor` from the output and pass it back as `cursor`. Note search
  uses a zero-based `page` plus `hitsPerPage` (1-100) and reports `nbPages`.
- **`ask` can answer 202.** A slow answer is `{status: "processing", threadId, retryAfterSeconds}`,
  not a result. The action returns exactly that — without the pointer sentence Slite puts in `answer`
  — and the workflow polls `thread-get` until `status` is `completed` (or `failed` /
  `needs-approval`). `wait: true` asks Slite to hold the request instead, for up to several minutes.
- **`note-verify` needs `until` even for "never expires".** The field is required but nullable, so an
  empty form field is sent as an explicit `null`.
- **`note-flag-outdated` requires `reason`.** The operation summary says "optional reason"; the body
  schema marks it required, and the schema is what is followed.
- **`note-delete` is irreversible and removes all children.** Use `note-archive-set` when unsure.
- **Content is one of Markdown, HTML or SliteML** on create and update, and an update replaces the
  body. `note-get` returns it in the `content` field in whichever `format` was asked for.
- **Array filters are repeated keys** (`ownerIdList=a&ownerIdList=b`), OpenAPI's default style; the
  reference does not state a different one.
- **The four knowledge-management lists differ.** Only `km-note-list` and `km-public-note-list` take
  review-state and trailing-days filters; `inactive` and `empty` take owner and channel only.
- **Rate limit:** Slite documents a 429 `{"id":"rate-limit"}` but no number and no headers.

## Health checks

| Check | Kind | Result |
|---|---|---|
| `auth:api-key` | derived | the auth `test` hook above |
| `api` | dependency, unsigned, app-scoped | `GET /v1/me` with no credential. A 401 carrying Slite's JSON `{"id", "message"}` **passes**: it proves the API and its auth layer answer. Non-JSON is `down`, 5xx is `down`. |
| `service` | declared absence (`informational`) | `status.slite.com` is real ("Slite Status") but HTML only: `/summary.json`, `/index.json`, `/api/v2/*.json`, `/history.atom`, `/history.rss`, `/feed.rss` and `/feed.json` all 404, and `slite.statuspage.io` is the unclaimed-Statuspage decoy (302 to Atlassian's marketing page). Nothing machine-readable, so nothing is declared or parsed. |
| `quota` | declared absence (`informational`) | A 429 is documented, but no limit, no rate-limit header and no usage endpoint. |

## Not covered

- `POST /ask/index`, `DELETE /ask/index`, `GET /ask/index` (custom-content indexing for Ask). Their
  OpenAPI documents mark all three `deprecated: true`, and they need a `rootId` created in the Slite
  UI as a custom data source. A new integration should not build on them.
- Note content in other forms than the three the API accepts, and any endpoint not in
  `developers.slite.com/llms.txt` (checked 2026-10-06: 26 reference pages, 23 actions here plus the
  three deprecated ones above).

## Icon

`assets/icon.png` is the 180x180 PNG Slite itself serves as its `apple-touch-icon`,
`https://storage.googleapis.com/slite-cdn/slite-assets/apple-touch-icon.png` (linked from
`slite.com`'s `<head>`), unchanged. Nothing was redrawn.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
