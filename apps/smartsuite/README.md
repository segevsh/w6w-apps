# SmartSuite

Manage Solutions, Tables, Records, Fields, Comments and Members in SmartSuite.

- **Categories** — databases, project-management, productivity
- **Auth methods** — api-key (Workspace ID + API Key, `custom`)
- **Actions** — 17
- **Egress allowlist** — `app.smartsuite.com`
- **Website** — https://www.smartsuite.com
- **API docs** — https://developers.smartsuite.com/docs/authentication
- **Rate limits** — https://developers.smartsuite.com/docs/rate-limits

## Auth — two headers, not one

SmartSuite is **not** a single bearer-token API. Every documented endpoint takes
two headers, which is why this app declares a `custom` auth method rather than
`bearer` or `apiKey`:

```
Authorization: Token <apiKey>
ACCOUNT-ID:    <accountId>
```

The first comes from SmartSuite's auth document — *"The header value should be
formatted with the word Token, followed by a space, then the API token"* — and
the second carries the **Workspace ID** (SmartSuite calls it the Account ID)
visible in the workspace URL/settings. `auth/api-key.ts` stamps both in its
`sign` hook; actions never see the credential.

### Both fields fail independently, and the order matters

SmartSuite validates the `ACCOUNT-ID` header **before** it looks at the token, so
a `400` alone does not tell you which field is wrong. The `test` hook reads the
response body as **text** (the account-id failures are plain text, not JSON) and
classifies:

| Response | Meaning | Classified as |
|---|---|---|
| `2xx` | token + workspace accepted | `ok` |
| `400` body contains `Account ID` (`Account ID is not specified`, `Account ID <value> is not valid`) | the `accountId` field is wrong | invalid **accountId** |
| `401` / `403`, or a `400` whose body does **not** mention `Account ID` | the `apiKey` is rejected | invalid **apiKey** |

Success is decided by the `2xx` status alone — nothing about the response is
echoed back as a credential signal, and the message never contains the
credential.

## Records are opaque, schema-dependent JSON

SmartSuite's field types are defined **per table**: each Table has its own field
slugs and its own per-type configuration. There is no static shape that fits
every record body, so every record and field action accepts the payload as a
`type: "json"` param and passes it through:

- `create-record` / `update-record` take a `fields` object keyed by this table's
  field slugs.
- `create-record`'s body **is** that object (`POST …/records/` with the record
  directly), unlike Airtable where it is nested under a `fields` key.
- `add-field` / `update-field` take the whole `field` document
  (`{ slug, label, field_type, … }`) wrapped under the documented `{ "field": … }`
  body key.
- `add-comment` takes the SmartDoc `message` tree
  (`{ "data": { "type": "doc", "content": […] } }`) as-is.

Call `get-table` first when a workflow needs the current slugs, rather than
hardcoding column names that drift when someone edits the table.

One documented asymmetry: the **single-record** create endpoint enforces required
fields (answering `422` with a detailed body), while the **bulk** add endpoint
does **not**. The `422` is surfaced as-is so the caller sees exactly which slug
SmartSuite objected to.

## Paging

`list-records` and `list-members` answer the same envelope —
`{ total, offset, limit, items }` — and page with plain `offset`/`limit` query
params (no opaque cursor). `limit` defaults to 100 and maxes at 1000. The bulk
record endpoints accept at most **25** items per call (`422` beyond that).

## Health check

Three questions are kept apart: is the *vendor* up, is *this credential* live,
and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.smartsuite.com>

```
GET https://status.smartsuite.com/api/v2/summary.json
```

Atlassian Statuspage, self-identifying as `page.name === "SmartSuite"` with
`page.url === "https://status.smartsuite.com"` (both asserted by the probe).

SmartSuite runs **region-scoped clusters**, and the page carries two API
components — `API US` (`y7ybh3n19y6w`) and `API EU` (`6ly03chn3njc`) — among
seventeen components that also cover file-management infrastructure and the other
regional surfaces. `app.smartsuite.com` is the single documented API host with
no region selector, so the verdict follows the **`API US`** component only; the
other components are reported as detail and the page-level roll-up is
deliberately not allowed to drive (or escalate) the verdict — an EU-only or
file-infrastructure incident cannot affect a single call this app makes.

`degraded_performance` / `partial_outage` → `degraded`, `major_outage` → `down`,
anything else → `unknown`. A status API that itself fails is reported `unknown`,
never `down`.

The host `status.smartsuite.com` lives **only** in that hook's own allowlist
(`network.allow` on the check), not in the app's egress allowlist: status hosts
must never see a credential, and the widening is permitted only because the check
is unsigned.

### Is this credential live?

This is what the Auth `test` hook does — the only one of the three the app
performs itself:

```
GET https://app.smartsuite.com/api/v1/solutions/
```

A cheap read that never echoes the credential and needs no scope beyond basic
read access, probed with both headers (see the classification table above).

### Do we have quota left?

No headroom endpoint and no rate-limit response header exists. SmartSuite
enforces a flat **5 requests per second per API key** and answers `429` with a
30-second cool-off, so `Retry-After` on a rejected call is the only signal — and
reading it requires making the call that gets rejected. Declared absent.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` — `API US` component on status.smartsuite.com |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## Not yet covered

- **Webhooks are out of scope for this pass.** SmartSuite's webhook API lives on
  a **separate host** (`webhooks.smartsuite.com`) using a Twirp/RPC-style path
  convention (`/smartsuite.webhooks.engine.Webhooks/CreateWebhook`) rather than
  the REST style used by `app.smartsuite.com`. It is not part of this app's
  egress allowlist (which is exactly `["app.smartsuite.com"]`), so no webhook
  trigger or action is built here.
- **Fields are passed through opaquely.** `add-field` / `update-field` do not
  enumerate the per-field-type configuration; validation of `field_type` and its
  type-specific keys is left to SmartSuite, which returns a descriptive error.

---

Endpoints, headers and error bodies verified against
<https://developers.smartsuite.com/docs/…> on 2026-09-22. `status.smartsuite.com`
and its `API US` component id were confirmed live on the same date; status
surfaces move, so re-run `deno task validate` if a probe starts failing for
everyone at once.
