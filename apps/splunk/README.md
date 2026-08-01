# Splunk

**Scoped to Splunk Cloud Platform only — not self-hosted/on-prem Splunk.** w6w Apps run in a
network-less sandbox that can only reach hosts declared statically in the manifest's `network.allow`
at publish time; there is no per-connection dynamic host override. A self-hosted Splunk install
lives at whatever domain its owner chose, which a static manifest cannot enumerate, so a single
published App cannot honestly support it. Splunk Cloud Platform instances all live under the fixed
`*.splunkcloud.com` suffix, which is what makes a wildcard `network.allow` entry legitimate. If you
run Splunk Enterprise on your own infrastructure, this app will not reach it.

Run and read back Splunk searches, list saved searches ("Reports") and list indexes.

- **Categories** — monitoring, devops
- **Auth methods** — token
- **Actions** — 8
- **Egress allowlist** — `*.splunkcloud.com`

## Setup

1. In Splunk Web, go to **Settings → Tokens** and enable token authentication for your stack if it
   isn't already (Splunk Cloud disables it by default on some plans).
2. **Settings → Tokens → New Token** to mint an authentication token for the account this Connection
   should act as.
3. Connect this app with:
   - **Stack hostname** — the full Splunk Cloud stack host, e.g. `acme.splunkcloud.com`. Not the
     short name, not a URL — just the host. The management API is reached on port 8089 of this host
     (`https://acme.splunkcloud.com:8089`), which the client builds for you.
   - **Auth Token** — the token from step 2.

## Auth

**`token`** (`apiKey`) — `Authorization: Bearer <token>` against the stack's management API on
port 8089. Verified directly against Splunk's own token-authentication documentation, which shows
this exact header against a live `*.splunkcloud.com:8089` example.

The stack hostname is collected once, at connect time, rather than re-entered on every action — it
identifies the tenant, so it belongs to the Connection. `afterConnect` probes
`GET /services/authentication/current-context` (Splunk's "whoami": username, real name, roles) and
records both the stack and the resolved username on the connection's display data; `lib/client.ts`
reads the stack from there to build every request URL.

## Actions

### Search jobs

Splunk's search API is **job-based and asynchronous** by default: creating a search returns a `sid`
immediately while the job keeps running server-side. This app models that honestly rather than
pretending it's synchronous.

| Key                  | Type    | What it does                                                                                                                                                                                                   |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search-create`      | perform | `POST /services/search/jobs` — dispatch a search, get back a `sid`.                                                                                                                                            |
| `search-get`         | read    | `GET /services/search/jobs/{sid}` — dispatch state, done-ness, progress.                                                                                                                                       |
| `search-get-results` | search  | `GET /services/search/jobs/{sid}/results` — result rows once the job is done.                                                                                                                                  |
| `search-get-many`    | search  | `GET /services/search/jobs` — list jobs visible to this credential.                                                                                                                                            |
| `search-delete`      | perform | `DELETE /services/search/jobs/{sid}` — cancel and free a job early.                                                                                                                                            |
| `search-oneshot`     | search  | `POST /services/search/jobs` with `exec_mode=oneshot` — runs on the request thread and returns results directly, no job. For searches small enough to wait for inline; blocks for as long as the search takes. |

### Saved searches & indexes

| Key                     | Type   | What it does                                                                                                                                                                        |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saved-search-get-many` | search | `GET /services/saved/searches` — list saved searches (Splunk Web's "Reports").                                                                                                      |
| `index-get-many`        | search | `GET /services/data/indexes` — list indexes. Defaults to event indexes; `datatype: "all"` includes metric indexes too (Splunk's REST API returns event-only unless told otherwise). |

### Deliberately absent: HTTP Event Collector (event ingestion)

This app does not send events via HEC, and that's a scoping decision, not an oversight. Splunk
Cloud's HEC endpoint lives on a **different hostname** than the management API — verified against
Splunk's own HEC setup docs:

- AWS: `http-inputs-<host>.splunkcloud.com`
- GCP / Azure: `http-inputs.<host>.splunkcloud.com`
- AWS GovCloud: `http-inputs.<host>.splunkcloudgc.com`

Which form applies depends on which cloud the customer's stack runs on — information this app has no
way to derive from the stack hostname alone, so deriving the HEC host would mean guessing. HEC also
authenticates with its own per-input HEC token, using a different header scheme from the management
API:

```
Authorization: Splunk <hec-token>      # HEC — a separate credential
Authorization: Bearer <token>          # management API — this app's Auth
```

That's a second credential this app's single Auth method does not collect. Both facts made a "send
event" action impossible to build honestly within this app's `network.allow`/Auth as scoped; it is
left out rather than modeled with an invented host or a bolted-on second credential field.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — <https://status.splunkcloud.com>, a Statuspage.io-hosted page. Verified live:
`GET https://status.splunkcloud.com/api/v2/summary.json` returns a genuine **current-state** JSON
API (`{ status: { indicator, description }, components: [{ name, status }, …] }`), not just a feed
of past updates — so `health/service.ts` reads it directly rather than declaring `feed` and parsing
incident prose. One call reports the overall indicator and each component (Ingest Processor, Login,
Index, …) independently, so an incident confined to one component doesn't grey out the whole
platform in the roll-up.

### Is this credential live?

This is what the Auth `test` hook does — the app's own credential check, derived automatically into
the health surface as `auth:token`.

Probes:

```
GET /services/authentication/current-context
```

Splunk's "whoami" — needs no more scope than any authenticated token has, and is the same probe
`afterConnect` already makes to resolve the connection label.

### Do we have quota left?

**Not implemented, on purpose.** Splunk Cloud Platform enforces search concurrency via per-role
`srchJobsQuota`/`srchDiskQuota` limits and returns a `429` with a `waitTime` field when a generic
REST rate limit is hit, but there is no single documented endpoint this app could verify that
reports "quota remaining" as a number the way Zendesk's or GitHub's rate-limit headers do. Rather
than invent a quota reading from an unverified endpoint, this app declares no `quota` health check.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key          | Kind       | Scope      | Credential | Severity | Min interval | Probe                                              |
| ------------ | ---------- | ---------- | ---------- | -------- | ------------ | -------------------------------------------------- |
| `service`    | service    | app        | none       | degraded | 120s         | `health/service.ts`                                |
| `auth:token` | credential | connection | signed     | fatal    | —            | derived from the `token` auth method's `test` hook |

No `quota` check is declared — see above.

---

Researched and endpoint-verified 2026-07-31 against Splunk's own documentation (docs.splunk.com /
help.splunk.com) and a live fetch of `status.splunkcloud.com/api/v2/summary.json`. Re-verify if a
probe starts failing for everyone at once.
