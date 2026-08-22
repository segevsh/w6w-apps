# Ghost

Create, read, update and delete posts, pages, members and tags on a Ghost site through the
Admin API.

- **Categories** — cms, productivity
- **Auth methods** — admin-api-key
- **Actions** — 11
- **Egress allowlist** — `*`

## Links

- **Website** — https://ghost.org
- **Admin API docs** — https://ghost.org/docs/admin-api/ (redirects to https://docs.ghost.org/admin-api/)
- **Content API docs** — https://ghost.org/docs/content-api/ (redirects to https://docs.ghost.org/content-api/)
- **Source** — https://github.com/TryGhost/Ghost (the product) and https://github.com/TryGhost/SDK
  (the reference Admin/Content API clients this app's JWT signing was verified against)
- **Status page** — https://ghoststatus.org (Ghost(Pro) and ghost.org only — see Health check below)

## Per-site domain model

Ghost is self-hosted per tenant, the same shape of problem as WordPress: every install lives on
its own domain (a custom domain, or a `*.ghost.io` Ghost(Pro) subdomain), so there is no shared
apex to allow-list in advance. `w6w.network.allow` is therefore `["*"]`, and the actual site host
is collected per-Connection as the `siteUrl` field and resolved to a base URL
(`{siteUrl}/ghost/api/admin`) at request time — see `lib/client.ts#resolveBaseUrl`, the same
pattern as `wordpress`'s `lib/client.ts` and `shopify`'s per-store `baseUrl`.

## Which API this app is built against, and why

Ghost publishes two REST APIs:

- **Admin API** (`/ghost/api/admin/`) — full read/write access (posts, pages, members, tags,
  tiers, users, …), authenticated with a JWT minted from a long-lived Admin API Key.
- **Content API** (`/ghost/api/content/`) — read-only, public content only (published posts,
  pages, tags, authors, tiers), authenticated with a simple `?key=` query-param key safe for
  browser use.

This app is built against the **Admin API**. A read-only integration can't create or publish a
post or manage a member, which is most of what a workflow automation actually wants to do — the
Content API is the right choice for a public site widget, not for this. The one action that reads
without a credential, `get-site-info`, still targets the Admin API's `GET /site/` (the one Admin
route Ghost itself leaves unauthenticated) rather than switching APIs for one call.

## Admin API JWT authentication

Ghost's Admin API auth is a distinctive scheme — not a plain API key, not OAuth2: the stored
credential is a long-lived key **pair** (`<id>:<secret>`, minted once when a Custom Integration is
created in Ghost Admin → Settings → Integrations), and every request is authenticated with a
fresh, short-lived (5-minute) JSON Web Token signed from that pair:

```
header = { alg: "HS256", typ: "JWT", kid: "<id>" }
claim  = { iat: <now>, exp: <now + 300s>, aud: "/admin/" }
signature = HMAC-SHA256(header.claim, hex-decoded secret)
Authorization: Ghost <token>
```

This fits the network-less `sign` hook exactly the way Snowflake's RSA key-pair JWT does (see
`snowflake/lib/jwt.ts`): minting the token is pure local HMAC computation over WebCrypto
(`crypto.subtle.importKey` + `.sign`, no external JWT library, no network access), so
`auth/admin-api-key.ts#sign` mints a fresh token on every request rather than caching one — the
stored key pair never itself expires, but each minted token does within 5 minutes. The exact
header/claim shape and the `id:secret` split (24 hex chars : 64 hex chars) were verified against
Ghost's own reference client, `github.com/TryGhost/SDK` → `packages/admin-api/lib/token.js` and
`admin-api.js`, not guessed.

Ghost's REST envelope is also distinctive and is fully encapsulated in `lib/client.ts`: every
resource is a **plural key wrapping an array**, in both the request body and the response
(`{ "posts": [ {...} ] }`), for every route except `GET /site/`, which returns a bare
`{ "site": {...} }` object. Every collection/resource path also requires a **trailing slash**
(`/posts/`, not `/posts`) — Ghost 404s otherwise.

Updating a post or page requires echoing back its current `updatedAt` (Ghost's optimistic-locking
collision guard) — `update-post` exposes this as a required `updatedAt` param rather than
silently generating one, since a client-side timestamp does not match the server's and would be
rejected.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — `ghoststatus.org` (Statuspage-style, powered by incident.io), which publishes
a working RSS incident feed at `/history.rss`. Unlike WordPress's absent self-hosted status, Ghost
does publish one — but it covers **Ghost.org and Ghost(Pro)-hosted sites** (Websites, Admin,
Analytics, Email delivery, Stripe API), not a self-hosted install, which is most of this app's
addressable surface. That's why `service` stays `degraded` severity rather than fatal, and why the
`site` check exists separately to answer the question this one can't for self-hosted tenants.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

`admin-api-key` probes:

```
GET /ghost/api/admin/users/?limit=1
```

The cheapest authenticated read available — proves the JWT (and therefore the key pair) is
accepted without depending on there being any posts, pages or members to read.

### Do we have quota left?

None — Ghost's Admin API documents no rate limit and returns no usage headers to read one from.
A self-hosted site additionally imposes whatever limits its own host does.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | — | `ghoststatus.org/history.rss` (feed) |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` — `GET /ghost/api/admin/site/` |
| `auth:admin-api-key` | credential | connection | signed | fatal | — | derived from the `admin-api-key` auth method's `test` hook |

**`quota` is declared absent.** Ghost's Admin API documents no rate limit and returns no usage
headers to read one from. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.


## Icon

`assets/icon.svg` — the vendor's own mark; the previous artwork was an unweighted ring.

Taken from <https://www.ghost.org/favicon.svg> on 2026-08-15.

- **1,770 bytes**, `image/svg+xml`, md5 `7622e26da9b69472e186bfdc1c7a89dd`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-02 against Ghost's official docs
(`docs.ghost.org/admin-api`, `docs.ghost.org/content-api`) and its reference client source
(`github.com/TryGhost/SDK`, `github.com/TryGhost/Ghost`). Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
