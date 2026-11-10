# Jira

Create, search and transition Jira issues, and manage comments, users and projects.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-token, oauth2
- **Actions** — 15
- **Triggers** — 14 (1 poll, 13 webhook)
- **Egress allowlist** — `*.atlassian.net`, `api.atlassian.com`
- **Website** — https://www.atlassian.com/software/jira
- **API docs** — https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://jira-software.status.atlassian.com>

```
GET https://jira-software.status.atlassian.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

Atlassian runs one Statuspage per product; `status.atlassian.com` is the cross-product
rollup and also serves `/api/v2/status.json`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `api-token` | `GET /rest/api/3/myself` |
| `oauth2` | `GET https://api.atlassian.com/oauth/token/accessible-resources` |

The authenticated user. Works on any Jira Cloud site and needs no project permission.

The two differ because the hosts differ. An API-token connection talks to the site
directly, so `myself` is reachable. An OAuth connection has no site yet —
`accessible-resources` is what both proves the token and resolves the `cloudId` every
later call needs, so it cannot be skipped.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Atlassian applies dynamic, cost-based limits and answers 429 with
`Retry-After`; `X-RateLimit-*` headers appear on some endpoints.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `jira-software.status.atlassian.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Atlassian applies dynamic, cost-based limits with no published headroom endpoint. `X-RateLimit-*` headers appear on some endpoints but not reliably, so there is nothing a probe can read for a stable answer; a 429 carries `Retry-After`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.

## Triggers

| Trigger | Mechanism | Event | The run gets |
| ------- | --------- | ----- | ------------ |
| `new-issue` | poll | A newly created issue matching the JQL query (`POST /rest/api/3/search`, `ORDER BY created DESC`) | the issue |
| `issue-created` | webhook | `jira:issue_created` | issue, user |
| `issue-updated` | webhook | `jira:issue_updated` | issue, changelog, issue event type |
| `issue-deleted` | webhook | `jira:issue_deleted` | issue |
| `comment-created` | webhook | `comment_created` | comment |
| `comment-updated` | webhook | `comment_updated` | comment |
| `comment-deleted` | webhook | `comment_deleted` | comment |
| `project-created` | webhook | `project_created` | project |
| `project-updated` | webhook | `project_updated` | project |
| `project-deleted` | webhook | `project_deleted` | project |
| `user-created` | webhook | `user_created` | user |
| `user-updated` | webhook | `user_updated` | user |
| `user-deleted` | webhook | `user_deleted` | user |
| `any-event` | webhook | any `webhookEvent` Jira sends, optionally limited by the **Events** list (e.g. `sprint_started,worklog_created`) | event name and whatever issue, comment, project or user it carries |

Every run of a webhook trigger also gets `webhookEvent`, `timestamp`, `eventType` (issue events),
`deliveryId` (`X-Atlassian-Webhook-Identifier`, the same across Jira's retries) and the objects named above.

**Poll.** The first poll records the current page without emitting it; later polls deduplicate by issue id.
The trigger appends its newest-first ordering, so enter a JQL filter without an `ORDER BY` clause.

**Webhook setup (once per trigger).** Jira webhooks are created by a Jira administrator, not by w6w:
1. Activate the trigger in w6w and copy its callback URL.
2. In Jira, open Settings, System, WebHooks, Create a WebHook. Paste the URL, tick the event the trigger
   names (for **Any Event**, tick whichever events you want), and use **Generate secret** to create a secret.
3. Paste the same secret into the trigger's **Webhook secret** field.

**Trust model.** Jira signs a delivery only when the webhook has a secret, and w6w requires one. Each
delivery's `X-Hub-Signature` (`sha256=` + hex HMAC-SHA256 of the exact request body under your secret) is
checked in constant time before the body is read; a missing header, a wrong or non-`sha256` signature, a
body that was altered, or no secret configured is refused and starts no run. Jira's scheme carries no
timestamp, so there is no replay window; retries share one `deliveryId`.

**Not registered through the API.** Jira's REST registration (`/rest/webhooks/1.0/webhook`) is outside the
`/rest/api/3` client this app uses, and Atlassian lists OAuth 2.0 and Connect apps as the only callers of
`/rest/api/3/webhook`, so setup stays manual.

**Not covered.** `user-search` (a lookup by typed name or email with no sort or created filter, capped at the
first 1000 matches) is delivered for new users by `user-created`.

Vendor docs (verified 2026-11-10): [Jira Cloud webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)
(registering, available events, validating deliveries, retries),
[Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)
(issue search) and its [OpenAPI document](https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json)
(`GET /rest/api/3/user/search`).
