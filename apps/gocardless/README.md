# GoCardless

Collect bank debits with GoCardless — customers, mandates, payments, subscriptions, payouts and
refunds — over the **GoCardless REST API**.

- **Categories** — commerce, finance
- **Auth methods** — access-token (bearer + API-version header)
- **Actions** — 16
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:access-token`
- **Egress allowlist** — `api.gocardless.com`, `api-sandbox.gocardless.com`
- **Website** — https://gocardless.com
- **API docs** — https://docs.gocardless.com/docs/api-reference
- **OpenAPI** — https://docs.gocardless.com/openapi-schema-public.json
- **Status page** — https://status.gocardless.com (302 → https://www.gocardless-status.com)

GoCardless collects money straight from a customer's bank account: Direct Debit in the UK, SEPA in
the euro area, ACH in the US, and the open-banking "Pay by Bank" rails. The shape of an integration
is always the same three-beat path —

> a **customer** → a **mandate** (the standing authorisation to debit their account) → **payments**
> and **subscriptions** against that mandate

— and the two books-keeping surfaces a payment operation then needs: **payouts** (what actually
landed in your bank account) and **refunds**.

> **Everything below was verified against GoCardless's own sources on 2026-09-22** — its
> machine-readable OpenAPI 3.1 document
> ([`openapi-schema-public.json`](https://docs.gocardless.com/openapi-schema-public.json),
> `info.version` `2015-07-06`), the prose reference at `docs.gocardless.com/docs/api-reference/*`,
> and GoCardless's own status page. Nothing here came from a third-party integration directory or a
> sibling app in this pack.

## The four things most likely to go wrong

### 1. There are two environments, and the token does not say which

GoCardless runs **live** (`api.gocardless.com`) and **sandbox** (`api-sandbox.gocardless.com`) as
two environments which, in the vendor's own words, are "completely separate, with its own account,
dashboard, access tokens, and API URLs".

A GoCardless access token is a bare opaque hex string (the vendor's own example is
`e72e16c7e42f292c6912e7710c123347ae178b4a`) with **no environment marker in it**. So unlike Paddle —
whose `pdl_live_…` / `pdl_sdbx_…` prefix selects the host inside `sign` — there is nothing in the
credential to derive the environment from. The environment is therefore an explicit **Auth field**,
`environment`, a `select` with `live` (the default) and `sandbox`, collected at connect time
alongside the token.

`sign` (`auth/access-token.ts`) rewrites `request.url`'s **hostname** from that field on every
outbound request. The mechanic is Paddle's; the input is the user's choice rather than the key's
prefix, because the key has no prefix. Both hosts are declared in `w6w.network.allow`, since either
can be selected at connect time and nothing else is ever called.

### 2. Every request needs two headers, not one

| Header | Why |
|---|---|
| `Authorization: Bearer <access_token>` | the credential |
| `GoCardless-Version: 2015-07-06` | **required on every request**; omitting it fails with `400 missing_version_header`, and an unrecognised value with `400 version_not_found` |

`POST`/`PUT` requests with a body additionally need `Content-Type: application/json` — GoCardless
answers `415 unsupported_media_type` without it — and everything wants
`Accept: application/json` (`406 not_acceptable` otherwise).

`Authorization` and `GoCardless-Version` are both stamped in the `sign` hook rather than repeated in
all sixteen actions. That is deliberate: the version is a fixed, uniform part of the wire format
rather than anything to do with the credential, but it *is* required everywhere, and sixteen copies
is sixteen chances to forget one. The client (`lib/client.ts`) sets the `Accept`, `Content-Type` and
`Idempotency-Key` headers, and never touches the credential.

`authHeaders()` is the single exported source of the two credential headers, so the `test` hook and
`sign` cannot diverge — and the `test` hook builds its own URL from the credential's chosen
environment rather than hard-coding the live host.

### 3. Errors are classified by body, never by status

Every failure answers the same envelope:

```json
{
  "error": {
    "type": "invalid_api_usage",
    "code": 400,
    "message": "…",
    "documentation_url": "…",
    "request_id": "…",
    "errors": [{ "reason": "access_token_not_found", "message": "…" }]
  }
}
```

`type` is one of `invalid_api_usage`, `invalid_state`, `validation_failed` or `gocardless`; each
item of `errors` carries a `reason`, except under `validation_failed`, where it carries a `field`.

`formatGoCardlessError` renders one line —
`GoCardless <code> <type>[/<reason>] for <METHOD> <path>: <message>` — and falls back to the raw body
when the body is not JSON. The credential never enters `lib/client.ts`, so it cannot appear in a
thrown error.

#### Idempotency conflicts name the resource they collided with

A create whose `Idempotency-Key` was already used answers `409` with
`error.errors[0].reason = idempotent_creation_conflict` and
`error.errors[0].links.conflicting_resource_id` pointing at the resource the first call created. That
id is printed in the error message, because finding that resource is the entire point of sending an
idempotency key.

### 4. The envelope is the resource's plural name, not `data`

`POST /customers` sends `{"customers": {…}}`, and a single-resource read answers
`{"customers": {…}}` — the same wrapper, keyed by the resource's pluralized snake_case name. There
is no `data` envelope (that is Apify's and Paddle's shape, not GoCardless's).

A list answers:

```json
{ "customers": [ … ], "meta": { "cursors": { "before": null, "after": "CURSOR" }, "limit": 50 } }
```

## Auth

One method: **Access Token** (`auth/access-token.ts`).

1. In the GoCardless dashboard, go to **Developers → Access tokens** and create a token. It is shown
   once.
2. Choose the **environment** the token belongs to. Create the token in the dashboard for that
   environment — a sandbox token only works against `api-sandbox.gocardless.com`, and a live token
   only against `api.gocardless.com`. For anything but real collections, use sandbox.
3. Paste it. The service checks the shape (a token that still carries the `Bearer ` prefix from the
   docs, or one with a line break in it, is named as such before anything is sent) and then probes
   the credential.

GoCardless publishes no OAuth surface a third-party app can use without a partner agreement, and no
scope model for a dashboard token — permissions belong to the account, not to the token — so there
is no second auth method and no scope to request.

### The probe is `GET /creditors?limit=1`

Chosen by reading the reference, not by reachability:

- **It requires a credential.** GoCardless has no unauthenticated read, so this cannot pass with the
  token missing: without `Authorization` it answers `401 missing_authorization_header`, and with a
  fake token `401 unauthorized`.
- **It needs no elevated permission.** Creditor *management* is always restricted, and
  customer-bank-account and mandate creation are restricted unless the app's payment pages are
  approved — none of those is a safe probe. A list read is not restricted.
- **It returns nothing of this app's.** The response is the merchant's own creditor records: their
  business name, address and bank scheme identifiers. Every token belongs to exactly one merchant
  organisation, which makes this the closest thing GoCardless has to a whoami, and the data is the
  caller's own.

`test` classifies the answer **from the response body** — GoCardless's own reason code — never from
the status line, and it is not fooled into blaming the token for things that are not the token's
fault:

| Body reason | Verdict |
|---|---|
| `unauthorized`, `access_token_not_found`, `access_token_revoked`, `access_token_not_active` | rejected — the token is wrong, revoked or belongs to the other environment |
| `missing_authorization_header`, `invalid_authorization_header` | the credential never reached GoCardless (reconnect), or arrived malformed — a different fix from "wrong token" |
| `missing_version_header`, `version_not_found` | a wire regression in **this app** (it always sends the version header), reported as such rather than blamed on the token |
| `forbidden` / `403` | **connected** — GoCardless accepted the credential but refused this read; the Connection is reported as working, with the restriction named |
| `rate_limit_exceeded` / `429` | **connected, unconfirmed** — throttling says nothing about the credential, so a working Connection is not failed by it |
| anything else | surfaced verbatim, with GoCardless's own `type` and `reason` |

Nothing is ever sent back: no code path echoes the token, the `Authorization` header or any part of
them.

`afterConnect` publishes `environment` and `host` for the Connection label
(`GoCardless ({{environment}})`) and makes **no network call** — the environment is a field the user
already chose, so there is no second wire format here to keep in sync with `sign`.

## Actions

16 actions. `resource` groups them in the editor.

| Key | Type | Method and path | Notes |
|---|---|---|---|
| `list-customers` | search | `GET /customers` | filters `currency`, `action_required`, `sort_field`, `sort_direction`, `created_at[gt/gte/lt/lte]` |
| `get-customer` | read | `GET /customers/{id}` | |
| `create-customer` | perform | `POST /customers` | restricted unless payment pages are approved — see below |
| `list-mandates` | search | `GET /mandates` | filters `customer`, `creditor`, `customer_bank_account`, `status`, `scheme`, `mandate_type`, `reference`, `created_at[…]` |
| `get-mandate` | read | `GET /mandates/{id}` | |
| `cancel-mandate` | perform | `POST /mandates/{id}/actions/cancel` | stops every future payment against it |
| `list-payments` | search | `GET /payments` | filters `currency`, `charge_date[…]`, `customer`, `creditor`, `subscription`, `mandate`, `status`, `scheme`, `sort_field`, `sort_direction`, `created_at[…]` |
| `get-payment` | read | `GET /payments/{id}` | |
| `create-payment` | perform | `POST /payments` | `amount`, `currency`, `links.mandate` required; idempotency key supported |
| `cancel-payment` | perform | `POST /payments/{id}/actions/cancel` | only before collection |
| `list-subscriptions` | search | `GET /subscriptions` | filters `mandate`, `customer`, `status`, `created_at[…]` |
| `create-subscription` | perform | `POST /subscriptions` | `amount`, `currency`, `interval_unit`, `links.mandate` required; idempotency key supported |
| `cancel-subscription` | perform | `POST /subscriptions/{id}/actions/cancel` | |
| `list-payouts` | search | `GET /payouts` | filters `creditor`, `creditor_bank_account`, `currency`, `status`, `reference`, `payout_type`, `created_at[…]` |
| `list-refunds` | search | `GET /refunds` | filters `payment`, `mandate`, `refund_type`, `created_at[…]` |
| `create-refund` | perform | `POST /refunds` | `amount`, `links.payment` required; idempotency key supported |

### Amounts are integers in the lowest denomination

Every `amount` — payments, subscriptions, refunds — is an integer in the currency's **lowest
denomination**: pence for GBP, cents for EUR. £10.00 is `1000`. Every amount param says so in its
hint, because a workflow that sends `10.5` gets a validation error about a field it thought it had
already formatted.

The supported currencies are GoCardless's own enum, read from the OpenAPI schema, and the `currency`
params are a `select` over exactly those: `AUD`, `CAD`, `DKK`, `EUR`, `GBP`, `NZD`, `SEK`, `USD`.

### Pagination is one shape on every list endpoint

Every `list-*` action takes `limit`, `after` and `before` and reports the same four output columns:
`items`, `afterCursor`, `beforeCursor`, `limit`. GoCardless's cursors are opaque; a workflow pages by
feeding one step's `afterCursor` into the next step's `after`, and an empty `afterCursor` is the end
of the collection. `limit` is passed through unclamped — the vendor applies its own default page size
when it is omitted and validates its own ceiling, and a ceiling invented here would only reject a
request GoCardless would have served.

### Date filters are four named params, not one JSON object

GoCardless filters a date field with a bracketed query key (`created_at[gte]=…`, `charge_date[lt]=…`).
Both options were open — four params, or one `json`-typed param — and four were chosen because they
render as four date pickers instead of asking a workflow author to type an object and get the
bracketed key names right. The mapping from `createdAtGte` to `created_at[gte]` lives in exactly one
place (`lib/params.ts#dateFilterQuery`).

### Idempotency

The four creating actions — `create-customer`, `create-payment`, `create-subscription`,
`create-refund` — all accept an optional `idempotencyKey`, sent as the `Idempotency-Key` header. When
it is left blank the app sends `ctx.invocation.invocationId` instead: stable across retries of one
workflow step, which is exactly what GoCardless asks for —

> "Always use idempotency keys when creating payments or mandates. A network timeout that causes you
> to retry without one can result in the same payment being taken twice."

— and on by default rather than opt-in, because the failure mode is a double debit. `undefined` is
sent only when there is neither a key nor an invocation id (an editor run, say).

None of the other endpoints accepts one, and none is offered it. All seven `perform` actions declare
`idempotent: false`: a replayed create debits again (or starts a second subscription series), and a
replayed cancel is the vendor's `invalid_state` error rather than a no-op — so the runtime must not
retry any of them on its own.

### Notes on individual actions

- **`create-payment` requires an active mandate.** `links.mandate` is the whole authorisation; the
  mandate must be `active` or GoCardless answers `invalid_state`. The usual shape is `list-mandates`
  (status `active`) → `create-payment`.
- **`charge_date` is a request, not a promise.** It is the earliest date GoCardless may collect; the
  debit lands on the next possible banking day, per the bank scheme's own calendar. Omitting it lets
  GoCardless choose the earliest available date.
- **`retry_if_possible: false` is a value, not an omission.** The body builder keeps `false` and `0`,
  so a caller who turns retries off does not silently get GoCardless's default instead.
- **`create-subscription` describes a cadence; GoCardless schedules it.** `interval_unit` (with
  `interval`, default 1), `start_date`, `day_of_month` and `month` are handed to GoCardless, which
  then generates each payment — so the calendar rules are the bank scheme's. `count` and `end_date`
  bound the series; leave both blank and it runs until cancelled.
- **`cancel-subscription` does not un-collect the current period.** Payments already generated stand;
  refund those.
- **`create-refund`'s `total_amount_confirmation` is the vendor's double-refund guard.**
  GoCardless refuses the refund unless the value equals the payment's total refunded amount *after*
  this refund is applied, so a retried refund cannot silently refund twice. It is optional in the
  vendor's schema and strongly recommended here, in the param hint.
- **Only `links.payment` is built on a refund.** GoCardless's refund object also takes
  `links.mandate` — refunding against a whole mandate — but that is a separately restricted feature
  per the vendor's own schema notes, so this app does not offer it. Refund against a mandate in the
  GoCardless dashboard.
- **Payouts and payments are different objects.** Payments are what was *collected*; payouts are what
  *arrived* in your bank account. A confirmed payment that has not been paid out yet appears in
  `list-payments` (`paid_out`) and not in `list-payouts`.
- **`status`, `scheme`, `mandate_type`, `payout_type` and `refund_type` are passed through as free
  text**, with the vendor's own values named in the hint. They are GoCardless's enums and GoCardless
  validates them; a list frozen into this app would reject a value the vendor adds later. Only the
  enums this app's reference pins down exactly — the eight currencies, `interval_unit`'s
  `weekly`/`monthly`/`yearly`, and `action_required`'s literal `"true"`/`"false"` strings — are
  narrowed to a `select`.

## Health checks

Two declared checks plus the derived `auth:access-token`.

### `service` — a real, machine-readable incident feed

`https://status.gocardless.com` is not a status page: it 302-redirects to
**`https://www.gocardless-status.com/`**, an incident.io-hosted page with its own components and
incident history, which publishes an RSS feed at `/history.rss`. That feed is declared with
`feed: { url: … }`, so the host fetches and parses it and the check only interprets:

```ts
feed: { url: "https://www.gocardless-status.com/history.rss" },
check({ feed }) {
  if (feed?.error) return { state: "unknown", message: feed.error };
  const open = (feed?.latest ?? []).filter((e) => !RESOLVED.test(e.summary));
  …
}
```

Three details are deliberate:

- **`latest`, not `entries`.** A feed is a log of updates, not a statement of current state, and the
  host's `latest` is the fold of those updates onto one entry per incident.
- **The vendor's own `Status:` line is the classifier** — `Status: Resolved` is closed,
  `Investigating` / `Identified` / `Monitoring` / `Scheduled` are open — matched
  case-insensitively, tolerating a leading markup tag in case a host hands the body over unparsed. It
  never sniffs the human title for the word "resolved".
- **No `network.allow`.** A declared feed's host is allowlisted implicitly and is bound to an
  unsigned posture, so the status host can never see a GoCardless token. Severity stays at the
  `kind: "service"` default (`degraded`): GoCardless is SaaS-only, so an incident on this page really
  is evidence about every Connection this app can hold.

### `quota` — the rate-limit headers, read off a normal API call

GoCardless documents that **every** response carries:

```
ratelimit-limit: 1000
ratelimit-remaining: 163
ratelimit-reset: Thu, 03 May 2018 16:00:00 GMT
```

1,000 requests/minute is the standard allowance, and exceeding it answers `429 rate_limit_exceeded`.
The check makes the same call the credential probe makes (`GET /creditors?limit=1` — the allowance is
per access token, not per endpoint) and reports the three headers as a `requests` bucket, with
`ratelimit-reset`'s HTTP-date parsed into ISO 8601. `remaining` of `0` reports `degraded` (never
`down`: an exhausted window rolls over on its own); headers that are absent report `unknown` rather
than a guess.

It is `kind: "quota"`, `scope: "connection"`, `credential: "signed"` — so the host routes it through
`sign` exactly like an Action, which is also what lands it on the Connection's chosen environment.
It declares no `network.allow`, which a signed posture requires anyway. `severity` is
`informational`: headroom is context rather than a verdict, and the defensive `unknown` above must not
pin the whole app at `unknown` forever — the trap `HEALTHCHECKS.md` names.

### `auth:access-token`

Derived automatically from `auth/access-token.ts`'s `test` hook; nothing extra is written for it.

## Known vendor restrictions

GoCardless restricts a handful of endpoints for any app that is not specifically approved. **A `403`
on one of these is a normal vendor answer, not a bug in this app or a bad token:**

- **Always restricted:** creditor create/update, and every creditor-bank-account endpoint.
- **Restricted unless your app's payment pages are approved as scheme-rules compliant:** customer
  create, customer-bank-account create, mandate create and reinstate.

None of this app's actions touches creditor management, and the vendor's own guidance is that a `403`
on a still-restricted path means **the account is under review**, not that anything is broken. The
`create-customer` action says so in its description, and the credential probe reports a `403` as
"connected, but not permitted for this read" rather than failing the Connection.

## Deliberately not covered

- **Mandate creation.** GoCardless lists "Mandate — create and reinstate" as restricted unless the
  caller's payment pages are approved, and in practice mandate creation goes through the vendor's
  Billing Request flow — a bank-authorisation redirect the payer completes in their own browser.
  This app's action model (one synchronous `execute`) cannot represent that faithfully, so mandates
  are read, listed and cancelled only.
- **Billing Requests, Billing Request Flows, Payer Authorisations and Bank Authorisations.** Same
  reason: multi-step redirect flows, not fire-and-forget calls.
- **Creditor management.** Always restricted per the vendor's own docs.
- **Webhook signature verification.** Webhook handling in this pack's model is a Trigger, and this
  app's scope is Actions, Auth and health checks only.
- **`links.mandate` refunds.** See "Notes on individual actions".
- **Mandate, payment and subscription search by arbitrary fields.** Only the filters GoCardless
  documents for each endpoint are exposed; anything else is the caller's own narrowing of a page.

## Icon

`assets/icon.svg` is GoCardless's own mark, fetched verbatim on 2026-09-22 from the URL their
marketing site declares as its `<link rel="icon">`
(`https://framerusercontent.com/images/HGclCakwkjXTJWerSl9H76gCo.svg`) — the "G in a yellow circle"
mark, two flat colours (`#F1F252` on `#1C1B18`) on a 64×64 canvas, 578 bytes. It is written through
byte-for-byte and is deliberately **not** in the `deno task fmt` path: formatting it would rewrite
the SVG and make this paragraph false.

## Layout

```
apps/gocardless/
├── package.json            # w6w manifest block (id, categories, icon, network.allow)
├── deno.json               # tasks + import map (copied from apps/apify)
├── tsconfig.json           # copied from apps/apify verbatim
├── index.ts                # default-exports { actions, auth, healthChecks }
├── actions/                # 16 actions, one file each
├── auth/access-token.ts    # bearer + GoCardless-Version, environment select, host rewrite in sign
├── health/service.ts       # incident.io RSS feed
├── health/quota.ts         # ratelimit-* headers off GET /creditors?limit=1
├── lib/client.ts           # hosts, envelope, error formatter, typed error, the HTTP client
├── lib/params.ts           # shared param/output builders (pagination, date filters, amounts)
├── assets/icon.svg         # the vendor's own mark, byte-for-byte
└── tests/                  # authored-layout mirror: actions/, auth/, health/, lib/, index.test.ts
```

Nothing in this app reads a credential outside `auth/access-token.ts`: the client sets only `accept`,
`content-type` and `idempotency-key`, and a test in `tests/index.test.ts` re-derives that from every
action's own source (no `authorization`, no `credential`, no host literal, no bare `fetch`).

## Development

```sh
deno task check      # type-check index, actions, auth, health, lib and tests
deno task lint       # deno lint (recommended rules)
deno task fmt        # format — never bare `deno fmt`, which would rewrite assets/icon.svg
deno task test       # 126 unit tests against a mocked HookContext
deno task validate   # the pack's own conformance audit against this app
```
