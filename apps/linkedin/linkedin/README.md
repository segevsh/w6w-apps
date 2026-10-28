# LinkedIn

Post to LinkedIn and read member/organization info via LinkedIn's versioned Posts API.

- **Categories** — social-media, marketing
- **Auth methods** — oauth2, oauth2-community-management
- **Actions** — 6
- **Egress allowlist** — `api.linkedin.com`
- **Website** — https://www.linkedin.com
- **API docs** — https://developer.linkedin.com/

## Access is the whole story here

LinkedIn's third-party API is narrow by design, and what's reachable splits sharply by which
LinkedIn Developer Products your app has:

| Product | Review needed? | Unlocks |
|---|---|---|
| Sign In with LinkedIn using OpenID Connect | No | Reading your own profile |
| Share on LinkedIn | No | Posting/deleting as yourself (`w_member_social`) |
| Community Management API | **Yes, LinkedIn approval required** | Posting as an organization, listing/reading posts, organization lookup |

That split is why this app declares **two** OAuth2 auth methods instead of one broader one.
LinkedIn's authorization endpoint rejects the *entire* request if any requested scope isn't
granted to your app (`unauthorized_scope_error`) — bundling Community Management scopes into
the default method would break connecting for every app that only has the two free products.
This mirrors how n8n's `LinkedIn` node splits `linkedInOAuth2Api` from
`linkedInCommunityManagementOAuth2Api`.

Actions that need Community Management access are marked below. Calling one with a Connection
made through the standard `oauth2` method returns `403` — that's LinkedIn's own scope check,
not a bug in this app.

## Auth

### `oauth2` — OAuth (Sign in with LinkedIn)

The default. Works with any LinkedIn Developer app that has the free "Sign In with LinkedIn
using OpenID Connect" and "Share on LinkedIn" products added — no review needed.

- Authorization URL: `https://www.linkedin.com/oauth/v2/authorization`
- Token URL: `https://www.linkedin.com/oauth/v2/accessToken`
- Scopes: `openid`, `profile`, `email`, `w_member_social`
- PKCE: off — LinkedIn's documented authorization/token requests carry no
  `code_challenge`/`code_verifier` parameter anywhere.

**Token lifetime — read this before connecting.** LinkedIn issues a 60-day access token and,
for a standard app, **no refresh token**. There is no silent renewal: when the token expires,
the Connection breaks and reconnecting means running the OAuth flow again. Programmatic
refresh tokens (access token 60 days, refresh token ~1 year, renewed automatically) exist only
for apps LinkedIn has separately approved for the Marketing Developer Platform program — not
guaranteed by Community Management API access alone. This app declares no custom `refresh`
hook either way: when a refresh token is present the runtime's built-in handler renews it
against the token URL; when it isn't, there's nothing to refresh.

### `oauth2-community-management` — OAuth (Community Management)

For posting as an organization or reading organization/post data. Requires a LinkedIn
Developer app **approved for the Community Management API** product — connecting with an
app that lacks it fails at the authorization step, not at call time.

- Same authorization/token URLs as above.
- Scopes: `openid`, `profile`, `email`, `w_member_social`, `w_organization_social`,
  `r_organization_social`, `rw_organization_admin`.

Both methods probe `GET /v2/userinfo` (OpenID Connect userinfo) for `test` — the narrowest
endpoint either scope set can reach, and needs no object-level permission.

## Actions

| Key | Type | Needs Community Management? | Notes |
|---|---|---|---|
| `create-post` | perform | Only to post **as an organization** | Text or article post. See below re: images. |
| `get-post` | read | No | Fetch by `urn:li:share:...` / `urn:li:ugcPost:...`. |
| `delete-post` | perform | No | Idempotent — LinkedIn documents replayed deletes as a no-op `204`. |
| `list-posts-by-author` | read | For an organization author | Person-author listing needs `r_member_social`, itself restricted to approved partners regardless of product. |
| `get-current-member-profile` | read | No | `GET /v2/userinfo` — also how you find your own member id for `authorId`. |
| `get-organization` | read | Yes | `GET /rest/organizations/{id}`; caller needs the `ADMINISTRATOR` role on that page. |

### What's deliberately not here

- **Image or video posts.** Attaching media means a two-step upload: register
  (`POST /rest/images?action=initializeUpload`), then `PUT` the binary to the `uploadUrl` LinkedIn
  returns — a per-request presigned host that isn't `api.linkedin.com` and can't be known ahead
  of time. This app's sandbox egress allowlist (`w6w.network.allow`) is static, so that upload
  step is out of reach. `create-post`'s article variant still accepts an already-uploaded
  `urn:li:image:...` as a thumbnail if you have one.
- **Post analytics / share statistics.** LinkedIn's `organizationalEntityShareStatistics` and
  related endpoints sit behind the Advertising API / Marketing Developer Platform tier — a
  materially heavier approval bar than Community Management API. Left out rather than invented.
- **Legacy profile scopes** (`r_liteprofile`, `r_basicprofile`). Deprecated by LinkedIn in favor
  of the OpenID Connect `profile` scope this app uses.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**API status** — <https://www.linkedin-apistatus.com/>

```
GET https://www.linkedin-apistatus.com/api/v2/summary.json
```

LinkedIn's own developer API status page, on Atlassian Statuspage (confirmed live 2026-07-26 —
`GET /api/v2/summary.json` returns the standard Statuspage rollup shape, unauthenticated). This
is distinct from `linkedin-status.com`, a generic consumer-site uptime tracker not run by
LinkedIn's developer org.

### Is this credential live?

This is what each Auth method's `test` hook does — the app's own health check, and the only
one of the three it performs itself. Both `oauth2` and `oauth2-community-management` probe:

```
GET https://api.linkedin.com/v2/userinfo
```

Deliberately the OIDC userinfo endpoint rather than a `/rest/` call — it needs only the
`openid`/`profile` scopes both auth methods request, so it works regardless of which one
connected, and it isn't inside `w6w.network.allow`-restricted `/rest/` territory an action
would use for anything scope-heavier.

### Do we have quota left?

Nothing to read. LinkedIn's own docs (Error Handling, Rate Limits) confirm usage against your
app's daily limits is visible only in the Developer Portal's Analytics tab — no
`X-RateLimit-*` (or equivalent) response header is documented anywhere in the REST API
reference. Declared `unavailable` rather than invented; see `health/quota.ts`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed (n/a — `unavailable`) | informational | — | none — declared absent |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from `oauth2`'s `test` hook |
| `auth:oauth2-community-management` | credential | connection | signed | fatal | — | derived from `oauth2-community-management`'s `test` hook |

The host `www.linkedin-apistatus.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-31 against LinkedIn's own developer documentation
(`learn.microsoft.com/en-us/linkedin/...`). API versions and status surfaces move — LinkedIn
deprecates each `LinkedIn-Version` roughly 12 months after release, so bump `API_VERSION` in
`lib/client.ts` periodically.
