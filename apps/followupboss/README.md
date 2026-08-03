# Follow Up Boss

Follow Up Boss real-estate CRM contacts, lead events, notes, calls, tasks, appointments, deals,
action plans and account metadata, on the **Follow Up Boss API v1**.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 26
- **Egress allowlist** — `api.followupboss.com`
- **Health checks** — `service` (live), `quota` (live)

## Links

| What | Where |
| ---- | ----- |
| **Website** | <https://www.followupboss.com/> |
| **API docs** | <https://docs.followupboss.com/> |
| **Source / git repo** | <https://github.com/followupboss> — see the note below |
| Status page | <https://followupboss.statuspage.io/> |
| System registration | <https://apps.followupboss.com/system-registration> |

> **On the source repo.** Follow Up Boss publishes **no** open-source SDK, client library or
> product repository. `github.com/followupboss` is the organisation account and carries no public
> client for this API; the API surface is documented only, at docs.followupboss.com. The
> organisation link is given because the brief asks for one, *not* because it contains an SDK this
> app mirrors — everything here is written against the published HTTP documentation, verified page
> by page.
>
> **On the docs link.** The candidate entry for this app cited
> `https://api.followupboss.com/api-documentation/`. That URL is **stale**: it answers
> `301 Moved Permanently` to `https://docs.followupboss.com/` (verified on the wire, 2026-08-03).
> The canonical docs host is `docs.followupboss.com`, and it publishes a machine-readable index at
> [`/llms.txt`](https://docs.followupboss.com/llms.txt).
>
> **On the website link.** The candidate entry cited `http://www.followupboss.com/`. That
> redirects to `https://www.followupboss.com/` (200), so the `https://` form above is canonical.

Follow Up Boss is a CRM built for real-estate teams, and the shape of the API follows from that: a
*person* is a buyer or seller lead, a *deal* carries earnest-money and possession dates as
first-class fields, and the whole product is organised around getting a new lead in front of the
right agent within minutes. That last point is not a marketing claim — it is the single most
important thing to understand before writing against this API, and it is why the first section
below exists.

## The three things most likely to go wrong

### 1. `POST /people` is not how you send in a lead

**Use Create Event.** The `POST /people` documentation opens with a red warning, and it is not a
style note — it describes silently losing most of the product:

> "Do not use `POST /v1/people` to send leads into Follow Up Boss. This will only create the person
> and **will not** run any automations."

The `POST /events` page states the counterpart: it is "the **only** correct option to send leads and
their activity to Follow Up Boss from an IDX website, real estate portal, your custom website, or
any other lead source." What an event does that a person create does not:

- de-duplicates against existing contacts automatically (on email or phone),
- records the inquiry in contact history and on the dashboard,
- notifies the assigned agent by email / text,
- applies action plans,
- assigns the correct agent per the account's Lead Flow screen,
- searches for social profiles.

So the split this app ships is: **Create Event** for anything originating outside Follow Up Boss,
**Create Person** only for an administrative add that should trigger nothing. Both actions say so in
their own descriptions, because the failure mode is a week of leads nobody followed up.

#### Event type decides whether anything actually runs

The highest-consequence field on Create Event, and the failure is silent — the call succeeds either
way:

| Event type | Action plans | Automations |
| ---------- | :----------: | :---------: |
| `Registration`, `Seller Inquiry`, `Property Inquiry`, `General Inquiry` | ✅ | ✅ |
| `Visited Open House` | ✅ | ❌ |
| the other nine types | ❌ | ❌ |

`Viewed Property` records history and runs nothing; `Property Inquiry` runs the follow-up machine.
The action's option list labels which is which, so the choice is visible at the form.

`Inquiry` is an alias: it "will be automatically converted into 'Property Inquiry' if property
section is included in the request or 'General Inquiry' otherwise."

There are exactly **fourteen** event types. That list is prose in the docs, not an OpenAPI enum, so
it was taken from the `POST /events` description and cross-checked against the `GET /events` `type`
filter, which enumerates the same fourteen in the same order. `tests/lib/client.test.ts` pins all
fourteen — an invented event type is precisely the kind of plausible-looking error this app was
built to avoid.

### 2. Authentication is Basic with an EMPTY password, plus two system headers

The API key goes in the **username** position with **nothing** in the password position, so the
encoded payload is `<apiKey>:` — the trailing colon is required and is the whole subtlety.

This was confirmed by the server, not just the docs. An unauthenticated request on 2026-08-03:

```
$ curl -i https://api.followupboss.com/v1/identity
HTTP/2 401
www-authenticate: Basic realm="Follow Up Boss API"
content-type: application/json; charset=UTF-8

{"errorMessage":"Authentication is required. Use Basic HTTP Authentication with API Key as
 username and blank password, or use Bearer token authentication."}
```

`X-System` and `X-System-Key` are the second half. Follow Up Boss asks every integrator to
[register their system](https://apps.followupboss.com/system-registration) and says "Every request
to the API should include the registered 'X-System' and 'X-System-Key' headers." They are
**credential material** — they identify the integration, not the request — so they are stamped in
the auth `sign` hook and are unreachable from any action.

They are **optional** on the Connection, deliberately. The API works without them; it works at
roughly half the rate limit:

| Context | Registered | Unregistered |
| ------- | ---------- | ------------ |
| `global` | **250** | **125** |
| `events` (GET) | 20 | 10 |
| `notes` | 10 | 10 |
| `PUT.people` | 25 | 25 |
| `POST.events` | unlimited\* | unlimited\* |

Requiring them would lock out every individual connecting their own account with their own key — a
case the vendor explicitly supports. Marking them optional and stating what is lost is the honest
shape. Two endpoints (`/rateLimit/usage`, `/rateLimit/limits`) do refuse outright without them.

#### `GET /me` returns the caller's own API key — this app never calls it

Follow Up Boss has two whoami endpoints and only one is safe. The documented response schema for
`GET /me` includes an **`apiKey`** property, plus `algoliaKey`, `callingCapabilityToken` and an
`intercomSettings.user_hash`. Fetching that into a hook would walk straight around the sandbox's
credential isolation — the whole point of which is that a credential goes on the wire in `sign` and
is never visible to an action.

So `/me` is not shipped as an action and is not called anywhere: the auth `test` hook, the
`afterConnect` hook, the `quota` health check and the Get Identity action all use **`GET /identity`**
instead, whose entire documented response is six harmless fields (user id/name/email, account
id/domain/owner). `tests/index.test.ts` enforces this across `actions/`, `auth/`, `health/` and
`lib/` — not as a convention but as an assertion.

### 3. Paging, and the response key that is not the path

**`limit` defaults to 10 and caps at 100. Results are newest-first** (descending id), so
`GET /people?limit=5` means "the 5 most recent people", not the first five.

**Use `next`, not `offset`.** From the Pagination page: "If you are going deep into result sets with
high offset values, and keyset pagination is possible, the API **enforces** the use of the `next`
parameter for pagination instead of `offset`." A deep offset walk does not get slow, it gets
rejected. Every list action here exposes `next` (promoted) alongside `offset` (advanced).

**The response array names itself, and the name is not derivable from the URL:**

```
GET /customFields  ->  { "_metadata": { "collection": "customfields" },
                         "customfields": [...] }      <- lower-cased
GET /smartLists    ->  { "_metadata": { "collection": "smartlists"  },
                         "smartlists":  [...] }       <- lower-cased
GET /actionPlans   ->  { "_metadata": { "collection": "actionPlans" },
                         "actionPlans": [...] }       <- camelCase, matches
```

Hard-coding `body[camelCasePathSegment]` therefore yields `undefined` on exactly the two metadata
endpoints an integration reaches for first. `lib/client.ts` reads `_metadata.collection` to find the
key and falls back to "the only array-valued property that is not `_metadata`". Every list action
returns the same flattened `{ records, metadata }`, and both arms are pinned by tests.

## Other things worth knowing

- **Updates REPLACE collection fields.** On `PUT /people/:id`, `tags`, `phones`, `emails` and
  `collaborators` overwrite the existing list rather than adding to it — "if a contact has phone
  numbers of `123-456-7890` and `123-456-7891` and you want to edit the second one … you'll need to
  send the first one along". `mergeTags=true` is offered for tags only; there is no equivalent for
  phones or emails. An untouched param is omitted from the body entirely rather than sent as `null`,
  so a blank field never clears data.
- **`source` / `sourceUrl` are write-once.** Settable on create, unchangeable afterwards, so Update
  Person does not offer them.
- **Setting `contacted: true` pauses action plans.** Which means a workflow that applies a plan and
  then flips that flag stops the sequence it just started.
- **Custom fields are flat top-level keys**, not a nested map: `{"customClosePrice": 425000}`. Use
  the `name` from List Custom Fields (`customClosePrice`), never the UI `label` ("Close price").
  Deals have their own namespace under `/dealCustomFields`.
- **A deal with empty `userIds` is invisible to every agent** — admins and owners still see it, which
  is what makes this hard to notice from the account that set the integration up.
- **`GET /appointments` returns far less than the calendar.** Three conditions must all hold: the
  appointment belongs to the authenticating user, was created in Follow Up Boss (not synced from
  Google/Outlook), and its creator shares their calendar. An empty result is usually this scoping,
  not an empty calendar.
- **Permission scoping is real.** "Agent's API key allows access only to people assigned to that
  agent while broker's API key allows access to all people." This is why the liveness probe is
  `/identity` and not a resource listing — an agent's key legitimately sees almost nothing.
- **A 403 often means the account expired, not that the key is bad.** An expired account "enters a
  grace period, however the API key remains valid" while most endpoints lock down. The auth `test`
  hook says so rather than telling someone to regenerate a working key.
- **`/notes` is the tightest bucket in the API**: 10 requests per 10-second window, 25× stricter than
  `global`. Bulk note-writing is the most likely way to earn a 429.

## Health checks

Two live checks. Neither is `unavailable` — Follow Up Boss publishes both a real status page and
real rate-limit headers.

### `service` — is the platform up?

`GET https://followupboss.statuspage.io/api/v2/summary.json`, unauthenticated, `scope: app`,
`credential: none`, severity left at the kind default of `degraded`.

**Status page verified two ways, as required.**

**(a) Bogus siblings on the same host** — real paths answer, invented ones 404, so this is an API
and not a catch-all:

| Path | Result |
| ---- | ------ |
| `/api/v2/status.json` | 200, `application/json; charset=utf-8`, 243 bytes |
| `/api/v2/summary.json` | 200, `application/json; charset=utf-8`, ~5 KB |
| `/api/v2/components.json` | 200, `application/json; charset=utf-8`, ~5 KB |
| `/api/v2/notareal.json` | **404, zero bytes** |
| `/api/v2/statusz.json` | **404, zero bytes** |

**(b) Content-type and body** — a genuine Statuspage identity naming this vendor, with five
account-specific components carrying `created_at` timestamps back to 2014-03:

```json
{"page":{"id":"f07lhm8ppnp0","name":"Follow Up Boss",
         "url":"https://followupboss.statuspage.io","time_zone":"America/New_York"},
 "status":{"indicator":"none","description":"All Systems Operational"}}
```

Components: `Follow Up Boss Web Application`, **`API`**, `iPhone App`, `Android App`,
`Follow Up Boss Public Website`.

**The known trap, inverted.** Usually `<vendor>.statuspage.io` is the unclaimed subdomain serving
~127 KB of Atlassian marketing HTML while the real page lives at `status.<vendor>.com`. Here it is
the other way round, and checking cost one DNS lookup:

- **`status.followupboss.com` does not resolve** — NXDOMAIN, no A record (`curl` exits 6). The
  plausible vanity domain is simply not registered.
- **`followupboss.statuspage.io` is claimed and branded** — 200, `text/html`, 191,538 bytes,
  `<title>Follow Up Boss Status</title>`, md5 `d403f270376963544e6405ad14c5582a`. Decisively *not*
  the 127,720-byte Atlassian catch-all (md5 prefix `8d3c480a2267`). The JSON `page.url` field is
  self-referential, which is what a page with no vanity CNAME looks like from the inside.

#### Why the state comes from the API component, not the rollup indicator

The obvious probe reads `status.indicator` and maps none/minor/major/critical. **That would be
wrong here.** Three of the five components — iPhone App, Android App, Public Website — are surfaces
this app never touches; it calls `api.followupboss.com` and nothing else. A mobile-app outage moves
the rollup, and a check keyed on the rollup would report every tenant's workflows as degraded over
an incident that cannot affect a single API call any of them make.

So the reported `state` is derived from the **`API`** component, while all five are still reported in
the `components` map for operator visibility. A test asserts that a `major_outage` on both mobile
apps leaves the state `ok`, and that an API outage does report `down`.

This is the same failure `apps/discourse` addresses by dropping its check to `informational`. The
difference is that there the mismatch is unfixable — most Discourse installs are self-hosted, so the
vendor's status says nothing about a given tenant — whereas here it is fixable, because the vendor
publishes exactly the component we depend on. **Narrow the signal rather than weaken it.**

#### Why this one is not `informational`

Having narrowed the signal, the default `degraded` severity is correct. Follow Up Boss is pure
multi-tenant SaaS — no self-hosted edition, no per-tenant instance — so an outage of
`api.followupboss.com` affects **every** Connection without exception. Dropping to `informational`
would be hiding a real, universal outage.

If the `API` component is ever renamed or removed, the check falls back to the rollup and says so in
its message rather than silently reporting `unknown`.

### `quota` — is there headroom?

`GET /identity` (signed, `scope: connection`, `severity: informational`, no egress widening), reading
the four headers the Rate Limiting page documents on **every** response:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 156
X-RateLimit-Window: 10
X-RateLimit-Context: global
```

**Stated plainly: these headers were not observed on the wire.** Verifying them needs a working API
key and this app was built without a Follow Up Boss account. What *was* checked is the negative
case — an unauthenticated `GET /v1/identity` returns 401 with CloudFront headers and **no
`X-RateLimit-*` at all**, consistent with rejection at the auth layer before the limiter runs, and
therefore neither confirming nor refuting the documented behaviour on an authenticated call.

The parser is built for that uncertainty rather than around it: **absent or unparseable headers yield
`unknown` with a message naming what was missing** — never a fabricated reading, never a false `ok`.
A 429 is handled as a positive reading in its own right (`down`, with `Retry-After` surfaced), since
"you are being throttled" is exactly what this check exists to report.

`resetAt` is deliberately never set. The limit is a **sliding** 10-second window, so there is no
instant at which the allowance resets; synthesising `now + window` would invent a precise-looking
fact. The window length goes in the message, where it is true.

#### Why not `/rateLimit/usage`, the endpoint built for this

Follow Up Boss publishes `GET /rateLimit/limits` and `GET /rateLimit/usage`. They look like the
obvious choice and are not:

1. **They are partner-only.** Both require `X-System` / `X-System-Key` and answer
   `403 {"error": "Only registered systems can use this endpoint."}` without them. Those headers are
   optional here by design, so a check built on them would be permanently broken for every
   unregistered user — the majority case. An entry that is usually blank teaches an operator to
   ignore it.
2. **They answer a different question.** `/limits` returns configured *ceilings*, not remaining
   allowance — it can report a limit of 250 while you sit at 3 remaining. `/usage` returns 24-hour
   totals and a peak hour, which is a usage report; its own docs say the response is "cached
   server-side for 30 seconds … design your client to poll at most once per minute".
3. **The headers are strictly better** and cost nothing extra, riding along on a request the check
   was making anyway.

The reading describes the **`global`** bucket, and says so via `quota[].id`. It cannot promise a
note-writing workflow — capped at 10 — has the same headroom, and does not pretend to.

## What is deliberately not built

The API is large; this app covers the CRM core and stops where a capability needs infrastructure
this app does not have, or where shipping it would mean guessing.

- **Webhooks** (`/webhooks`, `/webhookEvents`) — a webhook needs a publicly reachable receiver and a
  trigger model, neither of which an action can provide. This belongs in a Trigger, not here. Note
  also that "An admin has most access to everything but they can not access Webhooks", so it needs
  an owner's key.
- **OAuth 2.0** — fully documented by the vendor and the right choice for a listed partner
  integration. The API key ships instead because it needs no app registration, redirect URI or
  client secret, and works in unattended background runs. Adding a second `AuthDefinition` of
  `type: "oauth2"` is the clean upgrade path.
- **Inbox Apps** (a dozen endpoints: conversations, messages, participants, reactions, threaded
  replies) — a whole embedded-messaging product with an installation lifecycle, requiring a
  published Inbox App and a partner registration. Not modellable as workflow actions.
- **Attachments** (`/personAttachments`, `/dealAttachments`) — file upload, which needs a
  binary-body path the client here does not implement. Better omitted than half-built.
- **Email-marketing endpoints** (`/emEvents`, `/emCampaigns`) — for an ESP integrating *into* Follow
  Up Boss, a different role from the one this app plays.
- **Templates, ponds, groups, teams, teamInboxes, peopleRelationships, timeframes,
  appointmentTypes/Outcomes, automations, textMessages** — real endpoints, omitted to keep the
  surface at the 26 that carry the common workflows. `typeId` / `outcomeId` hints name their
  endpoints directly rather than pointing at actions that do not exist.
- **`GET /me`** — not an omission but a refusal; see above. It returns the caller's own API key.
- **`names[]` on List Action Plans** — an array-format query parameter with its own encoding rules
  that this client does not natively produce. `ids` and `status` cover the practical cases.
- **Due-date fields on Update Task** — the `PUT /tasks/:id` schema declares no `dueDate`,
  `dueDateTime` or `remindSecondsBefore`. Offering them on the assumption of symmetry with `POST`
  would be inventing surface.

## A vendor typo worth knowing

The `PUT /deals/{id}` request schema spells two fields `agentCommision` and `teamComission` — one
`m` and one `s` short of the `agentCommission` / `teamCommission` used by `POST /deals`, by the
response examples of *both* endpoints, and by `GET /deals`. Three sources against one typo, so this
app sends the correctly-spelled forms, and a test asserts the misspellings never appear in a request
body. Noted here because someone reading the PUT page alone would reasonably copy it and then
wonder why the commission never updates.

## Icon provenance

**The icon is the vendor's own mark, ported — not drawn.**

It is the three-chevron logomark extracted from Follow Up Boss's official brand SVG,
`FUB_Full Color.svg`, served from their own website CDN and linked from
<https://www.followupboss.com/>. The three `<path>` elements and their fill colours
(`#f3b942` yellow, `#4eaddd` blue, `#eb484b` red) are copied **verbatim**; the only changes are
dropping the wordmark half of the logo and setting a square `viewBox` around the mark. It was
cross-checked against the site's 256×256 `favicon.png`, which is the same three chevrons in the same
colours.

There is no Follow Up Boss node in `n8n/packages/nodes-base/nodes/` to port a mark from — checked,
none exists — so the vendor's own published SVG is the source.

## Layout

```
followupboss/
├── index.ts                 # manifest: 26 actions, 1 auth method, 2 health checks
├── auth/api-key.ts          # HTTP Basic (empty password) + X-System / X-System-Key
├── lib/client.ts            # base URL, envelope unwrapping, paging, shared params, vocabularies
├── health/service.ts        # statuspage summary.json, state keyed on the API component
├── health/quota.ts          # X-RateLimit-* headers off GET /identity
├── actions/                 # one file per action
└── tests/                   # one test file per action, plus lib / auth / health / manifest
```

## Verification

From this directory, against the `api` container:

```bash
deno task check   # typecheck
deno task lint    # deno lint
deno task fmt     # format — never bare `deno fmt`, it rewrites assets/icon.svg
deno task test    # 144 unit tests
```

Pack audit, from `packages/apps/`:

```bash
deno run --no-check -A _tools/audit.ts followupboss   # 0 errors, 0 warnings
```

All documentation claims in this app were verified against
<https://docs.followupboss.com/> on **2026-08-03**, endpoint page by endpoint page. Claims verified
on the wire rather than from docs are marked as such where they appear: the docs-host redirect, the
website redirect, the `WWW-Authenticate` challenge and error-body shape, the absence of rate-limit
headers on a 401, the status-page path probes, and the `status.followupboss.com` NXDOMAIN.
