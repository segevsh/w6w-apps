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

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
