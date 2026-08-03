# Quickbase

Records, tables, fields, relationships and reports on the **Quickbase JSON RESTful API v1** —
the low-code application platform's modern API, not its legacy XML one.

- **Auth:** `user-token` — `Authorization: QB-USER-TOKEN <token>` plus a `QB-Realm-Hostname` header
- **Actions:** 20
- **Categories:** `databases`, `productivity`, `project-management`
- **Egress:** `api.quickbase.com`, `api.quickbase.eu` — two exact hosts, deliberately **not** a
  `*.quickbase.com` wildcard (see below)
- **Tests:** 113

## Links

| | |
|---|---|
| **Website** | <https://www.quickbase.com> |
| **API docs** | <https://developer.quickbase.com> — and the machine-readable spec it is generated from, <https://developer.quickbase.com/quickbase.json> (Swagger 2.0, 49 paths) |
| **Source / git** | Quickbase publishes **no first-party SDK or API repo**. Its GitHub org, <https://github.com/QuickBase>, holds only unrelated front-end utilities and interview demos — no client library. The de-facto community client is <https://github.com/tflanagan/node-quickbase>, which is *not* a Quickbase product. This app is built from the vendor's published spec, not from any SDK. |

> **The candidate link for this app was wrong.** It pointed at
> `https://www.quickbase.com/api-guide/index.html`, which **404s** — and the `api-guide` path is the
> *legacy XML HTTP API* (`/db/<dbid>?act=API_DoQuery`, `usertoken=` as a parameter), superseded by
> the JSON REST API documented above. This app is built against the current API. Details in
> [What the candidate link got wrong](#what-the-candidate-link-got-wrong).

## Connecting

Three fields.

| Field | What it is |
|-------|------------|
| **Realm hostname** | The full host you sign in to — `acme.quickbase.com`. Not just the subdomain. |
| **User token** | My Preferences → Manage user tokens → New user token. Assign it to the application below. |
| **Default application ID** | The id from the app's URL, `quickbase.com/db/<appId>`. |

### Quickbase looks like a per-tenant-host vendor and is not one

Every customer has a realm at `acme.quickbase.com` — but that is where the *web UI* lives. The API
lives on **one fixed host**, and the realm rides along as a header:

```http
POST https://api.quickbase.com/v1/records/query
QB-Realm-Hostname: acme.quickbase.com
Authorization: QB-USER-TOKEN b1234567_abc_defghij
```

That is why `w6w.network.allow` here lists two exact hosts instead of the `*.quickbase.com` wildcard
that `zendesk` and `chargebee` need for their genuinely per-tenant hosts. The app never dials a
customer's realm, so it must never be *allowed* to — a wildcard would authorise a signed request to
any subdomain of quickbase.com, a strictly larger blast radius bought for nothing.

`api.quickbase.eu` is the second entry, for EU-residency realms. The evidence and the **one
unverified inference** behind it are stated in `lib/client.ts`: the portal's own loader treats
`.quickbase.com` and `.quickbase.eu` as the two production realm suffixes, and `api.quickbase.eu`
answers with the v1 API's own error envelope on the wire — but that an EU realm *must* use it could
not be confirmed without an EU tenant's credential, and the Swagger document names only
`api.quickbase.com`. The host is therefore chosen from the realm's suffix, and an unrecognised
suffix falls back to the documented US host rather than inventing a third.

### `QB-USER-TOKEN <token>` — with a space

Community posts and at least one integration guide circulate
`Authorization: QB-USER-TOKEN user_token=<token>`. **It is wrong**, and it is legacy-XML-API muscle
memory: `usertoken=` really was the parameter name on `/db/<dbid>?act=API_*`. Two statements from
Quickbase's own portal settle it for v1:

- the published spec declares the header on every operation with
  `"example": "QB-USER-TOKEN xxxxxx_xxx_xxxxxxxxxxxxxxxxxxxxxxx"`;
- the portal's own client-side validator for the field is the regex
  `/(QB-USER-TOKEN|QB-TEMP-TOKEN) [a-zA-Z0-9_]+/gi` — which a `user_token=` value cannot match,
  because `=` is not in the character class.

`tests/auth/user-token.test.ts` pins the space form and asserts the emitted header contains no `=`.

### Why an application ID is collected at connect time

**Quickbase publishes no "who am I" endpoint.** There is no `/users/me`, no `/whoami`, no session
introspection. The nearest thing, `POST /users`, is an account-level directory search that a
per-application token is usually not entitled to — so it would report failure for most working
credentials.

That is not a gap to route around; it reflects how the credential works. A user token is *assigned to
applications*, and one assigned to nothing can do nothing. So the connection collects the app it is
for, and the auth `test` hook reads that app back with `GET /apps/{appId}`. One call proves all three
things that can be wrong at once: the token is live, the realm is right, and the token is assigned to
this app. A 401 and a 403 are reported differently, because the fixes differ — mint a new token
versus assign the one you have.

A token assigned to several apps is fine: every action that needs an application takes an optional
`appId` that overrides the connection default.

## Actions

| Resource | Actions |
|---|---|
| **record** | Query Records · Insert or Update Records · Delete Records · Records Modified Since |
| **table** | List Tables · Get Table · Create Table · Update Table · Delete Table · List Relationships |
| **field** | List Fields · Get Field · Create Field · Update Field · Delete Fields |
| **report** | List Reports · Get Report · Run Report |
| **app** | Get Application |
| **formula** | Run Formula |

### Records are keyed by field ID, not by field label

This is the single most surprising thing about the API. A row comes back — and goes out — as:

```json
{ "6": { "value": "Acme Corp" }, "7": { "value": 10 } }
```

Not `{"Name": "Acme Corp"}`. The `fields` array in the same response maps `6` to `"Full Name"`, and
**List Fields** is how a workflow learns the mapping in the first place. A field whose `mode` is
`virtual` or `lookup` is derived and cannot be written.

### HTTP 207: the failure mode that looks like success

`POST /records` declares **200, 207 and 400**. A 207 means *some rows were written and some were
rejected* — and 207 is a 2xx, so `response.ok` is `true`. A client that checks only that flag reports
total success while silently dropping rows. Quickbase names the casualties in `metadata.lineErrors`,
keyed by each row's 1-based position in the payload you sent, and
`totalNumberOfRecordsProcessed` counts successes **and** failures, so it is not a success count
either.

**Insert or Update Records** therefore sets a first-class `partialFailure` boolean so a workflow can
branch without digging through nested metadata, and logs a warning naming the failed rows. It does
**not** throw: the rows that succeeded really were written, and raising an exception would strand
them with no record of what landed.

**Delete Fields** half-succeeds too, but reports it differently — no 207, just a 200 carrying both
`deletedFieldIds` and an `errors` array. It is surfaced as an output for the same reason.

### Pagination returns less than you asked for, on purpose

Quickbase calls it *intelligent pagination*: it sizes each response by payload size and processing
time, so `numRecords` can be smaller than both `totalRecords` and the `top` you requested — and that
does **not** mean you reached the end. Page by advancing `skip` by the `numRecords` you actually got.
Trusting `top` to be honoured is the classic way to silently drop rows.

### Query language

`where` takes the Quickbase query language — `{6.CT.'acme'}AND{7.GT.10}` — or, as a union arm the
spec added, a plain array of record IDs. Both are exposed (`where` and `recordIds`), because building
`{3.EX.'12'}OR{3.EX.'13'}` by hand to fetch two known records is needless.

**Operators must be UPPERCASE.** Quickbase does not error on `{6.ct.'acme'}`; it just stops matching,
which is worse.

**Delete Records refuses an empty filter.** Deleting everything is legitimate and stays available —
Quickbase documents `{3.GT.0}` for it — but it has to be *asked for*. The accident this guards is a
filter interpolated from an upstream step that yielded nothing: an empty filter forwarded verbatim is
the difference between deleting nothing and deleting the table. Spelling `{3.GT.0}` is deliberate; an
empty template variable is not.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Status page** — <https://quickbasestatus.status.page> (StatusCast), probed at `/status.json`.

Finding it took ruling out three hosts that look right and are not. All checked **2026-08-03**:

| Host | What it actually is |
|---|---|
| `status.quickbase.com` | **Not a status page.** 301s to `/db/main` — a *Quickbase application* URL — which renders Quickbase's own error: *"You've requested a page using an invalid hostname: status.quickbase.com"*. `<title>` is literally "Quickbase Error". |
| `quickbase.statuspage.io` | The unclaimed-Atlassian-subdomain trap. `/api/v2/summary.json` → **302 to `https://www.statuspage.io/`**, discarding the path. No Quickbase page behind it. |
| `service.quickbase.com` | Quickbase's *canonical* status host — the RSS feed self-identifies as `service.quickbase.com/rss` — but it answers **403 `Invalid request blocked (v1)`** (28 bytes of `text/html`) to every path from a datacenter address. A WAF blocking the caller is not a signal about the vendor. |

`quickbasestatus.status.page` is the same StatusCast instance, reachable.

**Both required verifications were run before trusting it:**

**(a) Bogus sibling paths.** This host *does* have a catch-all — `/zzz-bogus-control`, `/api/status`,
`/api/v2/summary.json`, `/atom`, `/index.json` and `/history.rss` all return the **same** 1 034-byte
`text/html` page ("Oops Something Went Tragically Wrong"), md5 `4c4596fb…`. Against that baseline
exactly two paths behave differently:

```
GET /status.json  -> 200  application/json     183 bytes
GET /rss          -> 200  application/xml   39 460 bytes
```

and three invented near-misses (`/status2.json`, `/statuss.json`, `/state.json`) return **302 with
zero bytes** — a third distinct behaviour. So `/status.json` is a route, not a fallback.

**(b) Content-type and body.** `application/json`, not `text/html`, and the body is live and
self-consistent:

```json
{"InEffectSince":"2026-08-03T10:41:00",
 "InEffectSinceText":"Current status in effect for 0 days, 9 hours, …",
 "StatusText":"Normal","Status":"Available"}
```

The `/rss` sibling carries 38 real, dated Quickbase incidents and self-links to
`service.quickbase.com` — which is what ties this StatusCast tenant to Quickbase rather than to a
squatter.

**Why `/status.json` over the RSS feed:** it states *current* state directly in one small request. A
feed is a log of updates that has to be folded back into state, and folding it wrong is how a check
ends up reporting a resolved incident from March. The feed is the better fallback if StatusCast ever
drops the JSON route.

**What the check deliberately does not claim.** StatusCast publishes no public dictionary of `Status`
values, and the only value observed on the wire is `Available`. So the mapping is shallow on purpose:
`Available` → `ok`; anything else → `degraded`, with the vendor's own `StatusText` as the message. It
does **not** pretend to distinguish partial degradation from a full outage, because nothing observed
or documented supports that. `degraded` is already this kind's severity ceiling, so the conservative
reading costs an operator nothing while a guessed vocabulary could raise a false outage. No
`components` either — the endpoint reports one realm-wide rollup and nothing per-service.

### Is this credential live?

The auth `test` hook, projected into the health surface as the derived `auth:user-token` check.

```
GET /apps/{appId}
```

Chosen over the obvious alternative, `POST /users`, because that one is an **account-level** directory
search a per-application token is usually not entitled to — it would report failure for perfectly good
credentials. `GET /apps/{appId}` is the cheapest call a user token is *guaranteed* to be entitled to,
since a token is assigned to applications in the first place, and it validates realm, token and
assignment in one request.

### Do we have quota left?

`x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`, read off a cheap signed call.

Quickbase documents **100 API calls per 10 seconds per user token** and, on a 429, a `retry-after`
header. Documented *prose* mentions only `retry-after` — the rejection signal, which you can only read
by making the call that gets rejected, and which is no basis for a check. On that alone this would be
declared `unavailable`.

But Quickbase emits headroom and says so itself. Every response from `api.quickbase.com` carries
(verified on the wire, 2026-08-03):

```
access-control-expose-headers: qb-api-ray,x-ratelimit-remaining,x-ratelimit-limit,
                               x-ratelimit-reset,content-disposition,retry-after
```

A server lists a header there in order to make it readable to a browser client — it is Quickbase
declaring which of its own response headers exist and are meant to be read.

**The honest limit of that evidence:** the CORS declaration was observed; the three headers were
**not** observed *populated*, because every response reachable without a real user token is a 4xx that
omits them. Confirming them on a 200 needs a genuine credential, which this build did not have. The
check is therefore written to degrade rather than assume — absent headers report `unknown` with a
message saying so, and it never fabricates a number. Being `informational`, an `unknown` here cannot
drag a roll-up down.

**One number it refuses to guess.** `x-ratelimit-reset` has no documented unit, and the evidence
conflicts: the maintained community SDK treats it as **milliseconds** (`+(headers['x-ratelimit-reset']
|| 10000)` as a `setTimeout` delay), while the sibling `retry-after` that Quickbase *does* document is
delay-**seconds** or an HTTP-date. With a 10-second window, `10000` is either 10 seconds or 2.8 hours.
So `resetAt` is reported only for values that can only be an absolute epoch, or a parseable date
string; a small, ambiguous remainder yields nothing. A 1000× error in an operator-facing timestamp is
worse than a blank field. `limit` and `remaining` are plain counts and are unaffected.

### Why there is no `dependency` check

Apps addressed by a per-tenant host — Zendesk, Shopify, self-hosted WordPress — declare a
`dependency` check because "is the tenant's host reachable" is a real failure distinct from a bad
credential. **Quickbase does not have that failure**, and adding the check would cost real security
for no signal:

1. **There is no per-tenant host on the data path.** Every call goes to `api.quickbase.com`. The realm
   is a header value, not an origin, so there is nothing tenant-specific to reach.
2. **A wrong realm is already reported, unambiguously.** A user token is realm-scoped, so a bad realm
   makes every signed call fail — which the derived `auth:user-token` check catches. The dependency
   check would be a second name for the same answer.
3. **Probing the realm would require widening egress.** Reaching `acme.quickbase.com` means going from
   two exact hosts to `*.quickbase.com`, to test something the app never calls. That trades the
   narrow allowlist this app exists to keep for a redundant signal.

An unauthenticated probe would not even work: `api.quickbase.com` returns the identical
`400 "Required header 'authorization' not found"` for a valid realm and a nonsense one (verified on
the wire), so realm validity is simply not observable without a credential.

### Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded *(default)* | 60s | `GET quickbasestatus.status.page/status.json` |
| `quota` | quota | connection | signed | informational | 300s | `GET /apps/{appId}`, reading `x-ratelimit-*` |
| `auth:user-token` | credential | connection | signed | fatal | — | derived from the `user-token` auth method's `test` hook |

Neither check is declared absent, so no `severity: "informational"` placeholder is needed for an
`unavailable` entry. `quota` is informational for the ordinary reason: running low is worth showing
and never worth failing a verdict over.

## What the candidate link got wrong

The intake entry cited `https://www.quickbase.com/api-guide/index.html` as the API docs. That URL
**404s** (`text/html`, verified 2026-08-03). More importantly the path is the wrong *API*:
`quickbase.com/api-guide/` is the **legacy XML HTTP API** — `GET /db/<dbid>?act=API_DoQuery` with
`usertoken=` as a query parameter — which Quickbase superseded with the JSON RESTful API at
`api.quickbase.com/v1`. Fragments of that page survive as deep links from the current spec (the query
language reference still points at `help.quickbase.com/api-guide/componentsquery.html`), which is
probably how the URL stayed in circulation.

Building from it would have produced an app on a deprecated transport with a wrong auth format — the
`user_token=` form described above is exactly the legacy API's parameter leaking into REST advice.

Two further corrections the live docs made to the starting assumptions:

- **The realm is a header, not a host.** The brief's hypothesis was right, and it is the reason this
  app's allowlist is two exact hosts rather than a wildcard.
- **Rate-limit headers exist but are undocumented,** and are named `x-ratelimit-*` — not the
  `QB-Api-Ratelimit-*` form that a Quickbase-flavoured guess suggests. That name appears nowhere in
  the spec or the portal.

## Deliberately not built

- **Solutions** (`/solutions/*`, 8 operations) — Quickbase's app-as-code export/import format.
  Meaningful only as a schema-migration pipeline, not as workflow steps.
- **Audit logs** (`POST /audit`) and **platform analytics** (`/analytics/*`) — **enterprise-tier only**
  per the spec, with their own separate rate limits (10 per 10 seconds; 100 per hour) and a
  1 000-days-per-year realm entitlement. Shipping actions most tenants get a hard error from would be
  worse than omitting them.
- **File download / delete** (`/files/{tableId}/{recordId}/{fieldId}/{versionNumber}`) — returns
  base64 file content; belongs with a storage story rather than as a naked action.
- **User token lifecycle** (`/usertoken/clone|transfer|deactivate`, `DELETE /usertoken`) — a workflow
  step that can deactivate the credential running it is a foot-gun, not a feature.
- **Groups, trustees, roles, deny/undeny** — realm administration rather than data automation.
- **Create / delete application** — `deleteApp` requires echoing the app's name as a confirmation,
  which is Quickbase signalling how destructive it is. Application lifecycle is not something to
  trigger from a workflow.
- **Relationship writes** (`POST /tables/{id}/relationship`) — schema design with enough
  type-specific structure that a generic JSON param would be a worse interface than Quickbase's own
  builder. The **read** side is shipped, because a workflow does need to know which fields are derived.
- **Temporary tokens** (`QB-TEMP-TOKEN`, `GET /auth/temporary/{dbid}`) — Quickbase's docs scope these
  to code pages: they are minted from the *browser session*. A server-side sandbox has none, so this
  would be an auth method that could never connect.
- **`POST /auth/oauth/token`** — SAML-assertion token exchange (RFC 8693) for SSO realms, not a
  user-facing OAuth 2 authorization-code flow. There is no `authorizationUrl` to send anyone to;
  modelling it as `type: "oauth2"` would describe a flow that does not exist.
- **App tokens** (`QB-App-Token`) — not a credential but a per-application gate a realm may
  additionally require. No app was available to test one against, and an untested optional header that
  silently does nothing is worse than its absence.

## Icon

`assets/icon.png` is the **vendor mark**, copied verbatim from n8n's `nodes-base`
(`packages/nodes-base/nodes/QuickBase/quickbase.png`, 60×60) — the same provenance as most icons in
this pack. It is not drawn for this pack, so it is not an exception to the pack README's claim.

---

Researched and endpoint-verified 2026-08-03 against Quickbase's published Swagger 2.0 document
(<https://developer.quickbase.com/quickbase.json>) plus live unauthenticated probes of
`api.quickbase.com`, `api.quickbase.eu` and four candidate status hosts. No authenticated call was
possible, so anything requiring a real user token — the populated `x-ratelimit-*` headers, EU realm
routing — is flagged as such above rather than asserted. Status surfaces move; re-check if a probe
starts failing for everyone at once.
