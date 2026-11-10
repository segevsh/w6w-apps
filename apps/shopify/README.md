# Shopify

Manage Shopify products, orders, customers and inventory through the Admin REST API.

- **Categories** — commerce
- **Auth methods** — access-token
- **Actions** — 18
- **Triggers** — 18 (webhook)
- **Egress allowlist** — `*.myshopify.com`
- **Website** — https://www.shopify.com
- **API docs** — https://shopify.dev

## Triggers

Subscribing registers Shopify **webhook subscriptions** (`POST /admin/api/2024-07/webhooks.json`,
JSON format) that point at the w6w callback URL; unsubscribing deletes them (a subscription Shopify
no longer has counts as deleted). Shopify deletes an Admin-API subscription itself after eight
consecutive failed deliveries.

**One setting to paste: the app client secret.** Shopify signs every webhook with the client secret
of the app that owns the access token, and that secret is not part of the access token, so each
trigger asks for it as the secret parameter **App client secret** (Dev Dashboard: the app's
Settings > Credentials; legacy custom app: Settings > Apps and sales channels > Develop apps > your
app > API credentials > API secret key). Subscribing without it is refused.

| Trigger | Mechanism | Shopify topic | The run gets |
| --- | --- | --- | --- |
| `order-created` | webhook | `orders/create` | the order |
| `order-paid` | webhook | `orders/paid` | the order |
| `order-updated` | webhook | `orders/updated` | the order as it is now |
| `order-cancelled` | webhook | `orders/cancelled` | the order with its cancel reason |
| `order-fulfilled` | webhook | `orders/fulfilled` | the order and its fulfillments |
| `customer-created` | webhook | `customers/create` | the customer |
| `product-created` | webhook | `products/create` | the product |
| `product-updated` | webhook | `products/update` | the product |
| `refund-created` | webhook | `refunds/create` | the refund |
| `customer-updated` | webhook | `customers/update` | the customer as it is now |
| `customer-deleted` | webhook | `customers/delete` | the id of the deleted customer |
| `order-deleted` | webhook | `orders/delete` | the id of the deleted order |
| `product-deleted` | webhook | `products/delete` | the id of the deleted product |
| `inventory-level-updated` | webhook | `inventory_levels/update` | the inventory item, location and available quantity |
| `location-created` | webhook | `locations/create` | the location |
| `location-updated` | webhook | `locations/update` | the location as it is now |
| `location-deleted` | webhook | `locations/delete` | the id of the deleted location |
| `event` | webhook | any topics you list | the topic and the resource |

`event` is the Any-event trigger: list the topics you want (comma-separated) and it registers exactly those subscriptions; Shopify has no "all topics" wildcard. Every other Shopify topic (collections, fulfillments, draft orders, checkouts, carts, disputes, themes and the rest of https://shopify.dev/docs/api/admin-rest/latest/resources/webhook#event-topics) is reachable through it.

Not covered: `customer-search` is a search over customers by a query the user writes; every customer it can return is delivered by `customer-created` and `customer-updated`, so it has no trigger of its own.

Every event has `topic`, `shopDomain`, `webhookId` (`X-Shopify-Webhook-Id`, unique per delivery:
use it to skip a duplicate), `eventId`, `triggeredAt`, `apiVersion` and `resource` (the JSON
Shopify sent). The access token needs the read scope of the topic (for example `read_orders`).

**Trust model.** Every delivery is checked before anything runs: `X-Shopify-Hmac-Sha256` must equal
the base64 HMAC-SHA256 of the exact raw body under the client secret, compared in constant time,
and `X-Shopify-Shop-Domain` must be the store the subscription was created on (the same app secret
signs for every store that installs the app). A delivery with no signature, a bad signature, a
body that is not an object, another store's, or a subscription with no secret configured is refused
and no run starts; no unsigned path exists. Shopify defines no signed timestamp, so there is no
replay window to enforce.

Sources, verified 2026-11-10:
[HTTPS delivery and HMAC verification](https://shopify.dev/docs/apps/build/webhooks/subscribe/https),
[Admin REST webhook resource](https://shopify.dev/docs/api/admin-rest/latest/resources/webhook) (topic list).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://www.shopifystatus.com>

```
GET https://www.shopifystatus.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /shop.json
```

The store's own record. Needs only the base access a token always has — unlike
`/products.json`, which n8n probes and which 403s without `read_products`.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-Shopify-Shop-Api-Call-Limit` response header, formatted `used/total` (e.g. `32/40`).
It is a leaky bucket, so headroom refills continuously rather than resetting on a
boundary.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `store` | dependency | connection | context | degraded | 120s | `health/store.ts` |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |

The host `www.shopifystatus.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
