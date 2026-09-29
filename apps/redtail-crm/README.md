# Redtail CRM

Manage contacts, addresses, notes, scheduled activities and sales opportunities in Redtail — a CRM
built for financial advisors — over Redtail's public REST API.

- **Categories** — crm
- **Auth methods** — database-credentials (custom: API Key + Username + Password, exchanged for a `user_key`)
- **Actions** — 25
- **Egress allowlist** — `crm.redtailtechnology.com`
- **Website** — https://www.redtailtechnology.com
- **API docs** — https://documenter.getpostman.com/view/7873823/SVzxXyzn ("TWAPI Documentation")

## The fixed-host finding — this app was previously ruled infeasible, wrongly

An earlier pass at this integration was excluded as "architecturally infeasible": its cited docs
link was dead, and the API it found lived on a per-customer-pod subdomain
(`smf.crm3.redtailtechnology.com`), which fails this pack's fixed-hostname gate.

That verdict does not hold. Redtail's real, current public API — the one documented in its own
Postman collection, "TWAPI Documentation" — lives at a single **fixed** host:

```
https://crm.redtailtechnology.com/api/public/v1
```

Verified independently, twice (once building this app, once re-verifying it from scratch):

1. **The Postman collection is real and fetchable.** `documenter.getpostman.com/view/7873823/SVzxXyzn`
   renders a documentation page whose own frontend calls
   `documenter.gw.postman.com/api/collections/7873823/SVzxXyzn?segregateAuth=true&versionTag=latest`
   — a public JSON API needing no auth, returning a 2.4 MB collection (`info.name: "TWAPI
   Documentation"`, `info._postman_id: ba377b1d-0367-4014-9d1d-e7636df317a8`) with **261 requests**
   across 17 top-level folders (Contacts, Addresses, Notes, Activities, Opportunities, Workflows,
   Lists, Seminars, Accounts, Admin, Integrations, and more).
2. **A live, unauthenticated probe confirms the fixed host is real and matches the docs exactly.**
   `GET https://crm.redtailtechnology.com/api/public/v1/contacts` answers
   `401 {"message":"Authorization header missing"}` over `nginx` — the identical envelope shape the
   collection's own captured examples show.
3. **The per-pod host that blocked the earlier attempt is a *different*, legacy system.** A live probe
   of `api2.redtailtechnology.com/crm/v1/` — the third-party-documented alternative — answers a
   `302` from `Microsoft-IIS/ASP.NET` to an error page, not JSON. It is not the API this collection
   documents, and this app never calls it.
4. **The two-step auth scheme is not inferred — it's captured verbatim in the collection.** The
   "Contacts GET" request's saved example carries a literal
   `Authorization: UserKeyAuth MTg1NUI5RTMtQ0Q4OC00MDJFLTkwOUItMTMwRjJBQzE3NEZDOjJGMURCODJCLTk1NjItNENFMi1CODhCLTAyMDM1Qzk1NDkwRg==`
   header. Decoded, that's `1855B9E3-CD88-402E-909B-130F2AC174FC:2F1DB82B-9562-4CE2-B88B-02035C95490F`
   — and the second half is exactly the `user_key` the collection's own `/authentication` example
   response returns for the same demo database (`redtail_database_id: 280717`).

This is the kind of thing that would cost someone a day: the correct base URL differs from the one
most third-party write-ups and a naive first pass land on, and the two-step auth exchange is easy to
miss if you only skim the collection's per-folder auth inheritance instead of a captured example.

## Auth is a two-step exchange, not a single header

`GET /authentication` takes `Authorization: Basic base64(APIKey:Username:Password)` — a **3-part**
Basic credential — and returns `{redtail_database_id, redtail_user_id, user_key}`. Every *other*
endpoint is signed with a different scheme built from that response:
`Authorization: UserKeyAuth base64(APIKey:UserKey)`. See `auth/database-credentials.ts` for the
`exchange`/`sign`/`refresh` split this requires (there is no documented refresh or revoke endpoint,
so `refresh` just re-runs the `/authentication` exchange with the stored credential).

The API Key is issued **per Redtail Technology partner account** (contact Redtail to obtain one);
Username/Password authenticate a specific Redtail CRM user within that database, and every
subsequent call acts as that user with that user's own permissions — a `403
{"message":"User Forbidden from Updating ..."}` is a documented, live-captured response shape for a
field a caller's Redtail role can't touch.

## Actions

| Key | Type | Calls |
|---|---|---|
| `contact-list` | search | `GET /contacts` |
| `contact-get` | read | `GET /contacts/{id}` |
| `contact-search` | search | `GET /contacts/search` |
| `contact-create` | perform | `POST /contacts` |
| `contact-update` | perform | `PUT /contacts/{id}` |
| `contact-delete` | perform | `DELETE /contacts/{id}` |
| `contact-address-list` | read | `GET /contacts/{id}/addresses` |
| `contact-address-create` | perform | `POST /contacts/{id}/addresses` |
| `contact-address-update` | perform | `PUT /contacts/{id}/addresses/{id}` |
| `contact-address-delete` | perform | `DELETE /contacts/{id}/addresses/{id}` |
| `note-list` | read | `GET /contacts/{id}/notes` |
| `note-create` | perform | `POST /contacts/{id}/notes` |
| `note-delete` | perform | `DELETE /contacts/{id}/notes/{id}` |
| `activity-list` | search | `GET /activities` |
| `activity-get` | read | `GET /activities/{id}` |
| `activity-create` | perform | `POST /activities` |
| `activity-update` | perform | `PUT /activities/{id}` |
| `activity-delete` | perform | `DELETE /activities/{id}` |
| `opportunity-list` | search | `GET /opportunities` |
| `opportunity-get` | read | `GET /opportunities/{id}` |
| `opportunity-create` | perform | `POST /opportunities` |
| `opportunity-update` | perform | `PUT /opportunities/{id}` |
| `opportunity-delete` | perform | `DELETE /opportunities/{id}` |
| `database-user-list` | read | `GET /lists/database_users` |
| `opportunity-stage-list` | read | `GET /lists/opportunity_stages` |

Notes worth knowing before wiring a workflow:

- **`contact-list`/`contact-get` support `pagesize` and `include` as request *headers*, not query
  params** — exactly as the collection documents for the `/contacts` family only. `pagesize`
  overrides the default page size of 50; `include` is a comma-separated list of dependent records
  (`addresses,phones,emails,urls,family,tag_memberships,important_information,social_medias,photos,activities,sam`)
  to attach to each contact. Neither is documented for any other list endpoint (opportunities,
  activities, notes), so only the contact actions expose them.
- **`contact-search`'s parameters are exactly what the docs' own description names** as "Currently
  supported search parameters": name, first_name, last_name, type, status_id, category_id, tax_id,
  account_number, phone_number, email, updated_since. Nothing beyond that list is guessed.
- **Create/update actions send only the fields you provide.** Every write body is built with
  `compact()` (`lib/client.ts`), which drops `undefined` keys — a PUT never nulls out a field you
  didn't touch.
- **`activity-create`/`opportunity-create` link a contact via `linked_contacts: [{ contact_id }]`**,
  the field name and shape the collection's own create examples use (one example even links by
  `email` instead of `contact_id` — this app only exposes the `contact_id` form).
- **Most writes answer `204 No Content` on success** — the collection's captured examples show this
  for address/opportunity updates and every delete. Contact and note creates/updates are the
  exception: they return the full created/updated object (`{contact: {...}}`, `{note: {...}}`,
  `{activity: {...}}`), which the corresponding actions return directly.
- **Pagination is page-based** (`?page=N`, 1-indexed). Every list response's body carries
  `meta: {total_records, total_pages}` — there is no `Link`/`X-Total` header.

## What is deliberately left out

The collection documents far more than this app covers — Seminars, Accounts (assets, beneficiaries,
insureds, owners), Admin/Teams, Workflows (steps and tasks), Tag Groups, Families, Reminders, UDFs,
and a `Schwab`/`Pulse360` integrations folder that calls a *different* vendor's sandbox host
entirely. None of that is included:

- **Everything outside the core Contact → Address/Note/Activity/Opportunity surface** this app's
  `package.json` describes. Adding it would mean guessing at which of ~20 more resource families are
  worth an action, rather than confirming a bounded, well-tested core surface.
- **The `Schwab` folder under Integrations** calls `sandbox.schwabapi.com`, not
  `crm.redtailtechnology.com` — a different vendor's API surfaced inside the same collection for a
  different integration entirely. Out of scope for this app by definition.
- **Single Sign-On** (`GET /authentication/sso`) — a browser-redirect flow, not something a
  `read`/`search`/`perform` Action can wrap.
- **Webhooks** — the collection's own "Webhooks" folder has one placeholder request with no
  documented payload shape; nothing here to build a Trigger from yet.

## Health check

Per [`HEALTHCHECKS.md`](../../HEALTHCHECKS.md), three separate questions:

### Is the vendor up?

**Yes, and it is real.** `status.redtailtechnology.com` is a genuine, claimed Atlassian Statuspage
instance, verified live 2026-09-29: `GET /api/v2/summary.json` answers `200 application/json` with
`page.name: "Redtail Technology"`, and one of its components is named exactly **"Redtail API
(REST)"** — precisely the surface this app calls, distinct from sibling components "Redtail CRM"
(the web app), "Redtail Imaging", "Redtail Email", "Retriever Cloud" and "Retriever for Tailwag".
`health/service.ts` reads the page-level roll-up for the overall verdict and surfaces the API
component by name in the message when it isn't operational.

### Is this credential live?

The Auth `test` hook, projected automatically into the health surface as `auth:database-credentials`:

```
GET /contacts?page=1
```

Chosen because it needs a live `user_key` to succeed and never echoes any credential material back
— the response is a page of contact records, not a whoami/apikey dump. A `401` is reported as a
distinct, actionable message ("the user_key may have been revoked — reconnect the account"); any
other failure status is surfaced without inventing a diagnosis the vendor didn't document.

### Do we have quota left?

Not knowable. The full 2.4 MB collection was checked for "rate limit", "throttle" and
"X-RateLimit" text across all 261 endpoints — zero hits — and a live unauthenticated probe against
`GET /contacts` on 2026-09-15 carried no rate-limit header of any kind. See `health/quota.ts`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` — `status.redtailtechnology.com` |
| `quota` | quota | — | — | informational | — | _declared absent_ |
| `auth:database-credentials` | credential | connection | signed | fatal | — | derived from the `database-credentials` auth method's `test` hook |

`quota` is `informational` deliberately: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity, saying "this vendor publishes
nothing readable" would pin the app's verdict at `unknown` permanently.

`service`'s `network.allow` widens egress for that one hook only, to `status.redtailtechnology.com`
— never `crm.redtailtechnology.com`, the app's signed surface — which the spec permits precisely
because the posture is unsigned (`credential: "none"`).

## Auth

One method, `database-credentials`, typed `custom` — API Key, Username and Password collected at
connect time, exchanged once via `GET /authentication` (3-part Basic auth) for a `user_key`. `sign`
is the only hook handed the raw credential; it stamps
`Authorization: UserKeyAuth base64(APIKey:UserKey)` and runs network-less. There is no documented
refresh or revoke endpoint — `refresh` re-runs the same exchange; there is no `revoke` hook at all.
See `auth/database-credentials.ts`'s own doc comment for the full reasoning.

## Icon

`assets/icon.svg` (already present from earlier work on this app) wraps a 32×32 PNG of Redtail's
own mark. `deno task validate`'s icon-legibility audit passes against both the light and dark pack
tiles.

## Development

```bash
deno task validate   # pack conformance audit (manifest, sandbox rules, icon legibility, test coverage)
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt`
deno task test         # 83 unit tests
```

Tests call every hook directly with a mocked `HookContext` (`tests/_helpers.ts`: a queued fake
`ctx.fetch`, a recording no-op `ctx.log`). An unqueued fetch throws, so a test that makes an
unexpected request fails rather than hanging. `UNAUTHORIZED_401`, `FORBIDDEN_403` and
`NO_CONTENT_204` in that file are the live/collection-measured responses reused everywhere those
failure and success modes are asserted.
