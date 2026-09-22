# Credit Repair Cloud

Create, update, delete and read the Lead/Client and Affiliate records a Credit Repair Cloud
account runs on, over the vendor's own Web API.

- **Categories** — crm, finance
- **Auth methods** — credentials (`custom`: API key + secret key, both as query parameters)
- **Actions** — 8 (4 for Lead/Client records, 4 for Affiliate records)
- **Health checks** — 1 (`service`) + the derived `auth:credentials`
- **Egress allowlist** — `app.creditrepaircloud.com` (the `service` check adds
  `status.creditrepaircloud.com` to its own hook allowlist, never to the app's)
- **Website** — https://www.creditrepaircloud.com
- **API docs** — https://app.creditrepaircloud.com/webapi/apimethods
- **Status page** — https://status.creditrepaircloud.com

Credit Repair Cloud is a CRM for credit-repair businesses: leads and clients on one side, the
affiliates who refer them on the other, each with its own status vocabulary, fields and portal
access. Its Web API is deliberately small — **eight endpoints total**, insert/update/delete/view
for each of the two resources — and this app is exactly those eight, one action each.

> **Everything below was verified on 2026-09-22** against the vendor's own documentation pages
> (`app.creditrepaircloud.com/webapi/apimethods` and its siblings `overview`, `insertrecords`,
> `updaterecords`, `deleterecords`, `viewrecord`, `insertrecords_affiliate`,
> `updaterecords_affiliate`, `deleterecords_affiliate`, `viewrecord_affiliate`, `error-messages`,
> `examples` — plain server-rendered HTML, each confirmed live) plus real `curl -X POST` probes
> against the production host and `status.creditrepaircloud.com`. Nothing here came from a
> third-party integration directory, and nothing beyond those eight endpoints was invented.

## The five things most likely to cost you time

### 1. The docs contradict themselves about where the request parameters go — both ways work

Two of the vendor's own instructions disagree:

- the **sample URL** on every method page shows all three parameters (`apiauthkey`, `secretkey`,
  `xmlData`) as `?query=string` parameters;
- the **prose** says "Use the POST method... pass the xmlData as a POST parameter".

Measured live on 2026-09-22 with real POSTs against
`https://app.creditrepaircloud.com/api/lead/viewRecord` and its affiliate sibling, using an
obviously invalid key pair (`deadbeef` twice — no working credential was needed and none was used).
All four placements below answered **HTTP 200** with `<error_no>4406</error_no>` ("Wrong API Key or
Secret key") — the shape of "the parameters were read, the key is wrong":

| Placement | Answer |
|---|---|
| all three in the query string (the docs' sample URL) | 4406 |
| all three in the form-encoded body (the docs' prose) | 4406 |
| **credentials in the query string, `xmlData` in the body** (this app) | 4406 |
| the same split against `/api/affiliate/viewRecord` | 4406 |

And with `xmlData` in the body but **no** credentials at all, the answer changes to 4405
("Incorrect API key parameter or API key parameter value") — which is what pins the question down:
the backend accepts the three parameters from either place, interchangeably, in the classic PHP
`$_REQUEST` merge.

This app satisfies both, in the split that keeps credentials out of Actions:

| Parameter | Where it goes | Who puts it there |
|---|---|---|
| `apiauthkey` | URL query string | the Auth `sign` hook, and its `test` probe — nothing else |
| `secretkey` | URL query string | the same two hooks |
| `xmlData` | `application/x-www-form-urlencoded` POST body | the Action, via `lib/client.ts#formBody` |

No Action ever receives, reads or writes a credential — see `auth/credentials.ts`.

### 2. The response is XML, and the docs never show one

The documentation contains no response example at all. The error envelope was confirmed live by an
unauthenticated `curl -X POST .../api/lead/viewRecord`, verbatim:

```xml
<?xml version="1.0"?>
<response>
  <success>False</success>
  <result>
    <errors>
      <error_no>4406</error_no>
      <error_message>Wrong API Key or Secret key</error_message>
    </errors>
  </result>
</response>
```

`<success>` is the literal string `True` or `False`. Every endpoint answers **HTTP 200**, including
a wrong API key, so the status code carries no information whatsoever and the verdict is read from
the body. `lib/client.ts` hand-parses this flat XML with three small regex helpers (no XML library
is available as a runtime dependency), and a body that is not this envelope at all — an SPA page,
a proxy's HTML — is reported as unreadable rather than guessed at.

### 3. A successful response's shape could NOT be verified — so no action claims field names

Passing the credential check gets past the only thing a probe without an account can reach: **no
test account or credentials were available**, so what a real `viewRecord` returns for an existing
record — the element names inside `<result>` — has never been observed. No field name is invented
anywhere in this app.

Every action therefore returns the generic envelope:

```json
{
  "success": true,
  "errorCode": null,
  "errorMessage": null,
  "result": { "…": "every direct child of <result>, as a flat string map" },
  "raw": "<?xml version=\"1.0\"?><response>…"
}
```

`view-lead` and `view-affiliate` are read actions with no named output fields, and the other six
actions return the same shape. A workflow that needs a field off a returned record should read it
off `result` by the name the vendor's own system uses, and treat that name as unverified until it
has been seen once. This is the honest ceiling of what could be built from the available evidence,
and it is a bigger contract change than a guessed key would be to undo later.

### 4. The docs' own gaps, and how each was resolved

Two different situations, resolved two different ways (both recorded per-action in `actions/`):

| Situation | Resolution |
|---|---|
| A field appears in the page's example XML but **not** in that same page's Request Parameters table: `phone_work_ext`, `fax` (Lead Insert) and `fax` (Affiliate Insert) | **Left out.** The table is the normative list on those pages; the example is the older one. `tests/index.test.ts` asserts neither is declared, so they cannot drift back in by accident. |
| A field is **absent from the table but unambiguously required by the method and present in its example**: `id` on every Update/Delete/View method | **Required.** An update, delete or view that cannot name its record cannot work at all, and the vendor's own example XML carries the element. This completes a documented gap using the vendor's own evidence — it is not an invented field. |

The `id` value is not the plain integer the CRM shows: the vendor's own `viewRecord` example passes
`<id>MQ==</id>`, the base64 of the data-protection-encoded `"1"`. The hints on all six id-taking
params say so. `auth/credentials.ts` uses exactly that value for its probe.

### 5. `zip` on Affiliate Insert, `post_code` on Affiliate Update — the vendor's own inconsistency, preserved

The two pages document the **identical concept, for the identical resource, under two different
names** (verified 2026-09-22, not a transcription slip here):

- `insertrecords_affiliate`'s Request Parameters table: **`zip`**
- `updaterecords_affiliate`'s Request Parameters table: **`post_code`**

`insert-affiliate` sends `zip`; `update-affiliate` sends `post_code`. "Correcting" either one to
match the other would put a field name on the wire that *that* method's own documentation does not
have, which is a worse bet than following each page literally. `tests/index.test.ts` pins the
split so a future tidy-up has to make the decision deliberately. (The Lead/Client pages use
`post_code` on both insert and update — the inconsistency is affiliate-only.)

## Auth

### The two credentials

| Field | Parameter | Where to find it |
|---|---|---|
| API Key | `apiauthkey` | Credit Repair Cloud > Settings > API > API Key |
| Secret Key | `secretkey` | the same screen |

Both are required; a wrong API key and a wrong secret key both answer error 4406 "Wrong API Key or
Secret key", so a Connection missing one of the two looks exactly like a Connection with two bad
values. The connect form asks for both.

### Why `custom` rather than `apiKey`

The built-in `apiKey` auth type carries **one** field, **one** parameter-or-header name and one
optional prefix. This vendor needs **two separate query-string parameters**, so the method is
`type: "custom"` with two secret fields, and `sign` is what appends them. `sign` runs network-less
and touches nothing but `request.url` — the method, headers and `xmlData` body an action built come
back untouched. It is also the only code path that ever sees a credential: `lib/client.ts#signUrl`
is shared by `sign` and `test` so the probe cannot send a request the real calls do not.

### The credential probe

`test` calls `POST /api/lead/viewRecord` with the vendor's own documented example id
(`<crcloud><client><id>MQ==</id></client></crcloud>`, built by the same `buildXml` the actions use)
and classifies **strictly from the response body** — never from the HTTP status, which is 200 for
everything:

| `<error_no>` | Meaning | Verdict |
|---|---|---|
| 4405 | Incorrect API key parameter or API key parameter value | `ok: false` — credential refused |
| 4406 | Wrong API Key or Secret key | `ok: false` — credential refused |
| 4407 | API Key is inactive | `ok: false` — credential refused |
| 4411 | Incorrect Secret key parameter or Secret key parameter value | `ok: false` — credential refused |
| 4410 / 4413 / 4417 / 4404 / … | Wrong ID in update / Incorrect Client ID / Incorrect Affiliate ID / XML parsing error | `ok: true` — the keys were accepted; only the probe record was refused |
| `<success>True</success>` | the probe record happened to exist | `ok: true` |

The failure message is the vendor's own prose plus which of the two fields to look at. Neither key
is ever echoed into a message, and the signed URL — which carries both — is never included, not
even on the fetch-throws path. A connection label is deliberately **not** published either: the
only call the vendor offers that could identify the account is a record view, whose success shape
is unverified (see above), so there is nothing honest to put in a label.

## Errors

The vendor's complete error vocabulary, quoted in every failure message (`ERROR_MESSAGES` in
`lib/client.ts`):

| Code | Meaning |
|---|---|
| 4401 | Invalid parameter |
| 4402 | Mandatory field missing |
| 4403 | Email address Invalid |
| 4404 | XML parsing error |
| 4405 | Incorrect API key parameter or API key parameter value |
| 4406 | Wrong API Key or Secret key |
| 4407 | API Key is inactive |
| 4408 | Internal server error while processing this request |
| 4409 | Number of API calls exceeded |
| 4410 | Wrong ID in update |
| 4411 | Incorrect Secret key parameter or Secret key parameter value |
| 4412 | Custom error message |
| 4413 | Incorrect Client ID |
| 4416 | Referred by not found |
| 4417 | Incorrect Affiliate ID |

A response with `<success>False</success>` raises `CreditRepairCloudError` carrying the vendor's
code, its meaning and its message, e.g.:

```
Credit Repair Cloud rejected the request (error 4413 (Incorrect Client ID)): Incorrect Client ID
```

The four credential codes add a sentence pointing at the Connection, because "Wrong API Key or
Secret key" on its own sends people to inspect the request when the fix is on the credential.

## Actions

| Key | Method + path | Required | Notes |
|---|---|---|---|
| `insert-lead` | `POST /api/lead/insertRecord` | `type`, `firstname`, `lastname` | 25 further documented fields; `type` is one of `Client`, `Lead`, `Lead/Inactive`, `Inactive`, `Suspended` (custom statuses are accepted as free text) |
| `update-lead` | `POST /api/lead/updateRecord` | `id`, `type`, `firstname`, `lastname` | insert's fields **minus** `client_portal_access`, `client_userid`, `client_agreement`, `send_setup_password_info_via_email`, which the Update table drops |
| `delete-lead` | `POST /api/lead/deleteRecord` | `id` | body is `<crcloud><client><id>…</id></client></crcloud>` |
| `view-lead` | `POST /api/lead/viewRecord` | `id` | same document as delete |
| `insert-affiliate` | `POST /api/affiliate/insertRecord` | `type`, `firstname`, `lastname`, `email`, `phone` | `type` is one of `Active`, `Inactive`, `Pending`; sends the postal code as **`zip`** |
| `update-affiliate` | `POST /api/affiliate/updateRecord` | `id`, `type`, `firstname`, `lastname` | `email`/`phone` are optional here; sends the postal code as **`post_code`** |
| `delete-affiliate` | `POST /api/affiliate/deleteRecord` | `id` | body is `<crcloud><affiliate><id>…</id></affiliate></crcloud>` |
| `view-affiliate` | `POST /api/affiliate/viewRecord` | `id` | same document as delete |

Field keys are the vendor's own XML element names (`firstname`, `post_code`,
`send_setup_password_info_via_email`, …) rather than a camelCase translation, so what a workflow
author sees in the form is what goes on the wire. Every value is XML-escaped
(`lib/client.ts#escapeXml`); empty and unset values are omitted rather than sent as empty elements.

### Idempotency

| Action | `idempotent` | Why |
|---|---|---|
| `insert-lead`, `insert-affiliate` | `false` | the vendor accepts no idempotency key of any kind, so a retry after a lost response creates a second record |
| `update-lead`, `update-affiliate` | `true` | writing the same values to the same record twice leaves the same state; there is no version/ETag field to guard a concurrent write |
| `delete-lead`, `delete-affiliate` | `true` | the pack's convention for deletes, and a retry cannot delete the record twice. One wrinkle: a second delete of an already-deleted record is not a silent no-op on the wire — Credit Repair Cloud answers 4413 (lead) / 4417 (affiliate), which surfaces as a failed step even though the record is in the intended state |

### Portal access is one-way through this API

`client_portal_access` / `affiliate_portal_access` (and the `client_userid` /
`affiliate_userid` / setup-password-email fields that make the portal usable) exist on the **insert**
tables only. There is no way to turn portal access on, off or over through an update in this API —
that is a Credit Repair Cloud UI action, and the update actions do not pretend otherwise.

## Health checks

Three questions get confused with one another, so they are kept apart: is the *vendor* up, is
*this credential* live, and is there *quota* left.

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `health/service.ts` — `status.creditrepaircloud.com/api/v2/summary.json` |
| `auth:credentials` | credential | connection | signed | fatal | derived from the `credentials` auth method's `test` hook |

### Is the vendor up? — A real, actively-maintained status page

Checked three ways on 2026-09-22:

| Host | Result | Reading |
|---|---|---|
| `status.creditrepaircloud.com` | 200, `<title>CRC Status</title>`, page id `v53pwns8kml6`, `page.name` `"CRC"` | the real custom-domain Statuspage |
| `creditrepaircloud.statuspage.io` | 302 to `/inactive` | the default subdomain, abandoned in favour of the custom domain — not evidence of anything fake |
| `creditrepaircloud.instatus.com` | redirects to Instatus's own marketing homepage | a dead decoy |

`/api/v2/summary.json` answered `application/json` with **five named, vendor-specific components** —
`CreditRepairCloud`, `SecureClientAccess`, **`API`** (`"description":"Backend API Service"`),
`Billing API`, `Signup` — all `operational` at check time, with `created_at` in Dec 2025 and
`updated_at` through Sep 2026. That is an actively maintained page for this product: the signature
of an *unconfigured* Statuspage is a component literally named `"API (example)"` (see
`apps/hedy`'s README), and this page names nothing of the sort.

The check derives its verdict from the **`API` component's own status**, not the page-wide
`status.indicator` — the same distinction `apps/webinarjam` draws for WebinarJam's `API` component.
Four of the five components are end-user surfaces this app never touches (the CRM itself, client
portal access, billing, signup), and an incident on one of those must not report the developer API
degraded. The other four are still *reported*, in the report's `components` map and in the message,
because "the portal is down and the API is fine" is exactly what a reader needs to see without
opening the status page. If a future redesign drops the `API` component, the page-wide indicator is
used as a fallback and the message says so.

Severity stays at the `degraded` default, deliberately: Credit Repair Cloud is **SaaS-only** — there
is no self-hosted CRC — so every Connection this app can hold runs on exactly the infrastructure
this page describes, and an incident really is evidence about every tenant. That is the opposite of
a self-hosted product's status page, where the same green feed is weak evidence. `credential:
"none"` and the hook-scoped `network.allow: ["status.creditrepaircloud.com"]` are load-bearing:
a status host must never see an API key, which is why the status host is *not* in the app's
top-level allowlist.

### Is this credential live?

That is `auth/credentials`, derived automatically from the auth method's `test` hook — see Auth
above for the full classification table.

### Do we have quota left? — declared absence, no check

Error **4409** ("Number of API calls exceeded") proves a rate limit exists. It does not tell you
how much is left: Credit Repair Cloud publishes **no** endpoint and **no** response header that
reports remaining allowance, and the documentation gives no numeric limit. So there is no
`kind: "quota"` check here — inventing one would mean inventing both the endpoint and the figure.
The limit is instead surfaced where it is knowable: error 4409 is quoted verbatim, with its meaning,
whenever the vendor returns it.

### Pagination — declared absence

There is no pagination to declare, because there is nothing to paginate: this is a single-record
CRUD API. `viewRecord` takes one `id`, and the documentation contains **no list or search endpoint
of any kind** (not for leads, not for affiliates). No paging parameters, no cursor, no `limit`.

## Deliberately not covered

- **No list or search action** — none is documented. Adding one would mean guessing both a path and
  a response shape for an API that shows neither.
- **No webhook or subscription surface** — none is documented; Credit Repair Cloud publishes no
  push mechanism for these eight methods.
- **No account/tenant read** — there is no whoami in this API, so nothing feeds a Connection label.
- **No quota check** — declared absence, see above.
- **No named success fields** — the success-response shape is unverified; see finding 3.

## Icon

`assets/icon.svg` wraps the vendor's **own declared favicon** — the 522-byte, 16×16 PNG the app
itself links in its `<head>`:

```
<link rel="icon" type="image/png" href="https://app.creditrepaircloud.com/application/images/favicon.png"/>
```

It is the only real mark that exists for this vendor. There is no SVG mark anywhere
(`creditrepaircloud.com/favicon.svg`, `apple-touch-icon.png` and simple-icons all 404, and no n8n
`nodes-base` node exists for it), and no larger raster: `favicon.ico` is also a single 16×16 image.
Two paths that *look* like assets are traps — `app.creditrepaircloud.com/favicon.svg` and
`/apple-touch-icon.png` both answer HTTP 200 but with `content-type: text/html`: they are the SPA's
index.html fallback route, not images.

The payload is embedded **verbatim** as an `<image>` element with an `xlink:href="data:image/png;
base64,…"` href inside a `viewBox="0 0 100 100"` wrapper, exactly as `apps/practicebetter`,
`apps/cloudbeds` and `apps/heyreach` do. It is not re-encoded, and `tests/index.test.ts` decodes it
back to 522 bytes and asserts the PNG magic — so `deno fmt` (which rewrites `assets/icon.svg` when
run bare; **always use `deno task fmt`**) cannot silently corrupt it.

## Layout

```
index.ts               the AppDefinition manifest
lib/client.ts          endpoints, XML build/escape, response parser, the one HTTP client
auth/credentials.ts    the two-field `custom` method, sign + the classified probe
actions/               8 files, one per documented endpoint
health/service.ts      the Statuspage check, weighted on the `API` component
tests/                 one suite per action, plus index, client, auth and health
```

## Development

Run from this directory **inside the `api` container** (there is no local `deno`):

```
deno task validate   # the pack's conformance audit for this app
deno task check      # type-check index, actions, auth, health, lib, tests
deno task lint
deno task test
deno task fmt        # never bare `deno fmt` — it rewrites assets/icon.svg
```
