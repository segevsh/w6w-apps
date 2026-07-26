# Zendesk

Manage Zendesk Support tickets, users and organizations.

- **Categories** — support, crm
- **Auth methods** — api-token, oauth2
- **Actions** — 17
- **Egress allowlist** — `*.zendesk.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.zendesk.com>

Human page only — no JSON API or feed was reachable. The page is per-pod, which matters:
an incident usually affects one pod rather than all of Zendesk.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /api/v2/users/me.json
```

The authenticated agent. Cheaper and more direct than `/ticket_fields.json`, which n8n
probes.

### Do we have quota left?

`ratelimit-remaining` and `ratelimit-reset` response headers, plus `Retry-After` on 429.
Zendesk meters per-account per-minute, with tighter per-endpoint caps.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `account` | dependency | connection | context | degraded | 120s | `health/account.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.zendesk.com is a human page with no JSON API or feed, and it is per-pod — an incident usually affects one pod rather than all of Zendesk, which a single rollup would erase anyway. The `account` dependency check probes this connection's own subdomain instead.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
