# Okta

Manage Okta users and groups — identity lifecycle for an org.

- **Categories** — security
- **Auth methods** — api-token
- **Actions** — 11
- **Egress allowlist** — `*.okta.com`, `*.oktapreview.com`

## Setup

1. In the Okta Admin Console, go to **Security → API → Tokens** and create a token. The token
   inherits the permissions of the admin who created it.
2. Note your org's full domain — the URL you use to sign in, e.g. `dev-12345.okta.com` for a
   developer org, or `acme.okta.com` for production. Sandbox orgs end in `.oktapreview.com`.
3. Create the connection with that domain and the token.

## Auth — API Token (`api-token`)

Okta's proprietary `SSWS` scheme: a static token sent as `Authorization: SSWS <token>`, distinct
from an OAuth 2.0 bearer token
([reference](https://developer.okta.com/docs/reference/core-okta-api/)).

The connection has two fields:

| Field | What it is |
|---|---|
| `domain` | The org's **full** Okta domain — not just the org name. Every org is its own host, so this identifies which org every request goes to. Validated against `*.okta.com` / `*.oktapreview.com`, matching the egress allowlist. |
| `apiToken` | The token from Security → API → Tokens. |

The domain is collected once at connect time rather than re-entered per action, because it
identifies the *account*, not the operation — the same pattern Zendesk uses for its subdomain.
`afterConnect` records it on the connection's display data, which `lib/client.ts` reads to build
every request URL.

## Actions

### Users

| Key | Type | Description |
|---|---|---|
| `user-list` | search | List users, filtered by name/email prefix or a SCIM-style filter expression. |
| `user-get` | read | Fetch a user by id or login. |
| `user-create` | perform | Create a user profile. |
| `user-update` | perform | Partially update a user's profile (only the fields you set are touched). |
| `user-deactivate` | perform | Deactivate a user — unwinds all app assignments and group memberships. Cannot be undone. |
| `user-reactivate` | perform | Restart activation for a user stuck in `PROVISIONED`/`RECOVERY`. Not the inverse of Deactivate. |
| `user-list-apps` | search | List every app assigned to a user, directly or via group membership (`appLinks`). |

### Groups

| Key | Type | Description |
|---|---|---|
| `group-list` | search | List groups, optionally filtered by name. |
| `group-get` | read | Fetch a group by id. |
| `group-add-user` | perform | Add a user to a group. No-op if already a member. |
| `group-remove-user` | perform | Remove a user from an Okta-native group. Not valid for app-imported or built-in groups. |

Endpoints verified against Okta's own REST reference
(`https://developer.okta.com/docs/reference/api/users/` and `.../groups/`) and cross-checked
against n8n's `Okta` node, which covers only the user resource — the group and app-link actions
here have no n8n precedent and were sourced from Okta's docs directly.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second and third are
something this app performs.

### Is the vendor up?

**Service status** — <https://status.okta.com>

No JSON API or Atom/RSS feed was found — the page embeds incident and uptime data as
page-specific JSON inside the HTML (Salesforce-shaped field names), not a stable machine-readable
format. Declared `unavailable` rather than scraped.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check derived automatically.

`api-token` probes:

```
GET /api/v1/users?limit=1
```

Okta's management API has no unauthenticated `/users/me` (the token identifies an admin, not a
session subject), so the cheapest genuinely authenticated call is the same one `user-list` makes
with the smallest possible page.

### Do we have quota left?

`x-rate-limit-limit`, `x-rate-limit-remaining` and `x-rate-limit-reset` response headers (reset is
UTC epoch **seconds**, not a delta like some vendors use). Okta layers a per-endpoint cap on top
of an org-wide one — [reference](https://developer.okta.com/docs/reference/rate-limits/).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

**`service` is declared absent.** status.okta.com has no JSON API and no Atom/RSS feed — its
incident and uptime data is embedded as page-specific JSON inside the HTML, not published as a
stable machine-readable format. Credential liveness is covered by the derived `auth:api-token`
check instead. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

---

Researched and endpoint-verified 2026-07-31 against Okta's own developer documentation and the
n8n `Okta` node. Status surfaces move; re-check if a probe starts failing for everyone at once.
