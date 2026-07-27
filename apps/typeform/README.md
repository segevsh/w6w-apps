# Typeform

Create and manage Typeform forms, responses, workspaces, themes and images via the Typeform APIs.

- **Categories** — forms, productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 10
- **Egress allowlist** — `api.typeform.com`
- **API docs** — https://www.typeform.com/developers/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.typeform.com/api/v2/summary.json
```

Typeform runs a standard Atlassian Statuspage, so the `service` check reads the
`summary.json` rollup: `status.indicator` (`none` / `minor` / `major` / `critical`) plus
the per-component breakdown, so a single probe reports each component rather than one
platform-wide boolean. The check is unauthenticated and unsigned — `status.typeform.com`
is widened onto that hook's own allowlist and is deliberately absent from the app's egress
list, so no action can reach it.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /me
```

Returns the authenticated account, needs no resource scope, and is the cheapest liveness
signal Typeform offers. `personal-access-token` sends a token minted in the Typeform admin
console; `oauth2` sends an access token from the OAuth flow. Both sign with `Bearer`.

### Do we have quota left?

Declared absent. Typeform enforces roughly **2 requests per second per account** on its
Create and Responses APIs, but that budget is enforced by a `429` — the responses carry no
`X-Rate-Limit-*` / `RateLimit-*` headers, so there is no live counter to read. Stated as a
positive fact rather than left as a gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`quota` is declared absent.** Typeform publishes no headroom endpoint and returns no
rate-limit headers. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at
`unknown` forever.

The host `status.typeform.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
