# Slack

Post messages, manage channels, files, reactions, stars, users and user groups on Slack.

- **Categories** — communication
- **Auth methods** — access-token, oauth2
- **Actions** — 47
- **Egress allowlist** — `slack.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://status.slack.com/api/v2.0.0/current
```

Slack runs its own status API rather than Statuspage. `/api/v2.0.0/current` returns
`status` plus `active_incidents`; `/api/v2.0.0/history` is the archive. Unauthenticated.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
POST /api/auth.test
```

Slack's documented credential test. It identifies the token's user, bot and workspace,
and works for every token type including a bot token with almost no scopes.

`POST /api/api.test` is the **unauthenticated** counterpart — it returns `{"ok":true}`
and checks that the API itself is reachable without needing a credential at all.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Slack tiers limits per method and signals exhaustion with 429 plus
`Retry-After`.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
