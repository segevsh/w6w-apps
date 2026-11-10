# Stripe

Manage Stripe customers, payments, refunds, invoices, subscriptions, catalogue and hosted checkout.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 25
- **Triggers** — 10 (webhook)
- **Egress allowlist** — `api.stripe.com`
- **Website** — https://stripe.com
- **API docs** — https://docs.stripe.com/api

## Triggers

Subscribing registers a Stripe **webhook endpoint** (`POST /v1/webhook_endpoints`) that points at
the w6w callback URL and lists the trigger's event types. Unsubscribing deletes it (an endpoint
Stripe no longer has counts as deleted). Nothing to configure by hand.

| Trigger | Mechanism | Stripe event | The run gets |
| --- | --- | --- | --- |
| `payment-succeeded` | webhook | `payment_intent.succeeded` | the event and its PaymentIntent |
| `payment-failed` | webhook | `payment_intent.payment_failed` | the event and the PaymentIntent with its last error |
| `charge-refunded` | webhook | `charge.refunded` | the event and the Charge |
| `invoice-paid` | webhook | `invoice.paid` | the event and the Invoice |
| `invoice-payment-failed` | webhook | `invoice.payment_failed` | the event and the Invoice |
| `subscription-created` | webhook | `customer.subscription.created` | the event and the Subscription |
| `subscription-canceled` | webhook | `customer.subscription.deleted` | the event and the final Subscription |
| `checkout-completed` | webhook | `checkout.session.completed` | the event and the Checkout Session |
| `customer-created` | webhook | `customer.created` | the event and the Customer |
| `event` | webhook | any event types you list (or `*`) | the event and its `data.object` |

Every trigger's event has `id`, `type`, `created`, `livemode`, `account`, `apiVersion`,
`requestId`, `object` (Stripe's `data.object`) and `previousAttributes` (`data.previous_attributes`
on `*.updated` events). Stripe retries a delivery with the same event `id`, so use `id` to skip a
duplicate.

**Trust model.** Stripe returns the endpoint's `whsec_` signing secret only once, in the create
response; the app keeps it in the subscription's state (stored unencrypted by the host — it can
only verify deliveries to that one endpoint). Every delivery is checked before anything runs: the
`Stripe-Signature` header's `v1` signature must equal HMAC-SHA256 of `<t>.<raw body>` under that
secret, compared in constant time over the exact bytes Stripe sent, and `t` must be within five
minutes of now (Stripe's documented tolerance). A delivery with no signature, a bad signature, a
stale or future timestamp, or a subscription with no stored secret is refused and no run starts;
no unsigned path exists. Stripe's fake `v0` test scheme is ignored.

Sources, verified 2026-11-09:
[webhook signatures](https://docs.stripe.com/webhooks#verify-manually),
[create a webhook endpoint](https://docs.stripe.com/api/webhook_endpoints/create),
[delete a webhook endpoint](https://docs.stripe.com/api/webhook_endpoints/delete).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://status.stripe.com/current
```

Stripe runs its own status API rather than Statuspage. `/current` returns a per-surface
map — `api`, `webhooks`, `dashboard`, `checkout` — plus a `largestatus` rollup, which is
more useful than a single indicator because the API can be healthy while webhooks are
degraded.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /v1/balance
```

The account balance. Cheap, read-only, and reachable by essentially any key — unlike
`/v1/charges`, which n8n probes and which a restricted key may not read.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint or header. Stripe limits to roughly 100 read requests/second in
live mode and answers 429; retryable failures are marked with `Stripe-Should-Retry`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.stripe.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Stripe publishes no headroom endpoint or rate-limit header. The documented ceiling is roughly 100 read requests/second in live mode, enforced by 429; retryable failures carry `Stripe-Should-Retry`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
