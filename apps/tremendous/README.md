# Tremendous

Send gift cards, prepaid cards, cash payouts and charitable donations, and manage the orders,
rewards, products and campaigns behind them, on the **Tremendous API v2**.

- **Categories** — commerce, hr
- **Auth methods** — api-key (bearer)
- **Actions** — 14
- **Health checks** — 3 (`service`, `quota`, ~~`request-rate`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.tremendous.com` (the `service` check adds `status.tremendous.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.tremendous.com
- **API docs** — https://developers.tremendous.com/docs/introduction
- **API reference** — https://developers.tremendous.com/reference/orders (per-endpoint OpenAPI 3.0)
- **Status page** — https://status.tremendous.com

> **Everything below was verified against Tremendous's own sources on 2026-09-15** — the
> per-endpoint OpenAPI 3.0 definitions served at `developers.tremendous.com/reference/<slug>.md`
> (each embedding the shared `BearerApiKey` security scheme and `servers` array), the prose guides
> under `developers.tremendous.com/docs/*`, and live probes against `api.tremendous.com`,
> `testflight.tremendous.com` and `status.tremendous.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to cost you a day

### 1. A retried "send order" call can pay someone twice

`POST /orders` (`order-create`) takes an OPTIONAL `external_id` field. Skip it, and a retried
request — a workflow step re-run after a timeout, a host recovering from a dropped connection —
creates a **second, real** order: a second gift card, a second cash payout. Tremendous's own
"Idempotence" section spells out the fix: supply `external_id`, and

- the same value after the initial order returns the **original** order's data with a `201` (not
  `200`) status, and creates nothing further;
- the same value with **different** parameters (a different amount, a different recipient) is
  refused with `409`.

`fetch`/`Response.ok` treats both `200` and `201` as success, so telling them apart requires reading
`res.status` explicitly — see `TremendousClient.request` in [`lib/client.ts`](lib/client.ts) and
[`actions/order-create.ts`](actions/order-create.ts). This action derives a stable `external_id`
from the workflow step's invocation ID when the caller doesn't supply one, so a host-driven retry of
the same step reuses it instead of double-paying, and reports whether the call actually created a
new order via the `duplicate` output field.

Only **single-reward** orders are sent. `create-order`'s OpenAPI `requestBody` is a `oneOf` with
exactly one documented member, `SingleRewardOrder`; Tremendous's own guides mark multi-product
orders (`creating-multi-product-rewards-wip`) and SMS delivery (`sms-rewards-wip`) work-in-progress,
so neither is wired up here.

### 2. Two live hosts, not a path prefix — and this app only calls one of them

| Environment | Host                         | API key prefix |
| ----------- | ----------------------------- | -------------- |
| Sandbox     | `testflight.tremendous.com`   | `TEST_`        |
| Production  | `api.tremendous.com`          | `PROD_`        |

These are **separate hosts with separate data** — not a `?sandbox=true` flag, not a shared host. A
`PROD_` key against `testflight.tremendous.com` (or vice versa) is rejected the same way a garbage
key is: a `401` with `"The API key you provided was invalid"`. This app's manifest allows only
`api.tremendous.com`; a publisher who needs sandbox for local development has to point their own
tooling at `testflight.tremendous.com` outside this app, since no action exposes a host override.

### 3. The real status page is not the one you'd guess

`tremendous.statuspage.io` — the Atlassian Statuspage subdomain a vendor of this size would
typically use — **redirects to `/inactive`**. Tremendous does not use Statuspage. The genuine,
actively-updated page is a custom platform at `status.tremendous.com`
(`GET /api/v2/summary.json` → `{"page": {"name", "url", "status"}, "activeIncidents": [...]}`),
verified live with a real in-progress incident at write time. See
[`health/service.ts`](health/service.ts) for the three-way verification (decoy ruled out,
content-type + body checked, page self-identifies as "Tremendous").

## Actions

| Action                    | Type    | Notes |
| -------------------------- | ------- | ----- |
| `order-create`              | perform | Send a reward. Idempotent via `external_id` (auto-derived). |
| `order-get`                  | read    | By Tremendous ID or `external_id`. |
| `order-list`                 | search  | Filter by campaign, `external_id`, or a `created_at` range. |
| `reward-get`                 | read    | Includes delivery status. |
| `reward-list`                | search  | Offset/limit only — no filters documented. |
| `reward-cancel`              | perform | Only a reward with a delivery FAILURE; refunds the cost. |
| `reward-resend`              | perform | Optionally to a corrected email/phone. Not idempotent (no key). |
| `reward-generate-link`       | perform | A fresh redemption link, for a channel Tremendous doesn't deliver to. |
| `product-list`               | search  | The reward catalog; filter by country/currency/subcategory. |
| `product-get`                | read    | One product's countries, currencies, and amount bands (`skus`). |
| `campaign-list`              | search  | Every campaign — no filters, no pagination (vendor returns all). |
| `campaign-get`               | read    | One campaign's products and look-and-feel. |
| `funding-source-list`        | search  | All funding sources. `available_amount` here is CACHED. |
| `funding-source-get`         | read    | One funding source (or `BALANCE`/`INVOICE`), with the CURRENT amount. |

## Auth

**API Key** (`type: bearer`) — `Authorization: Bearer <key>`. Get one from Tremendous's dashboard
under Team Settings > Developers > API Keys. This app expects a **production** key (`PROD_` prefix);
see finding #2 above.

The credential probe is `GET /organizations` — the `authentication` guide's own worked example. It
was picked by what the response contains, not by guessing a whoami: the schema is `{id, name,
website, currency_code, status}`, none of it a secret, and the endpoint needs no scope a restricted
key could lack ("only the organization to which the API key belongs" — there is nothing narrower or
broader to be refused for). `test` reads the error body's `message` field to tell "no key reached the
request" apart from "the key is invalid", rather than trusting the status code alone — both answer
`401` with the same shape, and a key valid for the *wrong host* (sandbox key against production)
produces the exact same response as a garbage one.

`GET /api/v2/ping` is mentioned in the `production-api-access` guide as a smoke test and does answer
`401` (not `404`) unauthenticated, confirming it's a real endpoint — but it has no OpenAPI reference
page and its success body is undocumented, so it's deliberately not used as the probe: this app
doesn't report "the credential works" from a response shape nobody has confirmed.

Tremendous also documents **OAuth 2.0** for building a multi-account platform app (`docs/oauth-20`),
but that requires registering an OAuth application with Tremendous and being approved as a
production app — a partner relationship this app doesn't have. Left out; API Key covers "95%+ of
Tremendous integrations" per the vendor's own authentication guide.

## Health checks

- **`service`** (`kind: service`) — `status.tremendous.com`'s page-level status plus any active
  incidents. See finding #3 above.
- **`quota`** (`kind: quota`, covers `action:order-create` only) — remaining account balance, read
  from `GET /funding_sources/BALANCE`. Reports `down` at or below zero (the next order paid from
  `BALANCE` will fail with `402`), `unknown` when the account has no balance funding source at all
  (it pays exclusively by bank account, credit card, or invoice — which says nothing about *those*
  methods' headroom).
- **`request-rate`** (declared `unavailable`, `severity: informational`) — Tremendous enforces a
  fixed 10 requests/second ceiling but exposes no `X-RateLimit-*` header and no other way to read
  remaining headroom in advance; confirmed by a live, header-by-header probe. Declared rather than
  faked, same pattern the pack uses elsewhere (see `HEALTHCHECKS.md`).
- **`auth:api-key`** — derived automatically from the Auth `test` hook.

## What's deliberately left out

- **Multi-product orders and SMS delivery** — marked work-in-progress in Tremendous's own guides
  (`creating-multi-product-rewards-wip`, `sms-rewards-wip`); no stable schema to build against.
- **Order approve/reject** — gated behind an org-level "Allow approvals via API" setting most
  accounts don't have enabled; can be added once there's a documented way to detect it from the API
  rather than guessing.
- **Campaign create/update, Invoices, Topups, Balance transactions, Reports, Fraud reviews/rules,
  Connected organizations, Members, Roles, Custom fields, Webhooks, Forex** — all separately
  documented and real, but outside the "send and track a reward" surface this app covers. Each is a
  reasonable follow-up app or a set of additional actions here.
- **Querying rewards by custom-field label/value** (`list-rewards`'s documented query-param
  extension) — requires knowing the caller's own custom field labels ahead of time; left out rather
  than guessing a shape.
