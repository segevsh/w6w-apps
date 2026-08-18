# Vercel

Ship and inspect Vercel deployments — projects, aliases, env vars, domains and
logs.

- **Categories** — devops, developer-tools
- **Auth methods** — access-token, oauth2
- **Actions** — 28
- **Egress allowlist** — `api.vercel.com`
- **Website** — https://vercel.com
- **API docs** — https://vercel.com/docs/rest-api · schema: https://openapi.vercel.sh/

## Setup

### Access Token

1. In Vercel, go to **Account Settings → Tokens** and create a token. Its
   scope — your personal account, or one team — is fixed at creation time.
2. Paste it into the connection's **Access Token** field. It is sent as
   `Authorization: Bearer <token>`.
3. **Team ID** is optional. Leave it blank to act as your personal account;
   fill it in (from **Team Settings → General**) to act on a team's resources.
   This is Vercel's own convention, from its REST API docs: "By default, you
   can access resources in your personal account. To access resources owned by
   a team, append the Team ID as a query string."

### OAuth (Sign in with Vercel)

Requires a Vercel **Integration** registered on this w6w installation
(`client_id` / `client_secret` / `redirect_uri` live on the w6w server, not in
this package). The authorization-code flow uses:

- Authorize — `https://api.vercel.com/oauth/authorize`
- Token — `https://api.vercel.com/oauth/access_token`
- Scopes — **none.** Vercel's schema declares this flow with an empty `scopes`
  object: an integration's reach comes from its configuration in the
  Integration Console and from what the installing user grants it, not from a
  scope string on the authorize request.

Verified live 2026-08-18: the authorize endpoint answers `302` to
`https://vercel.com/oauth/authorize?…` (the consent screen — the flow working
as designed), and the token endpoint answers
`400 {"error":"invalid_client"}` to an unregistered client. Both are real
endpoints, not a catch-all page.

## Actions

| Key | Type | Description |
|---|---|---|
| `deployment-list` | read | List deployments, filtered by project, state, target, branch or SHA |
| `deployment-get` | read | Get one deployment by ID or deployment URL |
| `deployment-create` | perform | Trigger a new deployment from a Git source |
| `deployment-cancel` | perform | Stop a deployment that is still building |
| `deployment-delete` | perform | Permanently remove a deployment |
| `deployment-event-list` | read | Read a deployment's build logs |
| `deployment-promote` | perform | Make an existing deployment the production one |
| `deployment-rollback` | perform | Roll production back to an earlier deployment |
| `runtime-log-list` | read | Read a deployment's runtime (function) logs |
| `alias-list` | read | List aliases, filtered by project or domain |
| `alias-get` | read | Get one alias by hostname or alias ID |
| `alias-assign` | perform | Point a domain at a deployment |
| `alias-delete` | perform | Remove an alias |
| `deployment-alias-list` | read | List the aliases pointing at one deployment |
| `project-list` | read | List projects |
| `project-get` | read | Get one project's settings and latest deployments |
| `project-create` | perform | Create a project, optionally linked to a Git repo |
| `project-update` | perform | Change a project's name, framework or build settings |
| `project-delete` | perform | Delete a project and all of its deployments |
| `env-list` | read | List a project's environment variables |
| `env-create` | perform | Add an environment variable to a project |
| `env-update` | perform | Change an environment variable |
| `env-delete` | perform | Remove an environment variable |
| `domain-list` | read | List account-level domains |
| `project-domain-list` | read | List the domains attached to one project |
| `project-domain-add` | perform | Attach a domain to a project |
| `team-list` | read | List the teams this connection belongs to |
| `user-get` | read | Get the authenticated account |

### Every path carries its own version

Vercel versions per endpoint, not per API. `/v7/deployments` lists
deployments, `/v13/deployments/{id}` reads one, `/v12/deployments/{id}/cancel`
cancels one; `/v10/projects` lists projects but `/v9/projects/{idOrName}` reads
one and `/v11/projects` creates one. There is no base version to factor out, so
every action states the full versioned path exactly as Vercel's OpenAPI
document lists it, and the client prepends nothing. A "modernising" sweep that
unified them would break most of this app.

### Team scope lives on the Connection

A `teamId` query param is what makes a request act on a team instead of the
token's personal account, and it is accepted by nearly every endpoint. It is
collected once at connect time rather than repeated on 26 actions, with a
per-call `teamId` override for a token that spans teams. Blank is meaningful —
it is the personal account — so the field is optional rather than required.

The two exceptions are `team-list` and `user-get`: Vercel's schema declares no
`teamId` parameter on `GET /v2/teams` or `GET /v2/user`, so those actions
deliberately send no scope. A test asserts exactly that split, so adding a new
action that quietly drops the connection's team fails the suite.

### Pagination

Paged collections answer `{ <collection>: [...], pagination: { count, next,
prev } }`, where `next` is "a timestamp that must be used to request the next
page" and is **`null` on the last page** (Vercel's shared `Pagination` schema).
That timestamp goes back as `until`. Two endpoints are not paged this way and
are not run through the pager: `deployment-event-list` and `runtime-log-list`
return bare arrays with their own `limit` semantics — `-1` means "everything"
for build events.

### Build logs and runtime logs are different questions

`deployment-event-list` (`/v3/deployments/{id}/events`) is what the *build*
printed. `runtime-log-list`
(`/v1/projects/{p}/deployments/{d}/runtime-logs`) is what the deployed
functions printed while serving traffic. Reaching for the wrong one is the
usual reason "there are no logs" when there plainly are.

`follow` is deliberately not exposed on either. Vercel streams live events when
it is set, which would hold the request open for the life of a build; an action
runs to completion, so a stream is the wrong shape for it.

### Secrets are not decrypted by default

`env-list` exposes Vercel's `decrypt` flag but leaves it off. An encrypted
variable's value comes back redacted unless you ask, and pulling secrets into a
workflow step's output should be a deliberate act. `env-create` defaults `type`
to `encrypted`, which is what the dashboard does for a value you type into it;
`sensitive` is stronger still (never readable back, even in the dashboard).

### List actions declare no `output` fields

Seven list actions unwrap Vercel's envelope and return the bare array, so there
are no top-level fields for an `output` declaration to name. The pack auditor
warns about them; the warning is the accurate signal, and inventing a wrapper
key the action does not return would be worse. Everything that returns an
object declares its fields.

### Deliberately out of scope

- **File-upload deployments.** `POST /v13/deployments` also accepts an inline
  `files` array, but that path means uploading every file of the build through
  Vercel's files API first — an SDK/CLI job. The Git-source arm is what a
  workflow needs, and it is a union keyed on `type` (`github` / `gitlab` /
  `bitbucket` / `vercel`), so it is passed as JSON rather than modelling one
  arm as fields and silently excluding the rest.
- **DNS records** (`/v2/domains/{domain}/records` and friends) and **domain
  registration** (17 `/v1/registrar/*` endpoints).
- **Edge Config, Feature Flags, Access Groups, Artifacts, Marketplace
  integrations.** Each is a coherent surface of its own that deserves its own
  action set rather than a token endpoint here.
- **Team and member administration** (`POST /v1/teams`, `PATCH /v2/teams/{id}`,
  the member endpoints) — account administration, not deploy automation.
  `team-list` is here only because it is how you find the `teamId` the other
  actions take.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left.

### Is the vendor up?

**Atlassian Statuspage**, verified 2026-08-18:

```
GET https://www.vercel-status.com/api/v2/summary.json -> 200, 20,855 bytes
    {"page":{"id":"lvglq8h0mdyh","name":"Vercel",...},
     "status":{"indicator":"none","description":"All Systems Operational"}}
GET https://www.vercel-status.com/api/v2/status.json  -> 200, 216 bytes
GET https://www.vercel-status.com/history.atom        -> 200, real Atom feed
```

Three different documents at three paths, i.e. these are real endpoints rather
than one catch-all HTML shell. `health/service.ts` reads `summary.json` — one
request either way, but it carries the per-component breakdown. A status page
that itself fails reports `unknown`, never `down`.

There is no `site` check here: Vercel is SaaS-only with a single documented
server, so "is the install reachable" is not a separate question from "is the
vendor up".

### Is this credential live?

Both auth methods probe `GET /v2/user`, Vercel's whoami. It takes no team
scope and no extra permission, so it proves the token is live without
depending on what that token can reach. A missing or bad token answers
`403 {"error":{"code":"forbidden","missingToken":true}}` — verified live
2026-08-18.

### Do we have quota left?

`X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` response
headers — named in Vercel's own REST API docs (fetched 2026-08-18): "Rate
limits are specified via response headers."

**Vercel does not document what unit `Reset` is in**, and an unauthenticated
call carries no `x-ratelimit-*` headers at all (verified: the 403 from
`GET /v2/user` has none), so the unit could not be settled by observation
either. Rather than guess and render a wrong timestamp, `health/quota.ts`
classifies the value by magnitude — epoch milliseconds (`> 1e12`), epoch
seconds (`> 1e9`), or a delay in seconds — and a unit test pins all three
readings. The ranges do not overlap for any plausible value.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET www.vercel-status.com/api/v2/summary.json` |
| `quota` | quota | connection | signed | informational | 300s | `GET /v2/user` |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.svg` — Vercel's triangle, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/vercel.svg>, downloaded
2026-08-18.

- **132 bytes**, md5 `0258e44f8505a213b47c84def67f479b`,
  `<title>Vercel</title>`, `viewBox="0 0 24 24"`
- black (`#000000`) is Vercel's actual brand colour for this mark, not a
  monochrome fallback, so the light icon keeps it
- `assets/icon.dark.svg` is the same artwork reversed to white by
  `_tools/icon-legibility.ts` — black scores ΔE 15.2 / contrast 1.34 against
  the dark tile `#1f232c`, i.e. it disappears there. A reversed mark is the
  treatment Vercel's own brand guidelines specify for dark backgrounds.
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Vercel's own OpenAPI
document (`https://openapi.vercel.sh/`, 279 paths), Vercel's REST API docs, and
live probes of `api.vercel.com`, `api.vercel.com/oauth/*` and
`www.vercel-status.com`. Status surfaces move; re-check if a probe starts
failing for everyone at once.
