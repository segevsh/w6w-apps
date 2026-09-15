# bexio

Contacts, sales documents (quotes, orders, invoices), items/products, projects and timesheets in
bexio, the Swiss all-in-one CRM/accounting/invoicing platform, over the REST API v2 (`api.bexio.com`).

- **Categories** — crm, finance, productivity
- **Auth method** — oauth2 (OpenID Connect against bexio's own Keycloak realm)
- **Actions** — 25
- **Egress allowlist** — `api.bexio.com`
- **Website** — https://bexio.com
- **API docs** — https://docs.bexio.com (a Redoc page rendering an embedded OpenAPI 3.0 document —
  bexio publishes no standalone `.json`/`.yaml` spec file; every fact below was extracted from that
  embedded document, fetched 2026-09-15)

## Actions

Grouped by resource; each maps to one bexio v2 endpoint.

| Key | Endpoint |
|---|---|
| `contact-list` | `GET /2.0/contact` |
| `contact-get` | `GET /2.0/contact/{id}` |
| `contact-create` | `POST /2.0/contact` |
| `contact-update` | `POST /2.0/contact/{id}` |
| `contact-delete` | `DELETE /2.0/contact/{id}` |
| `contact-search` | `POST /2.0/contact/search` |
| `invoice-list` | `GET /2.0/kb_invoice` |
| `invoice-get` | `GET /2.0/kb_invoice/{id}` |
| `invoice-create` | `POST /2.0/kb_invoice` |
| `invoice-search` | `POST /2.0/kb_invoice/search` |
| `invoice-issue` | `POST /2.0/kb_invoice/{id}/issue` |
| `quote-list` | `GET /2.0/kb_offer` |
| `quote-get` | `GET /2.0/kb_offer/{id}` |
| `quote-create` | `POST /2.0/kb_offer` |
| `order-list` | `GET /2.0/kb_order` |
| `order-create` | `POST /2.0/kb_order` |
| `article-list` | `GET /2.0/article` |
| `article-get` | `GET /2.0/article/{id}` |
| `article-create` | `POST /2.0/article` |
| `article-search` | `POST /2.0/article/search` |
| `project-list` | `GET /2.0/pr_project` |
| `project-get` | `GET /2.0/pr_project/{id}` |
| `project-create` | `POST /2.0/pr_project` |
| `timesheet-list` | `GET /2.0/timesheet` |
| `timesheet-create` | `POST /2.0/timesheet` |

Not included, deliberately: contact-restore, additional addresses, bulk create, PDF downloads,
`send`/`cancel`/`copy`/`reissue`/`reject` transitions on quotes/orders/invoices, deliveries,
repetitions, project milestones/packages (the v3 surface), and the entire v4 contacts surface
(exports, imports, categories, sectors, standard letters). Every one of these is real and
documented — they were left out only to keep this first pass to the resources actually asked for
(contacts, invoices, quotes, orders, articles, projects, timesheets), not because anything about
them couldn't be confirmed.

## Findings that would have cost someone a day

1. **There is no PUT/PATCH anywhere in this API surface.** Editing an existing resource is a
   `POST` to `/2.0/<resource>/{id}`, reusing the EXACT SAME request schema as create
   (`ContactWithDetails` for both `POST /2.0/contact` and `POST /2.0/contact/{id}`) — a client that
   assumes REST verb conventions and reaches for PUT gets a 404/405, and one that assumes "edit"
   means a partial patch silently unsets every field it didn't resend. `contact-update` documents
   this and requires the same fields `contact-create` does.
2. **`Accept: application/json` is a REQUIRED parameter, not a convention.** The OpenAPI document
   marks it `required: true` on every single operation — not a sensible default a JSON client
   happens to send, an explicit contract requirement. `lib/client.ts` sends it unconditionally so
   no action has to think about it.
3. **Scopes are per-resource AND per-direction, and one is undocumented.** The "API Scopes" table
   lists pairs like `contact_show`/`contact_edit` (requesting the write scope silently grants read
   too), but the endpoint this app uses for both the auth probe and connection labelling —
   `GET /2.0/company_profile` — requires a scope called `general` that never appears in that table
   at all. It's the one scope every token gets regardless of what was requested, which is exactly
   what makes it the right universal health/auth probe: it works no matter which resource scopes a
   given connection was granted.
4. **Line items are a 6-way discriminated union keyed by an exact-spelling literal.** A quote,
   order, or invoice's `positions` array can hold `KbPositionCustom`, `KbPositionArticle`,
   `KbPositionText`, `KbPositionSubtotal`, `KbPositionPagebreak`, or `KbPositionDiscount` objects —
   the `type` field must match one of those strings exactly (not `"custom"`, not
   `"kb_position_custom"`). This app exposes `positions` as a documented raw JSON param rather than
   guessing at which one or two variants to promote to first-class fields.
5. **The old `idp.bexio.com` IdP still resolves but is dead.** bexio migrated OAuth entirely to a
   Keycloak realm at `auth.bexio.com/realms/bexio`; the API reference still carries a full
   migration guide for anyone with a client still pointed at the old host.

## Auth

**OAuth 2.0 / OpenID Connect** against bexio's Keycloak realm — this is the *only* auth bexio
offers a third-party integration; there is no API-key or basic-auth scheme.

- Authorization endpoint: `https://auth.bexio.com/realms/bexio/protocol/openid-connect/auth`
- Token endpoint: `https://auth.bexio.com/realms/bexio/protocol/openid-connect/token`
- PKCE enabled.
- Standard `grant_type=refresh_token` against the token endpoint refreshes an expired token; no
  custom `refresh` hook is declared, since the host handles that generically.
- Scopes requested cover every action here: `contact_show`/`contact_edit`,
  `kb_invoice_show`/`kb_invoice_edit`, `kb_offer_show`/`kb_offer_edit`,
  `kb_order_show`/`kb_order_edit`, `article_show`/`article_edit`, `project_show`/`project_edit`,
  `monitoring_show`/`monitoring_edit`.

Errors are uniform across the whole API: any non-2xx response is
`{"error_code": <int>, "message": "<string>"}` (documented under "Errors" in the reference).
`lib/client.ts` reads that body for every failure rather than trusting the HTTP status alone.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — a real Atlassian Statuspage at `www.bexio-status.com`, verified three ways on
2026-09-15: `server: AtlassianEdge` in the response headers, a genuine 4,252-byte JSON body at
`/api/v2/summary.json` (an unclaimed `*.statuspage.io` page serves ~127,700 bytes of placeholder
HTML at the same path), and a page that self-identifies as `page.name: "bexio AG"`. Components
include `bexio Website`, `bexio Office`, and a `Banking interfaces` group (PostFinance, bLink) —
the banking integrations bexio itself depends on for reconciliation, not generic template rows.
There's also a real incident-history RSS/Atom feed at `/history.rss`, confirmed to carry genuine
recent incidents (verified against a resolved "emails not being sent" incident dated Sep 4,
2026) — the JSON summary is used instead because it reports *current* state directly rather than
requiring "is the newest entry for a resolved incident still open" folding logic.

`www.bexio-status.com` is reachable only inside this check's own worker (`credential: "none"`), not
on the app's egress allowlist — an action can never call it.

### Is this credential live?

This is what the `oauth2.test` hook does — the app's own health check, derived automatically into
the health surface as `auth:oauth2`. It probes `GET /2.0/company_profile`, which needs only the
universal `general` scope (see finding #3 above) and returns the tenant's own company profile
(name, address, VAT number) — nothing that echoes the token back. Classification reads the response
body's `{error_code, message}` shape on failure, never the raw HTTP status alone.

### Do we have quota left?

**`quota`** — bexio's "Rate Limiting" docs promise three response headers on every call:
`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. Note `RateLimit-Reset` is a **delta in
seconds** until the window resets, not an absolute epoch (unlike some other vendors' equivalent
header) — getting that backwards renders a reset time in 1970. `severity: "informational"`: running
low is worth surfacing, never worth failing a verdict over on its own.

## Notes

- No live credential was available while building this app, so `oauth2.test`'s exact failure-mode
  status codes (401 vs 403 vs something else) are inferred from the documented `{error_code,
  message}` error shape rather than observed directly; the classification logic reads the message
  either way, so this doesn't change behavior, only what's asserted about specific status codes.
- `positions`, `tracking` (timesheets), and several id-reference fields (`tax_id`, `unit_id`,
  `pr_project_type_id`, …) are collected as raw numbers/JSON rather than dynamic dropdowns — doing
  that properly means calling the corresponding lookup endpoint (`/2.0/unit`, `/2.0/pr_project_type`,
  …) as a param's `options.source` hook, which is a natural follow-up but out of scope for this pass.
