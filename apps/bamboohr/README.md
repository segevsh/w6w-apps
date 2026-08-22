# BambooHR

Read and write BambooHR employees, time off, files, reports and metadata via the BambooHR API v1.

- **App id:** `io.w6w.bamboohr`
- **Category:** `hr` — the first HR app in this pack. It is a sanctioned slug in
  [`rfcs/categories.md`](../../../core/rfcs/categories.md), whose own example row for `hr` reads
  "BambooHR, Workday, Greenhouse, Rippling".
- **Auth:** `api-key` — HTTP Basic, key as username (1 method)
- **Actions:** 18
- **Health checks:** `service` (real, feed-backed) · `quota` (declared unavailable)

Everything below was verified against BambooHR's own documentation on **2026-08-03**. Quoted lines
are the vendor's words, not paraphrase.

---

## Three things to get right

This API has three properties that fail *quietly* rather than loudly. Each is handled in one place
(`lib/client.ts`) and pinned by tests, because each is the kind of thing that works in a first
smoke test and breaks a week later.

### 1. The base URL is per-customer — the host, not a path

Every BambooHR customer has its own subdomain, and the API lives on it:

```
https://{companyDomain}.bamboohr.com/api/v1/...
```

That is the only server in the vendor's machine-readable spec. The OpenAPI document embedded in
every reference page carries exactly one entry:

```json
"servers": [{
  "url": "https://{companyDomain}.bamboohr.com",
  "variables": { "companyDomain": { "default": "companySubDomain", "description": "Company domain" } }
}]
```

The Technical Overview says the same in prose — "API requests are made to a URL that begins with
`https://{companyDomain}.bamboohr.com/api/`" — and the Getting Started page's only curl sample is
`curl -i -u "{API Key}:x" "https://{companyDomain}.bamboohr.com/api/v1/employees/directory"`.

So `companyDomain` is a property of the **Connection**, not of a call. It is collected once as an
auth field, republished as `connection.display.subdomain` by `afterConnect`, and turned into a base
URL by `lib/client.ts`. Actions never see it directly and never see the credential.

#### The legacy `gateway.php` form, and why this app does not use it

Older integrations address a **fixed** host and put the customer identifier in the **path**:

```
https://api.bamboohr.com/api/gateway.php/{subdomain}/v1/{endpoint}     ← legacy, undocumented
```

n8n's BambooHR node still ships exactly this string. It appears to keep working, but it is **not in
BambooHR's current documentation anywhere** — not in a `servers` block, not in a curl sample, and
not in any of the 345 reference pages listed by `llms.txt`.

**Decision:** this app implements the **documented** host form. An undocumented alias is precisely
the surface that disappears without a deprecation notice, and the documented one is what the
vendor's own spec generates clients against.

**Consequence for `network.allow`:** because the host is per-customer, the manifest declares the
narrow wildcard `"*.bamboohr.com"` — the form the spec defines as "any subdomain at any depth, NOT
the apex". A fixed `api.bamboohr.com` would be tighter but **wrong**: it does not cover
`acme.bamboohr.com`, so every call would be denied by the sandbox. This is the same posture
`chargebee` takes in this pack, for the same reason.

### 2. Responses default to XML

**This is the single easiest way to break a BambooHR integration.** A missing `Accept` header does
not error — it returns **200 with an XML body**, which a JSON parser then chokes on far from the
cause.

The docs state it outright in the `list-employee-files` parameter table, where `Accept` carries
`default: application/xml`:

> Set to `application/json` to receive a JSON response. **Any other value (or omitted) returns XML.**

The Technical Overview assumes XML too ("API consumers should ignore any XML tags and attributes
they do not recognize"), and several endpoints ship a redundant `format=json` query parameter
precisely because the header is so often forgotten — `list-list-fields` documents it as "an
alternative to using the Accept header".

`BambooClient` therefore sets `accept: application/json` on **every** request, from one place. A
test asserts it for *every action in the app*, not per call site:

```ts
Deno.test("client: every action in the app sends Accept: application/json", ...)
```

### 3. `fields` is opt-in — there is no "give me everything"

`GET /api/v1/employees/{id}` returns **only `id`** unless you name fields:

> Every other field is included only when explicitly named in the `fields` query parameter. With no
> `fields` parameter, the response contains only `id` — there is no implicit default field set.

Max **400** fields per request. Three reference forms are accepted and may be mixed freely:
standard names (`firstName`), numeric field IDs (`1349`), and custom-field aliases
(`customStartDate`). Discover all three with the **List Fields** action, whose response carries
`id`, `name` and `alias` for every field.

Two traps worth naming:

- **The vocabulary is per-endpoint.** `GET /employees/{id}` uses short names (`workEmail`,
  `jobTitle`, `department`, `supervisor`) where the `employee` dataset uses qualified ones
  (`email`, `jobInformationJobTitle`, `jobInformationDepartment`, `jobInformationReportsTo`).
- **`GET /employees/{id}` accepts only the comma-separated form.** Bracket-array (`fields[]=`) and
  repeated-key (`fields=a&fields=b`) forms are *not* supported there, though `GET /employees`
  accepts the bracket form. This app emits the comma-separated form everywhere, which both accept.

**List Employees is the exception:** it *does* have a default field set, and its `fields` parameter
*adds* to it. The two are easy to get backwards.

---

## Auth — HTTP Basic, key as username

BambooHR uses HTTP Basic with the API key in the **username** position and a throwaway password:

> At the HTTP level, the API key is sent over HTTP Basic Authentication. Use the secret key as the
> username and **any random string** for the password.

The wire value is `Basic base64("${apiKey}:x")`. The literal `x` is the vendor's own sample value;
any non-empty string works, but pinning it to `x` makes the wire format reproducible and testable.

> **Note the contrast with `close` in this same pack**, which is also Basic-with-key-as-username but
> fixes the password **empty** (`base64("key:")`). The two are one character apart on the wire and
> are not interchangeable. `tests/auth/api-key.test.ts` asserts the difference explicitly.

### Two fields, both required

| Field | Type | Why |
|---|---|---|
| `subdomain` | `string` | The part before `.bamboohr.com` in your BambooHR URL. Not a secret — it is in the URL of every page. Without it there is no host to call. Pasting the full host or URL works too. |
| `apiKey` | `secret` | Your name (lower-left) → **API Keys**. A 160-bit hex value. |

There is deliberately **no password field**: the protocol discards it, so prompting would only
invite people to type something wrong.

**The key carries *your* permissions.** BambooHR is explicit: "Each API request ... will be
authenticated and permissioned as if a real user were using the software." So which employees and
fields an action can see or edit are exactly the ones the key's user can.

### `type: "basic"`, not `type: "apiKey"`

`ApiKeyConfig` can only express "put this value, with this prefix, in this header/query/body slot".
It cannot express "base64 the value with `:x` appended", so `type: "apiKey"` would describe a wire
format this app does not use and a host could not reproduce. `type: "basic"` plus an explicit
`sign` hook is the accurate description.

### Credential check — `GET /employees/0`

`0` is a documented sentinel for "the caller's own record", and it is the narrowest possible probe:

- It needs **no scope and no `fields`**, so field-level permissions never enter a liveness check.
- It degrades rather than failing for integration keys — "if the credentials are not bound to an
  employee (for example an integration-style account), `0` returns only `{"id": "0"}`".

Probing `/employees/directory` instead would report a working credential as broken whenever
directory sharing is off for that access level, which is normal configuration rather than a fault.

401, 403 and 404 are reported separately because the fixes differ — notably, **403 is also what
BambooHR returns after repeated unknown-key attempts trip its lockout** ("the API will disable
access for a period of time"), which clears on its own.

### OAuth 2.0 exists

BambooHR also supports authorization-code OAuth 2.0 (`{companyDomain}.bamboohr.com/authorize.php`
and `/token.php`, with `offline_access` for a refresh token), intended for "applications requiring
multi-customer access via the Developer Portal". We ship the API key because it needs no portal
registration, no client secret and no redirect URI. Add OAuth as a second `AuthDefinition` when a
listed marketplace integration is needed — note its endpoints are **also** per-customer, so it does
not remove the company-domain field.

---

## Actions

18 actions, each a real documented endpoint. Nothing is invented.

### Employees (7)

| Action | Endpoint |
|---|---|
| `get-employee` | `GET /employees/{id}` — one employee; **name your fields** |
| `list-employees` | `GET /employees` — cursor-paginated, filterable, sortable |
| `get-employees-directory` | `GET /employees/directory` — the shared company directory |
| `create-employee` | `POST /employees` |
| `update-employee` | `POST /employees/{id}` — **POST**, not PUT/PATCH |
| `get-employee-table-data` | `GET /employees/{id}/tables/{table}` — tabular history |
| `list-employee-files` | `GET /employees/{id}/files/view` — note the `/view` suffix |

**`list-employees` vs `get-employees-directory` are different questions, not duplicates.** The
directory is "governed by directory sharing settings rather than by per-employee record
permissions" — broader (no per-record gate) and narrower (only published fields). If sharing is off
for an access level, the directory returns nothing useful while List Employees still works.

**`get-employee-table-data` is how you read history.** Where `get-employee` flattens job title or
compensation to a current value, this returns the row-per-change table. Two affordances: `id`
accepts the literal **`all`** ("table data for all employees the authenticated caller has access
to"), and custom tables (`custom1`, `custom42`) are valid. `table` is free text rather than a
`select` precisely so custom names work; discover them via `GET /api/v1/meta/tables`.

**Employee IDs are internal IDs, not Employee #.** The docs are blunt about the consequence of
confusing them: passing an `employeeNumber` "may fail with `404` **or resolve to a different
employee** if its value matches another employee's internal employee ID."

**Both write actions take a free-form `fields` map.** The documented schema "lists commonly used
fields, but any valid writable employee field name may be included as a key" — and the real field
set is per-company, since custom fields exist. Named params win over the map on collision.
Address aliases are a documented 406 trap: the correct keys are `address1`, `address2`, `city`,
`state`, `zipcode`, `country` — **not** the `home*` variants.

**Photo keys are silently ignored** by both create and update: the request still succeeds, but no
photo is attached.

### Time off (7)

| Action | Endpoint |
|---|---|
| `list-time-off-requests` | `GET /time_off/requests` — `start` and `end` **required** |
| `create-time-off-request` | `PUT /employees/{id}/time_off/request` — **PUT** |
| `update-time-off-request-status` | `PUT /time_off/requests/{id}/status` |
| `get-time-off-balance` | `GET /employees/{id}/time_off/calculator` |
| `list-whos-out` | `GET /time_off/whos_out` |
| `list-time-off-policies` | `GET /meta/time_off/policies` |
| `list-time-off-types` | `GET /meta/time_off/types` |

**The request window is an OVERLAP test, not containment.** This is the one people get backwards:

> `start` — "Returns any request whose **end** date falls on or after this date."
> `end` — "Returns any request whose **start** date falls on or before this date."

Pass your range and you get every request overlapping it, including ones that began before it or
run past it.

**`status` on create is a permission gate.** `requested` is the only value every key can use.
`approved`/`denied` are "only honored when the caller is an owner/admin or has view/edit access to
the time off type field for the target employee; other callers receive 403" — and when honored they
record the request directly and **suppress approval notifications**.

**`previousRequest` is destructive**, not a link: it sets the prior request to `superceded`,
"all approvals on its workflow are removed and the workflow is marked deleted, and any home-page
notifications tied to that workflow are deleted."

**The status vocabularies differ between create and update.** Create accepts
`approved | denied | declined | requested`; update accepts
`approved | denied | declined | canceled | cancelled`. `canceled` is valid only on update;
`requested` only on create. Both spellings of denied/canceled are BambooHR's, and this app mirrors
the schema rather than tidying them away — a workflow passing through a value it read from a
payload should not hit a validation error we invented.

**`get-time-off-balance` is a calculator, not a filter.** `end` is the date to calculate *as of*:
"use a future date to project balance." That makes it useful for "will they have accrued enough by
December", not just "what do they have now".

**`list-whos-out`'s filter is the reverse of what it sounds like.** *Omitting* it applies the key
holder's saved Who's Out calendar filter; passing the single documented value `off` **bypasses**
that filter and widens the result to everyone. This app exposes it as a boolean labelled "Ignore
saved calendar filter" and emits the literal itself.

**`list-time-off-types` exists because `create-time-off-request` needs it** — `timeOffTypeId` is
required there and has no other discovery path.

### Field metadata (2)

| Action | Endpoint |
|---|---|
| `list-fields` | `GET /meta/fields` — every field, with `id` / `name` / `alias` |
| `list-list-fields` | `GET /meta/lists` — dropdown fields and their allowed values |

`list-fields` is the keystone of this app: because `fields` is opt-in and the field set is
per-company, nothing works properly until you know the names.

`list-list-fields` deliberately does **not** expose the `format` parameter — it is documented as
"an alternative to using the Accept header", and the client already sends `Accept:
application/json`. Two switches for one outcome, where turning the visible one off changes nothing.

### Reports (2)

| Action | Endpoint |
|---|---|
| `list-reports` | `GET /custom-reports` — find a saved report's ID |
| `get-report` | `GET /custom-reports/{reportId}` — run it |

Often the most practical way to extract a wide, filtered slice: the columns and filters are chosen
once in the BambooHR UI, and `get-report` just runs it — no `fields` list to assemble and no
per-endpoint vocabulary to get right. Paging is `page` (default 1) and `page_size` (default 500,
max 1000).

### Idempotency, stated honestly

| Action | `idempotent` | Why |
|---|---|---|
| `create-employee` | `false` | No idempotency key. The only duplicate protection is a 409 on duplicate email — a retry without one creates a second person. |
| `create-time-off-request` | `false` | No key, no natural dedupe. A retry books a second block of leave. |
| `update-employee` | `true` | A field-set merge; the same pairs twice converge. |
| `update-time-off-request-status` | `true` | Setting `approved` twice leaves it approved. |

---

## Health checks

### `service` — BambooHR platform status (real, feed-backed)

Declared with `feed`, so the **host** fetches and parses the RSS and hands entries to the hook as
`input.feed`. This app never reimplements a feed reader, and the feed's host is allowlisted
implicitly — which is why `status.bamboohr.com` is deliberately **absent** from the app's own
`network.allow`, and why the check declares no `network` of its own.

```
https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss
```

**Verified on both axes** required for a status endpoint, because a 200 proves nothing on its own:

| Probe | Result |
|---|---|
| The real feed | **200**, `application/rss+xml; charset=utf-8`, **12407 bytes** — `<rss><channel><title><![CDATA[BambooHR]]></title><description><![CDATA[Status Feed]]>`, live `lastBuildDate`, real incident items ("Background Processing is Delayed", July 2026) |
| **Bogus sibling** — same host/shape, page id mutated to `…0002ff` | **200 `text/html`, 434 bytes** — a `<title>Error</title>` stub |

So the host does *not* serve the feed indiscriminately, and the content is a genuine,
currently-maintained status feed rather than marketing HTML. The page itself
(`https://status.bamboohr.com/`, 200, 122 KB) is a real status.io-hosted board whose meta
description is "Current system status. View active incidents or upcoming maintenance", with
per-component entries such as "app.bamboohr.com (US)".

**Why the feed and not status.io's JSON API.** `https://api.status.io/1.0/status/54f0de…` is live
and returns a structured `status_overall`, but it lives on a **third** host unrelated to BambooHR
that would have to be allowlisted and trusted to keep serving this page id. One fewer third-party
host, and no parser of our own, is the better default.

**Reads `latest`, not `entries`.** A feed is a log of *updates*: status.io emits one item per
update, so the newest item of a long-resolved incident still carries that incident's original
title. Judging by it would report an outage that ended days ago.

State mapping: no open incidents → `ok`; any open incident → `degraded` (naming them); unreadable
feed → `unknown`, **never** `down` — a broken status feed says nothing about the vendor.

### `quota` — declared **unavailable**, honestly

BambooHR publishes **no** way to read rate-limit headroom, so this is an `unavailable` entry with
no hook. What was looked for and what is actually there:

- **No rate-limit headers.** A search across the Technical Overview and every endpoint reference
  page fetched for this app found exactly one rate-limiting mention. There is no
  `X-RateLimit-Limit`/`-Remaining`/`-Reset` trio and no combined `RateLimit` header.
- **No quota or usage endpoint** among the 345 pages in `llms.txt`.
- **No published numeric limit** — throttling is discretionary ("if BambooHR deems them to be too
  frequent").

What *does* exist is after-the-fact only: a **503** with an optional **`Retry-After`** header. That
is an error-handling signal, not headroom. A check built on it could only report `ok` (not
currently throttled) or `down` (currently throttled) — which the derived credential check and
ordinary request failures already say, at the cost of an extra call per interval against an
undocumented budget.

`severity: "informational"` is load-bearing, not cosmetic: an `unavailable` entry reports a
permanent `unknown`, and at any higher severity that would pin the App's roll-up verdict there
forever.

### Credential check

Derived automatically from `Auth.test` (`GET /employees/0`). Nothing extra is declared.

---

## Error handling

BambooHR puts the human-readable reason in a **header**, not the body:

> Most 400-level errors and some 500-level errors will include a header `X-BambooHR-Error-Message`.

`BambooClient` surfaces it, which turns an opaque `406` into "Invalid field: notAField". (`406`
specifically means "the request contains references to non-existent fields" — usually a typo in
`fields` or a wrong address alias.)

Notable statuses: `401` key missing · `403` insufficient permission **or** the unknown-key lockout ·
`406` bad field reference · `409` duplicate (employee email, or a list value) · `429` account
employee limit reached · `503` throttled, retry with `Retry-After`.

---

## Icon

`assets/icon.png` — BambooHR's current mark at 227px — the previous PNG was 60px and showed the retired disc lockup.

Taken from <https://www.bamboohr.com/images/about/media-assets/bamboohr-logo-green.png> on 2026-08-15.

- **2,431 bytes**, `image/png`, 227 × 227, md5 `531bc04e9215e8c1ef96238e8a05be58`
- raster, because the vendor publishes no vector of this mark

BambooHR publishes no square icon and no vector: their site ships an empty `data:` favicon, and the only asset on their media page is the horizontal lockup. This is the symbol half of that lockup, cropped on its own bounding box — the pixels are the vendor's, untouched; only the wordmark beside them is gone.

---

## Development

```bash
deno task test    # 135 unit tests, mocked HookContext, no network
deno task check   # typecheck
deno task lint
deno task fmt
```

Pack auditor, from `packages/apps` (pass `--config` to work around a pre-existing `@w6w/types`
config-discovery gap):

```bash
deno run --no-check -A --config apps/bamboohr/deno.json _tools/audit.ts bamboohr
```

Current state: **135 tests pass · check clean · lint clean · audit 0 errors, 0 warnings.**

The tests explicitly pin the two things most likely to regress silently:

- **Gateway-path construction** — that the subdomain lands in the **host** and never as a path
  segment, that no `gateway.php` or fixed `api.` host appears, and that every resolved host stays
  inside the declared `*.bamboohr.com` allowlist.
- **`Accept: application/json` on every request** — asserted for *every action in the app*, since a
  missing header returns XML with a 200 rather than an error.

---

## Links

All verified by fetching and inspecting content on 2026-08-03.

- **Vendor site** — https://www.bamboohr.com
- **API documentation (used to build this app)** — https://documentation.bamboohr.com/docs
- **Getting Started (auth, OAuth, the curl sample)** —
  https://documentation.bamboohr.com/docs/getting-started
- **Technical Overview (base URL, status codes, throttling)** —
  https://documentation.bamboohr.com/docs/api-details
- **Reference example — Get Employee** — https://documentation.bamboohr.com/reference/get-employee
- **Docs page index (markdown; append `.md` to any page for raw source)** —
  https://documentation.bamboohr.com/llms.txt
- **Field name reference** — https://documentation.bamboohr.com/docs/list-of-field-names
- **Webhooks** — https://documentation.bamboohr.com/docs/webhooks
- **Developer portal (OAuth apps)** — https://developers.bamboohr.com/login
- **Status page** — https://status.bamboohr.com
- **Status RSS feed (used by the `service` check)** —
  https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss
- **GitHub org** — https://github.com/bamboohr

> **Dead link, for the record:** `https://www.bamboohr.com/api/documentation/` — the URL our
> candidate list cited — is **gone**. It returns **404** with a browser user-agent (and 403 to a
> plain fetch). The documentation now lives at `documentation.bamboohr.com`, which is where every
> quotation in this README comes from.
