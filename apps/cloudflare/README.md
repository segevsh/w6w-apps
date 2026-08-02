# Cloudflare

Consume Cloudflare API

- **Categories** — devops
- **Auth methods** — api-token
- **Actions** — 8
- **Egress allowlist** — `api.cloudflare.com`
- **Website** — https://www.cloudflare.com
- **API docs** — https://developers.cloudflare.com/api/

## Auth methods

Only **API Token** (`Authorization: Bearer <token>`) is implemented. Cloudflare's own docs are
explicit that this is the current, preferred method: "API Token is the preferred authorization
scheme for interacting with the Cloudflare API," and API Tokens are scoped (a token can be
limited to specific zones/permissions), unlike the legacy Global API Key.

The **legacy Global API Key + Email** scheme (`X-Auth-Key` / `X-Auth-Email` headers) is
deliberately **not** implemented here. It authenticates as the full account — there is no way to
scope it down — so it is the wrong default for a workflow platform storing long-lived credentials
on a user's behalf. Add it as a second `auth` method (`type: "basic"` or `"custom"`, two fields:
`email` + `key`, both `secret`) if a use case genuinely needs it; nothing here forecloses that.

## Actions

| Key | Type | Resource | Description |
|---|---|---|---|
| `zone-list` | read | zone | List zones (domains) this token can see |
| `zone-get` | read | zone | Get details for a single zone by ID |
| `zone-settings-get` | read | zone | Get all settings for a zone (SSL mode, cache level, etc.) |
| `zone-analytics-get` | read | zone | Get request/bandwidth/cache/threat totals for a zone over a time range |
| `cache-purge` | perform | cache | Purge everything, or a specific list of URLs, from a zone's edge cache |
| `dns-record-list` | read | dns-record | List a zone's DNS records, optionally filtered |
| `dns-record-create` | perform | dns-record | Create a new DNS record in a zone |
| `dns-record-delete` | perform | dns-record | Permanently remove a DNS record from a zone |

### `zone-analytics-get` uses the GraphQL Analytics API, not the old REST endpoint

Cloudflare's original `GET /zones/{zone_id}/analytics/dashboard` REST endpoint is **deprecated**
in favor of the GraphQL Analytics API (see Cloudflare's own migration guide). Rather than wire up
a deprecated endpoint, this action queries `POST /graphql` — same host (`api.cloudflare.com`),
same Bearer auth, so no extra `network.allow` entry is needed — with `httpRequests1hGroups` and
`dimensions` omitted, which Cloudflare's guide documents as the way to get totals instead of a
time series. See `lib/client.ts` for the `{ data, errors }` envelope this endpoint uses, distinct
from the REST API's `{ success, result, errors }`.

### `dns-record-create` covers the common record types, not all 20

Cloudflare's API accepts A, AAAA, CAA, CERT, CNAME, DNSKEY, DS, HTTPS, LOC, MX, NAPTR, NS,
OPENPGPKEY, PTR, SMIMEA, SRV, SSHFP, SVCB, TLSA, TXT, URI. This action exposes the common subset
(A, AAAA, CNAME, MX, NS, TXT, SRV, CAA, PTR) that fits a single `content` string field. Types that
need structured, type-specific fields (DNSSEC material, SSHFP fingerprints, SVCB/HTTPS
parameters) are left out rather than modeled with guessed field shapes.

### `cache-purge` covers everything/by-URL, not tag/host/prefix purge

Cloudflare's "flex purge" (by cache-tag, hostname, or path prefix) is Enterprise-plan-only, and
this app has no reliable way to detect plan tier at runtime to gate it. Purge-everything and
purge-by-URL-list are supported on every plan.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs directly on demand — the credential check is derived automatically from
the auth method's `test` hook.

### Is the vendor up?

**Service status** — <https://www.cloudflarestatus.com>

```
GET https://www.cloudflarestatus.com/api/v2/summary.json
```

Atlassian Statuspage, the same platform SendGrid uses. `GET /api/v2/summary.json` gives a
one-line rollup (`status.indicator` is `none` / `minor` / `major` / `critical`) plus
per-component detail. Unauthenticated, and verified live 2026-08-01.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

```
GET /user/tokens/verify
```

Cloudflare's documented way to validate a token: the response carries the token's own `status`
(`active` / `disabled` / `expired`), not just an HTTP 2xx, so a pass tells you the token itself is
still usable, not merely that the network round-trip succeeded.

### Do we have quota left?

`RateLimit` / `RateLimit-Policy` response headers, in the IETF-draft syntax Cloudflare rolled out
2025-09-03 (`RateLimit: "default";r=1180;t=250`, `RateLimit-Policy: "burst";q=1200;w=300` — `r` /
`q` are request counts, `t` / `w` are seconds). Cloudflare's documented platform-wide cap is 1,200
requests per 5-minute window per user, cumulative across dashboard, API key and API token use.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |

The host `www.cloudflarestatus.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against `developers.cloudflare.com` (official docs)
and n8n's `nodes-base/nodes/Cloudflare` / `credentials/CloudflareApi.credentials.ts` (auth scheme
cross-check). Status surfaces and deprecations move; re-verify if a probe starts failing for
everyone at once.
