# TeamUp

Run a gym, studio or fitness business on **TeamUp** (goteamup.com): customers and their families,
the class schedule, attendance and waiting lists, memberships and the plans they are sold from,
invoices, front-desk check-ins, and the business's own vocabulary — instructors, venues and their
rooms, staff, courses and their sessions, providers and offering types.

- **Categories** — crm, calendar, commerce
- **Auth methods** — M2M token (`bearer`)
- **Actions** — 29
- **Health checks** — 2 (`host`, `quota`) + the derived `auth:token`
- **Egress allowlist** — `goteamup.com` (the only host any action or check reaches; the vendor's
  documentation and status hosts are never called)
- **Website** — https://goteamup.com/
- **API docs** — https://docs.goteamup.com/api-reference/
- **Status page** — https://status.goteamup.com/ (**abandoned — deliberately not wired**, see
  [Health checks](#health-checks))
- **Icon** — TeamUp's own webclip mark, copied verbatim from the vendor's CDN
  (`cdn.prod.website-files.com/.../TeamUp_Webclip.svg`) as [`assets/icon.svg`](assets/icon.svg);
  not redrawn, not approximated

> **Verified against TeamUp's own sources on 2026-09-22.** The base URL, the auth header, every
> path, parameter list and response field in this app came out of the per-operation OpenAPI JSON
> embedded in TeamUp's API reference pages (a client-rendered Docusaurus site: a plain `fetch` of
> an endpoint page returns skeleton placeholders, but each page ships its own operation spec as a
> base64+zlib blob inside a lazy-loaded JS chunk). The prose pages that *do* render statically —
> `/api-reference/authentication`, `/errors`, `/pagination`, `/introduction` — were read for the
> auth model, the error envelope and the pagination contract. Nothing here was inferred from a
> sibling app, a scraped third-party directory, or a guess. This app is **TeamUp / goteamup.com**,
> the fitness scheduling and member-management platform — *not* the unrelated "Teamup Calendar"
> product at calendar.teamup.com, which is a different company and is never called.

## Auth

TeamUp documents three ways in; exactly one is usable by a headless, credential-based workflow,
and that is the one this app implements:

1. **OAuth 2.0 (`authorization_code`)** — needs an interactive consent screen and a registered
   application. **Not implemented**: no workflow can complete that flow.
2. **Direct Authentication** (password login) — switched on by TeamUp only after a manual review
   of the integrator's use case. **Not implemented**: not generally available.
3. **M2M token** — a long-lived opaque key a business creates by hand in its own TeamUp dashboard
   (Settings → the developer/API area). It is tied to the **business**, not to a user, and TeamUp
   expressly does not offer `client_credentials` or static API keys: the M2M token *is* the
   server-to-server API key. **This is what this app uses.**

The field is a single secret, `token`, and its hint links TeamUp's own guide,
<https://docs.goteamup.com/guides/creating-an-m2m-token>.

### The header is `Bearer`, and that is a deliberate reading of two contradictory sources

`Authorization: Bearer <M2M_TOKEN>`. The hand-written Authentication guide states that header
verbatim, for OAuth access tokens *and* M2M tokens, and it is the page written specifically to
disambiguate this — it has a "Troubleshooting: Wrong Token" section for exactly this confusion.

The auto-generated `securitySchemes` metadata embedded per reference page disagrees with itself:
one scheme is labelled "Token Authentication" with a `Token ` prefix, another "JWT Authentication"
with a `JWT ` prefix, and neither is literally `Bearer`. Two more facts settled it: the guide is
hand-written and current while the metadata is generated, and an M2M token is documented as an
"opaque key (no dots)" — the `JWT ` prefix belongs to a credential shape this app does not use.
`auth/token.ts` documents the same reasoning at the point where it matters.

Two headers this app deliberately does **not** send:

- **`TeamUp-Request-Mode`** — an M2M token always operates in **Provider mode** under admin
  permissions, so the header would be redundant.
- **`TeamUp-Provider-ID`** — sent only when an action is given a `providerId`. Every action
  exposes that optional param, and `providers-list` is how the valid ids are discovered.

### The probe is `GET /auth/profiles`, classified from its body

The liveness probe needs nothing but the token, and its shape — the plain pagination envelope
`{count, next, previous, results}` — never contains a token, key or secret, so its result is safe
to keep in the health surface.

Validity is read from the **body**, never from the status code alone:

- a `results` array (even empty) means the token is live;
- a `401` is *explained* by TeamUp's documented error envelope — `code: "authentication_failed"`
  is the invalid-or-expired case, and its `message` becomes the failure text;
- anything else is a failure that quotes the status and the truncated body, so an edge proxy's
  HTML error page is never mistaken for a credential problem.

`afterConnect` reads `GET /providers?page_size=1` — one record, a read the token already has to be
able to make — to label the Connection with the business's name (`TeamUp ({{providerName}})`,
falling back to plain "TeamUp" if that read fails, which is never fatal).

## Actions (29)

Every action goes through `lib/client.ts`, which owns the base URL, the provider header, the
error formatter and the pagination passthrough. One file per action, kebab-case, resource first.

| Resource | Actions |
| --- | --- |
| Customer | List, Get, Create |
| Event (the class schedule) | List, Get, Create, Register, Unregister, Join waitlist, Leave waitlist |
| Attendance | List, Get |
| Membership (the sellable plan) | List, Get |
| Customer membership (a customer's instance) | List, Get, Create |
| Instructor | List, Get |
| Venue | List, Get |
| Invoice | List, Get |
| Check-in | Create |
| Staff | List |
| Course | List |
| Course session | List |
| Provider | List |
| Offering type | List |

Every action declares the four controls TeamUp documents on nearly every operation — `expand`,
`fields`, `format` and `providerId` (the last one sent as the `TeamUp-Provider-ID` header) — and
every list action declares `page` (default 1) and `page_size` (default and maximum 100).

### Pagination is returned verbatim

Every list answers `{count, next, previous, results}`. List actions return that envelope
**unchanged** rather than unwrapping `results`, because `count` is how a workflow decides whether
another page exists. `Page<T>` in `lib/outputs.ts` is the type, and `tests/index.test.ts` asserts
the defaults are the documented ones on every list action.

## Health checks

Three questions, three answers — and one deliberate absence.

- **`host`** (`kind: "dependency"`, `scope: "app"`, `credential: "none"`,
  `severity: "informational"`) — probes the documented API on `goteamup.com` with **no
  credential**. A `401`/`403` is a *pass*: it proves the host resolves, TLS terminates and the
  documented API answers behind its credential gate. Whether the token is any good is the derived
  `auth:token` check's question, and conflating the two is how "the token was revoked" gets
  reported as "TeamUp is down". A transport failure or a 5xx is `down`, a `404` is `degraded`
  (something answered, but not the documented path). Severity is `informational` because a
  reachability signal is evidence, not a verdict on any one workflow.
- **`auth:token`** (derived, free) — the `test` hook above, projected into the health surface by
  the host. Nothing extra was written for it.
- **`quota`** (`kind: "quota"`, `severity: "informational"`, **declared unavailable**) — TeamUp
  documents a `429` response but publishes no rate-limit header (`X-RateLimit-*`, `RateLimit-*`,
  `Retry-After`) and no endpoint reporting remaining allowance, so headroom cannot be read — only
  budgeted from observed refusals. The client's error formatter says so on a `429` and recommends
  exponential backoff. Declaring the absence keeps the app off a permanent `unknown`, which is
  what omitting the check would cause.

### Why there is no `service` check

`https://status.goteamup.com/` is a **real** Atlassian Statuspage — `page.name` is literally
"TeamUp" — and it is **not wired here, on purpose**. Two independently verified red flags
(2026-09-22):

1. Its TLS certificate (`CN=status.goteamup.com`, genuinely issued by Let's Encrypt for this
   domain) **expired 2026-06-06** and was never renewed — nobody is maintaining this page.
2. Its components are literally named **`API (example)`** and **`Management Portal (example)`** —
   the unedited default template Atlassian ships for a brand-new Statuspage, never renamed to
   real product names.

A page with an expired certificate and template component names was set up once and abandoned. A
check reading it would report on Atlassian's boilerplate rather than on TeamUp, so the absence is
declared — in this README, in the `host` check's own description, and as `~~service~~` in the
pack's [`HEALTHCHECKS.md`](../../HEALTHCHECKS.md) index — instead of being probed. Severity on the
one check that does speak for the API is `informational` for the same reason the pack's other
reachability checks are: an app-side signal must never report `down` from evidence that might not
cover the specific operations a given workflow uses.

## What was deliberately left out, and why

TeamUp's reference documents roughly **650 operations**. This app ships **29** of them: the ones a
gym workflow runs on end to end — find a customer, put a class on the schedule, register someone
for it, manage the waiting list, read back who attended, sell and read memberships, see what was
billed, check someone in at the door, and resolve the ids all of that points at (instructors,
venues, staff, courses, providers, offering types).

**This is scope, not uncertainty.** Every one of the 29 shipped actions, and only those, was
checked field-by-field against the extracted operation data before implementation. The rest of the
reference — the customer/event/staff/membership administration surface beyond these, reporting and
retail, and the vendor's appointment and communication APIs — was left for a follow-up build
rather than partially guessed at.

Two operations are worth naming specifically, because they exist in TeamUp's reference and are
**not** in this app:

- **`customers-update`** and **`customers-partial-update`** — TeamUp documents both operations
  *without a request-body schema*. There is no field list to implement against, so exporting
  field names for them would mean inventing them. They are omitted rather than approximated, and
  the practical consequence is worth knowing: a customer created by `customers-create` cannot be
  edited from a workflow (TeamUp's create body takes no `email`, so contact details are set in
  TeamUp's own UI).

## Notable API facts the client encodes (see the file-level comments for the detail)

- **One host, one prefix**: `https://goteamup.com/api/v2` for every covered operation.
- **One error envelope**: `{"code", "field_errors", "message", "type"}`, where `type` is
  `invalid_request_error`, `conflict` or `event_check_failure`. `formatTeamUpError` surfaces the
  vendor's `message` plus its `code`/`type`, falls back to `field_errors` when there is no
  message, and keeps a non-envelope body verbatim. `403` codes (`permission_denied`,
  `mode_not_allowed`, `provider_invalid`, …) are reported as themselves rather than special-cased;
  `429` is reported with the backoff recommendation.
- **Offset pagination, uniformly**: `page` (1-based) and `page_size` (default and maximum 100).
- **Money is a string.** TeamUp's error envelope is Django REST Framework's, and DRF serializes
  decimals as strings — so `price`, `billed_price` and `total_amount_due` are declared as strings
  rather than as numbers that may not survive the round trip.
- **`late` is a string, not a boolean.** `events-unregister` answers
  `{"late": <string>, "attendance": <int>}`; the action returns the body untouched rather than
  normalising a field whose vocabulary the reference does not publish.
- **A waitlist spot has a lifecycle.** `events-join-waitlist` returns a spot whose `status`
  moves through `on_waitlist` → `spot_reserved` (with `reserved_spot_expires_at`) →
  `expired`/`rejected`, so a notifier should watch the status rather than the join.
- **A check-in is not an attendance.** `checkins-create` records a front-desk visit and is
  independent of class registration; registering for an event is an attendance
  (`attendances-list`, whose statuses include `no_show` and `late_cancelled`).
- **A membership is a plan; a customer membership is a purchase.** Two separate resources with two
  separate lists — and `customer-memberships-create` is the sale, so it is not idempotent.
- **Two body fields are documented as arrays without an element schema** — a customer's
  `field_values` and an event's `registration_timelines`. Both are exposed as JSON and passed
  through exactly as given rather than reshaping a vendor shape that is not published.
- **`instructors` on `events-create` is a real JSON array of ids**, collected as a comma-separated
  field and converted (`intList` in `lib/client.ts`): a string where TeamUp expects an array is a
  `parameter_invalid` refusal, not a silent no-op.
- **The status page is abandoned** — see [Health checks](#health-checks).

## Testing

Unit tests mock `HookContext` (`ctx.fetch`, no-op `ctx.log`) via [`tests/_helpers.ts`](tests/_helpers.ts):
no network access, no credential, no rate limit. `tests/` mirrors `actions/`, `auth/`, `health/`
and `lib/`, one file per action, each asserting the method, the exact path, the query/body that
went on the wire and the response passthrough. `tests/index.test.ts` additionally guards the
structural contract — action count and key shape, which actions are non-idempotent, that every
action exposes the four shared controls, that no action reaches the network outside `ctx.fetch`,
and that no action touches a credential or names a host at all.

```bash
deno task check   # type-check index.ts, actions/, auth/, health/, lib/, tests/
deno task lint
deno task fmt
deno task test    # 134 tests, no network
deno task validate  # the pack's conformance auditor
```
