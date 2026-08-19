# Gerrit

Search and review changes, vote on labels, submit or abandon, and inspect
projects.

- **Categories** — version-control, developer-tools
- **Auth methods** — http-password
- **Actions** — 11
- **Egress allowlist** — `*`
- **Website** — https://gerritcodereview.com
- **API docs** — https://gerrit-review.googlesource.com/Documentation/rest-api.html

Built against a live Gerrit 3.14 at `gerrit-review.googlesource.com` and
Gerrit's own documentation, probed on 2026-08-19.

> **On the allowlist.** Gerrit is Apache-licensed software organisations run
> themselves, so an instance can be at any address. Same reasoning as
> `apps/mastodon` and `apps/nocodb`.

## Every JSON response starts with `)]}'`

Verified on every endpoint, including the ones that return a bare string:

```
GET /config/server/version
)]}'
"3.14.2-622-ge70cefe8a2"
```

It is a deliberate XSSI defence — those five characters make the body invalid
JavaScript, so a `<script src>` pointed at a Gerrit endpoint cannot execute it
and read the contents. Gerrit's documentation calls it the magic prefix.

The consequence for a client is total: **`JSON.parse` fails on every single
response** with a syntax error at position 0 that names nothing.
`stripMagicPrefix` is the first thing this client does with a body, and an
`index.ts` test asserts no action parses a response itself.

Its absence is also a signal. `health/instance.ts` treats a body *without* the
prefix as a proxy or an SSO login page answering for Gerrit, which is more
precise than any status code.

## Timestamps are not ISO 8601, and parsing them naively is wrong by hours

Gerrit returns `"2026-08-19 04:13:33.000000000"` — a space rather than a `T`,
nanosecond precision, and **no timezone**. They are UTC by convention.

`Date.parse` on that string reads it as *local* time, so a workflow computing
how long a change has been open is wrong by the runtime's offset — silently,
and differently depending on where it runs. `parseTimestamp` reads them as UTC
explicitly, and every age in this app comes from it.

## Everything uses `/a/`, except the health check

Gerrit serves anonymous reads at the bare path and authenticated ones under
`/a/`. So a client that omits `/a/` and has a broken credential is **not
refused** — it gets whatever the instance shows the public, which on an
open-source Gerrit is nearly everything.

This app always uses `/a/`, so a failing credential fails. The single exception
is `health/instance.ts`, which wants exactly the opposite: an unauthenticated
probe answers "is Gerrit there" without confusing it with "is the password still
valid". A test asserts both halves of that arrangement.

## A change has four identifiers, and one of them is a trap

| | Example | Unique? |
| --- | --- | --- |
| `_number` | `620421` | yes, per host — what the UI shows |
| `id` | `gerrit~620421` | yes |
| `triplet_id` | `project~branch~Change-Id` | yes, and unwieldy |
| `change_id` | `I7fa2d25…` | **no** |

The Change-Id from the commit message is the tempting one and the wrong one:
the same value exists on every branch a change was cherry-picked to, and Gerrit
answers "multiple changes found" rather than choosing. `assertChangeId` refuses
it with that explanation before any request.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `change-search` | search | Gerrit's query language, passed through |
| `change-get` | read | One change, and what decides whether it merges |
| `change-review` | perform | Vote on a label and leave a message |
| `change-submit` | perform | Merge it |
| `change-abandon` | perform | Close it without merging, or reopen it |
| `change-reviewer-add` | perform | Ask somebody to look, or CC them |
| `change-comments-list` | read | Inline comments, and which are unresolved |
| `change-files-list` | read | What the change touches |
| `project-list` | search | The repositories |
| `account-search` | search | Resolve people to ids Gerrit accepts |
| `server-info-get` | read | What this Gerrit is, and how it is configured |

### Things the actions do that the API does not

- **`change-search` asks for the options its outputs need.** A change comes back
  as a *skeleton*: no labels, no reviewers, no revision, until `o=` options
  request them. A workflow reading `change.labels` without asking for `LABELS`
  gets `undefined` and concludes nobody has voted. `MERGEABLE` is offered
  separately because it makes Gerrit attempt a merge for every result.
  It also notices **`_more_changes`**, which Gerrit sets on the *last* change of
  a truncated page rather than at the top level — easy to miss, and easy to act
  on as though it were the whole set.
- **The app never treats votes as a sum.** Gerrit's Code-Review scale is not
  additive: `-2` blocks submission outright and only its author or an
  administrator can clear it, while three `+1`s are not an approval.
  `change-get` reports blocking and approving labels separately, and
  `change-review` says what the value it is sending means.
- **`change-review` says which label a bot should use.** `Verified +1` is what
  CI is for; `Code-Review +2` is a person taking responsibility for the code,
  and the action warns when automation grants it. It also reports **which
  revision** the vote landed on, since a vote attaches to one patch set and
  `current` races with anybody pushing another.
- **`change-submit` reports the dependency chain.** Gerrit cannot merge a change
  without its unmerged ancestors, so "submit 620421" can put four commits on the
  branch. The action refuses to take a chain without an explicit acknowledgement,
  and checks `submittable` first so the refusal names the unmet requirement
  rather than arriving as a 409.
- **`change-get` explains an unsubmittable change with no blocking vote.** On
  many projects an unresolved comment thread is itself a submit requirement, and
  nothing in the label state says so.
- **Two endpoints return objects keyed by path, not arrays.** Comments and files
  both do, and both include **`/COMMIT_MSG`** — Gerrit treats the commit message
  as a reviewable file, so it has comments and appears in the file list under a
  path that does not exist in the repository. `change-files-list` excludes it
  from the count and reports it separately. That action also gives a modified
  file the status `M` itself, because **Gerrit omits the letter for a
  modification** and a filter on `"M"` otherwise matches nothing.
- **`change-reviewer-add` surfaces an error returned inside a 200.** An
  unresolvable name comes back in a successful response rather than as a
  failure. It also notes when a name **expanded to a group**, because everybody
  in it has just been notified.
- **`project-list` separates `All-Projects` and `All-Users`.** Every Gerrit has
  them; they hold access rules and account data rather than code, so counting
  them overstates a Gerrit's size. It also reports `READ_ONLY` projects, where a
  push fails in terms of permissions rather than state.
- **`server-info-get` reports the two settings that change how the API
  behaves**: account visibility, which can make `account-search` silently
  incomplete, and the auth type — including
  `DEVELOPMENT_BECOME_ANY_ACCOUNT`, where anybody who can reach the instance can
  act as anybody.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable — there is no vendor |
| `instance` | dependency | connection | **none** | Is this Gerrit there, and which version |

### `instance`

Probes the connection's own host at the **bare** `/config/server/version` — the
one place this app does not use `/a/`, because an unauthenticated probe answers
about Gerrit rather than about the password.

It reports the version, which matters more here than for a hosted product:
Gerrit instances span years of releases, and an endpoint that exists in 3.9 and
not in 3.4 fails as a 404 that reads like a wrong path. And it uses the **magic
prefix as a fingerprint** — a body without it means something other than Gerrit
answered.

### `service` — a different shape of absence

There is no Gerrit service to have a status. It is software that Google,
Android, Chromium, Wikimedia, Eclipse and a great many companies run
themselves, and `gerritcodereview.com` publishes no feed because it operates
nobody's instance. Large deployments usually sit behind an organisation's own
status page, at an address only that organisation knows.

## Icon

`assets/icon.svg`, downloaded verbatim from
`www.gerritcodereview.com/images/gerrit-logo.svg` on 2026-08-19 (md5
`1be31b1cf453a827f58e9b6260826b25`) — the logo the project's own site links as
its icon. It is a 62 KB file with gradient filters, and it carries the vendor's
own `<ContainsAiGeneratedContent>` metadata tag; both are kept because the rule
here is a verbatim vendor asset. Checked in both themes with
`_tools/icon-legibility.ts`.

## Tests

264 assertions across 16 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: **no action parses a response body
itself** (which would skip the magic prefix), **the client forces `/a/` while
the health check stays bare**, and submitting requires a confirmation.
