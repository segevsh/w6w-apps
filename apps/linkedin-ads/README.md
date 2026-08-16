# LinkedIn Ads

Manage LinkedIn Ad Accounts, Campaign Groups, Campaigns and Creatives, read performance analytics,
and manage Matched Audiences (DMP) segments, on the **LinkedIn Marketing (Ads) API**.

- **Categories** — marketing, analytics
- **Auth methods** — `oauth2` (Advertising API), `oauth2-audiences` (Matched Audiences)
- **Actions** — 23
- **Health checks** — 1 (`service`) + ~~`quota`~~ + 2 derived (`auth:oauth2`, `auth:oauth2-audiences`)
- **Egress allowlist** — `api.linkedin.com` (the `service` check adds `www.linkedin-apistatus.com`
  to its own hook allowlist, never to the app's)
- **API docs** — https://learn.microsoft.com/en-us/linkedin/marketing/
- **Status page** — https://www.linkedin-apistatus.com/

> **Everything below was verified against LinkedIn's own sources on 2026-08-15** — Microsoft
> Learn's LinkedIn Marketing docs (`learn.microsoft.com/en-us/linkedin/marketing/`, versioned view
> `li-lms-2026-07`, the "Latest Version" published there at the time) and live, unauthenticated
> probes against `api.linkedin.com` and `www.linkedin-apistatus.com`. Nothing here came from a
> third-party integration directory.

## This is not the `linkedin` app

The pack already ships [`apps/linkedin`](../linkedin/README.md), which covers the **member/social**
Posts API — posting as yourself or an organization, reading profiles. This app is the **Marketing
(Ads) API**: a separate product, a separate LinkedIn Developer program (the **Advertising API**,
formerly "Marketing Developer Platform"), and a separate approval gate. The two apps share a host
and the same Rest.li transport conventions (`X-Restli-Protocol-Version`, `Linkedin-Version`), and
this app's icon is byte-identical to the sibling's — same vendor mark, same product family — but
every endpoint, scope and resource below was verified independently against the Ads-specific docs
rather than copied from the sibling.

## The four things most likely to go wrong

### 1. Access is approval-gated, and a correctly-built app can still fail to connect

Getting the `rw_ads` scope granted to a LinkedIn Developer app is **not self-serve**. LinkedIn runs
a "Technical Sign Off" review for the Advertising API program
(`integrations/ads/integration-requirements`): OAuth integration, account-hierarchy retrieval,
campaign CRUD, targeting parity with Campaign Manager, and reporting are all demoed to a LinkedIn
Business Development contact before access is granted. Until that review clears, LinkedIn's
authorization endpoint either rejects the scope request outright or a subsequent API call answers
**403**, not a 401 — a perfectly valid access token, correctly signed, still fails.

**Matched Audiences is gated a second time, separately.** `rw_dmp_segments` "belongs to the
Audiences program and is not granted automatically as part of the LinkedIn Marketing API Program"
(the vendor's own words). An app can be fully approved for the Advertising API and still get 403 on
every `dmpSegments` call until Audiences is granted too — which is why this app declares **two**
auth methods rather than one bigger scope list (see Auth below).

Both auth methods' `test` hooks read the response **body**, not just the status code, specifically
to tell "not approved yet" (403, with LinkedIn's own permission-denied message) apart from "bad
credential" (401, `INVALID_ACCESS_TOKEN` / `EMPTY_ACCESS_TOKEN`) — collapsing the two would send
someone re-authenticating a token that was never the problem.

### 2. Even an approved app only sees explicitly-mapped Ad Accounts

A newly-approved app starts at the Advertising API's **development tier**, which can only see Ad
Accounts explicitly added to it in the Developer Portal: Campaign Manager → copy the 9-digit Ad
Account ID → Developer Portal → your app → Products tab → "View Ad Accounts" → "Add Ad Account".
`ad-account-list` returning an empty `elements` array for a connection that should see accounts is
this, not a bug — and it is exactly why the auth probe treats an empty list as healthy (see Auth).

### 3. Rest.li, not ordinary REST — and its shape isn't even consistent within itself

The query grammar is Rest.li 2.0.0: `q=search` selects a finder method, `X-RestLi-Method` selects a
write kind the HTTP verb can't disambiguate on its own (`PARTIAL_UPDATE`, `BATCH_CREATE`,
`BATCH_PARTIAL_UPDATE`, `FINDER`), and list-valued params are `List(a,b,c)` — see `lib/client.ts`
for the full grammar and its helpers (`restliList`, `buildSearch`, `buildDateRange`).

What isn't consistent, and is easy to get wrong by pattern-matching the wrong sibling endpoint:

| Resource | Single create? | Single update? |
| --- | --- | --- |
| Ad Accounts | ✅ plain `POST` | ✅ plain `PARTIAL_UPDATE` |
| **Campaign Groups** | ✅ plain `POST` | ❌ **only `BATCH_PARTIAL_UPDATE`**, even for one |
| Campaigns | ✅ plain `POST` | ✅ plain `PARTIAL_UPDATE` |
| Creatives | ✅ plain `POST` (content reference) | ✅ plain `PARTIAL_UPDATE` |
| Audience Segments (DMP) | ✅ plain `POST` | ✅ plain `PARTIAL_UPDATE` |

The docs' own table of contents for Campaigns and Campaign Groups lists "Create Campaigns" right
next to "Batch Create Campaigns" and shows the batch form first, which is what makes the plain
single form easy to miss — it's there, confirmed by a "Create a Campaign" / "Create a Campaign
Group" (singular) example lower on the same page. `campaign-group-update.ts` sends the batch-of-one
shape (`ids=List(id)` + an `entities` map) because that's the only form LinkedIn documents for a
Campaign Group.

Addressing is inconsistent too: Ad Accounts, Campaign Groups and Campaigns are addressed by a
**bare numeric id** in the path; Creatives and DMP Segments are not — a Creative takes its **full
URN**, percent-encoded, as the path segment (`/creatives/urn%3Ali%3AsponsoredCreative%3A...`), while
a DMP Segment takes a bare numeric id again. `lib/client.ts`'s `bareId()` / `encodeUrn()` exist
because guessing which one an endpoint wants from its neighbor is how this breaks.

### 4. Two response shapes for "give me a page of results" — and one endpoint has none

Ad Accounts, Campaign Groups, Campaigns and Creatives searches are **cursor-paginated**
(`pageSize`/`pageToken` in, `metadata.nextPageToken` out — moved off index pagination in version
202401). DMP Segment lookup answers the **older** `paging.start/count/total` shape instead. Ad
Analytics (`adAnalytics`) documents **no pagination support at all**, caps a response at 15,000
elements, and throttles on a rolling 5-minute window (45,000,000 requested-metric-values, i.e.
`fields.length × rows`) rather than a request count — which is why `analytics-get`/
`analytics-get-statistics` bound `fields` to a fixed multiselect instead of "return everything."
This app exposes each shape verbatim rather than normalising them, because guessing wrong silently
drops results past the first page.

## Auth

Two `oauth2` methods, both the standard Authorization Code flow against
`https://www.linkedin.com/oauth/v2/authorization` / `.../accessToken`, PKCE off (LinkedIn's
documented request/response shapes for this flow carry no `code_challenge`/`code_verifier`).

| Method | Scopes | Covers |
| --- | --- | --- |
| `oauth2` | `rw_ads`, `r_ads_reporting` | Ad Accounts, Campaign Groups, Campaigns, Creatives, Analytics |
| `oauth2-audiences` | `rw_ads`, `rw_dmp_segments` | Audience Segments (Matched Audiences) |

Two methods rather than one, because LinkedIn's authorization endpoint rejects the **entire**
request if any requested scope isn't granted to the app (`unauthorized_scope_error`) — bundling
`rw_dmp_segments` into the base method would break connecting for every Advertising-API-approved app
that hasn't *also* cleared the separate Audiences program review. This mirrors how the sibling
`linkedin` app splits its Community Management scopes into their own method.

**Refresh tokens.** The Advertising API program's own Technical Sign-Off checklist requires
demonstrating refresh-token use (`ADS-005`/`ADS-006`), so an approved app is expected to receive one
— unlike the free consumer scopes the sibling app uses, which get none. No custom `refresh` hook is
declared: when the stored credential carries a `refreshToken`, the runtime's built-in handler renews
it against `tokenUrl`.

**The probes, and why they're not a whoami.** LinkedIn's Ads API has no member/account "whoami"
endpoint that needs no scope — every candidate is itself one of the resources this app manages.

- `oauth2.test` calls `GET /rest/adAccounts?q=search` with **no filter**. Per the vendor's own doc,
  omitting `search` entirely still returns "all accounts the caller has access to" — a 200 with an
  empty `elements` array is treated as **healthy**, not broken, because that's the expected shape
  for a freshly-approved connection with zero accounts mapped yet (see finding 2 above). It needs
  only `r_ads`/`rw_ads`, and the account list itself carries nothing secret.
- `oauth2-audiences.test` calls `GET /rest/dmpSegments?q=account&account=urn:li:sponsoredAccount:0`.
  `q=account` is the *only* documented finder for DMP segments and mandatorily requires an account
  URN — there is no unfiltered "list everything" form the way Ad Accounts has. A syntactically valid
  but non-existent account id (`0`) is used deliberately: a live token still gets back an empty
  `elements` array rather than an error, without depending on the caller having created a segment
  first or on this hook knowing which real account to ask about.

Both probes distinguish LinkedIn's documented error codes rather than collapsing every failure into
"bad credential":

| Code | Status | Reported as |
| --- | --- | --- |
| `EMPTY_ACCESS_TOKEN` | 401 | credential missing (checked client-side before any request) |
| `INVALID_ACCESS_TOKEN` | 401 | the token is wrong, expired or revoked |
| (any) | 403 | the connected app's Developer product/program approval is missing or pending |

## Actions

23 actions across 6 resources. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `ad-account-list` | search | `GET /rest/adAccounts?q=search` |
| `ad-account-get` | read | `GET /rest/adAccounts/{id}` |
| `ad-account-create` | perform | `POST /rest/adAccounts` |
| `campaign-group-list` | search | `GET /rest/adAccounts/{id}/adCampaignGroups?q=search` |
| `campaign-group-get` | read | `GET /rest/adAccounts/{id}/adCampaignGroups/{id}` |
| `campaign-group-create` | perform | `POST /rest/adAccounts/{id}/adCampaignGroups` |
| `campaign-group-update` | perform | `POST .../adCampaignGroups?ids=List(id)` (`BATCH_PARTIAL_UPDATE`) |
| `campaign-list` | search | `GET /rest/adAccounts/{id}/adCampaigns?q=search` |
| `campaign-get` | read | `GET /rest/adAccounts/{id}/adCampaigns/{id}` |
| `campaign-create` | perform | `POST /rest/adAccounts/{id}/adCampaigns` |
| `campaign-update` | perform | `POST .../adCampaigns/{id}` (`PARTIAL_UPDATE`) |
| `campaign-delete` | perform | `DELETE` (DRAFT) or `PARTIAL_UPDATE` status→`PENDING_DELETION` |
| `creative-list` | search | `GET /rest/adAccounts/{id}/creatives?q=criteria` (`FINDER`) |
| `creative-get` | read | `GET /rest/adAccounts/{id}/creatives/{urn}` |
| `creative-create` | perform | `POST /rest/adAccounts/{id}/creatives` (content reference) |
| `creative-update` | perform | `POST .../creatives/{urn}` (`PARTIAL_UPDATE`) |
| `analytics-get` | read | `GET /rest/adAnalytics?q=analytics` (1 pivot) |
| `analytics-get-statistics` | read | `GET /rest/adAnalytics?q=statistics` (up to 3 pivots) |
| `audience-segment-list` | search | `GET /rest/dmpSegments?q=account` |
| `audience-segment-get` | read | `GET /rest/dmpSegments/{id}` |
| `audience-segment-create` | perform | `POST /rest/dmpSegments` |
| `audience-segment-update` | perform | `POST /rest/dmpSegments/{id}` (`PARTIAL_UPDATE`) |
| `audience-segment-delete` | perform | `DELETE /rest/dmpSegments/{id}` |

### Idempotency

No create action here is marked idempotent — LinkedIn documents no create-time dedupe key on any of
`adAccounts`, `adCampaignGroups`, `adCampaigns`, `creatives` or `dmpSegments`, so a retry creates a
second resource. Every `PARTIAL_UPDATE` (`campaign-group-update`, `campaign-update`, `creative-update`,
`audience-segment-update`) and `campaign-delete` (a `$set` patch either way) are `idempotent: true` —
a repeated `$set` patch's end state doesn't depend on how many times it ran.
`audience-segment-delete` is `idempotent: false` on purpose: a repeat delete of an already-gone
segment is a `404`, a caller-visible failure rather than a silent no-op, even though the *effect* is
the same either way.

### Notes on individual actions

- **`ad-account-create` pins `type: "BUSINESS"`.** The vendor's own note is unambiguous —
  `ENTERPRISE` accounts are reserved for LinkedIn's internal ad-ops systems and cannot be created via
  the API — so it isn't exposed as a choice at all.
- **Campaign search is mandatory-filtered; Ad Account search is not.** `campaign-list` throws before
  making a request if every filter is empty, because LinkedIn's own doc says search criteria is
  required for campaigns — unlike Ad Accounts, where an empty search returns everything accessible.
- **`campaign-create`'s `targetingCriteria` is free-form JSON**, not a generated form. It's a generic
  AND/OR boolean expression over dozens of targeting facets
  (`urn:li:adTargetingFacet:locations`/`:industries`/`:seniorities`/…), each with its own entity
  vocabulary discovered through the separate `adTargetingFacets`/`adTargetingEntities` APIs —
  modeling that fully would mean re-deriving LinkedIn's entire targeting taxonomy as Params, which is
  out of scope here (see "Deliberately not covered"). Updating targeting later requires the
  `interfaceLocales` facet to be present in the new criteria — not validated client-side, since the
  useful part of that error is LinkedIn's own message naming what's missing.
- **`campaign-delete` and `creative-update`'s "delete" are both status flips, not verbs.** LinkedIn's
  documented delete flow for anything past `DRAFT` status IS a `PARTIAL_UPDATE` setting
  `status`/`intendedStatus` to `PENDING_DELETION` — the hard `DELETE` verb only ever succeeds on a
  `DRAFT` campaign (or a creative that's `DRAFT`, linked to a `DRAFT` campaign, or a video stuck in
  `PROCESSING_FAILED`). `campaign-delete` exposes both paths explicitly via a `hardDelete` flag;
  `creative-update`'s soft path covers the common case and the narrow hard-delete conditions are left
  for a future addition.
- **`creative-create` only references existing content.** It does not author a new post
  (`inlineContent`/`action=createInline`) or build a dynamic/Event Ad content object — see
  "Deliberately not covered". The `contentReference` URN this action needs is exactly what the
  sibling `linkedin` app's `create-post` action returns.
- **`analytics-get` always requests `dateRange` and `pivotValues`** alongside whatever metrics are
  chosen, because LinkedIn returns only the fields named in `fields=` — nothing implicitly — and a
  row of numbers with no date or entity attached to it is not useful data.
- **Professional-demographic pivots (`MEMBER_*`) carry different rules than performance data**:
  2-year retention (vs. 10 years for account/campaign/creative-level data), privacy-protected
  approximation, a minimum-3-events threshold per value, and — at `timeGranularity=ALL` — silent
  rounding of a `dateRange` outside the 6-month daily-retention window to month boundaries.
- **`audience-segment-create` builds an *empty* segment.** Populating it with members/companies is a
  separate, higher-volume streaming or CSV-list-upload API this app doesn't cover (see below); a
  segment's `destinations[].status` starts `BUILDING` and transitions asynchronously on LinkedIn's
  side regardless.
- **`audience-segment-update`'s `accessPolicy` is a free-text field, not an enum.** Every sample
  response in the vendor's docs carries `"PRIVATE"`, but no page enumerates the full value set, so
  guessing at one would be exactly the kind of invented enum this pack avoids.

## Health checks

One live check plus a declared absence, plus the two auth methods' derived `auth:*` checks.

### `service` — the vendor's own developer API status page

`https://www.linkedin-apistatus.com/api/v2/summary.json` — an Atlassian Statuspage instance, the
same one the sibling `linkedin` app already probes (page name "LinkedIn API", distinct from the
generic consumer-site `linkedin-status.com` tracker). Measured live 2026-08-15: `200`,
`application/json`, 286 bytes, `page.url` `https://www.linkedin-apistatus.com`. The response
currently carries an **empty `components` array** — only the page-level `status.indicator` is
populated at the moment this was checked — so the check's component-mapping logic (keyed by a slug
of each component's `name`) has to work correctly whether that array is empty or not, rather than
assuming shape from one snapshot. `severity` is left at the `degraded` default and `credential` is
explicitly `"none"` — the precondition for widening `network` to the status host, which is declared
on the check's own hook allowlist, never on the app's.

LinkedIn publishes no status feed scoped to the Advertising API specifically, so this is the best
available signal for "is LinkedIn's API infrastructure up" — the same reasoning the sibling app used
for its own `service` check.

### ~~`quota`~~ — a declared absence, `informational`

LinkedIn documents a hard ceiling on Ad Analytics — 45,000,000 requested metric-values per rolling
5-minute window — and unspecified per-account API rate limits, but exposes **no response header and
no endpoint** that reports remaining headroom for either. Every live probe run for this app (both
unauthenticated and with a garbage bearer token, 2026-08-15) carried none of the `X-RateLimit-*`
headers this pack's other apps read for a `quota` check — only LinkedIn's internal routing/tracing
headers (`x-li-fabric`, `x-li-pop`, `x-li-uuid`, …). `severity: "informational"` is load-bearing: an
`unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any
other severity this would pin the app's verdict at `unknown` forever.

## Deliberately not covered

LinkedIn's Marketing API surface is far larger than what a workflow-automation use case needs from
it. Left out, and why:

- **Ad Targeting discovery** (`adTargetingFacets`, `adTargetingEntities`, Audience Counts, Audience
  Insights) — the API that lets a caller browse LinkedIn's targeting taxonomy (industries, seniority,
  job titles, locations, …) and preview reach before building `targetingCriteria`. `campaign-create`
  and `campaign-update` accept `targetingCriteria` as free-form JSON precisely because modeling this
  taxonomy as generated Params would mean re-implementing a large, separately-versioned API surface.
- **Creative authoring beyond a content reference** — `inlineContent`/`action=createInline` (author a
  new UGC post inline), dynamic ad content (Follower/Spotlight/Jobs Ads), Event Ads, and VAST-tag
  video ads all have their own nested schemas. `creative-create` covers the single, broadly-useful
  case of sponsoring already-published content; the rest is left for a future addition rather than
  guessed at.
- **Ad Account Users** (`adAccountUsers`) — inviting/managing who has access to an Ad Account and
  with what role. Real, documented, and out of scope for this app's first pass.
- **Video/asset upload** (`videos`, `images`, document assets) — each is a multi-step upload flow
  (initialize → PUT bytes to a per-request presigned URL that isn't `api.linkedin.com`) that doesn't
  fit a static `network.allow`, the same reason the sibling `linkedin` app's `create-post` action
  doesn't support image posts either.
- **Conversions API** (`conversionEvents`, `conversions`) — server-side conversion tracking, a
  separate integration surface from campaign/creative management.
- **Matched Audiences list uploads** (`dmpSegmentListUploads`, `dmpSegmentUsers`,
  `dmpSegmentCompanies`) — the higher-volume APIs that actually populate a DMP segment with
  members/companies once `audience-segment-create` has made an empty one. A CSV/streaming upload flow
  with its own batching and PII-handling rules, deliberately left for a dedicated follow-up rather
  than a half-covered afterthought here.
- **Attributed Revenue Metrics** (`q=attributedRevenueMetrics` on `adAnalytics`) — requires the
  advertiser to have connected a CRM (Salesforce/Dynamics/HubSpot) to Business Manager first; there is
  nothing to attribute without that prerequisite, which this app's Connection model has no way to
  represent. `analytics-get`/`analytics-get-statistics` cover the two general-purpose finders
  (`q=analytics`, `q=statistics`) that don't have this prerequisite.
- **Batch operations beyond the one Campaign Groups requires** — `BATCH_CREATE`/`BATCH_GET`/
  `BATCH_DELETE` variants exist for Ad Accounts, Campaign Groups, Campaigns and Creatives. This app
  uses the single-item form wherever one is documented (see finding 3) and only reaches for a batch
  shape where LinkedIn documents no alternative (`campaign-group-update`).

Nothing was left out because it could not be confirmed: every endpoint above is documented on
Microsoft Learn's LinkedIn Marketing pages and was read there.

## Icon

`assets/icon.svg` is LinkedIn's own mark, copied **verbatim** from the sibling `apps/linkedin`
app's committed icon — byte-identical (confirmed by a test in `tests/index.test.ts`), since it's the
same vendor mark for the same company. Not modified, not regenerated.

## Layout

```
linkedin-ads/
├── package.json                    # manifest — the `w6w` identity block
├── index.ts                        # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                   # LinkedInAdsClient, Rest.li query helpers, URN builders, error formatting
│   └── params.ts                   # shared Param fragments and the vendor's enums
├── auth/
│   ├── oauth2.ts                   # Advertising API: rw_ads, r_ads_reporting
│   └── oauth2-audiences.ts         # Matched Audiences: rw_ads, rw_dmp_segments
├── actions/                        # one file per action (23)
├── health/
│   ├── service.ts                  # www.linkedin-apistatus.com
│   └── quota.ts                    # declared absence, informational
├── assets/icon.svg                 # vendor mark, verbatim (= apps/linkedin's)
└── tests/                          # 137 tests: entry module, every action, both auth methods, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly — without it, `_tools/audit.ts` picks
up `_tools/deno.json` instead and cannot resolve the `@w6w/types` value imports this app's
`health/service.ts` and `lib/client.ts` use; this reproduces identically for the sibling `apify` and
`paddle` apps, so it is a property of how the tool is invoked, not of this app.
