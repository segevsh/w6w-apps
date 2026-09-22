# Bigin by Zoho CRM

Create, read, update, search and delete Contacts, Companies, Pipelines and Tasks in
[Bigin](https://www.bigin.com), Zoho's lightweight pipeline CRM for small teams.

- **App id** — `io.w6w.bigin`
- **Categories** — crm
- **Auth methods** — oauth2
- **Actions** — 23
- **Egress allowlist** — the eight `www.zohoapis.*` regional API hosts, plus `accounts.zoho.com`
- **Website** — https://www.bigin.com
- **API docs** — https://www.bigin.com/developer/docs/apis/v2/

Everything in this app was verified on **2026-09-22** against Bigin's own documentation under
`https://www.bigin.com/developer/docs/apis/v2/` (records, users, multi-DC, status codes, API
limits) and against live probes of the API, the OAuth token endpoint and Zoho's status feed. Nothing
here came from a third-party integration directory, and nothing was inferred from a sibling app
without checking Bigin's own page for it.

## Actions

| Resource          | Actions                                    |
| ----------------- | ------------------------------------------ |
| Contact           | list, get, create, update, delete          |
| Company           | list, get, create, update, delete          |
| Pipeline          | list, get, create, update, delete          |
| Task              | list, get, create, update, delete          |
| Any module        | search (generic — `search-records`)         |
| User              | list, get                                  |

Two naming facts are worth stating up front, because Bigin's own module names are not the ones its UI
uses:

- **Companies are the `Accounts` module.** `company-*` actions address `/Accounts`.
- **Pipelines are the `Pipelines` module** — the API name for what the UI calls a deal. `pipeline-*`
  actions address `/Pipelines`.

`search-records` reaches any module by API name — including a custom one — through Bigin's uniform
`GET /{module}/search`, rather than one `*-search` file per resource.

### Request shapes the API forces on us

- **Reads need an explicit field list.** `GET /{module}` requires `fields` (comma-separated, max 50
  names) and has no "give me everything" default, so every list action ships a module-appropriate
  default field set taken from the documented sample responses. The single-record
  `GET /{module}/{record_id}` works without it, so `fields` is optional there and is simply not sent
  when left blank.
- **Writes are wrapped in a `data` array.** `insert-records.html` notes "send only one JSON object in
  the input to insert a single record" while its own sample body is
  `{"data": [ { ... } ]}`. Bigin's sample is what this app sends — one object, inside the array. The
  same page reports `INVALID_DATA` with `{"expected_data_type":"jsonarray","api_name":"data"}` when
  the `data` key is missing or is not an array, which is the other half of the evidence.
- **Writes answer a per-record result array.** Insert, update and delete all return
  `{"data":[{"code","details","message","status"}]}` — batch-shaped even for one record. `status:
  "error"` inside an otherwise-2xx response is surfaced as a thrown error.
- **Search takes exactly one selector.** `criteria`, `email`, `phone` or `word` — one URL per selector
  in the docs, and no `page`/`per_page`. The `criteria` grammar is
  `(({field_api_name}:{comparator}:{value})AND/OR(...))`, with `equals`, `not_equal`, `starts_with`
  and `in` for text-ish fields and `greater_than`, `greater_equal`, `less_than`, `less_equal`,
  `between`, `in` for date/number fields.
- **Update and delete use the single-record path form** (`PUT /{module}/{record_id}`,
  `DELETE /{module}/{record_id}`) rather than the collection forms, since every action here handles
  one record per call. The update body still carries the documented `{ "data": [ { "id": ..., ... } ] }`.

## Accounts, regions and the OAuth dance

Bigin does **not** serve every account from one host. Each account lives in exactly one of eight
regional data centres, each with its own API host (`www.zohoapis.<tld>`) and its own OAuth host
(`accounts.zoho.<tld>`):

| Region | OAuth host                     | API host                    |
| ------ | ------------------------------ | --------------------------- |
| US     | `https://accounts.zoho.com`    | `https://www.zohoapis.com`    |
| AU     | `https://accounts.zoho.com.au` | `https://www.zohoapis.com.au` |
| EU     | `https://accounts.zoho.eu`     | `https://www.zohoapis.eu`     |
| IN     | `https://accounts.zoho.in`     | `https://www.zohoapis.in`     |
| CN     | `https://accounts.zoho.com.cn` | `https://www.zohoapis.com.cn` |
| JP     | `https://accounts.zoho.jp`     | `https://www.zohoapis.jp`     |
| SA     | `https://accounts.zoho.sa`     | `https://www.zohoapis.sa`     |
| CA     | `https://accounts.zohocloud.ca`| `https://www.zohoapis.ca`     |

Source: <https://www.bigin.com/developer/docs/apis/v2/multi-dc.html> ("Multi-DC Support for Bigin
APIs"), verified live 2026-09-22.

Two things about that table shape the code:

1. **Canada does not follow the naming pattern — on the OAuth side only.** Its API host is the
   expected `www.zohoapis.ca`, but there is no `accounts.zoho.ca`; the real OAuth host is
   `accounts.zohocloud.ca`. Normalizing Canada to the pattern that the other seven regions follow
   would break OAuth for exactly one region, in a way that reads like a typo rather than a design
   fact. Both halves are pinned in `lib/regions.ts` and asserted in `tests/index.test.ts`.
2. **Authorization always starts at the US host**, for every region except China: the documented
   flow sends the browser to `accounts.zoho.com/oauth/v2/auth`, and Zoho's own redirect lands it on
   the user's real data centre. China does **not** redirect, so a China-hosted account must start at
   `accounts.zoho.com.cn` — a documented edge case this app does not special-case, because it wires
   a single `oauth2` method exactly like the `zoho` sibling (see below).

### What this app does about it

`auth/oauth2.ts` offers **one** auth method, whose authorization/token endpoints are the US ones
(`accounts.zoho.com/oauth/v2/auth`, `/token`) — the same shape as the `zoho` (Zoho CRM) sibling.
Multi-DC support must be enabled for the OAuth client in Zoho's API console, or a non-US tenant's
authorization is refused by Zoho itself with a regional data restriction.

Once connected, calls are **not** pinned to the US: the token response carries `api_domain` (e.g.
`https://www.zohoapis.eu`), `afterConnect` records it on the connection's `display`, and
`lib/client.ts` reads it back per connection — the same mechanism this pack's `salesforce` app uses
for `instance_url`. Both `apiDomain` and `api_domain` spellings are accepted. The US API host is only
the fallback for a connection that records none at all.

The manifest's `network.allow` therefore names **all eight** `www.zohoapis.*` API hosts — any of them
can legitimately receive traffic — plus `accounts.zoho.com`, the one OAuth host this app itself
contacts. The other seven `accounts.*` hosts are deliberately **not** listed: authorization is
initiated at the US host and Zoho's redirect handles the rest, while the token exchange and refresh
always target the US token endpoint this method configures. Nothing else was declared.

### Scopes

| Scope                          | Why                                                        |
| ------------------------------ | ---------------------------------------------------------- |
| `ZohoBigin.modules.ALL`        | create/read/update/delete/search on every module this app touches |
| `ZohoBigin.users.ALL`          | the two user endpoints                                     |
| `ZohoSearch.securesearch.READ` | **required in addition to** a modules scope for search      |

`access_type=offline` + `prompt=consent` are sent on the authorize URL, as Zoho omits the refresh
token without them and the access token lives one hour.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and is there _credit_ left.

### Is Bigin up?

```
GET https://us.zohostatus.com/rss
```

Zoho does not run Atlassian Statuspage; it runs Site24x7 StatusIQ, which publishes an RSS feed (not
JSON) listing every Zoho product as one item per component, titled `"{component} - {status}"`.
`health/service.ts` declares this as a `feed` check and matches the component name **exactly**:

- The component is **`"Zoho Bigin"`** — verified live 2026-09-22, where the feed carries
  `"Zoho Bigin - Operational"`.
- The same feed also carries **`"Bigin Marketplace - Operational"`**, a different product. A loose
  substring match on `Bigin` would report a marketplace incident as a Bigin API outage, so the match
  is exact and there is a unit test pinning that.

| StatusIQ status      | Mapped state |
| -------------------- | ------------ |
| Operational          | ok           |
| Under Maintenance    | degraded     |
| Degraded Performance | degraded     |
| Partial Outage       | degraded     |
| Major Outage         | down         |

A feed that fails to fetch or parse is `unknown`, never `down` — a broken feed says nothing about the
vendor.

### Is this credential live?

```
GET /bigin/v2/users?type=CurrentUser
```

The cheapest authenticated call Bigin offers: **one credit** per the API Limits page, needing only
`ZohoBigin.users.READ` (a subset of the `ZohoBigin.users.ALL` scope the app requests). Its body is
the calling user's own profile — name, email, role — not a copy of the credential, so it is safe to
probe with, and no part of that profile is echoed into the health message.

Per the pack's hard rule, the result is classified from **the body's own machine-readable `code`**,
not from the HTTP status alone. The two 401s mean different things, and both bodies were measured
live on 2026-09-22:

| Live body (401)                                                                  | What `test` reports |
| -------------------------------------------------------------------------------- | ------------------- |
| `{"code":"INVALID_TOKEN","details":{},"message":"invalid oauth token",...}`       | the token was rejected — reconnect |
| `{"code":"AUTHENTICATION_FAILURE","details":{},"message":"Authentication failed"}` | no usable token reached the request |
| `{"code":"OAUTH_SCOPE_MISMATCH",...}`                                             | the token lacks the users scope |
| `{"code":"AUTHORIZATION_FAILED",...}`                                             | a privilege/plan problem, not a token problem |
| `{"code":"NO_PERMISSION",...}`                                                    | the users endpoint is denied for this user |

A 2xx is not taken on trust either: the response has to carry the documented `users` array, or the
check fails with that reason.

### Is there credit left?

Bigin meters API usage in **credits** against a rolling 24-hour window (5,000 on the Free edition,
50,000+ on paid ones, capped at 100,000), and — unlike a per-minute rate limit — one call costs one
credit while a `cvid` read costs three. `health/quota.ts` probes `X-API-CREDITS-REMAINING` on the
same `GET /users?type=CurrentUser` call, with `severity: "informational"` so running low is never
worth failing a verdict over.

Two honest caveats, stated rather than papered over:

- **The header is not named anywhere in Bigin's API Limits page**
  (<https://www.bigin.com/developer/docs/apis/v2/api-limits.html> documents credit counts and
  concurrency limits only). It belongs to the Zoho platform generation Bigin shares with Zoho CRM,
  whose quota check this one deliberately mirrors. A live 401 to *either* product carries no such
  header, so testing could not distinguish the two: an authenticated response is required to observe
  it, and this repo has no Bigin credential. The check is therefore best-effort reporting — it shows
  a real number when Zoho sends one.
- **A missing header is `ok`, not `unknown`.** For this header family Zoho only reports remaining
  credits once usage crosses 50% of the day's allowance, so absence means "plenty of headroom".
  Reporting `unknown` on the normal case would pin the check at `unknown` forever. An unparseable
  header, or a probe that fails outright, is `unknown` — never a fabricated figure.

If a real credential ever shows that Bigin sends no such header at all, the right change is to
declare this check `unavailable` in the README's terms rather than leave a probe that always reports
the same thing.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key           | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                        |
| ------------- | ---------- | ---------- | ---------- | ------------- | ------------ | -------------------------------------------- |
| `service`     | service    | app        | none       | degraded      | 300s         | `health/service.ts` (feed)                   |
| `quota`       | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                            |
| `auth:oauth2` | credential | connection | signed     | fatal         | —            | derived from the `oauth2` auth method's `test` |

`us.zohostatus.com` is reachable **only inside the `service` hook's worker** — the feed's host is
added to that hook's allowlist implicitly, and the hook stays unsigned because pairing extra egress
with a signed posture is rejected at load time. No action can reach it.

## What is not here (a deliberately narrowed v1)

Bigin documents more modules and more surfaces than this first pass exposes. Left out on purpose:

- **Modules** — Products, Calls, Events and Notes. All four share the same request shape as the four
  that are implemented, so adding them later is a copy of an existing action file plus a default
  field list; they are out because a small-team pipeline app is about contacts, companies, pipelines
  and tasks.
- **The `approved` list filter** — a documented query parameter on `GET /{module}` that filters by
  approval state. It is not exposed because approval workflows are a Bigin 360 feature this app does
  not otherwise model, and inventing a boolean-ish tri-state param (`true` / `false` / `both`) on
  every list action would be surface without a workflow behind it.
- **Bulk / upsert surfaces** — the job-based bulk read/write APIs and `PUT /{module}` upsert. They
  need their own lifecycle (initialise, poll, download) and are not one-record CRUD.
- **Attachments** — upload/download are multipart and file-shaped; no file capability is declared.
- **Metadata endpoints** — Modules, Fields, Layouts, Custom Views, Tags. The actions here take field
  API names as input; shipping a metadata reader is a separate workstream.
- **User writes** — Bigin's user endpoints documented under `get-users.html` are read-only; there is
  nothing to write.
- **China-hosted accounts** — see the multi-DC section: a CN account must start authorization at
  `accounts.zoho.com.cn`, which the single US-endpoint `oauth2` method cannot do. A second auth
  method pointed at the Chinese hosts (plus its API host in the allowlist) is the fix.

## Icon

`assets/icon.ico` — Bigin's own published favicon, shipped verbatim:

- <https://oweb.zohowebstatic.com/sites/oweb/images/zohobigin/favicon.ico>
- fetched 2026-09-22: HTTP 200, `image/x-icon`, **3,115 bytes** (asserted in `tests/index.test.ts`)

The vendor serves a 48×48 RGBA PNG payload under the `.ico` name; it is stored exactly as served,
not re-encoded or re-coloured.

---

Researched and endpoint-verified 2026-09-22 against
`https://www.bigin.com/developer/docs/apis/v2/` (get/insert/update/delete/search records, users,
multi-DC, status codes, API limits) plus live probes of `www.zohoapis.com/bigin/v2/...`,
`accounts.zoho.com/oauth/v2/token` and `us.zohostatus.com/rss`. Vendor status surfaces move; if a
probe starts failing for everyone at once, re-check the feed's component name first.
