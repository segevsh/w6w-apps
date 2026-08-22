# Gitea

Manage Gitea repositories, issues, pull requests, releases and files.

- **Categories** — version-control, developer-tools, devops
- **Auth methods** — token
- **Actions** — 26
- **Egress allowlist** — `*` (self-hosted — see below)
- **Website** — https://about.gitea.com
- **API docs** — https://docs.gitea.com/api ·
  schema: your own instance's `/swagger.v1.json` (Swagger 2.0, `basePath`
  `/api/v1`; read from `gitea.com` 2026-08-18, engine 1.27.0-dev, 340 paths)

## Setup

### Access Token

1. Gitea → **Settings → Applications → Generate New Token**. Give it only the
   scopes the workflow needs — a token with `write:repository` can force-push.
2. Paste it into the connection, along with your **Instance URL**.
3. **Default Owner** is optional: set it and repositories can be written as
   `web` instead of `acme/web`.

### The scheme word is `token`, not `Bearer`

Gitea's own security definition says it: *"API tokens must be prepended with
`token` followed by a space."*

This is worth stating because sending `Bearer` fails **exactly like a wrong
token** — `401 {"message":"token is required"}` — so it reads as a credential
problem rather than a scheme one. The connection test says so in its message
when it sees that body.

Gitea offers two other schemes and this app declines both:

- **`access_token` as a query parameter.** The document marks it *"deprecated
  for removal in Gitea 1.23"*, and a credential in a query string is a
  credential in every proxy log and browser history between here and the server.
- **Basic auth.** It works, and it means handing a workflow the account password
  rather than a revocable, scopeable token.

### Why the allowlist is `*`

Gitea is self-hosted by design — `gitea.com` is one instance among many, and
most are private. So the base URL is a connection field and the egress
allowlist has to be open, the same posture this pack already uses for
`mattermost`, `ghost`, `grafana` and `jenkins`. It is deliberately wide, and it
is the price of an app whose server address only the operator knows.

A happy consequence of self-hosting: **the API document ships with the
instance**, so it describes exactly the version in front of you. That is why the
`instance` health check reports the version it found — when an action 404s on
one server and works on another, that is the answer.

## Actions

| Key | Type | Description |
|---|---|---|
| `repo-search` | read | Find repositories by name, owner or topic |
| `repo-get` | read | One repository, including its default branch |
| `repo-create` | perform | Create under the token's account or an org |
| `repo-delete` | perform | Permanently delete a repository |
| `org-repo-list` | read | Everything an organization owns |
| `issue-list` | read | Issues — and, unless filtered, pull requests |
| `issue-get` | read | One issue by number |
| `issue-create` | perform | Open an issue |
| `issue-edit` | perform | Change title, body, assignees or state |
| `issue-comment-list` | read | Conversation comments |
| `issue-comment-create` | perform | Comment on an issue or pull request |
| `pull-request-list` | read | Pull requests only |
| `pull-request-get` | read | One pull request, with mergeability |
| `pull-request-create` | perform | Open a pull request |
| `pull-request-merge` | perform | Merge, optionally when checks pass |
| `file-get` | read | A file's contents and the sha a write needs |
| `file-write` | perform | Commit a file, create or update |
| `file-delete` | perform | Commit the removal of a file |
| `branch-list` | read | Branches and their protection |
| `commit-list` | read | Commits on a branch |
| `tag-list` | read | Tags |
| `label-list` | read | Labels — where issue creation's ids come from |
| `release-list` | read | Releases, including drafts |
| `release-get-latest` | read | The newest *published* release |
| `release-create` | perform | Publish a release |
| `user-get` | read | The account this token belongs to |

## Five things that go wrong quietly

### 1. An issue list contains pull requests

Gitea models a pull request as an issue with a `pull_request` field, so an
unfiltered `GET /issues` returns both. A workflow counting "open issues" quietly
includes every open PR.

`issue-list` defaults to **issues only** rather than inheriting Gitea's mixed
default, and offers the mixed behaviour explicitly. `pull-request-list` is the
honest way to count the other side.

### 2. Labels are ids when writing and names when reading

`issue-create` takes `labels: [3, 7]` — numeric ids. `issue-list` filters by
`labels=bug,urgent` — names. Passing `["bug"]` to the create is a validation
error rather than a lookup, so this app catches it locally with a message that
says which is which, and `label-list` exists to supply the ids.

### 3. A file write needs the blob sha of what it replaces

Gitea's update and delete endpoints require the current `sha`. That is an
optimistic-concurrency guard, not paperwork: without it, a stale workflow would
overwrite a change that landed in between.

Nobody has that sha to hand, so `file-write` and `file-delete` **fetch it** —
one extra read in exchange for a write that cannot silently clobber someone
else's commit. It also makes create-or-update one action, since the read tells
us which verb applies, so a workflow re-running on a file it already wrote does
not fail.

> Content is base64 on both directions, and `btoa` throws above U+00FF — so a
> naive encoder fails on any commit containing an em dash or a non-Latin
> character, with an error about characters rather than encoding. The
> conversions here go through `TextEncoder`/`TextDecoder` for that reason, and a
> test round-trips Japanese and an emoji.

### 4. `mergeable` is `null` while Gitea is still computing it

Gitea works out mergeability in the background after a push, so reading a pull
request immediately after creating it gives neither `true` nor `false`. A
workflow that treats `null` as "not mergeable" refuses perfectly good pull
requests.

### 5. The latest release is not the first row of the list

`release-list` includes drafts and prereleases; `/releases/latest` deliberately
skips both. A "what version is live" workflow reading the list can report an
unpublished draft. `release-get-latest` is its own action for that reason, and
it answers `404` for a repository that has never shipped — the correct answer,
which reads as a missing repository if you are not expecting it.

## Where the destructive verbs live

**`repo-delete`** is the sharpest call in the app, and unlike almost everything
else in a Git workflow it is not recoverable from a clone: the issues, pull
requests, releases, wiki and settings are not in anyone's local copy, and Gitea
has no trash for repositories. It requires an explicit confirmation **and**
refuses to resolve the repository from the connection's default owner — a bare
name plus a stale default is exactly how the wrong repository gets deleted.

**`file-delete`** confirms too. **`pull-request-merge`**'s `force_merge` — which
merges past failing checks and branch protection, the rules someone configured
precisely so this could not happen from a script — is off by default and logged
at `warn` when used. Its `merge_when_checks_succeed` **queues** the merge and
returns immediately, so the response does not mean merged.

## Smaller sharp edges

- **The issue number is not the issue id.** Paths take the `#123` number; `id`
  is an internal key unique across the instance. Both are in the response.
- **`repo-search` is the only endpoint that wraps its results** — `{ok, data}`
  where everything else returns a bare array. It is unwrapped here so callers do
  not have to remember which is which.
- **`repo-create` posts to two different endpoints.** `/user/repos` creates
  under the token's own account whatever an owner field says; an organization
  repository needs `/orgs/{org}/repos`. Getting it wrong makes a real repository
  in the wrong place, so the organization field *chooses the endpoint*.
- **`auto_init` matters more than it looks.** Without it a new repository has no
  commits and no default branch, so a `file-write` straight afterwards has
  nothing to branch from. It is on by default here.
- **`release-create` tags the default branch's tip at call time** unless you
  name a target. For a pipeline-triggered release, naming the sha is the
  difference between shipping what you verified and shipping whatever landed
  since.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** server reachable, and on what version? |
| `service` | service | Declared unavailable — the question does not apply |

`instance` reads `GET /api/v1/version`, which Gitea answers **unauthenticated**
with `{"version":"1.27.0+dev-…"}` — verified against `gitea.com` 2026-08-18.
Reading it unsigned matters: an expired token must not make a healthy server
look down. A `404` there gets its own diagnosis, because something answering but
not being a Gitea API usually means a wrong URL or a proxy in the way.

`service` is a **declared absence**, and the reason is structural rather than a
gap: Gitea is self-hosted *software*, so there is no vendor running the instance
a connection points at and nothing a vendor status page could say about it. The
project does run `status.gitea.com` for its own hosted `gitea.com`, and it is
not used here — verified 2026-08-18 it is an UptimeRobot page serving HTML, with
`/index.json`, `/feed.rss` and the UptimeRobot heartbeat paths all returning
404, and even a working feed would describe one instance that is almost
certainly not yours.

## What this app deliberately does not do

- **`force_push` on file writes.** Gitea accepts it; it is the one flag here
  that discards history rather than adding to it, and a workflow step is not
  where that decision belongs. A test asserts no action can reach it.
- **The `Sudo` header.** Gitea lets an administrator act as any user.
  Impersonation from an unattended workflow is not something this app should
  make easy — also asserted by a test.
- **Admin, mirrors, LFS, packages, wikis and Gitea Actions.** Each is its own
  surface; the 340 paths are mostly not about the daily loop of issues, reviews
  and releases.
- **Webhooks.** Configuring where Gitea pushes events belongs with whatever
  receives them.

## Errors

Gitea's envelope is `{message, url}`, where `url` points at the API
documentation for the endpoint — more useful than it sounds when an instance is
running an older version than you expected. Failures surface the status and the
whole body.
