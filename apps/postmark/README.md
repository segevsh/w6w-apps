# Postmark

Send transactional email and inspect messages, bounces, templates, and server info via
Postmark's REST API.

- **Categories** — email, communication
- **Auth methods** — api-key (Server Token)
- **Actions** — 13
- **Egress allowlist** — `api.postmarkapp.com`
- **Website** — https://postmarkapp.com
- **API docs** — https://postmarkapp.com/developer/api/overview
- **Official client libraries (GitHub)** — https://github.com/ActiveCampaign/postmark.js and
  siblings under https://github.com/ActiveCampaign (Postmark is a product of ActiveCampaign)

## Auth

Postmark has **two** token types, scoped to two different privilege levels:

- `X-Postmark-Server-Token` — server-level privileges: sending, message search, bounces,
  templates, server config, stats. Minted per-server under Postmark → your server → API
  Tokens tab.
- `X-Postmark-Account-Token` — account-level privileges: creating/listing *servers*, domains,
  sender signatures, billing. Minted under the account dashboard's API Tokens section.

This app is **deliberately scoped to server-token operations only**. Every action here is
something a single server's automation legitimately needs day to day (send mail, look up a
message, check a bounce, manage that server's templates). The account-level surface manages
Postmark itself — provisioning new servers, verifying domains, billing — which is an
operator/admin concern exercised occasionally through the Postmark dashboard, not a workflow
step, and mixing the two token scopes into one Connection would understate how differently
they're held (a server token is safe to hand to many automations; an account token can create
and delete servers). If account-level actions are needed later, they belong in a second auth
method (or a separate app) rather than widening this one's blast radius.

The single auth method (`auth/api-key.ts`) signs every request with
`X-Postmark-Server-Token`, and its `test` hook (also this app's health-check liveness probe)
calls `GET /server` — a server token carries no finer-grained scopes to legitimately lack, so
this is both the cheapest read available and a genuine whoami.

Postmark's error body is uniform across error types: `{ ErrorCode, Message }` on both 422
(validation) and 401 (auth) — `lib/client.ts` surfaces `Message` on any non-2xx.

## Actions

| Group | Actions |
|---|---|
| Send | `send-email`, `send-email-batch`, `send-email-with-template` |
| Messages | `list-outbound-messages`, `get-outbound-message`, `list-message-opens` |
| Bounces | `list-bounces`, `get-bounce`, `activate-bounce` |
| Server & stats | `get-server-info`, `get-outbound-stats` |
| Templates | `list-templates`, `create-template` |

Notes:

- `send-email-batch` accepts a raw JSON array of message objects (`{From, To, Subject,
  HtmlBody, ...}`, the same shape `send-email` builds) rather than re-modeling every field as
  a repeated param group — Postmark's batch endpoint returns HTTP 200 even when individual
  messages fail validation, so check each result's own `ErrorCode`.
- `send-email-with-template` requires exactly one of `templateId`/`templateAlias`.
- `get-outbound-message` calls `GET /messages/outbound/{id}/details` — the "details" suffix
  is part of the real path, easy to miss since the docs often shorten it in prose.
- `create-template` requires `subject` for a Standard template but not for a Layout (a Layout
  wraps other templates' content instead of being addressed directly).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.postmarkapp.com>

A real, machine-readable JSON API, but not the Atlassian Statuspage shape most vendors in
this pack publish: `GET https://status.postmarkapp.com/api/v1/status` returns
`{"page": {"state": "operational" | "degraded" | "under_maintenance", ...}}` (footer reads
"Powered by Sorry™" — the Sorry status-page product). A companion `GET
/api/v1/components` lists 19 named components (API, SMTP, Inbound, Webhooks, Web App, ...)
with the same tri-state vocabulary — verified live 2026-08-02. `health/service.ts` reads
both and folds component names into `components` so a host can attribute a `degraded`
verdict precisely.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three that touches the credential.

```
GET /server
X-Postmark-Server-Token: ...
```

### Do we have quota left?

Declared `unavailable`. Postmark exposes neither of the two usual signals this check reads:
no documented rate-limit response headers (only an undocumented 429 threshold — "requests at
a rate that exceeds acceptable use"), and no API for remaining sends/credits (Postmark moved
off credit-based plans in 2023 in favor of monthly subscriptions). `GET /server`, the richest
server-scoped read available, returns configuration only. Usage is visible in the Postmark
web app, not the REST API this app is scoped to.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | (default) | 60s | `health/service.ts` — `status.postmarkapp.com` JSON API |
| `quota` | quota | — | — | informational | — | `unavailable` — no rate-limit headers or credit API exist |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-02 against Postmark's own developer docs
(`postmarkapp.com/developer/api/`) and the live status API (`status.postmarkapp.com/api/v1/`).
Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
