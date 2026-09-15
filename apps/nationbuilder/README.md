# NationBuilder

Manage NationBuilder people, lists, events, donations and tags for campaigns, nonprofits
and advocacy groups.

- **Categories** — crm, marketing, commerce
- **Auth methods** — oauth2, api-token
- **Actions** — 23
- **Egress allowlist** — `*.nationbuilder.com`
- **Website** — https://nationbuilder.com
- **API docs** — https://nationbuilder.com/api/v2/reference (OpenAPI spec), plus
  `support.nationbuilder.com`'s API collection

## Where the base URL comes from

NationBuilder is multi-tenant by subdomain: every customer ("nation") is its own
`{slug}.nationbuilder.com`, confirmed as the `servers.url` template in the vendor's own
downloadable OpenAPI 3.1 spec (`nationbuilder.com/api/v2/reference` →
`docs/v2/released.yaml`, fetched 2026-09-15). A manifest cannot enumerate every nation, so
`w6w.network.allow` declares the wildcard `*.nationbuilder.com` and the slug is collected
as a field on each auth method, exactly the pattern this pack already uses for Zendesk's
`{subdomain}` and Mautic's self-hosted `baseUrl`.

## Three things that would cost someone a day

- **"Contacts" is not the CRM contact.** `POST /api/v2/contacts` creates a logged record
  of a single contact *attempt* (a canvass call, a door knock, a text —
  `contact_method`/`contact_status`/`content`), not a person. The actual person record is
  called a **"signup"** everywhere in NationBuilder's own docs and schema. This app exposes
  signups as "person" (matching the rest of this pack's CRM vocabulary — `person-get`,
  `person-create`, etc.) and breaks the logged-attempt resource out as its own
  `contact-log-create` action, specifically so the two cannot be confused.
- **An event has no name of its own.** The `event` resource's writable attributes
  (`start_at`, `venue_name`, `content`, `accept_rsvps`, ...) have no `name`/`title` field —
  the public-facing name lives on a **Page** the event is attached to via a `page`
  relationship, created inline through a JSON:API sidepost (`included` array + a
  `temp-id`). NationBuilder's own "Core Concepts" guide mentions this pattern for petitions
  ("creating a petition requires the creation of a page at the same time") but never says
  it about events directly — it only shows up by reading the event schema's relationships.
  `event-create` handles this: give it `siteId` to create a new page inline, or `pageId` to
  attach an existing one.
- **OAuth app registration is gated, not self-serve.** The "API Authentication Guide"
  states plainly: "Developer tools are only available to NationBuilder certified
  developers or nations on an Enterprise or Network plan." A nation on a lower plan
  without certified-developer status cannot register the OAuth app this needs a Client
  ID/Secret from at all — which is why the `api-token` auth method (a short-lived personal
  token from the nation's own control panel) exists alongside OAuth, as the only way to
  reach such a nation, at the cost of a 24-hour, non-refreshable token.

## Auth

- **`oauth2`** — the standard authorization-code flow against
  `https://{slug}.nationbuilder.com/oauth/authorize` and `.../oauth/token`. Requires an
  OAuth app registered in the nation's own control panel (Settings > Developer > Register
  New App), which itself requires NationBuilder certified-developer status or an
  Enterprise/Network-plan nation.
- **`api-token`** — a personal "test token" pasted directly (Settings > Developer > API
  token), sent as `Authorization: Bearer <token>`. Expires in 24 hours and cannot be
  refreshed — NationBuilder's own docs say not to use it in production. Offered anyway as
  the only way to reach a nation that cannot complete OAuth app registration.

Both probe `GET /api/v2/signups/me` ("Show signup assigned to auth token" in the vendor's
OpenAPI spec) to validate the credential — it needs no scope beyond a live token and
returns the caller's own person record, never the token itself.

## Errors and pagination

Every response is a JSON:API document. A validation failure (422) is
`{ errors: [{ detail, title, code, source, meta }] }`; everything else is the flat
`{ code, message }` — both read by `lib/client.ts#errorMessage`. Index endpoints page with
`page[size]`/`page[number]` (default 20, max 100) and filter with `filter[attribute]=value`,
including documented operator suffixes (`filter[amount_in_cents][gt]=500`).

## Deliberately out of scope

Petitions, surveys, path/automation builders, imports, memberships, precincts, ballots,
elections, broadcasters, mailings and NationBuilder's own website/CMS surfaces beyond the
minimal Page sidepost `event-create` needs. Each is its own large surface, and none of it
is the daily loop of managing people, lists, events, donations and tags a workflow
actually touches.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left, plus a
fourth this app adds — is *this nation's own subdomain* reachable.

### Is the vendor up?

**Service status** — <https://status.nationbuilder.com>, an Atlassian Statuspage with a
component literally named **"API"**, alongside "Control Panel", "Email blasts", "Imports",
"Donation/Payment Processing" and the third-party services NationBuilder itself depends on
(Stripe, PayPal, Authorize.net, Facebook, Dropbox). `health/service.ts` reads
`status.nationbuilder.com/api/v2/summary.json` and rolls up the page-level `status.indicator`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three questions above the auth methods themselves answer.

Both auth methods probe:

```
GET /api/v2/signups/me
```

The person record NationBuilder associates with the token. Needs no scope beyond a live
token and echoes no credential material back.

### Do we have quota left?

`RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` response headers (`Reset` is a
Unix timestamp, not a delay — unlike, say, Zendesk's seconds-from-now `ratelimit-reset`),
plus `Retry-After` on a 429. NationBuilder meters 250 requests per 10 seconds, per IP
address AND per API token independently.

### Is this nation's own subdomain reachable?

`status.nationbuilder.com` is a single shared page across every nation — it says nothing
about whether one specific `{slug}.nationbuilder.com` host is up (a suspended account, a
DNS issue, a nation under maintenance). `health/nation.ts` sends an unsigned request to
this connection's own `/api/v2/signups/me` and treats a 401 as a pass — proof the nation's
v2 API is serving, which is a different question from whether the credential is any good.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The four questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 30s | `health/quota.ts` |
| `nation` | dependency | connection | context | degraded (default) | 120s | `health/nation.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

---

Researched and endpoint-verified 2026-09-15 against the vendor's downloadable OpenAPI 3.1
spec (`nationbuilder.com/api/v2/reference`) and the `support.nationbuilder.com` API
collection. Status surfaces and OAuth registration requirements move; re-verify if a probe
starts failing for everyone at once, or if a nation reports it cannot register an OAuth app.
