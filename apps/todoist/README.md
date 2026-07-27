# Todoist

Manage Todoist tasks, projects, sections, comments, and labels via the REST v2 API.

- **Categories** — productivity
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.todoist.com`
- **API docs** — https://developer.todoist.com/rest/v2/

## Actions

Fourteen actions across five resources, all on `https://api.todoist.com/rest/v2`:

- **task** — `task-create`, `task-get`, `task-get-many`, `task-update`, `task-close`,
  `task-reopen`, `task-delete`
- **project** — `project-create`, `project-get-many`, `project-delete`
- **section** — `section-get-many`
- **comment** — `comment-create`, `comment-get-many`
- **label** — `label-get-many`

`close`/`reopen`/`delete` and `project-delete` answer `204 No Content`; those actions
return `{ success: true }`. The n8n node's `move`, `quickAdd` and reminder operations are
deliberately left out — they ride the Sync API (`api.todoist.com/sync/v9`), a different
transport, and task placement is already expressible at create time via
`projectId` / `sectionId` / `parentId`.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Instatus JSON rollup.

```
GET https://status.todoist.net/summary.json
```

Todoist does not run Atlassian Statuspage: `status.todoist.com` 302-redirects to
`status.todoist.net`, an **Instatus** page. Instatus exposes a machine-readable rollup at
`/summary.json` whose `page.status` is a single enum — `UP`, `HASISSUES`,
`UNDERMAINTENANCE` — alongside `activeIncidents` / `activeMaintenances` arrays that carry
per-incident `impact` (`DEGRADEDPERFORMANCE`, `PARTIALOUTAGE`, `MINOROUTAGE`,
`MAJOROUTAGE`) when something is open.

The `service` check reads the JSON rather than the RSS/Atom history feed the same page also
serves, because the question here is **current state** and a feed is a log of updates. It
maps `page.status` to the roll-up state and escalates to `down` only for a `MAJOROUTAGE`
incident, attributing each open incident to a named component so one degraded service does
not grey out the platform. A status page that itself fails reports `unknown`, never `down` —
a broken status page says nothing about Todoist.

`status.todoist.net` is reachable **only inside this hook's worker**: it is widened onto the
check's own `network.allow`, not the app's egress list, which the spec permits precisely
because the check is unsigned. Pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach the status host.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself. Both auth methods probe the same scope-free endpoint:

```
GET /projects
```

Lists the user's projects. It needs no special scope, so a narrowly-scoped token still
passes its own liveness check.

### Do we have quota left?

Declared **absent**. Todoist's REST v2 returns no `X-RateLimit-*` / `RateLimit-*` response
headers and publishes no headroom endpoint, so there is nothing to read. The documented
allowance — 1000 requests per 15 minutes per user token — is enforced by a `429` rather than
reported. The absence is declared (not omitted) so a host can tell "we cannot know" from
"nobody looked"; an `unavailable` entry reports `unknown` and is `informational`, so it
never worsens a verdict.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared absence (`unavailable`) |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.todoist.net` (for `service`) is reachable only inside that hook's worker —
not from any action, and not from the other checks. The OAuth authorize/token hosts
(`todoist.com`) are handled host-side and appear in neither the app's egress list nor any
check's allowlist.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check if a probe
starts failing for everyone at once.
