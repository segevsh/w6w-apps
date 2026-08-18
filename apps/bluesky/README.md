# Bluesky

Post, search, follow and read on Bluesky and any AT Protocol PDS — with
rich-text facets built correctly and sessions that refresh rather than
re-authenticate.

- **Categories** — social-media, communication
- **Auth methods** — app-password
- **Actions** — 21
- **Egress allowlist** — `bsky.social`, `public.api.bsky.app`, `bsky.app`, `*`
- **Website** — https://bsky.app
- **API docs** — https://docs.bsky.app

Built against the **lexicons** — `github.com/bluesky-social/atproto`,
`lexicons/**`, fetched 2026-08-18 — which are the normative machine-readable
schemas rather than prose docs, and probed live against `bsky.social` and
`public.api.bsky.app` the same day.

> **On the allowlist.** The AT Protocol is federated: a connection may point at
> Bluesky's PDS or at a server somebody runs themselves. `bsky.social` and
> `public.api.bsky.app` are named, and the trailing `*` is what admits a
> self-hosted one — the same shape `qdrant` and `supabase` use here, and the
> same real widening.

## Setup

### The app password, and why it must be one

Settings → Privacy and security → **App passwords**. Format
`xxxx-xxxx-xxxx-xxxx`.

The account password also works, which is exactly the problem: it grants
everything, including changing the password and minting more app passwords. An
app password can do neither and can be revoked on its own without disturbing
anything else. The field hint and the auth description both say so, and the
error on a rejected credential names it.

### The PDS

`https://bsky.social` unless you host your own. This is a real choice rather
than a formality — the protocol is designed for it, and every action follows
whatever the connection recorded.

## Creating a session is limited to about ten a day

This is the constraint the whole auth design is built around. Measured against
`bsky.social` on 2026-08-18, on a *failed* `createSession`:

```
ratelimit-limit: 10
ratelimit-policy: 10;w=86400
```

Ten per day. An integration that authenticates per run works in testing and
stops working the same afternoon, with an error that blames the password.

So the app password is exchanged **once**, at connect time, and never used
again. Everything after that is `refreshSession`, which is not limited that
way. Two details from the lexicon make this easy to get wrong:

- `refreshSession` *"Requires auth using the `refreshJwt` (not the
  `accessJwt`)"*. Signing the refresh with the access token fails.
- It returns a **new `refreshJwt`**. The one just used is dead, so a refresh
  whose result is discarded leaves the connection unrecoverable.

The exchanged credential keeps the app password so a lost refresh token can be
recovered from — and that recovery is the only thing that spends the daily
budget again. A test asserts nothing outside the exchange hook calls
`createSession` at all.

## Bluesky does not parse your text

This is the thing that silently produces wrong output, and the reason this app
builds rich text rather than passing it through.

Post a link and it renders as **plain grey text**. Mention `@alice.bsky.social`
and it is not a mention. Use a `#hashtag` and it is not a tag. Nothing errors:
the post is created, the API response looks right, and it is inert in every
client.

What makes them live is the `facets` array — explicit
`{index: {byteStart, byteEnd}, features: [...]}` annotations the *client* is
expected to compute. `post-create` detects links, mentions and tags and builds
them.

### The offsets are UTF-8 bytes, not string indices

From the lexicon's `byteSlice`: *"Start index is inclusive, end index is
exclusive. Indices are zero-indexed, counting bytes"*.

JavaScript string indices are UTF-16 code units. For pure ASCII the two agree,
which is precisely why the bug ships — it works all through testing and breaks
the first time somebody writes in French or opens with an emoji:

```
"👋 https://example.com".indexOf("https")   →  3   (UTF-16 units)
the same position in UTF-8 bytes            →  5
```

Two bytes out, and the link's highlight starts inside the URL. Every offset in
`lib/richtext.ts` is computed on the encoded bytes, and the tests assert that
each span slices back to exactly the text it marks.

A mention needs the account's DID, which the text does not contain, so handles
are resolved at post time. A handle that no longer exists is left as plain text
and reported in `unresolvedMentions` rather than failing the post — somebody
deleting their account should not break a scheduled post that mentioned them.

### Two length limits, in two different units

The lexicon puts `maxGraphemes: 300` **and** `maxLength: 3000` on `text`. Those
are different units and both apply: 300 graphemes (what a person calls a
character — a family emoji is one, and 25 bytes) and 3000 bytes. Both are
checked before the write.

## A like is a record, not a flag

The single most common AT Protocol confusion, and the app is shaped to prevent
it. Liking creates an `app.bsky.feed.like` record in **your** repository whose
subject is the post. Unliking deletes **that record**, addressed by its own
AT-URI:

```
post   at://did:plc:AUTHOR/app.bsky.feed.post/3k2a...
like   at://did:plc:YOU/app.bsky.feed.like/3k9z...
```

Passing the post's URI to a delete gets `InvalidRequest: record not found`,
which reads like the post is gone. So `like-create` returns the like's own URI
prominently, `like-delete` accepts **either** — given a post it finds your own
like through `viewer.like` and removes that — and `describeXrpc` turns that
specific error into a sentence naming the confusion. The same holds for reposts
and follows.

There is also no uniqueness constraint anywhere: liking twice makes a second
record and orphans the first. Every create action reports when one already
existed and logs a warning.

## Two hosts, and not everything public is public

A **PDS** holds your repository — where you authenticate and where writes go. An
**AppView** (`public.api.bsky.app`) holds the aggregated network view. Probed
live: `getProfile` and `getAuthorFeed` answer the public AppView without a
token, but `searchPosts` returns a **403 HTML page from an edge proxy** — not a
401, not a JSON XRPC error. Parsing it as JSON gives "unexpected token `<`",
which points nowhere near the cause.

This app therefore routes everything through the authenticated PDS, and the
client names a non-JSON body for what it is.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `post-create` | perform | Post, with links and mentions made live |
| `post-delete` | perform | Remove one of your own posts |
| `post-get` | read | Hydrate up to 25 posts by URI |
| `post-search` | search | Full-text search across the network |
| `thread-get` | read | A post with its ancestors and replies |
| `like-create` | perform | Like — writes a like record |
| `like-delete` | perform | Unlike, by like URI or by post |
| `repost-create` | perform | Repost |
| `repost-delete` | perform | Remove a repost |
| `follow-create` | perform | Follow, resolving the handle to a DID |
| `follow-delete` | perform | Unfollow |
| `profile-get` | read | Profiles for up to 25 accounts |
| `profile-search` | search | Find accounts |
| `feed-author` | read | One account's posts |
| `feed-timeline` | read | Your own following feed |
| `feed-get` | read | A custom feed generator |
| `followers-list` | read | Who follows an account |
| `follows-list` | read | Who an account follows |
| `notification-list` | read | Likes, replies, follows, mentions |
| `notification-count` | read | The unread badge number |
| `blob-upload` | perform | Upload an image for a post to embed |

### Things the actions do that the API does not

- **`post-create` gets `reply.root` right.** A reply carries `root` and
  `parent`, equal only for a direct reply to a top-level post. Given `replyTo`
  it fetches the parent's own reply reference — setting `root` to the parent is
  how a reply gets detached into a thread of its own.
- **`post-get` reports the URIs that did not come back.** Deleted, blocked and
  taken-down posts are *absent* in a 200, so reading `posts[i]` positionally
  pairs the wrong post with the wrong URI.
- **`thread-get` counts the nodes that are not posts.** The response is a
  recursive union whose `blockedPost` and `notFoundPost` arms have no `post`
  field at all, so a naive walk throws on any thread containing a blocked
  account — which is common. It flattens the tree once and returns the readable
  posts with counts of what was not.
- **`feed-author` excludes replies by default**, against the API's own
  `posts_with_replies`. It also counts reposts separately, because a repost's
  `post` belongs to the *original* author — reading `post.author.handle` and
  assuming it is the account you asked about is wrong for every one.
- **`notification-list` does not mark anything read** unless asked, and when
  asked it marks with the timestamp of the **newest notification actually
  returned** rather than `now` — `updateSeen` is a cut-off, so marking with now
  would also clear anything that arrived while the action was running.
- **`blob-upload` returns a ready-made embed** with the alt text already in it.
  Alt text lives on the embed rather than the upload, which is where it gets
  forgotten. It also refuses over 1,000,000 bytes up front with the actual
  number, and says the limit is on encoded bytes rather than dimensions.
- **`follow-create` resolves the handle at write time.** The record stores a
  DID because handles change hands; resolving from a cache would follow whoever
  holds the name today.
- **Both delete actions treat "nothing to remove" as success**, not an error —
  the desired state is already the actual state.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable, with evidence |
| `pds` | dependency | connection | context | Is this account's own server answering |
| `quota` | quota | connection | context | Requests left in the current window |

`pds` probes `describeServer` on the connection's own host, **unauthenticated**
on purpose: "is the server up" and "is the session live" are different
questions, and conflating them makes a routine token expiry look like an outage.
An HTML body is reported as *something in front of the PDS* rather than as a
failure, because that is what it means.

`quota` is a **live** probe, which is rare in this pack — Bluesky publishes real
`ratelimit-*` headers on every call (`3000;w=300` on `bsky.social`). It reads
them off the same harmless unauthenticated call.

The tighter limit — the ~10 sign-ins per day — is **deliberately not measured**,
and that is the interesting part: a failed sign-in still counts against the
counter, so an hourly probe would spend 24 of a budget of 10 and cause the exact
outage it was watching for. A check that breaks the thing it monitors is worse
than no check, so it is documented in the check's own doc comment instead, where
somebody looking at rate limits will find it.

`service` is a declared absence. `status.bsky.app` is an **UptimeRobot** page —
identifiable from its own markup — and every Statuspage-shaped path
(`/api/v2/summary.json`, `/summary.json`, `/index.json`, `/history.rss`) returns
a 404 HTML page. A working JSON route does exist; reading the page's own
JavaScript turns up:

```
pspApiPath = 'https://status.bsky.app/api/getMonitorList/zwOvMT8x16'
```

which answers 200 with 441 KB of monitor data. It is declined for three reasons,
the first decisive:

1. **The token is scraped from the page's own script.** That is a frontend
   implementation detail, not a contract — the same reason `apps/posthog`
   declines its internal status route.
2. **The monitors are the wrong granularity.** They watch individual
   `*.host.bsky.network` PDS instances. A red one says nothing about the host a
   given account lives on, and this check is app-scoped so it cannot know which
   that is.
3. **It says nothing at all about a self-hosted PDS.**

The `pds` check answers the question properly, per connection.

## Icon

`assets/icon.png` (180×180), downloaded verbatim from
`https://bsky.app/static/apple-touch-icon.png` on 2026-08-18 — Bluesky's own
web app. Checked with `_tools/icon-legibility.ts`.

## Tests

224 assertions across 28 files: one per action, one per auth method, one per
live health check, two for the libraries, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook — plus two specific to this app: nothing outside the exchange hook calls
`createSession` (which would spend the daily budget), and nothing logs post
text, handles or search queries.
