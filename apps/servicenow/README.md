# ServiceNow

Manage ServiceNow incidents, plus any other table, via the Table API.

- **Categories** — support, devops
- **Auth methods** — basic, oauth2
- **Actions** — 9
- **Egress allowlist** — `*.service-now.com`
- **Website** — https://www.servicenow.com
- **API docs** — https://developer.servicenow.com

## Setup

ServiceNow is single-tenant-per-customer: every account gets its own host,
`https://<instance>.service-now.com`. Both auth methods below collect an
**Instance** field for exactly this reason — it's the piece a static app
manifest can't hard-code, so it lives on the Connection instead of being
re-entered on every action. Take it from the URL: if you log in at
`https://acme.service-now.com`, the instance is `acme`.

### Username & Password (`basic`)

Plain HTTP Basic — no special username suffix, unlike some other apps in
this pack. Use a real ServiceNow user record, ideally a dedicated
integration account with a role that grants Table API access (at minimum,
read/write on whichever tables your workflows touch).

Fields: **Instance**, **Username**, **Password**.

### OAuth (`oauth2`)

Requires an OAuth **Application Registry** entry in the target instance
(**System OAuth → Application Registry**) and a matching Client ID/Secret
registered on this w6w installation. Because the authorize/token endpoints
are themselves per-instance (`https://<instance>.service-now.com/oauth_auth.do`
/ `.../oauth_token.do`), the **Instance** field is collected up front and
used to build those URLs — it is not implicitly allowlisted the way a
single, fixed OAuth host would be; `*.service-now.com` in `package.json` is
what actually permits it.

Field: **Instance**.

## Actions

### Incident (the `incident` table)

| Key | Type | Description |
|---|---|---|
| `incident-create` | perform | Open an incident. |
| `incident-get` | read | Read one incident by `sys_id`. |
| `incident-get-many` | search | List incidents, optionally filtered with an encoded query. |
| `incident-update` | perform | Update fields on an existing incident (PATCH). |

Reference fields (assignment group, assignee, caller) take a `sys_id`. Choice
fields that are customizable per instance — category, subcategory, state,
close code — are **not** hard-coded as fixed dropdowns, since a fixed list
would misdescribe an instance that has customized them; set them via
**Additional fields** (a JSON column-name → value map) instead. Urgency,
impact and contact type use ServiceNow's own default values, which are the
same across instances unless explicitly reconfigured.

### Table Record (any table)

| Key | Type | Description |
|---|---|---|
| `table-record-create` | perform | Create a record on an arbitrary table. |
| `table-record-get` | read | Read one record by `sys_id`. |
| `table-record-get-many` | search | List records, optionally filtered with an encoded query. |
| `table-record-update` | perform | Update fields on a record (PATCH). |
| `table-record-delete` | perform | Delete a record by `sys_id`. |

The same five verbs the Table API exposes for `incident`, generalized to a
`table` param — `problem`, `change_request`, `cmdb_ci`, `sys_user`, a custom
`u_*` table, anything the API knows about. Use this group for the resources
n8n's ServiceNow node exposes as separate named resources (`user`,
`userGroup`, `userRole`, `businessService`, `configurationItems`,
`department`, `dictionary`) — each of those is just this same generic CRUD
pointed at a fixed table name (`sys_user`, `sys_user_group`,
`sys_user_role`, `cmdb_ci_service`, `cmdb_ci`, `cmn_department`,
`sys_dictionary`), so this app covers them without dedicating an action per
table.

Deliberately absent: n8n's `attachment` resource (binary upload/download —
outside this pack's `ctx.fetch`-JSON action shape) and its dynamic
`loadOptions` dropdowns (tables, columns, choice lists, users, groups) — this
app takes those as plain string params instead of live-querying the instance
to populate a picker.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left.

### Is the vendor up?

**Declared absent.** ServiceNow is not a single shared platform — every
customer instance is its own host with its own maintenance schedule and
incident history, and ServiceNow publishes no public JSON API or feed that
reports across instances. The `instance` dependency check below probes this
connection's own instance instead, which is the closest analogous question
that actually has an answer.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

Both auth methods probe:

```
GET /api/now/table/sys_user_role?sysparm_limit=1
```

The same table n8n's credential test probes — small, and about as close to a
scope-free "can this account reach the Table API at all" as ServiceNow gets.

### Do we have quota left?

**Declared absent.** `Retry-After` only shows up once a 429 has already
happened, and the documented `X-RateLimit-*` headers only appear when an
admin has opted the instance into inbound REST rate-limit rules — most
haven't, and even instances that have report them inconsistently. There is
no `/rate_limit`-style endpoint (GitHub) or always-present header pair
(Zendesk) to fall back to, so this app declares the absence rather than
polling a signal that may or may not exist.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `instance` | dependency | connection | context | degraded | 120s | `health/instance.ts` |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** ServiceNow has no single shared platform —
each customer runs on its own instance (`<instance>.service-now.com`), and no
public JSON API or feed reports status across instances. The `instance`
dependency check probes this connection's own instance instead.

**`quota` is declared absent.** No always-present quota signal exists — see
above.

A declared absence always reports `unknown`, so both carry
`severity: "informational"` — otherwise either would pin every verdict for
this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-31 against ServiceNow's public Table
API documentation and n8n's `ServiceNow` node. Status/rate-limit surfaces
move; re-verify if a probe starts failing for everyone at once.
