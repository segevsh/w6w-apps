# Airtable

Read, create, update, upsert and delete Airtable records; list bases and get base
schema.

- **Categories** — spreadsheets, databases, productivity
- **Auth methods** — personal-access-token, oauth2, api-key
- **Actions** — 10
- **Egress allowlist** — `api.airtable.com`
- **Website** — https://www.airtable.com
- **API docs** — https://airtable.com/developers/web/api/introduction

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.airtable.com>

```
GET https://status.airtable.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 3 auth methods probe:

```
GET /v0/meta/whoami
```

Airtable's documented whoami. Returns the token's own id and scopes, works for every
token type, and reads nothing from a base — so it passes even for a token scoped to no
bases at all.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Airtable enforces 5 requests/second per base and answers 429 with
a 30-second cool-off; back off on `Retry-After`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.airtable.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Airtable publishes no headroom endpoint and returns no rate-limit headers. It enforces 5 requests/second per base and answers 429 with a 30-second cool-off, so `Retry-After` on a rejected call is the only signal — and reading it requires making the call that gets rejected.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
