# New Relic

Query with NRQL, search entities, manage tags and alerts, read dashboards and
record deployments — all through NerdGraph.

- **Categories** — monitoring, analytics, devops
- **Auth methods** — user-key
- **Actions** — 17
- **Egress allowlist** — `api.newrelic.com`, `api.eu.newrelic.com`,
  `status.newrelic.com`
- **Website** — https://newrelic.com
- **API docs** — https://docs.newrelic.com/docs/apis/nerdgraph/get-started/introduction-new-relic-nerdgraph/

Probed live against both regional endpoints on 2026-08-18, with mutation shapes
taken from New Relic's own NerdGraph documentation.

## It is GraphQL, and only GraphQL

One endpoint, one POST, for everything: querying metrics, searching entities,
acknowledging incidents, recording deployments. There is no REST surface to fall
back to.

That is the defining property of this app, because of what it does to errors.

## Errors arrive in a 200, at three separate levels

**Level 1 — HTTP.** A rejected key is a real `401`. Verified live:

```json
{"errors":[{"message":"authentication required"}]}
```

That much behaves normally.

**Level 2 — the GraphQL `errors` array.** A query that authenticated but failed
— a bad NRQL string, an account the key cannot see, a field that does not exist
— comes back **HTTP 200** with `errors` populated. And GraphQL permits *partial
success*: `data` and `errors` both present, some fields resolved and others
null. A client reading `data` and ignoring `errors` gets a plausible object with
holes in it and no indication anything went wrong. The client here throws on
that, and says the word "PARTIAL" so the distinction between incomplete and
wrong is visible.

**Level 3 — the mutation's own payload.** New Relic's mutations report their
failures *inside* `data`. So `taggingAddTagsToEntity` can return HTTP 200, with
no top-level `errors`, and still have failed — the reason is in
`data.taggingAddTagsToEntity.errors`.

Worse, the shape of that third level is not uniform. The tagging mutations
return `errors { message type }`; `aiIssuesAckIssue` returns a single
`error { message type }`; `changeTrackingCreateDeployment` returns **no error
field at all**, and the only confirmation is that a `deploymentId` came back. So
each is handled where it is used, and the `index.ts` suite asserts that every
action sending a mutation confirms it did something.

## One error message, three different causes

`authentication required` means any of:

1. The key is wrong.
2. The key is a **License** or **Ingest** key rather than a **User** key
   (`NRAK-…`). Those send telemetry in and cannot query.
3. The key is correct and the account is in the **other region**.

All three verified live. Every place this app reports that message names all
three, the connection test checks the `NRAK-` prefix before spending a request,
and a failed test suggests trying the other region by name.

## Setup

**The key.** one.newrelic.com → API keys → Create a key → **User**.

**The region.** US or EU. An account lives in exactly one, and they are separate
endpoints holding separate data — including entity GUIDs, which do not resolve
across regions.

**The account id.** Optional but worth setting. A user key can see every account
its user belongs to, which in a large organisation is dozens, and nearly every
query needs one. Recording a default saves repeating it; every action can
override.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `nrql-query` | search | Query the data with NRQL |
| `graphql-query` | search | Any NerdGraph query — the escape hatch |
| `account-list` | read | Which accounts this key can reach |
| `user-get` | read | Who this key is |
| `entity-search` | search | Find things, and get their GUIDs |
| `entity-get` | read | One entity in detail |
| `entity-tag-add` | perform | Attach tags |
| `entity-tag-delete` | perform | Remove a tag key, or specific values |
| `alert-policy-list` | read | Alert policies |
| `alert-condition-list` | read | The conditions that actually watch something |
| `issue-list` | read | What is currently wrong |
| `issue-acknowledge` | perform | Mark an issue as being handled |
| `issue-close` | perform | Resolve an issue |
| `deployment-create` | perform | Mark a deployment on the charts |
| `dashboard-list` | read | Dashboards |
| `dashboard-get` | read | One dashboard, with the NRQL behind each widget |
| `synthetics-monitor-list` | read | Uptime monitors |

### Things the actions do that the API does not

- **`nrql-query` names the two silent defaults.** No `SINCE` means the last
  **hour**; no `LIMIT` means the first **100 rows**. Neither is an error and
  neither is mentioned in the response, and between them they account for most
  "why does this number keep changing" questions. The action reports `capped`
  when the row count lands exactly on a limit, and surfaces
  `metadata.messages`, which is where NRQL puts warnings such as having sampled
  the data.
- **`entity-search` counts what stopped reporting.** An entity that stops
  sending data does not disappear — it stays searchable, with
  `reporting: false`, for about eight days. A workflow listing applications and
  assuming they are live includes ones that went away last Tuesday.
- **`entity-get` flags `NOT_CONFIGURED`.** That `alertSeverity` means nothing is
  watching the entity at all, which is a different and usually worse condition
  than healthy — and reads exactly like one.
- **`alert-condition-list` counts two silent failures.** How many conditions are
  **disabled** — somebody silenced a noisy one during an incident and never
  turned it back on — and how many would **not fire if data stopped**, because a
  condition on a dead service evaluates against no data unless
  `openViolationOnExpiration` was explicitly set.
- **`issue-list` distinguishes three nouns.** An *incident* is one condition
  breaching once; an *issue* groups incidents and is what a person is paged
  about; an *anomaly* is neither. It queries issues, and defaults to both open
  states — filtering to `CREATED` alone omits everything already being worked
  on.
- **`deployment-create` checks the timestamp window first.** New Relic rejects
  anything more than **±24 hours** from now, so a backfill fails and so does
  every marker from a build agent with a skewed clock. The error says which.
- **`dashboard-get` pulls out the NRQL.** Every widget carries the query that
  draws it, which makes a dashboard a readable catalogue of the questions a team
  asks — and makes this the practical way to lift a query out of the UI and run
  it from a workflow.
- **`synthetics-monitor-list` separates failing from not running.** A monitor
  whose target is down is *failing*; a monitor that is disabled or has no
  locations assigned is **silent**. "No synthetics alerts" and "no synthetics
  running" look identical otherwise.
- **`entity-tag-delete` warns about coverage.** Alert conditions and workloads
  *select* on tags, so removing one can quietly drop an entity out of whatever
  was watching it.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | New Relic's own status, by region |
| `reporting` | dependency | connection | signed | Is anything still sending data |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

### `reporting` — the one worth reading about

This is the failure worth checking for on an observability vendor
specifically. If an agent stops, a host is decommissioned, or an ingest key is
rotated and not updated, New Relic does not complain — it simply has no data,
and every dashboard goes quiet. **Quiet is what healthy looks like.**

And it compounds: alert conditions on a service that stopped reporting evaluate
against *no data* and therefore never fire, unless somebody configured them to
open an incident on expiration. So an outage in the telemetry pipeline silently
disables the alerting that would have caught it.

The check reports the proportion of the account's entities with
`reporting: false` and names the domains it is concentrated in. Half the account
is a pipeline that has stopped, and the message says what that does to the
alerting.

### `service`

`status.newrelic.com` is an Atlassian Statuspage with **115 components** — and
the naming is the useful part: every one carries its data centre as a suffix
(`APM : US`, `Alerts : Europe`, `Synthetics : JP`), under groups like
`Data Ingest : US`.

That matters because an account lives in exactly one region, and an incident in
another is not an incident for it. A check that rolled all 115 together would
report every EU outage to every US customer, which is noise that trains people
to ignore it. So this reports only the affected components and **names the
regions** in the message — enough to tell in a second whether it is yours. It is
`scope: "app"` and therefore capped at `degraded`, since it cannot know which
region a given connection reads.

### `quota`

Declared unavailable. NerdGraph returns no rate-limit headers on either endpoint
— verified by reading the full response headers from both. Limits do exist:
NRQL queries are bounded per minute per account, and going over returns an error
in the GraphQL `errors` array inside an HTTP 200, which the client surfaces. But
the remaining allowance is not published anywhere a check could read it.

The consumption that actually matters commercially is not requests at all — New
Relic bills on data **ingested** and on billable users, neither of which this
connection's key affects. Those are queryable with NRQL against `NrConsumption`
and `NrMTDConsumption`, which is a deliberate reporting question for a workflow
rather than a health check. `nrql-query` is how to ask it.

## Icon

`assets/icon.png` (180×180), downloaded verbatim from
`https://newrelic.com/themes/custom/erno/assets/images/metadata/apple-touch-icon.png`
on 2026-08-18 — New Relic's own site. Checked with `_tools/icon-legibility.ts`.

## Tests

169 assertions across 23 files: one per action, one per auth method, one per
live health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook — plus two specific to this app: nothing decides success from `res.ok` or
an HTTP status code, and **every action that sends a mutation confirms it did
something**, which is what caught `deployment-create` returning no id.
