# Eventbrite

Create and run Eventbrite events end to end: events, tickets, inventory, discounts, orders, attendees, venues and webhooks, plus triggers on orders, check-ins and event changes.

- **Categories** — commerce, calendar
- **Auth methods** — personal-token, oauth2
- **Actions** — 93
- **Triggers** — 16 (webhook)
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
- **Pagination** uses `continuation` from the previous response. `page_size` in a response
  does not mean that endpoint accepts it as an input: only organization event listings and
  discount searches expose Page size. Attendee, order and ticket-class listings ignore legacy
  saved `pageSize` values so they do not cause `ARGUMENTS_ERROR`.
- **Scope-specific filters** stay within their documented endpoints: unpaid attendees require
  Event scope; order status and email filters apply to Event/Organization scopes; sorting
  events by name requires Organization scope.

## Triggers

Every trigger is a webhook trigger ([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)).
There is one per Eventbrite webhook action, plus **Organization Activity** for any mix of them:

| Trigger | Eventbrite action | The run's `resource` |
|---|---|---|
| `order-placed` — New Order | `order.placed` | the order |
| `order-refunded` — Order Refunded | `order.refunded` | the order |
| `order-updated` — Order Updated | `order.updated` | the order |
| `attendee-checked-in` — Attendee Checked In | `attendee.checked_in` | the attendee |
| `attendee-checked-out` — Attendee Checked Out | `attendee.checked_out` | the attendee |
| `attendee-updated` — Attendee Updated | `attendee.updated` | the attendee |
| `event-created` — New Event | `event.created` | the event |
| `event-published` — Event Published | `event.published` | the event |
| `event-updated` — Event Updated | `event.updated` | the event |
| `event-unpublished` — Event Unpublished | `event.unpublished` | the event |
| `ticket-class-created` — New Ticket Class | `ticket_class.created` | the ticket class |
| `ticket-class-updated` — Ticket Class Updated | `ticket_class.updated` | the ticket class |
| `ticket-class-deleted` — Ticket Class Deleted | `ticket_class.deleted` | `null` (it is gone) |
| `organizer-updated` — Organizer Updated | `organizer.updated` | the organizer |
| `venue-updated` — Venue Updated | `venue.updated` | the venue |
| `activity` — Organization Activity | the **Actions** you choose | whichever record fired |

**Params.** *Organization ID* — leave it blank when the account belongs to exactly one organization
and it is looked up; with several, the subscription fails and names them. *Event ID* — limits the
webhook to one event. *Actions* — `activity` only.

**Lifecycle.**

- *Subscribe* creates an organization webhook (`POST /organizations/{id}/webhooks/`) whose
  `endpoint_url` is the subscription's callback URL, and stores the webhook id, organization,
  actions and event on the subscription. Before creating it, any webhook already pointed at that
  callback URL is deleted: the URL is unique to the subscription, so such a webhook is a leftover
  of an earlier attempt (a retried registration never leaves a duplicate behind).
- *Unsubscribe* deletes that webhook (`DELETE /webhooks/{id}/`). A webhook Eventbrite no longer has
  counts as deleted.
- *Receive.* Eventbrite's delivery is a notification, not the record:
  `{ "config": { "action", "webhook_id", "user_id", "endpoint_url" }, "api_url" }`. The ingest
  parser stores one event for it — `action`, `resourceType`, `resourceId`, `apiUrl`, `webhookId`,
  `userId`. The dashboard's **Test** ping and an action the subscription did not register are
  acknowledged with no event.
- *Run.* At dispatch the output parser fetches `api_url` with the subscription's connection, and
  the run's `trigger.event` is the stored event plus `resource`, the record as it is at that
  moment. A record that is gone (404) gives `resource: null`; any other failure is retried by the
  dispatcher.

**Verification.** Eventbrite does not sign webhook deliveries. The callback URL is the shared
secret; on top of it a delivery that names a different webhook id than the subscription
registered is refused (recorded as a failed call), and `api_url` must be on
`www.eventbriteapi.com/v3/` before it is fetched with the connection's credential.

Eventbrite retries a delivery it did not get a 2xx for, so a run can see the same change twice:
key on `trigger.event.id` (host-issued) or the record's own id when that matters.

## Pickers

Three params ask Eventbrite for their choices while the form is open, on the connection the
step already uses:

- `scopeId` — on `list-events`, `list-attendees` and `list-orders`: one cascading *Scope ID*
  whose label follows `scope` (via `when`) and which lists your organizations from
  `GET /v3/users/me/organizations/` when `scope` is `organization` (other scopes stay a
  typed id, `allowCustom`). `list-events` still accepts the old `organizationId` as a hidden
  legacy alias.
- `organizationId` — on the 17 actions that take an *Organization ID*, from
  `GET /v3/users/me/organizations/`.
- `organizerId` — on `create-event` (create only), `create-venue`, `update-venue` and
  `get-organizer`, from `GET /v3/organizations/{organizationId}/organizers/`.

The `resolveFields` hook pages both list endpoints (`continuation` when Eventbrite gives
one, otherwise the next `page_number`) up to 1 000 options per field, labelling each option
with its `name` and falling back to the id. When the form already holds an organization,
only that organization's organizers are offered; when it does not — `update-venue` and
`get-organizer` have no *Organization ID* of their own, and `create-event` /
`create-venue` have one that may still be empty — every organizer the connection can see is
offered, with its organization's name as the option's description. Committing a different
*Organization ID* on `create-event` or `create-venue` reloads their organizers; those are
the two params that set `refreshOn: ["organizationId"]`.

All of these params set `config: { allowCustom: true }`, so the field is a combobox: an
organization or organizer created after this App was published can be typed instead of
picked. The hook runs with `ctx.connection` redacted, its requests are signed behind the
same `network.allow` as any action, and it is capped at 10 seconds.

**When nothing can be loaded.** With no connection picked yet the editor does not call the
hook at all: the field falls back to a plain text input carrying the hint
`Connect an account to load choices`, and the id is still typeable — nothing is cleared. A
hook that throws or runs past its 10 s cap is reported on the fields that call asked for,
with a **Retry**, not on the whole form.

Nothing re-resolves at run time: whatever ids sit in the fields are what the action sends.

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
