# Attio

Attio CRM records, list entries, attributes, notes, tasks and workspace members, on the **Attio REST
API v2**.

- **Categories** — crm
- **Auth methods** — api-key (a workspace access token, sent as `Authorization: Bearer …`)
- **Actions** — 29
- **Egress allowlist** — `api.attio.com`
- **Health checks** — `service` (live), `quota` (declared unavailable)

## Links

| What | Where |
| ---- | ----- |
| **Website** | <https://attio.com/> |
| **API docs** | <https://docs.attio.com/rest-api/overview> |
| **OpenAPI spec** | <https://api.attio.com/openapi/api> — see below |
| **Source / git repo** | <https://github.com/attio> — see the note below |
| Status page | <https://status.attio.com/> |
| Machine-readable docs index | <https://docs.attio.com/llms.txt> |

> **On the docs link.** The candidate entry for this app cited `https://developers.attio.com/`. That
> host answers **`308 Permanent Redirect` to `https://docs.attio.com/`** (verified on the wire,
> 2026-08-03), which then lands on `/docs/overview`. The canonical host is `docs.attio.com`. It is a
> Mintlify SPA, and it publishes a machine-readable page index at
> [`/llms.txt`](https://docs.attio.com/llms.txt) plus a `.md` twin of every page.
>
> **On the OpenAPI spec.** Attio publishes a real one, and the docs chrome does not link it. It is
> named on exactly one page — `/rest-api/endpoint-reference/openapi` — which says: "Attio exposes a
> public OpenAPI specification for the Attio REST API. The specification is available
> [here](https://api.attio.com/openapi/api)." Three documents exist, all `application/json`
> (fetched 2026-08-03):
>
> | URL | Size | Title |
> | --- | ---- | ----- |
> | `https://api.attio.com/openapi/api` | 770,609 B | Attio API 2.0.0 |
> | `https://api.attio.com/openapi/standard-objects` | 1,008,270 B | Attio Standard Objects 2.0.0 |
> | `https://api.attio.com/openapi/webhooks` | 79,231 B | Attio Webhook Events |
>
> **Every path, parameter name, body shape, enum and error code in this app was transcribed from the
> first two**, cross-read against the prose guides. Nothing here was written from memory.
>
> **On the source repo.** Attio publishes no open-source SDK or client library for this API.
> `github.com/attio` is the organisation account; it carries the [Attio App
> SDK](https://docs.attio.com/sdk/overview) (React components that run *inside* the Attio UI), which
> is a different product from the REST API this app targets. The organisation link is given because
> the brief asks for one, **not** because it contains an SDK this app mirrors.

Attio is a CRM whose data model is user-defined rather than fixed, and that shapes everything below:
there is no `Person` endpoint and no `Deal` endpoint, only records on objects. Read the next section
before writing anything through this app.

## The data model in one page

Four nouns, and getting them straight is most of the work.

| Noun | What it is | In SQL terms |
| ---- | ---------- | ------------ |
| **Object** | A type — `people`, `companies`, `deals`, or one you invented | a table |
| **Record** | An instance of an object — a specific person | a row |
| **Attribute** | A typed field on an object *or on a list* | a column |
| **List / entry** | A list aggregates records; an entry is one record's membership of it | a join table with its own columns |

Two consequences that catch people out:

1. **A record's data lives in `values`, keyed by attribute slug** — never as top-level fields. There
   is no `record.name`; there is `record.values.name`.
2. **Lists are not tags.** A list carries its *own* attributes, so the same company can be on a
   Sales list at stage "Negotiating" and on a Partners list at stage "Signed", with neither stage
   stored on the company record. `List Record Entries` is the only way to ask "which lists is this
   record on".

### Standard objects and custom objects share ONE endpoint shape

The docs' navigation implies otherwise — there is a Companies section, a People section, a Deals
section, each with its own create/update/upsert pages. **They are not separate endpoints.** The
`standard-objects` OpenAPI document contains only these paths:

```
/v2/objects/companies/records            /v2/objects/people/records
/v2/objects/companies/records/query      /v2/objects/people/records/query
/v2/objects/companies/records/{record_id}   … and the same five for deals, users, workspaces
```

— which is `/v2/objects/{object}/records` from the main document with `{object}` bound to a literal
slug. That document is a *typed overlay*: it names each standard object's system attributes so the
reference page can display them. It introduces no route the generic path does not have.

**So this app ships object-parameterised record actions rather than five near-identical copies.** One
Create Record works on `people`, on `companies`, and on a custom object a workspace invented this
morning. That is the whole point of Attio's model, and hard-coding slugs would throw it away.

## The five things most likely to go wrong

Each of these **succeeds**. That is what makes them expensive.

### 1. `{"name": "John Smith"}` sets the first name to "John Smith"

Attio's (Personal) name type accepts a string, and parses it as **`"Last name(s), First name(s)"`**.
Verbatim: "the string must match format 'Last name(s), First name(s)'. Text without a comma is
interpreted as solely comprising the first name."

So the obvious payload creates a person whose first name is the whole string and whose last name is
empty — and returns `201`. Write either:

```jsonc
{ "name": { "first_name": "John", "last_name": "Smith", "full_name": "John Smith" } }  // all three required
{ "name": "Smith, John" }                                                              // or the comma form
```

The warning is on the **Attribute values** param of every write action, not only here.

### 2. Reads and writes are different shapes, and writes are the forgiving one

Most integrations get this backwards and try to reconstruct the read shape.

**Reading**, every value is an array of typed objects — even for a single-valued attribute — each
wrapped in a four-field envelope:

```jsonc
"email_addresses": [{ "active_from": "…", "active_until": null, "created_by_actor": {…},
                      "attribute_type": "email-address",
                      "email_address": "r.hamming@bell-labs.com",
                      "original_email_address": "…", "email_domain": "…",
                      "email_root_domain": "…", "email_local_specifier": "…" }]
```

**Writing**, shorthand is accepted throughout — "When writing to multi-select attributes, you must
always wrap values in an array. Single-select attributes accept unwrapped data." All three of these
are equivalent:

```jsonc
{ "description": "A long time ago…" }
{ "description": ["A long time ago…"] }
{ "description": [{ "value": "A long time ago…" }] }
```

`lib/values.ts` carries the per-type write cheat-sheet for all **17** attribute types, and it is
rendered into the hint on every values param, so it is readable at the form. Round-tripping a record
you just read is what actually breaks — `active_from` and friends are not writable.

Every read action also emits **`values_flat`** beside the raw `values`: the same data reduced to
scalars, so a downstream step writes `{{record.values_flat.name}}` rather than
`{{record.values.name[0].full_name}}`. Nothing is hidden — the raw map is always present.

> **Why the flattener keys on property names, not `attribute_type`.** Two of the seventeen "Reading
> values" examples in Attio's own docs carry the wrong discriminator: the **status** example is
> labelled `"attribute_type": "select"`, and the **timestamp** example is labelled
> `"attribute_type": "date"` (both read 2026-08-03). If the vendor's hand-written examples disagree
> with their own discriminator, a parser that trusts it will mis-read real payloads. The property
> names are unambiguous and disjoint — only a currency value has `currency_value`, only a select has
> `option`, only a status has `status` — so those are what it reads.
> `tests/lib/values.test.ts` has one case per type, including the mislabelled status.

### 3. PATCH appends to multiselects; PUT overwrites them

Two verbs, one URL, opposite semantics. Attio documents them as two endpoints differing in one
sentence each:

| | Multiselect behaviour |
| --- | --- |
| **PATCH** | "the values supplied will be created and **prepended** to the list of values that already exist" |
| **PUT** | "the values supplied will **overwrite/remove** the list of values that already exist" |

Sending "the tags are now exactly `[A]`" as a PATCH returns `200`, reports the record updated, and
leaves the four old tags in place. A nightly workflow then accumulates values forever, and the bug
surfaces months later as a record with thirty tags.

**Update Record** and **Update Entry** therefore expose this as a required param with `append` as the
default — the verb that cannot delete anything. Overwrite is the *only* way to clear a multiselect,
so it is offered rather than hidden.

### 4. Upsert's matching attribute is treated differently from every other attribute

Upsert Record takes a required `matching_attribute`, which must be a **unique** attribute (for
companies "`domains` is the only unique attribute"; for people it is `email_addresses`). The rule
underneath it is a two-clause sentence that is easy to read past:

> "If the matching attribute is a multiselect attribute, new values will be **added** and existing
> values will not be deleted. For any other multiselect attribute, all values will be either created
> or deleted as necessary to **match** the list of supplied values."

One request, two opposite behaviours, decided by which attribute you matched on. Upserting a person
on `email_addresses` *adds* the supplied address to the ones they already have, while the
`phone_numbers` in the same payload become exactly what you sent and the rest are deleted.

### 5. `GET /notes` defaults to 10 results, not 500

Pagination defaults are per-endpoint on this API and they differ by two orders of magnitude:

| Endpoint | Default limit | Max |
| --- | --- | --- |
| `POST /objects/{object}/records/query` | 500 | — |
| `POST /lists/{list}/entries/query` | 500 | — |
| `GET /tasks` | 500 | — |
| `GET /notes` | **10** | **50** |
| `GET …/{record_id}/entries` | 100 | 1000 |
| `POST /objects/records/search` | 25 | **25** |

Each action's limit hint states its own endpoint's numbers, and the maximum is enforced in the param
validation so the mistake surfaces at the form rather than as a 400.

## Authentication

`Authorization: Bearer <token>`, where the token is a **single-workspace access token** generated in
Attio's developer settings.

Attio names both options and draws the line for us: "You should prefer the OAuth 2.0 flow if building
an app for multiple workspaces. If you are building an app for a single workspace, you can manually
generate an API key to make requests on behalf of that workspace only." A w6w Connection *is* the
single-workspace case.

Both credentials go on the wire identically, so an OAuth access token pasted into the field also
works. Attio additionally accepts HTTP Basic with the token as the username, and recommends against
it: "we recommend using Bearer authentication where possible."

### Why OAuth 2.0 is not shipped as a second method

Three concrete blockers, each from Attio's own reference — not an oversight:

1. **It needs a registered marketplace app.** `client_id` / `client_secret` come from
   build.attio.com and are per-integration. There is no public client id to ship in a package.
2. **Scopes are not requested at authorize time.** `/authorize` documents exactly four query
   parameters — `client_id`, `response_type`, `redirect_uri`, `state`. There is no `scope`; scopes
   are configured on the app in the developer dashboard. w6w's `OAuth2Config.scopes` would have
   nowhere truthful to go.
3. **No refresh token.** `/oauth/token` returns `access_token` and `token_type` only. There is
   nothing for a `refresh` hook to do.

Add a `type: "oauth2"` method if and when this app is registered as an Attio marketplace app.

### Scopes are attached to the token, and this app reports them

Scopes are chosen when the token is generated and can be edited afterwards. For full use of this app,
grant: `record_permission:read-write`, `object_configuration:read`, `list_entry:read-write`,
`list_configuration:read`, `note:read-write`, `task:read-write`, `user_management:read`.

`afterConnect` stores the granted scope list as Connection display data, because "the token is live
but was minted without `task:read-write`" is otherwise indistinguishable from "the API is broken"
until the first task write 403s. The **Get Identity** action exposes the same list to a workflow, so
a step can check a permission before a batch rather than discover the gap halfway through it.

### The probe returns HTTP 200 when the token is bad

`GET /v2/self` is an RFC 7662-style introspection endpoint, so "that token is invalid" is a
*successful* answer to the question it was asked. The spec models the 200 as an `anyOf` whose first
arm is `{"active": false}`, and the live server does exactly that. Probed 2026-08-03, with no Attio
account:

```
GET /v2/self   Authorization: Bearer <64 random hex chars>
-> HTTP/2 200   {"active":false}

GET /v2/self   Authorization: Bearer not-a-real-token-000
-> HTTP/2 400   {"status_code":400,"type":"invalid_request_error","code":"missing_value",
                 "message":"Token was not recognised, …"}

GET /v2/self   (no Authorization header)
-> HTTP/2 400   … the same missing_value body
```

**`/v2/self` never returns 401.** A `res.ok` check passes on a revoked token. The auth `test` hook
and the Get Identity action therefore both read the body and require `active === true`, and
`tests/index.test.ts` greps the app to make sure a future "simplification" back to `res.ok` cannot
land silently. An active token with an *empty* scope string is also reported as a failure, since it
would 403 on every call.

For contrast, ordinary endpoints behave ordinarily — `GET /v2/objects` with the same junk token
answers `401 {"code":"unauthorized","message":"The API Key provided could not be found. This is most
commonly caused by the token having been revoked."}` — which is why the client keeps a plain
`!res.ok` check.

### The probe was checked for credential leakage before it was used

This is the endpoint an integration reaches for, and on several other CRMs the equivalent hands the
credential back (Follow Up Boss's `GET /me` returns the caller's own `apiKey`; Mailjet's
`/v3/REST/apikey` returns key *and* secret). Attio's does not. The active-token response schema is
fifteen properties — `active`, `scope`, `client_id`, `token_type`, `exp`, `iat`, `sub`, `aud`, `iss`,
`authorized_by_workspace_member_id`, `workspace_id`, `workspace_name`, `workspace_slug`,
`workspace_logo_url` — every one a claim *about* the token. The token is not among them, and neither
is any other secret.

Two tests keep it that way: one greps every source file for a credential-shaped field name outside
the auth module, and one asserts the stored `afterConnect` display data contains no token substring.

## Health checks

### `service` — live, keyed on one component

Atlassian Statuspage at `https://status.attio.com/api/v2/summary.json`. Unauthenticated,
`credential: "none"`, `scope: "app"`, and the only place `status.attio.com` is allowlisted — actions
have no business calling it.

**Verified real, and verified to be *Attio's*, three ways on 2026-08-03:**

**(a) Bogus sibling path.** A catch-all answers everything identically. This host does not:

- `GET /` → `200`, `text/html`, 168,237 B, md5 `1c22de96…`
- `GET /this-page-does-not-exist-xyz` → **`404`**, `text/html`, 41,475 B, md5 `1b78e1fd…`
- `GET /summary.json` (wrong path) → **`404`**, `text/html`, 41,442 B

**(b) Content-type and body.** The three real endpoints answer JSON at distinct sizes —
`status.json` 200 B, `summary.json` 1,727 B, `components.json` 1,529 B — while a `.json` path that
does not exist returns **HTML**. That asymmetry is what a faked page cannot produce.

**(c) Does the page describe *this* product?** The check that matters, because (a) and (b) both pass
on a claimed, healthy, correctly-routing Statuspage belonging to somebody else.

```jsonc
{"page":{"id":"01HHYYB6Q83W5764RVB4FXMHBF","name":"Attio",
         "url":"https://status.attio.com/","updated_at":"2025-06-24T08:49:32Z"},
 "status":{"description":"All Systems Operational","indicator":"none"}}
```

`page.name` is "Attio" and `page.url` is on **Attio's own domain**, not a `*.statuspage.io` subdomain
anyone could have claimed. The five components are unmistakably this product:

| Component | Description (verbatim) |
| --- | --- |
| Customer Helpdesk | "delivers our customer support chats and help documents" |
| Attio Cloud Storage | "powers features such as files, enrichment and email attachments" |
| Background Tasks | "responsible for the background data processing" |
| Attio Web Client | "easy access to Attio from any web browser" |
| **Attio Cloud** | **"power our APIs and provide customers access to their data"** |

**Two decoys, both eliminated:** `attio.statuspage.io` redirects to `/inactive` (200, 26,345 B — the
decommissioned-page response), and `attio.instatus.com` redirects to `instatus.com` and serves the
216,836-byte unclaimed-Instatus marketing page.

**Why the state comes from one component, not the rollup.** Three of the five — Customer Helpdesk,
Attio Web Client and (mostly) Attio Cloud Storage — are surfaces this app never touches; it calls
`api.attio.com` and nothing else. A helpdesk outage moves the rollup indicator, and a check keyed on
the rollup would report every tenant's workflows as degraded over an incident that cannot affect a
single API call. So the state is derived from **Attio Cloud** — the component whose own description
says it powers the APIs — with all five reported in `components` for context. If that component is
ever renamed the check falls back to the rollup **and says so in its message**, rather than reporting
a silent `unknown` that looks identical to a healthy API.

**Why it is not `informational`.** Having narrowed the signal, the default `degraded` severity is
correct. Attio is pure multi-tenant SaaS — no self-hosted edition, no per-tenant instance — so an
`api.attio.com` outage affects every Connection without exception. This is the same narrowing
`followupboss` and `circle` apply; the `discourse` route of dropping the whole check to
`informational` is for the case where the mismatch is unfixable, which it is not here.

### `quota` — declared **unavailable**, `severity: "informational"`

Attio publishes no request headroom. Declared rather than omitted so a host can tell "we cannot know"
from "nobody looked", and `informational` because an `unavailable` entry reports `unknown`, which at
the default `degraded` severity would pin the app at `unknown` forever.

**Verified three ways, 2026-08-03:**

1. **Nothing on the wire.** Live responses from `api.attio.com` carry `date`, `content-type`,
   `content-length`, `x-attio-execution-id`, `vary`, the CORS trio, `x-frame-options`, `via`,
   `alt-svc`, `cf-cache-status`, `strict-transport-security`, `server`, `cf-ray` — and **no**
   `RateLimit-*`, `X-RateLimit-*` or `Retry-After`. Checked on `/v2/self` and `/v2/objects`.
2. **Nothing in the specification.** Both OpenAPI documents contain **zero** occurrences of
   `ratelimit`, `rate_limit`, `X-Rate…` or `Retry-After`, and not one of the 77 operations declares a
   `429` at all. The documented status codes across both documents are 200, 201, 202, 204, 302, 400,
   403, 404, 409, 413.
3. **Nothing to poll.** No usage, limits or quota endpoint exists. The near-miss is the
   `quota_exceeded` error code, and it is a different thing — returned by `POST /v2/objects` with
   "You have met your plan's object limit." A plan ceiling, reported only when you hit it.

What Attio *does* publish is a pair of constants: "100 requests per second for read requests, 25
requests per second for write requests", plus a complexity **score** on List Records and List Entries
summed over a sliding 10-second window. A check could restate them, but a constant is not a
measurement — it would report `ok` at 100% and `ok` at 0% identically, and an entry that never
changes teaches an operator to ignore it. The one live signal that exists,
`x-attio-record-query-score` (named in every response's `access-control-expose-headers`), describes
the cost of the request just made rather than the allowance remaining, and could not be observed
without a working token.

## Actions

**Records** — object-parameterised; work on `people`, `companies`, `deals`, `users`, `workspaces` and
any custom object alike.

| Action | Endpoint |
| --- | --- |
| List Records | `POST /v2/objects/{object}/records/query` |
| Search Records | `POST /v2/objects/records/search` — fuzzy, beta, eventually consistent |
| Get Record | `GET /v2/objects/{object}/records/{record_id}` |
| Create Record | `POST /v2/objects/{object}/records` — throws on unique conflict |
| Update Record | `PATCH` **or** `PUT …/{record_id}` — append vs overwrite |
| Upsert Record | `PUT /v2/objects/{object}/records?matching_attribute=…` |
| Delete Record | `DELETE …/{record_id}` |
| List Record Attribute Values | `GET …/attributes/{attribute}/values` — the only history read |
| List Record Entries | `GET …/{record_id}/entries` — which lists is this record on |

**Lists & entries**

| Action | Endpoint |
| --- | --- |
| List Lists | `GET /v2/lists` |
| List Entries | `POST /v2/lists/{list}/entries/query` — supports `parent_record` path filters |
| Get Entry | `GET /v2/lists/{list}/entries/{entry_id}` |
| Create Entry | `POST /v2/lists/{list}/entries` — **not idempotent**, duplicates are allowed |
| Update Entry | `PATCH` **or** `PUT …/{entry_id}` |
| Upsert Entry | `PUT /v2/lists/{list}/entries` — matches on the parent record |
| Delete Entry | `DELETE …/{entry_id}` — removes the membership, not the record |

**Schema** — read these before writing.

| Action | Endpoint |
| --- | --- |
| List Objects | `GET /v2/objects` |
| List Attributes | `GET /v2/{objects\|lists}/{identifier}/attributes` — carries `is_unique`, `is_multiselect` |
| List Select Options | `GET …/attributes/{attribute}/options` |
| List Statuses | `GET …/attributes/{attribute}/statuses` |

**Notes, tasks, identity**

| Action | Endpoint |
| --- | --- |
| List Notes / Create Note / Delete Note | `GET`, `POST`, `DELETE /v2/notes` |
| List Tasks / Create Task / Update Task / Delete Task | `GET`, `POST /v2/tasks`, `PATCH`, `DELETE …/{task_id}` |
| List Workspace Members | `GET /v2/workspace_members` |
| Get Identity | `GET /v2/self` |

### Smaller things the spec says and the docs do not shout

- **Create Task requires all six fields**, including the empty ones — `content`, `format`,
  `deadline_at`, `is_completed`, `linked_records` and `assignees` are every one of them `required`.
  Attio will not accept a body that merely omits the deadline; it wants `"deadline_at": null` said
  out loud. The action fills blanks with neutral values, which is why `compact()` is deliberately not
  used there.
- **A task's text cannot be edited.** "At present, only the `deadline_at`, `is_completed`,
  `linked_records`, and `assignees` fields can be updated." Fixing a typo means delete and recreate.
- **Notes have no update endpoint at all** — create, read, list, delete only.
- **Note markdown is a named subset**: headings 1–3 only, lists, bold/italic/strikethrough plus the
  non-standard `==highlight==`, and links. No images ("While the Attio interface supports image
  embeds, they cannot currently be added or retrieved via the API's markdown format"), no tables, no
  code blocks. Note *titles* are never formatted.
- **List Tasks defaults to oldest-first**, and its `is_completed` filter is genuinely tri-state —
  unset returns both. It is exposed as a three-way select rather than a checkbox precisely because an
  unchecked box would send `false` and silently hide every completed task.
- **There is no `$ne` operator.** "Attio doesn't offer negative operators… Instead, filters should be
  wrapped using the `$not` operator."
- **Workspace members are seats, person records are contacts.** Owners, assignees and comment authors
  all take a workspace member — "Currently, the only type of actor that can be explicitly set in our
  API is `workspace-member`."
- **A 404 can mean "not yet".** `merge_in_progress` shares the 404 status with `not_found` while a
  large record merge is applied asynchronously. The client names the code so it does not read as a
  deletion.

## Deliberately not built

| Surface | Why |
| --- | --- |
| **Merge Records** (`POST …/records/merge`) | In the OpenAPI document but with **no reference page** in the docs nav or `llms.txt`. Irreversible ("Both of the original records are marked as merged and can no longer be read or written"), asynchronous (a `202` means the result is not yet readable), and it mints a *new* id that matches neither input. Too sharp an edge to ship on a surface the vendor has not documented. |
| **SQL** (`POST /v2/sql`) | Real and documented, but it is a second query language with its own 2-queries-per-second limit, and it overlaps List Records entirely for the cases a workflow needs. Worth adding deliberately, not incidentally. |
| **Files** (`/v2/files`, upload/download) | Multipart upload and a `302` redirect on download; neither fits the JSON client here without shaping the whole surface around them. |
| **Meetings and call recordings** | Cursor-paginated rather than limit/offset (the only endpoints in the app's scope that are), and call-recording creation is rate limited to 1 request/second and gated on plan (`billing_error` / `quota_exceeded`). |
| **Comments and threads** | `POST /v2/comments` requires an explicit `author` workspace-member id — there is no "as the API token" mode — so every use needs a member lookup first. Left out until there is a use case that makes that worth the extra call. |
| **Webhooks CRUD** | Webhook subscriptions belong to a trigger surface, not to an action surface. The third OpenAPI document (`/openapi/webhooks`) describes the delivered event payloads and is the right input for that work when it happens. |
| **SCIM** (`/v2/scim/…`) | Identity provisioning for enterprise SSO. A different product surface with a different audience. |
| **Attribute / object / list *writing*** (create an attribute, create an object, create a list, create select options and statuses) | Schema migration, not data integration. Creating an object can hit a plan ceiling (`quota_exceeded`), and slugs are permanent enough that doing it from a workflow is usually a mistake. The read side of all of it *is* shipped, because every write action needs it. |

## Icon

`assets/icon.svg` is **Attio's own mark**, not a drawing. n8n's `nodes-base` has no Attio node, so
there was no upstream copy to take; it was fetched from Attio's own asset CDN, linked from the
navigation on attio.com:

```
https://a.storyblok.com/f/234930/18x18/cfb7753a31/attio.svg
```

The two paths are verbatim, including Attio's brand near-black `#232529` stroke. The only edit is the
addition of `role="img" aria-label="Attio"` for accessibility. Run `deno task fmt`, never bare
`deno fmt` — the latter reformats `assets/` and would rewrite the vendor paths.

## Layout

```
attio/
├── index.ts                  # AppDefinition: 29 actions, 1 auth, 2 health checks
├── lib/client.ts             # base URL, envelopes, pagination, error taxonomy
├── lib/values.ts             # the attribute-value contract — read this one first
├── auth/api-key.ts           # bearer token; sign / test / afterConnect
├── health/service.ts         # status.attio.com, narrowed to the Attio Cloud component
├── health/quota.ts           # declared unavailable, with the evidence
├── actions/*.ts              # 29 actions
└── tests/                    # 200 tests: one file per action, plus lib/auth/health/index
```

## Validation

From this directory, inside the `api` container:

```bash
deno task check
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
deno task test
```

Then the pack auditor, from `packages/apps`:

```bash
deno run --no-check -A _tools/audit.ts attio
```
