# Practice Better

Run a health and wellness practice on **Practice Better** (practicebetter.io): the client records a
practice is built on, the session calendar, the packages clients buy, invoices, the tags and
reminders that organize follow-up, and webhook subscriptions so a workflow reacts to Practice
Better's own events instead of polling for them.

- **Categories** — crm, calendar, finance
- **Auth methods** — client credentials (`custom`)
- **Actions** — 26
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:client-credentials`
- **Egress allowlist** — `api.practicebetter.io` (the token endpoint and every action) and
  `status.practicebetter.io` (the `service` check). The documentation host
  `api-docs.practicebetter.io` is **never** called at runtime and is deliberately absent.
- **Website** — https://practicebetter.io/
- **API docs** — https://api-docs.practicebetter.io/
- **Status page** — https://status.practicebetter.io/ (also reachable at
  https://practicebetter.statuspage.io/ — the same page id `lb02qlh5617c`)
- **Icon** — Practice Better's own mark, wrapping the vendor's real PNG logo
  (`api-docs.practicebetter.io/logo.png`) as a centered `<image>` inside a `100×100` wrapper, as
  [`assets/icon.svg`](assets/icon.svg); not redrawn, not approximated

> **Verified against Practice Better's own API document on 2026-09-22.** Every path, verb, query
> parameter, body field and enum in this app came out of the vendor's OpenAPI 3.0 document
> (`https://api-docs.practicebetter.io/swagger.json` — 200 OK, ~650 KB, `info.title` "Practice
> Better API Documentation", `info.version` "v1", 69 paths) and the vendor's own status page.
> Nothing here was inferred from a sibling app, a scraped third-party directory, or a guess. Where
> the document is silent, this README says so rather than filling the gap — see
> [Gaps and omissions](#gaps-and-omissions).

## Auth

One way in: **OAuth2 client credentials**, machine to machine.

`POST /oauth2/token` (`operationId: OAuth2_grant`) takes an
`application/x-www-form-urlencoded` body of schema `OAuthTokenRequest`, whose documented
properties are exactly **`client_id`** and **`client_secret`**, and answers
`OAuthTokenResponse` — exactly **`access_token`**, **`expires_in`** (int64) and
**`token_type`**. The method is declared `type: "custom"` rather than `"oauth2"` because the
document's only flow is `client_credentials`: there is no authorization URL, no redirect and no
user interaction, so it keeps working in scheduled and background runs.

Scopes are `read` and `write`: most GET operations declare `[read]`, every mutating operation
declares `[read, write]`. The token request carries no scope parameter, so nothing is negotiated at
connect time.

Practice Better's document does not publish an account-setup URL for the client id and secret, so
this README does not invent one.

### Three deliberate omissions, each because the document has nothing to fill

1. **No `grant_type`.** A client-credentials request normally sends `grant_type=client_credentials`,
   and the sibling `kajabi` and `ebay` apps do — because *their* vendors document it. This document
   does not: `grant_type` appears **zero times** in the 650 KB file, and `OAuthTokenRequest` lists
   only the two credentials. So exactly `client_id` and `client_secret` are sent, and
   `tests/auth/client-credentials.test.ts` asserts the form body is precisely those two fields.
2. **No refresh token, and no refresh grant.** `OAuthTokenResponse` has no `refresh_token`
   property and there is no refresh operation anywhere in the document, so `refresh` re-runs the
   same client-credentials exchange — the client id and secret are the durable authority and the
   token is the only thing with a lifetime. `expiresAt` is computed from the returned `expires_in`
   with a 60-second clock-skew haircut; the document publishes no default lifetime, so the fallback
   (one hour) applies only when `expires_in` is missing and is stated in a comment where it is used.
3. **No `revoke`.** The document declares no revoke endpoint, so there is nothing to call on
   disconnect; the token simply expires. A stub that pretended to revoke something would be a lie in
   a file other people read to understand the API.

### The probe is `GET /timezones`, and why that is safe

The probe is chosen by what its **body** contains, never by what the route is called.
`GET /timezones` (`operationId: TimeZone_List`) is the cheapest read in the covered surface: no path
parameters, no query parameters, no client data — its body is a static list of `{label, name,
tzName}` objects. A list of time-zone names cannot contain a credential, it needs only the `read`
scope every usable key carries, and it cannot report a working credential as broken the way a
client-records read could.

Classification is by status with the body as evidence, because the document declares **no error
schema on any operation**: `401` is reported as a wrong client id/secret, `403` as a credential
that authenticated but lacks the `read` scope, anything else with its status. A `200` whose body is
not the documented time-zone list is a **failure**, not a pass — something answered, but not with
the endpoint this app asked for.

## Actions (26)

Every action goes through `lib/client.ts`, which owns the base URL, the query/body serialization,
the error formatter and the pagination helper. One file per action, kebab-case, resource first.

| Resource | Actions |
| --- | --- |
| Client record | List, Get, Create, Update, Delete |
| Session | List, Get, Book, Cancel, Delete |
| Package | List (templates), List instances, Create instance |
| Invoice | List, Get |
| Tag | List, Create, Delete |
| Reminder | List |
| Webhook subscription | List, Create, Delete, List event types |
| Consultant / service / time zone | Get profile, List services, List time zones |

Two details worth reading before wiring these up:

- **`update-client-record` is a full replace.** The document's own words: *"ensure you make a
  request to GET the client record, update any desired fields, and push the entire (updated) client
  record back to this endpoint. Any missing fields in the post will be erased."* The action's
  description repeats it, and the recommended sequence is `get-client-record` → edit → PUT.
- **`create-session` with `serviceType: "virtual"`** also requires
  `telehealthSettings.launchApplication`; the parameter hint says so, because the API refuses the
  booking otherwise. Its `timeZone` field wants the vendor's own time-zone name, which is what
  `list-timezones` returns in each entry's `name`.

### Pagination is one shape, reused

Every list operation in this API declares the same four query parameters — `after_id`, `before_id`
(string cursors), `limit` (int32, documented **1–100**) and `skip` (int32) — and answers the same
envelope:

```json
{ "count": 128, "hasMore": true, "items": [] }
```

`pageParams`, `pageOutput`, `pageQuery` and `Page<T>` in [`lib/client.ts`](lib/client.ts) declare
that shape once, so the nine list actions cannot drift apart, and list actions return the envelope
**verbatim** rather than unwrapping `items` — `count` and `hasMore` are how a workflow decides
whether to keep paging. `GET /webhooks/subscription` is the one list whose *filters* are its own
(`eventType`, `isActive`, `status`) while its pagination inputs and response envelope are still the
shared ones.

Array-valued filters (`status`, `paymentstatus`, `type`, `consultants`, `records`, `services`,
`packages`, `eventTypes`) go out as **repeated query keys**. The document declares them as array
query parameters and specifies no `style`/`explode` override, so the OpenAPI 3 default (`style:
form, explode: true`) applies — see [Gaps and omissions](#gaps-and-omissions).

## Health checks

| App | Vendor status | Machine-readable? | Credential probe | Quota headroom | Declared checks |
|---|---|:-:|---|:-:|---|
| [practicebetter](README.md) | [Statuspage](https://status.practicebetter.io/api/v2/summary.json) — verdict from the `Practice Better API` component (id `hg7zsrq27t7g`), not the page roll-up; Web Portal, Telehealth, Faxing, Email/SMS delivery, Help Desk, Community and the 18-strong `Integrations` group are reported as detail | yes | `GET /timezones` — no path/query parameters, no client data, and a body that cannot contain a credential | no — the document contains no `ratelimit`/`retry-after`/`x-rate` text at all; declared `informational` | `service` · ~~quota~~ · 1 derived |

- **`service`** (`kind: "service"`, `scope: "app"`, `credential: "none"`) reads
  `status.practicebetter.io`'s `summary.json` and takes its verdict from the component literally
  named **`Practice Better API`** (pinned by id `hg7zsrq27t7g`, with an exact-name fallback for a
  page that re-creates the component). `Web Portal`, `Telehealth/Video Chat`, `Faxing`,
  `Email Delivery`, `Text/SMS Delivery`, `Help Desk`, `Community` and the `Integrations` group
  (Claim.MD, Cronometer, DrFirst, Evexia, Fitbit, Fullscript, Garmin, Google Calendar, Natural
  Dispensary, Nutritionix, Oura, Rupa Health, Square, Stripe, That Clean Life, WholeScripts, Zapier,
  Zoom) are real Practice Better components — but a telehealth incident or a Stripe outage is not
  evidence that `api.practicebetter.io` is failing, which is the only thing every Connection of
  this app runs on. They are reported as detail; only the API component changes the state. A
  degraded page roll-up is named in the message so an `ok` verdict does not hide it. A status API
  that itself fails reports `unknown`, never `down`. Severity is left at the `degraded` default —
  Practice Better is SaaS-only, so every Connection runs on the infrastructure this page describes.
- **`auth:client-credentials`** (derived, free) — the `test` hook above, projected into the health
  surface by the host. Nothing extra was written for it.
- **`quota`** (`kind: "quota"`, `severity: "informational"`, **declared unavailable**) — the whole
  OpenAPI document was searched for `ratelimit`, `rate-limit`, `retry-after` and `x-rate`: **zero
  hits**. No operation documents a rate-limit response header, and nothing reports remaining
  allowance or account usage. A `429` is declared, so throttling exists — it is simply not
  measurable in advance, and headroom can only be budgeted from observed refusals. Declaring the
  absence (`severity: "informational"`, so the resulting `unknown` never worsens the app's roll-up)
  is the honest statement; omitting the check would leave the app at `unknown` forever with no
  explanation.

## Gaps and omissions

Everything below is a place the document is silent. Each one is either worked around in a stated
way or left out, never guessed at.

- **No error body is documented anywhere.** Every operation's `400`/`401`/`403`/`404`/`409`/`429`/
  `500` response declares a `description` and no `content`/schema. The only error-shaped schema in
  the whole document is `ExternalApiError` (`externalErrorCode`, `message`, `source`, `statusCode`),
  which describes an error from a **third-party** system the practice's account integrates with
  (Claim.MD, Fullscript, …), not Practice Better's own refusal bodies. So
  `formatPracticeBetterError` parses defensively — JSON is attempted, a nested `error.message` is
  looked at, the raw text is the fallback, an empty body yields nothing — and never assumes an
  envelope. Classification is by status, with the body as evidence.
- **`grant_type` is absent from the document** (zero occurrences), so it is absent from the token
  request. See [Auth](#auth).
- **No refresh token and no revoke endpoint**, so `refresh` re-mints from the same credentials and
  there is no `revoke` hook. See [Auth](#auth).
- **No rate-limit surface of any kind**, so quota is declared unavailable rather than read. See
  [Health checks](#health-checks).
- **Enum names are not published.** `ClientRecordStatus`, `PackageInstanceStatus`,
  `InvoicePaymentStatus` and `ReminderType` are `{name, value}` pairs in the schema, but the names
  themselves are not enumerated, and the equivalent filters on sessions, services and webhooks are
  plain strings. So those filters are free text (a comma-typed `multiselect`), sent as repeated
  query keys, rather than a dropdown this app would have had to invent.
- **Nested vendor sub-objects are passed through as free-form JSON** — `Money`, `OfficeLocation`,
  `ClientRecordProfile`, `telehealthSettings`, `notificationOptions`, `buffer`, `metadata` and the
  `services`/`courses` arrays on a package instance. Their field lists exist in the document, but
  mirroring them is not what this app is for, and a partial mirror is how a caller loses a field
  the API would have accepted. `get-invoice`'s five amount fields are declared as `object` for the
  same reason — they are `Money`, not numbers. The one profile contract that *is* load-bearing
  (`emailAddress`/`firstName`/`lastName` required inside a create's `profile`) is stated in the
  parameter hint.
- **Array query parameters are sent as repeated keys** because the document declares no
  `style`/`explode`; OpenAPI 3's default is `form`/`true`, which is what this app implements. This
  is a reading of the specification, not a statement the vendor makes itself.
- **`limit` has no documented default**, so none is prefilled — only its 1–100 range is enforced.
  A page size this app invented would be this app's number, not the API's.
- **`GET /consultant/profile` and `GET /consultant/records/{recordId}` document a non-standard
  status, `461 Resource Access Denied`.** It is not special-cased: any non-2xx is a failure the
  normal way and the status appears in the thrown message. It is commented in both action files so
  a run log showing `HTTP 461` is recognised rather than treated as a mystery.
- **Webhook mutations are scoped under `read`, not `read, write`.** That is the document's own text
  for both `POST /webhooks/subscription` and `DELETE /webhooks/subscription/{id}`, unlike every
  other write in this API. It is implemented as written rather than "corrected", because widening a
  scope on the vendor's behalf is not this app's call.
- **`DELETE /webhooks/subscription/{id}` answers `204 No Content`.** The action handles that
  explicitly — the client's `status()` helper, not a JSON parse — and reports
  `{status, deleted: status === 204}`.
- **`GET /consultant/payments/invoices/{invoiceId}` declares an optional `alt` string parameter
  with no explanation.** It is passed through verbatim and noted in the parameter hint rather than
  guessed at.
- **Scope: 26 of the document's 69 paths.** The set above is the practice-management loop this app
  was specified to cover, and every one of them was checked field-by-field against the document
  before implementation. The remaining paths are not enumerated here because this build did not
  inventory them, and guessing at what they do would be exactly the inference this pack forbids.
  Named example: this app **reads** invoices; the document exposes payments, refunds and write-offs
  under the same `/consultant/payments` prefix, and none of them is in scope.

## Testing

Unit tests mock `HookContext` (`ctx.fetch`, no-op `ctx.log`) through
[`tests/_helpers.ts`](tests/_helpers.ts): no network access, no credential, no rate limit.
`tests/` mirrors `actions/`, `auth/`, `health/` and `lib/`, one file per action, each asserting the
method, the exact path, the query/body that went on the wire and the response passthrough, plus the
error paths (a `409` conflict, a `461`-style non-2xx, a `204` no-content delete, a bodyless
`202`). `tests/index.test.ts` guards the structural contract — 26 unique kebab-case keys, which
actions are non-idempotent, that every list action declares the four shared pagination controls and
the shared envelope, that the status check is pinned to component id `hg7zsrq27t7g`, that the quota
check is an `informational` absence, that the allowlist names exactly the two hosts the app calls,
and that no action reaches the network outside `ctx.fetch` or touches a credential.

```bash
deno task check     # type-check index.ts, actions/, auth/, health/, lib/, tests/
deno task lint
deno task fmt
deno task test      # 167 tests, no network
deno task validate  # the pack's conformance auditor
```
