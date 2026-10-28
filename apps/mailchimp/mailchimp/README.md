# Mailchimp

Manage Mailchimp audiences: create/update members, tag them, and send campaigns.

- **Categories** — marketing, communication
- **Auth methods** — api-key, oauth2
- **Actions** — 14
- **Egress allowlist** — `*.api.mailchimp.com`, `login.mailchimp.com`
- **Website** — https://mailchimp.com
- **API docs** — https://mailchimp.com/developer/marketing/api/root/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.mailchimp.com>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /3.0/ping
```

Mailchimp is one of the few vendors here with a **dedicated health-check endpoint**. It
returns `{"health_status":"Everything's Chimpy!"}`, touches no list data and needs no
scope beyond a valid key.

### Do we have quota left?

No headroom endpoint or headers. Mailchimp caps concurrency at 10 simultaneous
connections per key rather than metering a request rate.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.mailchimp.com is a human page with no JSON API or feed. `GET /3.0/ping` — which the auth `test` hook already calls — is the automatable signal.

**`quota` is declared absent.** Mailchimp meters concurrency rather than request rate: 10 simultaneous connections per key, enforced by rejection. There is no counter, endpoint or header to read.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
