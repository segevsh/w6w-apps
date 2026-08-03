# Close

Close CRM leads, contacts, opportunities, activities, tasks and org metadata, on the **Close API
v1**.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 21
- **Egress allowlist** — `api.close.com`
- **Website** — https://close.com
- **API docs** — https://developer.close.com/api
- **OpenAPI spec** — https://api.close.com/api/openapi.json

## The rename: close.io is gone, and the old docs link is dead

Close was founded as **Close.io** and rebranded to **Close.com**. Anything still pointing at the old
domain is stale, including our own app-candidate list.

**Verified 2026-08-03:** `http://developer.close.io/` returns a **301 Moved Permanently** to
`https://developer.close.com/`. It is a redirect, not a mirror — there is no separate close.io
documentation to build from any more.

| Was                              | Is now                            |
| -------------------------------- | --------------------------------- |
| `http://developer.close.io/`      | https://developer.close.com/      |
| `api.close.io`                    | `api.close.com`                   |

> **Note for whoever maintains the candidate list:** our entry for this app cites
> `http://developer.close.io/`. That link 301s. It should be updated to
> https://developer.close.com/api.

The rename is not quite complete on Close's side either, which is worth knowing because it shows up
in payloads rather than URLs: the Call activity's `source` field still accepts the literal string
`"Close.io"` as one of its two documented values. That fossil is handled in `actions/log-call.ts`.

### Where the documentation actually lives now

Close publishes three surfaces, and this app was built against all three because none alone is
sufficient:

1. **Prose docs** — https://developer.close.com/api. Authoritative, and the only place several
   behaviours are documented at all.
2. **Machine-readable OpenAPI** — https://api.close.com/api/openapi.json (158 paths, `servers[0].url`
   = `https://api.close.com/api/v1`). Close labels it **experimental with incomplete coverage**, and
   that is accurate — several request bodies are typed as bare "Any type", and the Search API is
   missing from it entirely. Excellent for enumerating real paths and parameter names; not
   sufficient on its own.
3. **`llms.txt` page index** — https://developer.close.com/llms.txt. Every doc page is also served as
   raw markdown by appending `.md` to its URL, which is the fastest way to read the real content.

Two claims in this README come from the OpenAPI document, two from prose, and several from probing
the live API. Each is attributed where it appears.

## Auth — HTTP Basic with an empty password

Close uses HTTP Basic, and the API key goes in the **username** position with **nothing** in the
password position. This is unusual enough to be the single most likely thing to get wrong, so here
is Close's own wording, verbatim:

> "send your HTTP requests with an Authorization header that contains the word Basic followed by a
> space and a base64-encoded string composed of an api key followed by a colon. **The API key acts as
> the username and the password is always empty.**"

and its own worked example:

```bash
curl https://api.close.com/api/v1/me/ -u yourapikey:
```

> "Notice the ':' at the end of the api key."

which produces exactly:

```
Authorization: Basic eW91cmFwaWtleTo=
```

because base64 of `yourapikey:` is `eW91cmFwaWtleTo=`.

**So the encoded payload is `${apiKey}:` — the trailing colon is required.** `base64("key")` without
it is a different string and Close rejects it. `tests/auth/api-key.test.ts` pins the hook against
Close's own published vector above, and separately asserts that the colon-less encoding is *not*
what the hook produces.

Close's OpenAPI document agrees independently: its `ApiKeyAuth` scheme is
`{"type": "http", "scheme": "basic"}`, described as "Use your API key as the username and leave the
password empty."

### Why `type: "basic"` and one field

The credential is conceptually an API key, but the spec's `ApiKeyConfig` can only say "put this
value, with this prefix, in this header/query/body slot" — it cannot express "base64 the value with a
colon appended". Declaring `type: "apiKey"` would therefore describe a wire format this app does not
use. `type: "basic"` plus an explicit `sign` hook is the accurate description.

There is deliberately **one** field rather than the usual username/password pair: the password is not
a secret the user has, it is fixed empty by the protocol, so prompting for it would only invite
someone to type something wrong.

Get a key at **Close → Settings → Developer → API Keys**. A key is scoped to one user/organization
pair and carries exactly that user's permissions.

**OAuth 2.0 also exists** (`https://app.close.com/oauth2/authorize/` /
`https://api.close.com/oauth2/token/`, scopes `all.full_access` and `offline_access`). We ship the
API key because it needs no app registration, redirect URI or client secret. Add OAuth as a second
`AuthDefinition` if a multi-org listed integration is ever needed.

## Conventions this app encodes

Four Close-specific behaviours are handled centrally so no individual action has to remember them.

**Trailing slashes are load-bearing.** Every path ends in `/` — `/lead/`, `/lead/{id}/`,
`/activity/note/`. Close is a Django application and its router matches the slashed form; dropping it
earns a redirect at best.

**Offset pagination, `data` + `has_more`.** Per Close's pagination page: "The response contains two
fields: `data` containing the list of objects and `has_more`, which indicates if you reached the last
page." Every list action exposes `_limit` / `_skip` / `_fields` through one shared `PAGE_PARAMS`
fragment. Close caps how far `_skip` may go per resource, so deep pagination fails rather than
crawling — its documented workaround (narrow by a `date_created` range) is stated in the param hint
instead of being discovered at 3am. The Search action is the exception: it is **cursor**-paginated
with a `{data, cursor, count?}` envelope.

**PUT is PATCH.** "PUT requests function as patches (partial updates)." Every update action drops
`undefined` fields before sending, so an omitted param cannot blank a field the caller never
mentioned, while an explicit `null` still clears one.

**Custom fields are flat, not nested.** They are set as top-level `custom.<FIELD_ID>` keys. Close
states that both the nested `custom` dict and the by-name `custom.FIELD_NAME` form are "deprecated
and will be removed from the API", so this app only ever emits the flat, id-keyed form. Use **List
Custom Fields** to discover the `cf_...` ids.

## Actions

21 actions, each mapping 1:1 to an endpoint confirmed in Close's live documentation.

### Leads (6)

| Action | Endpoint |
| ------ | -------- |
| `list-leads` | `GET /lead/` |
| `get-lead` | `GET /lead/{id}/` |
| `create-lead` | `POST /lead/` |
| `update-lead` | `PUT /lead/{id}/` |
| `delete-lead` | `DELETE /lead/{id}/` |
| `search` | `POST /data/search/` |

A Lead is the company/account object — contacts, opportunities, tasks and activities must all be
children of one. `create-lead` accepts nested `contacts` and `addresses`; opportunities, tasks and
activities must be posted separately.

`list-leads` deliberately exposes **no** `query` param. Close's current docs for `GET /lead/` declare
only `_limit`, `_skip` and `_fields`, and the Leads page redirects filtering elsewhere: "To easily
find Leads that match specific conditions, use the Advanced Filtering API." Adding an undocumented
parameter would be inventing surface, so searching lives in its own action.

### Search — the Advanced Filtering API (included, with a caveat)

`POST /data/search/` is **real and included**. It is documented in prose at
https://developer.close.com/api/resources/advanced-filtering, which states the endpoint verbatim as
"a POST request to `/api/v1/data/search/`", but it is **absent from Close's OpenAPI document** — that
document lists 158 paths and this is not one of them. Both facts checked 2026-08-03. The prose docs
win, since Close labels its own spec incomplete.

Its `query` is a recursive tree (`and`/`or` nodes wrapping `object_type`, `field_condition` and
`has_related` leaves), so it is passed through as a raw JSON param rather than half-modelled into
flat dropdowns that could only build the trivial cases.

### Contacts (3)

`list-contacts` (`GET /contact/`, filterable by `lead_id`), `create-contact` (`POST /contact/`),
`update-contact` (`PUT /contact/{id}/`).

On update, `emails`, `phones` and `urls` are **whole-list replacements**, not merges — sending one
address drops the others. The param hints say so.

### Opportunities (3)

`list-opportunities` (`GET /opportunity/`), `create-opportunity` (`POST /opportunity/`),
`update-opportunity` (`PUT /opportunity/{id}/`).

`value` is an **integer in the currency's minor unit** — cents for USD, so `50000` is $500.00. Close
states "Revenue fields are in cents" on its Reporting page, and `value` is typed as a plain integer
with no decimal component anywhere.

Worth flagging honestly: **Close's own create-opportunity example is internally inconsistent about
this.** It POSTs `"value": 500` and shows a response with `"value": 50000` and
`"value_formatted": "$50 monthly"` — a request and response that cannot be from the same call, and a
formatted string matching neither reading. What *is* self-consistent in that response is the
arithmetic (`annualized_value` 600000 = 50000 x 12; `expected_value` 45000 = 90% of 50000). Confirm
against the response's own `value_formatted` / `value_currency`, which Close renders itself.

`status_type` (`active` / `won` / `lost`) is Close's fixed grouping over whatever the organization
has named its stages — the filter to use when stage names are not yours to rely on.

### Activities (3)

`list-activities` (`GET /activity/`), `create-note` (`POST /activity/note/`), `log-call`
(`POST /activity/call/`).

`list-activities` reads the **unified** feed, where every type arrives interleaved and tagged with
`_type`. Close restricts several filters to single-lead queries — `user_id`, `contact_id` and `_type`
"can only be used for listing activities on a single lead" — so filtering by type without a `leadId`
silently returns the unfiltered feed. The action logs a warning when it sees that combination rather
than letting it look like a bug in Close.

**`POST /activity/email/` is deliberately NOT shipped.** It exists, but its `status` field is not a
passive label: an email activity created with an outbox status is a request to **actually send mail**
through the connected account. That makes "log what happened" and "send a message to a customer" the
same call distinguished only by one string, which is far too easy to trigger by accident. Sending
email deserves its own action with unmistakable naming and its own contract; when that is wanted, add
it explicitly rather than folding it in here.

`log-call` records an externally-placed call and does **not** dial anyone. Its `source` is pinned to
`External` rather than exposed, because the only other documented value — `"Close.io"` — asserts the
call went through Close's own dialer, which is never true of a call logged after the fact.

### Tasks (3)

`list-tasks` (`GET /task/`), `create-task` (`POST /task/`), `update-task` (`PUT /task/{id}/`).

Three documented traps, all handled:

1. **`GET /task/` does not list all tasks by default.** "When not filtering by `_type`, only `lead`
   tasks are returned." Missed calls, voicemails and incoming emails are invisible until you ask for
   `all`. The `type` param offers `all` first and says so.
2. **`due_date` is deprecated** — "should not be used". The live field is `date` ("when the task is
   actionable"), and this app filters and writes `date` only. The endpoint still *accepts*
   `due_date__*`, which is precisely why building against it is a trap.
3. **Only two types can be created.** "Currently only tasks of type `lead` and `outgoing_call` can be
   created." The other seven are generated by Close in response to real events, so the create form
   offers exactly those two.

Note also that Close auto-deletes archived tasks of some types after a while — completing a task is
not the same as keeping a permanent record.

### Organization metadata (3)

`list-users` (`GET /user/`), `list-statuses` (`GET /status/lead/` or `/status/opportunity/`),
`list-custom-fields` (`GET /custom_field_schema/{object_type}/`).

These exist to make the other 18 usable rather than as ends in themselves — every `user_...`,
`stat_...` and `cf_...` id the write actions take is per-organization and undiscoverable otherwise.

`list-custom-fields` uses the **schema** endpoint on Close's own recommendation ("We recommend this
endpoint for fetching Custom Fields available in your organization"), because it returns regular
**and shared** fields together; the per-type `/custom_field/lead/` endpoint omits shared fields,
which is exactly the gap that produces a "why isn't my custom field here" bug.

`GET /me/` is not exposed as an action: the auth `test` hook and the quota health check already
exercise it, and the connected user is on the Connection label.

## Health checks

### `service` — Close platform status (real probe)

Reads `https://status.close.com/api/v2/summary.json`, an Atlassian Statuspage, unauthenticated and
unsigned. Reports the rollup indicator plus per-component detail, which matters for a CRM whose
telephony, email sending and API are separately reported — a workflow that only calls the REST API is
unaffected by a calling outage.

**The status endpoint was verified to be a genuine API before being probed**, because a JSON-shaped
path returning 200 proves nothing on a host with an HTML catch-all. Tested 2026-08-03:

| Path | Result |
| ---- | ------ |
| `/api/v2/status.json` | **200**, `application/json`, 227 bytes, real payload with `page.id` = `8vgwlwbg3zbc` |
| `/api/v2/summary.json` | **200**, `application/json`, 8640 bytes |
| `/api/v2/notareal.json` | **404, zero bytes** |
| `/api/v2/statusz.json` | **404, zero bytes** |

Distinct real responses, hard 404s for invented siblings, and a genuine Statuspage identifier. Not a
catch-all.

`status.close.com` is **not** on the app's egress allowlist — the check widens egress for its own
worker only, which is safe precisely because it is never signed. A failing status page reports
`unknown`, never `down`: a status API that is itself broken says nothing about the vendor.

### `quota` — API rate-limit headroom (real probe)

Probes `GET /me/` — the same scope-free call the auth `test` uses — and reads the rate-limit headers.

Close documents a `RateLimit` header carrying `limit`, `remaining` and `reset` (seconds remaining, as
a decimal), formatted as `RateLimit: limit=100, remaining=50, reset=5`. **A live request confirmed it
is genuinely emitted** (2026-08-03):

```
ratelimit: limit=100; remaining=100; reset=1
ratelimit-limit: 100
ratelimit-remaining: 99
ratelimit-reset: 1
```

Two details found by looking rather than assuming, both handled in `health/quota.ts`:

1. **The live separator is `;`; the documented one is `,`.** The parser accepts either — trusting the
   documented comma alone would silently yield no readings against the real server.
2. **Discrete `ratelimit-*` headers are also present** and are used as a fallback. The legacy
   `x-rate-limit-*` trio is described by Close as replaced, so it is not read.

Two honest limits on what this reading means:

- **Close meters per endpoint _group_, not globally** — "GETs to /api/v1/lead/ and POSTs/PUTs to
  /api/v1/activity/ may be counted as two different API groups" — and the header reports "the limit
  it's closest to hitting". So this is headroom for the group `/me/` belongs to. The bucket is named
  `endpoint-group` rather than implying a global budget.
- **A second, invisible ceiling exists**: a per-Organization limit roughly 3x the per-key one, shared
  across every key in the org. Nothing in the response distinguishes which limit a reading refers to,
  so this check does not pretend to.

`severity: "informational"` — running low is worth showing and never worth failing a verdict over.

### Credential check

Free: the runtime derives an `auth:api-key` check from the Auth `test` hook, which probes `GET /me/`.
That endpoint is the right liveness probe precisely because it needs no permission beyond existing —
probing a resource endpoint would report a working credential as broken whenever the key's user lacks
that particular grant.

## Icon

`assets/icon.svg` is Close's own application mark, fetched verbatim from
https://app.close.com/icon.svg (the `<link rel="icon" type="image/svg+xml">` the Close web app
serves). n8n has no Close node, so there was no upstream mark to port. The file is byte-identical to
what that URL serves; `deno task fmt` is scoped to source directories and does not touch it.

## Development

```sh
deno task test    # 147 unit tests
deno task check
deno task lint
deno task fmt
```

Every action, the auth method, both health checks, the entry module and the client have unit tests
driven by a mocked `HookContext` — no network, no credentials.

## Links

All verified to return HTTP 200 on 2026-08-03.

- **Vendor site** — https://close.com
- **Developer portal** — https://developer.close.com/
- **API docs (used to build this app)** — https://developer.close.com/api
- **OpenAPI spec** — https://api.close.com/api/openapi.json
- **API key authentication** — https://developer.close.com/api/overview/api-key-authentication
- **Rate limits** — https://developer.close.com/api/overview/rate-limits
- **Pagination** — https://developer.close.com/api/overview/pagination
- **Advanced Filtering (Search API)** — https://developer.close.com/api/resources/advanced-filtering
- **Docs page index (markdown)** — https://developer.close.com/llms.txt
- **Status page** — https://status.close.com
- **API keys & OAuth (help centre)** — https://help.close.com/integrations/api-keys-oauth
- **GitHub org** — https://github.com/closeio
- **Official Python client** — https://github.com/closeio/closeio-api

> The GitHub org is still named `closeio` after the original close.io domain — another live fossil of
> the rename, and not a stale link.
