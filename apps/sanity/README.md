# Sanity

Query and mutate a Sanity Content Lake from a workflow — GROQ queries,
transactional document mutations, publishing, revision history and dataset
management.

- **Categories** — cms, databases, developer-tools
- **Auth methods** — token
- **Actions** — 11
- **Egress allowlist** — `api.sanity.io`, `*.api.sanity.io`, `*.apicdn.sanity.io`
- **Website** — https://www.sanity.io
- **API docs** — https://www.sanity.io/docs/http-reference

Paths and behaviour come from Sanity's own reference documentation
(`http-reference/mutation`, `content-lake/api-cdn`,
`content-lake/mutation-patterns`, read 2026-08-18); the host layout was verified
against the live API the same day.

## Setup

1. sanity.io/manage → your project → **API → Tokens** → create one. An **Editor**
   token is the usual choice; a **Viewer** token connects perfectly and then
   fails every mutation.
2. The **project ID** is eight characters and is part of every data request's
   *hostname*, not its path.
3. The **dataset** is usually `production`, often with `development` beside it.

The connection test reads the project from the management API rather than
running a query: it needs no dataset and no GROQ, and it distinguishes "this
token is dead" from "this token is for another project" — which would otherwise
show up as a query that mysteriously returns nothing.

## Drafts are separate documents

This is the single fact that explains most Sanity surprises. An unpublished edit
is stored as **its own document**, whose `_id` is the published id with a
`drafts.` prefix. `article-1` and `drafts.article-1` are two documents.

So:

| What you do | What actually happens |
|---|---|
| `*[_type == "article"]` | Returns **both** the published article and its draft |
| Delete `article-1` | The draft survives, and reappears in the Studio as an edit of a document that no longer exists |
| "Publish" | Promote one document onto the other and remove the first |

Each has an answer in this app: `document-query` filters drafts out by default,
`document-delete` offers to remove both in one transaction, and publishing goes
through Sanity's **Actions API** rather than a hand-rolled replace-plus-delete —
which is what most integrations write, and which quietly loses the revision
check and any release scheduling.

## Reads go to the live API, not the CDN

Sanity offers two read hosts:

| Host | Behaviour |
|---|---|
| `{projectId}.api.sanity.io` | Uncached. Always the freshest content |
| `{projectId}.apicdn.sanity.io` | Cached, fast, cheap |

Sanity's guidance is explicit about which an integration should use: *"When
building integrations with Sanity or responding to webhooks, we recommend using
the API to capture the latest saved content."* A workflow woken by a webhook and
then reading through the CDN can read the content as it was **before** the change
that woke it.

The failure mode is what makes the default matter: **"If Sanity's Content Lake is
unavailable, the API CDN will return the last cached content for up to two
hours."** A workflow reading through the CDN keeps succeeding through an outage,
on stale data, with nothing to indicate it.

So the CDN is an explicit per-connection opt-in, for the case it is actually for
— high-volume reads of content that need not be current. Two consequences are
handled for you:

- **Writes always go to the live host.** The CDN caches `/data/query` and
  `/graphql` and rejects every other POST, so a mutation on a CDN connection is
  routed around it. A test asserts this.
- **The `dataset` health check always reads the live host.** A check that could
  be answered from a two-hour-old cache is not a check.

## Query-based mutations stop silently at 10,000 documents

Sanity's own words: a mutation on `*[_type == "article"]` *"is in fact executed
as if the query were written `*[_type == "article"][0..10000]`"*. No error, no
warning — just part of the job done, which is worse than failing.

Both `document-patch` and `document-delete` say so where a query goes in, and
both expose Sanity's native **dry run**, which validates and reports without
applying. That is the only way to see a query mutation's blast radius before
committing to it, and it is worth the extra call every time.

For anything larger, paginate by `_id`: `*[_type == "article" && _id > $lastId]`
works because GROQ sorts by ascending `_id` by default, and each transaction
returns the ids it touched.

## Actions

| Key | Type | Description |
|---|---|---|
| `document-query` | search | Run a GROQ query (drafts filtered out by default) |
| `document-get` | read | Fetch documents directly by id |
| `document-history` | read | A document as of a moment or a revision |
| `document-export` | read | A whole dataset as NDJSON |
| `document-create` | perform | Create, create-if-missing, or replace |
| `document-patch` | perform | Change part of a document, by id or query |
| `document-delete` | perform | Delete by id or query, with the draft |
| `document-publish` | perform | Promote a draft, via the Actions API |
| `document-unpublish` | perform | Back to a draft — the content survives |
| `project-list` | read | Projects this token can see |
| `dataset-list` | read | Datasets in this project |

## Things worth knowing

### Three ways to create, and they differ in exactly one thing

| Mode | If the id already exists |
|---|---|
| `create` | **Fails.** Right when a duplicate means something went wrong |
| `createIfNotExists` | Silently does nothing. Right for a re-runnable import |
| `createOrReplace` | **Replaces the whole document** |

`createOrReplace` is not a merge: any field absent from what you send is
**deleted**. It is the fastest way to lose data if it gets picked because the
name sounded safe, so `document-patch` is what changes part of a document.

`_id` is optional, and its rules are unusual — omitted, Sanity generates one;
**ending in a dot** (`"article."`), it is used as a *prefix* for a generated one,
which is how you get grouped-but-unique ids.

### Patch operations run in a fixed order

**set → setIfMissing → unset → inc → dec → insert**, whatever order you write
them in. That matters when they interact: a `setIfMissing` cannot see a value
that a `set` in the same patch is about to write.

`inc` and `dec` are also why `document-patch` declares itself **not** idempotent
— a retried patch carrying an increment counts twice. `ifRevisionId` is the fix:
an optional optimistic lock that fails the write if the document changed since
the revision you read. It is optional in Sanity (unlike, say, this pack's
`gusto`, where the equivalent is mandatory), so it is worth setting deliberately
whenever anything else might be editing the same document.

### `purge` is not a tidier delete

An ordinary delete leaves the document's transaction history in the Content
Lake, which is what makes it inspectable and — within the retention window —
recoverable. **`purge` removes every transaction ever recorded for that
document, immediately.** It is a compliance tool for an erasure request, and it
is what makes a deletion genuinely irreversible, so it has its own confirmation
separate from the query-delete one.

### The API version is a date, and pinning it is the point

Sanity treats the version as a contract: a pinned date keeps behaving the way it
did when it was pinned. This app pins `v2025-02-19`. Sanity also serves `vX` —
the *unstable* channel that tracks whatever is newest, which is the opposite of
what an integration wants.

### The export includes drafts

`document-export` returns every document in the dataset as NDJSON — one document
per line, no enclosing array, so parsing the body as JSON fails on the second
line. Every `drafts.` document comes along, which is correct for a backup and
surprising for anything treating the output as "the content", so it can be
filtered.

It is a bulk read, not a query: no filtering beyond a type list and no
projection. For "find me the published articles", `document-query` is one small
response instead of a whole dataset over the wire.

### Datasets share a schema and share nothing else

`production` and `development` live in one project, use one Studio and one
schema, and have **no documents in common**. Pointing a workflow at the wrong
one returns an eerily empty result rather than an error — which is exactly what
the `dataset` health check exists to catch.

### The Studio's schema is not enforced by the API

Sanity's schema lives in the Studio codebase, not in the Content Lake. A
document written or published through this app can be one the Studio would have
refused — missing required fields and all. Anything that matters has to be
checked before the call.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Sanity up? |
| `dataset` | dependency | Can **this connection** actually read its dataset? |

`service` reads Sanity's Statuspage (`status.sanity.io` redirects to
`www.sanity-status.com`, which this check calls directly) and watches the
Content Lake, API, CDN and asset components. Studio and the management dashboard
are excluded: they are where humans work, and no action here touches them.

`dataset` is the one that catches what the others cannot. Three of a Sanity
connection's four fields are not credentials, and each fails invisibly:

- a **project id** that does not exist answers from a hostname that looks valid;
- a mistyped **dataset** answers `404 Dataset not found` — measured 2026-08-18,
  `aaaaaaaa.api.sanity.io` returns exactly that;
- a token from **another project** authenticates and then finds nothing.

So it runs `*[0...0]` — a query that matches every document and returns none of
them — against the connection's own project and dataset, on the live host. One
query, no bandwidth, and it fails for precisely those reasons.

## What this app deliberately does not do

- **Asset uploads.** They take raw bytes in the request body, which a sandbox
  has no way to produce.
- **Listeners and the Live Content API.** Long-lived streaming connections, not
  request/response calls.
- **GraphQL.** A second interface over the same content that has to be deployed
  per dataset; GROQ needs no deploy step.
- **Schema deployment and Studio management.** The schema lives in the Studio
  codebase, so changing it is a deploy rather than an API call.
