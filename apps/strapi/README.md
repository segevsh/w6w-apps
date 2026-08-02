# Strapi

Read, create, update and delete entries on any Strapi content type, and browse the media library.

- **Categories** — cms
- **Auth methods** — api-token
- **Actions** — 6
- **Egress allowlist** — `*`
- **Website** — https://strapi.io
- **API docs** — https://docs.strapi.io/dev-docs/api/rest

## The arbitrary-endpoint model

Strapi is self-hosted (or Strapi Cloud) — every installation lives at its own domain: a
customer's own VPC, an on-prem network segment, a self-managed box, or a hosted deployment,
each with its own URL. There is no single host this app could put in `w6w.network.allow`.

So this app follows the same precedented pattern as `wordpress` and `elastic`:
`w6w.network.allow` is `["*"]`, and the instance's own base URL is collected as an `endpoint`
field on the Connection (e.g. `https://my-project.strapiapp.com`). Every action builds its
request URL from that field — see `lib/client.ts`. Auth's `afterConnect` republishes
`endpoint` (never the credential) onto `connection.display` so action code, which never sees
the credential, can still build correct URLs.

This app is also **collection-agnostic**, the same model as `supabase`'s table-agnostic
actions: it never hardcodes a content type. Every entry action takes a `collection` param —
the plural API ID set in Strapi's Content-Type Builder — and builds `/api/<collection>` from
it, so one app works against any Strapi project's schema.

## Auth

**`api-token`** (recommended, and the only method this app implements) —
`Authorization: Bearer <token>`, confirmed against Strapi's own docs
(docs.strapi.io/cms/features/api-tokens). Create one in the admin panel: Settings → Global
settings → API Tokens → Create new API Token, choosing Read-only, Full access, or Custom
permissions. `endpoint` is collected alongside the token, since the instance's URL is part of
the connection, not a fixed constant.

### API Token vs. the legacy JWT flow — and why only one is implemented

Strapi supports two authentication schemes for the REST API:

1. **API Tokens** (this app) — a long-lived, admin-issued token scoped to Read-only, Full
   access, or Custom content-type permissions. Strapi's docs describe these as the mechanism
   for letting "external clients ... authenticate requests to the Strapi Content API without
   exposing user credentials" — i.e. the intended path for server-to-server integrations like
   this one, and the one every current Strapi tutorial leads with.
2. **JWT via the Users & Permissions plugin** — `POST /api/auth/local` with an
   `identifier`/`password`, returning a `jwt` used the same way
   (`Authorization: Bearer <jwt>`). This authenticates as an actual end-user account (subject
   to that user's role permissions) and the token expires; it exists for the plugin's original
   purpose — logging in end users of a Strapi-backed application — not for service-to-service
   automation.

Only API Tokens are implemented here. A workflow-automation credential should not be a login
session for a human user account: it has no natural owner, nothing to log out, and (unlike an
API Token) can't be scoped to Read-only/Custom permissions independent of a user's role. The
reference n8n Strapi node supports both (`StrapiApi` for password/JWT, `StrapiTokenApi` for
the token), but its own credential test only exercises the JWT path — it has no test for the
token credential at all. This app's `test` hook (below) closes that gap.

## Actions

| Key | Type | Resource | Strapi call |
|---|---|---|---|
| `entry-list` | search | entry | `GET /api/<collection>` — filters/sort/pagination/populate/status |
| `entry-get` | read | entry | `GET /api/<collection>/<id>` |
| `entry-create` | perform | entry | `POST /api/<collection>` — body `{ "data": {...} }` |
| `entry-update` | perform | entry | `PUT /api/<collection>/<id>` — body `{ "data": {...} }` |
| `entry-delete` | perform | entry | `DELETE /api/<collection>/<id>` |
| `media-list` | read | media | `GET /api/upload/files/page` — paginated Media Library listing |

`id` accepts either form Strapi has used to address an entry: **v5** addresses entries by
`documentId` (a string); **v4** and earlier by the numeric `id`. The action passes whatever is
given straight through as the path segment, so it works unchanged against either version — the
app never needs to know which one a given instance runs. Likewise the create/update request
body (`{ "data": {...} }`) is identical in both versions; only the *response* envelope shape
changed between them (v4 nests attributes under `data.attributes`, v5 puts them directly on
`data`), and since every action here passes the response straight through unopinionated, that
difference is transparent to the caller.

`filters`, `sort`, `fields`, `populate` and `pagination` all use Strapi's nested
bracket-notation query syntax (`filters[title][$eq]=x`, `sort[0]=name:asc`,
`pagination[page]=1`), confirmed against Strapi's own REST API docs
(docs.strapi.io/cms/api/rest). `lib/client.ts`'s `appendBracketParams` encodes any nested
JSON value into that form — the same `arrayFormat: "indices"` convention the reference n8n
Strapi node configures explicitly for the same reason, since the server parses the query
string with `qs`.

### What isn't implemented, and why

The task brief additionally floated "list content-type components" as a candidate action.
It's **not implemented**: content-type introspection lives on Strapi's
`content-type-builder` plugin, which is an **admin-panel** feature — verified against
Strapi's own admin-token documentation and a Strapi GitHub issue confirming a Content API
token gets a flat `403` on `/api/content-type-builder/content-types`. It requires a separate
Admin Token / admin session, entirely distinct from the Content API tokens this app
authenticates with (Strapi rejects a Content API token on admin routes and vice versa).
Adding a second, admin-scoped auth method for one introspection action was out of scope for
this pass; the six actions above cover the vendor-documented, API-token-reachable Content
API surface.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and is *this tenant's instance* reachable.

### Is the vendor up?

**Service status** — none published, and declared absent (`unavailable`) rather than omitted.
There is no single vendor status signal for an arbitrary self-hosted/on-prem Strapi instance:
the instance itself IS the dependency, which is what `dependency`/`site` probes. This app has
no way to know whether a given Connection points at Strapi Cloud or a self-hosted deployment,
so even a Strapi-hosting status page would not reliably answer the question.

### Is this credential live?

This is what the Auth `test` hook does. Strapi API tokens don't map to a user, so there is no
whoami endpoint to call — `/api/users/me` belongs to the separate Users & Permissions JWT flow
and would not reliably answer for a token-authenticated request. Instead the probe is:

```
GET /api/upload/files/page?pagination[pageSize]=1
```

The built-in Media Library listing, paginated to one row to keep it cheap. The result is
interpreted using Strapi's own authentication-vs-authorization split (confirmed against
Strapi's docs and a community forum thread on the distinction): a **401** means the token
itself was rejected — invalid, revoked, or expired — while any other response, including a
**403** from a Custom token that was never granted Upload permissions, means the token
authenticated successfully, which is exactly what a credential-liveness check needs to prove.
Treating that 403 as `ok: false` would report a working, narrowly-scoped token as broken —
precisely the failure mode `build-a-w6w-app.md` warns a health check must not produce.

### Is this tenant's instance reachable?

Since every Connection points at a different instance, this is a `dependency` /
`credential: "context"` check, not a vendor `service` check — the RFC's model for exactly
this case (the same pattern as `wordpress`'s and `elastic`'s `site` checks against different
vendors).

```
GET /_health
```

Strapi's own built-in liveness route (confirmed against Strapi's server-configuration docs):
unauthenticated, present on every instance regardless of version or plugin configuration, and
returns an empty `204` with a `strapi` response header when the process is up. No content
type, no permission, no auth needed — exactly a plain reachability probe. Only a transport
failure, a 404 (nothing Strapi-shaped listening at that URL), or a 5xx marks the instance
itself as the problem — a different failure from a bad token, which is exactly the
distinction the derived `auth:*` check cannot make on its own.

### Is there quota left?

None — declared absent. Strapi exposes no standard rate-limit/quota API; any throttling is
imposed by whatever reverse proxy, hosting provider, or custom middleware a given deployment
runs.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` — `GET /_health` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

**`service` is declared absent.** There is no vendor status page for an arbitrary
self-hosted/on-prem Strapi instance: the instance IS the dependency, which is what the `site`
check probes.

**`quota` is declared absent.** Strapi exposes no standard rate-limit/quota API. A declared
absence always reports `unknown`, so it carries `severity: "informational"` — otherwise it
would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-08-01 against Strapi's own REST API documentation
(`docs.strapi.io/cms/api/rest`, `.../rest/upload`, `.../rest/status`, `.../features/api-tokens`,
`.../features/users-permissions/rest-api`, `.../configurations/server`) and cross-checked
against the community-tested `n8n-nodes-base` Strapi node and its `StrapiTokenApi` /
`StrapiApi` credentials, which target the same v3/v4 conventions and agree with the current
docs. Strapi's REST surface has changed across major versions (notably the v4→v5 response
envelope and `documentId`/`status` rename) — re-check if a probe or an action starts failing
for everyone at once, and especially before assuming v4-era behavior on a v5 instance.
