# Fillout

Read Fillout forms and their submissions, import submissions, and subscribe webhooks, over the
**Fillout REST API v1**.

- **Base URL** — `https://api.fillout.com/v1/api` (US) or `https://eu-api.fillout.com/v1/api` (EU).
- **Auth** — `Authorization: Bearer <api key>`, from **Settings → Developer**.
- **Rate limit** — **5 requests per second**, per account/API key.
- **Docs** — <https://www.fillout.com/help/fillout-rest-api>, plus one OpenAPI 3.0.1 fragment per
  endpoint under `fillout.com/help/api-reference/`.

Everything below was verified on **2026-08-11** against those fragments and against live probes of
`api.fillout.com`, `eu-api.fillout.com` and `fillout.statuspage.io`. Nothing came from a third-party
integration directory.

## Actions (8)

The Fillout API is **exactly eight endpoints**, and this app implements all eight. That is the whole
documented surface, not a selection.

| Key                 | Type      | Endpoint                                            |
| ------------------- | --------- | --------------------------------------------------- |
| `form-list`         | `read`    | `GET /forms`                                        |
| `form-get`          | `read`    | `GET /forms/{formId}`                               |
| `submission-list`   | `search`  | `GET /forms/{formId}/submissions`                   |
| `submission-get`    | `read`    | `GET /forms/{formId}/submissions/{submissionId}`    |
| `submission-create` | `perform` | `POST /forms/{formId}/submissions`                  |
| `submission-delete` | `perform` | `DELETE /forms/{formId}/submissions/{submissionId}` |
| `webhook-create`    | `perform` | `POST /webhook/create`                              |
| `webhook-delete`    | `perform` | `POST /webhook/delete`                              |

Idempotency is declared honestly: `submission-create` and `webhook-create` are **not** idempotent
(Fillout offers no idempotency key, no client-supplied submission id and no dedupe on a webhook URL,
so a retry creates a second thing), while `submission-delete` and `webhook-delete` **are** — each
names one resource and leaves the same end state after two calls as after one.

## The findings that cost time

### 1. Every credential failure is a `400`, and only the prose tells them apart

There is no `401` and no `403` anywhere in this API, and no machine-readable error code in the body.
Measured against `GET https://api.fillout.com/v1/api/forms`:

| Sent                             | Status | `message`                          |
| -------------------------------- | ------ | ---------------------------------- |
| no `Authorization` header        | `400`  | `API authorization header missing` |
| `Authorization: Bearer ` (empty) | `400`  | `API Authorization header missing` |
| `Authorization: Basic …`         | `400`  | `API Authorization header missing` |
| `Authorization: Bearer notreal`  | `400`  | `API key missing underscore`       |
| `Authorization: Bearer sk_x_yyy` | `400`  | `API Key invalid`                  |

Rows one and two differ by **one capital letter** and nothing else. That is not a contract anyone
wrote down, so `lib/client.ts#classifyCredentialMessage` lowercases before matching and folds both
into one verdict — the operator's fix (reconnect) is the same either way, and keying off a letter's
case would be a coin flip on the next deploy. The other two verdicts get their own advice, because
"paste the whole key including its prefix" and "the key was revoked" are different problems.

### 2. …and a `400` is not always about the credential either

`POST /v1/api/forms/{formId}/submissions` **validates its request body before it authenticates**.
Unauthenticated with `{}` it answers a `400` whose `message` is a *stringified* array of Zod issues
and never mentions auth:

```json
{"statusCode":400,"error":"Bad Request",
 "message":"[\n  {\n    \"expected\": \"array\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"submissions\"\n    ],\n    \"message\": \"Invalid input: expected array, received undefined\"\n  }\n]"}
```

The sibling `POST /v1/api/webhook/create`, given an equally invalid body, answers the *auth* error
instead — so the ordering is **per route** and cannot be assumed. Reading the status alone therefore
reports "bad API key" for a typo in a question id. `formatFilloutError` parses the issue list and
says "request body rejected" instead.

### 3. The status page is branded **Zite**, and `status.fillout.com` is not it

Fillout's own footer links to <https://fillout.statuspage.io/>. Its `page` block reads:

```json
"page": { "id": "xw2z8dx3khsp", "name": "Zite", "url": "https://status.zite.com" }
```

Zite is Fillout's platform name; the seven components are unmistakably this product
(`Forms (respondent experience)`, `Form editor`, `Workspaces, Settings & Admin`, **`Developer API`**,
`Zite Database`, `Zite Apps`, `Zite App Editor`). The obvious sanity guard — "the page must
self-identify as Fillout's" — would reject the **correct** page and report `unknown` forever, so
`health/service.ts` pins the **page id**, which survives a rename.

Meanwhile the host anyone would guess, `status.fillout.com`, answers **404** for
`/api/v2/status.json` with 6,573 bytes of a Next.js "Page not found" document (favicon:
`favicon-zite.ico`). Guessing the `status.<vendor>` convention here produces a plausible page from a
different application.

Catch-all check on the real host: `/api/v2/summary.json` → 200, 13,681 B, md5 `838c4d2e984e…`;
`/api/v2/status.json` → 200, 208 B, md5 `a4309814bc37…`; `/api/v2/definitely-not-real-zzz.json` →
**404**, 0 B.

### 4. The webhook id changes type between the two webhook endpoints

`POST /webhook/create` answers `{"id": <integer>}`. `POST /webhook/delete` declares
`webhookId: <string>`. Handing the integer straight back is the obvious move and the one the delete
schema rejects, so `webhook-create` returns **both** (`id` verbatim and `webhookId` stringified) and
`webhook-delete` coerces whatever it is given.

### 5. Five requests per second

The tightest limit in this pack by an order of magnitude, and it is per **account/API key**, so
every connection sharing a key shares the budget. Fillout does publish the counter — the IETF
`ratelimit-*` set is on every response — which is why `health/request-rate.ts` is a live probe
rather than a declared absence:

```
ratelimit-limit: 5      ratelimit-policy: 5;w=1
ratelimit-remaining: 4  ratelimit-reset: 1      (+ retry-after: 1 on a 429)
```

A nine-request burst walked `remaining` 4→3→2→1→0, answered `429 Too many requests. Try again soon.`,
then reset. Note the **un-prefixed** header names: `x-ratelimit-limit` returns nothing here.

## Auth

One method, `api-key` (`type: "bearer"`).

| Field    | Type     | Notes                                                                  |
| -------- | -------- | ---------------------------------------------------------------------- |
| `apiKey` | `secret` | Settings → Developer. Contains an underscore; copy the whole string.   |
| `region` | `select` | `us` → `api.fillout.com`, `eu` → `eu-api.fillout.com`. Defaults to US. |

The region is collected on the Connection because an account lives on exactly one deployment and
that is not derivable from the key. `afterConnect` copies it onto the Connection's display data, and
`lib/client.ts#regionFromConnection` reads it back — an Action never sees the credential, so this is
the only route a host can take. It publishes nothing else: Fillout exposes no account object, so
there is no display name to fetch.

The key travels only in the `Authorization` header, via `sign`. Fillout documents no query-parameter
form.

## Health checks

| Check                 | Kind      | Posture   | What it answers                                            |
| --------------------- | --------- | --------- | ---------------------------------------------------------- |
| `service`             | `service` | `none`    | Statuspage roll-up + all 7 components                      |
| `request-rate`        | `quota`   | `signed`  | Remaining requests in the 5/second window                  |
| ~~`plan`~~            | `quota`   | —         | **Declared absence** — no account/usage endpoint exists    |
| `auth:api-key`        | derived   | `signed`  | From the `test` hook: `GET /forms`                         |

**`service`** takes the vendor's own `status.indicator` as the verdict, with one monotone
exception: the `Developer API` component can only make it **worse**, never better. This app talks to
exactly that component, so a page claiming "All Systems Operational" while the API is in a major
outage must not report `ok` — but a healthy API component during a page-wide critical incident is
still `down`. The status host lives in this check's own `network.allow`, never the app's, and the
check is `credential: "none"` so the status host never sees a key.

**`request-rate`** is `signed` on purpose: the limit is per account/API key, so an unsigned probe
would measure whichever anonymous bucket the gateway picked. It reads the headers from
`GET /v1/api/forms` without parsing the body, at `minIntervalSeconds: 60`. Be clear about what
`remaining` means: the window is **one second**, so the reading is a snapshot of an instant and
cannot show sustained pressure — it is reported because `0` is genuinely actionable and because the
ceiling can only be learned by looking. A credential failure here reports `unknown`, not a number:
with the key rejected there is no account bucket, and whether the key is good is the derived
`auth:api-key` check's job.

**`plan`** is a declared absence at `informational` severity. Fillout's monthly submission allowance
is real but unreadable: the API is eight form/submission/webhook endpoints and none of them is an
account, usage, plan, billing or whoami read, and no response carries a monthly counter. The nearest
substitute, `totalResponses` from Get Submissions, counts one form's responses matching one filter —
not consumption, and not comparable to any ceiling — so reporting it as headroom would be inventing
a number.

### Why the credential probe is `GET /forms`

By elimination, and the elimination is short: **none of Fillout's eight endpoints is a whoami, a
ping, or an account read.** Six of the eight need a `formId` you do not have until you have called
the seventh, and the eighth is a delete. `GET /forms` also passes the three tests a probe has to
pass — it requires a credential (there is no unauthenticated read anywhere in this API), it cannot
be refused for scope (Fillout keys are not scoped: one per account, revoked as a unit), and it
returns nothing secret (`{name, formId}`, where `formId` is the public id already in every share
link). Contrast the traps this pack has already hit — Mailjet's `/apikey` and Follow Up Boss's `/me`
hand back the caller's own live key. Fillout has no endpoint that could: it exposes no account
object at all.

Its one cost is that `/forms` takes no `limit`, so it returns every form in the account. That is why
everything reusing it runs at most once a minute.

## Deliberately not implemented

Each of these is a **decision**, not an oversight, and each says exactly what it does and does not
cover.

**OAuth ("3rd party apps").** Fillout documents an OAuth surface —
`GET https://build.fillout.com/authorize/oauth` → `POST https://server.fillout.com/public/oauth/accessToken`
— and this app does not implement it. Four reasons, all from the vendor's own page: the authorization
request documents no `response_type` and no `scope`; the token request documents `code`, `client_id`,
`client_secret` and `redirect_uri` and **no `grant_type`**, so it is not the RFC 6749 exchange the
host's `oauth2` machinery performs; the success body is `{access_token, base_url}` rather than an
RFC 6749 token response; and the `base_url` it returns "may vary if you are in different
geo-locations, or are self-hosting", i.e. it can be an origin no egress allowlist can enumerate.
Creating a shareable app also "may require review and approval from the Fillout team", so the flow
cannot be exercised — let alone verified — from here. **What this does not excuse:** API-key auth is
fully implemented and covers every one of the eight endpoints; nothing in this app's surface is
unreachable because OAuth is missing. Adding OAuth later is additive (a second `AuthDefinition`),
needs no change to any Action, and should be done only against a real approved client.

**Self-hosted installs.** The same `base_url` problem. Supporting them would mean either enumerating
hosts a manifest cannot know or declaring `network.allow: ["*"]`, which disables egress restriction
for **every** Connection including the SaaS ones. The two documented SaaS servers are both
supported; the `region` field says so plainly rather than leaving a self-hoster to discover it from
a blocked request.

**Binary uploads.** No endpoint in this API takes one. A form's `FileUpload` question stores files
that Fillout serves back as URLs inside the submission payload, and reading those is fine — they
come through `submission-list` / `submission-get` unaltered. `submission-create` is JSON-only in the
vendor's own schema, so nothing is lost to the sandbox's inability to carry raw bytes.

**No question-type mapping.** Fillout's reference carries a standing warning that "new field types
are added regularly; your application should discard fields with unknown types". The 37 types
documented today are a snapshot, so `form-get` and the submission actions return the vendor's payload
unaltered rather than mapping `type` into a fixed vocabulary that would silently drop tomorrow's.

## Version, and whether it is alive

`v1` is the only version, and it carries no deprecation notice. Grepping the rendered reference
(461,842 bytes), all eight OpenAPI fragments, and the 53,291-byte documentation index for
`deprecat|depreciat|sunset|will be removed|end of life|retire|no longer supported|legacy` returns
**zero** matches. Asked the sharper way — *which version's page lacks a deprecation banner* — the
answer is the only version there is: `https://api.fillout.com/v2/api/forms` answers `404 Not Found`,
byte-identical to any other unrouted path, so there is no successor to migrate to.

## Tests

```
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/fillout && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```

115 unit tests across the entry module, all eight actions, the auth method, the client and both live
health checks, each driven by a mocked `HookContext`. The error-taxonomy tests are table-driven from
the **measured** response bodies above, and assert that the four measured `400`s produce three
distinct explanations — three, not four, because the two "header missing" spellings are deliberately
one class.

One note for anyone extending this app: because hosts are built from the `apiHost()` constants
rather than from `https://…` literals, `_tools/audit.ts`'s undeclared-host scan finds nothing to
check here. `tests/index.test.ts` closes that gap by deriving the host set from the code and
asserting it equals `w6w.network.allow` in **both** directions — a host called but undeclared, and a
host declared but never called, each fail.
