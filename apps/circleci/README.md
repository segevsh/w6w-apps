# CircleCI

Consume CircleCI API

- **Categories** — devops, developer-tools
- **Auth methods** — api-token
- **Actions** — 8
- **Egress allowlist** — `circleci.com`

## Auth methods

Only **Personal API Token** (`Circle-Token: <token>`, no prefix) is implemented. CircleCI's own API
v2 docs describe this as the standard way to authenticate every request; tokens are minted at
User settings → Personal API Tokens (`app.circleci.com/settings/user/tokens`).

**No other auth method was added.** CircleCI also supports project-scoped API tokens (created and
scoped per-project rather than per-user) and, for orgs integrated through GitHub/Bitbucket, an OAuth
app flow for third-party integrations — but neither has a stable, generically-documented
authorize/token URL suitable for a portable Connection here, the same reasoning this pack already
applied to Netlify's PAT-only auth. Personal API tokens are not scoped, so there is no narrower
alternative to model.

## Actions

| Key | Type | Resource | Description |
|---|---|---|---|
| `pipeline-trigger` | perform | pipeline | Trigger a new pipeline for a project |
| `pipeline-get` | read | pipeline | Get details for a single pipeline by its project-relative number |
| `pipeline-list` | read | pipeline | List the pipelines for a project |
| `workflow-list` | read | workflow | List the workflows that ran under a pipeline |
| `workflow-get` | read | workflow | Get details for a single workflow by its ID |
| `workflow-cancel` | perform | workflow | Cancel a running workflow |
| `job-list` | read | job | List the jobs that ran under a workflow |
| `job-get` | read | job | Get details for a single job by its project-relative number |

All endpoints are verified against CircleCI's own official API v2 reference
(`https://circleci.com/docs/api/v2/`) as of 2026-08-01, cross-checked against n8n's
`nodes-base/nodes/CircleCi` implementation (which independently confirms the `Circle-Token` header
and the `/project/{project-slug}/pipeline` shape, though it only implements the pipeline resource).

### `projectSlug` carries its slashes unencoded

Every project-scoped action takes a `projectSlug` of the form `vcs-slug/org-name/repo-name` (e.g.
`gh/CircleCI-Public/api-preview-docs`) — `vcs-slug` is `gh` (GitHub), `bb` (Bitbucket), or `circleci`
(GitHub App / GitLab integrations). CircleCI's own docs and examples embed this directly in the path
with its slashes intact (`GET /project/gh/org/repo/pipeline`), unlike n8n's node, which
percent-encodes them (`%2F`) before substitution — both work against CircleCI's router, but the
unencoded form matches the API reference exactly, so that's what `lib/client.ts`'s
`requireProjectSlug` produces.

### `pipeline-trigger` sends `branch` XOR `tag`, plus `parameters`

`POST /project/{project-slug}/pipeline` documents `branch` and `tag` as mutually exclusive — both
select the revision the pipeline builds from — and an optional `parameters` object matching
parameters declared in the project's `.circleci/config.yml` (capped by the API at 100 entries,
128-char keys, 512-char values; this action passes the object through as given rather than
enforcing those caps itself). Supplying neither triggers the project's default branch.

### `workflow-list` and `job-list` take an ID, not a project slug

`GET /pipeline/{pipeline-id}/workflow` and `GET /workflow/{id}/job` are addressed by the pipeline's
or workflow's UUID (the `id` field returned by `pipeline-get`/`pipeline-list`/`pipeline-trigger` and
`workflow-list`/`workflow-get` respectively) — not by project slug and not by the human-facing
pipeline/job number. `job-list`'s response carries each job's `job_number`, which is what `job-get`
needs.

### `job-get` is project-scoped, not by global job ID

CircleCI's API v2 documents two ways to fetch a job: `GET /jobs/{job-id}` (a global UUID) and
`GET /project/{project-slug}/job/{job-number}` (project-scoped, keyed by the human-facing number
shown in the CircleCI UI and returned by `job-list`). This action uses the project-scoped form,
consistent with every other project-scoped action in this app.

## Health check

Two different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, and is *this credential* live. Only the second is something the app itself performs
directly on demand — the credential check is derived automatically from the auth method's `test`
hook. No `quota` check is declared; see below.

### Is the vendor up?

**Service status** — <https://status.circleci.com>

```
GET https://status.circleci.com/api/v2/summary.json
```

Atlassian Statuspage (the same platform Netlify, Cloudflare and SendGrid use — verified by the
response shape matching the Statuspage v2 API). `GET /api/v2/summary.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`) plus per-component detail.
Unauthenticated, and verified live 2026-08-01.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
RFC questions it performs itself.

```
GET /me
```

CircleCI's whoami. A personal API token is not scoped, so this needs no project or org context.

### Do we have quota left? — not declared

CircleCI's API v2 docs document a `429` response for rate limiting on many endpoints, but publish no
response headers (no `X-RateLimit-*`, no `RateLimit-*`, nothing else) that would let this app read
remaining headroom ahead of a 429 — unlike Netlify (`X-RateLimit-*`) or Eventbrite
(`X-Rate-Limit-*`). Rather than invent a probe against a number CircleCI does not expose,
`health/quota.ts` declares the check `unavailable` with `severity: "informational"`, so it never
worsens a roll-up verdict and never pins one at `unknown`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed (n/a) | informational | — | declared `unavailable` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

The host `status.circleci.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against `circleci.com/docs/api/v2/` (official API
reference) and n8n's `nodes-base/nodes/CircleCi` / `credentials/CircleCiApi.credentials.ts` (auth
scheme cross-check — `Circle-Token` header, no prefix). Status surfaces and deprecations move;
re-verify if a probe starts failing for everyone at once.
