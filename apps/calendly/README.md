# Calendly

Read Calendly users, event types, scheduled events and invitees; create single-use
scheduling links and manage webhook subscriptions.

- **Categories** — calendar, productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 12
- **Egress allowlist** — `api.calendly.com`
- **API docs** — https://developer.calendly.com/api-docs

## Actions

Calendly's API v2 identifies every object by an absolute `uri`
(`https://api.calendly.com/users/AAAA`); list endpoints require a `user` or
`organization` URI as their scope. Actions that address a single object accept
either the full URI or the bare UUID.

| Key | Resource | Endpoint |
|---|---|---|
| `user-get-current` | user | `GET /users/me` |
| `user-get` | user | `GET /users/{uuid}` |
| `event-type-get-many` | event-type | `GET /event_types` |
| `event-type-get` | event-type | `GET /event_types/{uuid}` |
| `scheduled-event-get-many` | scheduled-event | `GET /scheduled_events` |
| `scheduled-event-get` | scheduled-event | `GET /scheduled_events/{uuid}` |
| `invitee-get-many` | invitee | `GET /scheduled_events/{uuid}/invitees` |
| `invitee-get` | invitee | `GET /scheduled_events/{uuid}/invitees/{uuid}` |
| `scheduling-link-create` | scheduling-link | `POST /scheduling_links` |
| `webhook-subscription-create` | webhook-subscription | `POST /webhook_subscriptions` |
| `webhook-subscription-get-many` | webhook-subscription | `GET /webhook_subscriptions` |
| `webhook-subscription-delete` | webhook-subscription | `DELETE /webhook_subscriptions/{uuid}` |

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://www.calendlystatus.com/api/v2/summary.json
```

`status.calendly.com` 301-redirects to `www.calendlystatus.com`, which is the canonical
Statuspage host. `summary.json` is one request that carries both the rollup `indicator`
(`none` / `minor` / `major` / `critical`) and the per-component breakdown, so a single
probe can attribute a partial outage to the affected component rather than greying out the
whole platform.

The status host is reachable **only inside this hook's worker** — it is not in
`w6w.network.allow`, so no action can call it. The spec permits the widening precisely
because the check is unsigned (`credential: "none"`): a signed request must never reach a
third-party status host.

### Is this credential live?

This is what each Auth method's `test` hook does — the app's own health check, and the
only one of the three it performs itself. Both methods probe:

```
GET /users/me
```

Cheap, always available, and the same call whose `resource.uri` most other actions take as
their `user` scope.

### Do we have quota left?

**Declared absence.** Calendly enforces per-minute/day request limits but publishes no
headroom endpoint and returns no `x-ratelimit-*` / `RateLimit-*` response headers to read.
Exhaustion surfaces only as a `429 Too Many Requests` with a `Retry-After` header, so
headroom has to be budgeted from observed 429s rather than read. The `quota` check is
declared `unavailable` (reporting `unknown`, `severity: informational`) rather than
omitted, so a host can tell "we cannot know" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | `health/quota.ts` (declared `unavailable`) |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the PAT auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the OAuth auth method's `test` hook |

The host `www.calendlystatus.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check the
`summary.json` probe and the rate-limit-header absence if a probe starts failing for
everyone at once.
