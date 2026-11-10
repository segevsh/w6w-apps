# Bitbucket

Read repositories, workspaces and manage webhooks on Bitbucket Cloud.

- **Categories** — developer-tools
- **Auth methods** — basic, access-token
- **Actions** — 12
- **Triggers** — 19 (16 webhook, 3 poll)
- **Egress allowlist** — `api.bitbucket.org`
- **Website** — https://bitbucket.org
- **API docs** — https://developer.atlassian.com/cloud/bitbucket/rest/intro/

## Triggers

The webhook triggers are signed ([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)).
Activating one registers a repository webhook on Bitbucket for you
(`POST /2.0/repositories/{workspace}/{repo_slug}/hooks`) and removes it when the trigger is
deactivated. The credential needs the webhook scope and repository admin access. Three poll triggers (`new-repository`, `new-or-updated-repository`, `new-workspace`) need no webhook.

| Trigger | Mechanism | Bitbucket event key | The run gets |
|---|---|---|---|
| `push` — New Push | webhook | `repo:push` | the branch and tag changes |
| `pull-request-created` — New Pull Request | webhook | `pullrequest:created` | the pull request |
| `pull-request-updated` — Pull Request Updated | webhook | `pullrequest:updated` | the pull request |
| `pull-request-merged` — Pull Request Merged | webhook | `pullrequest:fulfilled` | the pull request, merge commit |
| `pull-request-declined` — Pull Request Declined | webhook | `pullrequest:rejected` | the pull request, reason |
| `pull-request-comment` — New Pull Request Comment | webhook | `pullrequest:comment_created` | the comment, the pull request |
| `issue-created` — New Issue | webhook | `issue:created` | the issue (needs the repository's issue tracker enabled) |
| `issue-updated` — Issue Updated | webhook | `issue:updated` | the issue and the changes |
| `issue-comment-created` — New Issue Comment | webhook | `issue:comment_created` | the issue and the comment |
| `pull-request-approved` — Pull Request Approved | webhook | `pullrequest:approved` | the pull request and the approval |
| `pull-request-changes-requested` — Pull Request Changes Requested | webhook | `pullrequest:changes_request_created` | the pull request and the request |
| `repo-fork` — Repository Forked | webhook | `repo:fork` | the repository and the fork |
| `repo-updated` — Repository Updated | webhook | `repo:updated` | the repository and the changes |
| `commit-status-created` — Build Status Created | webhook | `repo:commit_status_created` | the commit status |
| `commit-status-updated` — Build Status Updated | webhook | `repo:commit_status_updated` | the commit status |
| `any-event` — Any Event | webhook | the `events` you choose out of all 24 documented keys (all when empty) | the event key and the payload |
| `new-repository` — New Repository | poll (5 min) | `list-repositories` with `sort=-created_on` for the chosen `workspace` | each newly created repository |
| `new-or-updated-repository` — New or Updated Repository | poll (5 min) | `list-repositories` with `sort=-updated_on` | each repository created or updated (a push moves `updated_on`) |
| `new-workspace` — New Workspace | poll (5 min) | `list-workspaces` (`/user/workspaces`, whole set diffed) | each workspace the user newly belongs to |

Every run also gets `event` (the `X-Event-Key`), `deliveryId` (`X-Request-UUID`), `repository`
(`workspace/slug`), `actor` and the full Bitbucket `payload`.

**Trust model.** On activation a random 256-bit secret is generated per subscription and given to
Bitbucket as the webhook's secret; it is kept in the subscription's state next to the webhook uuid.
Bitbucket then signs every delivery: `X-Hub-Signature: sha256=<hex HMAC-SHA256 of the exact request
body>`. The signature is checked in constant time before the body is read; a delivery with no
signature, a wrong one, or no secret on record is refused and starts no run. Bitbucket documents
no signed timestamp, so a captured delivery is replayable; the per-subscription secret and
callback URL limit who could capture one.

**Events.** Bitbucket documents 24 repository event keys: `repo:push`, `repo:fork`, `repo:updated`,
`repo:transfer`, `repo:deleted`, `repo:commit_comment_created`, `repo:commit_status_created`,
`repo:commit_status_updated`, `issue:created`, `issue:updated`, `issue:comment_created`,
`pullrequest:created`, `pullrequest:updated`, `pullrequest:approved`, `pullrequest:unapproved`,
`pullrequest:fulfilled`, `pullrequest:rejected`, `pullrequest:comment_created`,
`pullrequest:comment_updated`, `pullrequest:comment_deleted`, `pullrequest:comment_resolved`,
`pullrequest:comment_reopened`, `pullrequest:changes_request_created` and
`pullrequest:changes_request_removed`. The named triggers above cover the ones people build on;
**Any Event** reaches all of them: its `events` param (comma-separated, empty = all) is the list the
webhook is registered for, and anything else Bitbucket sends is acknowledged without a run.
Workspace-level webhooks (`create-workspace-hook`) are not used by the triggers: each trigger
watches one repository.

**Polls.** The repository polls read `GET /2.0/repositories/{workspace}` newest-first (`sort`,
`pagelen` 100) for the workspace you give; the workspace poll reads every page of
`/user/workspaces` and diffs the uuids. The first check only records what exists.

**Not covered by a trigger.** `list-repository-hooks` and `list-workspace-hooks` (the registry of
webhook subscriptions, admin output; this app's own triggers manage theirs) and
`list-repository-events` and `list-workspace-events` (the static catalog of subscribable event
names, reference data).

Vendor docs (verified 2026-11-10):
[manage webhooks and secure them](https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/),
[event payloads and headers](https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/),
[filtering, sorting and pagination](https://developer.atlassian.com/cloud/bitbucket/rest/intro/).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://bitbucket.status.atlassian.com>

```
GET https://bitbucket.status.atlassian.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /2.0/user
```

The authenticated user. Note it needs the `account` scope — an app password created
without it 403s here even though repository calls work, so a failure is not necessarily
a dead credential.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Reset` response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |

The host `bitbucket.status.atlassian.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
