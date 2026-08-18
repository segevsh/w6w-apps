# Sentry

Triage Sentry issues, read events, and manage projects, releases and deploys.

- **Categories** — monitoring, developer-tools
- **Auth methods** — auth-token, oauth2
- **Actions** — 21
- **Egress allowlist** — `*` (self-hosted installs have no fixed hostname)
- **Website** — https://sentry.io
- **API docs** — https://docs.sentry.io/api/

## Setup

### Auth Token

1. In Sentry, create a token — **Settings → Account → User Auth Tokens** for a
   personal token, or **Settings → Auth Tokens** for an organization token
   (the `sntrys_…` kind).
2. Paste it into the connection's **Auth Token** field. It is sent as
   `Authorization: Bearer <token>`.
3. Fill in **Organization Slug** — the slug in your Sentry URL
   (`sentry.io/organizations/<slug>/`). Every organization-scoped action
   defaults to it, and each can override it per call.
4. **Sentry URL** defaults to `https://us.sentry.io`. Use
   `https://de.sentry.io` for the EU region, or your own base URL for a
   self-hosted install.

Scopes: `org:read` and `project:read` are the minimum; add `event:write` to
triage issues, `event:admin` to delete them, and `project:releases` for the
release and deploy actions.

### OAuth (Sign in with Sentry)

Requires a Sentry OAuth Application registered on this w6w installation
(`client_id` / `client_secret` / `redirect_uri` live on the w6w server, not in
this package; the application itself is created under **Settings → Account →
API → Applications**). The authorization-code flow uses:

- Authorize — `https://sentry.io/oauth/authorize/`
- Token — `https://sentry.io/oauth/token/`
- Scopes — `org:read project:read project:releases team:read member:read
  event:read event:write`

**SaaS `sentry.io` only.** The flow issues tokens from `sentry.io`, so the EU
region and self-hosted installs use the Auth Token method instead, which takes
the install's base URL as a field. Because an OAuth flow has no field to
collect an organization slug, `afterConnect` reads
`GET /api/0/organizations/` instead: a token that sees exactly one
organization gets it as the connection's default, and a token that sees
several records the list and leaves each action's `organizationSlug` param to
decide.

## Actions

| Key | Type | Description |
|---|---|---|
| `issue-list` | read | List issues for an organization, filtered by project, query, period |
| `issue-get` | read | Get one issue by its numeric ID |
| `issue-update` | perform | Resolve, ignore, assign, or re-prioritise an issue |
| `issue-delete` | perform | Permanently remove an issue and its events |
| `issue-event-list` | read | List the individual events grouped under one issue |
| `event-list` | read | List a project's raw error events |
| `event-get` | read | Get one event, including its stacktrace and other interfaces |
| `project-list` | read | List an organization's projects |
| `project-get` | read | Get one project's settings and metadata |
| `project-create` | perform | Create a new project in an organization |
| `project-update` | perform | Change a project's name, slug, platform, or auto-resolution |
| `release-list` | read | List an organization's releases |
| `release-get` | read | Get one release by version identifier |
| `release-create` | perform | Register a new release for one or more projects |
| `release-update` | perform | Set a release's ref, URL, release date, or commit refs |
| `deploy-list` | read | List the deploys recorded against one release |
| `deploy-create` | perform | Record that a release was deployed to an environment |
| `organization-list` | read | List the organizations this connection can see |
| `organization-get` | read | Get one organization's details |
| `team-list` | read | List an organization's teams |
| `member-list` | read | List an organization's members, with roles and teams |

### One host, three deployment models

Sentry's own OpenAPI schema states the canonical server as
`https://{region}.sentry.io` with `region ∈ {us, de}`, and self-hosted
installs (`getsentry/self-hosted`) run the same API at whatever hostname the
tenant chose. So the base URL is a Connection field rather than a constant,
and the manifest declares `network.allow: ["*"]` — the documented form for an
app addressed by a user-supplied URL, and the same one `grafana`, `elastic`
and `wordpress` use. Verified 2026-08-18: both `us.sentry.io` and
`de.sentry.io` answer `401` unauthenticated, i.e. both are live API hosts.

### The organization slug lives on the Connection

Almost every Sentry endpoint is organization-scoped and the slug does not
change over a Connection's life, so it is collected once at connect time and
published to `connection.display` — not repeated as a required param on 19
actions. Each action still carries an optional `organizationSlug` override for
a token that spans several organizations.

### Pagination

Sentry paginates with the `Link` header
(<https://docs.sentry.io/api/pagination/>). The load-bearing detail: Sentry
**always** emits a `rel="next"` cursor, even on the last page, so that a
poller can ask for yet-undiscovered results. Following it without checking
`results="true"` loops forever on an empty page, so `lib/client.ts` requires
both.

### List actions declare no `output` fields

Sentry's list endpoints return a bare JSON array, not an envelope — there are
no top-level fields for an `output` declaration to name. The pack auditor
warns about this for the nine list actions; the warning is the accurate
signal, and inventing a wrapper key that the action does not actually return
would be worse. Every action that returns an object declares its fields.

### Deliberately out of scope

- **Write access to organizations, teams and members** (`PUT
  /organizations/{org}/`, `POST /organizations/{org}/teams/`, the member
  mutation endpoints) — account administration, not automation, and each
  needs an `org:admin`-class scope that would widen what every Connection has
  to grant.
- **DSN-authenticated ingestion** (the store/envelope endpoints). Sentry's
  schema lists a separate `dsn` security scheme for these; sending events is
  an SDK's job.
- **Discover / metrics querying** (`/events/`, `/events-timeseries/`,
  `/sessions/`) — real, but they take Discover query syntax whose valid fields
  depend on the organization's own event schema, so a form could not validate
  what it collects.
- **Bulk issue mutation** (`PUT /projects/{org}/{project}/issues/?id=…`) — the
  single-issue endpoint covers the triage case, and the bulk form's
  repeated-`id` query encoding is easy to get subtly wrong from a form.

## Health check

Four different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this install* reachable, is *this
credential* live, and do we have *quota* left.

### Is the vendor up?

**Atlassian Statuspage**, verified 2026-08-18:

```
GET https://status.sentry.io/api/v2/summary.json -> 200, 14,768 bytes
    {"page":{"id":"t687h3m0nh65","name":"Sentry",...},
     "status":{"indicator":"none","description":"All Systems Operational"}}
GET https://status.sentry.io/api/v2/status.json  -> 200, 211 bytes
GET https://status.sentry.io/history.atom        -> 200, real Atom feed
```

`summary.json` is what `health/service.ts` reads: one request either way, but
it carries the per-component breakdown. A status page that itself fails
reports `unknown`, never `down` — a broken status page says nothing about the
vendor.

This covers Sentry's **SaaS** only. A self-hosted install's availability is a
different question, which is what the `site` check answers.

### Is this install reachable?

`health/site.ts` calls `GET /api/0/organizations/` against the Connection's own
endpoint **without a credential**. Sentry answers:

```
HTTP/2 401
{"detail":"Authentication credentials were not provided."}
```

That 401 is the healthy signal — something Sentry-shaped is listening and
routing the API, provable without spending a credential. A transport failure,
a 404 (nothing Sentry-like at that URL) or a 5xx is the install itself being
the problem, which is a different fix from a bad token.

### Is this credential live?

The Auth `test` hooks:

- `auth-token` — `GET /api/0/organizations/{slug}/?detailed=0`. The cheapest
  call that proves both halves of the credential at once: the token is live
  **and** it can see the organization the Connection names.
  `GET /api/0/organizations/` would pass for a token scoped to some other
  organization. `detailed=0` skips the projects+teams payload. Scope:
  `org:read`, the narrowest this app asks for. 401 / 403 / 404 each get their
  own message, because they are three different fixes.
- `oauth2` — `GET /api/0/organizations/`, the whoami of an OAuth token.

### Do we have quota left?

`x-sentry-rate-limit-*` response headers, verified live on 2026-08-18 against
`https://us.sentry.io/api/0/organizations/` (they ride on every response,
including the unauthenticated 401):

```
x-sentry-rate-limit-limit: 40
x-sentry-rate-limit-remaining: 39
x-sentry-rate-limit-reset: 1787019075
x-sentry-rate-limit-concurrentlimit: 25
x-sentry-rate-limit-concurrentremaining: 24
```

`reset` is an absolute epoch-**seconds** timestamp, not a duration — unlike
PagerDuty's — so `health/quota.ts` converts it directly. Sentry meters
requests and in-flight concurrency separately and either one exhausting
produces a 429, so both are reported.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET status.sentry.io/api/v2/summary.json` |
| `site` | dependency | connection | context | degraded | 120s | unauthenticated `GET /api/0/organizations/` |
| `quota` | quota | connection | signed | informational | 300s | `GET /api/0/organizations/{slug}/?detailed=0` |
| `auth:auth-token` | credential | connection | signed | fatal | — | derived from the `auth-token` method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.svg` — Sentry's chevron mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/sentry.svg>, downloaded
2026-08-18.

- **686 bytes**, md5 `b5bf92df44d1e947ca288bc2715e5670`, `<title>Sentry</title>`,
  `viewBox="0 0 24 24"`
- inked with Sentry's own brand purple `#362D59` (the `hex` simple-icons
  records for this brand; the file ships monochrome black)
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim
- `assets/icon.dark.svg` is the same artwork reversed to white by
  `_tools/icon-legibility.ts` — `#362D59` scores ΔE 25.27 / contrast 1.26
  against the dark tile `#1f232c`, i.e. it disappears there
- `sentry.io` serves a catch-all HTML page for `/favicon.svg` and every other
  asset path tried, so it is not a usable source

---

Researched and endpoint-verified 2026-08-18 against Sentry's own OpenAPI
schema (`https://github.com/getsentry/sentry-api-schema`, `openapi-derefed.json`,
137 paths), Sentry's pagination docs, and live probes of `us.sentry.io`,
`de.sentry.io`, `sentry.io/oauth/*` and `status.sentry.io`. Status surfaces
move; re-check if a probe starts failing for everyone at once.
