# ThriveCart

Read ThriveCart's products, bump/upsell/downsell offers, transactions, customers and affiliates,
and manage subscriptions, affiliates, Learn students and webhook subscriptions, on the
**ThriveCart external API**.

- **Categories** — commerce, marketing
- **Auth methods** — api-token (bearer)
- **Actions** — 33
- **Health checks** — 2 (both declared absences, `informational`) + the derived `auth:api-token`
- **Egress allowlist** — `thrivecart.com`
- **Website** — https://thrivecart.com/
- **Developer portal** — https://developers.thrivecart.com/
- **API reference (Postman)** — https://apidocs.thrivecart.com/
- **PHP SDK (source of truth for base URL/headers)** — https://github.com/thrivecart/php-api
- **Status page** — none published

> **Everything below was verified on 2026-08-15** against ThriveCart's own published Postman
> collection (`https://apidocs.thrivecart.com/api/collections/13408532/TVejhANr`, 93,209 bytes, 33
> documented requests), the vendor's open-source PHP SDK (`thrivecart/php-api`) and
> `thrivecart/api-demo`, and live probes against `thrivecart.com`. Nothing here came from a
> third-party integration directory.

## Three things that would have cost someone a day

### 1. The base host is `thrivecart.com`, not `api.thrivecart.com`

`https://api.thrivecart.com/api/external/ping` returns a bare `404`. There is no `api.` subdomain —
every documented request targets `https://thrivecart.com` with an `/api/external` prefix, and the
PHP SDK hard-codes exactly that (`Api::$baseUri = 'https://thrivecart.com'`,
`Api::$endpoint = '/api/external'`). Unlike a merchant's own storefront
(`https://<account>.thrivecart.com/`, visible in `ping`'s response), the API itself is **not**
addressed per-tenant — one fixed host serves every account, so nothing in this app needs a
Connection-supplied host or a `context`-posture health check.

### 2. The collection's own documented error shape is not the one a real bad credential produces

The collection documents exactly one 401 body:

```json
{ "error": "invalid_token", "error_description": "The access token provided is invalid" }
```

That shape is real — but only for a bearer value with **no hyphen** in it, and it arrives with a
`WWW-Authenticate: Bearer …` header the other shapes never send. Live probing on 2026-08-15 found two
more, both undocumented and both missing `error_description` and the header:

| Sent `Authorization`             | Response                          |
| --------------------------------- | ---------------------------------- |
| *(no header at all)*               | `{"error": "auth.missing"}`        |
| A **hyphenated** bearer value      | `{"error": "auth.invalid"}` or `{"error": "auth.incorrect"}` (deterministic per value) |
| A bearer value with **no hyphen**  | the documented `invalid_token` shape |

That third bucket looks like the one worth designing around — it's the one the docs show — except
`thrivecart/api-demo`'s own form field prompts for an API key shaped
`XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`. **Real ThriveCart access tokens are hyphenated**, so a
genuinely revoked or mistyped credential lands in the undocumented `auth.*` bucket, not the one the
collection shows. `formatThriveCartError` ([`lib/client.ts`](lib/client.ts)) and the auth `test` hook
([`auth/api-token.ts`](auth/api-token.ts)) both read `error` generically — surfacing whatever string
is there — rather than switching on the one code that happens to be published.

### 3. Several documented "read" endpoints are `POST`s with no query-string equivalent

Read Customer Information (`POST /customer`, body `email`) and Read Affiliate Info
(`POST /affiliate`, body `affiliate_id`) look up one record each with no side effect. Both are typed
`read` here — matching the RFC's semantics (single object, fetched by key) — rather than `perform`,
which the HTTP verb alone would suggest.

## Auth

Single method: **`api-token`**, `type: "bearer"` — `Authorization: Bearer <token>`. The developer
portal also describes an OAuth2 app flow ("if you intend to create an application that lots of
ThriveCart users can all use"), but the published collection documents only the bearer-token form —
`auth.type: "bearer"` in the collection's own `auth` block, no `oauth2` config anywhere — so that is
the only method implemented. A token minted through either path is presented the same way on the
wire.

The credential-liveness probe is **`GET /ping`** — the collection's own description: "It's also
useful to check the validity of your token." It needs a credential, is scoped to no particular
resource, and its response (account name/id/version/url plus the calling user's id/username/name)
carries no credential material — so it doubles as the `account-get` Action. See finding 2 above for
what its *failure* response actually looks like.

## Actions

33 actions. `resource` groups them in the editor.

| Key                                 | Type    | Endpoint                                              |
| ------------------------------------ | ------- | ------------------------------------------------------ |
| `account-get`                        | read    | `GET /ping`                                             |
| `product-list`                       | search  | `GET /products`                                         |
| `product-get`                        | read    | `GET /products/{product_id}`                            |
| `product-pricing-get`                | read    | `GET /products/{product_id}/pricing_options`             |
| `bump-list`                          | search  | `GET /bumps`                                            |
| `bump-get`                           | read    | `GET /bumps/{bump_id}`                                   |
| `bump-pricing-get`                   | read    | `GET /bumps/{bump_id}/pricing_options`                    |
| `upsell-list`                        | search  | `GET /upsells`                                          |
| `upsell-get`                         | read    | `GET /upsells/{upsell_id}`                                |
| `upsell-pricing-get`                 | read    | `GET /upsells/{upsell_id}/pricing_options`                 |
| `downsell-list`                      | search  | `GET /downsells`                                        |
| `downsell-get`                       | read    | `GET /downsells/{downsell_id}`                            |
| `downsell-pricing-get`               | read    | `GET /downsells/{downsell_id}/pricing_options`             |
| `transaction-search`                 | search  | `GET /transactions`                                     |
| `transaction-refund`                 | perform | `POST /refund`                                          |
| `customer-get`                       | read    | `POST /customer`                                        |
| `customer-email-update`              | perform | `POST /customerEmailUpdate`                              |
| `subscription-cancel`                | perform | `POST /cancelSubscription`                               |
| `subscription-pause`                 | perform | `POST /pauseSubscription`                                |
| `subscription-resume`                | perform | `POST /resumeSubscription`                               |
| `affiliate-search`                   | search  | `GET /affiliates`                                       |
| `affiliate-get`                      | read    | `POST /affiliate`                                        |
| `affiliate-create`                   | perform | `POST /affiliates`                                       |
| `affiliate-favorite`                 | perform | `POST /affiliates/{affiliate_id}/favorite`                |
| `affiliate-unfavorite`               | perform | `POST /affiliates/{affiliate_id}/unfavorite`               |
| `affiliate-register`                 | perform | `POST /affiliates/{affiliate_id}/register`                 |
| `affiliate-approve`                  | perform | `POST /affiliates/{affiliate_id}/approve`                  |
| `affiliate-reject`                   | perform | `POST /affiliates/{affiliate_id}/reject`                   |
| `affiliate-custom-commissions-set`   | perform | `POST /affiliates/{affiliate_id}/custom_commissions`       |
| `affiliate-delete`                   | perform | `POST /affiliates/{affiliate_id}/delete`                   |
| `student-create`                     | perform | `POST /students`                                        |
| `webhook-subscribe`                  | perform | `POST /subscribe`                                        |
| `webhook-unsubscribe`                | perform | `POST /unsubscribe`                                      |

### Idempotency

- **`transaction-refund`, `affiliate-create`, `student-create`, `webhook-subscribe`** are
  `idempotent: false`. A refund moves real money with no documented dedup key; the other three create
  a new resource, and `webhook-subscribe` in particular is retried at real risk — the vendor's own
  guidance is to use "random and unique URLs for each subscription", specifically *because*
  subscriptions are removed by URL and nothing dedupes a repeat `POST /subscribe` against the same
  `target_url`.
- **Every other `perform`** — the subscription lifecycle (cancel/pause/resume), the affiliate
  state-setting endpoints (favorite/unfavorite/register/approve/reject/custom-commissions/delete) and
  `customer-email-update` — is `idempotent: true`. Each sets one named target (an order+subscription
  pair, an affiliate/product relationship, a customer's email field) to the same end state however
  many times it is called, and the vendor's own docs back this for the two cases that say anything at
  all: Approve/Reject are no-ops "if the application isn't already pending", and Cancel/Pause on a
  target the caller cannot access answers `400` rather than silently repeating.

### Notes on individual actions

- **`product-pricing-get`, `bump-pricing-get`, `upsell-pricing-get`, `downsell-pricing-get`** carry no
  example response anywhere in the collection, so their output is passed through unshaped
  (`{ data: object }`) rather than typed field-by-field. `affiliateId` (the one documented query
  parameter, `?affiliate_id=`) is only exposed on the product variant — the collection shows it there
  and nowhere else.
- **`product-list`/`bump-list`/`upsell-list`/`downsell-list`** return a bare JSON array with **no
  filter or pagination parameters documented anywhere** — the whole account's set comes back every
  call. This app wraps the array as `{ items }` for a consistent shape with the paginated search
  actions; it does not invent a `page`/`perPage` the vendor doesn't support.
- **`transaction-search`**'s `transactionType` options come from the PHP SDK's own
  `Api::$api_config['transactionTypes']` array — the collection's query string only shows the default
  (`any`).
- **`affiliate-create`, `affiliate-register`, `affiliate-approve`, `affiliate-reject`** send
  `product_ids` as repeated `product_ids[]` form fields. The collection documents the key as a bare
  `product_ids` (no brackets) with no worked example of an array field on that endpoint; the one array
  field the collection *does* show in full — `tags[]` on Create Student — uses bracket notation, which
  is also the standard PHP `$_POST` convention for turning a repeated key into an array. This app
  follows the one convention it can see in full rather than guessing a second one; see
  [`lib/client.ts`](lib/client.ts) for the full note.
- **`affiliate-custom-commissions-set`** passes the caller's JSON straight through as the
  `commission_object` form field. The vendor documents no schema for it beyond "see our example SDK",
  so this app doesn't invent one; an explicit `null` clears the override, per the vendor's own
  description.
- **`student-create`** sends `order_info[order_id]`, `order_info[purchase_type]` and
  `order_info[purchase_id]` as literal bracketed form keys — the one place in this app's surface that
  nests, matching the vendor's documented field names exactly rather than modelling them as a `group`
  param.
- **`customer-email-update`** defaults `allowMerge` to `false`. The vendor's own words: "explicit
  merge confirmation is required to prevent accidental data consolidation" when the new email already
  belongs to another customer — consolidating two customers' order history is not something to opt
  into by omission.
- **`webhook-subscribe`**'s `targetUrl` must begin with a URL already registered in the ThriveCart
  app's own settings; a workflow-supplied URL that was never registered there is rejected by
  ThriveCart regardless of what this action sends.

## Health checks

Both declared absences, `severity: "informational"` (an `unavailable` check always reports
`unknown`, which outranks `ok` in the roll-up — anything but `informational` would pin the App's
verdict there forever):

- **`service`** — `status.thrivecart.com/api/v2/summary.json` returns `404`, and no page linked from
  `thrivecart.com` or `developers.thrivecart.com` points at a status surface.
- **`quota`** — neither the collection nor the developer portal documents a rate limit, a quota
  endpoint, or any `X-RateLimit-*`-style header, and none was observed on any response (success or
  error) during live verification.

Plus the `auth:api-token` check derived automatically from the auth method's `test` hook.

## Icon

`assets/icon.png` was placed before this app was built: a **32×32 PNG**, the pixel-exact frame of
`https://thrivecart.com/favicon.ico` extracted to PNG. It is not edited, replaced, or regenerated
here. **Low resolution is accepted deliberately** — a real, byte-accurate vendor mark at 32×32 beats
an invented higher-resolution vector rendition, and ThriveCart publishes no SVG or larger PNG mark
that could be sourced instead. It is declared via `appearance.icon.url` (a single raster source, not
`sizes`), matching the convention already used for a low-resolution vendor PNG elsewhere in this pack
(`apps/bamboohr`). It is not formatted by `deno task fmt`, whose file list names only the `.ts`
directories.

## Layout

```
thrivecart/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ThriveCartClient, error formatting, the two auth-error shapes
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # bearer token: sign, test, afterConnect
├── actions/                     # one file per action (33)
├── health/
│   ├── service.ts               # declared absence, informational
│   └── quota.ts                 # declared absence, informational
├── assets/icon.png               # vendor mark, verbatim, byte-exact 32x32 frame
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
