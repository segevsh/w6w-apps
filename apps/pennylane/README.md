# Pennylane

Manage Pennylane customers, suppliers, products, customer and supplier invoices, journals,
ledger accounts, analytic categories and bank transactions through the Pennylane Company
API v2.

- **Categories** — finance
- **Auth methods** — oauth2
- **Actions** — 22
- **Egress allowlist** — `app.pennylane.com`, `status.pennylane.com`
- **Website** — https://www.pennylane.tech
- **API docs** — https://pennylane.readme.io

## What is here

Every path, verb, query parameter, body field and error shape below was read from the
endpoint's own page on Pennylane's API reference (which serves clean Markdown at
`<page>.md`) on 2026-09-22; each page embeds its OpenAPI document, whose `servers` block
names `https://app.pennylane.com` and whose `paths` block names
`/api/external/v2/...`. "HTTP 200" was never taken as proof of a path — the documented
response shape was.

| Action | Method and path | Scope |
|---|---|---|
| `list-customers` | `GET /customers` | `customers:readonly` / `customers:all` |
| `get-customer` | `GET /customers/{id}` | `customers:readonly` / `customers:all` |
| `create-company-customer` | `POST /company_customers` | `customers:all` |
| `create-individual-customer` | `POST /individual_customers` | `customers:all` |
| `list-suppliers` | `GET /suppliers` | `suppliers:readonly` / `suppliers:all` |
| `get-supplier` | `GET /suppliers/{id}` | `suppliers:readonly` / `suppliers:all` |
| `create-supplier` | `POST /suppliers` | `suppliers:all` |
| `list-products` | `GET /products` | `products:readonly` / `products:all` |
| `get-product` | `GET /products/{id}` | `products:readonly` / `products:all` |
| `create-product` | `POST /products` | `products:all` |
| `list-customer-invoices` | `GET /customer_invoices` | `customer_invoices:readonly` / `customer_invoices:all` |
| `get-customer-invoice` | `GET /customer_invoices/{id}` | `customer_invoices:readonly` / `customer_invoices:all` |
| `create-customer-invoice` | `POST /customer_invoices` | `customer_invoices:all` |
| `send-customer-invoice-by-email` | `POST /customer_invoices/{id}/send_by_email` | `customer_invoices:all` |
| `list-supplier-invoices` | `GET /supplier_invoices` | `supplier_invoices:readonly` / `supplier_invoices:all` |
| `get-supplier-invoice` | `GET /supplier_invoices/{id}` | `supplier_invoices:readonly` / `supplier_invoices:all` |
| `list-journals` | `GET /journals` | `journals:readonly` / `journals:all` |
| `get-journal` | `GET /journals/{id}` | `journals:readonly` / `journals:all` |
| `list-ledger-accounts` | `GET /ledger_accounts` | `ledger_accounts:readonly` / `ledger_accounts:all` |
| `list-categories` | `GET /categories` | `categories:readonly` / `categories:all` |
| `list-transactions` | `GET /transactions` | `transactions:readonly` / `transactions:all` |
| `get-me` | `GET /me` | none |

A handful of shapes are worth naming once:

- **Pagination is cursor-based and returned whole.** Every list answers
  `{ "items": [...], "has_more": ..., "next_cursor": ... }` and the app returns that
  envelope verbatim rather than walking pages. The vendor's own documentation is explicit
  that the cursor stores position only — `filter` and `sort` must be re-sent with it — so
  paging is the caller's decision, not something this app should make silently.
- **`filter` is a JSON array of `{ field, operator, value }`**, with operators `eq`,
  `not_eq`, `lt`, `lteq`, `gt`, `gteq`, `in`, `not_in` and `start_with`. Each list action's
  param hint names the fields that endpoint accepts.
- **`limit` is not clamped here.** The vendor's ceiling is 100 almost everywhere and 1,000
  on `ledger_accounts`; enforcement is left to Pennylane so an out-of-range value comes
  back as the vendor's own 400 naming the parameter.
- **Amounts are strings.** `price_before_tax` is a string decimal (`"100.00"`) because a
  JSON number is a documented 400, and `vat_rate` is a rate *code* (`FR_200` is 20%).
- **Errors are one documented schema** — `{ "error", "message", "details"? }` on 4xx/5xx,
  with a `409` duplicate answering `{ "status", "error" }` instead. Both shapes are
  surfaced, `details` included, because a `422`'s `details` object is the actionable part.
  `send-customer-invoice-by-email` adds its own reading of a `409`: the vendor documents
  that status there as "the PDF has not been generated yet", so the thrown error says so.

## Auth

A single **OAuth 2.0** method, the "integration partner" path Pennylane's own walkthrough
documents (`docs/oauth-20-walkthrough.md`):

- Authorize — `https://app.pennylane.com/oauth/authorize` (`client_id`, `redirect_uri`,
  `response_type=code`, space-separated `scope`, optional `state`).
- Token — `https://app.pennylane.com/oauth/token`, form-encoded in the body.
  `grant_type=authorization_code` for the exchange, `grant_type=refresh_token` for the
  refresh. PKCE is not mentioned anywhere in that walkthrough, so it is off, as it is for
  Asana.
- **Refresh tokens rotate.** Pennylane invalidates the refresh token the moment it is used
  and returns a new one alongside the new access token (and invalidates the old access
  token too), so the runtime must persist the replacement and must not race two refreshes
  with the same token. Access tokens last `expires_in` seconds (documented 86400 = 24h);
  refresh tokens last 90 days.
- Revoke — `POST https://app.pennylane.com/oauth/revoke` with `client_id`,
  `client_secret` and `token`. No action in this app needs it, so there is none; it is
  mentioned here because an installation that disconnects a user may want it.
- **Scopes** — per resource, in a `:readonly` / `:all` pair where `:all` is read *and*
  write. The app requests the nine `:all` scopes covering exactly the resources it touches:
  `customers:all`, `suppliers:all`, `products:all`, `customer_invoices:all`,
  `supplier_invoices:all`, `journals:all`, `ledger_accounts:all`, `categories:all`,
  `transactions:all`. `GET /me` needs no scope, which is what makes it usable as the probe.

Pennylane also documents a static **Company API Token** for single-company integrators
(`docs/generating-my-api-token.md`). This app ships OAuth 2.0 only and deliberately adds no
second auth method.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.pennylane.com> (a claimed Atlassian Statuspage; page
id `bgttfstd0mbz`, `page.name: "Pennylane"`; `pennylane.statuspage.io` 302-redirects to the
same page).

```
GET https://status.pennylane.com/api/v2/summary.json
```

The page carries seven components, and only one of them speaks for the host this app calls:

| Component | id |
|---|---|
| Application (app.pennylane.com) | `c9ntgd50fyqs` |
| **API (app.pennylane.com/api)** | **`nm672smys1j9`** |
| Mobile application | `dtcwfrlql57p` |
| Landing page (www.pennylane.com) | `6p29f82gjy1y` |
| Help Center (help.pennylane.com) | `ktv9hvslxk15` |
| Academy (academy.pennylane.com) | `lzn4f43zp5xp` |
| Customer support | `bsz8ll87ww42` |

**The verdict comes from the `API (app.pennylane.com/api)` component** — matched by id
first and by its exact name as a fallback — mapped through Statuspage's documented
component vocabulary. The other six fail independently of the API: a landing-page or
mobile-app incident is not evidence that `app.pennylane.com/api` is down, and a verdict
derived from the page-wide roll-up would say it was. All seven are still reported under
`components` as detail.

The page-level `status.indicator` is read as well, but it can only **escalate** the
verdict, never soften it: Pennylane's roll-up aggregates every component, so a `critical`
indicator alongside a healthy-looking `API` row means something this component does not
model is badly wrong — a workflow is better served by caution, and the message says the
escalation came from the roll-up. `status.pennylane.com` is in `w6w.network.allow` because
the app calls it; the check also declares it under its own `network.allow`, and it is
`credential: "none"` — a status host must never see an access token.

### Is this credential live?

This is the Auth `test` hook — the check the host derives from it automatically.

```
GET /api/external/v2/me
```

Both `test` and `afterConnect` call it. It requires **no scope at all**, so it works on the
narrowest grant a user can give, and it returns the user, the company and the granted
`scopes` — never the token or any credential material, which is why it can be the probe
without echoing the thing being tested. A rejected token is classified from the response
**body** where the vendor supplies one (`{ "error", "message" }`); a bare 401 with no body
is reported by status, which is all there is in that case.

`get-me` is the same endpoint exposed as an action, deliberately: a workflow that hits a
`403` can ask what the grant actually covers, and a setup step can record which company an
OAuth connection landed on.

### Do we have quota left?

```
GET /api/external/v2/me   →   ratelimit-limit / ratelimit-remaining / ratelimit-reset
```

Pennylane meters **25 requests every 5 seconds per token**, and — unusually — publishes all
three headers on *every* response, not only on the refusal. Only a 429 adds `retry-after`,
which the API client surfaces in the thrown error. There is no plan-usage endpoint anywhere
in the Company API v2, so these headers on an ordinary read are the entire quota signal.

The probe is the same `GET /me` call the credential check makes — the cheapest
authenticated read in the surface, guaranteed to carry the headers on success — so one
round trip answers both questions and `minIntervalSeconds` keeps it to one a minute. A
non-2xx, or a response that somehow arrives without readable headers, reports `unknown`
rather than assuming zero headroom.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` — `status.pennylane.com/api/v2/summary.json`, verdict on the `API (app.pennylane.com/api)` component |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` — the `ratelimit-*` headers on `GET /me` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.pennylane.com` is declared in the app's own `w6w.network.allow` (the app
does call it, from `health/service.ts`); it is also restated on the `service` check's own
`network.allow`, which is the spec's requirement for widening egress from an action's
allowlist. That widening is legal only because the check is unsigned — pairing an extra
host with `credential: "signed"` is rejected at load time, so a credential can never reach
a status host.

**`quota` is a live probe, not a declared absence** — but it carries
`severity: "informational"` on purpose. A five-second window is *supposed* to run low after
a burst, so a low reading is context rather than a verdict; and because a missing or
unreadable header reports `unknown` (which outranks `ok` in the roll-up), informational
severity is what stops a vendor that one day drops those headers from pinning this app at
`unknown` forever.

## Scope note

The Company API v2 is large — the reference index lists roughly 230 endpoints. This app
covers the core accounting primitives a workflow actually automates and leaves the rest
out deliberately, rather than shipping a shallow wrapper over everything:

- **in scope** — customers (company and individual), suppliers, products, customer
  invoices (create as draft or finalized, read, list, send by email), supplier invoices
  (read, list), journals, ledger accounts, analytic categories, bank transactions, and the
  profile (`GET /me`).
- **documented but omitted** — webhooks and their subscriptions; quotes and their
  appendices/status; billing subscriptions; SEPA and GoCardless mandates and their
  migrations; purchase requests; category groups; commercial documents; general-ledger,
  analytical-ledger and FEC exports; bank accounts and bank establishments; PA
  (approved-platform) e-invoicing registrations; ledger entries and their
  lines/lettering; and customer and supplier invoice *updates*, deletions, payment
  recording and matched-transaction management.

Why: the point of this app is a verifiable 22-action core — every action here was confirmed
against its own reference page, and each write has a read that can verify it. Adding the
remaining groups would multiply the surface without a second reader to verify it, and
several of them (mandates, PA registrations, POS integrations) are configuration flows
rather than workflow steps.

**Fiscal years** (`GET /fiscal_years`, scope `fiscal_years:readonly`) was considered
explicitly and dropped: it is a thin list that returns the company's accounting periods,
useful only alongside the ledger-entry endpoints, which are themselves out of scope. It is
noted here rather than silently omitted.

---

Researched and endpoint-verified 2026-09-22 against `pennylane.readme.io` and
`status.pennylane.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions
in mind if a probe starts failing for everyone at once.
