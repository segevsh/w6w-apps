# Grafana

Manage dashboards, data sources, annotations, and alert rules on any Grafana instance.

- **Categories** — monitoring
- **Auth methods** — service-account-token
- **Actions** — 8
- **Egress allowlist** — `*`
- **Website** — https://grafana.com
- **API docs** — https://grafana.com/docs/grafana/latest/developers/http_api/

## The arbitrary-endpoint model

Grafana's HTTP API is identical whether you're talking to a self-hosted install, an on-prem
instance, or a Grafana Cloud stack — every operation (dashboards, data sources, annotations,
alert rules) is a plain HTTP request against `<base-url>/api/...`. But unlike a SaaS API with
one fixed hostname, a Grafana instance can live at **any** domain: a customer's own VPC, an
on-prem network segment, a self-managed box, or a Grafana Cloud stack
(`https://<stack>.grafana.net`), each with its own URL. There is no single host this app
could put in `w6w.network.allow`.

So this app follows the same precedented pattern as `elastic`, `wordpress`, and
`woocommerce`: `w6w.network.allow` is `["*"]`, and the instance's own base URL is collected
as an `endpoint` field on the Connection. Every action builds its request URL from that field
— see `lib/client.ts`. Auth's `afterConnect` republishes `endpoint` (never the credential)
onto `connection.display` so action code, which never sees the credential, can still build
correct URLs.

## Auth

**`service-account-token`** — `Authorization: Bearer <token>`, confirmed against Grafana's
own docs: "Service accounts replace API keys as the primary way to authenticate applications
that interact with Grafana." Classic API keys still work on most instances but are the legacy
path; this app only offers the current recommended terminology and mechanism (Administration
→ Users and access → Service accounts → Add service account token, or
`POST /api/serviceaccounts/:id/tokens`). Tokens are prefixed `glsa_`.

`endpoint` is collected alongside the token, since the instance's URL is part of the
connection, not a fixed constant.

## Actions

| Key | Type | Resource | Grafana call |
|---|---|---|---|
| `dashboard-list` | search | dashboard | `GET /api/search?type=dash-db` — filter by query/tag/folder |
| `dashboard-get` | read | dashboard | `GET /api/dashboards/uid/:uid` |
| `dashboard-create-update` | perform | dashboard | `POST /api/dashboards/db` — create, or overwrite by uid |
| `datasource-list` | read | datasource | `GET /api/datasources` |
| `datasource-get` | read | datasource | `GET /api/datasources/uid/:uid` |
| `annotation-create` | perform | annotation | `POST /api/annotations` — point or region, global or dashboard/panel-scoped |
| `alert-rule-list` | read | alert-rule | `GET /api/v1/provisioning/alert-rules` |
| `alert-rule-get` | read | alert-rule | `GET /api/v1/provisioning/alert-rules/:uid` |

All endpoints are the legacy `/api/*` surface. Grafana is introducing a newer, Kubernetes-style
`/apis/*` structure starting with dashboards in Grafana 12+, but the legacy endpoints remain
fully accessible on every supported version (self-hosted or Cloud) and are what Grafana's own
docs state will keep working: "Legacy APIs are not being disabled and remain fully accessible
and operative." The legacy surface was chosen for broadest compatibility across arbitrary
instances, matching the same n8n-tested endpoints this app was cross-checked against.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and is *this tenant's instance* reachable.

### Is the vendor up?

**Service status** — none published, and declared absent (`unavailable`) rather than
omitted. There is no single vendor status signal for an arbitrary self-hosted/on-prem Grafana
instance: the instance itself IS the dependency, which is what `dependency`/`site` probes.
Grafana Labs does publish status.grafana.com, but it covers Grafana Labs' own hosting
infrastructure, not a given customer's instance, and this app has no way to know which
deployment model a Connection points at.

### Is this credential live?

This is what the Auth `test` hook does — the app's own credential check.

```
GET /api/org
```

Needs only the `orgs:read` action — the narrowest privilege a service account can hold — so a
token scoped away from admin endpoints is never reported broken just because the probe
happened to need more than it was granted.

### Is this tenant's instance reachable?

Since every Connection points at a different instance, this is a `dependency` /
`credential: "context"` check, not a vendor `service` check.

```
GET /api/health
```

Grafana's own unauthenticated liveness probe — confirmed against Grafana's own HTTP API
docs: it returns `{ commit, database, version }` with no auth required, specifically so
monitoring tooling can check instance health without a credential. A `database` field other
than `"ok"` reports `degraded` (the instance answered, but its own datastore is unhealthy); a
404 or 5xx reports `down` — a different failure from a bad credential, which is exactly the
distinction the derived `auth:*` check cannot make on its own.

### Is there quota left?

None — declared absent. Grafana exposes no standard rate-limit/quota API for arbitrary
instances. Org-level resource quotas exist as a Grafana Enterprise/Cloud admin feature, gated
behind org-admin privilege, not a universal signal every self-hosted instance provides.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:service-account-token` | credential | connection | signed | fatal | — | derived from the `service-account-token` auth method's `test` hook |

**`service` is declared absent.** There is no vendor status page for an arbitrary
self-hosted/on-prem Grafana instance: the instance IS the dependency, which is what the
`site` check probes. Grafana Labs publishes status.grafana.com, but that covers Grafana Labs'
own hosting infrastructure, not a specific customer's instance, and this app cannot tell
which deployment model a Connection uses.

**`quota` is declared absent.** Grafana exposes no standard rate-limit/quota API for arbitrary
instances; org-level quotas are an Enterprise/Cloud admin feature, not a universal signal. A
declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-08-01 against Grafana's own HTTP API documentation
(service account tokens, dashboards, data sources, annotations, alerting provisioning, and
`/api/health`), cross-checked against the community-tested `n8n-nodes-base` Grafana node's
dashboard endpoints, which agree with the official docs. Grafana's legacy `/api/*` surface is
stable across versions and Grafana Labs states it will remain accessible even as `/apis/*`
supersedes it for new development; re-check if a probe starts failing for everyone at once.
