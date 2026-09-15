# Clerk

Manage a Clerk instance from a workflow — users, organizations, memberships, invitations,
sessions, and sign-in tokens — through the **Backend API**.

- **Categories** — security, developer-tools
- **Auth methods** — secret-key
- **Actions** — 30
- **Health checks** — 2 (`service`, `instance`) + the derived `auth:secret-key`
- **Egress allowlist** — `api.clerk.com` (the `service` check adds `status.clerk.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://clerk.com
- **API docs** — https://clerk.com/docs/reference/backend-api
- **OpenAPI** — https://github.com/clerk/openapi-specs (`bapi/2026-05-12.yml`)
- **Status page** — https://status.clerk.com

Everything below was verified against Clerk's own machine-readable OpenAPI spec
([`clerk/openapi-specs`](https://github.com/clerk/openapi-specs), `bapi/2026-05-12.yml`, 750,445
bytes) and against live probes of `api.clerk.com` and `status.clerk.com`, both on 2026-09-15. No
third-party integration directory was used.

Clerk is a user authentication and management platform. This app drives its **Backend API** — the
server-to-server surface for managing an instance's data, distinct from the **Frontend API** (what
a Clerk-powered app's own client SDK calls to actually sign users in) and from Clerk's client
components. Frontend-API concepts — sign-in/sign-up flows, browser session cookies — are out of
scope here; this is an admin/management app.

## Setup

1. Clerk Dashboard → **Configure** → **API Keys** → copy a **Secret Key** (`sk_live_…` or
   `sk_test_…`).
2. Paste it into the Connection. There is nothing else to configure — a Secret Key is presented as
   a plain bearer token, with no exchange step and no expiry to refresh.

Unlike a platform that keys an integration off a per-tenant subdomain (Auth0's
`{tenant}.{region}.auth0.com`), **every Clerk instance is reached at the same host**,
`https://api.clerk.com/v1`. The Secret Key alone says which instance a call lands on.

## Two things in Clerk's own spec that would cost someone a day

### 1. Metadata moved behind its own endpoint (API version 2026-05-12)

`PATCH /users/{id}` and `PATCH /organizations/{id}` both declare `additionalProperties: false` and
no longer list `public_metadata` / `private_metadata` / `unsafe_metadata` among their request
properties — Clerk rejects them there now, silently dropping any older integration's assumption
that an "update" call can also touch metadata. Merging metadata lives at its own endpoint,
`PATCH /{resource}/{id}/metadata`, which **deep-merges** rather than replaces (set a key to `null`
at any depth to remove it). A `PUT` variant that replaces a field wholesale exists in the spec but
is **not exposed** by this app — it is a much easier way to lose sibling keys by accident than the
merge form is to misuse.

This app splits the two: `user-update`/`organization-update` touch attributes only (and declare no
metadata params at all — a test in [`tests/index.test.ts`](tests/index.test.ts) is not needed for
this since the params list itself is the proof), and `user-update-metadata`/
`organization-update-metadata` are the dedicated merge actions.

### 2. List responses are not consistently shaped

Clerk's own spec answers a **bare JSON array** for some list endpoints and
`{ data: [...], total_count: number }` for others, and nothing in the URL or the request signals
which:

| Bare array | `{ data, total_count }` |
|---|---|
| `GET /users` | `GET /organizations` |
| `GET /sessions` | `GET /organizations/{id}/memberships` |
| `GET /invitations` | `GET /organizations/{id}/invitations` |
| | `GET /organization_roles` |

Guessing wrong means either reading `.length` off `undefined` or getting `undefined` back from a
bare array's nonexistent `.data`. [`lib/client.ts`](lib/client.ts) makes the split explicit with
two methods, `requestArray` and `requestEnvelope`, and **every list action in this app normalises
its own output to `{ data, totalCount? }`** regardless of which shape backed it — a workflow
reading this app never has to know which underlying shape Clerk used. `user-count` exists
separately because `GET /users` itself never carries a total.

## Two ways to get someone into an organization

`organization-membership-create` adds an **existing** user immediately, given their user ID.
`organization-invitation-create` emails an address that may have no Clerk account at all, and only
becomes a membership once the invite is accepted — it sits "pending" until then. They are not
interchangeable, and neither substitutes for the other.

## Revoking is a courtesy, not a lock

Clerk's own docs on `POST /invitations/{id}/revoke` are explicit: revoking "doesn't prevent the
user from signing up if they follow the sign up flow" directly — it only invalidates the emailed
link. `invitation-revoke`'s description says so. Separately:

- `user-delete` frees the user's email/phone for a brand-new signup and does **not** revoke
  already-issued tokens.
- `user-ban` revokes every active session and blocks sign-in, and is **reversible** via
  `user-unban`.

Both destructive, non-reversible actions (`user-delete`, `organization-delete`) require an explicit
`confirm` boolean, enforced in `execute` and checked by a test.

## Sign-in tokens over session creation

Clerk's spec documents `POST /sessions` (create a session directly), but its own description reads:
*"This operation is intended only for use in testing, and is not available for production
instances,"* pointing instead at **Sign-in Tokens** for a backend-issued session. This app exposes
`sign-in-token-create`/`sign-in-token-revoke` and does **not** expose session creation at all.

## Health checks

- **`service`** (`kind: "service"`, unsigned) — `status.clerk.com` is a real, dedicated Atlassian
  Statuspage instance, verified live: `page.name: "Clerk"`, real named components ("Email
  delivery", "Webhooks", "Machine authentication", …), not a generic template or a fixed-byte-count
  decoy. Maps Statuspage's indicator/component vocabulary to `ok`/`degraded`/`down`, `unknown` on a
  broken status API (never `down` — a status page failing tells you nothing about the vendor).
- **`instance`** (`kind: "dependency"`, `scope: "connection"`, `credential: "signed"`) — reads
  `GET /instance` and reports whether this connection's instance is `development` or `production`.
  That distinction matters on its own: a development instance enforces a tenth of a production
  instance's rate limit (100 vs 1000 requests per 10 seconds, per Clerk's own `CreateUser` docs) and
  relaxes validation a production instance does not — a signal the derived `auth:secret-key` check
  (which only proves the key is live) never surfaces. `401` is left to the derived auth check;
  `429` is `degraded`, never `down`.
- **`auth:secret-key`** (derived) — `GET /users?limit=1`, the cheapest authenticated call every
  Secret Key can make. A rejected key is distinguished by Clerk's own `code` field
  (`clerk_key_invalid` vs `authorization_header_format_invalid`) rather than by status code alone,
  and the response is never echoed back — see [`lib/client.ts`](lib/client.ts)'s `describeError`.
- **No `quota` check.** Clerk's spec documents per-endpoint rate limits in prose (e.g. "1000
  requests per 10 seconds for production instances") but no machine-readable remaining-quota
  response header was found anywhere in the spec or on a live 401. A quota check would have to
  fabricate a number, so none is declared.

## Deliberately out of scope

- **The Frontend API** and any client-side sign-in/sign-up flow, and Clerk's client SDKs/components
  — this app administers an instance; it does not authenticate anybody itself.
- **JWT templates and OAuth application configuration** — instance configuration, not a workflow
  step.
- **SAML/enterprise SSO and SCIM directory sync** — configuring how an instance authenticates is a
  deploy, not a workflow action.
- **Billing** (`/billing/*`) — plans, prices, and subscriptions are account management, not
  something a workflow should mutate.
- **Instance settings** (domains, restrictions, redirect URLs, `/instance/*` writes) — same
  reasoning as Auth0's tenant-settings exclusion: changing how an instance runs is a deploy.

## Actions

**Users** — `user-get`, `user-list`, `user-count`, `user-create`, `user-update`,
`user-update-metadata`, `user-delete`, `user-ban`, `user-unban`

**Organizations** — `organization-get`, `organization-list`, `organization-create`,
`organization-update`, `organization-update-metadata`, `organization-delete`,
`organization-role-list`

**Organization membership** — `organization-membership-create`, `organization-membership-list`,
`organization-membership-remove`

**Organization invitations** — `organization-invitation-create`, `organization-invitation-list`,
`organization-invitation-revoke`

**Sessions** — `session-get`, `session-list`, `session-revoke`

**Application invitations** — `invitation-create`, `invitation-list`, `invitation-revoke`

**Sign-in tokens** — `sign-in-token-create`, `sign-in-token-revoke`
