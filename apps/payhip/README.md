# Payhip

Verify, enable, disable and count uses of Payhip **software license keys**.

**Scope.** Payhip's public API covers software license keys and nothing else. It documents no
endpoints for products, orders, customers, coupons or payouts, so this app has none either.
(`payhip.com/api` is a seller's storefront, not documentation; the references are the help-center
articles [317](https://help.payhip.com/article/317-public-api) (current) and
[114](https://help.payhip.com/article/114-public-api) (legacy).) Nothing here was exercised
against a live account.

## Triggers

| trigger — title | mechanism | vendor event | what the run gets |
|---|---|---|---|
| `new-sale` — New Sale | webhook (manual) | `paid` | the transaction id, buyer email, price in minor units, currency and items |
| `sale-refunded` — Sale Refunded | webhook (manual) | `refunded` | as above plus the amount refunded and the dates created and refunded |
| `new-subscription` — New Subscription | webhook (manual) | `subscription.created` | the subscription and customer ids, plan, product and customer name and email |
| `subscription-cancelled` — Subscription Cancelled | webhook (manual) | `subscription.deleted` | as above plus the end date |

### Setup

Payhip webhooks are set up by hand in the store, not through the API.

1. Create the trigger in w6w, give it your Payhip API key (Payhip, Settings, Developer tab), and copy
   the callback URL w6w shows for the subscription.
2. In Payhip open Settings, Developer, paste the callback URL into the webhook endpoint field and tick
   the events you want (`paid`, `refunded`, `subscription.created`, `subscription.deleted`).
3. Payhip posts every ticked event to that one URL. Each trigger starts a run only for its own event
   and acknowledges the others without one. The endpoint must answer 200; Payhip retries hourly for up
   to 3 hours otherwise.

### Trust model

Each delivery body has a `signature` field which Payhip documents as `sha256` of your API key. The
trigger recomputes that from the key you gave it and compares in constant time; a missing, wrong or
empty signature, an absent raw body or an unset key refuses the delivery (one failed row, no run).
**This is a shared token, not a signature over the body**: it proves the sender knows your API key
but does not detect a changed body, and it has no timestamp, so a captured delivery can be replayed.
The callback URL is therefore a second secret that matters: keep it private. Anyone who learns your API
key can forge deliveries, so rotate it (and update the trigger) if it leaks. The Payhip API key is not
the per-product secret key the license actions use.

Docs (verified 2026-11-10): https://help.payhip.com/article/115-webhooks

## Actions

| Action | Verb and path | Notes |
|---|---|---|
| Verify License Key | `GET /api/v2/license/verify` | read-only; does **not** consume a use |
| Enable License Key | `PUT /api/v2/license/enable` | idempotent |
| Disable License Key | `PUT /api/v2/license/disable` | idempotent; Payhip also auto-disables on refund |
| Increase License Usage | `PUT /api/v2/license/usage` | not idempotent, +1 per call |
| Decrease License Usage | `PUT /api/v2/license/decrease` | not idempotent, -1 per call |

Each returns `found, enabled, productLink, licenseKey, buyerEmail, uses, date`.

**Failure is an empty response.** Payhip answers an unknown key, a wrong secret and a refused
update with no body. Verify reports that as `found: false`; the four mutations throw, since the
change did not happen. The two causes cannot be told apart from the wire.

## Authentication

Two methods; the connection's method must match the action's **API Version** parameter.

- **Product Secret Key (v2, current, default).** Header `product-secret-key`. One secret per
  product (edit page, license keys section), so a connection covers one product and `productLink`
  is not needed. Payhip designed it for public applications.
- **Account API Key (legacy v1).** Header `payhip-api-key`, Settings > Developer. Account-wide;
  actions need `productLink`. Payhip still documents v1, flagged legacy.

The connection test verifies a key that cannot exist. Payhip has no whoami call and gives the same
empty answer for a wrong secret and an unknown key, so the test proves reachability and that
Payhip did not refuse the request (401/403) or fail (5xx/429); the secret itself is only proven
by the first real verify.

## Health checks

Both are declared absences with `informational` severity: Payhip's docs name no status page or
feed, and publish no rate limit or quota headers. Credential/reachability is the derived auth check.

## Host and icon

Network: `payhip.com` only. The icon is the verbatim simple-icons `payhip.svg`; `icon.dark.svg`
is the same path with `fill="#ffffff"` added.
