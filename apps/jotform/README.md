# Jotform

Read Jotform forms and questions, and read, create, edit and delete form submissions via the Jotform
API.

- **Categories** — forms, productivity
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.jotform.com`, `eu-api.jotform.com`, `hipaa-api.jotform.com`

## Links

- **Website** — https://www.jotform.com
- **API docs** — https://api.jotform.com/docs/ (the endpoint reference this app was built against —
  every path, the auth scheme and the response envelope were read off that page on 2026-08-03, not
  from memory)
- **Developer portal** — https://www.jotform.com/developers/
- **Status page** — https://status.jotform.com
- **GitHub** — https://github.com/jotform — the official clients
  [`jotform-api-nodejs`](https://github.com/jotform/jotform-api-nodejs) and
  [`jotform-api-python`](https://github.com/jotform/jotform-api-python) were used as a second,
  first-party source to cross-check paths and query-parameter names

## Actions

| Resource   | Action                           | Endpoint                                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------- |
| user       | Get Account                      | `GET /user`                                                                     |
| user       | Get Account Usage                | `GET /user/usage`                                                               |
| form       | Get Many Forms                   | `GET /user/forms`                                                               |
| form       | Get Form                         | `GET /form/{formID}`                                                            |
| form       | Get Form Questions               | `GET /form/{formID}/questions`                                                  |
| form       | Get Form Properties              | `GET /form/{formID}/properties` · `GET /form/{formID}/properties/{propertyKey}` |
| submission | Get Many Submissions             | `GET /form/{formID}/submissions`                                                |
| submission | Get Many Submissions (All Forms) | `GET /user/submissions`                                                         |
| submission | Get Submission                   | `GET /submission/{submissionID}`                                                |
| submission | Create Submission                | `POST /form/{formID}/submissions`                                               |
| submission | Edit Submission                  | `POST /submission/{submissionID}`                                               |
| submission | Delete Submission                | `DELETE /submission/{submissionID}`                                             |
| report     | Get Many Reports                 | `GET /form/{formID}/reports`                                                    |
| folder     | Get Many Folders                 | `GET /user/folders`                                                             |

**Deliberately absent:**

- **Webhooks** (`/form/{formID}/webhooks`) — that is a Trigger, not an Action.
- **Form authoring** — `POST`/`PUT /form`, `POST /form/{formID}/clone`, `DELETE /form/{formID}`, and
  the write side of questions and properties. Jotform's authoring payloads are deeply nested
  form-encoded structures (`questions[0][type]`, `emails[0][subject]`, …) that belong in Jotform's
  own form designer. This app is for _running_ forms, not designing them.
- **Account provisioning** — `/user/register`, `/user/login`, `/user/logout`, `/user/subusers` and
  the `/user/settings` write. `login` trades a username and password for a session, which is the
  wrong shape for a workflow step, and the rest are operator concerns.
- **Enterprise custom domains.** Jotform Enterprise instances answer on a customer's own domain.
  Covering those would need a `"*"` egress allowlist; the three published regional hosts are
  enumerated instead.

### Working with submissions

Answers are addressed by **question ID**, so the normal sequence is _Get Form Questions_ → build the
answers map → _Create Submission_. The body is form-encoded exactly as the docs' own example shows:

```
-d "submission[1]=answer of Question 1"
-d "submission[2_first]=First Name"  -d "submission[2_last]=Last Name"
```

so a multi-field control (full name, address, date) takes the flat `<qid>_<sublabel>` key form.
_Edit Submission_ uses the same encoding and also accepts the submission-level keys `new` (1 =
unread) and `flag` (1 = starred), again per the docs' example. Array values are sent as indexed
`submission[qid][0]`, `submission[qid][1]` entries for multi-select controls — Jotform's own bracket
convention; nested objects are rejected rather than guessed at.

## Auth

**API Key** only, sent as a header.

```
APIKEY: {apiKey}
```

Jotform's docs list three ways to authenticate: `?apiKey={myApiKey}` in the query string, an
`APIKEY` request header, and the browser JS SDK. The header is used here because it keeps the
credential out of URLs, request logs and the `Referer`; the docs' own example
(`curl -H "APIKEY: {myApiKey}" "https://api.jotform.com/user"`) shows it working verbatim, and
Jotform's official Python client uses the same header. Mint a key at **My Account → API → Create New
Key**.

### Regions

Jotform serves the same API from three hosts, and an account lives on exactly one of them:

| Region field   | Host                    |
| -------------- | ----------------------- |
| `us` (default) | `api.jotform.com`       |
| `eu`           | `eu-api.jotform.com`    |
| `hipaa`        | `hipaa-api.jotform.com` |

The region is a property of the **account**, not of an individual call, so it is collected once as
an Auth field rather than repeated on every Action. `afterConnect` records the resolved host on the
Connection's redacted display data, and `lib/client.ts` reads it from there — so an Action addresses
the right region without ever seeing the credential. An unrecognised host stored on a Connection is
ignored in favour of the region key, so a tampered display value cannot redirect traffic off the
allowlist.

### Response envelope

Every Jotform response — success or failure — is wrapped:

```json
{ "responseCode": 200, "message": "success", "content": …,
  "resultSet": { "offset": 0, "limit": 20, "count": 20 },
  "limit-left": 4986 }
```

`responseCode` mirrors the HTTP status (confirmed live: an unauthenticated `GET /user` answers HTTP
401 with `responseCode: 401`), but Jotform's own Node client validates the envelope code
independently of the transport status, so `lib/client.ts` checks both. Actions return the unwrapped
`content`; the paginated list actions also surface `resultSet` and `limitLeft`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.jotform.com/api/v2/summary.json
```

Jotform runs a standard Atlassian Statuspage, so the `service` check reads the `summary.json`
rollup: `status.indicator` (`none` / `minor` / `major` / `critical`) plus the per-component
breakdown (Forms, Submission Service, API, …), so one probe reports each component rather than a
single platform-wide boolean. The check is unauthenticated and unsigned — `status.jotform.com` is
widened onto that hook's own allowlist and is deliberately absent from the app's egress list, so no
action can reach it. Jotform publishes one status page for all three API regions; there is no
per-region rollup to read.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
questions the app performs directly on every Connection.

```
GET /user
```

Returns the account the key belongs to. A Jotform API key carries no per-resource scopes it could
legitimately lack — only a read-only/full-access distinction, and `/user` is a read — so this is
both the cheapest call available and a genuine liveness probe. It runs against the credential's own
regional host.

### Do we have quota left?

**Real probe.** Unlike most vendors in this pack Jotform publishes a readable counter, and one
endpoint carries both halves of the daily budget in a single call:

```
GET /user/usage
→ { "content": { …, "api": "14" }, "limit-left": 4986 }
```

`content.api` is the number of API calls made today and `limit-left` is the number still available,
so the plan's daily ceiling is `used + remaining` — no second call to `/system/plan/{plan}` is
needed. Jotform's published daily allowances are 1,000 (Starter), 10,000 (Bronze), 50,000 (Silver)
and 100,000 (Gold) requests, with no restriction on Enterprise. The budget is metered **per account,
not per key**: every API key on an account draws on the same daily allowance.

`resetAt` is deliberately left unset. Jotform documents that the allowance "resets daily" but does
not publish the instant it rolls over, and inventing one would be worse than omitting it.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key            | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                |
| -------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ---------------------------------------------------- |
| `service`      | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                  |
| `quota`        | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                                    |
| `auth:api-key` | credential | connection | signed     | fatal         | —            | derived from the `api-key` auth method's `test` hook |

The host `status.jotform.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host. `quota` declares no extra host of its own: the three API
hosts are already on the app's allowlist, which is what makes signing that probe safe.

---

Researched and endpoint-verified 2026-08-03 against Jotform's own reference at
https://api.jotform.com/docs/ (response envelope, `limit-left`, the `APIKEY` header, the three
regional hosts and every path above read off that page), cross-checked against the official
`jotform/jotform-api-nodejs` and `jotform/jotform-api-python` clients for query-parameter names, and
confirmed live against `api.jotform.com` (401 envelope shape) and
`status.jotform.com/api/v2/summary.json` (Statuspage component list). Status surfaces move; re-check
with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.

The icon is Jotform's own logomark, copied verbatim from n8n's `nodes-base`
(`nodes/JotForm/jotform.svg`).
