# Mastodon

Post, search, follow and read on any Mastodon instance — the fediverse, where
every server is its own API with its own limits and rules.

- **Categories** — social-media, communication
- **Auth methods** — access-token
- **Actions** — 18
- **Egress allowlist** — `*`
- **Website** — https://joinmastodon.org
- **API docs** — https://docs.joinmastodon.org/api/

Verified live against `mastodon.social` (v4.7.0-rc.1) on 2026-08-18.

> **On the allowlist.** Any host can be a Mastodon instance, so there is no
> useful list to name. This is the widest allowlist in the pack, and it is what
> "federated" costs.

## Every server is a different API

This is the property everything else follows from. Mastodon is software
thousands of people run, and a connection is a connection to **one instance**.
They share a shape and differ in nearly every detail that matters:

- **The character limit is per instance.** 500 is the default and a great many
  servers raise it. This app reads
  `/api/v2/instance` → `configuration.statuses.max_characters` at connect time
  and checks against *that* — so a post refused here would genuinely have been
  refused there.
- **So is the media limit**, the poll option count, and the accepted MIME types.
- **So is the version.** An endpoint added in 4.3 simply 404s on a server still
  on 4.1, and the error says nothing about versions.
- **So are the rules.** Automated posting is welcome on some instances and
  grounds for suspension on others. `instance-get` returns them, and reading
  them before pointing a workflow at somebody else's server is the difference
  between a bot and a suspended account.

## There is no central OAuth client, and there cannot be

OAuth on Mastodon means registering an application **on each instance** —
`POST /api/v1/apps`, which works unauthenticated, verified live — producing a
`client_id` valid on that server alone. A single OAuth configuration for
"Mastodon" therefore cannot exist.

What every instance does offer is a personal access token: Preferences →
Development → New application. Scopes are chosen there and **cannot be widened
afterwards** — a token missing one returns 403 on that endpoint and works
everywhere else, and a new application is the only fix.

## Paging lives in the `Link` header

The body is a bare array with no cursor in it. `Link: <…>; rel="next"` carries
the ids, and the client parses them out.

The three id parameters are **not interchangeable**:

| | Direction | Which end |
| --- | --- | --- |
| `max_id` | older | ordinary backward paging |
| `since_id` | newer | the **newest**, dropping the middle if more arrived than the limit |
| `min_id` | newer | the **oldest**, so repeated calls walk forward without gaps |

For "everything since last run", `min_id` is right and `since_id` silently
loses posts. **This app does not expose `since_id` at all** — there is no use
for it here that is not a bug — and a test asserts no action sends it.

## Counting characters the way Mastodon does

Two rules make a post that looks too long fit: every URL counts as **23
characters** whatever its length, and a mention costs only `@username`, not the
`@domain` after it. `status-post` applies both, so a post of twenty links is
accepted rather than refused against a naive `.length`.

## `Idempotency-Key` is real deduplication

Mastodon deduplicates posts on that header for a few minutes — a genuine
advantage over networks that have no such thing. Like every such mechanism it
only helps if the value is identical across attempts, so the key is **derived
from the post's own content**: same payload, same key, deduplicated. A fresh
UUID would be carried by the retry and both posts would appear.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `status-post` | perform | Post, checked against this instance's limit |
| `status-get` | read | One status, with the HTML stripped |
| `status-delete` | perform | Remove a post, and recover what it said |
| `status-search` | search | Search this instance's view — or resolve a URL |
| `status-context` | read | The thread around a post |
| `status-favourite` | perform | Favourite |
| `status-unfavourite` | perform | Un-favourite |
| `status-boost` | perform | Boost |
| `status-unboost` | perform | Un-boost |
| `account-lookup` | read | Resolve a handle to an account |
| `account-statuses` | read | One account's posts |
| `account-follow` | perform | Follow, or request to |
| `account-unfollow` | perform | Unfollow, or withdraw a request |
| `timeline-home` | read | What the account follows |
| `timeline-public` | read | The public firehose, or one hashtag |
| `notification-list` | read | Mentions, follows, boosts, favourites |
| `media-upload` | perform | Upload an attachment |
| `instance-get` | read | This server's limits and rules |

### Things the actions do that the API does not

- **`content` is HTML, and every read action returns the stripped text
  alongside.** It arrives as `<p>hello <a href="#">#tag</a></p>`, so a workflow
  matching on it, or forwarding it to a chat integration, otherwise gets markup.
- **Favourites and boosts are verbs, not records.** Mastodon returns the
  *status* with `favourited: true`, so the id is the status's both ways round —
  and `changed` says whether the call actually did anything, which a
  record-based network cannot answer. This is the exact opposite of the AT
  Protocol shape in `apps/bluesky`, and the pack now has both.
- **`account-follow` reports `requested` separately.** Following a locked
  account is a *request*: `following` stays false until they approve, and a
  workflow reading only that would retry forever.
- **`account-statuses` excludes replies by default**, against Mastodon's own
  default — a chatty account's feed is mostly replies, which is rarely what
  "watch this account" means. It also counts boosts, because a boost's `account`
  is the *original author's*, not the account you asked about.
- **`notification-list` does not pretend there is a read flag.** Mastodon has
  none — it has a single marker per timeline — so "what is new" is a paging
  question, and this returns the high-water mark rather than marking anything.
  It also counts the notifications carrying **no status at all**, which is what
  breaks a naive `notification.status.content` walk on the most ordinary
  notification there is.
- **`status-search` explains what it searched.** There is no global index: an
  instance holds its own users' posts plus whatever federated in. Full-text
  search is usually off, and authors must opt in even where it is on — so an
  empty result means the feature is absent, the author opted out, or the post is
  not here, three different things. Pasting a URL **resolves** rather than
  searches, which is the reliable way to reach something the server has not seen.
- **`media-upload` reports `processing`.** v2 returns 202 with an id while the
  server is still transcoding, and attaching an id that is not ready fails. It
  also warns when there is no alt text, which many instances' rules require.
- **`status-delete` returns what the post said.** Mastodon hands back the source
  text so a client can offer delete-and-redraft, which makes this the only way
  to recover a post's content after removing it.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable — there is no vendor |
| `instance` | dependency | connection | context | Is this server up, and have its limits moved |
| `quota` | quota | connection | context | Requests left in the current window |

### `service` — a different shape of absence

Most declared absences in this pack say *the vendor publishes nothing
machine-readable*. This one says **there is no vendor**.

There is no Mastodon service to have a status. `joinmastodon.org` is a directory
maintained by the non-profit that develops the software; it publishes no status
feed because it does not run the network. Individual large instances do publish
status pages, but at addresses only their operators know, with no registry and
no convention for finding the one belonging to a given server.

### `instance`

Probes `/api/v2/instance` **unauthenticated**, so a revoked token does not read
as an outage. It also compares the server's current character limit against what
was recorded at connect time — a limit change is an admin editing a config file
and announces itself nowhere, and a *lowered* one makes posts start failing with
a 422 this app would otherwise have predicted wrongly.

### `quota`

A **live** probe. Mastodon publishes real headers:

```
x-ratelimit-limit: 300
x-ratelimit-remaining: 298
x-ratelimit-reset: 2026-08-18T23:20:00.701368Z
```

Note the reset is an **ISO 8601 timestamp**, not the epoch seconds most APIs
use — treating it as a number gives `NaN`. And the limit is the instance's: 300
per five minutes is `mastodon.social`'s, while a hobby server on a small box may
allow a fraction of that. There is no way to know except by reading what it
returns, which is what makes this worth checking per connection.

## Icon

`assets/icon.svg`, downloaded verbatim from
`https://joinmastodon.org/logos/logo-purple.svg` on 2026-08-18 — the project's
own logo page. Checked with `_tools/icon-legibility.ts`.

## Tests

162 assertions across 24 files: one per action, one per auth method, one per
live health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus two specific to this app: **no action sends `since_id`**, and
`status-post` **derives** its idempotency key rather than generating one — a
generated key is a key a retry cannot match.
