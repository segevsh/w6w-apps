# Recurly

Subscription billing — accounts, subscriptions, plans, invoices, transactions and coupons —
through the **Recurly V3 API**.

- **Auth:** `api-key` — HTTP Basic, private API key as the username, empty password
- **Actions:** 17
- **Categories:** `commerce`, `finance`
- **Egress:** `v3.recurly.com`, `v3.eu.recurly.com`

## Connecting

Two fields.

| Field | What it is |
|-------|------------|
| **API Key** | Recurly → Integrations → API Credentials → Private API Keys. |
| **Data center** | `Global` (`v3.recurly.com`) or `EU` (`v3.eu.recurly.com`). |

### The host encodes data residency, not environment

Unlike Chargebee (this pack's other subscription-billing app), Recurly has no
`{site}-test` sandbox host convention — a site's own mode (production vs. sandbox) lives on the
account, not the URL. The only host-level split is **EU data residency**: the OpenAPI document
declares exactly two `servers`, `https://v3.recurly.com` and `https://v3.eu.recurly.com`, each
issuing its own, non-interchangeable API keys. Sending an EU site's key to the global host (or
vice versa) fails authentication in a way that looks identical to a wrong key — there is no error
that says "wrong data center." If a connection fails for no obvious reason, check the account's
own API base URL for which host it actually uses before assuming the key is bad.

### Auth: Basic with an empty password

The OpenAPI document's `securitySchemes.api_key` states it directly: *"Enter the API key as the
username and set the password to an empty string."* `type: "basic"` rather than `type: "apiKey"`
for the same reason `chargebee` and `close` in this pack choose it — Basic is genuinely what goes
over the wire, and `ApiKeyConfig` cannot express "base64 the value with a colon appended." There is
no password field: the password is fixed empty by the protocol.

### Every request carries a pinned API version

Recurly's dated-version scheme puts the version in the `Accept` header, not the URL:
`Accept: application/vnd.recurly.v2021-02-25+json`. The docs are explicit that omitting it is a
hard failure, not a fallback to "latest" — *"Specifying a version is required to get a successful
response."* This app pins `v2021-02-25`, the version Recurly's own version table names as current
GA, and sends the header on every request; no action or param controls it.

## Three things that would cost someone a day

1. **IDs, codes and UUIDs share one path slot, disambiguated by a PREFIX — and a missing prefix
   fails silently.** Every resource can be looked up by its Recurly-assigned ID with no prefix, or
   by its own human-assigned identifier with a prefix naming which kind it is: `code-` (accounts,
   plans, coupons), `uuid-` (subscriptions, transactions), or `number-` (invoices). The OpenAPI
   document states this per-parameter — the `account_id` path parameter: *"For ID no prefix is
   used e.g. `e28zov4fw0v2`. For code use prefix `code-`, e.g. `code-bob`."* Passing a bare code
   with no prefix does **not** error clearly: Recurly reads it as a (wrong) numeric-style ID and
   answers a plain 404, indistinguishable from "no such account" and with no hint that a prefix was
   expected. Every id-shaped param in this app documents the exact prefix its resource uses; this
   app passes whatever string a caller supplies straight through, unprefixed, since only the caller
   knows which kind of identifier they mean.

2. **Money is a plain decimal number in the currency's MAJOR unit — not cents, and not a string.**
   `UnitAmount` (plan pricing, subscription price overrides) and every invoice/transaction amount
   are typed `number, format: float` in the OpenAPI document: `19.99` for nineteen dollars
   ninety-nine, never `1999`. This is a real point of variance across this pack's payment apps —
   Chargebee is an integer in the smallest unit (cents), Mollie sends an exact decimal *string* —
   and Recurly is neither of those. Nothing in this app converts the value; whatever number a
   caller supplies for `unitAmount` on Create Subscription goes straight into the JSON body.

3. **Pagination's `next` is a self-contained opaque path, not a token to combine with fresh
   filters.** Every list response carries `{ object, has_more, next, data }`, and `next` is typed
   `string` with the description *"Path to subsequent page of results."* Every list action here
   exposes a `next` param that, when set, is fetched **verbatim** and every other param on the
   action call is ignored — mirroring the "just follow the path" model the OpenAPI document
   describes, rather than a `limit`/`offset`/`cursor` scheme a caller might otherwise guess at
   combining.

## List filters and pagination, in general

`limit` (default 20, max 200), `order` (`asc`/`desc`), and `ids` (up to 200 comma-separated IDs,
**not** combinable with any other filter — Recurly's own rule) are shared by every list action.
Most also expose `sort` (`created_at`/`updated_at`) plus `beginTime`/`endTime` (ISO 8601, filtering
on whichever field `sort` names), and the resource-specific filters this README's actions table
lists per action.

Counting with `HEAD` (Recurly's own `Recurly-Total-Records` header trick) is not exposed here — a
workflow reads `has_more` off the normal list response instead.

## Idempotency

Recurly supports an `Idempotency-Key` header on every `POST`/`PUT`/`PATCH`/`DELETE`, replaying the
original response for an hour on a repeated key — but per the vendor's own docs, *"Native
`Idempotency-Key` management ... is currently supported only in the Ruby SDK. When using other SDKs
or raw HTTP clients, you must supply and manage the `Idempotency-Key` header yourself."* This app
sends none, so idempotency is declared honestly per action rather than assumed:

- **Not idempotent:** Create Account (`create-account`), Create Subscription
  (`create-subscription`), Collect Invoice (`collect-invoice`) — a retry creates a second account,
  a second subscription, or attempts a second charge.
- **Idempotent:** Update Account (`update-account`), Cancel Subscription (`cancel-subscription`) —
  re-sending converges on the same state.

## Actions

### Accounts

| Action | Endpoint |
|--------|----------|
| List Accounts | `GET /accounts` |
| Get Account | `GET /accounts/{account_id}` |
| Create Account | `POST /accounts` |
| Update Account | `PUT /accounts/{account_id}` |

### Subscriptions

| Action | Endpoint |
|--------|----------|
| List Subscriptions | `GET /subscriptions` |
| Get Subscription | `GET /subscriptions/{subscription_id}` |
| Create Subscription | `POST /subscriptions` |
| Cancel Subscription | `PUT /subscriptions/{subscription_id}/cancel` |

Create Subscription sends `account` on the wire as `{ code: accountCode }` — Recurly's own
documented sample for this endpoint (every one of its Node/Python/Ruby/.NET/Java `x-code-samples`
writes it this way). This is Recurly's find-or-create behavior: if an account with that code
already exists the subscription attaches to it; otherwise Recurly creates a bare new account with
that code first. `currency` is required even when the plan already prices in it — Recurly does not
infer it from the plan or account.

Cancel Subscription schedules an expiration rather than terminating immediately; `timeframe`
controls *when* — `bill_date` expires at the next scheduled bill, `term_end` (the default) keeps
billing until the term completes, then expires. `DELETE /subscriptions/{id}` (immediate
termination, which can also issue a refund depending on query parameters) is deliberately not
exposed, to keep this app's one cancel path unambiguous about what it does.

### Plans

| Action | Endpoint |
|--------|----------|
| List Plans | `GET /plans` |
| Get Plan | `GET /plans/{plan_id}` |

### Invoices

| Action | Endpoint |
|--------|----------|
| List Invoices | `GET /invoices` |
| Get Invoice | `GET /invoices/{invoice_id}` |
| Collect Invoice | `PUT /invoices/{invoice_id}/collect` |

Collect Invoice only applies to `collection_method: automatic` invoices — Recurly's own summary:
"Collect a pending or past due, automatic invoice." A manual invoice is settled by recording an
external payment instead (`POST /invoices/{id}/transactions`), which this app does not expose.

### Transactions

| Action | Endpoint |
|--------|----------|
| List Transactions | `GET /transactions` |
| Get Transaction | `GET /transactions/{transaction_id}` |

Read-only: this app does not expose creating a transaction directly (that happens as a side effect
of Create Subscription or Collect Invoice).

### Coupons

| Action | Endpoint |
|--------|----------|
| List Coupons | `GET /coupons` |
| Get Coupon | `GET /coupons/{coupon_id}` |

Read-only. Creating and redeeming coupons is a larger surface (`discount_type`, per-plan/per-item
scoping, unique-code generation) left out for now rather than guessed at.

### What is deliberately absent

- **Payment method / billing info writes.** Raw card data has no business crossing a workflow
  engine — the same posture `chargebee` and `mollie` take in this pack.
- **Terminate Subscription (`DELETE /subscriptions/{id}`).** Its refund behavior depends on query
  parameters this app does not surface; Cancel Subscription's scheduled-expiration model is the
  one exposed instead.
- **Coupon create/redeem, and every purchase/gift-card/dunning-campaign surface.** Real, documented
  endpoints, left out because a first pass should cover the core objects (accounts, subscriptions,
  plans, invoices, transactions, coupons) named for this app rather than the whole ~90-path
  surface.

## Health checks

| Check | Kind | Verdict |
|-------|------|---------|
| `service` | `service` | Real probe — Atlassian Statuspage |
| `quota` | `quota` | Real probe — `X-RateLimit-*` response headers |
| `auth:api-key` | `credential` | Derived from the Auth `test` hook by the runtime |

### `service` — Recurly platform status

`GET https://status.recurly.com/api/v2/summary.json`, unauthenticated and unsigned. The status
host is **not** on the app's egress allowlist; the check widens egress for its own worker only,
which is safe precisely because a signed request must never reach a third-party status host.

**Verified real before being probed** (2026-09-15): `GET /api/v2/definitely-not-real-xyz.json`
answers **404, zero bytes**, against `GET /api/v2/summary.json` → 200,
`{"page":{"id":"01KHY9JHFMQYN9KK21NWN7NBMW","name":"Recurly","url":"https://status.recurly.com/",…},
"status":{"description":"All Systems Operational","indicator":"none"},"components":[]}` — a real
Statuspage instance with a stable page id, not a catch-all. Its `components` array is currently
empty (page-level rollup only, no per-component breakdown), so the check reads `status.indicator`;
the component-mapping code is kept in case that ever changes.

### `quota` — API rate-limit headroom

Unlike Chargebee (which publishes ceilings but no headroom counter), Recurly's own "Limits" section
documents real runtime headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset` (Unix epoch seconds). This check reuses a cheap signed read
(`GET /sites?limit=1`) and reports the headers it finds.

Two caveats worth knowing when reading the number:

- **Sandbox sites count every method** (400 req/min); **production sites count only GET**
  (1,000 req/min) — write methods stop counting once a site leaves sandbox mode, so a healthy
  `remaining` reading on a production site says nothing about POST/PUT headroom, because there is
  no ceiling on those at all.
- The window is a **sliding 5 minutes**, not a fixed per-minute bucket — the docs' own example: "a
  production site could make 4,000 requests within one minute and not hit the rate limit so long as
  the site made less than 1,000 requests during the prior 4 minutes."

No credential was available while building this app to confirm the headers are present on a live
response, so an absent header reports `unknown` rather than assuming a ceiling was hit.

### `auth:api-key` — derived

The runtime derives a credential check from the Auth `test` hook, which probes `GET /sites` —
"most useful for finding a site's ID for subsequent requests" per its own OpenAPI summary. It needs
no resource permission (a scoped/read-only key can still list its own site), never echoes the
credential back (`Site.public_api_key` is a *different*, publishable key used to configure
Recurly.js — not the private key this app just sent), and is classified by the response **body**'s
`type` field (`invalid_api_key`, per the documented `Error` schema enum) rather than the bare HTTP
status, so "wrong key" and "wrong data center" — which look identical on the wire — both get a
message that says what actually happened as far as the response can tell.

## Icon

`assets/icon.png` — Recurly's own favicon, extracted from
`https://recurly.com/favicon.ico?favicon.041ck3f125wt4.ico` (confirmed 200) on 2026-09-15.

Checked `https://cdn.simpleicons.org/recurly` first per the pack's usual vector-source order — it
answers **404**, so no vector mark exists there. The favicon is a genuine multi-resolution `.ico`
(48×48, 32×32, 16×16, each Vista-style PNG-compressed, not a raw bitmap), so the 48×48 frame was
decoded losslessly (no re-rendering or vectorization) and saved as `assets/icon.png` — the same
`appearance.icon.url` (PNG) shape `mollie` uses in this pack for a vendor mark with no available
vector source. md5 `3519eaf35bed2cadb4735e02a886a622`, 1,528 bytes, `image/png`, 48×48 RGBA.

## Development

```sh
deno task test      # 118 unit tests
deno task check
deno task lint
deno task fmt
deno task validate
```

Use `deno task fmt`, never a bare `deno fmt` — the bare form reformats asset files and can corrupt
`assets/icon.png`'s pack-generated `assets/icon.svg` sibling on other apps in this repo.

## Links

- **Recurly** — <https://recurly.com>
- **Developer docs** — <https://docs.recurly.com/>
- **API reference (used to build this app)** —
  <https://recurly.com/developers/api/v2021-02-25/index.html>
- **OpenAPI specification (the authoritative source for every path and schema here)** —
  <https://github.com/recurly/recurly-client-node/blob/v3-v2021-02-25/openapi/api.yaml>
- **Rate limits, pagination, idempotency ("Getting Started")** — embedded in the OpenAPI document's
  `info.description`, rendered at the API reference link above
- **Status** — <https://status.recurly.com>

> Every vendor endpoint cited above was verified directly (not assumed from the docs alone): the
> OpenAPI document was fetched and parsed, the status API was probed against a deliberately bogus
> sibling path to rule out a catch-all host, and `cdn.simpleicons.org/recurly`'s 404 was confirmed
> live before falling back to the favicon.
