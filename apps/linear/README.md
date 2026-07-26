# Linear

Create and manage Linear issues, comments, projects and labels through its GraphQL API.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-key, oauth2
- **Actions** — 11
- **Egress allowlist** — `api.linear.app`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.linear.app>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
POST /graphql  ·  { viewer { id } }
```

The smallest possible GraphQL document. Linear has one endpoint and no REST surface, so
a query *is* the health check. Remember GraphQL answers 200 on failure — the probe
checks `errors[]` as well as the status.

### Do we have quota left?

`X-RateLimit-Requests-Limit` / `-Remaining` / `-Reset` response headers. Linear also
meters query complexity separately, under `X-Complexity-*`.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
