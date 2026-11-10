# Canny

Manage product feedback on Canny — posts, boards, votes, comments, tags, users, companies, the
changelog and the status-change feed.

- **Categories** — project-management, support
- **Auth methods** — api-key
- **Actions** — 39
- **Triggers** — 9 (poll)
- **Egress allowlist** — `canny.io`
- **Website** — https://canny.io
- **API docs** — https://developers.canny.io/api-reference

## Auth

Canny's API is unusual among this pack's integrations in the same way Mandrill's is: every
endpoint is `POST https://canny.io/api/v{1,2}/<resource>/<method>` with the API key carried as
an `apiKey` field in the **JSON request body** — never a header, never a query string. Canny's
own words (Authentication section of the reference): "You can include your secret API key in a
request by adding it as a POST parameter with key apiKey." The auth `sign` hook
(`auth/api-key.ts`) parses the action's already-built JSON body, merges `apiKey` into it, and
re-serializes — the same shape Mandrill's auth uses in this pack for the identical problem.

There is no OAuth surface for third-party integrations and **no key scoping**: the one secret,
workspace-wide key can read and write everything. That absence of a "narrower" credential is
what picks the health probe below.

Every failure is `{"error": "<message>"}` on a 4xx status (live-verified 2026-08-29 with a bogus
key: `400 {"error":"invalid api key"}`). Canny gives no stable machine-readable error `code` the
way Apify or Mandrill do, so `lib/client.ts`'s `formatCannyError` carries the vendor's message
verbatim rather than inventing a taxonomy Canny doesn't have.

### Recovering the reference

`developers.canny.io/api-reference` is a client-rendered SPA with no static HTML — every path,
argument and response shape in this app was read directly out of its JS bundle
(`assets.canny.io/<hash>/5024.js`, fetched 2026-08-29), not typed by hand from what rendered in a
browser. See the header comment in `lib/client.ts` for the details.

## Actions

| Group | Actions |
|---|---|
| Boards | `board-list`, `board-get` |
| Categories | `category-list`, `category-get`, `category-create`, `category-delete` |
| Posts | `post-list`, `post-get`, `post-create`, `post-update`, `post-delete`, `post-change-status`, `post-change-category`, `post-change-board`, `post-add-tag`, `post-remove-tag`, `post-merge` |
| Votes | `vote-list`, `vote-get`, `vote-create`, `vote-delete` |
| Comments | `comment-list`, `comment-get`, `comment-create`, `comment-delete` |
| Tags | `tag-list`, `tag-get`, `tag-create` |
| Companies | `company-list`, `company-update`, `company-delete` |
| Users | `user-list`, `user-get`, `user-upsert`, `user-delete`, `user-remove-from-company` |
| Changelog | `entry-create`, `entry-list` |
| Status changes | `status-change-list` |

Notes worth knowing before using these:

- **There is no `companies/create` endpoint.** Canny's own docs: a company is created
  implicitly the first time a user is upserted (`user-upsert`) with that company's id in its
  `companies` list. `company-update` only updates a company that already exists.
- **`user-upsert` never calls the deprecated `users/find_or_create`.** Canny documents that
  endpoint with identical arguments but marked deprecated in favour of `users/create_or_update`,
  which is the only one this app calls.
- **Two v1/v2 pagination styles coexist.** `post-list`, `tag-list`, `category-list` and
  `entry-list` use `skip`/`limit` (v1); `vote-list`, `comment-list`, `company-list`, `user-list`
  and `status-change-list` use `cursor`/`limit` (v2, 1–100).
- **`post-change-status` is not idempotent.** Its required `commentValue` attaches a new
  status-change comment on every call, so retrying after a success (rather than a genuine
  failure) leaves duplicate comments on the post.
- **`post-change-category`'s `categoryID` takes the literal string `"null"` to clear a
  category** — that is Canny's own documented value, not an empty field.
- **`vote-create`, `vote-delete` and `tag-create` are marked idempotent** because Canny's own
  "Returns" text says so explicitly ("created or already exists", "deleted, or already doesn't
  exist") — the only three endpoints in this app with that guarantee stated outright.
- **Left out on purpose**: `posts/link_jira` / `unlink_jira` are real endpoints, but only usable
  once a workspace has connected Jira — a dependency this app has no way to express or verify,
  so they're omitted rather than shipped untestable. The Autopilot / Ideas / Insights /
  Opportunities / Groups surface is a separate AI feature with its own credit system, outside
  the core feedback loop (posts/boards/votes/comments/tags/users/companies) this app covers.

### Two documented response shapes that don't match Canny's own prose

Found while building this app, and followed by their **example response**, not their "Returns"
text:

- `categories/list`'s "Returns" text says the response contains "an array of tag objects" — it's
  Category objects; confirmed against the same reference page's own example JSON.
- `users/list`'s "Returns" text says "an array of users" (a bare array) — the actual response,
  per its own example, is the same `{users, hasNextPage, cursor}` envelope every other v2 list
  endpoint in this API uses.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, and is *this credential* live. (Canny publishes no rate-limit headers on any
response — verified live — so there is no `quota` check here.)

### Is the vendor up?

**Service status** — <https://status.canny.io>

Declared `unavailable`. Live-verified 2026-08-29: it is a **Pingdom Public Reports** page
(`<title>Pingdom Public Reports Overview</title>`), not a Statuspage or status.io instance — the
paths this pack's other apps read (`/api/v2/summary.json`, `/api/v2/status.json`) all 404, and
Pingdom's public-reports product has no documented JSON/RSS/Atom output at all.

### Is this credential live?

This is what the Auth `test` hook does — the only automatable signal this app has for "is Canny
working", per the `unavailable` note above.

The single auth method probes:

```
POST https://canny.io/api/v1/boards/list
{"apiKey": "..."}
```

Chosen because Canny has no scoped-token concept — every key can read and write the whole
workspace, so there is no narrower credential to prefer. Boards are non-secret metadata (id,
name, post count, url) and every workspace has at least one, so the probe both requires a live
credential and returns nothing a health check shouldn't echo.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | declared `unavailable` — status.canny.io is a Pingdom HTML page with no machine-readable feed |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-29 against Canny's own generated API reference
(`developers.canny.io/api-reference`) and live probes against `canny.io`. The reference is a
client-rendered SPA — see `lib/client.ts` for how its content was recovered.

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-post` — New Post | Poll | `post-list` | Each newly created feedback post across the workspace |
| `new-comment` — New Comment | Poll | `comment-list` | Each newly created portal comment |
| `new-vote` — New Vote | Poll | `vote-list` | Each newly cast vote |
| `new-status-change` — New Status Change | Poll | `status-change-list` | Each post status change |
| `new-tag` — New Tag | Poll | `tag-list` | Each newly created tag |
| `new-category` — New Category | Poll | `category-list` | Each newly created category |
| `new-board` — New Board | Poll (snapshot) | `board-list` | Each newly created board |
| `new-changelog-entry` — New Changelog Entry | Poll | `entry-list` (`sort: created`) | Each newly created changelog entry |
| `new-or-updated-changelog-entry` — New or Updated Changelog Entry | Poll | `entry-list` (`sort: lastSaved`) | Each new entry, and each entry saved again |

Ordering, from Canny's reference: `posts/list` is polled with `sort: newest`; `comments/list`, `votes/list`, `status_changes/list`, `tags/list` and `categories/list` are documented "Sorted by newest"; `entries/list` documents that `created` and `lastSaved` return the most recent first; `boards/list` returns every board in no particular order and is bounded, so it is polled as a snapshot. Canny offers no updated-time sort for posts, so there is no `new-or-updated-post` trigger. Each check emits only unseen items, oldest first; the first check records what exists without firing.

Not covered: `company-list` and `user-list` — the reference says companies are "ordered by created date" without a direction and gives `users/list` no order or filter at all, so a newest-first poll cannot be proven (the cursor-paginated v2 lists would need a full scan).

Trust model: poll triggers call the same endpoint, client and credentials as the wrapped action; nothing is registered with the vendor and no webhook secret is involved.

Source: [vendor docs](https://developers.canny.io/api-reference) (verified 2026-11-10).
