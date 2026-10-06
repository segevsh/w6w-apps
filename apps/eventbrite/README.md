# Eventbrite

Create and run Eventbrite events end to end: events, tickets, inventory, discounts, orders, attendees, venues, questions and webhooks.

- **Categories** — commerce, calendar
- **Auth methods** — personal-token, oauth2
- **Actions** — 93
- **Egress allowlist** — `www.eventbriteapi.com`
- **Website** — https://www.eventbrite.com
- **API docs** — https://www.eventbrite.com/platform/api

## API coverage

Every endpoint in Eventbrite's public API v3 blueprint is covered, except:

| Endpoint | Why not |
|---|---|
| `GET /events/search/` | Marked deprecated in the blueprint. |
| `POST /webhooks/`, `GET /webhooks/` | Deprecated user-level webhook routes. `create-webhook` / `list-webhooks` use the organization routes instead. |
| `GET /balance/{organization}/events/{event}/` | An internal service: it lives on separate `balance-api` hosts and needs an Eventbrite service token, not a user's credential. |

Where the blueprint disagrees with itself, the actions follow the vendor's working form:

- **Default (canned) questions** — the blueprint writes get/update/delete as
  `/event/{id}/canned_questions/{qid}` (singular, no trailing slash). The actions use
  `/events/{id}/canned_questions/{qid}/`, matching list/create and the resource's own `resource_uri`.
- **Media upload is three steps.** `get-media-upload` returns an upload URL and token; the file
  goes to that URL, which is a storage host outside this app's egress allowlist; then `upload-media`
  finalizes it with the token. A workflow does the middle step with an HTTP step.
- **Reports** (`get-sales-report`, `get-attendee-report`) send `event_ids` comma-separated.
- **`update-ticket-class`** sends only the fields you set, though the blueprint marks them all required.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.eventbrite.com>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /v3/users/me/
```

The authenticated user. Note the trailing slash: Eventbrite redirects without it.

### Do we have quota left?

`X-Rate-Limit` response headers; the default allowance is per-token per-hour.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:personal-token` | credential | connection | signed | fatal | — | derived from the `personal-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** Eventbrite runs a human status page at status.eventbrite.com with no JSON API or feed behind it. The derived `auth:*` credential check and the `quota` check are the only automatable signals.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
