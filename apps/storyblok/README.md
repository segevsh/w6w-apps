# Storyblok

Read published and draft content, and create, update, publish and organise
stories.

- **Categories** — cms, marketing
- **Auth methods** — delivery-token, management-token
- **Actions** — 14
- **Egress allowlist** — the five regional hosts
- **Website** — https://storyblok.com
- **API docs** — https://www.storyblok.com/docs/api

Built against Storyblok's own API documentation and probed live on 2026-08-19.

## Two APIs that share nothing

This is the fact the whole app is shaped around.

| | Content Delivery | Management |
| --- | --- | --- |
| Host (EU) | `api.storyblok.com/v2/cdn` | `mapi.storyblok.com/v1` |
| Credential | space token, in a **query parameter** | personal access token, in a **header** |
| Scope | one space, read-only | every space the account can reach |
| Rate limit | 6–1000 per second | **3–6 per second** |

They are not two views of one API: different hosts, different credentials, and
rate limits two orders of magnitude apart. So this app has **two auth methods**,
and every action declares which it needs and refuses before the request when the
connection holds the other one.

That refusal matters because Storyblok's own answer to every credential problem
is `{"error":"Unauthorized"}` and nothing else — the same response for a wrong
token, a wrong credential *kind*, a `Bearer` prefix the Management API does not
use, and the one below.

## A space lives in one region, and the wrong host looks like a wrong token

| Region | Delivery | Management |
| --- | --- | --- |
| EU | `api.storyblok.com` | `mapi.storyblok.com` |
| US | `api-us.storyblok.com` | `api-us.storyblok.com` |
| Canada | `api-ca.storyblok.com` | `api-ca.storyblok.com` |
| Australia | `api-ap.storyblok.com` | `api-ap.storyblok.com` |
| China | `app.storyblokchina.cn` | `app.storyblokchina.cn` |

Outside the EU both APIs share a host and differ only by path. And a US space's
token against the EU host returns the same bare `Unauthorized` as a revoked
token — so re-issuing the token, which is what everybody tries, changes nothing.
The region is chosen once at connect time, and both `describeError` and the
`api` health check name this case explicitly.

## A bigger page is slower

Storyblok's delivery rate limit **falls as the page size rises**:

| Request | Limit |
| --- | --- |
| Cached (with `cv`) | 1000/s |
| Single story, or ≤25 per page | 50/s |
| 25–50 per page | 15/s |
| 50–75 per page | 10/s |
| 75–100 per page | 6/s |

So the arithmetic runs the opposite way to instinct:

- 25 per page × 50/s = **1,250 entries a second**
- 100 per page × 6/s = **600 entries a second**

Everybody raises `per_page` to drain a list faster, and it halves the
throughput. `story-list` defaults to 25, returns the limit and the throughput it
is working under, and says so when a caller goes above 25.

## `cv` is the difference between 50 and 1000 requests a second

Every delivery response carries a `cv` — a space-wide counter that changes when
anything is published. A request carrying a matching `cv` is served from
CloudFront; one without is redirected to acquire one and then hits the backend.

`space-get` returns it (the space's `version` field *is* the cache version), and
every delivery action both accepts it and returns the one it saw. Fetching it
once at the start of a run and threading it through is the single largest thing
a workflow can do here.

## Actions

| Action | Type | API | What it does |
| --- | --- | --- | --- |
| `story-get` | read | delivery | One story, draft or published |
| `story-list` | search | delivery | Stories, with the rate limit made visible |
| `link-list` | read | delivery | The site tree, without any content |
| `datasource-entry-list` | read | delivery | The key/value lists behind dropdowns |
| `space-get` | read | delivery | The space, and the cache version |
| `story-search` | search | management | Stories as the editor sees them |
| `story-create` | perform | management | Write a new entry |
| `story-update` | perform | management | Change one, merging by default |
| `story-publish` | perform | management | Publish or unpublish |
| `story-move` | perform | management | Move between folders — a URL change |
| `story-delete` | perform | management | Remove a story or a folder |
| `component-list` | read | management | The schemas content must satisfy |
| `asset-list` | search | management | Uploaded files |
| `space-list` | search | management | What this token actually reaches |

### Things the actions do that the API does not

- **`story-create` and `story-update` check the content's shape first.**
  Storyblok has three rules — content must be an object at the root, every
  component object needs a `component` property, and every **nested** one needs
  a `_uid`. A missing `_uid` produces an error about a field or, worse, imports
  successfully and renders as an **empty block** that only the next person to
  open the editor discovers. `validateContent` names the path of anything wrong.
- **`story-update` merges instead of replacing.** Storyblok replaces `content`
  wholesale, so a payload carrying two fields leaves a two-field story and the
  other ten are gone from the draft. This reads the story first and merges;
  `replaceContent` opts into the raw behaviour and reports exactly which fields
  it dropped.
- **`story-move` exists separately because it changes a URL.** The full slug is
  the folder path plus the story's slug, so moving a story changes its address
  — and **Storyblok leaves no redirect**. On a published story that happens
  live, with no publish step. It looks like bookkeeping and it is a deployment.
- **`story-publish` reports unpublished changes first.** Publishing copies the
  draft over the live version, including edits somebody else made since the
  workflow last looked. It also notes that per-language publishing is *ignored*
  unless the space enables it — so a workflow that thinks it published only
  German has published everything. And Storyblok's publish endpoint is a **GET**,
  which is worth knowing before a retry policy republishes something.
- **`story-delete` refuses a folder without an acknowledgement**, because
  deleting a folder deletes everything in it — a hundred pages removed by asking
  to remove one. It also notes that references are stored as **uuids**, so a
  deleted story's uuid stays in every story that referenced it, resolving to an
  empty block rather than an error.
- **`story-search` answers what the delivery API cannot.** The delivery API has
  a draft and a published document and no opinion about the gap; the Management
  API knows which stories are **live and edited since**, and which were never
  published at all. Both are ordinary editorial questions with no delivery-side
  answer.
- **`link-list` is the cheap way to ask about structure.** One small object per
  story — id, slug, parent, folder, published — with no content. Navigation
  menus and sitemaps are usually built by listing *stories*, which drags every
  story's full content across to read one field from each. It also always
  paginates, because the unpaginated response is an object keyed by id rather
  than an array.
- **`datasource-entry-list` returns a lookup, not an array.** A story stores
  `de`; the label `Germany` lives in a datasource. It also notes that a missing
  translation in a dimension falls back **silently**, so a half-translated
  datasource looks complete.
- **`component-list` reports required fields and says they are not enforced.**
  Storyblok marks them for the editor; the API accepts a story without them. It
  also separates content types (`is_root`) from nestable blocks, since a story
  whose root component is not a content type cannot be opened properly.
- **`space-list` reports the blast radius.** A personal access token defaults to
  *all spaces* its owner has, so this is the action that answers what a
  credential really reaches — and it derives the Management API's rate limit
  from the plan, since Starter allows 3 requests a second and everything above 6.
- **`asset-list` flags private assets and missing alt text.** A private asset's
  URL does not load with a public delivery token, so handing those URLs to a
  browser produces broken images for exactly those files.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable — no feed exists |
| `api` | dependency | connection | signed | Is *this* connection's API answering |

### `api`

Probes whichever API the connection uses — the CDN for a delivery token, the
space endpoint for a management one — in the region the connection names.
Probing the other would report an outage for an API this connection never calls.

It has to be signed, since Storyblok has no unauthenticated endpoint, so it
cannot fully separate an outage from a revoked token. What it *can* do is name
the third possibility: the space is in another region, which returns the
identical response and which no amount of re-issuing the token fixes.

For a delivery connection the same request also returns the space's `version`,
so checking health and learning the cache version that makes the next hour of
requests twenty times cheaper is one call.

### `service` — a measured absence

`status.storyblok.com` serves a meta-refresh to `uptime.storyblok.com`, which
returns HTML. Probed on 2026-08-19: `/api/v2/summary.json` on both hosts returns
the page or a 404, so there is no Statuspage feed behind it.

A feed would also be the wrong instrument. The delivery API is a CloudFront
distribution serving cached JSON and survives outages of the system that fills
it; the Management API is the application. They fail separately, and a
connection only cares about the one its credential uses — which is what `api`
probes.

## Icon

`assets/icon.svg`, downloaded verbatim from `storyblok.com/favicon.svg` on
2026-08-19 (md5 `737fdc740e5d7dec0947e9be5a7434b4`). Checked in both themes with
`_tools/icon-legibility.ts`.

## Tests

311 assertions across 20 files: one per action, one per auth method, one for the
health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: **every action asserts which credential
kind it needs**, both content-writing actions **validate the content shape**, and
`story-delete` gates both confirmation and folder deletion.
