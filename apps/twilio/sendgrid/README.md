# SendGrid

Consume SendGrid API

- **Categories** — email, communication
- **Auth methods** — sendgrid-api
- **Actions** — 10
- **Egress allowlist** — `api.sendgrid.com`
- **Website** — https://sendgrid.com
- **API docs** — https://docs.sendgrid.com/api-reference

## Health check

The app checks whether the *vendor* is up, whether *this credential* is live, and
whether rate-limit *quota* remains.

### Is the vendor up?

**Service status** — <https://sendgrid.statuspage.io>

```
GET https://sendgrid.statuspage.io/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

The Auth `test` hook validates the configured API key.

The single auth method probes:

```
GET https://api.sendgrid.com/v3/scopes
Authorization: Bearer <apiKey>
```

The endpoint returns the key's available permissions. The test supplies the bearer
header explicitly because credential test hooks receive an unsigned fetch. A successful
response passes the check; a non-success response fails it and reports the HTTP status.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Reset` response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:sendgrid-api` | credential | connection | signed | fatal | — | derived from the `sendgrid-api` auth method's `test` hook |

The host `sendgrid.statuspage.io` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
