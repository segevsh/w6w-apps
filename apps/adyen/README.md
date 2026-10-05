# Adyen

Payment sessions, payments, payment links, captures, refunds, cancels, stored payment methods,
donations and partial-payment orders on **Adyen's Checkout API v72**.

- **Categories** — commerce
- **Auth methods** — api-key (`X-API-Key` header)
- **Actions** — 24
- **Health checks** — 2 declared (`api`, ~~`service`~~, ~~`quota`~~ — `service` and `quota` are declared absences) + the derived `auth:api-key`
- **Egress allowlist** — `checkout-test.adyen.com` and `*.adyenpayments.com` (the wildcard covers every merchant-specific live host)
- **Website** — https://www.adyen.com/
- **API docs** — https://docs.adyen.com/api-explorer/Checkout/latest/overview
- **OpenAPI** — https://github.com/Adyen/adyen-openapi/blob/main/json/CheckoutService-v72.json
- **Status page** — https://status.adyen.com/ (no machine-readable feed; see below)

> Verified 2026-10-05 against the vendor's OpenAPI document (`CheckoutService-v72.json`, 29 operations),
> the "Live endpoints" page, and live probes of `checkout-test.adyen.com` and `status.adyen.com`. The icon is
> the vendor's own `https://www.adyen.com/icon.svg`, used verbatim (262 bytes). No live credential was
> available, so the authenticated response shapes come from the OpenAPI document, not from a captured call.

## Things most likely to go wrong

### 1. Test and live are different URL shapes, and live is per merchant

| Environment | Base URL |
| --- | --- |
| test | `https://checkout-test.adyen.com/v72` |
| live | `https://{prefix}-checkout-live.adyenpayments.com/checkout/v72` |

Live adds a `/checkout` path segment the test URL does not have. The prefix is "a hex-encoded random part
and your company name" (`1797a841fbb37ca7-AdyenDemo`), from Customer Area > Developers > API URLs > Prefix.
A test key is rejected by live and the reverse, so the connection stores the environment.

The prefix becomes a hostname label, so it is validated before any request: letters, digits and hyphens, at most
49 characters (a DNS label is 63 and `-checkout-live` takes 14), no dot, slash, colon or `@`. A pasted
`https://{prefix}-checkout-live.adyenpayments.com/...` URL is accepted and reduced to the prefix; any other host is
refused. The wildcard `*.adyenpayments.com` in `network.allow` is a second fence, not the only one.

Adyen also offers "location-based live endpoints" (US, AU data centres) arranged through Support. The docs do not
publish their hostname shape, so they are **not modelled**.

### 2. A bad key is a 401 whose status says nothing the body does not

A missing key and a bogus key both answer HTTP 401 with the byte-identical
`{"status":401,"errorCode":"000","message":"HTTP Status Response - Unauthorized","errorType":"security"}`, and the
authentication layer sits in front of routing (an unknown path is a 401 too, and a body-less `GET` gets plain
text, `000 HTTP Status Response - Unauthorized`, not JSON). The auth `test` therefore classifies from `errorType` and
`errorCode`: `security`/`000` is a rejected key; `security`/`901` ("Invalid Merchant Account", HTTP 403) means the key
authenticated but cannot act for that merchant; `validation` and `configuration` errors mean the key authenticated.

### 3. Modifications are asynchronous

Capture, cancel, refund, reversal and amount update answer HTTP 201 `status: received` (an amount update may
answer `authorised` or `refused`): the request was accepted, not completed. The outcome arrives later as a
webhook (CAPTURE, CANCELLATION, REFUND, ...). Money-moving POSTs send the workflow invocation id as Adyen's
`Idempotency-Key` (a header on every POST in the spec, 64 characters at most), so a retried step does not repeat
the charge or refund. `idempotent` is nonetheless `false` on them, because without an invocation id there is no key.

## Actions

| Key | Title | Type |
| --- | --- | --- |
| `create-session` | Create Payment Session | perform |
| `get-session-result` | Get Session Result | read |
| `update-session` | Update Payment Session | perform |
| `get-payment-methods` | Get Payment Methods | read |
| `get-payment-methods-balance` | Get Gift Card Balance | read |
| `create-payment` | Create Payment | perform |
| `submit-payment-details` | Submit Payment Details | perform |
| `capture-payment` | Capture Payment | perform |
| `cancel-payment` | Cancel Payment | perform |
| `refund-payment` | Refund Payment | perform |
| `reverse-payment` | Reverse Payment | perform |
| `update-authorised-amount` | Update Authorised Amount | perform |
| `cancel-payment-by-reference` | Cancel Payment by Reference | perform |
| `create-payment-link` | Create Payment Link | perform |
| `get-payment-link` | Get Payment Link | read |
| `expire-payment-link` | Expire Payment Link | perform |
| `list-stored-payment-methods` | List Stored Payment Methods | read |
| `create-stored-payment-method` | Create Stored Payment Method | perform |
| `delete-stored-payment-method` | Delete Stored Payment Method | perform |
| `create-donation` | Create Donation | perform |
| `list-donation-campaigns` | List Donation Campaigns | read |
| `get-card-details` | Get Card Details | read |
| `create-order` | Create Order | perform |
| `cancel-order` | Cancel Order | perform |

Every action that takes a merchant account falls back to the one stored on the connection. Complex request bodies
(line items, metadata, browser info, payment-method objects) are `json` params; `additionalFields` merges any other
documented field into the request, with the typed params winning on a clash. Amounts are `currency` plus `value`
in minor units.

## Auth probe

`POST /paymentMethods` with only `{"merchantAccount": ...}`. It is a lookup, creates nothing, and its response
(`{paymentMethods, storedPaymentMethods}`) holds no key material, unlike the whoami endpoints of Mailjet and
Follow Up Boss. `afterConnect` publishes the environment, base URL and merchant account for the connection label
and for actions, and nothing else.

Adyen also accepts HTTP Basic (a web-service user and password). That is not offered: the API key is the
recommended method and a single header.

## Health checks

| Check | Probe | Notes |
| --- | --- | --- |
| `api` | unauthenticated `POST /paymentMethods` on the test host | A schema-correct `security` error envelope is a **pass** (the gateway answered); a 5xx, markup or a network failure is `down`. The test host is used because a check has no connection, hence no live prefix. |
| ~~`service`~~ | none, `severity: informational` | `status.adyen.com` is a client-rendered Nuxt page: `/api/v2/summary.json`, `/api/v2/components.json`, `/history.atom`, `/rss`, `/feed`, `/index.json` and a bogus path all answer the same 41 KB HTML shell with HTTP 200. `adyen.statuspage.io` answers 401. The page's own bundle calls `/api/incident-messages/active`, but that is an undocumented CMS endpoint whose item schema could not be captured while no incident was open, and it names product areas ("Payments", "Payment methods and issuers"), not the Checkout API. |
| ~~`quota`~~ | none, `severity: informational` | No rate-limit header, quota endpoint or usage report is documented. |
| `auth:api-key` | derived from the auth `test` | |

## Deliberately left out

- `POST /originKeys` — deprecated in the spec.
- `POST /applePay/sessions` — needs an Apple Pay merchant identity and a validation URL from the shopper's browser.
- `POST /paypal/updateOrder` — a browser-session callback for PayPal Express.
- `POST /validateShopperId` — a Pix-specific validation with a different error schema.
- `POST /forward` — forwards stored card data to a third-party URL; not a good fit for an unattended workflow.
- The Management API, Classic Payments (`pal`) and Payouts APIs live in other documents with other hosts and are
  not part of this app; this app is Checkout only.
- Location-based live endpoints (see above).

## Tests

`deno task test` — unit tests with a mocked `HookContext` (a fake `ctx.fetch`, a no-op `ctx.log`) for the client
library, the auth method (every error class above), the health checks, the entry module and every action.
