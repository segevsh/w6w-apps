# WooCommerce

Manage products, orders and customers on a self-hosted WooCommerce store.

- **Categories** — commerce
- **Auth methods** — api-key
- **Actions** — 13
- **Egress allowlist** — `*`
- **Website** — https://woocommerce.com
- **API docs** — https://woocommerce.github.io/woocommerce-rest-api-docs/

WooCommerce is a WordPress plugin: its REST API lives on the tenant's own
WordPress domain at `{storeUrl}/wp-json/wc/v3`. There is no vendor-owned host to
allow-list, so — exactly like the WordPress app — the manifest sets
`network.allow: ["*"]` and every Connection carries its own `storeUrl`.

## Auth

A single method, `api-key`. Each store admin mints a **Consumer Key** /
**Consumer Secret** pair at WooCommerce → Settings → Advanced → REST API (scoped
Read or Read/Write). Over HTTPS these are sent as HTTP Basic auth — the Consumer
Key as the username, the Consumer Secret as the password
(`Authorization: Basic base64(ck:cs)`). The store's own URL is captured per
Connection as `storeUrl` and republished on `connection.display.storeUrl` so
action code (which only ever sees the redacted connection) can build the base
URL without touching the credential.

## Actions

- **product** — create, get, list (get-many), update, delete
- **order** — create, get, list (get-many), update, delete
- **customer** — create, get, list (get-many)

`delete` on product/order defaults to `force: true` (permanent) and can be
unset to move the record to trash. `get-many` returns a single page; set `page`
to walk further pages.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left. Only the second is something the app itself performs.

### Is the vendor up?

**Service status** — none published.

There is no vendor status service: WooCommerce is software the tenant self-hosts
on their own WordPress site, so the site's own reachability is the only thing
worth checking. `health/site.ts` probes it with an unauthenticated
`GET {storeUrl}/wp-json/` — the WordPress REST discovery document that
WooCommerce's own `wc/v3` routes are mounted under. That separates two failures
a credential check would conflate: the store is gone / DNS is wrong (transport
failure) versus the REST API being disabled or blocked by a security plugin
(a 401/403/404 on a route that should always be public).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

The `api-key` method probes:

```
GET {storeUrl}/wp-json/wc/v3/system_status
```

A WooCommerce-only, authenticated route: a 401 here is a genuine credential
failure (bad or under-scoped key) rather than a missing route.

### Do we have quota left?

None — the WooCommerce REST API returns no rate-limit headers, and any
throttling is whatever the tenant's own host imposes.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**`service` is declared absent.** There is no vendor to have a status page: a
self-hosted WooCommerce store IS the dependency, which is what the `site` check
probes.

**`quota` is declared absent.** The WooCommerce REST API exposes no
`X-RateLimit-*` / `RateLimit-*` headers; a store imposes whatever limits its own
host does, with no standard way to read them. A declared absence always reports
`unknown`, so it carries `severity: "informational"` — otherwise it would pin
every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
