# Braintree

Charge, authorize, capture, refund, void and reverse payments, vault and delete payment methods,
manage customers and search transactions on **Braintree** (PayPal's payment gateway), over its
GraphQL API.

- **Categories** — commerce, finance
- **Auth methods** — `api-keys` (type `custom`: public key + private key sent as HTTP Basic, plus a
  `Braintree-Version` date header; environment selectable per connection)
- **Actions** — 20
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  reachability), `quota` (declared unavailable, informational) + the derived `auth:api-keys`
- **Egress allowlist** — `payments.braintree-api.com`, `payments.sandbox.braintree-api.com`
- **API docs** — https://developer.paypal.com/braintree/graphql/ · SDL
  https://github.com/braintree/graphql-api (`schema.graphql`)
- **Icon** — the vendor's own mark from Simple Icons
  (https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/braintree.svg), verbatim in
  `assets/icon.svg`; `assets/icon.dark.svg` is the same path re-inked white for dark tiles.

Verified 2026-10-06 against the SDL and the guides, plus unauthenticated and invalid-credential
probes of both hosts. No live credentials were available, so no money-moving mutation was run
against a real account; each action's selection set and input shape is checked against the SDL
types, and its request is pinned by unit tests.

## Things most likely to go wrong

1. **Every answer is HTTP 200, including a rejected key.** The verdict is
   `errors[].extensions.errorClass` (`AUTHENTICATION`, `VALIDATION`, `NOT_FOUND`, `RESOURCE_LIMIT`,
   `SERVICE_AVAILABILITY`, ...). A missing and an invalid credential are both `AUTHENTICATION`
   with different messages. The client treats any `errors` entry as a failure, including partial
   `data` next to `errors`.
2. **Sandbox and production are separate accounts with separate keys and separate hosts.** A key
   from one is `AUTHENTICATION`-rejected by the other. The connection's `environment` field picks
   the host; it is published to actions through the connection's public display.
3. **`Braintree-Version` is a date (`YYYY-MM-DD`), not a number, and is required.** The connection
   field defaults to `2024-08-01`; a value that is not a date falls back to it.
4. **Two id spaces.** Every action takes the GraphQL id (`id`). The ids in the Control Panel, in
   webhooks and in server SDKs are *legacy* ids. Convert with **Convert Legacy IDs** first.
5. **`amount` is a string** (`"10.00"`), digits and one decimal point, in the merchant account's
   currency. Never a JSON number.
6. **Duplicate-charge protection is opt-in on the wire.** The money-moving mutations take
   `apiRequestKey` (de-duplicated for 30 days; a repeat must have identical input). This app sends
   the one you give, else the w6w invocation id, so a retried step cannot charge twice.
7. **Void vs refund.** A transaction can only be voided before it settles and only refunded after.
   **Reverse Transaction** picks for you and reports which (`kind: void|refund`).
8. **A single-use payment method is spent by its first use** (a charge, or vaulting it).

## Actions

| Group           | Actions                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| Transactions    | charge, authorize, capture, partial-capture, void, refund, reverse, get, search              |
| Payment methods | vault, get, delete                                                                           |
| Customers       | create, get (with stored payment methods), update, delete, search                            |
| Utilities       | ping, client-token-create, id-from-legacy                                                    |

Search actions return one Relay page (`first` / `after`) with `hasNextPage` and `endCursor`.

## Health

| Check      | What it does                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| `service`  | Unavailable, informational. `status.braintreepayments.com` is PayPal's company-wide page with no Braintree component. |
| `api`      | Unsigned `query { ping }` on the connection's host. The documented `AUTHENTICATION` error body is a pass; 5xx, HTML and `SERVICE_AVAILABILITY` are down. |
| `quota`    | Unavailable, informational. No rate-limit headers, no usage query.                                              |
| `auth:api-keys` | Derived from the credential test: a signed `query { ping }` must answer `pong`.                          |

## Not covered

Recurring billing (subscriptions, plans, add-ons, discounts), disputes and evidence, in-store
readers and locations, 3-D Secure lookups, PayPal/Venmo/bank-specific charge mutations
(`chargePaymentMethod` covers vaulted and single-use methods of every type), the `tokenize*` and
`verify*` mutations, reports, settlement and sandbox-settle helpers, and card detail updates. Left
out rather than guessed.
