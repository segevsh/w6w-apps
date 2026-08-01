# Mailgun

Send transactional email and manage domains, mailing lists and suppressions via Mailgun.

- **Categories** — email, communication
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.mailgun.net`, `api.eu.mailgun.net`

## Auth — Private API Key

Mailgun's scheme is HTTP Basic with a **fixed, literal username**: `api`. The password is the
account's private API key (Control Panel → Settings → API Keys → Private API key). Unlike
Zendesk's `{email}/token`, there is no per-user identity in the username — every key
authenticates as `api`.

### Region (US vs EU)

Mailgun runs two entirely separate deployments on two different hosts, and a domain created in
one region only ever answers on that region's host:

| Region | Host |
|---|---|
| United States (default) | `api.mailgun.net` |
| Europe | `api.eu.mailgun.net` |

`region` is collected once at connect time, alongside the API key, as a `select` auth field. It
is **not** a per-action param: `afterConnect` echoes it onto the connection's redacted `display`
data, and every action/health-check reads it from there via `lib/client.ts` — the same pattern
Zendesk uses for its per-account subdomain. Actions never see the credential, so this is the only
way for them to learn which host to call.

### `domain` is a per-action param, not an auth field

Unlike some providers, the **sending domain is per-request** in Mailgun's API, not fixed at
connect time — one account routinely owns several verified domains. So every domain-scoped action
below (`message-send`, `event-get-many`, `stats-get`, and the suppression-list actions) takes its
own `domain` param, exactly as n8n's Mailgun node takes an `emailDomain` credential field but
Mailgun's REST paths take `/v3/{domain}/...` per call.

Three actions do **not** take `domain`, each for a documented reason:

- `domain-get(-many)` — the domain **is** the resource being listed/fetched.
- `email-validate` — `/v4/address/validate` is an account-level service, not scoped to a sending
  domain.
- `list-member-add` / `list-member-delete` — a mailing list is addressed by its own email
  (`list@mg.example.com`), which already carries the domain, so these take `listAddress` instead.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `message-send` | perform | `POST /v3/{domain}/messages` |
| `domain-get` | read | `GET /v4/domains/{name}` |
| `domain-get-many` | read | `GET /v4/domains` |
| `email-validate` | read | `GET /v4/address/validate` |
| `event-get-many` | read | `GET /v3/{domain}/events` |
| `stats-get` | read | `GET /v3/{domain}/stats/total` |
| `list-member-add` | perform | `POST /v3/lists/{list_address}/members` |
| `list-member-delete` | perform | `DELETE /v3/lists/{list_address}/members/{member_address}` |
| `bounce-get-many` | read | `GET /v3/{domain}/bounces` |
| `bounce-delete` | perform | `DELETE /v3/{domain}/bounces/{address}` |
| `complaint-get-many` | read | `GET /v3/{domain}/complaints` |
| `complaint-delete` | perform | `DELETE /v3/{domain}/complaints/{address}` |
| `unsubscribe-get-many` | read | `GET /v3/{domain}/unsubscribes` |
| `unsubscribe-delete` | perform | `DELETE /v3/{domain}/unsubscribes/{address}` |

`message-send` always posts `multipart/form-data` — the only encoding that also carries file
attachments (`attachment`), so one code path covers both plain and attachment-bearing sends.
Attachments are supplied as `{ filename, content, contentType? }` with `content` a base64 string
or `data:<mime>;base64,<payload>` data URL, decoded into a `Blob` part client-side (the same
pattern as Slack's `file-upload` action in this pack).

Two n8n operations were deliberately **not** ported: `/v3/{domain}/stats/total`'s sibling
"filtered/grouped totals for entire account" (`/v3/stats/*`, account-wide rather than
domain-scoped) and per-tag stats — both are additive and can follow later without changing this
app's shape.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs directly (via `Auth.test`); the first two below are declared checks.

### Is the vendor up?

**Service status** — <https://status.mailgun.com>

```
GET https://status.mailgun.com/api/v2/summary.json
```

Atlassian Statuspage, confirmed live 2026-07-31: `status.indicator` gives a one-line rollup
(`none` / `minor` / `major` / `critical`) and `components[]` breaks out all 11 tracked components
(API, SMTP, Outbound Delivery, Inbound, Events & Logs, Stats and Analytics, Email Validation,
Inbox Placement, Spam Trap Network, Email Previews, Control Panel). Unauthenticated,
CORS-enabled, cheap to poll — and identical for every Connection regardless of region, so the
check runs once (`scope: "app"`) and the result is shared.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

The `api-key` auth method probes:

```
GET /v4/domains?limit=1
```

The cheapest authenticated call available (n8n's credential test hits the older `/v3/domains`
alias of the same listing) — it needs no scope beyond "some domain exists" and works for the
narrowest key a user might hand us.

### Do we have quota left?

`X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` response headers, documented
on Mailgun's API overview page (verified 2026-07-31). `X-RateLimit-Reset` is an **absolute
Unix-milliseconds timestamp** ("Unix milliseconds (UTC) until the limit resets") — not a delta and
not seconds-since-epoch like SendGrid's or Zendesk's reset headers — so `health/quota.ts` converts
it straight to an ISO date with no arithmetic.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.mailgun.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at
load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-31 against Mailgun's official documentation
(`documentation.mailgun.com`, cross-checked against `mailgun-docs.redoc.ly`) and n8n's Mailgun
node/credentials. Status surfaces move; re-check if a probe starts failing for everyone at once.
