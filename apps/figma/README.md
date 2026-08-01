# Figma

Read Figma files, nodes, images, comments, projects and versions via the Figma REST API.

- **Categories** — productivity, developer-tools
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 10
- **Egress allowlist** — `api.figma.com`
- **API docs** — https://developers.figma.com/docs/rest-api/

## Actions

All paths are relative to `https://api.figma.com`.

| Key | Resource | Method + path |
|---|---|---|
| `get-file` | file | `GET /v1/files/{file_key}` |
| `get-file-nodes` | file | `GET /v1/files/{file_key}/nodes` |
| `get-file-versions` | file | `GET /v1/files/{file_key}/versions` |
| `get-images` | image | `GET /v1/images/{file_key}` |
| `list-comments` | comment | `GET /v1/files/{file_key}/comments` |
| `post-comment` | comment | `POST /v1/files/{file_key}/comments` |
| `delete-comment` | comment | `DELETE /v1/files/{file_key}/comments/{comment_id}` |
| `get-team-projects` | project | `GET /v1/teams/{team_id}/projects` |
| `get-project-files` | project | `GET /v1/projects/{project_id}/files` |
| `get-current-user` | user | `GET /v1/me` |

Figma is a read-heavy API: only `post-comment` and `delete-comment` mutate anything. There is
no general-purpose "write to a file" endpoint — the REST API does not let a client edit a
file's design content, only its comments.

`get-images` renders nodes on demand (PNG/JPG/SVG/PDF) and returns URLs that expire after 30
days — treat them as short-lived, not a permanent asset store. `get-file-versions` paginates
via a cursor URL under `pagination.next_page` / `.prev_page` rather than a documented
page-size query param, so the action passes the raw response through for a caller to follow.

## Auth

Two credential types:

- **personal-access-token** (`apiKey`, header `X-Figma-Token`) — generate one under Figma →
  Settings → Security → Personal access tokens, choosing the scopes it needs. Figma's REST
  API does not use a `Bearer` scheme for this credential type.
- **oauth2** (`Authorization: Bearer <accessToken>`) — a Figma app OAuth flow (client
  credentials live on the w6w server). Authorize at `https://www.figma.com/oauth`, exchange
  and refresh against `api.figma.com`. Figma separates scopes with a **space** and supports
  PKCE (S256) as an optional hardening on top of the confidential client exchange.

Both credential types select scopes explicitly (at token/app-registration time), so a
narrowly-scoped credential can legitimately lack a scope some action needs — that surfaces as
a 403 from Figma, not a bug in this app.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.figma.com/api/v2/summary.json
```

Verified live 2026-07-31: returns `{ status: { indicator }, components: [...], ... }`, the
same shape used by Statuspage-hosted vendors elsewhere in this pack. The top-level
`status.indicator` (`none`/`minor`/`major`/`critical`) drives the rollup; each component maps
through the Statuspage vocabulary.

The check is unsigned (`credential: "none"`) and `status.figma.com` is reachable **only
inside this hook's worker** — deliberately absent from `w6w.network.allow`, so no action can
call it and no credential can ever reach the status host.

### Is this credential live?

This is what each Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself. Both methods probe:

```
GET /v1/me
```

Figma's REST API has no unauthenticated ping endpoint, so this is the cheapest available
"who am I" call. It requires the `current_user:read` scope, which a credential minted for
file/comment access alone may not carry — `test` reports that honestly as a failure rather
than assuming every credential can call it.

### Do we have quota left?

**Not declared.** Verified against Figma's rate-limits documentation: rate-limit headers
(`Retry-After`, `X-Figma-Plan-Tier`, `X-Figma-Rate-Limit-Type`, `X-Figma-Upgrade-Link`) are
only returned on an already-thrown `429`, never on a successful response. There is nothing a
healthy request could read that answers "how much headroom is left before that happens", so
this app declares the check `unavailable` instead of probing something that proves nothing.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | — | — | informational | — | `unavailable` — see above |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.figma.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-31 against `developers.figma.com/docs/rest-api/`
and `status.figma.com`. Status surfaces move; re-check if a probe starts failing for everyone
at once.
