# Notion

Read and write Notion databases, pages, blocks and users via the Notion API.

- **Categories** — productivity, documents
- **Auth methods** — internal-secret, oauth2
- **Actions** — 17
- **Egress allowlist** — `api.notion.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.notion.so>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /v1/users/me
```

Resolves the bot behind the integration token. Needs no page or database to have been
shared with the integration, which a search call would.

### Do we have quota left?

No headroom endpoint. Notion averages 3 requests/second per integration and answers 429
with `Retry-After`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:internal-secret` | credential | connection | signed | fatal | — | derived from the `internal-secret` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.notion.so is a human page with no JSON API or feed. The derived `auth:*` credential check is the only automatable liveness signal.

**`quota` is declared absent.** Notion publishes no headroom endpoint or rate-limit headers. The documented allowance averages 3 requests/second per integration and exhaustion surfaces as a 429 with `Retry-After`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
