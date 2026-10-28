# Google Business Profile

Manage Google Business Profile listings: accounts, locations, location attributes,
Q&A, and place action links (booking/ordering/reservation links).

- **Categories** — marketing, productivity
- **Auth methods** — oauth2
- **Actions** — 15
- **Egress allowlist** — `mybusinessaccountmanagement.googleapis.com`,
  `mybusinessbusinessinformation.googleapis.com`, `mybusinessqanda.googleapis.com`,
  `mybusinessplaceactions.googleapis.com`
- **Website** — https://business.google.com
- **API docs** — https://developers.google.com/my-business

## One product, four hostnames

Google retired the monolithic "My Business" API and split it into a service per
surface, each on its own hostname. There is no single "the API host" the way most apps
have — every action in this app picks the base URL its resource lives under
(`lib/client.ts`). Verified live against each surface's `$discovery/rest` document on
2026-08-15:

| Surface | Host | What it covers |
|---|---|---|
| Account Management | `mybusinessaccountmanagement.googleapis.com` | Accounts (the container a location lives under) |
| Business Information | `mybusinessbusinessinformation.googleapis.com` | Locations, attributes, categories |
| Q&A | `mybusinessqanda.googleapis.com` | Questions and answers on a location's profile |
| Place Actions | `mybusinessplaceactions.googleapis.com` | Booking/ordering/reservation links |

**Reviews are not covered.** Reviews live on a separate, older `mybusiness.googleapis.com/v4`
service that is *not* one of the four discovery documents above. It could not be verified
live as a current, supported surface within this app's scope, so review actions are
deliberately left out rather than guessed at.

## Scope — what's included and what's deliberately left out

All 15 actions below were verified against the live `$discovery/rest` documents, not
inferred from a sibling app or marketing copy. A few real, confirmed endpoints were left
out anyway, as a scope decision rather than a verification gap:

- **`accounts.locations.create` / `locations.delete`** — creating or deleting a location
  is a higher-stakes operation (claiming/removing a real business listing) than this
  app's first cut aims to cover.
- **`chains.get` / `chains.search` / `googleLocations.search`** — franchise-chain lookup
  and "search for an unclaimed Google-known location to claim" are onboarding-flow
  helpers, not day-to-day location management.
- **`locations.questions.create` / `locations.questions.delete`** — asking or deleting a
  *question* is a consumer-facing action on someone else's post; a business manages
  *answers* (`upsert-answer`, `delete-answer`), which this app covers.
- **`locations.getGoogleUpdated` / `locations.attributes.getGoogleUpdated`** — reads
  Google's suggested edits to a location versus the publisher's version, a narrower
  workflow left for a follow-up.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**No machine-readable status feed exists for this product.** Checked live (2026-08-15):

- `https://www.google.com/appsstatus/dashboard/incidents.json` (the Google Workspace
  Status Dashboard, used by this pack's other `google-*` apps) lists only
  Workspace-branded products by `service_name` — Gmail, Google Calendar, Google Docs,
  Google Drive, Google Chat, Google Meet, Classroom, and others. No entry for "Business
  Profile" or "My Business" — the product isn't part of Workspace.
- `https://status.cloud.google.com/incidents.json` (Google Cloud Platform infrastructure
  status) — also has no Business Profile component.

Declared as an honest absence (`health/service.ts`) rather than guessed at.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The `oauth2` method probes:

```
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=1
```

`accounts.list` is the cheapest read this API family offers: it needs no location or
business-object scope beyond `business.manage`, and every connected account can reach
it — including one that owns zero locations directly but manages others through a
location group. Verified live: an unsigned request to this same path returns a
schema-correct Google API error body,
`{"error":{"code":401,"status":"UNAUTHENTICATED","message":"Request is missing required
authentication credential…"}}` (2026-08-15) — proof the host is reachable and answering,
and the shape `test` classifies a real failure by. No whoami on this API echoes the
caller's raw token back in the response, so there was no echo risk to route around.

### Do we have quota left?

No headroom endpoint or rate-limit headers; quota is per-project and visible only in the
Google Cloud console. Declared absent (`health/quota.ts`).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | _declared absent — no vendor status feed_ |
| `quota` | quota | connection | signed | informational | _declared absent — no headroom endpoint_ |
| `auth:oauth2` | credential | connection | signed | fatal | derived from the `oauth2` auth method's `test` hook |

Both declared absences carry `severity: "informational"` — an `unavailable` entry always
reports `unknown`, and `unknown` outranks `ok` in the roll-up, so anything less would pin
this app's verdict at `unknown` forever.

## Auth

**OAuth 2.0** is the only auth path Google offers for these APIs — no API-key or service
account flow is exposed here. Scope: `https://www.googleapis.com/auth/business.manage`,
which covers all four surfaces above (Google does not split it further per-surface). As
with this pack's other Google apps, `access_type=offline` + `prompt=consent` are set on
the authorize URL so a refresh token reliably comes back. The connecting Google account
must be an owner or manager of the business(es) being managed.

## Actions

### Account Management

- **List Accounts** (`list-accounts`) — `GET /v1/accounts`
- **Get Account** (`get-account`) — `GET /v1/{name}`

### Business Information

- **List Locations** (`list-locations`) — `GET /v1/{parent}/locations`
- **Get Location** (`get-location`) — `GET /v1/{name}`
- **Update Location** (`update-location`) — `PATCH /v1/{name}` — derives `updateMask`
  from whichever fields were supplied
- **Get Location Attributes** (`get-location-attributes`) — `GET /v1/{name}`
- **Update Location Attributes** (`update-location-attributes`) — `PATCH /v1/{name}`
- **List Categories** (`list-categories`) — `GET /v1/categories`
- **List Attribute Metadata** (`list-attribute-metadata`) — `GET /v1/attributes`

### Q&A

- **List Questions** (`list-questions`) — `GET /v1/{parent}`
- **Answer Question** (`upsert-answer`) — `POST /v1/{parent}/answers:upsert`
- **Delete Answer** (`delete-answer`) — `DELETE /v1/{name}/answers:delete`

### Place Actions

- **List Place Action Links** (`list-place-action-links`) — `GET /v1/{parent}/placeActionLinks`
- **Create Place Action Link** (`create-place-action-link`) — `POST /v1/{parent}/placeActionLinks`
- **Delete Place Action Link** (`delete-place-action-link`) — `DELETE /v1/{name}`

## Icon

`assets/icon.png` — Google's own `google_my_business_48dp.png` storefront glyph
(96×96), downloaded verbatim from `https://www.gstatic.com/images/branding/product/2x/google_my_business_48dp.png`.
Not `business.google.com/favicon.ico` — that one is the generic Google "G", not the
product mark.

---

Researched and endpoint-verified 2026-08-15 against the live `$discovery/rest`
documents for all four services. Re-verify with the same discovery documents if a probe
starts failing for everyone at once — Google occasionally revises these APIs without a
version bump.
