# Elasticsearch

Search, index, and manage documents and indices on any Elasticsearch cluster.

- **Categories** — search
- **Auth methods** — api-key, basic
- **Actions** — 9
- **Egress allowlist** — `*`

## The arbitrary-endpoint model

Elasticsearch is unusually, among databases, natively HTTP/REST: every operation — search,
index, get, delete, list — is a plain HTTP request, even against a self-hosted install. But
unlike a SaaS API with one fixed hostname, an Elasticsearch cluster can live at **any**
domain: a customer's own VPC, an on-prem network segment, a self-managed box, or a hosted
deployment (Elastic Cloud, or a cloud provider's managed offering) each with its own
generated URL. There is no single host this app could put in `w6w.network.allow`.

So this app follows the same precedented pattern as `wordpress` and `woocommerce`:
`w6w.network.allow` is `["*"]`, and the cluster's own base URL is collected as an
`endpoint` field on the Connection (e.g. `https://my-cluster.es.us-central1.gcp.cloud.es.io:9243`).
Every action builds its request URL from that field — see `lib/client.ts`. Auth's
`afterConnect` republishes `endpoint` (never the credential) onto `connection.display`
so action code, which never sees the credential, can still build correct URLs.

## Auth

Two schemes, both confirmed against Elastic's own REST API docs:

- **`api-key`** (recommended) — `Authorization: ApiKey <base64(id:api_key)>`. The `id` and
  `api_key` are the two values Elastic returns when an API key is created (Kibana: Stack
  Management → API Keys → Create API key, or `POST /_security/api_key`).
- **`basic`** — standard HTTP Basic auth (RFC 7617) against a native-realm (or any
  realm-backed) Elasticsearch user.

Both methods collect `endpoint` alongside their credential fields, since the cluster's URL
is part of the connection, not a fixed constant.

## Actions

| Key | Type | Resource | Elasticsearch call |
|---|---|---|---|
| `search` | search | document | `POST /<index>/_search` — full Query DSL passthrough |
| `document-index` | perform | document | `PUT /<index>/_doc/<id>` (given an id) or `POST /<index>/_doc` (auto id) |
| `document-get` | read | document | `GET /<index>/_doc/<id>` |
| `document-update` | perform | document | `POST /<index>/_update/<id>` — partial `doc` merge |
| `document-delete` | perform | document | `DELETE /<index>/_doc/<id>` |
| `index-create` | perform | index | `PUT /<index>` — optional mappings/settings/aliases |
| `index-delete` | perform | index | `DELETE /<index>` |
| `index-list` | read | index | `GET /_cat/indices?format=json` |
| `index-mapping-get` | read | index | `GET /<index>/_mapping` |

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and is *this tenant's cluster* reachable.

### Is the vendor up?

**Service status** — none published, and declared absent (`unavailable`) rather than
omitted. There is no single vendor status signal for an arbitrary self-hosted/on-prem
cluster: the cluster itself IS the dependency, which is what `dependency`/`site` probes.
Elastic Cloud does publish a status page (status.elastic.co), but it covers Elastic's own
hosting infrastructure, not a given customer's deployment, and this app has no way to know
which deployment model a Connection points at.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /_security/_authenticate
```

Elasticsearch's "whoami" — it needs no privilege beyond being authenticated, so a
narrowly-scoped API key (restricted to one index, say) is never reported broken just
because the probe happened to need cluster-admin scope.

### Is this tenant's cluster reachable?

Since every Connection points at a different cluster, this is a `dependency` /
`credential: "context"` check, not a vendor `service` check — the RFC's model for exactly
this case (see `wordpress`'s `site` check for the same pattern against a different vendor).

```
GET /
```

Unauthenticated, and a **401 counts as reachable**: Elasticsearch has enabled security by
default since 8.0, so a live, healthy cluster answers an unauthenticated root request with
401 (`WWW-Authenticate` header and all) rather than refusing the connection outright. Only a
transport failure, a 404 (nothing Elasticsearch-shaped listening at that URL), or a 5xx marks
the cluster itself as the problem — a different failure from a bad credential, which is
exactly the distinction the derived `auth:*` check cannot make on its own.

### Is there quota left?

None — declared absent. Elasticsearch exposes no standard rate-limit/quota API; each cluster
imposes whatever thread-pool and circuit-breaker limits its own configuration sets.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

**`service` is declared absent.** There is no vendor status page for an arbitrary
self-hosted/on-prem cluster: the cluster IS the dependency, which is what the `site` check
probes. Elastic Cloud publishes status.elastic.co, but that covers Elastic's hosting
infrastructure, not a specific customer deployment, and this app cannot tell which model a
Connection uses.

**`quota` is declared absent.** Elasticsearch exposes no standard rate-limit/quota API; each
cluster imposes whatever thread-pool and circuit-breaker limits its own configuration sets.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-08-01 against Elastic's own REST API documentation
(API key authentication, cluster health, `_security/_authenticate`) and the community-tested
`n8n-nodes-base` Elasticsearch node's document/index endpoints, which agree with the official
docs. Elastic's REST surface is stable across versions; re-check if a probe starts failing for
everyone at once.
