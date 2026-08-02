# Eventbrite

Read events, orders, attendees and ticket classes from Eventbrite.

- **Categories** — commerce, calendar
- **Auth methods** — personal-token, oauth2
- **Actions** — 10
- **Egress allowlist** — `www.eventbriteapi.com`
- **Website** — https://www.eventbrite.com
- **API docs** — https://www.eventbrite.com/platform/api

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.eventbrite.com>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /v3/users/me/
```

The authenticated user. Note the trailing slash: Eventbrite redirects without it.

### Do we have quota left?

`X-Rate-Limit` response headers; the default allowance is per-token per-hour.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:personal-token` | credential | connection | signed | fatal | — | derived from the `personal-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** Eventbrite runs a human status page at status.eventbrite.com with no JSON API or feed behind it. The derived `auth:*` credential check and the `quota` check are the only automatable signals.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
