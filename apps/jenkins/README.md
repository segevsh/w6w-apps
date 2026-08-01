# Jenkins

Trigger builds, inspect jobs, and manage the build queue on any Jenkins instance.

- **Categories** — devops
- **Auth methods** — basic
- **Actions** — 6
- **Egress allowlist** — `*`

## The arbitrary-endpoint model

Jenkins is almost always self-hosted: a customer's own CI box, an on-prem network segment,
or a managed-Jenkins offering, each addressed by its own URL. There is no single fixed API
host this app could put in `w6w.network.allow`.

So this app follows the same precedented pattern as `elastic` and `wordpress`:
`w6w.network.allow` is `["*"]`, and the instance's own base URL is collected as an
`endpoint` field on the Connection (e.g. `https://ci.example.com`). Every action builds its
request URL from that field — see `lib/client.ts`. Auth's `afterConnect` republishes
`endpoint` (never the credential) onto `connection.display` so action code, which never sees
the credential, can still build correct URLs.

## Auth

**`basic`** — HTTP Basic authentication using a Jenkins username and a personal API token
(user menu → Configure → API Token → Add new Token), confirmed against Jenkins' own remote
API docs, which document Basic auth with `USER:TOKEN` credentials and call out a token as
preferred over the account password.

### Why no CSRF crumb

Jenkins' CSRF-protection documentation states plainly: "requests authenticating with an API
token are exempt from CSRF protection in Jenkins." Every write this app performs
authenticates with exactly that — username + API token via HTTP Basic — so no crumb
(`/crumbIssuer/api/json`) needs to be fetched or attached to any request. A crumb is only
required for username/password-authenticated scripted clients, which this app does not
support (API token is the only credential field offered).

## Actions

| Key | Type | Resource | Jenkins call |
|---|---|---|---|
| `trigger-build` | perform | build | `POST /job/<name>/build` (no params) or `/buildWithParameters` (form body) |
| `get-build-status` | read | build | `GET /job/<name>/<buildNumber>/api/json` — `buildNumber` accepts a permalink (`lastBuild`, …) |
| `get-job-info` | read | job | `GET /job/<name>/api/json` |
| `list-jobs` | read | job | `GET [/job/<folder>]/api/json?tree=jobs[name,url,color,buildable]` |
| `stop-build` | perform | build | `POST /job/<name>/<buildNumber>/stop` |
| `get-queue-item` | read | queue | `GET /queue/item/<id>/api/json` |

Job names accept a single `/`-delimited path (`"my-folder/my-pipeline"`) which
`lib/client.ts#jobPath` expands into the repeated `job/<segment>` form Jenkins' Folders
plugin and multibranch pipelines both address by.

`trigger-build` queues a build rather than returning one — its only useful response is the
`Location` header pointing at a new queue item (`.../queue/item/<id>/`), parsed into
`queueId`/`queueUrl`. Resolve it to an actual build with `get-queue-item` once Jenkins
schedules an executor; once scheduled, the queue item's `executable` field carries the
build's own `number`/`url`.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and is *this tenant's instance* reachable.

### Is the vendor up?

**Service status** — none published, and declared absent (`unavailable`) rather than
omitted. Jenkins the open-source project publishes no hosted status page for individual
self-hosted installs the way a SaaS vendor does — the instance itself IS the dependency,
which is what `dependency`/`site` probes.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

```
GET /api/json
```

The cheapest authenticated read on any Jenkins instance — the top-level Jenkins model
(jobs, views, etc), which every logged-in user can see regardless of per-job permissions.

### Is this tenant's instance reachable?

Since every Connection points at a different instance, this is a `dependency` /
`credential: "context"` check, not a vendor `service` check — the RFC's model for exactly
this case (see `elastic`'s `site` check for the same pattern against a different vendor).

```
GET /api/json
```

Unauthenticated, and a **401/403 counts as reachable**: Jenkins' default security setup
rejects an anonymous request to `/api/json` with `403 Forbidden` (anonymous missing
`Overall/Read`), or `401` depending on the configured security realm — either way that
response only happens because a live Jenkins instance evaluated and rejected the request.
Only a transport failure, a 404 (nothing Jenkins-shaped listening at that URL), or a 5xx
marks the instance itself as the problem — a different failure from a bad credential, which
is exactly the distinction the derived `auth:basic` check cannot make on its own.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

**`service` is declared absent.** There is no vendor status page for an arbitrary
self-hosted/on-prem Jenkins instance: the instance IS the dependency, which is what the
`site` check probes.

---

Researched and endpoint-verified 2026-08-01 against Jenkins' own documentation (remote
access API, CSRF protection / API-token exemption) and the community-maintained
`n8n-nodes-base` Jenkins node's job/build/trigger endpoints, which agree with the official
docs. Jenkins' REST surface is stable across versions; re-check if a probe starts failing
for everyone at once.
