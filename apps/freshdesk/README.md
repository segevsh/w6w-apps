# Freshdesk

Manage Freshdesk tickets, contacts and companies.

- **Categories** — support
- **Auth methods** — api-key
- **Actions** — 13
- **Egress allowlist** — `*.freshdesk.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://updates.freshdesk.com>

Human incident-history page only. Verified `/history.atom` and `/api/v2/status` both
404 — no JSON API or feed is reachable. The `domain` dependency check probes this
connection's own account host instead.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The `api-key` auth method probes:

```
GET /api/v2/agents/me
```

The currently authenticated agent — the same scope-free whoami n8n's credential test
uses.

### Do we have quota left?

`X-RateLimit-Total`, `X-RateLimit-Remaining` and `X-RateLimit-Used-CurrentRequest`
response headers, plus `Retry-After` on 429. Freshdesk meters per-account per-minute.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `domain` | dependency | connection | context | degraded | 120s | `health/domain.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**`service` is declared absent.** updates.freshdesk.com is a human incident-history page
with no JSON API or feed (`/history.atom` and `/api/v2/status` both 404). The `domain`
dependency check probes this connection's own account host instead.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

## Auth scheme

Freshdesk's API key is used as the HTTP Basic **username**, with the literal string `X`
as the password — there is no real password, `X` is just what Freshdesk's Basic-auth
parser expects in that slot. Verified against developers.freshdesk.com/api/
(`curl -u apikey:X`) and against n8n's `FreshdeskApi.credentials.ts`, which encodes the
identical scheme.

## Deviations from n8n's node

- n8n exposes `getAgents` / `getGroups` / `getProducts` / `getCompanies` only as
  `loadOptions` dropdowns for the ticket form, not as standalone operations. This app
  keeps the equivalent fields as plain numeric-ID params (Group ID, Agent ID, Company
  ID) rather than adding four extra list-lookup actions the spec's 8–14 action budget
  doesn't call for.
- Company create/delete and contact delete were left out to stay within scope (the spec
  asks for list/get on companies and list/get/create/update on contacts).
- No webhook/trigger surface — that is a Trigger, not an Action, and out of scope here.

---

Researched and endpoint-verified 2026-08-01 against developers.freshdesk.com/api/ and
n8n's `packages/nodes-base/nodes/Freshdesk/`. Status surfaces move; re-check if a probe
starts failing for everyone at once.
