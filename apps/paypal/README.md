# PayPal

Create and manage PayPal orders, payments, invoices and payouts.

- **Categories** — commerce, finance
- **Auth methods** — client-credentials
- **Actions** — 13
- **Egress allowlist** — `api-m.paypal.com`, `api-m.sandbox.paypal.com`
- **Website** — https://www.paypal.com
- **API docs** — https://developer.paypal.com/docs/api/overview/

## Setup

1. Create a REST API app at [developer.paypal.com/dashboard/applications](https://developer.paypal.com/dashboard/applications)
   (Live or Sandbox — PayPal issues separate credentials for each).
2. Copy its **Client ID** and **Secret**.
3. When connecting the app in w6w, paste both and set **Use Sandbox** to match the app you
   created — on for a Sandbox app, off for a Live one. The two use different hosts
   (`api-m.paypal.com` vs `api-m.sandbox.paypal.com`) and different credentials; mixing them
   fails at connect time.

### Auth: Client Credentials (`custom`)

PayPal's REST APIs authenticate a whole app, not an individual user, via the OAuth2
`client_credentials` grant: `POST /v1/oauth2/token` with HTTP Basic `clientId:clientSecret`
and `grant_type=client_credentials` in the body. There is no browser sign-in step, so this
works in scheduled and background runs — the same shape as Zoom's Server-to-Server auth
method, which this port is modelled on.

- `exchange` mints the first token from the pasted Client ID/Secret at connect time.
- `refresh` re-mints it when the runtime sees it expire (PayPal's tokens last ~9 hours).
- `sign` stamps `Authorization: Bearer <token>` on every request.
- `test` re-runs the same `client_credentials` exchange — the same liveness check PayPal's
  own dashboard performs, and the only probe that needs no scope beyond what every REST API
  app already carries.
- `afterConnect` echoes the **Use Sandbox** toggle onto the Connection's `display`, so
  `lib/client.ts` can address the right host (`api-m.paypal.com` or
  `api-m.sandbox.paypal.com`) without ever seeing the credential — the same pattern Zendesk
  uses for its per-account subdomain.

## Actions

| Resource | Action | Wraps |
|---|---|---|
| Order | `order-create` | `POST /v2/checkout/orders` |
| Order | `order-get` | `GET /v2/checkout/orders/{id}` |
| Order | `order-capture` | `POST /v2/checkout/orders/{id}/capture` |
| Payment | `payment-capture-get` | `GET /v2/payments/captures/{id}` |
| Payment | `payment-refund` | `POST /v2/payments/captures/{id}/refund` |
| Invoice | `invoice-create` | `POST /v2/invoicing/invoices` |
| Invoice | `invoice-get` | `GET /v2/invoicing/invoices/{id}` |
| Invoice | `invoice-list` | `GET /v2/invoicing/invoices` |
| Invoice | `invoice-send` | `POST /v2/invoicing/invoices/{id}/send` |
| Transaction | `transaction-list` | `GET /v1/reporting/transactions` |
| Payout | `payout-create` | `POST /v1/payments/payouts` |
| Payout | `payout-get` | `GET /v1/payments/payouts/{id}` |
| Payout | `payout-item-cancel` | `POST /v1/payments/payouts-item/{id}/cancel` |

`order-capture` and `payment-refund` stamp `PayPal-Request-Id` (keyed off the invocation id)
— PayPal's own idempotency mechanism for those endpoints, so a retried step doesn't double
charge or double refund. `payout-create` relies on the caller-supplied `senderBatchId`
instead: PayPal deduplicates a retried batch with the same ID itself.

`invoice-create` and `order-create` cover the common single-line-item / single-purchase-unit
case; PayPal's full shape (multiple recipients, item-level tax/shipping breakdown) is out of
scope. `payout-create` accepts PayPal's own payout-item JSON shape directly as an escape
hatch for multi-recipient batches, the same pattern SendGrid's `mail-send` uses for dynamic
template fields.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://www.paypal-status.com>

The status page itself is a JS single-page app — the usual Atlassian-Statuspage-style
`/api/v2/summary.json` (and every path we tried under `/api/production`) returns the HTML
shell, not JSON. It does publish genuine feeds, linked from the page's own `<head>` and
confirmed by fetching them directly:

```
GET https://www.paypal-status.com/feed/atom
GET https://www.paypal-status.com/feed/rss
```

So `service` is a **feed-backed** check (see
[`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md#feed-backed-checks)):
the host fetches and parses the Atom feed before the hook runs. Each entry is one incident
(verified: ten consecutive items, ten distinct ids — unlike some vendors' feeds, PayPal does
not emit a new entry per update), and its title carries a live status prefix —
`Resolved: …`, `Initial Notification: …`, `Postponed: …`, `Rescheduled: …` — that PayPal
does not document as a fixed vocabulary anywhere. The check reads the one signal that's
unambiguous: whether the newest title for an incident starts with `Resolved`. Everything
else counts as open.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself. It re-runs the `client_credentials` exchange (see Setup
above) rather than probing a separate endpoint, since PayPal's REST APIs don't expose an
unscoped "whoami" for an app-level token.

### Do we have quota left?

**Nothing to probe.** PayPal explicitly does not publish a rate-limiting policy: no
`X-RateLimit-*` (or equivalent) response headers, and no quota-lookup endpoint. Limits are
dynamic and undocumented; exhaustion only surfaces after the fact as an HTTP 429
(`RATE_LIMIT_REACHED`). Declared `unavailable` rather than omitted, so a host can tell
"we checked and there's nothing" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` (feed-backed) |
| `quota` | quota | connection | — | informational | — | _declared unavailable_ |
| `auth:client-credentials` | credential | connection | signed | fatal | — | derived from the `client-credentials` auth method's `test` hook |

The feed host (`www.paypal-status.com`) is reachable **only inside the `service` hook's
worker** — implicitly, the same footing as an OAuth endpoint host — never from an action,
and never signed with a credential.

---

Researched and endpoint-verified 2026-07-31 against developer.paypal.com and PayPal's own
status feed. Status surfaces move; re-check if a probe starts failing for everyone at once.
