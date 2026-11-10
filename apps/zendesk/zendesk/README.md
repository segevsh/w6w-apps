# Zendesk

Manage Zendesk Support tickets, users and organizations.

- **Categories** — support, crm
- **Auth methods** — api-token, oauth2
- **Actions** — 17
- **Triggers** — 12 (webhook)
- **Egress allowlist** — `*.zendesk.com`
- **Website** — https://www.zendesk.com
- **API docs** — https://developer.zendesk.com/api-reference/

## Triggers

| Key — title | Mechanism | Vendor event | What the run gets |
| --- | --- | --- | --- |
| `new-ticket` — New Ticket | webhook (API-registered) | `zen:event-type:ticket.created` | The new ticket and the event that announced it |
| `ticket-status-changed` — Ticket Status Changed | webhook (API-registered) | `zen:event-type:ticket.status_changed` | The ticket, with the previous and current status in `event` |
| `ticket-comment-added` — Ticket Comment Added | webhook (API-registered) | `zen:event-type:ticket.comment_added` | The ticket and the comment (author, body, public or private) in `event` |
| `ticket-deleted` — Ticket Deleted | webhook (API-registered) | `zen:event-type:ticket.soft_deleted` | The ticket as it was when it was deleted |
| `ticket-priority-changed` — Ticket Priority Changed | webhook (API-registered) | `zen:event-type:ticket.priority_changed` | The ticket, with the previous and current priority in `event` |
| `ticket-assignee-changed` — Ticket Assignee Changed | webhook (API-registered) | `zen:event-type:ticket.agent_assignment_changed` | The ticket, with the previous and current assignee id in `event` |
| `new-user` — New User | webhook (API-registered) | `zen:event-type:user.created` | The new user |
| `user-deleted` — User Deleted | webhook (API-registered) | `zen:event-type:user.deleted` | The user as it was |
| `user-details-changed` — User Details Changed | webhook (API-registered) | `zen:event-type:user.details_changed` | The user, with the previous and current details in `event` |
| `new-organization` — New Organization | webhook (API-registered) | `zen:event-type:organization.created` | The new organization |
| `organization-deleted` — Organization Deleted | webhook (API-registered) | `zen:event-type:organization.deleted` | The organization as it was |
| `any-event` — Any Event | webhook (API-registered) | the event types you list in `events` | The event (type, resource id, resource, what changed) for any of the listed types |

**Any Event.** Zendesk has no "all events" subscription value, so `events` is a required comma-separated
list of event types, with or without the `zen:event-type:` prefix (`ticket.merged, user.role_changed`).
The catalog is in the event-type reference below (tickets, users, organizations, articles, agent
availability, messaging, access logs). Zendesk has no single "ticket updated" event: priority, status,
assignee, tags, group, requester and so on are separate types, so name the ones you need. Only the
types you list are delivered to the run.

**Not covered.** There is no `organization-updated` trigger: Zendesk reports an organization change as
`name_changed`, `tags_changed`, `external_id_changed` or `custom_field_changed`, so pick those in Any Event.
List actions: the ticket, ticket-search, user-search and organization lists are served by the
`new-ticket`, `new-user` and `new-organization` triggers (the lists are the same records; the ticket
list action pages by cursor, where Zendesk's `sort_by` does not apply and tickets come oldest first by id,
so a poll would add nothing the webhook does not already deliver);
`ticket-field-get-many` returns field definitions (reference data).

**Setup.** None by hand. Subscribing to a trigger calls `POST /api/v2/webhooks` to create an
event-subscription webhook named `w6w <subscription id>` that delivers to the host's callback URL,
then reads its signing secret with `GET /api/v2/webhooks/{id}/signing_secret`. Unsubscribing
deletes the webhook (`DELETE /api/v2/webhooks/{id}`; one Zendesk no longer has counts as
deleted). The connected user must be allowed to manage webhooks (Zendesk: admins); the OAuth
connection's `read write` scopes cover it. A subscription that is retried first deletes any
webhook of the same name already pointing at its callback URL.

**Trust model.** Zendesk signs every webhook it creates, and the trigger never accepts an
unsigned delivery. Each delivery is checked, before anything is parsed, against
`X-Zendesk-Webhook-Signature` = base64(HMAC-SHA256(signing secret, `X-Zendesk-Webhook-Signature-Timestamp`
+ raw request body)). The check uses the exact bytes Zendesk sent, a constant-time compare, and
a 5-minute window on the timestamp (Zendesk's docs say the signature helps against replay but
name no window; 5 minutes is this app's choice). A missing header, a stale timestamp, an unset
secret or a body that was not delivered raw refuses the delivery; the host stores one failed row
and starts no run. The signing secret is kept in the subscription state, which the host stores
unsealed. Zendesk's "Test webhook" button before a webhook exists signs with a fixed dummy secret,
so such a test is refused by design.

Sources (verified 2026-11-10): https://developer.zendesk.com/api-reference/webhooks/webhooks-api/webhooks/ ,
https://developer.zendesk.com/documentation/webhooks/verifying/ ,
https://developer.zendesk.com/api-reference/webhooks/event-types/ticket-events/ ,
https://developer.zendesk.com/api-reference/webhooks/event-types/user-events/ ,
https://developer.zendesk.com/api-reference/webhooks/event-types/organization-events/ ,
https://developer.zendesk.com/api-reference/webhooks/event-types/webhook-event-types/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.zendesk.com>

Human page only — no JSON API or feed was reachable. The page is per-pod, which matters:
an incident usually affects one pod rather than all of Zendesk.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /api/v2/users/me.json
```

The authenticated agent. Cheaper and more direct than `/ticket_fields.json`, which n8n
probes.

### Do we have quota left?

`ratelimit-remaining` and `ratelimit-reset` response headers, plus `Retry-After` on 429.
Zendesk meters per-account per-minute, with tighter per-endpoint caps.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `account` | dependency | connection | context | degraded | 120s | `health/account.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.zendesk.com is a human page with no JSON API or feed, and it is per-pod — an incident usually affects one pod rather than all of Zendesk, which a single rollup would erase anyway. The `account` dependency check probes this connection's own subdomain instead.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
