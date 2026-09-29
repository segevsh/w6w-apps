# Zoho Creator

List applications, forms, reports and fields, list/add/update/delete records, and upload/download a
record's file — over Zoho Creator's REST API v2, across every Zoho data centre.

Scoped to **Zoho Creator specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
(Zoho Books), `zoho-invoice`, `zoho-analytics` and several other Zoho products with separate API
surfaces — do not confuse them, and do not modify their directories from here.

- **Categories** — productivity, databases (the controlled vocabulary has no "app builder" slug;
  Zoho Creator's own actions here are almost entirely about a custom app's structured record data,
  so `databases` sits alongside `productivity` rather than `forms`, which the vocab reserves for
  survey-style tools like Typeform)
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 10
- **Egress allowlist** — `www.zohoapis.com`, `www.zohoapis.eu`, `www.zohoapis.in`,
  `www.zohoapis.com.au`, `www.zohoapis.jp`, `www.zohoapis.ca`, `www.zohoapis.sa`,
  `www.zohoapis.com.cn`, `www.zohoapis.ae`
- **Website** — https://www.zoho.com/creator/
- **API docs** — https://www.zoho.com/creator/help/api/v2/ (and the per-endpoint pages linked
  below)

## Actions

| Resource | Actions |
| --- | --- |
| Application | list |
| Form | list |
| Report | list |
| Field | list |
| Record | list, add, update, delete |
| File | upload, download |

Deliberately absent — see "What's out of scope" below: the legacy Deluge custom-functions surface,
the Publish API (anonymous public form submission), and the asynchronous Bulk Read API.

## The API host is the shared `www.zohoapis.<tld>` gateway — not a dedicated `creator.zoho.<tld>` host

The task brief that started this app explicitly called out verifying this rather than assuming it,
since Zoho's own products disagree with each other on host shape (Books/Invoice use the shared
gateway, Desk uses `desk.zoho.<tld>`, Analytics uses `analyticsapi.zoho.<tld>`). For Creator the
answer is the shared gateway: `https://www.zoho.com/creator/help/api/v2/oauth-overview.html`
publishes an explicit nine-row "API endpoints by data centre" table naming `www.zohoapis.<tld>`
throughout, and every concrete `curl` sample across every endpoint page in the docs
(`add-records.html`, `get-records.html`, `get-fields.html`, `upload-file.html`, ...) agrees.

`creator.zoho.com` **is** a real, live URL — `things-to-know.html` even mentions it ("In the
downloaded OAS files, the Base URL would be that of the US DC (creator.zoho.com) by default") — but
it 302-redirects to the Creator product's own web app, confirmed live 2026-09-29; it is not the REST
API host. Assuming it from the more "obvious" `<product>.zoho.<tld>` naming other Zoho products use
would have pointed every action at the wrong host entirely.

## Regional data centres (all nine) — Canada's API host does NOT break the pattern here

Zoho hosts every account in one of **nine** regional data centres — United States, Europe, India,
Australia, Japan, Canada, Saudi Arabia, China, United Arab Emirates — each with its own OAuth
accounts host and (for the API itself) the same shared `www.zohoapis.<tld>` gateway. An account only
exists on one data centre, and its OAuth authorization/token endpoints are **not interchangeable**
across them.

Because the OAuth host is baked into the authorization flow itself, a single `oauth2` auth method
with a "data centre" selector cannot express this — `auth/oauth2.ts` declares **one `AuthDefinition`
per data centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`,
`oauth2-ca`, `oauth2-sa`, `oauth2-cn`, `oauth2-ae`), the same pattern this pack's other Zoho apps
use. `w6w.network.allow` lists every corresponding API host so any of the nine can be connected.

**Unlike `zohobooks`/`zoho-invoice`/`zoho-analytics`, Canada's *API* host does NOT break the naming
pattern here — only its OAuth/accounts host does.** Verified live 2026-09-29:

```
$ curl https://www.zohoapis.ca/creator/v2/data/x/x/report/x
{"code":1030,"description":"Authorization Failure. The access token is either invalid or has
 expired. Please check your Zoho Account for more information."}
```

`www.zohoapis.ca` resolves and answers the identical documented envelope as all eight sibling API
hosts — a normal, unremarkable member of the `www.zohoapis.<tld>` family. `accounts.zoho.ca` still
does not resolve at all (as for every other Zoho product in this pack); `accounts.zohocloud.ca`
does, and answers `302` (a real redirect to the Zoho login page) for a syntactically valid authorize
request — so only `auth/oauth2.ts`'s `oauth2-ca` accounts host needs the substitution, not `apiHost`.
This is the narrowest of the three variants of the Canada quirk this pack's Zoho apps now document:
Books/Invoice (accounts host only, same as here), Analytics (both hosts), Creator (accounts host
only, but worth re-verifying per product rather than assuming it always matches the accounts-only
case).

All nine `www.zohoapis.<tld>/creator/v2/meta/applications` endpoints were probed unauthenticated on
2026-09-29 and every one answered the identical documented shape shown above — not a catch-all 200
or a generic gateway 404. Every `accounts.zoho.<tld>/oauth/v2/auth` (and `accounts.zohocloud.ca`)
answered `302` for a syntactically valid authorize request; `accounts.zoho.ca` did not resolve.

## `account_owner_name`/`app_link_name` are required per-action params, never a connection field

Every Zoho Creator application is addressed in its own URL path by a specific
`<account_owner_name>/<app_link_name>` pair. Unlike Zoho Books/Analytics, which have one default
organization/workspace a connection can record via `afterConnect`, a single Creator OAuth token can
reach many different owners' applications — there is no one "default app" to fall back to. So these
are **required params on every action that needs them** (`lib/params.ts`), never a connection field.

Run **List Applications** first — it needs neither param (`GET /creator/v2/meta/applications`, no
owner/app in the URL at all) — and use each result's `workspace_name` as `accountOwnerName` and
`link_name` as `appLinkName` everywhere else. It is also the credential probe `auth/oauth2.ts`'s
`test` hook uses, for the same reason: it is the one call that works immediately after connecting,
before the user has told this app which application to work with.

## Auth failures collapse to one code — unlike `zoho-analytics`'s two

Zoho Analytics distinguishes a *missing* token (`INVALID_TICKET` / 8518) from a *dead* one
(`INVALID_OAUTHTOKEN` / 8535). Zoho Creator's docs draw no such line: both a request with no
`Authorization` header at all and one with a syntactically plausible but garbage token answer the
identical `401 {"code":1030,"description":"Authorization Failure. The access token is either
invalid or has expired..."}` — verified live 2026-09-29 against
`https://www.zohoapis.com/creator/v2/meta/applications`. `status-codes.html` does document two
*different* problems nearby — `1040` (`404`, "There is no such user" — an unknown
`account_owner_name`) and `1130` (`403`, the API access permission disabled for the requesting user)
— but neither is a credential-liveness question, so `auth/oauth2.ts`'s `test` hook reports whichever
code actually came back (via `body.code`) rather than inventing a two-way split the vendor's own
docs don't draw.

## Get Records answers `404`/code `3100` for "nothing matched" — a real, documented non-error

`status-codes.html` lists `404 NOT FOUND / 3100 / "No records found for the given criteria."` as the
response to a List Records call whose criteria matched nothing. That is a legitimate empty result,
not a request-level failure — `lib/client.ts`'s thrown errors carry the parsed `code`
(`ZohoCreatorApiError`), so `actions/record-list.ts` catches exactly `code === 3100` and returns an
empty `records` array instead of surfacing an error to the workflow. Any other error code still
throws normally.

## Add/Update/Delete Records answer 200 with a PER-RECORD result envelope

Unlike a single request-level failure (bad token, bad form/report name, ...), which is a non-2xx
`{"code":N,"description":"..."}` and throws, a successful `POST`/`PATCH`/`DELETE` to
`add-records.html`/`update-records.html`/`delete-records.html` answers `200` with
`{"result":[{"code":N,"data":{...},"message"|"error":[...]}],"code":N}` — even when *some* of the
records inside `result` individually failed (e.g. a duplicate-value validation on one row out of
ten). This app passes that array through as-is rather than throwing on a per-record failure, so a
workflow can inspect each item's own `code`/`error`.

`record-update`/`record-delete` additionally surface `moreRecords` (from the vendor's `more_records`
key) when more than 200 records match the criteria and `processUntilLimit` was set — loop the action
until it comes back `false`, per `update-records.html`/`delete-records.html`.

## What's out of scope, and why

- **The legacy Deluge-script custom-functions surface.** A fundamentally different mechanism —
  server-side scripting invoked from inside a Creator app, not a generically-callable REST API — the
  task brief that started this app explicitly excluded it, and this sandbox has no way to model it
  as a request/response Action.
- **The Publish API** (`publish-api/add-records.html` and its siblings). A different auth model
  entirely: an *anonymous* public form submission authenticated by a form's `privatelink` query
  parameter, not an OAuth token — none of this app's actions, and no Connection, is involved at all.
  Modeling it would mean a second, unrelated no-auth "app" bolted onto this one.
- **The Bulk Read API** (`bulk-api/overview.html` and its siblings). An asynchronous
  create-job/poll-status/download-a-zip flow for exporting very large datasets — genuinely useful,
  but a large enough surface (three coordinated calls, a binary zip/CSV result) to be its own action
  pair, and `record-list`'s `from`/`limit` pagination already covers the common bounded-size read.
- **Response-shaping niceties beyond `message`/`tasks` booleans.** Add/Update Records supports a
  `result.fields` array to select which fields come back, and a `tasks` response with structured
  redirect details — this app exposes the boolean switches but not the fine-grained field selector,
  since the record's own `ID` plus whatever was just written is the common case.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho
CRM), `zohobooks`, `zoho-invoice` and `zoho-analytics` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled `"{component} -
{status}"`. `health/service.ts` declares this as a `feed` check and finds the entry whose component
name is **exactly** `"Zoho Creator"` — confirmed live 2026-09-29 (`"Zoho Creator - Operational"`).
Unlike Zoho Analytics' feed, which carries three confusable neighbours ("Zoho Analytics-Download",
"Analytics Plus Cloud", "Customer Analytics"), no other component on the feed has "Creator" in its
name at all — a single unambiguous match.

| StatusIQ status | Mapped state |
| --- | --- |
| Operational | ok |
| Under Maintenance | degraded |
| Degraded Performance | degraded |
| Partial Outage | degraded |
| Major Outage | down |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`, `auth:oauth2-eu`,
etc.

```
GET /creator/v2/meta/applications
```

The cheapest authenticated call this app knows: it needs only `ZohoCreator.dashboard.READ` and no
`account_owner_name`/`app_link_name` at all — unlike every other Creator endpoint. It also returns
nothing secret. Classified by the vendor's own `code`, not HTTP status alone — see "Auth failures
collapse to one code" above.

### Do we have quota left?

**Declared unavailable.** `things-to-know.html` documents a real per-subscription daily "Developer
API" call budget and a 50-calls/min-per-endpoint-per-IP cap (also codified as error `2955`, `429 Too
Many Requests`) — but neither is exposed as a *response header* the way Zoho CRM's
`X-API-CREDITS-REMAINING` is. A live unauthenticated `GET /creator/v2/meta/applications` (and the
same call with a bad token) carries no `X-RateLimit-*` or similarly named header at all — checked
2026-09-29. `health/quota.ts` states this as a positive absence with `severity: "informational"`
(required — an `unavailable` check always reports `unknown`, which outranks `ok`, so any other
severity would pin the App's verdict at `unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
| --- | --- | --- | --- | --- | --- | --- |
| `service` | service | app | none | degraded | 300s | `health/service.ts` (feed) |
| `quota` | quota | — | — | informational | — | ~~declared unavailable~~ (`health/quota.ts`) |
| `auth:oauth2-<region>` | credential | connection | signed | fatal | — | derived from each region's `oauth2-<region>` `test` hook (9) |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## The icon

`assets/icon.svg` is byte-identical to `apps/zoho/assets/icon.svg` (the Zoho CRM app's icon) —
deliberately reused rather than re-sourced, the same pattern this pack already uses for
`zoho-bookings`, `zoho-calendar`, `zoho-recruit`, `zoho-sheet` and `zoho-analytics`. Its embedded
`aria-label`/`<title>` still reads "Zoho CRM"; the app-level `alt` in `package.json` ("Zoho Creator")
is what a host actually surfaces.

## Findings worth a day saved

1. **The real API host is the shared `www.zohoapis.<tld>` gateway, not a dedicated
   `creator.zoho.<tld>` host** — despite `creator.zoho.com` being a real, live URL for the product
   itself. See "The API host..." above.
2. **Canada's API host does NOT carry the `zohocloud.ca` substitution here — only its accounts
   host does**, the narrowest of the three variants of this quirk now documented across this pack's
   Zoho apps (Books/Invoice: accounts-only, same as here; Analytics: both hosts). See "Regional data
   centres" above.
3. **`account_owner_name`/`app_link_name` are required per-action params, not a connection default**
   — a single Creator token can reach many different owners' applications, unlike Books/Analytics'
   one-default-organization model. See "`account_owner_name`/`app_link_name`..." above.
4. **Auth failures don't distinguish missing from dead tokens the way Analytics' two codes do** —
   both answer the same `1030`. See "Auth failures collapse to one code" above.
5. **A `404` from List Records can mean "nothing matched", not "something broke"** — code `3100` is
   folded into an empty array rather than thrown. See "Get Records answers..." above.

---

Researched and endpoint-verified 2026-09-29 against the live pages under
`https://www.zoho.com/creator/help/api/v2/` (`things-to-know.html`, `oauth-overview.html`,
`status-codes.html`, `get-applications.html`, `get-forms.html`, `get-reports.html`,
`get-fields.html`, `get-records.html`, `add-records.html`, `update-records.html`,
`delete-records.html`, `upload-file.html`, `download-file.html`, `bulk-api/overview.html`,
`publish-api/add-records.html`), plus live probes against all nine `www.zohoapis.<tld>` API hosts,
their accounts hosts, and `us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts`
conventions in mind if a probe starts failing for everyone at once.
