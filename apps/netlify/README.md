# Netlify

Consume Netlify API

- **Categories** — devops
- **Auth methods** — personal-access-token
- **Actions** — 10
- **Egress allowlist** — `api.netlify.com`
- **Website** — https://www.netlify.com
- **API docs** — https://docs.netlify.com/api/get-started/

## Auth methods

Only **Personal Access Token** (`Authorization: Bearer <token>`) is implemented. Netlify's own
docs describe this as the standard way to authenticate machine calls to the API: "Authorization:
Bearer <YOUR_PERSONAL_ACCESS_TOKEN>", minted at User settings → Applications → New access token.

**OAuth2 was deliberately left out.** Netlify does document an authorize endpoint for third-party
apps (`https://app.netlify.com/authorize`), but its token-exchange endpoint is not published in
Netlify's own docs or its OpenAPI spec — the only pointer is a 2016 blog post that gestures at "the
typical OAuth2 flow" without naming the URL. Rather than guess a token endpoint, this app ships
PAT-only. Add `oauth2` as a second auth method once Netlify documents (or a maintainer confirms) the
token URL.

Personal access tokens carry no scopes — a token is either valid for the whole account or invalid —
so there is no scoped-down alternative to model, unlike Cloudflare's API Tokens.

## Actions

| Key | Type | Resource | Description |
|---|---|---|---|
| `site-list` | read | site | List sites this token can see |
| `site-get` | read | site | Get details for a single site by ID |
| `deploy-create` | perform | deploy | Trigger a new deploy for a site (rebuilds from the linked Git repo) |
| `deploy-list` | read | deploy | List deploys for a site |
| `deploy-get` | read | deploy | Get details for a single deploy by ID |
| `deploy-cancel` | perform | deploy | Cancel an in-progress deploy |
| `env-var-list` | read | env-var | List environment variables for an account, optionally scoped to one site |
| `env-var-set` | perform | env-var | Create or update an environment variable's value for one deploy context |
| `form-list` | read | form | List forms detected on a site |
| `form-submission-list` | read | form-submission | List submissions across all of a site's forms |

All endpoints and schemas below are verified against Netlify's own OpenAPI spec
(`https://open-api.netlify.com/swagger.json`) as of 2026-08-01, cross-checked against
`https://docs.netlify.com/api/get-started/` and n8n's `nodes-base/nodes/Netlify` implementation.

### `deploy-create` triggers a rebuild — it does not upload files

`POST /sites/{site_id}/deploys` documents two ways to supply deploy content: a `files` hash
(paths → SHA1 digests) or a `zip` upload. Modeling either as a generic form is out of scope — same
call as Cloudflare's `dns-record-create`, which exposes the common subset rather than every shape
the API accepts. Posting with neither, for a site connected to a Git repo, rebuilds from the repo's
current HEAD: the same effect as clicking "Trigger deploy" in the Netlify UI. That covers the
common workflow-automation case (kick off a redeploy on some other event) without the app needing
to accept arbitrary file uploads. This action sends only the fields the spec documents outside file
content: `branch` (body) and `title` (query param — confirmed as a separate query parameter, not a
body field, directly from the OpenAPI spec).

### `deploy-get` and `deploy-cancel` are not site-scoped

The OpenAPI spec documents both `GET /deploys/{deploy_id}` (`operationId: getDeploy`) and
`POST /deploys/{deploy_id}/cancel` (`operationId: cancelSiteDeploy`, despite the name) as taking
only a `deploy_id` — no `site_id` in the path. This was cross-checked directly against the spec
because n8n's own node calls the same two paths, but a naive read of Netlify's docs UI can suggest
the site-scoped form (`/sites/{site_id}/deploys/{deploy_id}`) exists for the same purpose; that path
does exist for `GET`/`PUT`/`DELETE` but not `cancel`.

### `env-var-set` exposes the single-variable, single-context case

`POST /accounts/{account_id}/env` (`createEnvVars`) takes an array of `{ key, is_secret, values[] }`
objects so several variables — each with several per-context values — can be created in one call.
This action models the common case an automation reaches for: one key, one value, one context
(defaulting to `all`). Posting the same key again updates its value for that context, which is why
this reads as "set" rather than only "create". The batch/multi-context form is left for a future
action if a use case needs it.

### `env-var-list` / `env-var-set` require an Account ID, not just a Site ID

Netlify's environment-variable endpoints are namespaced under `/accounts/{account_id}/env`, not
under a site. `site_id` is an optional *filter*/*target* query param on top of that, not a
replacement path. The account ID (or slug) is visible in the Netlify dashboard URL
(`app.netlify.com/teams/<slug>/...`) or via `GET /accounts` (not modeled here — out of scope, one
call per Connection setup rather than a recurring action).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs directly on demand — the credential check is derived automatically from the
auth method's `test` hook.

### Is the vendor up?

**Service status** — <https://www.netlifystatus.com>

```
GET https://www.netlifystatus.com/api/v2/summary.json
```

Atlassian Statuspage (the page footer reads "Powered by Atlassian Statuspage" — the same platform
Cloudflare and SendGrid use). `GET /api/v2/summary.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`) plus per-component detail.
Unauthenticated, and verified live 2026-08-01.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /user
```

Netlify's whoami (`operationId: getCurrentUser`). A personal access token carries no scopes to
legitimately lack, so this needs no site or account context — cheaper than n8n's own credential
test, which calls `GET /sites` (a page of data) just to prove liveness.

### Do we have quota left?

`X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` response headers, documented at
<https://docs.netlify.com/api/get-started/#rate-limiting>:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 56
X-RateLimit-Reset: 1372700873
```

`X-RateLimit-Reset` is Unix seconds (an absolute timestamp), not a delta — unlike Cloudflare's
newer `RateLimit`/`RateLimit-Policy` draft-syntax headers. Netlify's documented platform-wide cap is
500 requests/minute for most calls, with stricter limits on deploy operations specifically
(3/minute, 100/day) that these headers do not distinguish from the general bucket.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |

The host `www.netlifystatus.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely because
the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time,
so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against `docs.netlify.com` (official docs),
`open-api.netlify.com/swagger.json` (official OpenAPI spec, fetched and cross-checked directly), and
n8n's `nodes-base/nodes/Netlify` / `credentials/NetlifyApi.credentials.ts` (auth scheme + a
structural cross-check that surfaced the `deploy-cancel` / `deploy-get` path discrepancy above).
Status surfaces and deprecations move; re-verify if a probe starts failing for everyone at once.
