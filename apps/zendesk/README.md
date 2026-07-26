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

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
