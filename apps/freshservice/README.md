# Freshservice

Manage Freshservice ITSM tickets, problems, changes, releases, assets and the service
catalog.

- **Categories** — support, devops
- **Auth methods** — api-key
- **Actions** — 23
- **Egress allowlist** — `*.freshservice.com`
- **Website** — <https://www.freshworks.com/freshservice/>
- **API docs** — <https://api.freshservice.com>

Freshservice is Freshworks' ITSM product. It shares a vendor and an auth scheme with the
sibling [`freshdesk`](../freshdesk/) app in this pack, and this app deliberately follows
freshdesk's shape for the per-tenant host and the Basic credential rather than inventing
a second convention. What it does *not* share is the data model: Freshservice adds
problems, changes, releases, a CMDB and a service catalog on top of tickets, and several
of its enums differ from Freshdesk's despite looking identical (see
[Enum traps](#enum-traps)).

## The per-tenant model

Every Freshservice account has its own host — `acme.freshservice.com` — and the v2 API
**works only via Freshservice domains, not via custom CNAMEs**. Two consequences:

1. **`network.allow` is `*.freshservice.com`.** The runtime's egress matcher accepts any
   subdomain of that apex and refuses everything else. Because the vendor rules out
   CNAMEs, the apex is genuinely sufficient — this app never needs the blunt `"*"`.
2. **The domain lives on the Connection, not on an Action.** It identifies the *account*,
   so it is an Auth field. `afterConnect` records it on the connection's redacted
   `display`, and `lib/client.ts` reads it back from there. Actions therefore address the
   right host without ever seeing a credential, and nobody re-types their subdomain on
   every step. `tests/index.test.ts` asserts that no action collects `domain` or
   `apiKey`, so this cannot quietly regress.

Base URL: `https://{domain}.freshservice.com/api/v2`.

## The response envelope

v2 wraps every payload under the resource name — `{"ticket": {…}}` for one object,
`{"tickets": [ … ]}` for a collection, and `{"conversation": {…}}` for both notes and
replies. `FreshserviceClient.resource(key, path)` unwraps it in one place so 23 actions
do not each repeat the same dance, and falls through untouched if a payload ever arrives
un-enveloped.

Pagination is `page` (1-based) + `per_page` (default 30, **max 100** — higher values are
rejected, not clamped). The `Link` header carries the next page when there is one.

## Actions

| Resource | Action | Endpoint |
|---|---|---|
| ticket | `ticket-create` | `POST /tickets` |
| ticket | `ticket-get` | `GET /tickets/{id}` |
| ticket | `ticket-get-many` | `GET /tickets` |
| ticket | `ticket-update` | `PUT /tickets/{id}` |
| ticket | `ticket-delete` | `DELETE /tickets/{id}` |
| ticket | `ticket-restore` | `PUT /tickets/{id}/restore` |
| conversation | `ticket-add-note` | `POST /tickets/{id}/notes` |
| conversation | `ticket-add-reply` | `POST /tickets/{id}/reply` |
| conversation | `conversation-get-many` | `GET /tickets/{id}/conversations` |
| problem | `problem-get-many` | `GET /problems` |
| change | `change-create` | `POST /changes` |
| change | `change-get-many` | `GET /changes` |
| release | `release-get-many` | `GET /releases` |
| requester | `requester-get-many` | `GET /requesters` |
| agent | `agent-get-many` | `GET /agents` |
| group | `group-get-many` | `GET /groups` |
| department | `department-get-many` | `GET /departments` |
| location | `location-get-many` | `GET /locations` |
| asset | `asset-create` | `POST /assets` |
| asset | `asset-get` | `GET /assets/{display_id}` |
| asset | `asset-get-many` | `GET /assets` |
| service-item | `service-item-get-many` | `GET /service_catalog/items` |
| solution-article | `solution-article-search` | `GET /solutions/articles/search` |

Every one of those was read off the live v2 reference; none was inferred.

### Things worth knowing before you wire one up

- **Assets are addressed by `display_id`, not `id`.** That is Freshservice's own
  convention on this resource, and the two numbers are different. `asset-get` names the
  param `Display ID` for exactly that reason.
- **`ticket-update` sends only the fields you set.** A PUT with the full object would
  blank whatever you left empty. One exception the API forces on us: **tags replace**, so
  send every tag that should stay attached.
- **`change-create` has five mandatory grading fields** — priority, status, impact, risk
  and change type — plus subject and description. They all have sensible defaults.
- **`change-get-many` rejects `query` + `view` together** before it makes a request; the
  API 400s on the combination and its prose is less useful than saying so directly.
- **`group-get-many` cannot list across workspaces.** Freshservice defines agent groups
  per workspace and offers no all-workspaces read; pass one workspace at a time. Tickets,
  problems, changes, releases and assets *do* accept `workspace_id=0` for that.
- **Embeds cost credits.** `include=` on a single-object read costs one extra API credit
  per resource; on a collection it costs two. Both `ticket-get` and the asset reads keep
  them opt-in.

### Not covered, and why

- **Attachments.** Every attachment endpoint is `multipart/form-data`, and the docs are
  explicit that "only files on your local machine can be attached using API" — there is
  no URL-ingest form. A sandboxed hook has no local filesystem to attach from.
- **Approvals, CABs, on-call schedules, projects, onboarding/offboarding, journeys,
  purchase orders, contracts, software, alerts, time entries, tasks.** All real; each is
  a module in its own right. Shipping them half-covered would be worse than not shipping
  them.
- **The ITAM asset surface** (`/api/v2/itam/assets`). It is the successor for signups
  after 31 March 2026 and is *not* interchangeable with `/api/v2/assets`. Which one an
  account should use is not something this app can infer, so it implements the
  long-standing one and says so.
- **Triggers.** The webhook surface is a Trigger, not an Action.

## Enum traps

Freshservice and Freshdesk look alike and are not. These are copied verbatim from the v2
"Ticket Properties" table and are unit-tested against drift:

| | Freshservice | Freshdesk |
|---|---|---|
| Source `4` | Chat | — |
| Source `7` | **AWS CloudWatch** | **Chat** |
| Source `9` | Walkup | Feedback widget |
| Source `10` | Slack | Outbound email |

Ticket status (2 Open, 3 Pending, 4 Resolved, 5 Closed) and priority (1–4) *do* match.
Everything else has its own scale: **problem** status is 1 Open / 2 Change requested /
3 Closed; **change** status runs 1–6 (Open → Closed) with separate `risk` (1–4) and
`change_type` (1–4) scales; **release** status is 1–5. Asset `impact` and `usage_type` are
*strings* (`low`/`medium`/`high`, `permanent`/`loaner`), not the integers tickets use.

## Auth scheme

Freshservice authenticates with HTTP Basic where the **API key is the username and any
string is the password**. The wire value is `base64("<key>:X")`; `X` is not a secret, it
is a placeholder the docs and every official sample use. Verified against
<https://api.freshservice.com> §Authentication — *"You can use your personal API key to
authenticate the request. If you use the API key, there is no need for a password. You
can use any set of characters as a dummy password."* — and against n8n's
`Freshservice/GenericFunctions.ts`, which encodes `Buffer.from(\`${apiKey}:X\`)`.

Username/password Basic auth was **removed on 31 May 2023**. Sending one now returns
`unsupported_authentication_type`.

The API key is found under Profile Settings, below the change-password section.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://updates.freshservice.com>, served by **Freshstatus**
(Freshworks' own status-page product), account `3616`.

Finding a probe that is real took some work, because two of the three obvious candidates
are traps:

| Candidate | Verdict |
|---|---|
| `status.freshservice.com` | ❌ **302s to `updates.freshservice.com` and discards the path.** `/rss`, `/anything` all land on the marketing root with a `200` and an HTML body. Anything built on it would report "up" forever, including during an outage. |
| `freshservice.statuspage.io`, `freshworks.statuspage.io` | ❌ **Unclaimed Atlassian Statuspage subdomains.** Both redirect to `/inactive`. They belong to nobody. |
| `updates.freshservice.com/rss/` | ⚠️ Real (`application/xml`, RSS 2.0, sibling paths 404 rather than catch-all) — but a **history log with no resolution marker**. Every entry carries the incident's opening prose and nothing machine-readable says whether it is still open. Judging current state from it would be guesswork, which `rfcs/healthcheck.md` forbids. |
| `public-api.freshstatus.io/v1/public-components/?account_id=3616` | ✅ **Used.** Freshstatus' unauthenticated public API — the same call Freshworks' own status page makes. 200 `application/json`, 220 components, each leaf carrying a machine-readable `status`. A bogus sibling path (`/v1/public-zzz-not-real/`) 404s with an HTML body, so it is not a catch-all. |

Two details are taken from Freshworks' own status client rather than guessed:

- the status vocabulary is `OP` / `PD` / `PO` / `MO` / `UM` → ok / degraded / degraded /
  down / degraded;
- a component carrying `display_options.ignore_overall_status === "true"` is **excluded
  from the overall verdict**, exactly as the vendor's roll-up excludes it. This is
  load-bearing *today*: all 36 MEA-region components sit at `MO` behind that flag (the
  region is being wound down and its accounts migrated to EU North), so a naive worst-of
  roll-up would pin every Freshservice connection at `down` indefinitely.

The tree is grouped by hosting region, so the check reports one component per region —
one call, many components. A connection's region is not derivable from its subdomain, so
the overall state is the worst of the regions the vendor counts. A status API that itself
fails reports `unknown`, never `down`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

```
GET /api/v2/tickets?per_page=1
```

**Freshservice publishes no whoami.** There is no `/agents/me` in the v2 surface (that is
a *Freshdesk* endpoint), and probing one anyway would be inventing an endpoint. The docs'
own authentication example is `curl -u api_key:X … /api/v2/tickets`, so that is the probe,
narrowed to a single row so a liveness check costs almost nothing.

The same absence is why `afterConnect` records the domain and makes no request at all:
there is nothing to enrich the connection label with. The label is
`{domain}.freshservice.com`.

### Do we have quota left?

`X-Ratelimit-Total`, `X-Ratelimit-Remaining` and `X-Ratelimit-Used-CurrentRequest`
response headers, plus `Retry-After` on a 429. **Verified on the wire** against several
live portals — the headers are present even on an unauthenticated 403.

Freshservice meters **per account per minute**: 100 / 200 / 400 / 500 requests a minute
by plan, and 1,000 or 2,000 with a rate-limit add-on. Two wire details the parser is
deliberately tolerant of: some accounts report the values as decimals (`7000.0`), and some
send `X-Ratelimit-Used` rather than `X-Ratelimit-Used-CurrentRequest`.

The headroom number is an account-level ceiling, not a promise about any one endpoint. The
busiest calls — List Tickets, View/Create/Update Ticket, List Assets, List Agents, List
Requesters — each carry their own **sub-limit** inside the overall budget, and those
sub-limits appear in no header.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` — `public-api.freshstatus.io` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `domain` | dependency | connection | context | degraded | 120s | `health/domain.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**`service` widens egress for its own worker only** (`network.allow:
["public-api.freshstatus.io"]`) and is unsigned, which is what makes that safe. The status
host stays off the app's main allowlist — a status host must never see a credential.

**`domain` exists because "the vendor is up" and "this portal answers" are different
failures.** It probes this connection's own host unauthenticated, so a **403 is a pass**:
verified on the wire, a live portal answers an unsigned `GET /api/v2/tickets` with `403`
plus `X-Freshservice-Api-Version` and the `X-Ratelimit-*` headers — proof that the domain
resolves, TLS terminates and the API is answering. A subdomain that was never provisioned
answers `404` with none of those headers. Whether the credential is any good is the
`auth:api-key` check's job; conflating the two is how "the portal was renamed" gets
misreported as "your API key expired".

## Development

```sh
cd apps/freshservice
deno task test    # 99 unit tests
deno task check
deno task lint
deno task fmt
```

## Links

- **Freshservice** — <https://www.freshworks.com/freshservice/>
- **API reference (used to build this app)** — <https://api.freshservice.com>
  — the single-page v2 reference; every path, envelope key and enum in this app is quoted
  from it.
- **Authentication** — <https://api.freshservice.com/#authentication>
- **Rate limit** — <https://api.freshservice.com/#rate_limit>
- **Pagination** — <https://api.freshservice.com/#pagination>
- **Errors and error codes** — <https://api.freshservice.com/#error>
- **Tickets** · **Conversations** — <https://api.freshservice.com/#tickets> ·
  <https://api.freshservice.com/#conversations>
- **Problems** · **Changes** · **Releases** — <https://api.freshservice.com/#problems> ·
  <https://api.freshservice.com/#changes> · <https://api.freshservice.com/#releases>
- **Assets** — <https://api.freshservice.com/#assets>
- **Service Catalog** · **Solution Articles** —
  <https://api.freshservice.com/#service-catalog> · <https://api.freshservice.com/#solution-article>
- **Status page** — <https://updates.freshservice.com>
- **Status RSS feed** (real, but resolution-free — see above) —
  <https://updates.freshservice.com/rss/>
- **Freshworks status (all products)** — <https://status.freshworks.com>
- **Freshworks GitHub org** — <https://github.com/freshworks>
- **n8n's Freshservice node** (the icon's source, and a second witness for the auth
  scheme) —
  <https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Freshservice>

Only URLs whose *content* was inspected are listed; a 200 was not treated as proof.

---

Researched and endpoint-verified 2026-08-03 against <https://api.freshservice.com>
(last modified 2026-07-29) and n8n's `packages/nodes-base/nodes/Freshservice/`. The
Freshstatus account id and the `ignore_overall_status` convention were read off
`updates.freshservice.com` and Freshworks' own status client. Status surfaces move;
re-check if a probe starts failing for everyone at once.
