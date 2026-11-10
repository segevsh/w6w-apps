# Auth0

Manage an Auth0 tenant from a workflow — users, roles, organizations,
connections, applications and the tenant log — through the Management API v2.

- **Categories** — security, developer-tools
- **Auth methods** — client-credentials
- **Actions** — 18
- **Triggers** — 8 (poll)
- **Egress allowlist** — `*.auth0.com`
- **Website** — https://auth0.com
- **API docs** — https://auth0.com/docs/api/management/v2

Auth0 publishes no fetchable OpenAPI document, so paths came from its reference
documentation and every one this app calls was verified to route against a live
Auth0 domain on 2026-08-18 — each answering `401 {"statusCode":401,"error":
"Unauthorized","message":"Missing authentication"}` rather than a 404.

## Setup

1. Auth0 Dashboard → **Applications** → create a **Machine to Machine**
   application.
2. Authorise it for the **Auth0 Management API**, and grant it the scopes the
   actions you plan to use need (`read:users`, `update:users`, `read:roles`,
   `read:logs`, …).
3. Paste its Client ID and Secret, plus the **canonical tenant domain** —
   `acme.us.auth0.com`, including the region.

### Two things about the credential

**The audience is what makes it a Management API token.** A token minted
without `audience: https://{domain}/api/v2/` is an *Authentication* API token,
and the Management API rejects it. This app derives the audience from the
domain, because it is a restatement of the tenant rather than a choice.

**Scopes are granted, not requested.** A machine-to-machine application is
authorised for specific scopes in the dashboard and its token carries exactly
those. Asking for a scope it was not granted fails the *whole token request*;
asking for none yields everything it has. So this app requests no scopes, and a
permission problem shows up as a `403` on one endpoint — which the error message
names as a dashboard grant rather than blaming the credential.

### Custom domains are deliberately unsupported

A tenant can front its *Authentication* API with `auth.acme.com`. Accepting an
arbitrary hostname here would mean widening this app's egress to `*` on the
strength of something a user typed, and the canonical
`{tenant}.{region}.auth0.com` always works for the Management API. A custom
domain is refused at connect time with that explanation, rather than failing
later at the sandbox with an opaque error.

## Two silent limits on reading users

Both are Auth0's own documented behaviour, and both fail quietly:

### 1. `GET /users` is eventually consistent

Auth0's words: *"The Management API's List or Search Users endpoint
(`GET /users`) is eventually consistent, so results may not immediately reflect
recently-completed write operations."*

A workflow that creates a user and then searches for it can legitimately not
find it — and will conclude the create failed.

### 2. Search returns at most 1,000 users

*"even if more users match your query"* — no error, no flag; the
thousand-and-first is simply absent.

**`user-get` and `user-get-by-email` are the immediately-consistent
alternatives**, and this app points at them wherever the distinction matters.
`user-list` always requests totals so it can at least *tell* you the ceiling was
hit, which Auth0 will not, and logs a warning when it was.

## Actions

| Key | Type | Description |
|---|---|---|
| `user-get` | read | One user by id — immediately consistent |
| `user-get-by-email` | read | By address, consistently. Returns an **array** |
| `user-list` | search | Lucene search — eventually consistent, capped at 1,000 |
| `user-create` | perform | Create in a database connection |
| `user-update` | perform | Profile, metadata, or **block** them |
| `user-delete` | perform | Permanent — usually not what you want |
| `user-role-list` | read | Roles assigned at the tenant level |
| `user-role-assign` | perform | Grant roles by `rol_…` id |
| `user-role-remove` | perform | Revoke them |
| `role-list` | read | The tenant's roles, mapping names to ids |
| `password-change-ticket` | perform | A one-time URL for the user to set their own |
| `verification-email-send` | perform | Queue the address-verification email |
| `organization-list` | read | Organizations — Auth0's B2B unit |
| `organization-member-list` | read | Members, with their roles in that org |
| `organization-member-add` | perform | Add existing users to one |
| `connection-list` | read | Identity sources and their strategies |
| `client-list` | read | Applications, **without** their secrets |
| `log-list` | read | Logins, failures and admin changes |

## Things worth knowing

### An email is not a key

`user-get-by-email` returns an **array**, and more than one entry is normal: the
same address in a database connection and in a Google connection is **two
users** with two ids. A workflow that takes `[0]` is picking one arbitrarily —
which one is right depends on the connection, in each result's `identities`.

The id itself carries the connection as a prefix (`auth0|…`, `google-oauth2|…`,
`samlp|…`), which is also why a user cannot be "moved" between connections.

### Block, don't delete

| | `user-update` with `blocked` | `user-delete` |
|---|---|---|
| Reversible | **Yes** | No |
| Audit trail | Kept | Gone |
| Email address | Still taken | **Freed for a new signup** |
| Live tokens | Not revoked | **Not revoked** |

The last row surprises people: deleting a user does **not** revoke tokens
already issued to them, so a delete alone does not end access — which is exactly
what an offboarding workflow tends to think it is doing. And freeing the email
means a fresh signup creates a *new* user with a *new* id, so anything holding
the old id silently points at nothing while the person appears to still be
there.

`user-delete` therefore requires an explicit confirmation and points at
blocking.

### Two levels of "who has access"

A role assigned at the **tenant** means something everywhere. A role assigned
inside an **organization** means something for one customer. They are separate,
and `user-role-list` does not see the second — so an audit reading only one of
them is wrong in a way that looks complete. `organization-member-list` with
roles included is the other half.

Membership is also not permission: `organization-member-add` puts somebody in an
organization, and granting them a role *within* it is a further call.

### Metadata: who may edit what

- **`user_metadata`** — data the *user* may change about themselves.
- **`app_metadata`** — data the *application* controls; the user cannot edit it.

Putting an entitlement in `user_metadata` is the mistake this distinction exists
to prevent: it ends up editable by the person it restricts.

On update, both are merged **at the top level only** — a key whose value is an
object is *replaced*, not merged recursively, so sending
`{"preferences":{"theme":"dark"}}` to a user whose preferences also held
`language` loses the language. Setting a top-level key to `null` deletes it.

### Passwords the workflow never sees

`password-change-ticket` mints a URL for the user to set their own password.
Given an `email` and a `connection` rather than a user id, it also works for
somebody who **does not exist yet** — Auth0 creates them when the ticket is used,
which turns "invite somebody" into one call and leaves no half-made user behind
if the invitation is never accepted.

The URL is itself a **bearer credential** for that account until it expires or is
used: it should not be logged, stored, or posted anywhere durable. Its lifetime
is a first-class parameter for that reason, and this app never logs the response.

### Client secrets are excluded from the request

`client-list` sends an explicit `fields` allow-list that omits `client_secret`,
so Auth0 never returns it at all. That is a narrower promise than trusting
nobody to print the response — and a test asserts the field list.

### Reading the log continuously

`log-list` has two pagination models and only one works past 1,000 entries.
Ordinary `page`/`per_page` is capped; **checkpoint pagination** — passing the
last entry's `log_id` as `from`, with `take` — has no ceiling and guarantees no
gaps and no repeats, because the sort order is fixed under it.

That makes it the right shape for a recurring job: store `lastLogId`, pass it
next run. The action returns it for exactly that purpose.

The `type` codes are short and opaque, and are how a security workflow filters:
`s` successful login, `f` failed, `fp` failed password, `ss` successful signup,
`sapi` successful Management API operation, `limit_wc` blocked account. Retention
is by plan and short on lower tiers — a log workflow reads a window, not an
archive.

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-log` — New Tenant Log | Poll | `log-list` | Each new tenant log entry |
| `new-user` — New User | Poll | `user-list` | Each user newly created in the tenant |
| `new-client` — New Application | Poll | `client-list` | Each application newly created |
| `new-connection` — New Connection | Poll | `connection-list` | Each connection newly created |
| `new-organization` — New Organization | Poll | `organization-list` | Each organization newly created |
| `new-role` — New Role | Poll | `role-list` | Each role newly created |
| `new-organization-member` — New Organization Member | Poll | `organization-member-list` | Each user who joins the organization you pick (`organizationId`) |
| `new-user-role` — Role Assigned to User | Poll | `user-role-list` | Each tenant-level role newly assigned to the user you pick (`userId`) |

`new-log` and `new-user` poll newest-first (`sort=date:-1` and `sort=created_at:-1`); the first check records
what exists without firing and later checks emit only unseen ids. The user index is eventually consistent,
so a user can show up a little after it was created. The other Management API lists document no order, so
each trigger reads the whole list (pages of 100, one row past 5000) and fires on ids not seen before; a list
longer than 5000 rows fails the check with an error naming the cap.

Not covered: none of the listed actions is skipped.

Sources (verified 2026-11-10): [Get logs](https://auth0.com/docs/api/management/v2/logs/get-logs),
[List or search users](https://auth0.com/docs/api/management/v2/users/get-users) (`sort=created_at:1|-1`),
[Get clients](https://auth0.com/docs/api/management/v2/clients/get-clients),
[Get connections](https://auth0.com/docs/api/management/v2/connections/get-connections),
[Get organizations](https://auth0.com/docs/api/management/v2/organizations/get-organizations),
[Get roles](https://auth0.com/docs/api/management/v2/roles/get-roles),
[Get organization members](https://auth0.com/docs/api/management/v2/organizations/get-members),
[Get user roles](https://auth0.com/docs/api/management/v2/users/get-user-roles).

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Declared absent — see below |
| `tenant` | dependency | Can **this connection** reach its tenant? |

`service` is a **declared absence**, and the reason is worth recording.
`status.auth0.com` is not a Statuspage instance: it serves an HTML application
and answers a 404 page for `/api/v2/components.json`, `/api/v2/summary.json`,
`/incidents.json` and every RSS path tried.

What it *does* have, found by probing, is a **per-tenant RSS feed**:

```
GET https://status.auth0.com/api/rss?domain=acme.us.auth0.com
→ 200 application/rss+xml   <title>Auth0 Status - acme.us.auth0.com</title>
```

Without the parameter it answers `Domain is required.`; with a malformed one it
answers with the format spelled out. That granularity is exactly right — Auth0
runs many regional environments and a tenant lives in one — but a feed-backed
check declares a **static** `feed.url` so the host can fetch and parse it, and
this URL carries the tenant. Wiring it up would mean this app parsing RSS
itself, which is precisely the duplication the declared-feed mechanism exists to
prevent.

`tenant` answers the operational question directly instead, and per connection.
It reads one user from this tenant, catching what neither a status page nor a
credential test would:

- a **renamed or deleted tenant** answers `404` from a hostname that still
  resolves;
- a **revoked Management API grant** answers `403` while every credential
  remains valid — reported as `degraded`, not `down`, because it breaks the user
  actions and leaves roles, organizations and logs working;
- an **unrefreshed token** answers `401`, which it reports as `unknown` and
  leaves to the derived credential check.

## What this app deliberately does not do

- **Tenant settings, email providers, custom domains, actions and rules.**
  Changing how a tenant authenticates is a deploy, not a workflow step.
- **Bulk user import/export jobs.** They exchange files, and the file is the
  point.
- **Guardian / MFA enrolment management**, where a wrong call locks somebody out
  of their own account.
- **The Authentication API.** This app administers a tenant; it does not log
  anybody in.
