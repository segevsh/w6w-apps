# Chargebee

Subscription billing — customers, subscriptions, invoices, payment collection and the product
catalog — through the **Chargebee API v2**.

- **Auth:** `api-key` — HTTP Basic, API key as the username, empty password
- **Actions:** 17
- **Categories:** `commerce`, `finance`
- **Egress:** `*.chargebee.com`
- **Requires:** a site on **Product Catalog 2.0** for the subscription and catalog actions

## Connecting

Two fields, because Chargebee has no shared API host.

| Field | What it is |
|-------|------------|
| **Site** | The subdomain of your Chargebee URL — `acme` for `https://acme.chargebee.com`. |
| **API Key** | Chargebee → Settings → Configure Chargebee → API Keys and Webhooks → API Keys. |

A **Full-Access key** is needed for the write actions; a **Read-Only key** is enough for every list
and retrieve action.

### The host is per-customer

There is no `api.chargebee.com`. Every Chargebee account gets its own subdomain, and the OpenAPI
document's only `servers` entries are templates over it:

```
{protocol}://{site}.{environment}:{port}/api/v2        # environment: chargebee.com
{protocol}://{site}-test.{environment}:{port}/api/v2
```

So the base URL is `https://{site}.chargebee.com/api/v2`.

**A test site is a separate site, not a flag.** `acme-test` has its own data and its own API key, so
you connect it by entering `acme-test` as the site. This app deliberately does *not* strip a `-test`
suffix — folding it away would silently point every request at production. There is no sandbox
toggle for the same reason.

The site is collected once as an Auth field, republished as `connection.display.site` by
`afterConnect`, and turned into a base URL by `lib/client.ts`. Actions never see the credential, only
that display value — the same pattern `wordpress`, `ghost` and `gravityforms` use for their
per-tenant hosts. Unlike those three, the apex is known at publish time, so the manifest declares the
narrow wildcard `*.chargebee.com` rather than a blanket `*`; `zendesk` takes the same posture.

Pasting the full host or base URL into the Site field also works — it is normalised down to the bare
label, and anything that is not a single DNS label is rejected at connect time rather than
interpolated into a host nobody intended.

### Auth: Basic with an empty password

Chargebee's getting-started page: *"All API requests use HTTP Basic Auth. Use your API key as the
username. Leave the password empty."* Every curl sample writes it with the bare trailing colon —
`-u {site_api_key}:` — and Chargebee's own Node client states the wire value as code:

```js
Authorization: 'Basic ' + Buffer.from(env.apiKey + ':').toString('base64')
```

So the encoded payload is **`base64("key:")`**. The trailing colon is required and is the whole
subtlety: `base64("key")` is a different string and Chargebee answers 401. The unit tests pin it both
ways.

`type: "basic"` rather than `type: "apiKey"` because `ApiKeyConfig` can only say "put this value,
with this prefix, in this slot" — it cannot express "base64 the value with a colon appended". Basic
is genuinely what goes over the wire. There is no password field: the password is fixed empty by the
protocol, so prompting for one would only invite a wrong answer.

## Requests are form-encoded, not JSON

Every write endpoint in the v2 surface declares exactly one request content type,
`application/x-www-form-urlencoded`. There is no JSON request body anywhere in it. Posting JSON gets
a 400 that does not explain itself.

Nested and repeated fields ride in **bracket notation**. `lib/client.ts` implements the rules from
Chargebee's own serializers (`chargebee-python/chargebee/util.py#serialize`,
`chargebee-node/src/util.ts#encodeParams`), and each is pinned by a sample in the vendor docs:

| Shape | Wire form | Vendor sample |
|-------|-----------|---------------|
| scalar | `key=value` | `-d first_name="John"` |
| object | `key[sub]=value` | `-d "billing_address[city]"="Walnut"` |
| array | `key[i]=value` | `-d "coupon_ids[0]"="EARLYBIRD"` |
| object of arrays | `key[sub][i]=value` | `-d "subscription_items[item_price_id][0]"="basic-USD"` |
| boolean | lowercase `true` / `false` | `-d end_of_term="true"` |

Brackets are percent-encoded on the wire (`billing_address%5Bcity%5D`), exactly as the official SDKs
do.

Three decisions worth knowing about, all of them load-bearing:

1. **Line items are columnar, and this app transposes for you.** `subscription_items` is a set of
   *parallel arrays correlated by index*, not an array of objects. Nobody writes that by hand, so
   Create Subscription takes the row-wise form —
   `[{"item_price_id": "basic-USD", "quantity": 1}, {"item_price_id": "day-pass-USD"}]` — and
   transposes it. A row that omits a field leaves a **hole** at that index rather than shifting the
   column up, so `unit_price[1]` always belongs to `item_price_id[1]`. Re-packing would charge one
   item's price against another; there is a test named after exactly that.

2. **Empty, null and undefined values are dropped entirely**, not sent blank, so an unfilled optional
   field can never blank a stored value on an update. The trade-off is real and stated rather than
   hidden: **this app cannot clear a field by sending an empty string.** Zero and `false` are *not*
   dropped — `trial_end: 0` means "skip the trial", which is the opposite of omitting it.

3. **`meta_data` is JSON-encoded, not bracket-expanded.** It is documented as a `jsonobject`, and the
   official SDKs carry an explicit per-operation `jsonKeys` map that JSON-stringifies it at level 0.
   `lib/client.ts` mirrors that as a narrow `JSON_ENCODED_KEYS` set so the exception is stated rather
   than accidental. *This is the one wire detail in the app inferred from the SDKs and the docs' type
   annotation rather than from a published curl sample — Chargebee prints no `-d meta_data=…`
   example.*

## List filters, pagination and money

**Filters are operator objects, not bare values.** The docs give each parameter its operators —
"Supported operators: is, is_not, starts_with, in, not_in", with the example
`customer_id[is] = "8gsnbYfsMLds"` — and the OpenAPI document types every one as a `deepObject`. So
`?customer_id=abc` is not a narrower filter, it is a parameter Chargebee does not define. Every
filter this app exposes goes out in operator form.

**Pagination is an opaque cursor.** Lists return `{ "list": [...], "next_offset": "..." }`.
`next_offset` is a *string token*, not a row count — the spec types it `string` with
`maxLength: 1000` — so `offset` is a string param everywhere here and the app never does arithmetic
on it. The default page size is 10 and the maximum is 100.

**Date filters take Unix epoch seconds.** A one-sided bound uses `after` or `before`; supplying both
uses `between` with its documented literal `[1435054328,1435154328]`, because combining `after` and
`before` on one filter is nowhere documented.

**Money is an integer in the currency's smallest unit** — `1000` is `$10.00`. Nothing in this app
converts it; a float would truncate.

**Timestamps are Unix epoch seconds** throughout, in both directions.

## Product Catalog 2.0 only

Chargebee ships two mutually exclusive catalog models and a site is on one or the other. They are
different API surfaces, not different options — the `chargebee_api_v2_pc_v1_spec` document has
`/plans` and `POST /subscriptions` and **no** `/items`, `/item_prices` or
`/customers/{id}/subscription_for_items`; the PC 2.0 document is the reverse.

This app implements **Product Catalog 2.0**. On a PC 1.0 site the customer, invoice, payment source
and event actions still work, but every subscription and catalog action 404s. Rather than let that
surface as a mystery later, the auth `test` hook reads `GET /configurations` (which reports
`product_catalog_version`), connects successfully, and says so in its message. The connection label
carries the version too.

Two paths are easy to guess wrong and are taken from the spec rather than inferred:

- Create is `POST /customers/{id}/subscription_for_items` — **under the customer**. `POST
  /subscriptions` is the PC 1.0 route; `/subscriptions/create_for_items` is in neither document.
- Cancel is `/cancel_for_items`, update is `/update_for_items` — but **pause and resume carry no
  suffix**. Assuming symmetry would 404.

Chargebee uses only two verbs: `GET` for reads, `POST` for every write *including updates and
deletes*. There is no PUT or PATCH anywhere in the v2 surface.

## Actions

### Customers

| Action | Endpoint |
|--------|----------|
| List Customers | `GET /customers` |
| Get Customer | `GET /customers/{id}` |
| Create Customer | `POST /customers` |
| Update Customer | `POST /customers/{id}` |

### Subscriptions

| Action | Endpoint |
|--------|----------|
| List Subscriptions | `GET /subscriptions` |
| Get Subscription | `GET /subscriptions/{id}` |
| Create Subscription | `POST /customers/{id}/subscription_for_items` |
| Cancel Subscription | `POST /subscriptions/{id}/cancel_for_items` |
| Pause Subscription | `POST /subscriptions/{id}/pause` |
| Resume Subscription | `POST /subscriptions/{id}/resume` |

### Invoices and payment

| Action | Endpoint |
|--------|----------|
| List Invoices | `GET /invoices` |
| Get Invoice | `GET /invoices/{id}` |
| Collect Payment For Invoice | `POST /invoices/{id}/collect_payment` |

### Catalog, payment sources and events

| Action | Endpoint |
|--------|----------|
| List Items | `GET /items` |
| List Item Prices | `GET /item_prices` |
| List Payment Sources | `GET /payment_sources` |
| List Events | `GET /events` |

### Idempotency, stated honestly

`create-customer`, `create-subscription` and `collect-payment` are declared **not idempotent**.
Chargebee supports an idempotency key on these endpoints via a `chargebee-idempotency-key` request
header, and **this app does not send one** — so a retry creates a second customer, a second
subscription, or attempts a second charge. Supplying your own `id` on the two create actions makes a
retry fail as a duplicate instead of doubling. `collect-payment` has no such escape hatch; treat its
retry policy accordingly.

Cancel, pause, resume and update are idempotent: re-sending converges on the same state.

### What is deliberately absent

- **Payment source writes.** Chargebee's own guidance is to capture payment details through its
  dedicated Payment Source APIs — *"even if payment source creation fails due to errors at the
  payment gateway, the customer resource can still be created successfully"* — and raw PAN data has
  no business crossing a workflow engine. `list-payment-sources` is read-only, and Create Customer
  exposes no `card`, `bank_account` or `token` parameter.
- **`billing_address` on Update Customer.** Chargebee treats it as a replacement rather than a merge
  and documents `POST /customers/{id}/update_billing_info` for it. A half-filled address here would
  silently drop someone's postcode.
- **`retrieve_with_scheduled_changes`.** "What is billed now" and "what will be billed after the
  scheduled change" are different questions; Get Subscription answers the first and does not quietly
  substitute the second.

## Health checks

| Check | Kind | Verdict |
|-------|------|---------|
| `service` | `service` | Real probe — Atlassian Statuspage |
| `quota` | `quota` | `unavailable`, with the ceilings stated |
| `auth:api-key` | `credential` | Derived from the Auth `test` hook by the runtime |

### `service` — Chargebee platform status

`GET https://status.chargebee.com/api/v2/summary.json`, unauthenticated and unsigned. The status host
is **not** on the app's egress allowlist; the check widens egress for its own worker only, which is
safe precisely because a signed request must never reach a third-party status host.

`summary.json` rather than `status.json`: same single request, but it carries the per-component
breakdown as well as the rollup. For a billing platform whose API, hosted pages, webhooks and gateway
integrations are separately reported, that means a hosted-checkout incident does not grey out a
workflow that only calls the REST API.

**The endpoint was verified real before being probed**, both ways (2026-08-03):

- *Bogus-sibling comparison.* `GET /definitely-not-a-real-path-xyz.json` → **404, zero bytes, no
  content-type**, against `/api/v2/status.json` → 200 / 218 bytes, `/api/v2/summary.json` → 200 /
  33 357 bytes, `/api/v2/components.json` → 200 / 33 244 bytes. Three distinct real responses, a hard
  404 for the invented one.
- *Content-type and body inspection.* Every real path answers `application/json; charset=utf-8`, not
  `text/html`, and the body is a genuine Statuspage payload with a page identity —
  `{"page":{"id":"7h56br5y94wh","name":"Chargebee",…},"status":{"indicator":"none","description":"All Systems Operational"}}`.
  The Atom feed at `/history.atom` is `application/atom+xml` and carries real dated Chargebee
  incidents.

Not a catch-all, and not a parked subdomain. A status page that itself fails reports `unknown`, never
`down` — it says nothing about the vendor.

The Atom feed was considered as the primary signal and rejected: `summary.json` states current state
directly, while a feed is a log of updates that has to be folded back into state. The feed remains
the better fallback if Statuspage ever drops the JSON API.

### `quota` — declared `unavailable`, and why

Chargebee publishes the ceilings but exposes **no headroom counter**. The "Error handling and rate
limits" page gives the per-site, per-minute limits by plan — **150** on Starter, **1000** on
Performance, **3500** on Enterprise, and **150 for every test site** — and the only runtime signal it
documents is the failure: a `429` carrying `api_error_code: api_request_limit_exceeded` and,
sometimes, a `Retry-After` header. A live response carries `date`, `content-type`, `cache-control`,
`strict-transport-security`, `www-authenticate`, `vary` and `server` — nothing that counts anything
(verified 2026-08-03).

Two alternatives were considered and rejected:

- *Probe a cheap read and report `ok` unless it 429s.* That is not a quota reading; it is a second
  liveness check wearing a quota's label, and it can only report a limit already hit. The derived
  `auth:api-key` check covers liveness.
- *Derive headroom from the published ceiling.* The app cannot know which plan the site is on, and an
  invented number is worse than none.

So it is declared `unavailable` with the real numbers in the reason, and
`severity: "informational"` so the resulting `unknown` never worsens a roll-up.

### `auth:api-key` — derived

The runtime derives a credential check from the Auth `test` hook, which probes `GET /configurations`
— *"Returns a list of your domain and product catalog version details."* It is the right probe
because it needs no resource permission (a Read-Only key can reach it, where `/customers` might be
restricted away), takes no parameters, and answers the one question this app most needs answered at
connect time: which product catalog version the site is on.

Confirmed to be a real route independently of the docs: with a bogus credential
`GET /api/v2/configurations` answers **401** while `GET /api/v2/definitely_not_real_xyz` answers
**404**, so the 401 is authentication failing on a real path rather than a catch-all.

A 404 is reported as *"no Chargebee site named X"* rather than a bad key — the two failures look
identical to a user and have completely different fixes.

## Development

```sh
deno task test    # 206 unit tests
deno task check
deno task lint
deno task fmt
```

`assets/icon.png` is Chargebee's own mark, copied byte-for-byte from n8n's
`nodes-base/nodes/Chargebee/chargebee.png`. Use `deno task fmt`, never a bare `deno fmt` — the bare
form would reformat asset files and break that guarantee.

## Links

- **Chargebee** — <https://www.chargebee.com>
- **API reference (used to build this app)** — <https://apidocs.chargebee.com/docs/api>
- **Getting started** (base URL, auth, envelope, pagination) —
  <https://apidocs.chargebee.com/docs/api/getting-started>
- **Error handling and rate limits** — <https://apidocs.chargebee.com/docs/api/error-handling>
- **Customers** · **Subscriptions** — <https://apidocs.chargebee.com/docs/api/customers> ·
  <https://apidocs.chargebee.com/docs/api/subscriptions>
- **Create a subscription** (the line-item wire sample) —
  <https://apidocs.chargebee.com/docs/api/subscriptions/create-subscription-for-items>
- **List site configurations** (the auth probe) —
  <https://apidocs.chargebee.com/docs/api/configurations/list-site-configurations>
- **Event types** — <https://apidocs.chargebee.com/docs/api/events/event-types>
- **OpenAPI specification** (the authoritative source for every path and parameter here) —
  <https://github.com/chargebee/openapi>
- **Official client libraries** (the authoritative source for the wire encoding) —
  <https://github.com/chargebee/chargebee-node> · <https://github.com/chargebee/chargebee-python>
- **GitHub org** — <https://github.com/chargebee>
- **API Explorer** — <https://api-explorer.chargebee.com>
- **Status** — <https://status.chargebee.com>

> Every link above was checked for HTTP 200 on 2026-08-03. One link Chargebee's *own* docs print on
> every page — `https://apidocs.chargebee.com/llms.txt`, offered as "the complete machine-readable
> documentation index" — is a **404**, so it is not listed here. The OpenAPI repository serves that
> purpose instead.
