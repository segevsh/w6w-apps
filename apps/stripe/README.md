# Stripe

Manage Stripe customers, payments, refunds, invoices, subscriptions, catalogue and hosted checkout.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 25
- **Egress allowlist** — `api.stripe.com`
- **Website** — https://stripe.com
- **API docs** — https://docs.stripe.com/api

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
