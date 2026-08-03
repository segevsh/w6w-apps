# Square

Read and write Square payments, refunds, orders, customers, catalog items, locations and invoices
via the Square Connect v2 API.

- **Categories** — commerce, finance
- **Auth methods** — access-token
- **Actions** — 17
- **API version** — `Square-Version: 2026-07-15`, pinned in `lib/client.ts`
- **Egress allowlist** — `connect.squareup.com`, `connect.squareupsandbox.com`

## Links

- **Website** — https://squareup.com
- **API docs** — https://developer.squareup.com/docs
- **API reference** — https://developer.squareup.com/reference/square (the reference this app was
  built against; every path, param and enum below was read off Square's own OpenAPI document on
  2026-08-03, not from memory)
- **The OpenAPI document itself** — https://github.com/square/connect-api-specification (the file
  the reference is generated from; `api.json` is what pinned the version literal and both hosts)
- **Versioning** — https://developer.squareup.com/docs/build-basics/versioning-overview
- **Release notes** — https://developer.squareup.com/docs/changelog/connect
- **Idempotency** — https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency
- **Pagination** — https://developer.squareup.com/docs/build-basics/common-api-patterns/pagination
- **Error handling** —
  https://developer.squareup.com/docs/build-basics/general-considerations/handling-errors
- **Access tokens** — https://developer.squareup.com/docs/build-basics/access-tokens
- **OAuth (not implemented here)** — https://developer.squareup.com/docs/oauth-api/overview
- **Sandbox** — https://developer.squareup.com/docs/devtools/sandbox/overview
- **Status page** — https://issquareup.com
- **GitHub** — https://github.com/square — the vendor's own org; the OpenAPI spec above and the
  official SDKs (`square/square-nodejs-sdk`, `square/square-python-sdk`, …) live there

## Actions

| Resource | Action               | Endpoint                                 |
| -------- | -------------------- | ---------------------------------------- |
| location | List Locations       | `GET /v2/locations`                      |
| location | Get Location         | `GET /v2/locations/{location_id}`        |
| payment  | List Payments        | `GET /v2/payments`                       |
| payment  | Get Payment          | `GET /v2/payments/{payment_id}`          |
| payment  | Create Payment       | `POST /v2/payments`                      |
| refund   | List Refunds         | `GET /v2/refunds`                        |
| refund   | Get Refund           | `GET /v2/refunds/{refund_id}`            |
| refund   | Refund Payment       | `POST /v2/refunds`                       |
| order    | Get Order            | `GET /v2/orders/{order_id}`              |
| order    | Search Orders        | `POST /v2/orders/search`                 |
| customer | List Customers       | `GET /v2/customers`                      |
| customer | Get Customer         | `GET /v2/customers/{customer_id}`        |
| customer | Create Customer      | `POST /v2/customers`                     |
| customer | Update Customer      | `PUT /v2/customers/{customer_id}`        |
| catalog  | List Catalog Objects | `GET /v2/catalog/list`                   |
| catalog  | Search Catalog Items | `POST /v2/catalog/search-catalog-items`  |
| invoice  | List Invoices        | `GET /v2/invoices`                       |

**There is no "List Orders".** Square publishes no `GET /v2/orders`; `POST /v2/orders/search` _is_
the list endpoint. That is why `order-search` exists where every other resource here has a
`*-get-many`.

**Deliberately absent:**

- **Webhooks** (`/v2/webhooks/subscriptions`) — that is a Trigger, not an Action.
- **Unlinked refunds** — `RefundPayment` with `unlinked: true` returns money for a payment Square
  never processed. It needs `destination_id` + `location_id`, is gated per account, and is a
  materially different operation from refunding a Square payment. Folding both into one form would
  make it easy to refund the wrong thing, so `refund-create` covers linked refunds only.
- **Catalog writes** (`UpsertCatalogObject`, `BatchUpsertCatalogObjects`) — a catalog object is a
  deeply nested, type-tagged union (an `ITEM` carrying `item_data.variations[]` carrying
  `item_variation_data.price_money`, …). A form cannot express it honestly, and a raw-JSON param
  would just be the Square API with extra steps.
- **Order create / update / pay** — the same problem one level worse: line items, taxes, discounts,
  service charges, fulfilments and tenders, with `UpdateOrder` requiring sparse-update field paths
  plus a version. The read surface is covered; a payment can be attached to an order created
  elsewhere via `payment-create`'s **Order ID**.
- **Invoice writes** (`CreateInvoice`, `PublishInvoice`, `CancelInvoice`) — an invoice's
  payment-request schedule is its own nested model. Only the list is exposed, rather than a partial
  write that looks complete.
- **Square's `custom_url` environment** — a third server variable in the spec, for Square's own
  internal proxying. Supporting it would mean a `"*"` egress allowlist.

## The `Square-Version` header

Square pins the API contract to a `Square-Version` request header in `YYYY-MM-DD` form. On the
request it is technically **optional**, and that is exactly the problem: omit it and Square applies
whatever "default API version" is pinned to the application whose token you are using, on somebody
else's Developer Console page, which drifts when they click _upgrade_ and is invisible from here.

So this app sends it on **every** request and offers **no per-action override**. The value lives in
one constant:

```ts
// lib/client.ts
export const SQUARE_VERSION = "2026-07-15";
```

`SquareClient.request()` stamps it on every call, and the auth method's `test` and `afterConnect`
hooks — which build their requests directly rather than through the client — stamp it too. A
sweep test in `tests/index.test.ts` drives **every** action and asserts the header is present, so a
new action cannot quietly ship without it.

How `2026-07-15` was confirmed (2026-08-03):

- Square's own OpenAPI document declares the header as a literal:
  `x-fern-global-headers[0] = { header: "Square-Version", type: 'literal<"2026-07-15">' }`, and the
  same string is the `Square-Version` default on the `oauth2` security scheme.
- The release notes at `/docs/changelog/connect` list `2026-07-15` as **Latest**, ahead of
  `2026-05-20`, `2026-04-21`, `2026-01-22` and `2025-10-16`.

Bumping it is a deliberate, reviewable one-line edit — which is the point. A unit test asserts the
exact string, so a bump is never accidental.

## Sandbox vs production

Square's sandbox is a different **host**, not a flag:

| Environment | Host                            |
| ----------- | ------------------------------- |
| production  | `connect.squareup.com`          |
| sandbox     | `connect.squareupsandbox.com`   |

A token is minted for exactly one of them; presenting a sandbox token to production (or the reverse)
fails with `AUTHENTICATION_ERROR` / `UNAUTHORIZED`.

That makes the environment a property of the **credential**, not of a call — so it is collected once
as an Auth field, not as an action param. `afterConnect` echoes it onto the Connection's redacted
`display`, and `lib/client.ts` reads it back from there:

```
connect form → credential.environment
             → afterConnect → connection.display.environment
             → hostFromConnection(ctx.connection) → https://<host>/v2
```

Two consequences worth stating: an Action never sees the credential yet always gets the right host,
and no workflow author can point a live token at the sandbox (or a sandbox token at production) by
filling in the wrong field. Anything unrecognised resolves to **production**, and both hosts are on
the app's egress allowlist.

## Idempotency keys

Square puts the idempotency key in the **request body**, not a header — there is no
`Idempotency-Key` header here, unlike Stripe. Four endpoints in this app take one:

| Action            | Endpoint            | Square says | Max length |
| ----------------- | ------------------- | ----------- | ---------- |
| `payment-create`  | `POST /v2/payments` | required    | 45         |
| `refund-create`   | `POST /v2/refunds`  | required    | 45         |
| `customer-create` | `POST /v2/customers`| optional    | unbounded in the spec; capped at 45 here |
| _(order create)_  | `POST /v2/orders`   | optional    | 192 — endpoint not implemented |

**What this app does, and why.** Each of the three implemented write actions takes an optional
`idempotencyKey` param. When it is left empty the key defaults to **`ctx.invocation.invocationId`**
— the host-issued id of that call. A retried invocation reuses the same id, so Square replays the
original response instead of charging or refunding twice. That is precisely what the field exists
for, and it is why those actions declare `idempotent: true` honestly.

There is deliberately **no third fallback**. Generating a random key would make every retry a fresh
charge while still _looking_ idempotent, so when neither an override nor an invocation id is
available the action throws before it ever calls Square. For the same reason an over-long key is
rejected rather than truncated — truncation invents collisions. `customer-create` sends a key even
though Square does not demand one, because "create a duplicate customer on retry" is never what
anyone wanted.

`customer-update` takes no key: Square's `UpdateCustomer` accepts none. It offers optimistic
concurrency instead — pass the `version` you read and Square rejects the write if the profile moved
underneath you. That action is `idempotent: false` accordingly.

## Pagination

Square pages with an **opaque forward-only cursor**, never an offset. A list or search response
carries `cursor` when more results exist and **omits it entirely** on the last page. Every
paginating action here exposes `cursor` as both a param and an output field, so a workflow drives
the loop itself: feed the previous response's `cursor` back in, stop when it is absent.

`location-get-many` is the exception — Square returns every location in one unpaginated response.
`catalog-get-many` paginates but fixes the page size at 100 and offers no `limit` at all.

## Errors

Failures come back as an envelope, and note the plural — one 400 can carry several field errors:

```json
{
  "errors": [
    { "category": "INVALID_REQUEST_ERROR", "code": "VALUE_TOO_LOW", "field": "amount_money.amount",
      "detail": "…" }
  ]
}
```

`category` is a fixed enum: `API_ERROR`, `AUTHENTICATION_ERROR`, `INVALID_REQUEST_ERROR`,
`RATE_LIMIT_ERROR`, `PAYMENT_METHOD_ERROR`, `REFUND_ERROR`, `MERCHANT_SUBSCRIPTION_ERROR`,
`EXTERNAL_VENDOR_ERROR`. The client surfaces **all** entries, each as
`CATEGORY CODE (field) detail`, rather than only the first.

## Auth

**Access Token** (`bearer`), sent as:

```
Authorization: Bearer {accessToken}
```

Mint one in the Square Developer Console under your application → **Credentials → Access token**,
then pick the environment it belongs to. Production tokens start with `EAAA`; sandbox tokens with
`EAAAE`.

**OAuth2 exists and is not implemented here.** Square documents two credential shapes, and both go
on the wire identically as bearer tokens:

- a **personal access token** — unscoped, reaches everything your own account can. This is what the
  form collects.
- an **OAuth access token** — obtained by walking a seller through Square's authorization-code flow
  and scoped to the permissions they granted. That is the right credential for a multi-merchant
  integration, and it would need this app registered as a Square application with a redirect URL,
  which is deployment configuration rather than app code. The endpoints, for whoever adds it, are
  `/oauth2/authorize` and `/oauth2/token` on the **same host as the API** (so
  `connect.squareupsandbox.com` for a sandbox app) — exported from `lib/client.ts` as
  `OAUTH_AUTHORIZE_PATH` / `OAUTH_TOKEN_PATH`.

Because both are bearer tokens, an OAuth-issued seller token pasted into this form works today. It
is simply scoped, so a call needing a permission the seller did not grant fails with
`AUTHENTICATION_ERROR` / `INSUFFICIENT_SCOPES`.

## Health

### Is Square up?

**Real probe.** Square's status page is `issquareup.com` — not `status.squareup.com`, which does not
resolve to a usable TLS endpoint at all — and it is linked from `developer.squareup.com`. It serves
a Statuspage-shaped JSON API, and that was **checked rather than assumed** on 2026-08-03, because an
HTML catch-all will happily return 200 for any path you invent:

```
GET https://issquareup.com/api/v2/status.json
→ 200 application/json, 199 bytes
  {"page":{"id":"01KA8HXZG84ZKV47J5B48Q10ZA","name":"Square","url":"https://issquareup.com/", …},
   "status":{"description":"All Systems Operational","indicator":"none"}}

GET https://issquareup.com/api/v2/definitely-not-a-real-endpoint.json
→ 404, empty body
```

Different status, different content type, different body: a real route, not a catch-all. Two further
findings shaped the check:

- `/api/v2/summary.json` also answers 200 JSON, but its `components` array is **empty** — Square
  publishes a single rollup and no per-component breakdown. So the probe reads the smaller
  `status.json` and reports no `components`, rather than pretending to detail that is not published.
- `/api/v2/incidents/unresolved.json` returns a Next.js HTML error page, and `/history.rss` and
  `/history.atom` both 404. There is no Atom/RSS feed to declare via `feed:` and no incident list to
  enumerate. The rollup `indicator` is the whole of what Square makes machine-readable.

`indicator` maps `none → ok`, `minor → degraded`, `major`/`critical` → `down`; anything unrecognised
is `unknown`. A status page that itself fails reports `unknown`, never `down` — a broken status page
says nothing about the vendor.

### Is the credential live?

**Derived.** The runtime turns the `access-token` method's `test` hook into an `auth:access-token`
check. It calls `GET /v2/merchants/me` — Square's documented "the merchant this token belongs to"
alias — on the credential's own host. Chosen over `GET /v2/locations` because it is the cheapest
read a legitimately narrow credential can still reach: it needs only `MERCHANT_PROFILE_READ`, which
any seller grants for the integration to identify them at all.

### Do we have quota left?

**Unavailable, declared.** Square publishes nothing to probe:

- there is no usage or quota endpoint anywhere in the OpenAPI document — no `/v2/usage`, no
  rate-limit resource, nothing on `/v2/merchants/me`;
- the "Handling errors" guide documents only the enforcement side — excess traffic gets `429 Too
  Many Requests` carrying `RATE_LIMIT_ERROR` / `RATE_LIMITED`, and the advice is exponential backoff
  with jitter. It names no `X-RateLimit-*` headers, no `Retry-After`, and no published ceiling.

So there is no number to report and no header to read. Reacting to a 429 is retry policy, not a
health probe. The check is declared `unavailable` with that reason and `severity: "informational"`,
so the permanent `unknown` it reports never worsens the app's verdict — better than a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key                 | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                     |
| ------------------- | ---------- | ---------- | ---------- | ------------- | ------------ | --------------------------------------------------------- |
| `service`           | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                       |
| `quota`             | quota      | connection | signed     | informational | —            | declared `unavailable` — nothing published                |
| `auth:access-token` | credential | connection | signed     | fatal         | —            | derived from the `access-token` method's `test` hook      |

`issquareup.com` is reachable **only inside the `service` hook's worker** — not from any action, and
not from the other checks. The spec allows that widening precisely because the check is unsigned;
pairing an extra host with `credential: "signed"` is rejected at load time, so a credential can
never reach a status host.

---

Researched and endpoint-verified 2026-08-03 against Square's own OpenAPI document
(`square/connect-api-specification@master/api.json` — every path, param name, enum, required field,
idempotency-key length, both host URLs and the `2026-07-15` version literal were read off it) and
the prose docs it links to on developer.squareup.com. Confirmed live: `issquareup.com/api/v2/*`
(status API shape, and a bogus sibling path returning 404 to prove it is not an HTML catch-all).
Status surfaces move; re-check if a probe starts failing for everyone at once.

The icon is Square's own logomark, taken verbatim from the site header of
`developer.squareup.com` — both paths unchanged, with the page's CSS-variable fill replaced by a
literal `#000000`.
