# Google Ads

Read and manage Google Ads accounts: GAQL reporting, campaigns, budgets, ad groups, ads and keywords
over the Google Ads API v25 REST interface.

- **Categories** — marketing, analytics
- **Auth methods** — oauth2
- **Actions** — 14
- **Egress allowlist** — `googleads.googleapis.com`
- **Website** — https://ads.google.com
- **API docs** — https://developers.google.com/google-ads/api/rest/overview

## Base URL

```
https://googleads.googleapis.com/v25
```

The version is a **path segment**, not a host prefix and not a header. Google ships several major
versions a year — v25 landed 2026-07-22 — so it is pinned in exactly one place (`lib/client.ts`) and
a bump is a one-line change.

Every path in this app was read off the `google.api.http` annotations in Google's own service
definitions (`googleapis/googleapis`, `google/ads/googleads/v25/services/*.proto`), which are the
generator's source of truth for the REST surface rather than a prose page that may lag:

```
post: "/v25/customers/{customer_id=*}/googleAds:search"
post: "/v25/customers/{customer_id=*}/googleAds:searchStream"
get:  "/v25/customers:listAccessibleCustomers"
post: "/v25/customers/{customer_id=*}/campaigns:mutate"
post: "/v25/customers/{customer_id=*}/campaignBudgets:mutate"
post: "/v25/customers/{customer_id=*}/adGroups:mutate"
```

## Three things about this API that shape the whole app

**1. Most reads are a query, not an endpoint.** There is no `campaigns.get`, no `adGroups.list`, no
`customers.get`. `CampaignService` exposes `mutate` and nothing else; `CustomerService` exposes
`mutate`, `listAccessibleCustomers` and `createCustomerClient`. Everything else goes through
`GoogleAdsService.Search` with a **GAQL** statement. So most actions here are query builders, and
the general-purpose `search` action is the same call with the statement handed straight through.

**2. Every request carries a `developer-token` header** in addition to the OAuth bearer, and a
manager-account call also carries `login-customer-id`. Both are credentials, both are collected on
the connection, and both are stamped by the auth `sign` hook — see [Auth](#auth).

**3. Money is integer micros.** `amountMicros`, `cpcBidMicros`, `metrics.cost_micros` — one
millionth of the account currency. A $50.00 budget is `50000000`. Getting this wrong by a factor of
a million is the classic first-day mistake.

## Actions

| Key                         | Type    | Call                                                      |
| --------------------------- | ------- | --------------------------------------------------------- |
| `list-accessible-customers` | read    | `GET /customers:listAccessibleCustomers`                  |
| `get-customer`              | read    | `search` · `FROM customer`                                |
| `list-customer-clients`     | read    | `search` · `FROM customer_client`                         |
| `search`                    | search  | `POST /customers/{id}/googleAds:search` (raw GAQL)        |
| `performance-report`        | read    | `search` · metrics + `segments.date`                      |
| `list-campaigns`            | read    | `search` · `FROM campaign`                                |
| `get-campaign`              | read    | `search` · `FROM campaign WHERE campaign.id = …`          |
| `create-campaign`           | perform | `POST /customers/{id}/campaigns:mutate` (create)          |
| `update-campaign`           | perform | `POST /customers/{id}/campaigns:mutate` (update + mask)   |
| `create-campaign-budget`    | perform | `POST /customers/{id}/campaignBudgets:mutate` (create)    |
| `list-ad-groups`            | read    | `search` · `FROM ad_group`                                |
| `create-ad-group`           | perform | `POST /customers/{id}/adGroups:mutate` (create)           |
| `list-ads`                  | read    | `search` · `FROM ad_group_ad`                             |
| `list-keywords`             | read    | `search` · `FROM ad_group_criterion WHERE type = KEYWORD` |

Every action takes an optional **`customerId`** override. The common case needs nothing: the
Connection records the account it was made for. The override exists because one OAuth grant commonly
reaches several accounts under the same manager.

### Why `:search` and not `:searchStream`

`searchStream` exists, is reachable over REST, and returns the same rows. It is not used here.

It is a server-streaming method whose HTTP body is a JSON **array** of response chunks delivered
over chunked transfer, with no page token and no way to bound the result set from the request
(`pageSize` is not supported on it either). `ctx.fetch` hands a hook a whole `Response`, so
consuming a stream would mean buffering an unbounded report into memory inside the sandbox and then
re-stitching chunks — strictly worse than paging, and unbounded in a place where unbounded is a
sandbox problem rather than a performance one. `search` returns one bounded page plus a
`nextPageToken`, which is how every other action in this pack paginates.

### Things the API's shape forces on you

- **`pageSize` must never be sent.** The field is marked deprecated in `SearchGoogleAdsRequest` and
  the API answers `PAGE_SIZE_NOT_SUPPORTED` if it appears in the body. Bound a result set with
  GAQL's own `LIMIT`. No action here exposes a page-size param, and a unit test asserts the field
  never reaches the wire.
- **v25 has no `campaign.start_date`.** Those field paths were replaced by
  `campaign.start_date_time` / `campaign.end_date_time`, format `yyyy-MM-dd HH:mm:ss` in the serving
  account's time zone. Selecting the old names is a `BAD_FIELD_NAME` query error.
- **The update mask is the operation.** Google applies exactly the fields named in `updateMask`; an
  update without one changes nothing, and a mask naming a field the body doesn't set _clears_ it.
  `update-campaign` derives the mask from whichever params you filled in. The mask uses
  **snake_case** paths while the body is **camelCase** — that asymmetry is Google's.
- **`advertising_channel_type` is immutable.** Required on create, absent from `update-campaign`
  entirely, because offering it would only produce server-side errors.
- **A bidding strategy is a protobuf `oneof`.** Exactly one of `manualCpc`, `maximizeConversions`,
  `targetSpend`, … may be set, so `create-campaign` offers one select that writes one empty strategy
  object rather than several flags that could contradict each other.
- **A campaign needs a budget that already exists.** `create-campaign-budget` first, then pass its
  `resourceName`. Both actions accept a bare id or a full relative resource name.
- **There is no `keyword` resource.** A keyword is an `ad_group_criterion` with `type = KEYWORD`;
  the text and match type live under `ad_group_criterion.keyword.*`. That type predicate is always
  applied by `list-keywords` and is not optional.
- **`ad` is not a `FROM` target either.** Ads are queried through `ad_group_ad`, with the ad itself
  under `ad_group_ad.ad.*`.
- **`listAccessibleCustomers` means _directly_.** For a manager credential it returns the manager,
  not its clients. Walk the tree with `list-customer-clients` (`FROM customer_client`), where
  `level` is 0 for the account itself and 1 for direct children.
- **Removed campaigns are not filtered out by default.** Leaving `list-campaigns`' status filter
  blank genuinely returns everything, `REMOVED` included.

### GAQL and injection

GAQL is `SELECT … FROM … [WHERE …] [ORDER BY …] [LIMIT …]`, one resource per `FROM`, no joins, field
paths in snake_case. Every value this app interpolates into a statement is validated first: ids
through `assertNumericId` (digits only), enum filters through `assertEnum` (bare `A–Z_` words only),
date ranges against Google's closed `DURING` vocabulary, custom dates against `yyyy-MM-dd`, and
field masks / extra SELECT fields against a dotted-path grammar. The `where` and `query` params are
deliberately raw — they are the escape hatch, and a caller who can write GAQL can already write it
in `search`.

### Errors

Google returns its standard JSON envelope and puts the part that says what actually went wrong
inside `details[]` as a `GoogleAdsFailure` — a list of errors each carrying a granular `errorCode`
(e.g. `authenticationError: NOT_ADS_USER`, `queryError: BAD_FIELD_NAME`) plus a message and a
`requestId`. The client folds all of it into the thrown error, because the envelope's own `message`
is usually just "Request contains an invalid argument."

## Auth

**`oauth2` only** — Google documents no other interactive credential path for this API, and exactly
**one** scope. There is no read-only variant to fall back to:

| Scope                                     | Grants                               |
| ----------------------------------------- | ------------------------------------ |
| `https://www.googleapis.com/auth/adwords` | Manage Google Ads campaigns and data |

`www.googleapis.com` appears in that string but is **not** in `w6w.network.allow`, because it is
never fetched — a Google OAuth scope is a URL-shaped _identifier_, not an endpoint. Allowing it
would open the sandbox to every Google API for no reason. The auth module composes the URN from a
named constant so the distinction is visible in the source.

### The developer token (read this before connecting)

Beyond the OAuth dance, this API needs a **developer token**, sent as a `developer-token` header on
every request. It is issued to a specific Google Ads **manager account** under that account's API
Center, so it belongs to the connecting organisation — not to this app, and not to this w6w
installation. It is therefore a connection field of `type: "secret"`, and it is attached by the auth
`sign` hook exactly like the bearer. **No action takes it as a param, and no action can read it**; a
unit test asserts that no action param looks like a credential and that none is marked secret.

Google gates the token by **access level**, and this is the part that surprises people:

| Level        | Reaches                | Daily operations                   |
| ------------ | ---------------------- | ---------------------------------- |
| Test Account | **test accounts only** | 15,000                             |
| Explorer     | production + test      | 2,880 (production) · 15,000 (test) |
| Basic        | production + test      | 15,000                             |
| Standard     | production + test      | unlimited                          |

A freshly issued token is at Test Account level and **cannot touch a live account at all**. Moving
to Basic or Standard is an application Google reviews. If every call comes back
`DEVELOPER_TOKEN_NOT_APPROVED`, this is why — it is not a misconfiguration of the connection.

### Connection fields

| Field             | Required | Where it goes                                                                                                       |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `developerToken`  | yes      | `developer-token` header, via `sign`. Never visible to an action.                                                   |
| `customerId`      | yes      | Recorded on the Connection's redacted `display`; becomes the `customers/{id}` path segment. Overridable per action. |
| `loginCustomerId` | no       | `login-customer-id` header, via `sign` — **only when supplied**.                                                    |

**Why `loginCustomerId` is optional and conditionally sent.** Google requires it when the OAuth user
authorises as a _manager_ account acting on behalf of a client account, and says a credential
belonging to a user of the target account directly should not send the header at all. Absent is not
the same as empty, so `sign` omits the header entirely rather than sending a blank one. Both a
`sign` test and an auth `test` test cover this.

**Why `customerId` travels differently from the other two.** It is a path segment, so an action has
to be able to build it — and actions never see credentials. It reaches them the way QuickBooks'
`realmId` does: `afterConnect` records it on the Connection's redacted `display`. `afterConnect`
also runs one GAQL read against `FROM customer` to label the connection with its descriptive name,
currency and time zone; that lookup is best-effort, and a credential that cannot read the account
still yields a usable connection.

Dashes are accepted everywhere a customer id is asked for — Google's own UI prints `123-456-7890` —
and normalised to bare digits before use.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — machine-readable, and **not** the feed the sibling `google-*` apps use.

```
GET https://ads.google.com/status/publisher/incidents.json
```

This is the one place this app deliberately diverges from `gmail`, `google-calendar`,
`google-drive`, `google-tasks` and friends. They all probe
`www.google.com/appsstatus/dashboard/incidents.json`. Reusing that here would look consistent and be
wrong: **Google Ads is not a Workspace product and does not appear in that feed.** It has its own
dashboard, verified in both directions —

- `https://ads.google.com/status/publisher/products.json` lists 16 products, and **"Google Ads API"
  is one of them**, alongside "Google Ads" itself (also AdMob, AdSense, Google Ad Manager, Display &
  Video 360, Search Ads 360, …). An API-specific incident surfaces under its own `service_name`
  rather than being folded into the advertiser product.
- the incident feed beside it uses the same schema as the Workspace dashboard's — `begin`/`end`,
  `status_impact` (`SERVICE_OUTAGE` / `SERVICE_DISRUPTION` / `SERVICE_INFORMATION`), `external_desc`
  — plus `service_name`, `affected_products[]` and `most_recent_update`.

Two feed quirks that would otherwise produce wrong verdicts, both observed in live data and both
covered by tests:

- `service_name` values arrive with a **leading space** (`" Google Ads"`), so matching is trimmed
  and case-insensitive.
- a multi-product incident carries the literal `service_name` `"Multiple Products"` and names the
  real ones only in `affected_products[]`. Matching `service_name` alone would miss exactly the
  broad outages that matter most, so both are checked.

It is a feed of updates rather than a current-state rollup, so "up" is the absence of an open
incident: an entry with no `end` is still running. A dashboard that itself fails reports `unknown`,
never `down` — that tells us nothing about Google, and calling it an outage would be a lie.

### Is this credential live?

This is what the Auth `test` hook does — the only one of the three the app performs itself.

```
GET /v25/customers:listAccessibleCustomers
```

The right probe for three reasons: it is the one endpoint that takes **no customer id**, so it does
not assume the connection's `customerId` is already correct; it needs no manager context; and it is
reachable by the single scope this app holds. It proves the bearer _and_ the developer token in one
call, and an account with nothing accessible still answers 200.

### Do we have quota left?

Nothing to read — see below. Checked before being written off, because the limits here are real and
tiered enough that "there must be an endpoint" is a reasonable guess.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key           | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | ------------ | --------------------------------------------------- |
| `service`     | service    | app        | none       | degraded      | 120s         | `health/service.ts`                                 |
| `quota`       | quota      | connection | signed     | informational | —            | _declared absent_                                   |
| `auth:oauth2` | credential | connection | signed     | fatal         | —            | derived from the `oauth2` auth method's `test` hook |

The host `ads.google.com` (for `service`) is reachable **only inside that hook's worker** — not from
any action, and not from the other checks. It is deliberately absent from `w6w.network.allow`, and a
test asserts that. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never reach a
status host.

**`quota` is declared absent.** Google publishes no headroom endpoint and no rate-limit response
headers for this API. Daily limits are set by the developer token's access level (table above), and
that level is a property of the connecting organisation's token rather than something the API
reports. Exhaustion surfaces only as `RESOURCE_EXHAUSTED` (`QuotaError.RESOURCE_EXHAUSTED`) on the
next call, which the client surfaces with its error code intact.
`SearchGoogleAdsResponse.query_resource_consumption` is the closest thing to a meter, and it is not
one: it reports the cost of a query already run, not remaining headroom, and reading it would itself
consume quota. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Links

| What                                    | URL                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| Product                                 | https://ads.google.com                                                                 |
| API overview                            | https://developers.google.com/google-ads/api/docs/start                                |
| REST interface (used to build this app) | https://developers.google.com/google-ads/api/rest/overview                             |
| REST — authorization & HTTP headers     | https://developers.google.com/google-ads/api/rest/auth                                 |
| REST — Search & SearchStream            | https://developers.google.com/google-ads/api/rest/common/search                        |
| REST — Mutate                           | https://developers.google.com/google-ads/api/rest/common/mutate                        |
| REST — other methods                    | https://developers.google.com/google-ads/api/rest/common/others                        |
| REST — worked curl examples             | https://developers.google.com/google-ads/api/rest/examples                             |
| GAQL overview                           | https://developers.google.com/google-ads/api/docs/query/overview                       |
| GAQL date ranges                        | https://developers.google.com/google-ads/api/docs/query/date-ranges                    |
| Field reference (v25 campaign)          | https://developers.google.com/google-ads/api/fields/v25/campaign                       |
| RPC reference (v25)                     | https://developers.google.com/google-ads/api/reference/rpc/v25/overview                |
| Developer token                         | https://developers.google.com/google-ads/api/docs/get-started/dev-token                |
| Access levels & daily limits            | https://developers.google.com/google-ads/api/docs/access-levels                        |
| API quotas                              | https://developers.google.com/google-ads/api/docs/best-practices/quotas                |
| Understanding API errors                | https://developers.google.com/google-ads/api/docs/best-practices/understand-api-errors |
| Listing accessible accounts             | https://developers.google.com/google-ads/api/docs/account-management/listing-accounts  |
| Release notes (version cadence)         | https://developers.google.com/google-ads/api/docs/release-notes                        |
| Status dashboard                        | https://ads.google.com/status/publisher/                                               |
| Service definitions (GitHub)            | https://github.com/googleapis/googleapis/tree/master/google/ads/googleads/v25          |
| Google Ads developer libraries (GitHub) | https://github.com/googleads                                                           |

Icon: the vendor's own mark, copied verbatim from n8n's `nodes-base`
(`nodes/Google/Ads/googleAds.svg`), matching the provenance of the other ported apps in this pack.

---

Researched and endpoint-verified 2026-08-03 against the REST guides above **and** the v25 service
and resource `.proto` definitions in `googleapis/googleapis`, which are the machine-readable source
for every path, request field, resource field and enum asserted here. Two things worth re-checking
when this ages: the **version** (Google ships several majors a year — bump `API_VERSION` in
`lib/client.ts`), and the **status feed** (surfaces move; if the `service` check starts failing for
everyone at once, that is the first suspect).
