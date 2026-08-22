# Deel

Manage Deel contracts, people, time off, timesheets and invoice adjustments.

- **Categories** — hr, finance
- **Auth methods** — api-token
- **Actions** — 25
- **Egress allowlist** — `api.letsdeel.com`, `api-staging.letsdeel.com`
- **Website** — https://www.deel.com
- **API docs** — https://developer.deel.com ·
  schema index: https://developer.deel.com/openapi.json

## Setup

### API Token

1. In Deel, go to **Developer → API tokens** and create a token (or use an
   OAuth app's access token).
2. Paste it into the connection's **API Token** field. It is sent as
   `Authorization: Bearer <token>`.
3. Choose the **Environment**. Deel runs production (`api.letsdeel.com`) and a
   demo environment (`api-staging.letsdeel.com`), and **tokens are not shared
   between them** — pointing a production token at the sandbox fails
   confusingly, so the connection says which one it is and the client builds
   URLs from that.

## Actions

| Key | Type | Description |
|---|---|---|
| `contract-list` | read | List contracts by type, status, team or country |
| `contract-get` | read | Get one contract and its terms |
| `contract-terminate` | perform | Request termination of a contract |
| `contract-milestone-list` | read | List a contract's milestones |
| `contract-milestone-create` | perform | Add a payable milestone |
| `person-list` | read | List workers |
| `person-get` | read | Get one worker's profile |
| `person-personal-info-get` | read | Read a worker's personal details |
| `person-department-update` | perform | Move a worker to a department |
| `time-off-list` | read | List one worker's time-off requests |
| `time-off-create` | perform | Request time off |
| `time-off-review` | perform | Approve or deny a request |
| `time-off-delete` | perform | Cancel a request |
| `time-off-entitlement-list` | read | Read a worker's leave balances |
| `timesheet-list` | read | List submitted timesheets |
| `timesheet-create` | perform | Log work against a contract |
| `invoice-adjustment-list` | read | List bonuses, expenses and deductions |
| `invoice-adjustment-create` | perform | Add one to the next invoice |
| `adjustment-category-list` | read | List this org's adjustment categories |
| `legal-entity-list` | read | List the entities contracts are signed under |
| `lookup-list` | read | Read a reference list — countries, currencies, … |
| `webhook-list` | read | List registered webhooks |
| `webhook-create` | perform | Register a URL to receive events |
| `webhook-delete` | perform | Stop sending events to a URL |
| `webhook-event-list` | read | List the events Deel can send |

### Built from four of Deel's twelve documents

`https://developer.deel.com/openapi.json` is an **index** of Deel's OpenAPI
documents, not a spec itself. This app was built from four of them, fetched
2026-08-18:

| Document | Covers | Paths |
|---|---|---|
| `openapi/ic-endpoints.json` | contracts, milestones, timesheets, invoice adjustments | 29 |
| `openapi/hris-endpoints.json` | people, time off, org structures | 47 |
| `openapi/endpoints.json` | webhooks, lookups, legal entities | 34 |
| `openapi/endpoints-3.json` | adjustments, global payroll, time tracking | 27 |

Each action's doc comment names the document and operation it came from, so a
future reader can check it without guessing which of the twelve to open.

### Two pagination contracts

- **Cursor** — contracts, milestones, timesheets, invoice adjustments, legal
  entities, webhooks. The response's `page.cursor` goes back as `after_cursor`.
- **Offset** — the HRIS collections (`person-list`, `time-off-list`). The
  response's `page` carries `offset`, `total_rows` and `items_per_page`.

They are **not interchangeable**: sending `after_cursor` to an offset endpoint
is silently ignored and returns page one forever. `lib/client.ts` implements
both, each action uses the one its endpoint declares, and a test asserts the
split.

One detail worth knowing about the offset pager: it stops early when the
response carries `total_rows`. Without it, the pager has to ask once more to
learn there is nothing left — one extra empty request, never a loop.

### Writes take a `data` envelope

Deel wraps write bodies as `{data: {...}}`, and a bare attribute object is
rejected. Every write action here builds that envelope, so a caller supplies
plain fields.

### The spec's `Authorization` parameter is deliberately ignored

Several Deel operations declare `Authorization` as a **required header
parameter** alongside the documents' own `deelToken` security scheme. That is
redundant, and copying it into an action's params would put a credential into a
form field — which the sandbox forbids and which would leak into run logs. The
`sign` hook supplies the header, as in every other app in this pack, and a test
asserts no action mentions it.

### Three identifiers that are not interchangeable

- **HRIS profile id** — what `person-list` returns and `person-get`,
  `time-off-list` and `time-off-entitlement-list` take.
- **Worker id** — what `person-personal-info-get` takes. Personal information
  is a separate, more sensitive endpoint, and a token may be able to read the
  profile and not this.
- **Contract id** — the contract, milestone, timesheet and adjustment actions.

Passing the wrong one produces a 404 that does not explain itself, so each
action's hint names which it wants.

### Money moves, and the flags say so

`contract-milestone-create`, `invoice-adjustment-create` and `timesheet-create`
all create a record that results in a payment, so all three are honestly
`idempotent: false` — a retry pays twice. A test asserts that, so nobody
"tidies" the flags later.

`invoice-adjustment-create` needs a **category id** from
`adjustment-category-list`: Deel identifies bonuses, expenses and deductions by
category, the ids are per-organization, and a deduction is its own category
rather than a negative amount.

### Time off: whose approval?

`time-off-create` takes `use_deel_approval_flow`. With it, the request enters
Deel's own approval chain. Without it, the request is created in whatever
`status` you set — which is what a workflow that has *already* collected an
approval elsewhere wants. `time-off-review` is the other path: it is a **POST to
a collection**, not a PATCH on the request, because Deel models the decision as
its own event.

`time-off-entitlement-list` answers the question a request workflow should ask
first: how much leave the person actually has left.

### Deliberately out of scope

Each of these is its own document in Deel's index, and each deserves its own app
rather than a sample here:

- **EOR and Global Payroll worker administration** (`eor-endpoints-2`, and
  `endpoints-3`'s `/gp/workers/*`): addresses, bank accounts, compensation,
  terminations, payslips. Employment-record changes with legal weight.
- **The ATS** (`ats-endpoints`, and the 338-path `endpoints-5`): candidates,
  applications, interviews, job postings. A whole product.
- **Immigration, screening (KYC/AML) and IT asset management** — compliance and
  device surfaces with their own vocabularies.
- **SCIM user provisioning** (`/Users`, served from its own `scim/v2` base) —
  directory sync, not workflow automation.

## Health check

Three questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared unavailable — and this one is unusual: Deel has a status page and
does not publish it.** Verified 2026-08-18:

```
GET https://status.deel.com/api/v2/status.json   -> 404
GET https://status.deel.com/api/v2/summary.json  -> 404
GET https://deel.statuspage.io/api/v2/status.json
    -> 401 "Your page is inactive. Please include an API key to access
       this resource."
```

That 401 is Statuspage's own message for a page whose owner has not made it
public. So this is not a vendor that publishes nothing — it is a vendor whose
status surface is private. There is no feed to declare either, so the spec's
"declare a feed, don't parse one" escape hatch does not apply, and building a
probe against an endpoint that answers 401 for everyone would look like a live
check while reporting `unknown` forever.

### Is this credential live?

`GET /contracts?limit=1` — the cheapest call that proves the token can read this
organization's data, and it follows the connection's environment choice. The
documents this app is built from declare no whoami endpoint, and
`/organizations` needs a broader scope than most tokens carry.

401 and 403 get different messages: a rejected token and a token without the
scope to read contracts are different fixes.

### Do we have quota left?

**A live check** — Deel reports rate-limit state on **every** response,
including error ones. Verified live 2026-08-18 against an unauthenticated
`GET /rest/contracts`, whose 401 still carried:

```
x-ratelimit-limit: 5
x-ratelimit-remaining: 4
x-ratelimit-reset: 1787044307
```

`reset` is an absolute **epoch-seconds** timestamp (the observed value was a
wall clock a few seconds ahead), not a duration, so it is converted directly.
The `5` there is the *unauthenticated* allowance; an authenticated token's
ceiling is its own and is read from the same headers.

Because the headers ride on errors too, the check reads them before considering
the status — which is exactly what you want when the response is a 429.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | — | — | informational | — | declared `unavailable` — Deel's Statuspage is private |
| `quota` | quota | connection | signed | informational | 300s | `GET /contracts?limit=1`, reading `x-ratelimit-*` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` method's `test` hook |

## Icon

`assets/icon.png` — Deel publishes **no SVG mark** that this app could verify:
`deel.com/favicon.svg` and `/icon.svg` both return the site's HTML shell with a
404, and simple-icons has no Deel entry.

So this ships the vendor's own favicon as a raster, the same treatment `tldv`
and `ringcentral` use:

- source: `https://www.deel.com/favicon.ico`, downloaded 2026-08-18 — **34,494
  bytes**, md5 `d8a37af305a27ab9cc74fc712f849f7e`, a real `image/x-icon`
  containing five frames (16, 24, 32, 48 and 64 px)
- `assets/icon.png` is the **64×64 frame extracted verbatim** with ImageMagick —
  1,040 bytes, no rescaling, recolouring or redrawing
- it is not run through `_tools/icon-normalize.ts` or `icon-legibility.ts`;
  both operate on SVG

---

Researched and endpoint-verified 2026-08-18 against four of the OpenAPI
documents Deel serves from its own developer host, plus live probes of
`api.letsdeel.com`, `status.deel.com` and `deel.statuspage.io`. Status surfaces
move; if Deel ever publishes its Statuspage, `health/service.ts` is where the
probe goes.
