# GitHub

Manage GitHub issues, pull requests, releases, files, repositories and Actions
workflows.

- **Categories** — version-control, developer-tools
- **Auth methods** — access-token, oauth2
- **Actions** — 24
- **Triggers** — 6 (webhook)
- **Egress allowlist** — `api.github.com`
- **Website** — https://github.com
- **API docs** — https://docs.github.com/en/rest

## Triggers

Every trigger is a signed webhook trigger ([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)).
Activating one registers a repository webhook on GitHub for you (`POST /repos/{owner}/{repository}/hooks`)
and removes it when the trigger is deactivated. The token needs permission to administer
repository webhooks (classic `admin:repo_hook`, or the fine-grained "Webhooks" repository
permission, read and write).

| Trigger | Mechanism | GitHub event | The run gets |
|---|---|---|---|
| `push` — New Push | webhook | `push` | ref, before/after commit, commits |
| `pull-request` — Pull Request Event | webhook | `pull_request` | action, pull request |
| `issue` — Issue Event | webhook | `issues` | action, issue |
| `issue-comment` — Issue Comment Event | webhook | `issue_comment` | action, comment, issue |
| `release` — Release Event | webhook | `release` | action, release |
| `workflow-run` — Workflow Run Event | webhook | `workflow_run` | action, workflow run |

Every run also gets `event`, `action`, `deliveryId` (`X-GitHub-Delivery`), `repository`
(`owner/name`), `sender` and the full GitHub `payload`. Triggers with an action (pull request,
issue, comment, release, workflow run) take an optional **Only these actions** list such as
`opened,closed`.

**Trust model.** On activation a random 256-bit secret is generated per subscription and given to
GitHub as the webhook's secret; it is kept in the subscription's state next to the webhook id. Each
delivery's `X-Hub-Signature-256` (`sha256=` + the hex HMAC-SHA256 of the exact request body) is
checked, in constant time, before the body is read; a delivery with no signature, a wrong one, or
no secret on record is refused and starts no run. GitHub's `ping` is acknowledged without a run.
Only `X-Hub-Signature-256` is accepted (never the legacy SHA-1 header). GitHub sends no signed
timestamp, so a captured delivery is replayable; the per-subscription secret and callback URL limit
who could capture one.

Vendor docs (verified 2026-11-09):
[validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries),
[repository webhooks API](https://docs.github.com/en/rest/repos/webhooks).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://www.githubstatus.com>

```
GET https://www.githubstatus.com/api/v2/status.json
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
GET /user
```

The authenticated user. Works for classic and fine-grained PATs and for OAuth tokens.

`GET /rate_limit` is the better choice for a repeated probe: GitHub documents it as
**not** counting against the rate limit, it answers unauthenticated too (so it doubles
as a pure API-liveness check), and it reports the quota in the same call.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`GET /rate_limit`, plus `x-ratelimit-limit` / `-remaining` / `-reset` / `-used` headers
on every response. Secondary (abuse) limits are separate and surface as 403 with
`retry-after`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `www.githubstatus.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
