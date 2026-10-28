# Google Analytics

Run GA4 reports and manage Google Analytics properties, data streams and key
events.

- **Categories** — analytics, marketing
- **Auth methods** — oauth2
- **Actions** — 23
- **Egress allowlist** — `analyticsdata.googleapis.com`,
  `analyticsadmin.googleapis.com`
- **Website** — https://marketingplatform.google.com/about/analytics/
- **API docs** — https://developers.google.com/analytics/devguides/reporting/data/v1 ·
  https://developers.google.com/analytics/devguides/config/admin/v1

## Setup

### OAuth (Sign in with Google)

The only interactive auth path Google offers for these APIs. Requires a Google
Cloud project with **both** the Google Analytics Data API and the Google
Analytics Admin API enabled, and OAuth client credentials configured on this
w6w installation (`client_id` / `client_secret` / `redirect_uri` live on the
w6w server, not in this package).

- Authorize — `https://accounts.google.com/o/oauth2/v2/auth` (PKCE, with
  `access_type=offline` and `prompt=consent`)
- Token / refresh — `https://oauth2.googleapis.com/token`
- Revoke — `https://oauth2.googleapis.com/revoke`
- Scopes — `analytics.readonly` and `analytics.edit`

`access_type=offline` + `prompt=consent` are load-bearing: without both, Google
does not reliably return a refresh token, the connection dies in an hour and
scheduled runs stop.

The bare `analytics` scope that the Data API's discovery document also lists is
deliberately **not** requested — it is the legacy Universal Analytics scope and
grants more than this app uses.

**Property ID** is a connection field. It is the GA4 property these actions
default to (Admin → Property Settings → Property ID); every action can override
it, because one OAuth grant commonly reaches many properties. The
`properties/` prefix is optional and normalized away.

## Actions

| Key | Type | Description |
|---|---|---|
| `report-run` | read | Run a GA4 report over a date range |
| `report-run-realtime` | read | Report on activity in the last 30 minutes |
| `report-run-pivot` | read | Run a report with one or more pivots |
| `report-batch-run` | read | Run up to five reports in one request |
| `metadata-get` | read | List the dimensions and metrics a property supports |
| `compatibility-check` | read | Ask which dimensions and metrics can combine |
| `access-report-run` | read | Audit who accessed this property's data |
| `account-summary-list` | read | List accounts with their properties nested |
| `account-list` | read | List Google Analytics accounts |
| `property-list` | read | List the properties under one account |
| `property-get` | read | Get one property's settings |
| `property-create` | perform | Create a property under an account |
| `property-update` | perform | Change a property's name, zone, currency, industry |
| `data-stream-list` | read | List a property's data streams |
| `data-stream-get` | read | Get one data stream, with its measurement ID |
| `key-event-list` | read | List key events (formerly conversion events) |
| `key-event-create` | perform | Mark an event name as a key event |
| `custom-dimension-list` | read | List custom dimensions and their parameters |
| `custom-metric-list` | read | List custom metrics |
| `data-retention-get` | read | Read how long the property retains event data |
| `audience-export-create` | perform | Start an audience export job |
| `audience-export-list` | read | List audience exports and their build state |
| `audience-export-query` | read | Read the users out of a completed export |

### GA4 is two APIs on two hosts

Not a detail an action can hide:

- **Data API** (`analyticsdata.googleapis.com`) — reporting. Every report is a
  POST whose body *is* the query, and paging happens with `limit`/`offset`
  inside that body.
- **Admin API** (`analyticsadmin.googleapis.com`) — the configuration tree:
  accounts, properties, data streams, key events, custom definitions. These
  page with `pageToken`.

Both hosts are on the allowlist. The generic `www.googleapis.com` is **not**:
it is the namespace Google's scope identifiers are spelled in, it is never
fetched, and allowing it would widen the sandbox to every Google service. Same
reasoning as this pack's `google-ads` app.

`access-report-run` is the trap here — it is a report, but it lives on the
**Admin** API. A test asserts which host each action reaches for, so a later
edit cannot quietly send a report to the wrong service.

### Dimensions and metrics are typed as names, filters as JSON

Reporting actions take dimensions and metrics as comma-separated API names and
expand them into GA4's `[{name}]` arrays — making a form author type
`[{"name":"date"}]` for the common case would be hostile. Filters, `orderBys`
and `pivots` stay JSON, because they are nested expression trees and flattening
them into fields could only express the simplest case.

`metadata-get` is the lookup table: it returns the dimensions and metrics *this
property* supports, custom ones included, with the exact API names the report
actions want. `compatibility-check` answers the follow-up GA4's error messages
do not — which fields still combine with the ones you have.

### `limit` and `offset` are int64

Which means they JSON-encode as **strings**, not numbers. The actions take them
as numbers in the form and convert; sending a bare number is a 400.

### Realtime is a different request, not a flag

`runRealtimeReport` takes `minuteRanges` and has **no `dateRanges` field at
all** — it only looks at the last 30 minutes, and it supports a much smaller
set of dimensions and metrics than the standard report.

### `property-list` needs a parent, `account-summary-list` does not

Google marks `filter` **required** on `properties.list` and will not enumerate
every property a credential can reach — only those under a named parent. So
`property-list` takes an account id and builds `parent:accounts/{id}` rather
than exposing a raw filter string that is almost always that one expression.
`account-summary-list` is the endpoint that needs no ids at all and returns the
whole tree in one call — it is where a workflow author starts.

### `property-update` builds its own `updateMask`

Google rejects a PATCH without one and will not infer intent from the body. The
mask is built from exactly the fields the caller set, never a wildcard — `*`
would blank every field the body omits.

### Key events, not conversion events

Google renamed the concept and the v1beta document still carries both
resources. This app uses `keyEvents`, the current one; shipping both would be
two actions reporting one list.

### Audience exports are a job, not a query

`audience-export-create` starts a long-running export and returns Google's
`Operation` — it does not return the users. The rows are read afterwards with
`audience-export-query`, once `audience-export-list` reports the export as
`ACTIVE`. An action that pretended to return the audience would be lying about
the shape of the API.

### List actions declare no `output` fields

Eight list actions unwrap Google's collection envelope and return the bare
array, so there are no top-level fields for an `output` declaration to name.
The pack auditor warns about them; the warning is the accurate signal.

### Deliberately out of scope

- **Universal Analytics.** GA4 only — UA's reporting API was shut down.
- **Event ingestion.** That is the Measurement Protocol, a different endpoint
  authenticated with a per-stream API secret, and an SDK's job.
- **`conversionEvents`** — the old name for `keyEvents`, above.
- **Account and property deletion, Firebase and Google Ads links,
  measurement-protocol secrets, `provisionAccountTicket`.** Administration and
  provisioning rather than analytics automation, and each needs reach these
  scopes deliberately do not ask for.

## Health check

Three questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**The Google Ads Status Dashboard — not the Workspace one.** This is the same
trap this pack's `google-ads` app documents, catching `google-analytics` from
the other direction: nine of the ten `google-*` apps here probe
`www.google.com/appsstatus/dashboard/incidents.json`, and reusing that would
look consistent and be wrong. Verified live 2026-08-18, in both directions:

```
GET https://www.google.com/appsstatus/dashboard/products.json
    -> 37 Workspace products (Gmail, Drive, Docs, Sheets, Chat, …)
       and NO Analytics entry at all
GET https://ads.google.com/status/publisher/products.json
    -> 16 products, and "Google Analytics" is one of them, alongside
       Google Ads, the Google Ads API, Campaign Manager 360 and DV360
```

So GA lives on the advertising dashboard, and `health/service.ts` reads the
incident feed beside it. Google publishes an incident *feed* rather than a
current-state rollup, so "up" is the absence of an open incident — an entry
with no `end` is still running.

Two feed quirks, inherited from the sibling app's observations of live data and
handled: `service_name` values arrive with a **leading space**, so matching is
trimmed and case-insensitive; and a multi-product incident carries the literal
`service_name` `"Multiple Products"` and names the real ones in
`affected_products[]`, so both are checked — matching only `service_name` would
miss exactly the broad outages that matter most.

### Is this credential live?

`GET /v1beta/accountSummaries?pageSize=1` — the one Analytics endpoint that
takes no account or property id, needs only `analytics.readonly`, and returns
the tree the credential can see. So it proves the bearer without assuming the
connection's `propertyId` is correct.

401 and 403 get different messages: a 403 here usually means the Admin API is
not enabled on the Cloud project, which is a completely different fix from a
bad token.

### Do we have quota left?

**A real number — this is the one `google-*` app in the pack that can answer.**
Its sibling `google-ads` declares quota `unavailable` because Google publishes
no headroom for that API. GA4 is different: `RunReportRequest` takes
`returnPropertyQuota`, and the response then carries a `propertyQuota` object
whose six groups each report `{consumed, remaining}` —

| Group | Standard property allowance |
|---|---|
| `tokensPerDay` | 200,000 |
| `tokensPerHour` | 40,000 |
| `tokensPerProjectPerHour` | 35% of the hourly allowance |
| `concurrentRequests` | 10 |
| `serverErrorsPerProjectPerHour` | 10 |
| `potentiallyThresholdedRequestsPerHour` | 120 |

**The probe costs what it measures, and that is stated rather than hidden.**
`propertyQuota` only rides on a report response, so the check runs the cheapest
report there is — one metric, one day, `limit: 1` — and reads the headroom off
it. That costs a token or two out of 200,000/day, and `minIntervalSeconds: 900`
caps it at four an hour. Spending a rounding error to know whether the next
thousand calls will work is the right trade; reporting `unknown` forever is not.

GA4 reports `remaining` and `consumed` but never the ceiling, so the `limit`
this check reports is `consumed + remaining` — reconstructed, not invented.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `GET ads.google.com/status/publisher/incidents.json` |
| `quota` | quota | connection | signed | informational | 900s | cheapest `:runReport` with `returnPropertyQuota` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.svg` — the Google Analytics mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/googleanalytics.svg>,
downloaded 2026-08-18.

- **738 bytes**, md5 `f55d98e09cf2b7a14aee3e7d1f1883f1`,
  `<title>Google Analytics</title>`, `viewBox="0 0 24 24"`
- inked with `#E37400`, the hex simple-icons records for this brand (sourced
  from Google's own Marketing Platform site)
- **no dark variant needed**: the orange clears `_tools/icon-legibility.ts` on
  both the light and dark tiles, unlike the navy and black marks in this pack
  that need a reversed copy
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Google's own discovery
documents for the Analytics Data API v1beta and Admin API v1beta, plus live
probes of both Google status dashboards. The OAuth shape and scope-namespace
convention follow this pack's `google-ads` app. Status surfaces move; re-check
if a probe starts failing for everyone at once.
