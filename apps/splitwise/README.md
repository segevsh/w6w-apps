# Splitwise

Shared-expense tracking: read and write expenses, groups, friends and comments over the
**Splitwise API v3.0** (`secure.splitwise.com/api/v3.0`).

26 actions, one auth method, three health checks.

Everything here was verified on **2026-08-11** against Splitwise's own **OpenAPI 3.0.1 document** —
the one `https://dev.splitwise.com/` (630,436 bytes, md5 `0bd7a58e43c431aabc65bc36b16173cd`) embeds
in its Redoc `__redoc_state` payload, `info.version` `3.0.0`, 27 paths, one server
(`https://secure.splitwise.com/api/v3.0`) — plus live unauthenticated probes against
`secure.splitwise.com` and `status.splitwise.com`. Nothing came from a third-party integration
directory or from one of the community SDKs the vendor links to.

**The reference is alive.** No operation carries `deprecated: true`, and a scan of the whole
document for `deprecat|depreciat|sunset|retire|end of life|will be removed|no longer supported`
matches **zero** times. Asked the sharper way — *which version's page lacks a deprecation banner?* —
the answer is that there is only one version, and only one that answers:

| Path | Status | Body |
|---|---|---|
| `/api/v1.0/get_current_user` | 404 | site HTML, 3,085 B |
| `/api/v2.0/get_current_user` | 404 | site HTML, 3,085 B |
| **`/api/v3.0/get_current_user`** | **401** | **`{"error":"Invalid API Request: you are not logged in"}`** |
| `/api/v3.1/get_current_user` | 404 | site HTML, 3,085 B |
| `/api/v4.0/get_current_user` | 404 | `{"errors":[{"status":"404","title":"Not Found"}]}` |

All the HTML 404s are byte-identical to a nonsense path (md5 `e7b1bed2c96ce7b0d65819c2e09a9517`).
`v4.0` is the odd one: it is a **routed but empty namespace** — every path under it, including
nonsense ones, answers that JSON 404 with a JSON:API-shaped envelope unlike anything v3.0 sends.
Reading "v4.0 returns structured JSON, so it must be the new API" would be exactly wrong.

---

## The five things most likely to cost you a day

### 1. HTTP 200 is not success, and the vendor says so six times

Splitwise answers **HTTP 200 with a populated `errors` object** when a write fails. Its own reference
repeats the warning on `create_expense`, `update_expense`, `delete_expense`, `undelete_expense`,
`undelete_group`, `add_user_to_group`, `remove_user_from_group` and `delete_friend`:

> **Note**: 200 OK does not indicate a successful response. The operation was successful only if
> `errors` is empty.

> **Note**: 200 OK does not indicate a successful response. You must check the `success` value of the
> response.

A client that trusts `res.ok` silently reports a rejected expense as created — and the workflow step
downstream reads `id: undefined` off it. `lib/client.ts` inspects **every** 200 for both channels
(`errors` non-empty, or `success` present and not `true`) before returning, and no action in this app
reaches a response without going through it. There is a test that derives the set of actions using
the client from source, so a new action that hand-rolls a request fails the suite rather than
shipping.

### 2. `errors` has three shapes, and the obvious check inverts

Reading the vendor's schemas end to end, the failure payload is any of:

```jsonc
{"error":  "Invalid API Request: you are not logged in"}   // string, SINGULAR key — the 401, only
{"errors": {"base": ["Unrecognized parameter `bad_parameter`"]}}  // object of field -> messages
{"errors": ["That group is not deleted"]}                  // bare ARRAY — undelete_group
```

The third is the trap, because in JavaScript **`[]` and `{}` are both truthy**:

- `if (body.errors)` reports every *successful* `undelete_group` as a failure (it returns
  `errors: []` on success).
- `if (body.errors?.base)` misses the array form entirely and reports every *failed* one as a
  success.

`collectErrors()` flattens all three to `string[]` and decides emptiness on that. It also keeps the
field name when it is not `base` — `add_user_to_group` and `create_friends` key by the offending
field, and "email: is invalid" is a different fix from a generic rejection.

### 3. Shares are flattened, must balance, and the failure mode is undocumented

This is the app's design problem, and it is worked through in `lib/shares.ts`.

**The model.** An expense splits across users, and each participant carries *two independent*
amounts: `paid_share` (what they put in) and `owed_share` (what they are on the hook for). A $25
brunch one person paid for and two people split is `paid = [25, 0]`, `owed = [13.55, 11.45]`. The
difference per user is the debt Splitwise records, and it hands back the settlement it derived as
`repayments`. That two-column form is what makes "three people paid parts of a bill four people ate"
expressible at all — the equal-split form cannot say it.

**The wire form is not an array.** Splitwise takes a JSON object with flattened, index-embedded keys:

```jsonc
{ "group_id": 0, "cost": "25.00", "description": "Brunch",
  "users__0__user_id": 54123, "users__0__paid_share": "25.00", "users__0__owed_share": "13.55",
  "users__1__email": "neu@example.com", "users__1__first_name": "Neu",
  "users__1__last_name": "Yewzer", "users__1__paid_share": "0", "users__1__owed_share": "11.45" }
```

Two underscores each side of the index. The same encoding appears on `create_group` and
`create_friends` with a different property set. This app exposes an ordinary array of share objects
and does the translation in one module, so the convention is written once; a test asserts no action
hand-builds a `users__` key.

**Identity has exactly two forms.** Per the reference, each share is identified by `user_id`, **or**
by `email` *and* `first_name` *and* `last_name`. An email on its own is not a documented third form,
so it is rejected here rather than sent and hoped for — the error points at **List Friends**, which
is how you turn an address into a `user_id`. `user_id` wins when both are given: an email nobody owns
makes Splitwise mint an *invited placeholder user* rather than address the person you meant.

**Both columns must total the cost** — and here is what a caller actually needs to know:

> **The reference does not document what Splitwise does when the shares do not sum to the cost.** The
> request schema states no such constraint, the endpoint description states no such constraint, and
> no example shows the failure. What *is* documented is the failure **channel**: `create_expense`
> answers 200 with a populated `errors` object. We had no Splitwise credential with which to measure
> the actual behaviour or message, and this README does not describe one nobody observed.

So this app takes the conservative side of an unknown. `assertBalanced()` checks both columns
client-side and refuses to send an unbalanced expense, naming both totals — which turns "200 OK, and
an `errors` object you have to know to look inside" into a precise message. Because the underlying
behaviour is *unverified* rather than *known-fatal*, the guard is overridable:
**`allowUnbalancedShares`** sends the request untouched, so a caller who needs to find out what
Splitwise really does can, and gets the vendor's own answer back through the same soft-failure path
as every other write. (Identity is still enforced under the override — it is about the sums, not
about sending a share Splitwise cannot attribute.)

**The arithmetic is integer.** Splitwise types every amount as a *string*, and the comparison is done
in minor units, because floating-point addition does not agree with a ledger: an even three-way split
of a $30.30 bill is `10.10 + 10.10 + 10.10 === 30.299999999999997` (measured), which a float check
would reject. What makes it worth guarding rather than shrugging at is that it does not fail
*uniformly* — `33.33 + 33.33 + 33.34` comes out at exactly `100` — so a float implementation ships
green and breaks on somebody's grocery run. Both cases are pinned in `tests/lib/money.test.ts`.

Finally, `update_expense` makes the share list **all-or-nothing**:

> If any values is supplied for `users__{index}__{property}`, _all_ shares for the expense will be
> overwritten with the provided values.

Supplying one entry does not edit one participant's numbers — it replaces the entire split with a
one-person split, silently dropping everybody else. Read the current shares with **Get Expense**,
change what you mean to change, and send them all back. The action logs a `warn` every time.

### 4. Two endpoints answer with no credential at all

Measured on 2026-08-11, unauthenticated:

| Endpoint | Status | Body |
|---|---|---|
| `GET /api/v3.0/get_currencies` | **200** | the full currency list |
| `GET /api/v3.0/get_categories` | **200** | the full category tree |
| `GET /api/v3.0/get_current_user` | 401 | `{"error": "…not logged in"}` |
| `GET /api/v3.0/get_groups` | 401 | identical |
| `GET /api/v3.0/get_friends` | 401 | identical |
| `GET /api/v3.0/get_notifications` | 401 | identical |
| `POST /api/v3.0/create_expense` | 401 | identical |

So neither public endpoint can ever be the credential probe: a Connection whose key was dropped on
the floor would pass against either, forever. They are named in `lib/client.ts#PUBLIC_ENDPOINTS` —
deliberately outside `auth/`, so a test can assert neither string appears anywhere in the auth or
health modules — and the two actions that call them declare `requiresAuth: false`, which is honest
and lets a workflow validate a currency code before anyone has connected.

### 5. The documented OAuth 2 token endpoint does not route

The reference declares two security schemes. The second, `OAuth`, is an authorization-code flow with
`authorizationUrl: /oauth/authorize`, `tokenUrl: /oauth/token` and `scopes: {}`. Both were probed,
resolved against the host root **and** against the documented server:

| URL | Method | Result |
|---|---|---|
| `secure.splitwise.com/oauth/authorize` | GET | **302 → `/login`** — routed |
| `secure.splitwise.com/api/v3.0/oauth/authorize` | GET | 404, site HTML |
| `secure.splitwise.com/oauth/token` | GET | 404, site HTML |
| `secure.splitwise.com/oauth/token` | **POST** | **404, site HTML, md5 `e7b1bed2c96c…`** |
| `secure.splitwise.com/api/v3.0/oauth/token` | POST | 404, site HTML |
| `www.splitwise.com/oauth/token` | POST | 404, site HTML |

The POST was repeated with a form body, a JSON body, `Accept: application/json` and HTTP Basic client
credentials. Every variant returned the same 3,085-byte page, **byte-identical to the 404 for a
nonsense path on the same host**. That is routing, not authentication.

What *does* answer — all `401 Invalid OAuth Request`, 21 bytes — is `/oauth/request_token`,
`/oauth/access_token` and `/api/v3.0/get_access_token`: the **OAuth 1.0a** endpoint names, left over
from the flow Splitwise's own 2013 blog post describes and which the current reference no longer
documents.

**So no `oauth2` method is declared.** Shipping one would render a Connect button that walks a user
through Splitwise's real consent screen and then dies at the token exchange against a 404. This is a
config block rather than code, and adding it is four lines once the live token URL is known — the
evidence is recorded in `auth/api-key.ts` so the decision gets revisited rather than rediscovered.
A test asserts `apiKey.oauth2` stays `undefined`.

## Two smaller ones

- **`group_id` silently swallows `friend_id`.** "If provided, only expenses in that group will be
  returned, and `friend_id` will be ignored." No error — the friend filter simply evaporates, and the
  result looks like a complete answer to a question nobody asked. **List Expenses** logs a `warn` when
  both are set.
- **`group_id: 0` does not round-trip.** You *send* `0` to create an expense outside any group; it
  *reads back* as `group_id: null`. And in **List Groups**, `0` appears as a synthetic group holding
  every non-group expense. Three spellings of "no group", none of which match.

## Auth

**API Key** (`api-key`, `type: "bearer"`), `Authorization: Bearer <key>`, from
`https://secure.splitwise.com/apps`.

> The API key is an access token for your personal account, so keep it as safe as you would a
> password.

That is the whole security model, and it is worth reading twice: a Splitwise API key is **not** a
scoped integration token. It is unconditional access to one human's account — every group, every
friend, every expense — and Splitwise offers no way to narrow it. The only mitigation is regenerating
the key, which invalidates the old one. It is also why **no health check in this app is signed**
(there is a test): every question the health surface asks is answerable without spending the
credential it monitors.

### The probe is `GET /get_current_user`

Chosen by reading the response schema and measuring the wire, not by its name:

1. **It requires a credential** — 401 unauthenticated (measured). That rules out `get_currencies` and
   `get_categories`, which do not (§4 above).
2. **It needs no scope** — Splitwise has no scopes (`scopes: {}` in the OAuth flow, and an API key is
   unconditional), so there is no narrower-credential case for it to fail on, unlike `get_groups` or
   `get_expenses` which can legitimately return nothing.
3. **It returns no credential material** — the `current_user` schema is `user` (`id`, names, `email`,
   `registration_status`, `picture`) plus `notifications_read`, `notifications_count`,
   `notifications` (boolean preferences), `default_currency`, `locale`. No API key, no token, no
   password anywhere in it. That is what separates it from Mailjet's `/apikey`, Follow Up Boss's
   `/me` and ElevenLabs' `/v1/user`, which hand the caller's own live secret back.

### One 401 body for four different faults

Measured on 2026-08-11, the **byte-identical** 54-byte body
`{"error":"Invalid API Request: you are not logged in"}` under HTTP 401 comes back for all of:

- no `Authorization` header at all
- `Authorization: Bearer <syntactically valid but fake key>`
- `Authorization: Bearer ` (empty)
- `Authorization: Token abc` (wrong scheme)

There is no way — from the status code *or* the body — to tell "the credential never reached the
request" from "the key was revoked". `test` says so rather than guessing, because guessing sends
people to regenerate a perfectly good key.

`afterConnect` publishes a **name and user id, and deliberately not the email**. A connection label is
rendered in lists, embedded in run records and copied into logs; putting a personal address there
spreads PII across surfaces that never needed it, for an ergonomic gain a name already delivers.

## Actions

| Resource | Actions |
|---|---|
| user | `get-current-user`, `get-user` |
| group | `list-groups`, `get-group`, `create-group`, `delete-group`, `undelete-group`, `add-user-to-group`, `remove-user-from-group` |
| friend | `list-friends`, `get-friend`, `create-friend`, `delete-friend` |
| expense | `list-expenses`, `get-expense`, `create-expense-equal`, `create-expense-by-shares`, `update-expense`, `delete-expense`, `undelete-expense` |
| comment | `list-comments`, `create-comment`, `delete-comment` |
| activity / reference | `list-notifications`, `list-currencies`, `list-categories` |

### Why Create Expense is two actions

The reference models `create_expense`'s body as a `oneOf` of two schemas with different required
sets. Collapsing them into one action would mean a form where half the fields are required only
sometimes and the two halves are mutually exclusive — which no `required` flag can express. Two
actions each state their real contract.

`create-expense-equal` carries three constraints the shape does not show:

- **`split_equally` must literally be `true`** — its schema is `{type: boolean, enum: [true]}`. There
  is no `false` meaning "by shares", so it is never exposed as a parameter.
- **A group is mandatory, and `0` is not a group.** "You may either split an expense equally (only
  with `group_id` provided)." Group 0 is Splitwise's bucket for expenses belonging to none, so there
  is nobody to divide among; the action rejects it before spending a request and points at the
  by-shares form.
- **The authenticated user is the payer.** "When splitting equally, the authenticated user is assumed
  to be the payer." If somebody else paid, that is the by-shares action with their `paid_share` set
  to the full cost.

### Idempotency

Splitwise offers **no idempotency key on any endpoint**. So the flags are decided per action and
tested as a partition of the `perform` set — a new action in neither list fails the suite:

- **`idempotent: false`** — `create-expense-equal`, `create-expense-by-shares`, `create-group`,
  `create-friend`, `create-comment`, `add-user-to-group`. A retry is a second real record: a
  duplicate expense that counts against everyone's balance, a duplicate comment in a thread people
  read, a second invited placeholder user, a second group with the same name. (`add-user-to-group`
  converges in its `user_id` form but not its email form; one action covers both, so the honest flag
  for the pair is `false`.)
- **`idempotent: true`** — `delete-group`, `undelete-group`, `remove-user-from-group`,
  `delete-friend`, `update-expense`, `delete-expense`, `undelete-expense`, `delete-comment`. These
  converge, and saying so is what lets the runtime recover from a dropped connection.

### Notes on individual actions

- **`list-expenses`** is the only paged endpoint: offset-based, `limit` defaulting to the vendor's own
  modest **20**, no total in the body and no `Link` header — page until a page comes back short.
  Deleted expenses are *included*, carrying `deleted_at`, so a workflow acting on every row acts on
  tombstones. Of the four date filters, `updated_after` is the one a polling workflow wants (editing
  an old expense does not move its date); the reference declares it with
  `format: "update-time"`, which is not an OpenAPI format and is plainly a typo for `date-time` —
  its three siblings all say `date-time`, and it is sent as one.
- **`list-notifications`** is the closest thing to a change feed; Splitwise publishes no webhooks and
  this app declares no triggers. Its `limit` **defaults to `0` meaning "as many as possible"** — the
  opposite of every other paging default here — so the field is left blank rather than prefilled. The
  numeric `type` is passed through unmapped, because the reference calls its own 0–15 table
  "incomplete" and says types may be added without warning; a mapping that swallowed an unknown code
  would be worse than the number.
- **`list-categories`** returns the raw parent tree *and* a flattened `subcategories` list carrying
  `parent_id` / `parent_name`. "When creating expenses, you must use a subcategory, not a parent
  category" — and parent ids look exactly like child ids, so sending `1` (Utilities) is an easy
  mistake with an opaque rejection.
- **`list-comments`** splits out `user_comments`. Splitwise mixes its own **System** audit entries
  into the thread, rendered as prose ("John D. updated this transaction: - The cost changed from
  $6.99 to $8.99"), and a notifier treating every row as human-written will post those.
- **`create-friend`** exposes a documented inconsistency. The request schema lists `user_email`,
  `user_first_name`, `user_last_name` and then declares `required: ["email"]` — naming a property
  **that does not exist in its own schema**. This app sends `user_email`, following the `properties`
  block and the prose (both `user_`-prefixed) and treating the lone `required` entry as a typo. If
  Splitwise ever rejects the call for a missing `email`, that is the line to change, which is why it
  is called out rather than buried.
- **`create-group`** has the mirror of that problem: the vendor's worked example sends `users__1__id`
  while its prose says the property is `user_id`. The prose wins — `id` appears nowhere else in the
  API, and the example is the one of the two that no schema backs.
- **`delete-group`** destroys more than it says on the tin: "Destroys all associated records
  (expenses, etc.)". Reversible with `undelete-group`, but the blast radius is the group's whole
  expense history. It logs a `warn`.
- **`remove-user-from-group`** "does not succeed if the user has a non-zero balance" — and that
  arrives as a **200**, not an HTTP error. It surfaces as a thrown error carrying Splitwise's own
  message rather than a silent no-op that looks like success.
- **`delete-comment`** is the one delete in this API that returns its *subject* rather than a flag,
  so it passes the deleted comment through.
- **`get-group`** returns `invite_link` (`https://www.splitwise.com/join/abQwErTyuI+12`), a URL that
  lets **anyone holding it** join the group. It is not a credential and is returned verbatim —
  Splitwise's own apps display it — but treat a run record containing one accordingly.

## Health checks

Three declared checks plus the derived `auth:api-key`, and **none of them is signed**.

### `service` — Instatus, and the Statuspage-shaped path is a trap

Splitwise publishes at **`status.splitwise.com`**, an **Instatus** page. Verified three ways:

| Path | Status | Bytes | Content type |
|---|---|---|---|
| `/v2/components.json` | 200 | 443 | `application/json` |
| `/summary.json` | 200 | 80 | `application/json` |
| `/definitely-not-real-zzz.json` | **404** | 7,001 | `text/html` |
| `/index.json` | 404 | 7,001 | `text/html` |
| `/status.json` | 404 | 7,001 | `text/html` |

`/index.json` — Better Stack's path, the one Raindrop turned out to answer — and `/status.json` were
both probed by hand rather than ruled out by the page's look. Both 404.

**The trap:** `https://status.splitwise.com/api/v2/summary.json` answers **200 `application/json`**
and is **byte-identical** to `/summary.json` (both md5 `1effababdc98…`, 80 bytes). It is an Instatus
alias, *not* the Atlassian schema. A check that assumed Statuspage because that path returned 200
JSON would read `status.indicator`, find `undefined`, and report `unknown` forever while the page
said everything was fine. Separately, `splitwise.statuspage.io` **does** exist and serves the
127,697-byte Atlassian marketing page — the known unclaimed-host signature — which is exactly why the
probe is not pointed there.

The check reads **`/v2/components.json`** and takes its verdict from the **`API`** component alone —
the surface every action here calls. `Website` and `Splitwise Pay` are reported in `components` for
attribution but never move the verdict; a broken marketing site must not fail every workflow. If the
`API` component ever disappears (renamed, regrouped) it reports `unknown` naming what it did find,
rather than silently falling back to another component. `/summary.json` was rejected on evidence:
`page.status` is one enum for the whole company, and this pack has already measured an Instatus page
reporting `"UP"` with an incident open and identified (see `apps/manychat`).

**`description` is not state.** On 2026-08-11 all three components were `OPERATIONAL` while two
carried `"description": "One of our upstream providers is having a system outage"` — a stale operator
note from a past incident. Only `status` is read, and a test asserts that string never reaches the
report.

### `api` — because the status page reports at human speed

An unsigned `GET /api/v3.0/get_current_user`. **A JSON 401 is the PASS**: it proves DNS resolved, TLS
terminated, Cloudflare passed the request, the Rails app routed it to the v3.0 controller and the
auth filter ran. Judging by the status code would report Splitwise permanently down.

The alternatives are informative rather than uniform, because Splitwise serves its API and its
marketing site from one origin: an **HTML 404** means the version was withdrawn (`down`), a **JSON
404** means the namespace routes but the endpoint is gone (`down`, reported separately because the
distinction tells you a rewrite happened rather than a route being dropped), a **200** means the
whoami stopped requiring a credential — which the auth probe depends on — so it reports `degraded`
and says so. It widens no egress: `secure.splitwise.com` is already the app's own host.

### ~~`quota`~~ — a declared absence, at `informational` severity

Splitwise rate-limits, says so, and publishes nothing readable:

> Rate limits vary by endpoint and resource, and are subject to change at any time without notice. If
> you make too many requests in a short period, the API will respond with an `HTTP 429 Too Many
> Requests` status code.

No number, no bucket, no window, no reset. And nothing on the wire either — the full response header
set of the live 401 was captured on 2026-08-11 and carries **no `X-RateLimit-*`, no `RateLimit-*`, no
`Retry-After`**: only `date`, `content-type`, `content-length`, `cache-control`,
`content-disposition`, the Heroku NEL/`report-to`/`reporting-endpoints` trio, `referrer-policy`,
`server`, `strict-transport-security`, `vary`, `via`, four `x-` security headers, `x-request-id`,
`x-runtime`, `cf-cache-status` and `cf-ray`.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this statement would pin the app's
verdict at `unknown` permanently. The only signal that exists is the 429 itself, which
`lib/client.ts` recognises and explains — telling a caller to use a delay rather than sending them
looking for a `Retry-After` that is not there.

## Deliberately not covered

Two endpoints exist in the reference and are **not** actions here, for two different reasons.

- **`POST /update_user/{id}`** — excluded on safety grounds, not because it is unclear. Its request
  body accepts `email` and **`password`**, so an action wrapping it is an account-takeover primitive
  sitting in a workflow builder: anything that can run it can lock the owner out of the Splitwise
  account whose full-access API key it is holding. There is no automation case that needs it. This
  is a judgement, not a limitation — if you want it, it is a small file.
- **`POST /create_friends`** (bulk) — excluded as redundant. `create-friend` covers the case one at a
  time with a schema that names its properties, whereas the bulk endpoint's entire request body is a
  free-form `additionalProperties` map with no example and no required set beyond prose. Nothing
  about it is unconfirmable; it just adds a second flattened-key surface for no capability the app
  does not already have.

Also not implemented: **triggers**. Splitwise publishes no webhooks of any kind. `list-notifications`
with `updated_after` is the polling substitute, and it is the only change feed available.

Finally, worth knowing before you build on this at all — from the reference's own Terms of Use:

> *The API is not intended for commercial use, as determined by Splitwise. Specifically, the API may
> not be used in connection with any fee-based service.*
>
> Splitwise may impose conditions on the use of the Self-Serve API, including, for example,
> maintaining an active Splitwise Pro subscription.

## Icon

`assets/icon.png` — downloaded **verbatim** from `https://www.splitwise.com/apple-touch-icon.png` on
2026-08-11.

- **4,460 bytes**, md5 `41878b0394ff2e4c84253fe8705a89d2`, `image/png`, 180×180 8-bit colormap.
- A test asserts the byte count, the PNG signature and the IHDR dimensions, so both a re-export
  (which changes the size) and a redraw fail the suite.

A real vendor **SVG** was also found and byte-verified —
`https://www.splitwise.com/assets/press/logos/sw.svg`, **5,144 bytes**, md5
`f780faeb9abdbb6486fa6972a74cdc2f`, `image/svg+xml`, the file Splitwise's own API docs reference as
their `x-logo`. It is **not** used, because it is a vertical **lockup**: `viewBox="0 0 104 143"`, the
mark occupying roughly the top 104 units and the "splitwise" wordmark rendered as letterform paths
below it. That is a poor app tile, and cropping it to the mark would mean editing a vendor asset,
which the verbatim rule forbids. The 180×180 PNG *is* Splitwise's own square app icon, so it is the
better artifact as well as the untouched one. Recorded here so the next person does not re-derive it.

## Layout

```
splitwise/
├── package.json          identity: io.w6w.splitwise, network.allow = [secure.splitwise.com]
├── index.ts              entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts         API_BASE/PREFIX, the soft-failure rules, error taxonomy, PUBLIC_ENDPOINTS
│   ├── money.ts          decimal strings <-> integer minor units
│   ├── shares.ts         the share model: identity, balance, users__i__prop flattening
│   └── params.ts         shared Param fragments and vendor enums
├── auth/api-key.ts       bearer; the probe, and why OAuth 2 is absent
├── health/
│   ├── service.ts        Instatus /v2/components.json, verdict from the API component
│   ├── api.ts            unsigned reachability; a JSON 401 is the pass
│   └── quota.ts          declared absence, informational
├── actions/              26 files, one per action
├── assets/icon.png       vendor file, verbatim
└── tests/                220 assertions
```

`network.allow` is **only** `secure.splitwise.com`. `status.splitwise.com` belongs to the `service`
check's own hook allowlist, never the app's; `127.0.0.1` is not called by anything here and is
asserted absent.

## Development

Deno tasks, run from this directory (this devcontainer has no host `deno` — use the `api` service):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/splitwise && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```

`deno task validate` runs the pack auditor (`_tools/audit.ts`) against the spec. Use `deno task fmt`,
never bare `deno fmt` — the bare form rewrites `assets/` and would falsify the verbatim-icon claim
above.

The suite is 220 assertions and was checked against deliberate mutants rather than assumed to bite.
Each was applied to a scratch copy of the tree (never this checkout), with the mutation's marker
re-counted after the edit so a no-op mutator could not score an unmutated tree as a mutant, and the
run rejected unless `passed + failed` equalled the known 220:

| Mutation | Result |
|---|---|
| *(none — baseline)* | 220 passed, 0 failed |
| `softFailure(parsed)` → `softFailure(undefined)` | killed, 12 failures |
| `errors.length > 0` → `errors` (the truthiness bug) | killed, 62 failures |
| minor-unit parse → float arithmetic | killed at the 30.30 split |
| `requiresAuth: false` deleted from `list-currencies` | killed at the public-endpoint partition |
| auth probe → `/get_currencies` | killed, 5 failures |
| `API_COMPONENT` → `Website` | killed, 5 failures |
| equal split accepts `group_id: 0` | killed |
| `users__i__prop` → `users_i_prop` | killed, 12 failures |
| `get-expense` rewritten to call `ctx.fetch` directly | killed at the client-bypass guard |
