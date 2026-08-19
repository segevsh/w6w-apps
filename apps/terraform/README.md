# HCP Terraform

Drive HCP Terraform — and Terraform Enterprise, which is the same API
self-hosted: list workspaces, queue and confirm runs, read state outputs, and
manage the variables runs execute with.

- **Categories** — devops, developer-tools
- **Auth methods** — token
- **Actions** — 20
- **Egress allowlist** — `*`
- **Website** — https://www.hashicorp.com/products/terraform
- **API docs** — https://developer.hashicorp.com/terraform/cloud-docs/api-docs

Verified live against `app.terraform.io` on 2026-08-18 (`tfp-api-version: 2.6`,
`tfp-appname: HCP Terraform`).

> **On the allowlist.** Terraform Enterprise is this API self-hosted at whatever
> address an organisation put it, so there is no useful list to name. The
> default host is `https://app.terraform.io` and a connection may point
> anywhere.

## This app can change real infrastructure, and that shapes it

Every other app in this pack moves data. This one creates and destroys servers,
databases and DNS. Four properties of the API make that easier to do by accident
than it should be, and the actions are built around them:

- **A run against an `auto-apply` workspace applies itself.** No confirmation,
  no second call, nothing in between. `run-create` therefore defaults to
  **plan-only** — which cannot apply under any workspace setting — reads the
  workspace before submitting anything, and refuses an applyable run without an
  explicit acknowledgement.
- **A destroy run destroys everything the workspace manages**, not the thing you
  changed. Gated behind the workspace name typed back.
- **An apply cannot be undone.** `run-apply` reads the plan first and refuses to
  proceed when it destroys resources unless the caller states how many. A
  *replaced* resource counts as one destruction and one addition, which is the
  most common way an apply does more than the person confirming it expected.
- **Deleting a workspace does not delete the infrastructure.** The servers keep
  running, the bill keeps arriving, and nothing is left that knows they were
  ever managed. `workspace-delete` uses `safe-delete` — which refuses with a 409
  while resources exist — unless forced with the name typed back.

Eight parameters across the app exist only as gates; `tests/index.test.ts`
asserts each one, so removing a gate fails the suite rather than passing
quietly.

## It is JSON:API, and nothing else in this pack is

Every request and response is `application/vnd.api+json`, and that is the whole
shape rather than a content-type detail:

| | |
| --- | --- |
| Envelope | `{"data": {"type", "id", "attributes", "relationships"}}` — always |
| Attribute names | **kebab-case**: `auto-apply`, `terraform-version`, `resource-destructions` |
| Related objects | `{type, id}` pointers in `relationships`; the object is elsewhere |
| Writes | `application/json` is refused; the `type` is checked |
| Pagination | `page[number]`/`page[size]` in, `meta.pagination.next-page` out — kebab-case too |

Two traps follow from it, and the app handles both:

**An unrecognised attribute is ignored, not rejected.** A PATCH sending
`auto_apply` returns **200 with the workspace unchanged**. The call succeeded,
the setting did not move, and nothing says so. `workspace-update` verifies what
came back against what it asked for and reports `changed` / `unchanged` rather
than trusting the status code.

**`include` sideloads; it does not nest.** `?include=plan` appends a top-level
`included` array while the run keeps a pointer, so reading
`run.plan.resource-destructions` gets `undefined` from a document that contains
the number. `resolve()` joins them back.

One inconsistency worth knowing: the `actions/apply`, `actions/discard` and
`actions/cancel` endpoints take a **bare** `{"comment": "…"}` body, not the
envelope. Wrapping it is accepted and the comment is silently dropped.

## Three token kinds, and the failures never mention them

| Kind | What it cannot do |
| --- | --- |
| User | — this is what an automation should hold |
| Team | Workspaces outside its team answer **404**, not 403 |
| Organization | **Cannot create runs and cannot read state** |

They are all opaque strings of the same shape. The organization token is the one
people pick because it sounds the most powerful; it is the one that cannot do
the two things a deployment workflow needs. `account-get` reports which kind is
connected, and the auth hook records it at connect time.

404 is also what a resource outside the token's reach returns, so "it does not
exist" and "you cannot see it" are the same answer.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `account-get` | read | Who this token is, and what kind it is |
| `organization-list` | read | The organisations it can see |
| `organization-get` | read | One organisation's settings |
| `workspace-list` | search | An organisation's workspaces, with the risky ones counted |
| `workspace-get` | read | One workspace, by id or by name |
| `workspace-create` | perform | Create an API-driven workspace |
| `workspace-update` | perform | Change settings, and report what actually changed |
| `workspace-lock` | perform | Stop runs from starting |
| `workspace-unlock` | perform | Let them start again |
| `workspace-delete` | perform | Remove a workspace — not its infrastructure |
| `run-create` | perform | Queue a run, plan-only by default |
| `run-get` | read | Where a run got to, with its plan's counts |
| `run-list` | search | A workspace's history, with what is stuck |
| `run-apply` | perform | Confirm an apply |
| `run-discard` | perform | Throw a plan away |
| `run-cancel` | perform | Interrupt a run, or kill it |
| `state-outputs` | read | What this workspace publishes |
| `variable-list` | read | A workspace's variables |
| `variable-set` | perform | Create or update one |
| `variable-delete` | perform | Remove one |

### Things the actions do that the API does not

- **Every workspace action takes an id *or* an organisation and name.** Ids come
  back from other calls; names are what a person reads off the interface.
  Requiring one would mean every workflow starts with a lookup it writes itself.
- **`workspace-list` counts `auto-apply` and `locked`.** The first is how many
  workspaces change infrastructure without asking; the second is how many accept
  runs and never start them. A locked workspace does not *refuse* a run — it
  queues it, so the workflow that created one waits for a state that will not
  arrive.
- **`run-get` answers "is this done" rather than exposing a status to compare.**
  `planned_and_finished` is a **success** — the plan found no changes, or the run
  was plan-only — and a loop waiting for `applied` hangs on it forever. So the
  action reports `finished` and `awaitingDecision` alongside the raw status.
- **`run-list` counts what is waiting for a person.** A run in `planned` holds
  the queue and everything behind it.
- **`state-outputs` is the plug-and-play seam.** Outputs are how infrastructure
  tells everything else what it ended up as — the database endpoint, the queue
  URL, the generated bucket name. Sensitive outputs return `null` and the action
  names them separately so a workflow reading `undefined` knows why. The rest may
  still be secrets: **Terraform does not know what is secret**, and a connection
  string nobody marked comes back in full.
- **`variable-set` upserts**, because creating an existing variable is a 422 and
  updating a missing one needs an id nobody has. It matches on key **and**
  category, since the same name can exist once in each — and it refuses to update
  a sensitive variable without an explicit value, because writing back the `null`
  a read returned empties a credential the runs depend on.
- **`run-cancel` checks `is-force-cancelable` before offering force**, rather
  than letting the API answer 409. Cancel lets Terraform stop at a safe point;
  force kills it, and an interrupted *apply* leaves resources that exist and are
  not in the state file.
- **`workspace-unlock` gates force-unlock.** Two applies against one state file
  is the mechanism behind state corruption.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is HCP Terraform itself up |
| `instance` | dependency | connection | none | Is *this* instance up, and still the same one |
| `quota` | quota | connection | none | Declared unavailable — the headers measure one second |

### `service` — `summary.json` omits the component this app depends on

`status.hashicorp.com` is a Statuspage, so the conventional probe is
`/api/v2/summary.json`. Measured 2026-08-18:

| Route | Components returned |
| --- | --- |
| `/api/v2/summary.json` | **25** |
| `/api/v2/components.json` | **62** |

The board is a flat list ordered by `position`, and summary truncates it.
**`HCP Terraform` is at position 37** — it is not in `summary.json` at all.

So the conventional check does not read the wrong component; it reads
twenty-five components belonging to Boundary, Packer, Waypoint and assorted
cloud regions, finds them operational, and reports Terraform healthy while
Terraform is down. That is worse than having no check, because it is
confidently wrong. This one reads `components.json`.

It watches two components. `HCP Terraform` is the API and the run pipeline;
`Terraform Registry` is where providers and modules are downloaded during a
plan, so a run against a healthy API still fails when it is out — a distinct
outage on the same page.

Matching is on **exact** names, because the page repeats region names across
products: `AWS-us-east-1` appears twice with different ids and nothing in the
JSON says which product each belongs to, so a substring match picks one at
random.

### `instance`

Pings `/api/v2/ping` on **this connection's own host, unauthenticated** — it
answers **204 without a token**, verified live, so a revoked credential cannot
read as an outage. This is the only check that speaks for a self-hosted
Terraform Enterprise, which is on nobody's public status page.

It also watches the two headers the ping returns:

```
tfp-appname: HCP Terraform
tfp-api-version: 2.6
```

A changed `tfp-appname` means the address now points at a different instance. A
changed `tfp-api-version` means the instance was upgraded — endpoints appear and
change behaviour between versions, and a call that starts 404ing afterwards says
nothing about versions in its error.

### `quota` — declared unavailable, for an unusual reason

Almost every declared absence in this pack says *the vendor publishes nothing*.
Terraform publishes precise headers on every response:

```
x-ratelimit-limit: 30
x-ratelimit-remaining: 29
x-ratelimit-reset: 1.0
```

Thirty requests **per second**, refilling in one. `remaining` is not headroom
against a budget — it is how much of the current second is left, and the window
it measured is over before the result is stored. A check reporting "29 of 30
remaining" would be accurate, meaningless and reassuring.

Two consequences the code encodes: `x-ratelimit-reset` is **fractional seconds,
not a Unix timestamp** (the reflexive `new Date(reset * 1000)` gives January
1970), and a 429 is a **fan-out** problem cleared by waiting a second, not a
quota problem cleared by a bigger plan. The budget that does matter here is
managed *resource* count against the subscription, which is not a header on any
response.

## Icon

`assets/icon.svg`, downloaded verbatim from
`https://registry.terraform.io/images/favicons/safari-pinned-tab.svg` on
2026-08-18 — the Terraform Registry's own mark. `assets/icon.dark.svg` is the
reversed variant generated by `_tools/icon-legibility.ts`.

## Tests

565 assertions across 27 files: one per action, one per auth method, one per
health check, the client, the workspace resolver, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no action touching
a credential — plus two specific to this app: **every infrastructure-changing
path still has its gate parameter**, and **nothing logs a variable value or a
state output value**, checked on the log call's values rather than its keys so
`count: outputs.length` passes and `outputs: outputs` does not.
