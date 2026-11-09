# WooCommerce

Manage products, orders and customers on a self-hosted WooCommerce store.

- **Categories** — commerce
- **Auth methods** — api-key
- **Actions** — 13
- **Triggers** — 7 (webhook)
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

## Triggers

Subscribing creates WooCommerce **webhooks** (`POST /wp-json/wc/v3/webhooks`, one per topic,
status `active`) that deliver to the w6w callback URL; unsubscribing deletes them
(`DELETE .../webhooks/<id>?force=true`; one that is already gone counts as deleted). Nothing to
configure by hand: w6w generates a random signing secret for each subscription, hands it to
WooCommerce at creation and keeps it in the subscription's state (stored unencrypted by the host;
it only verifies deliveries to that one subscription). The API key behind the connection needs
Read/Write permission, and the store must be able to reach the w6w callback URL over HTTPS.

| Trigger | Mechanism | WooCommerce topic | The run gets |
| --- | --- | --- | --- |
| `order-created` | webhook | `order.created` | the order |
| `order-updated` | webhook | `order.updated` | the order as it is now |
| `order-deleted` | webhook | `order.deleted` | the id of the deleted order |
| `customer-created` | webhook | `customer.created` | the customer |
| `product-created` | webhook | `product.created` | the product |
| `product-updated` | webhook | `product.updated` | the product |
| `event` | webhook | any topics you list (coupon, customer, order, product, or `action.<hook>`) | the topic and the payload |

Every event has `topic`, `resource`, `event`, `webhookId`, `deliveryId` (`X-WC-Webhook-Delivery-ID`),
`source` (the store URL) and `payload` (the JSON WooCommerce sent, the same as the REST API would
return). WooCommerce delivers in the background through WP-Cron, so a delivery can lag the change
on a low-traffic store, and it disables a webhook after repeated failed deliveries.

**Trust model.** Every delivery is checked before anything runs: `X-WC-Webhook-Signature` must equal
the base64 HMAC-SHA256 of the exact raw body under the subscription's secret, compared in constant
time, and `X-WC-Webhook-ID` must be one of this subscription's webhooks. A delivery with no
signature, a bad signature, a body that is not an object, another webhook's, or a subscription with
no stored secret is refused and no run starts. The single exception is WooCommerce's own delivery
URL ping, which WooCommerce sends unsigned and without any `X-WC-*` header (its source builds that
request with only a `webhook_id=<id>` form body): exactly that body is acknowledged with **no
event**, so nothing unsigned can start a run. WooCommerce defines no signed timestamp, so there is
no replay window to enforce; use `deliveryId` to skip a duplicate.

Sources, verified 2026-11-09:
[webhooks](https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks) (topics, headers,
signature, create, list, delete); the ping body is from WooCommerce's `WC_Webhook::deliver_ping()`
in [class-wc-webhook.php](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/includes/class-wc-webhook.php).

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


## Icon

`assets/icon.svg` — the Woo mark in its bubble — the previous artwork was the bare wordmark, 3.8:1 and unusable on a square tile.

Taken from <https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/woocommerce-icon.svg> on 2026-08-15.

- **5,093 bytes**, `image/svg+xml`, md5 `6452582dc916a26f07c1ebc3ad31ba64`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

The `gilbarbara/logos` collection carries the Woo mark in its bubble; WooCommerce's own site publishes only the wordmark, which is what this app used to ship at 3.8:1.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
