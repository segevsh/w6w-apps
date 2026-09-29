# Zoho Analytics

Discover workspaces, add/update/delete rows by criteria, export a table or view, import a CSV/JSON
file into a brand-new table, and list workspace users or organization admins in Zoho Analytics — BI
and reporting software.

Scoped to **Zoho Analytics specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
(Zoho Books), `zohomail` (Zoho Mail) and several other Zoho products with separate API surfaces — do
not confuse them, and do not modify their directories from here.

- **Categories** — analytics
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 10
- **Egress allowlist** — `analyticsapi.zoho.com`, `analyticsapi.zoho.eu`, `analyticsapi.zoho.in`,
  `analyticsapi.zoho.com.au`, `analyticsapi.zoho.jp`, `analyticsapi.zohocloud.ca`,
  `analyticsapi.zoho.com.cn`, `analyticsapi.zoho.sa`
- **Website** — https://www.zoho.com/analytics/
- **API docs** — https://www.zoho.com/analytics/api/v2/introduction.html (and the per-endpoint pages
  linked below; **not** reachable from Zoho's own site navigation — see "A documentation gap" below)

## Actions

| Resource  | Actions                                     |
| --------- | -------------------------------------------- |
| Workspace | list owned, list shared, get                |
| Row       | add, update, delete                          |
| Data      | export, import into a new table              |
| User      | list workspace users, list organization admins |

Deliberately absent: the Asynchronous Import/Export APIs (needed for tables over one million rows,
live-connect workspaces, and Dashboard/QueryTable views), importing into an *existing* table,
workspace/view/column administration (create, rename, delete, copy), formulas, variables, email
schedules, embedding, and single sign-on — none of those are core CRUD workflow automation, and
several are large enough to be their own app.

## The real API host is `analyticsapi.zoho.<tld>` — not the shared `www.zohoapis.<tld>` gateway

`zohobooks` and `zoho-invoice` both call the shared `www.zohoapis.<tld>` gateway. Zoho Analytics does
not — every real, copy-paste-ready `curl` sample across every endpoint page in its docs
(`prerequisites.html`, `metadata-api/workspace-details.html`,
`bulk-api/import-data/new-table.html`, `data-api/update-row.html`, ...) addresses
`analyticsapi.zoho.com`. There is also a second host that resolves and answers the identical
envelope — `analytics.zoho.com`, named only as an example value for a Postman-collection
environment variable on `rest-api-collection.html`, never in an actual request sample — but the
documented, concretely-used host is `analyticsapi.zoho.<tld>`, so that is what `lib/regions.ts`
addresses.

## `ZANALYTICS-ORGID` is a HEADER, not a query parameter — and only some calls need it

Zoho Books sends `organization_id` as a query parameter on nearly every call; Zoho Invoice sends its
organization id as a header on every call. Zoho Analytics does neither exactly: the organization is
sent as the `ZANALYTICS-ORGID` **header**, but only on calls that act on a specific workspace's
rows/users, or list an organization's admins. `GET /workspaces/owned`, `GET /workspaces/shared` and
`GET /workspaces/<id>` — the discovery/detail calls — take **no** org header at all, since a
workspace id alone already identifies which organization it belongs to.

Every action that needs one exposes an optional `organizationId` param, falling back to the id
`auth/oauth2.ts`'s `afterConnect` records on the connection (from the default owned workspace) — the
common single-organization case needs nothing typed in. Run `workspace-list-owned` to see every
workspace (and its `orgId`) available, and pass one explicitly for a non-default organization.

## Every data-mutating call's parameters ride `CONFIG` — even on POST/PUT/DELETE

`Add Row`, `Update Row`, `Delete Row` and `Export Data` all take their whole parameter set as a
single JSON object, URL-encoded into a `CONFIG` query-string parameter — never a JSON request body,
even on a `POST`. `Import Data` is the one exception, which additionally carries a
`multipart/form-data` `FILE` field alongside the same `CONFIG` query parameter. `lib/client.ts`'s
`ZohoAnalyticsClient#request` builds this consistently so each action file only supplies the config
object.

## Regional data centres (all eight) — Canada breaks the API host pattern too

Zoho hosts every account in one of **eight** regional data centres — United States, Europe, India,
Australia, Japan, Canada, China, Saudi Arabia — each with its own API host
(`analyticsapi.zoho.<tld>`) and (almost always) its own OAuth host (`accounts.zoho.<tld>`). An
account only exists on one data centre, and its OAuth authorization/token endpoints are **not
interchangeable** across them.

Because the OAuth host is baked into the authorization flow itself, a single `oauth2` auth method
with a "data centre" selector cannot express this — `auth/oauth2.ts` declares **one
`AuthDefinition` per data centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`,
`oauth2-jp`, `oauth2-ca`, `oauth2-cn`, `oauth2-sa`), the same pattern `zohobooks`/`zoho-invoice`
already use. `w6w.network.allow` lists every corresponding API host so any of the eight can be
connected.

**Canada is the one region where BOTH the API host and the accounts host break the pattern the other
seven follow — a step further than `zohobooks`, where only the accounts host was the odd one out.**
`analyticsapi.zoho.ca` does not resolve at all; `analyticsapi.zohocloud.ca` does, and answers the
same documented envelope. Likewise `accounts.zoho.ca` does not resolve; `accounts.zohocloud.ca`
does, answering `302` (a real redirect to the Zoho login page) — the same substitution `zohobooks`
and `zoho-invoice` already document for their own OAuth hosts, but here it also applies to the data
API itself. Assuming `analyticsapi.zoho.ca`/`accounts.zoho.ca` from the pattern the other seven
regions follow breaks both connecting AND every subsequent API call for exactly this one region, in
a way that looks like a typo rather than a design fact — `lib/regions.ts` points at the real hosts.

All eight `analyticsapi.zoho.<tld>/restapi/v2/workspaces/owned` endpoints (`analyticsapi.zohocloud.ca`
for Canada) were probed unauthenticated on 2026-09-29 and every one answered the documented shape:

```
400 {"status":"failure","summary":"INVALID_TICKET","data":{"errorCode":8518,"errorMessage":"You
     need to (re)login to perform this operation"}}
```

— not a catch-all 200 or a generic gateway 404. Every `accounts.zoho.<tld>/oauth/v2/auth` (and
`accounts.zohocloud.ca`) answered `302` for a syntactically valid authorize request.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the authenticated user's default `organizationId` /
`primaryWorkspaceName` (from the owned workspace flagged `isDefault`, or else the first one
returned) when reachable — `lib/client.ts#apiHostFromConnection` and `#organizationIdFrom` read
them back, so most row/user/admin actions never need an explicit `organizationId` param.

## A documentation gap, and how these endpoints were actually found

Zoho Analytics' API docs (`https://www.zoho.com/analytics/api/v2/`) are real and current, but
**not reachable from Zoho's own site navigation** — the left-hand menu is populated by client-side
JavaScript this app's research could not execute, and the endpoint pages are absent from
`zoho.com`'s own `sitemap.xml`/`sitemap-index.xml`. Every path used in this app was located via the
Wayback Machine's CDX URL index (`web.archive.org/cdx/search/cdx?url=zoho.com/analytics/api/v2/*`)
and then **re-fetched live** to confirm each is still real, current, and answers the documented
shape — not merely a historical snapshot.

## The response envelope names its payload `data` — except for Export Data

A successful response is `{"status":"success","summary":"<human summary>","data":{...}}`; a failure
is `{"status":"failure","summary":"<ERROR_CODE_NAME>","data":{"errorCode":N,"errorMessage":"..."}}`
— confirmed identically across `data-api/error-codes.html`, `bulk-api/error-codes.html`, and this
app's own live probes (see "Health check" below for the two codes an unauthenticated/dead-token
probe answers with). **`Export Data` is the one endpoint that does NOT follow this shape on
success** — it streams the view's own data back in whatever `responseFormat` was requested
(`Content-Type: text/csv`, `application/json`, etc.), so `data-export` goes through
`ZohoAnalyticsClient#requestRaw` instead of the JSON-unwrapping `#request`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho
CRM), `zohobooks` and `zoho-invoice` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled `"{component} -
{status}"`. `health/service.ts` declares this as a `feed` check and finds the entry whose component
name is **exactly** `"Zoho Analytics"` — confirmed live 2026-09-29 (`"Zoho Analytics -
Operational"`), distinct from three real neighbouring components on the same page that must NOT
match: `"Zoho Analytics-Download"` (a download tool, not the API), `"Analytics Plus Cloud"` (a
different, Enterprise-BI product) and `"Customer Analytics"` (also a different product).

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`, `auth:oauth2-eu`,
etc.

```
GET /workspaces/owned
```

The cheapest authenticated call this app knows: it needs only `ZohoAnalytics.metadata.read` and
(like `GET /workspaces/shared`/`<id>`) no `ZANALYTICS-ORGID` header at all. It also returns nothing
secret. Classified by the vendor's own `data.errorCode`, not by HTTP status alone — confirmed live
against `analyticsapi.zoho.com`:

| Request                                  | HTTP | `errorCode` | `summary`           | Meaning                                    |
| ----------------------------------------- | ---- | ----------- | -------------------- | -------------------------------------------- |
| No `Authorization` header at all          | 400  | 8518        | `INVALID_TICKET`     | No usable token reached the request        |
| `Authorization: Zoho-oauthtoken garbage`  | 401  | 8535        | `INVALID_OAUTHTOKEN` | The token is syntactically present but dead |

Two different problems with two different fixes — collapsing them into one bare 4xx would misreport
one as the other.

### Do we have quota left?

**Declared unavailable.** Zoho Analytics documents a real per-plan daily "API Units" budget (Free
1,000/day up to Enterprise 100,000/day) and a detailed per-action-type unit-cost table (Add Row =
0.1 unit, Update Row = 0.3 unit, importing 1,000 rows = 10–15 units, ...) — but none of that is
exposed as a *response header* the way Zoho CRM's `X-API-CREDITS-REMAINING` is. A live
unauthenticated `GET /workspaces/owned` (and the same call with a bad token) carries no
`X-RateLimit-*` or similarly named header at all — checked 2026-09-29. `health/quota.ts` states this
as a positive absence with `severity: "informational"` (required — an `unavailable` check always
reports `unknown`, which outranks `ok`, so any other severity would pin the App's verdict at
`unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8)   |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## The icon

`assets/icon.svg` is byte-identical to `apps/zoho/assets/icon.svg` (the Zoho CRM app's icon) —
deliberately reused rather than re-sourced, the same pattern this pack already uses for
`zoho-bookings`, `zoho-calendar`, `zoho-recruit` and `zoho-sheet`. Its embedded `aria-label`/`<title>`
still reads "Zoho CRM"; the app-level `alt` in `package.json` ("Zoho Analytics") is what a host
actually surfaces.

## Findings worth a day saved

1. **The real API host is `analyticsapi.zoho.<tld>`, not the `www.zohoapis.<tld>` gateway `zohobooks`
   uses.** A different Zoho product, a different host shape — see "The real API host..." above.
2. **The organization id is a header on some calls and absent on others — never a query parameter.**
   `ZANALYTICS-ORGID` is required for row/user/admin operations, but workspace discovery/detail calls
   take none at all. See "`ZANALYTICS-ORGID` is a HEADER..." above.
3. **Canada breaks the naming pattern for the API host itself, not just the OAuth host.**
   `zohobooks`/`zoho-invoice` document Canada as an OAuth-host oddity; for Zoho Analytics that same
   substitution (`zoho.ca` → `zohocloud.ca`) applies to the data API host too. See "Regional data
   centres" above.
4. **The docs exist and are current, but are unreachable from Zoho's own site navigation.** Every
   endpoint page here was found via the Wayback Machine's CDX index and re-verified live — see "A
   documentation gap" above.

---

Researched and endpoint-verified 2026-09-29 against the live pages under
`https://www.zoho.com/analytics/api/v2/` (`prerequisites.html`, `authentication.html` plus its five
`authentication/*.html` steps, `data-api.html` and its `add-row.html`/`update-row.html`/
`delete-row.html`/`error-codes.html`, `bulk-api.html` and its `import-data/new-table.html`/
`export-data.html`/`error-codes.html`, `metadata-api/workspace-details.html`/
`owned-workspace.html`/`shared-workspace.html`, `user-management-api/get-workspace-users.html`,
`sharing-and-collaboration-api/org-admin.html`, `api-limits-pricing/api-units.html`), plus live
probes against all eight `analyticsapi.zoho.<tld>` API hosts, their accounts hosts, and
`us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a
probe starts failing for everyone at once.
