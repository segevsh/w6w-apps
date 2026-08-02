# Gmail

Send, read, and manage Gmail messages, drafts, labels, and threads.

- **Categories** — communication, email
- **Auth methods** — oauth2, service-account
- **Actions** — 25
- **Egress allowlist** — `gmail.googleapis.com`, `www.googleapis.com`
- **Website** — https://mail.google.com
- **API docs** — https://developers.google.com/workspace/gmail

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

The Google Workspace Status Dashboard publishes its incident history as JSON. It is a
feed of incidents rather than a current-state rollup: an empty tail means no recent
incident. Each entry names the affected `service_key`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /gmail/v1/users/me/profile
```

The mailbox profile — address, message total and history id. The cheapest authenticated
Gmail call, and it works under the read-only scope.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Gmail bills per-method quota units against a per-user per-second
budget; usage is visible in the Google Cloud console, and exhaustion surfaces as 429
`rateLimitExceeded` or 403 `userRateLimitExceeded`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Google publishes no headroom endpoint or rate-limit headers. Quota is per-project, billed in method-specific units and visible only in the Google Cloud console; exhaustion surfaces as 429 `rateLimitExceeded` or 403 `userRateLimitExceeded`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
