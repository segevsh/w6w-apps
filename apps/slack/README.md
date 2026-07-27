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

Slack also publishes an incident feed, in both formats, on a **different host**:

```
GET https://slack-status.com/feed/atom
GET https://slack-status.com/feed/rss
```

Same content either way. The feed is history — it keeps incidents that have already
closed and therefore dropped out of `active_incidents`, which is exactly what you want
when a run failed twenty minutes ago and works now. The `incidents` check reads it, kept
separate from `service` because the two answer different questions and only `service` is
authoritative about the present.

Atom is the one read, because its `<updated>` says when an incident last *changed* where
RSS's `<pubDate>` conflates that with first publication. Note that `slack-status.com` is a
third host, distinct from both `status.slack.com` (the JSON API) and `slack.com` (the app's
actions) — each check widens egress only inside its own worker.

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

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `incidents` | service | app | none | informational | 900s | `health/incidents.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The hosts `status.slack.com` (for `service`), `slack-status.com` (for `incidents`) are reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Slack publishes no headroom endpoint or rate-limit headers. Limits are tiered per method and exhaustion surfaces as a 429 with `Retry-After`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
