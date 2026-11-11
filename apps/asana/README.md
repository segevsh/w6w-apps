# Asana

Manage Asana projects, tasks, subtasks, comments, tags, and users via the Asana REST
API.

- **Categories** — productivity, project-management
- **Auth methods** — access-token, oauth2
- **Actions** — 22
- **Triggers** — 9 (8 webhook, 1 poll)
- **Egress allowlist** — `app.asana.com`
- **Website** — https://asana.com
- **API docs** — https://developers.asana.com

## Triggers

| Trigger           | Mechanism | Vendor event                                                  | What the run gets                                              |
| ----------------- | --------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `new-task`        | webhook   | a task is `added` to the watched project                      | task ID, who added it, when, the parent project ID             |
| `task-updated`    | webhook   | a task in the watched project is `changed`                    | task ID, the changed field and its new value, who, when        |
| `task-deleted`    | webhook   | a task in the watched project is `deleted`                    | task ID, who deleted it, when                                  |
| `new-comment`     | webhook   | a `story` of subtype `comment_added` is `added` in the project | story ID, the task it belongs to, who, when                   |
| `new-project`     | webhook   | a `project` is `added` in the watched workspace               | project ID, who created it, when                               |
| `project-updated` | webhook   | a `project` is `changed` in the watched workspace             | project ID, the changed field, who, when                       |
| `project-deleted` | webhook   | a `project` is `deleted` in the watched workspace             | project ID, who deleted it, when                               |
| `any-event`       | webhook   | the `<resource type>.<action>` names you list, or all (project) | resource type and ID, action, parent, changed field, who, when |
| `new-user`        | poll      | `GET /workspaces/{gid}/users`, compared check to check        | each user newly added to the workspace                         |

**Setup.** Set *Project ID* to the project to watch (`new-project`, `project-updated` and
`project-deleted` take a *Workspace ID* instead; `any-event` takes a *Resource ID* and *Events*). The trigger registers the webhook itself
(`POST /webhooks` on the project, filtered to `resource_type: task` and one action) and removes it
when the subscription is deleted. Asana's webhook handshake is handled for you: while the webhook
is being created Asana POSTs the callback URL with an `X-Hook-Secret` header and the trigger echoes
it back, as Asana requires.

**Trust model.** The signing secret comes back in Asana's create response and is kept in the
subscription state. Every delivery must carry an `X-Hook-Signature` header equal to the hex
HMAC-SHA256 of the raw request body under that secret; anything else is refused and starts no run.
The `X-Hook-Secret` echo is answered only while the subscription has no stored secret, i.e. during
that one registration handshake. Asana's periodic empty heartbeat is verified and acknowledged
without starting a run. Asana events are compact (task ID, action, changed field); fetch the full
task with the *Get Task* action. Asana deletes a webhook whose endpoint fails for 24 hours; delete
and re-add the trigger to register a new one.

**Assumption to check on first use.** Asana's guide shows the secret as a top-level `X-Hook-Secret`
key of the create response. If an account's response omits it, registration fails with an explicit
error and the webhook is deleted again, rather than accepting unsigned deliveries.

**Any event.** `any-event` registers a webhook on a project, team, portfolio, goal or workspace
with the `<resource type>.<action>` list you give it (for example `section.added`,
`story.changed`, `workspace_membership.added`, `team_membership.added`, `goal.added`; actions are
`added`, `changed`, `deleted`, `removed`, `undeleted`). A blank list registers no filter, which
Asana allows only on lower-level resources such as a project; a team, portfolio, goal or workspace
webhook must list its events. Asana events are compact: a `workspace_membership.added` event names
the membership, not the user.

**New User** is a poll over the workspace's user list: Asana documents it as "sorted
alphabetically and limited to 2000" and unpaginated, so the whole list is compared on every check.
Pagination is not enabled by default on this endpoint
(<https://developers.asana.com/docs/pagination>); if Asana ever answers with a `next_page`, the
check fails loudly instead of comparing a partial list.

**Not covered.** `list-tasks`, `list-subtasks` and `search-tasks` return tasks and subtasks that
`new-task` already delivers (a project webhook is notified of its tasks and their subtasks);
`list-projects` is delivered by `new-project`.

Docs, verified 2026-11-10: <https://developers.asana.com/docs/webhooks-guide> (events, filters,
signature), <https://developers.asana.com/reference/createwebhook> (filters),
<https://developers.asana.com/reference/getusersforworkspace> (user list).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.asana.com>

```
GET https://status.asana.com/api/v2/status.json
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
GET /api/1.0/users/me
```

Asana's canonical whoami, and what n8n's credential test uses too. Available to every
token regardless of workspace membership.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Asana answers 429 with `Retry-After`; the cost of a request varies
by endpoint, so budget on observed 429s rather than a counter.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.asana.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Asana publishes no headroom endpoint or rate-limit headers. Cost varies per endpoint and exhaustion surfaces only as a 429 with `Retry-After`, so headroom has to be budgeted from observed 429s rather than read.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
