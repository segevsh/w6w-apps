# lemlist

Cold-email and sales-engagement outreach: campaigns, the leads inside them, their state
transitions, activity history, senders, schedules and the unsubscribe list — via the
[lemlist API](https://developer.lemlist.com/).

- **Id** `io.w6w.lemlist` · **Categories** `marketing`, `email`
- **Auth** `api-key` — HTTP Basic with an **empty username**
- **Actions** 18 · **Health checks** `service`, `quota` (+ the derived `auth:api-key`)
- **Egress** `api.lemlist.com` only

> **The name is lowercase.** "lemlist", not "Lemlist" — that is the vendor's own styling.
> `www.lemlist.com` writes it lowercase 2196 times against 27 capitalised, and its `<title>`
> reads "lemlist | The AI Outbound Platform for Relevant Outreach at Every Scale". The
> manifest's `displayName` follows the vendor.

## Auth — HTTP Basic with an EMPTY USERNAME

This is the one thing to get right, and it is the reverse of the arrangement most APIs use.

lemlist puts the API key in the **password** position and leaves the **username** empty. Its
authentication page is unambiguous — "We use BASIC authentication NOT bearer", Username:
Empty, Password: your API key, "Create string with format `:YourApiKey`" — and the OpenAPI
`info.description` shipped with every endpoint page says it independently:

> You need to add the `Authorization` header using the `Basic` authentication type.
> `login:password` **where the login is always empty and the password is the API key**.

So the wire value is:

```
Authorization: Basic base64(":" + apiKey)
```

The **leading colon is required**. For a key of `YourApiKey` the header is exactly
`Basic OllvdXJBcGlLZXk=`, and `atob("OllvdXJBcGlLZXk=") === ":YourApiKey"`.

### Why this is the single most likely silent failure

The sibling [`close`](../close/) app in this pack is the **mirror image** — Close puts the
key in the *username* position with an empty password, `base64("key:")`. Both forms produce
a syntactically valid `Authorization: Basic …` header, so swapping them throws nowhere,
fails no type check, and simply makes lemlist answer 401 for ever.

`auth/api-key.ts` therefore builds the header in exactly one place (`basicHeader`), which
the `sign`, `test` and `afterConnect` hooks all share, and `tests/auth/api-key.test.ts`
pins it from four directions:

- the decoded payload is `":" + key`, with the colon at index **0**;
- the username half is empty and the password half is the key;
- `base64("key:")` — the Close shape — is asserted to be a **different** string;
- `base64("key")` with no colon at all is also asserted different.

### `?access_token=` is deliberately not implemented

Older third-party write-ups pass the key as an `access_token` query parameter. lemlist's
current authentication page documents **only** the Basic header and mentions no
query-parameter form at all (checked 2026-08-03). A query-string secret also leaks into
logs, proxies and referrer headers. **The header is both the documented form and the safe
one, so it is the only one this app sends.**

### Getting a key

lemlist → Settings → Integrations → *Generate a new API key*
(<https://app.lemlist.com/settings/integrations>). A key belongs to a user, and a user
belongs to exactly one team, so a key is scoped to that team.

## Versioning: `v2` means two different things

lemlist has no `/v1` prefix and no version header. It has **two unrelated v2 mechanisms**,
and conflating them breaks calls.

**1. A `version=v2` QUERY PARAMETER** that switches the *response shape* of an
otherwise-unversioned path:

| Route | `version=v2` is | What it does |
|---|---|---|
| `GET /activities` | **required** — "API version. v2 is mandatory" | the only supported shape |
| `GET /leads/{email}` | **required** — "You must set the mandatory query parameter *version* to `version=v2`" | the only supported shape |
| `GET /team` | optional | adds the `users` array of team members |
| `GET /campaigns` | optional, schema-defaults to `v2` | latest campaign shape |

This app sends `version=v2` on all four, and the two mandatory ones re-send it even if the
param is cleared, so a request lemlist would reject cannot be built from the form.

**2. A `/v2/` PATH PREFIX** on a separate set of genuinely newer routes that *replace*
legacy ones — `/v2/unsubscribes/…`, `/v2/campaigns/{id}/stats`, `/v2/enrichments/bulk`.
These are different endpoints, not a flag. This app uses the `/v2/` unsubscribe routes; see
below.

Both live under the same base, `https://api.lemlist.com/api`.

## The unsubscribe surface is the v2 one, because the v1 one is deprecated

lemlist marks the three obvious unsubscribe routes `deprecated: true` in its OpenAPI
document, and each page carries a Warning naming its replacement. This app ships the
replacements:

| Legacy (deprecated) | Shipped instead |
|---|---|
| `GET /unsubscribes` | `GET /v2/unsubscribes/variables` |
| `POST /unsubscribes/{email}` | `POST /v2/unsubscribes/variables/{value}` |
| `DELETE /unsubscribes/{email}` | `DELETE /v2/unsubscribes/variables/{value}` |

The v2 vocabulary is also wider: an entry is any unsubscribed **variable** — "emails,
domains, LinkedIn URLs, phone numbers" — which is why the field is `value`, not `email`.
Passing a bare domain suppresses every address under it.

Re-subscribing is guarded: lemlist answers **409** for a value whose `source` is `lead`
(the person opted out themselves) or `abuse` (a spam complaint). That is a compliance
feature, not a bug — do not retry it.

## Conventions this app encodes

- **Trailing slashes are load-bearing where lemlist documents them.** `/campaigns/{id}/leads/`
  has one; `/campaigns/{id}` does not. Both forms are reproduced exactly and pinned by tests.
- **Scope is spelled two different ways.** Marking a lead interested switches *endpoint*
  (`/leads/interested/{id}` vs `/campaigns/{id}/leads/{id}/interested`); pausing a lead
  switches a *query parameter* (`/leads/pause/{id}?campaignId=…`). Each action collapses the
  pair behind an optional `campaignId` and says on the param that leaving it empty applies
  the change across **every** campaign.
- **`notinterested` is one lowercase word in the URL** even though `notInterested` is the
  camelCased lead *state*. Pinned by a test that also asserts `not-interested` is absent.
- **Custom lead variables are flattened onto the body.** lemlist stores any extra top-level
  key as a variable usable in a sequence as `{{name}}`, so `customVariables` merges rather
  than nests. Names are passed through verbatim — lemlist applies its own sanitising
  server-side, and rewriting a key here would hide which variable the caller actually got.
- **Enrichment flags cost credits**, so they sit in a collapsed section and default to off.
- **Pagination is offset/limit, never cursors.** lemlist's own words: "This is not
  traditional cursor-based pagination. To retrieve all activities, increment offset by the
  limit value on each request." The `limit` ceiling differs per route (100 for campaigns,
  activities and unsubscribes; 500 for campaign leads), so each action states its own.
- **Most list routes return a bare JSON array**, not an envelope — there is no `total` and no
  `hasMore`, so "is there another page" means "did I get back fewer rows than `limit`".
  `GET /schedules` is the exception and returns `{ schedules: [...] }`.
- **Errors are `text/plain`.** lemlist answers auth failures with sentences —
  "No API key provided", "The authentication you supplied is incorrect", "User linked to
  this API key is blocked", "No user found for this API key" — so the `test` hook reads
  text and surfaces it rather than attempting a JSON parse that would always fail.
- **Rate limit: 20 requests per 2 seconds**, per API key, on all routes.

## Actions

### Campaigns (2)

| Key | Type | Endpoint |
|---|---|---|
| `list-campaigns` | search | `GET /campaigns` |
| `get-campaign` | read | `GET /campaigns/{campaignId}` |

`get-campaign` returns `sequenceId` and `scheduleIds`, which are the ids the sequence and
schedule routes take.

### Leads (8)

| Key | Type | Endpoint |
|---|---|---|
| `list-campaign-leads` | search | `GET /campaigns/{campaignId}/leads/` |
| `add-lead-to-campaign` | perform | `POST /campaigns/{campaignId}/leads/` |
| `delete-lead-from-campaign` | perform | `DELETE /campaigns/{campaignId}/leads/{leadId}` |
| `get-lead` | read | `GET /leads/{email}?version=v2` |
| `mark-lead-interested` | perform | `POST /leads/interested/{id}` · `POST /campaigns/{id}/leads/{id}/interested` |
| `mark-lead-not-interested` | perform | `POST /leads/notinterested/{id}` · `POST /campaigns/{id}/leads/{id}/notinterested` |
| `pause-lead` | perform | `POST /leads/pause/{leadId}` |
| `resume-lead` | perform | `POST /leads/start/{leadId}` |

Three things worth knowing here:

**`delete-lead-from-campaign` defaults to `action=remove`, and that default matters.**
lemlist overloads the route: "If you don't specify `action=remove`, the endpoint fallbacks
to unsubscribing the lead." Unsubscribing is team-wide and far less reversible than the verb
suggests, so the param defaults to `remove`. Clear it deliberately — and pass the lead's
*email* — to get the unsubscribe behaviour.

**`list-campaign-leads` has no offset.** lemlist documents only `state` and `limit` on that
route, so there is no way to page past `limit` (max 500); narrow with `state` instead.

**`resume-lead` is `/leads/start/`, not `/leads/review/`.** The neighbouring
`POST /leads/review/{leadId}` is "Launch Lead" — it launches a lead *waiting for review* and
**requires an `emailPro` plan or higher**. It is deliberately not shipped, because it would
4xx for anyone below that plan. `start` is the counterpart to Pause Lead and carries no plan
requirement.

### Activities (1)

| Key | Type | Endpoint |
|---|---|---|
| `list-activities` | search | `GET /activities?version=v2` |

Filters by `type`, `campaignId`, `leadId`, `isFirst` and a date range. lemlist accepts two
date-filter spellings and documents that `minDate`/`maxDate` beat the `startDate`/`endDate`
aliases, so **only the winning pair is exposed** — offering both would let a caller build a
request where half their input is silently ignored. Both accept an ISO 8601 datetime or a
Unix timestamp in seconds.

`type` is left an open string: lemlist's schema for the filter is a bare `type: string`, and
the activity vocabulary is long and still growing, so publishing a `select` would freeze a
list lemlist has not frozen.

### Team (3)

| Key | Type | Endpoint |
|---|---|---|
| `get-team` | read | `GET /team?version=v2` |
| `get-team-credits` | read | `GET /team/credits` |
| `list-team-senders` | search | `GET /team/senders` |

**`get-team` is also how you list team members.** There is no `/team/users` route — only
`GET /users/{userId}` for one user by id. lemlist's own words: `version=v2` "include[s] the
`users` array, listing each team member's `userId`, `name`, `email`, and `role`. This lets
you retrieve the team and its members in a single request."

`list-team-senders`'s `state` filter is documented as filtering by **the campaign's** state,
not the sender's, so it narrows each sender's nested campaign list. The param is labelled
"Campaign state" to say so.

### Schedules (1)

| Key | Type | Endpoint |
|---|---|---|
| `list-schedules` | search | `GET /schedules` |

The sending window a campaign runs in: `timezone`, `start`/`end`, `weekdays`, and
`secondsToWait` between sends.

### Unsubscribes (3)

| Key | Type | Endpoint |
|---|---|---|
| `list-unsubscribes` | search | `GET /v2/unsubscribes/variables` |
| `add-unsubscribe` | perform | `POST /v2/unsubscribes/variables/{value}` |
| `delete-unsubscribe` | perform | `DELETE /v2/unsubscribes/variables/{value}` |

`add-unsubscribe` is idempotent by lemlist's own guarantee: "if the variable is already
unsubscribed, the existing record is returned."

### What is deliberately not shipped

lemlist's API is much larger than this — 142 documented endpoints covering a CRM (contacts,
companies, notes), an inbox (drafts, labels, LinkedIn and WhatsApp sending), enrichment, a
people database, sequences and A/B tests, tasks, lemwarm, deliverability alerts, webhooks and
signal agents. This app covers the **outreach** surface: campaigns, leads, activity, senders,
schedules and suppression. The rest is real and could be added; it was simply out of scope,
not missing because it could not be found.

## Health checks

### `service` — lemlist platform status (real probe)

`GET https://status.lempire.com/status.json` — a [Hyperping](https://hyperping.com) status
page. lempire is lemlist's parent company, and the page monitors six components, two of them
this app's direct dependencies: **lemlist**, **lemlist API**, lemwarm, taplio.com,
tweethunter.io and lempire.com.

`status.lempire.com` is **not** on the app's egress allowlist; the check widens egress for
its own unsigned hook only, which is safe precisely because a `service` check is never
signed.

**This endpoint was verified genuine before being trusted, by both required checks
(2026-08-03):**

1. **Bogus-sibling comparison.** `/status.json` → **200**, `application/json`, 38 bytes.
   Invented siblings `/api/v2/bogus-zzz9.json` and `/definitely-not-a-real-path-zzz9` →
   **404**. The host is not a catch-all that answers 200 to everything.
2. **Content-type and body inspection.** The body is
   `{"indicator":"up","uptime":"100.000%"}` — real JSON of Hyperping's documented shape, not
   HTML wearing a `.json` name.

**Two traps were found and avoided:**

- **`status.lemlist.com` is the wrong host.** It is the obvious choice and it resolves, but
  every path 302s to `https://status.lempire.com/` — the **root**, discarding the path. So
  `https://status.lemlist.com/status.json` returns **200 with 162 KB of `text/html`**. A
  check pointed there would parse HTML as JSON, fail, and report `unknown` for ever while
  appearing to work.
- **`lemlist.statuspage.io` is not lemlist's.** It also answers 200, but redirects to
  `https://www.atlassian.com/software/statuspage` — 127 KB of marketing HTML for an
  unclaimed subdomain. lemlist does not use Atlassian Statuspage, so none of the usual
  `/api/v2/summary.json` machinery applies.

Hyperping's indicator vocabulary, from its own documentation:

| `indicator` | Meaning | Mapped to |
|---|---|---|
| `up` | all services operational | `ok` |
| `maintenance` | at least one service under maintenance | `degraded` |
| `incident` | one or more (but not all) services down | `degraded` |
| `outage` | all services down | `down` |

**A stated limitation:** Hyperping's `status.json` carries no per-component breakdown — its
docs say so outright ("no per-service arrays or detailed component breakdowns are included")
— so this check reports one rolled-up state and no `components` map rather than inventing
one. Because the page covers all six lempire products, an incident affecting only taplio
still reads here as `degraded` for lemlist. Over-reporting is the safe direction for an
advisory check, but a reader should know that is what is happening.

A failing or unparseable status page reports `unknown`, never `down`.

### `quota` — enrichment credits and rate-limit headroom (real probe)

One call, `GET /team/credits`, answering two independent questions — the RFC's rule is
"declare a check per *call* you must make; report a component per *thing* that call tells
you about".

**Bucket `credits`, from the response body.** lemlist's consumable currency: "the coins a
team uses to enrich emails, LinkedIn URLs, etc." The enrichment flags on
`add-lead-to-campaign` spend them, and running out breaks enrichment while leaving the rest
of the API working — exactly the partial failure a quota check exists to surface. No `limit`
is reported: a team *buys* credits rather than holding a fixed allowance, so there is no
ceiling to state.

**Bucket `requests`, from the response headers.** lemlist documents `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset` and `Retry-After` against a 20-per-2-seconds
budget.

`/team/credits` is the right endpoint to probe: it needs no scope beyond the key existing,
and it is a single constant-size row.

**Honest about what was verified.** The **credits** bucket is verified against lemlist's
published `Credits` schema. The **rate-limit headers** are documented in lemlist's OpenAPI
`info.description` but were **not confirmed on the wire** — every lemlist route requires a
key, and this app was built without one. So their absence degrades gracefully: the bucket
reports `unknown` with a message saying the headers were missing, rather than fabricating a
number. The credits bucket is unaffected either way.

**One parsing trap, handled.** `X-RateLimit-Reset` is a **date string**, not a
seconds-from-now delta — lemlist's own example is
`"Tue Feb 16 2021 09:02:42 GMT+0100 (Central European Standard Time)"`. Most APIs (Brevo,
Close) put a delta there, so the reflex `Date.now() + n * 1000` would be wrong here. The
parser also checks numeric strings **before** `Date.parse`, because `Date.parse("2")`
succeeds in V8 and yields 1 February 2001 — a date-first parser would silently turn a
five-second reset into a timestamp 25 years in the past and never raise. A unit test pins
this; it is what caught the bug.

`severity: "informational"`, so low headroom never fails a verdict on its own.

### Credential check

Derived automatically from the auth `test` hook as `auth:api-key`. It probes
`GET /team?version=v2` — lemlist's whoami, and the one call every key can make regardless of
role, since a key belongs to a user and a user belongs to exactly one team.

## Icon

`assets/icon.svg` is lemlist's own mark, copied **byte-identically** from n8n's
`nodes-base/nodes/Lemlist/lemlist.svg` (verified with `diff` before and after `deno task fmt`).

> Use `deno task fmt`, never bare `deno fmt` — the bare form reformats `assets/icon.svg`.

## Development

```sh
cd apps/lemlist
deno task test    # 127 unit tests
deno task check
deno task lint
deno task fmt
```

Pack auditor, from the pack root:

```sh
deno run --no-check -A --config apps/lemlist/deno.json _tools/audit.ts lemlist
```

All four tasks and the auditor are clean (0 errors, 0 warnings).

## Links

All verified to return HTTP 200 on 2026-08-03.

- **Vendor site** — https://www.lemlist.com/
- **Developer portal / API docs (used to build this app)** — https://developer.lemlist.com/
- **Getting started: overview** — https://developer.lemlist.com/api-reference/getting-started/overview
- **Authentication (the empty-username Basic quirk)** — https://developer.lemlist.com/api-reference/getting-started/authentication
- **Rate limits** — https://developer.lemlist.com/api-reference/getting-started/rate-limits
- **Docs page index (markdown)** — https://developer.lemlist.com/llms.txt
- **Full docs corpus (markdown, ~250 KB)** — https://developer.lemlist.com/llms-full.txt
- **Get Lead by Email (the mandatory `version=v2` warning)** — https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email.md
- **List Unsubscribed Variables (the v2 replacement route)** — https://developer.lemlist.com/api-reference/endpoints/unsubscribes/list-unsubscribed-variables.md
- **API key generation** — https://app.lemlist.com/settings/integrations
- **Help centre: find and use the lemlist API** — http://help.lemlist.com/en/articles/4452694-find-and-use-the-lemlist-api
- **Status page** — https://status.lempire.com/
- **Hyperping `status.json` reference** (the status page's platform) — https://hyperping.com/docs/status-page/status-page-json

> **No GitHub link, deliberately.** No official lemlist or lempire GitHub organisation could
> be verified. `github.com/lemlist`, `github.com/lemlist-io`, `github.com/lempire-io` and
> `github.com/lemlistapp` all 404. `github.com/Lempire` does resolve, but the GitHub API
> reports it as a personal **user** account — `"type": "User"` with no name, company, blog or
> bio — not lemlist's org, so it is not linked here. Add one if an official org is ever
> found.

> Every per-endpoint documentation page is also available as raw markdown by appending
> `.md`, and each embeds the OpenAPI fragment for that route — which is where this app's
> exact paths, parameters and response shapes were read from.
