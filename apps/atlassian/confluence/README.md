# Confluence

Read and write Confluence Cloud pages, spaces, blog posts, comments and tasks.

- **Categories** — documents, productivity
- **Auth methods** — api-token, oauth2
- **Actions** — 22
- **Egress allowlist** — `*.atlassian.net`, `api.atlassian.com`
- **Website** — https://www.atlassian.com/software/confluence
- **API docs** — https://developer.atlassian.com/cloud/confluence/rest/v2/ ·
  schema: https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json

## Setup

### Email & API Token

1. Create a token at **id.atlassian.com → Security → Create and manage API
   tokens**.
2. Enter your **Site** — just the name from `acme.atlassian.net`, not the full
   URL — plus the account **email** and the token.
3. It is sent as HTTP Basic with the email as the username and the token as the
   password. Atlassian disabled account passwords for the API, so the token is
   the only thing that works here.

### OAuth (Sign in with Atlassian)

Requires an Atlassian OAuth 2.0 (3LO) app registered on this w6w installation
(`client_id` / `client_secret` / `redirect_uri` live on the w6w server, not in
this package). The flow uses:

- Authorize — `https://auth.atlassian.com/authorize` (PKCE, with
  `audience=api.atlassian.com` and `prompt=consent`)
- Token / refresh — `https://auth.atlassian.com/oauth/token`
- Scopes — `read:confluence-content.all`, `write:confluence-content`,
  `read:confluence-space.summary`, `read:confluence-user`, **`offline_access`**

`offline_access` is load-bearing: without it Atlassian issues no refresh token,
the connection dies after an hour, and scheduled runs stop working.

## Actions

| Key | Type | Description |
|---|---|---|
| `page-list` | read | List pages, filtered by space, title or status |
| `page-get` | read | Get one page, with body, labels or version history |
| `page-create` | perform | Create a page in a space |
| `page-update` | perform | Change a page's title, body, status or parent |
| `page-delete` | perform | Trash a page, or purge one already trashed |
| `page-child-list` | read | List the pages directly beneath one page |
| `page-attachment-list` | read | List the files attached to a page |
| `attachment-get` | read | Get one attachment's metadata and download link |
| `page-label-list` | read | List the labels on a page |
| `space-list` | read | List spaces, filtered by key, type or status |
| `space-get` | read | Get one space by numeric ID |
| `space-create` | perform | Create a space, optionally private |
| `space-page-list` | read | List a space's pages, optionally root level only |
| `blogpost-list` | read | List blog posts |
| `blogpost-get` | read | Get one blog post |
| `blogpost-create` | perform | Publish a blog post in a space |
| `page-comment-list` | read | List the footer comments on a page |
| `comment-create` | perform | Comment on a page or blog post, or reply |
| `comment-delete` | perform | Remove a footer comment |
| `task-list` | read | List inline tasks, by status, space or assignee |
| `content-search` | search | Search content with a CQL query |
| `user-current` | read | Get the account this connection acts as |

### v2 is a different API from v1 — and two calls still need v1

Confluence Cloud REST **v2** (`/wiki/api/v2`) is not a revision of v1: different
paths, cursor pagination instead of offsets, and numeric IDs where v1 used
space keys and content keys. This app is v2 throughout, with exactly two
exceptions, each documented on the action that makes it:

- **`content-search`** — v2 publishes 151 paths and **not one is a search**. CQL
  lives only on v1, and "find the pages that mention X, modified since Y" is
  the single most useful thing a workflow does with a wiki, so dropping it was
  not an option.
- **`user-current`** — v2's only user endpoint is the bulk lookup
  `POST /users-bulk`, which resolves account IDs you already have. It cannot
  answer "who am I".

A test asserts that exactly those two actions reach for v1, so the list cannot
quietly grow.

### Two hosts, one connection model

Same split as the `jira` app in this pack, because it is the same Atlassian
account and the same site addressing:

- **API token** connections talk to the site host, `acme.atlassian.net`. The
  site name is an auth field.
- **OAuth** connections talk to the gateway,
  `api.atlassian.com/ex/confluence/{cloudId}`. The cloud id does not exist
  until a token does, so `afterConnect` resolves it from
  `/oauth/token/accessible-resources` and records it on the connection.

`*.atlassian.net` is on the egress allowlist because no manifest can enumerate
customer sites. Only the **first** accessible site is adopted for an OAuth
connection — an app granted several needs one Connection per site, which is the
honest model given a Connection carries a single cloud id.

### Updating a page is optimistically locked

`PUT /pages/{id}` requires **all five** of `id`, `status`, `title`, `body` and
`version`, and `version.number` must be exactly the current version plus one or
the write is rejected. That makes a naive "just change the title" action
impossible to use.

So when `versionNumber` is blank, `page-update` reads the page first
(`include-version=true`), increments, and uses the same read to fill in
whichever of title/body the caller left alone — the endpoint is a full replace,
so omitting either would blank it. That costs one extra GET and is **not
race-proof**: two concurrent updates still collide, and Confluence rejecting
the second is the correct outcome. Pass `versionNumber` explicitly to control it
yourself.

### Pagination

v2 answers `{ results: [...], _links: { next, base } }`, where `next` is "the
relative URL for the next set of results, using a cursor query parameter" and
is **absent when there is no more data** — a clean termination signal. The
cursor is extracted from that URL rather than the URL being followed, because
the relative path is written for the site host and an OAuth connection talks to
the gateway instead; re-issuing the original request with the cursor is correct
for both. `content-search` is the exception: v1 pages with `start`/`limit`
offsets, so it does not use the shared pager.

### IDs, not keys

v2 addresses spaces by **numeric ID**, while the Confluence UI and v1 use the
space *key* (`ENG`). `space-list` filters by key and returns the ID, which is
how you bridge the two — every page action wants the ID.

### Body format

Write actions take a `{representation, value}` object and default to
**`storage`**, Confluence's own XHTML format — the one the read endpoints hand
back, so a read-edit-write round trip does not silently change format. `wiki`
and `atlas_doc_format` are available where Confluence accepts them. Read
actions that can return a body default to `storage` too rather than omitting it.

### Footer comments and inline comments are different things

Confluence keeps the page's bottom-of-page discussion thread (**footer**) and
comments anchored to a text selection (**inline**) at separate endpoints. This
app reads and writes the footer thread — what a workflow usually means by "the
page's comments". Inline comments need their anchor context to make sense, so
they are not silently merged in.

### List actions declare no `output` fields

Nine list actions unwrap Confluence's `results` envelope and return the bare
array, so there are no top-level fields for an `output` declaration to name.
The pack auditor warns about them; the warning is the accurate signal, and
inventing a wrapper key the action does not return would be worse.

### Deliberately out of scope

- **Attachment upload and download.** v2 lists and describes attachments, but
  the bytes move over multipart upload and a separate download URL; streaming
  binary through an action's JSON result is the wrong shape.
- **Label writes.** v2 reads labels but publishes no page-label write endpoint
  (still a v1 call), so this app reads them and does not pretend otherwise.
- **Content properties, custom content, whiteboards, databases, folders,
  classification levels.** Each is a coherent v2 surface of its own.
- **Space permissions and role assignments** — administration, not content
  automation, and each needs a scope that would widen what every Connection has
  to grant.

## Health check

Four questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this site* reachable, is *this credential* live, and do
we have *quota* left.

### Is the vendor up?

**Atlassian Statuspage**, verified 2026-08-18:

```
GET https://confluence.status.atlassian.com/api/v2/summary.json -> 200, 5,490 bytes
    {"page":{"id":"4g2my7tbhjsq","name":"Confluence",...},
     "status":{"indicator":"none","description":"All Systems Operational"}}
GET https://confluence.status.atlassian.com/api/v2/status.json  -> 200, 230 bytes
```

Two real endpoints returning distinct documents, not one catch-all answering
every path. Atlassian runs **one Statuspage per product** —
`status.atlassian.com` is the cross-product rollup — so this app probes the
Confluence page and the `jira` app probes its own. A Jira incident is not a
Confluence incident.

### Is this site reachable?

`GET /status` against the connection's own Atlassian site, unauthenticated —
Atlassian Cloud's liveness endpoint, which returns a `state` of `RUNNING`,
`MAINTENANCE`, `ERROR` and so on. This separates "the site is suspended,
renamed or gone" from "the credential expired", which the derived `auth:*`
check already reports and which is a very different fix.

An OAuth connection has no site URL until its first token resolves one, so
before that the check reports `unknown` with a reason rather than `down`.

### Is this credential live?

Both auth methods' `test` hooks:

- `api-token` — `GET /wiki/rest/api/user/current`, v1's whoami (v2 has no
  equivalent). 401 and 403 get different messages, because a rejected token and
  an account that cannot reach Confluence on that site are different fixes.
- `oauth2` — `GET /oauth/token/accessible-resources`. A token that reaches no
  site is reported as a failure rather than a working connection with nothing
  behind it.

### Do we have quota left?

**Declared unavailable.** Atlassian applies dynamic, cost-based limits with no
published headroom endpoint; `X-RateLimit-*` headers appear on some endpoints
but not reliably, so there is nothing a probe can read for a stable answer. A
429 carries `Retry-After`. Declared rather than omitted, at
`severity: "informational"` so the permanent `unknown` never pins the app's
verdict.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET confluence.status.atlassian.com/api/v2/summary.json` |
| `site` | dependency | connection | context | degraded | 120s | unauthenticated `GET /status` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no published headroom |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.svg` — the Confluence mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/confluence.svg>,
downloaded 2026-08-18.

- **731 bytes**, md5 `f7d796d02537535bbaf573dade9fccec`,
  `<title>Confluence</title>`, `viewBox="0 0 24 24"`
- inked with `#172B4D`, the hex simple-icons records for this brand (sourced
  from Atlassian's own press kit). Atlassian's live mark is a blue gradient and
  the `jira` app in this pack carries that treatment, but no clean vendor SVG
  of the Confluence gradient was reachable — `wac-cdn.atlassian.com`'s favicon
  path 404s to an HTML page and the press-kit asset is a PNG — so the flat
  recorded colour is used rather than a hand-drawn approximation
- `assets/icon.dark.svg` is the same artwork reversed to white by
  `_tools/icon-legibility.ts` — `#172B4D` scores ΔE 17.74 / contrast 1.12
  against the dark tile `#1f232c`, i.e. it disappears there
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Atlassian's Confluence
Cloud REST API v2 OpenAPI document (151 paths), the v1 document alongside it,
and a live probe of `confluence.status.atlassian.com`. The connection model and
health checks follow this pack's `jira` app. Status surfaces move; re-check if
a probe starts failing for everyone at once.
