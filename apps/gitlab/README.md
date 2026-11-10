# GitLab

Manage GitLab projects, issues, merge requests, files and releases on GitLab.com or a self-managed
instance.

- **Categories** — developer-tools, version-control
- **Auth methods** — access-token, oauth2
- **Actions** — 16
- **Triggers** — 13 (12 webhook, 1 poll)
- **Egress allowlist** — `gitlab.com`
- **Website** — https://about.gitlab.com
- **API docs** — https://docs.gitlab.com/ee/api/

## Auth

Two methods, both targeting GitLab's REST API v4 (`<instance>/api/v4`):

- **access-token** (`custom`) — a personal, project, or group access token. GitLab does NOT accept
  it as a Bearer credential: it rides in GitLab's own `PRIVATE-TOKEN` request header, which is why
  the method is `type: "custom"` and sets that header in `sign`. The method also carries an optional
  **Instance URL** field defaulting to `https://gitlab.com` — set it to target a **self-managed**
  instance. That base URL is republished on `connection.display.baseUrl` so action and quota code
  resolve the right host without ever seeing the credential.
- **oauth2** — the authorization-code flow against GitLab.com (scope `api`). PKCE is off because w6w
  holds the confidential app's `client_secret` server-side. The OAuth endpoints are GitLab.com's, so
  use the access-token method for self-managed OAuth targets.

### Self-managed instances

The manifest's egress allowlist ships only `gitlab.com`. Pointing a connection at a self-managed
host (via the access-token **Instance URL** field) therefore also requires **adding that host to the
connection's own egress allowlist** — the same dynamic-host note that the WordPress and other
self-hostable apps in this pack carry.

## Triggers

Every trigger but `new-project` is a webhook trigger, signed on GitLab 19.0 or later (see the trust model below)
([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)). Activating one
registers a project webhook on GitLab for you (`POST /projects/:id/hooks`) and removes it when the
trigger is deactivated. The token needs the `api` scope and the Maintainer role on the project.

| Trigger                               | Mechanism | GitLab event                     | The run gets                      |
| ------------------------------------- | --------- | -------------------------------- | --------------------------------- |
| `push` — New Push                     | webhook   | Push events                      | ref, before/after commit, commits |
| `merge-request` — Merge Request Event | webhook   | Merge request events             | action, merge request             |
| `issue` — Issue Event                 | webhook   | Issues events                    | action, issue                     |
| `comment` — New Comment               | webhook   | Comments                         | comment, what it is on            |
| `pipeline` — Pipeline Event           | webhook   | Pipeline events                  | pipeline, status, builds          |
| `release` — Release Event             | webhook   | Releases events                  | action, release                   |
| `tag-push` — Tag Push Event           | webhook   | Tag events                       | tag ref, commit, message          |
| `job` — Job Event                     | webhook   | Job events                       | job, stage, status, pipeline      |
| `deployment` — Deployment Event       | webhook   | Deployment events                | status, environment               |
| `wiki-page` — Wiki Page Event         | webhook   | Wiki page events                 | action, page                      |
| `milestone` — Milestone Event         | webhook   | Milestone events                 | action, milestone                 |
| `new-project` — New Project           | poll      | `GET /projects` (membership)     | project                           |
| `any-event` — Any Event               | webhook   | the kinds you list (blank = all) | kind, action, payload             |

Every run also gets `kind` (GitLab's `object_kind`), `action`, `deliveryId` (`webhook-id`),
`project`, `user` and the full GitLab `payload`. Merge request, issue, release, wiki page and
milestone triggers take an optional **Only these actions** list such as `open,merge`. **Any Event**
takes an **Events** list of GitLab webhook kinds (the payload's `object_kind`: `push`, `tag_push`,
`issue`, `note`, `merge_request`, `wiki_page`, `pipeline`, `build`, `deployment`, `release`,
`milestone`, `feature_flag`, `emoji`, `access_token`, `deploy_token`) and switches on exactly the
matching project-hook flags (issues and comments also turn on their confidential flag; the `emoji` flag is named only in the webhooks reference's test-trigger list, so an instance that ignores it delivers no emoji events); blank
switches on all of them. Kinds the project hooks API has no flag for (vulnerability, work item,
GitLab Duo flow) and the group-only kinds (group member, project, subgroup) cannot be registered
this way and are not covered. `new-project` is the one poll trigger: GitLab announces a created
project only to group and system hooks, never to a project hook, so it reads the newest page of
`project-get-many` (membership projects, newest first by default) and emits each project it has not
seen; the first check records a baseline and emits nothing. `issue-get-many`,
`merge-request-get-many` and `release-get-many` return the same records the `issue`, `merge-request`
and `release` webhook triggers deliver as they change, so they are not polled.

**Trust model.** On activation the app asks the instance `GET /api/v4/version` (same connection,
same base URL as the actions) and picks one of two modes, stored on the subscription.

- **Signed — GitLab 19.0 or later, and the default — body-bound.** GitLab 19.0 added a _signing
  token_ that signs every delivery per the Standard Webhooks spec, and the project-hooks API accepts
  it as `signing_token`. A random signing token (`whsec_` + 32 random bytes, base64) is generated
  per subscription and registered as `signing_token` ONLY: no `token` is sent, so GitLab never sends
  `X-Gitlab-Token` and no secret rides in a header. Each delivery's `webhook-signature` (`v1,` +
  base64 HMAC-SHA256 of `webhook-id.webhook-timestamp.raw body`, keyed with the decoded token) is
  checked in constant time before the body is read, and `webhook-timestamp` must be within 5
  minutes. `X-Gitlab-Token` is never consulted: a delivery without a valid signature is refused,
  whatever token it carries. A probe that fails or returns an unparseable version also gives this
  mode, as do subscriptions created before the probe existed.
- **Token — only for servers that report a version before 19.0 at activation — a shared password.**
  Those servers ignore `signing_token` and send no signature, so a NEW random secret (64 hex
  characters, distinct from any signing key) is registered as the webhook's `token` ("Secret token
  to validate received payloads") and a delivery is accepted if its `X-Gitlab-Token` equals it
  (constant time). That is a shared password in a header: nothing binds it to the body, so a
  captured delivery could be altered and replayed, and the 5-minute window does not apply. The
  server stores inbound headers, so the token is readable by anyone who can read the delivery log;
  it protects nothing else (it is not a signing key). A server upgraded to GitLab 19.x after
  subscribing stays in token mode until the trigger is deactivated and activated again.

A self-managed host must also be on the connection's egress allowlist.

Vendor docs (verified 2026-11-10):
[webhook events](https://docs.gitlab.com/user/project/integrations/webhook_events/),
[webhooks and the signing token](https://docs.gitlab.com/user/project/integrations/webhooks/),
[project webhooks API](https://docs.gitlab.com/api/project_webhooks/) (`token`: "Secret token to
validate received payloads"; `signing_token`: introduced in 19.0). The webhooks page states the
signing token works alongside the secret token, and `X-Gitlab-Token` is sent only when a secret
token is configured; `GET /version` is documented at
[docs.gitlab.com/api/version](https://docs.gitlab.com/api/version/).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — status.io, NOT Atlassian Statuspage.

```
GET https://api.status.io/1.0/status/5b36dc6502d06804c08349f7
```

GitLab's `status.gitlab.com` is hosted on **status.io** (verified 2026-07-27), unlike the
Statuspage-backed GitHub/Bitbucket apps in this pack — so the parser is bespoke. The JSON carries
`result.status_overall.status_code` plus a per-service `result.status[]` array. The `service` check
maps status.io's documented status codes (`100` Operational → ok, `200`/ `300`/`400`
maintenance-or-partial → degraded, `500`/`600` disruption-or-security → down) and reports one
component per service, so a Container Registry incident doesn't grey out the whole platform.
`api.status.io` is widened onto this hook's own allowlist (not the app's egress list, and not
reachable by any action), which the spec permits because the probe is unsigned. It only speaks for
GitLab.com; a self-managed instance has no status.io page.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

Both auth methods probe:

```
GET /user
```

Returns the account behind the credential — the cheapest scope-free call GitLab offers. The
access-token method sends `PRIVATE-TOKEN`, the oauth2 method sends `Authorization: Bearer`.

### Do we have quota left?

`RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` response headers — GitLab's RFC-draft
header names, with **no `x-` prefix** (verified against
docs.gitlab.com/administration/settings/user_and_ip_rate_limits). GitLab.com meters per minute;
`RateLimit-Reset` is a Unix epoch second. The `quota` check reads them off a signed `GET /user`,
resolving the base URL from the connection so a self-managed probe stays on that connection's
allowlisted host.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key                 | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                |
| ------------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ---------------------------------------------------- |
| `service`           | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                  |
| `quota`             | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                                    |
| `auth:access-token` | credential | connection | signed     | fatal         | —            | derived from the `access-token` method's `test` hook |
| `auth:oauth2`       | credential | connection | signed     | fatal         | —            | derived from the `oauth2` method's `test` hook       |

The host `api.status.io` (for `service`) is reachable **only inside that hook's worker** — not from
any action, and not from the other checks. The spec allows the widening precisely because the check
is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check if a probe starts
failing for everyone at once.
