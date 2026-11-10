# Eventbrite

Create and run Eventbrite events end to end: events, tickets, inventory, discounts, orders, attendees, venues and webhooks, plus triggers on orders, check-ins and event changes.

- **Categories** — commerce, calendar
- **Auth methods** — personal-token, oauth2
- **Actions** — 94
- **Triggers** — 27 (16 webhook, 11 poll)
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

## Get resource by URL

`get-by-url` fetches any record from its API URL in one step, so a workflow fed by an Eventbrite
webhook (whose body is just `{ config, api_url }`) needs no router choosing among the `get-*`
actions. Bind **URL** to the delivery's `api_url` (`{{ trigger.event.apiUrl }}` from this app's
triggers); **Expand** is an optional comma-separated list sent as `?expand=` and replaces any
`expand` already on the URL.

It returns the record unchanged plus `resource_type`, the singular of the last collection named in
the path: `/v3/orders/1/` → `order`, `/v3/events/1/attendees/2/` → `attendee`,
`/v3/events/1/ticket_classes/3/` → `ticket_class`, `/v3/users/me/` → `user`. A list URL
(`/v3/events/1/attendees/`) reports the type of its items, so route on single-record URLs.

The URL is signed with the connection's credential, so only
`https://www.eventbriteapi.com/v3/…` is accepted. The action refuses any other scheme, host or
port, credentials in the URL, `.`/`..` segments, encoded dots or slashes, backslashes, whitespace
and control characters, all before it sends a request.

## Triggers

Sixteen webhook triggers ([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)):
one per Eventbrite webhook action, plus **Organization Activity** for any mix of them. Eventbrite's
webhook catalog is event, order, attendee, organizer, ticket class and venue; the table lists every
action in it. Eleven poll triggers (below) check on a schedule for the records Eventbrite sends no
webhook for.

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

**Poll triggers.** Each checks every five minutes or more, through the same list action the app
ships (same request, same connection), and the first check only records what exists, so nothing that
was there before the workflow was switched on fires.

| Trigger | List action it reads | The run gets | Parent to set |
|---|---|---|---|
| `new-or-updated-attendee` — New or Updated Attendee | `list-attendees` (`changed_since`) | each attendee that is new or changed (an edit or a check-in is a new run) | organization or event ID |
| `new-organizer` — New Organizer | `list-organizers` | each new organizer | organization ID |
| `new-venue` — New Venue | `list-venues` | each new venue | organization ID |
| `new-ticket-group` — New Ticket Group | `list-ticket-groups` (live groups) | each new ticket group | organization ID |
| `new-inventory-tier` — New Inventory Tier | `list-inventory-tiers` | each new tier | event ID |
| `new-seat-map` — New Seat Map | `list-seat-maps` | each new seat map | organization ID |
| `new-event-team` — New Event Team | `list-event-teams` (also covers `search-event-teams`) | each new team | event ID |
| `new-discount` — New Discount | `search-discounts` | each new discount or access code | organization ID, scope, event ID for the one-event scope |
| `new-custom-question` — New Custom Question | `list-custom-questions` | each new custom question | event ID |
| `new-default-question` — New Default Question | `list-default-questions` | each new default question | event ID |
| `new-organization-member` — New Organization Member | `list-organization-members` | each new member | organization ID |

The attendee trigger asks Eventbrite only for attendees changed since the last check (minus a two
minute overlap) and reads at most three pages per check, resuming where it stopped when a window
holds more. The others read the whole list (up to 20 pages of 50 records); a list longer than that,
or one Eventbrite says has more records than it can be asked for, makes the check fail with a clear
message instead of announcing records it did not read.

**Which trigger carries which list.** The webhook triggers deliver these records, so their list
actions need no poll: `list-events` (`event-created`), `list-orders` (`order-placed`) and
`list-ticket-classes` (`ticket-class-created`). Eventbrite's webhooks for organizers and venues are
update-only, so brand-new ones come from the `new-organizer` and `new-venue` polls. **Not covered by
a trigger**, because they are reference data or account administration that does not produce
events: categories, subcategories, formats, organization roles and fee rates (Eventbrite's fixed
reference data), your webhook list (the registrations this app itself creates), and the list of
organizations your account belongs to.

## Pickers

**Webhook actions** — Create Webhook and the Activity trigger use checkboxes with **Select all**.
Select any combination of the 15 supported actions. The app sends them to Eventbrite as a
comma-separated string (for example, `event.created,order.placed`). Selecting all sends all 15
names explicitly; it does not rely on an undocumented wildcard or an empty selection meaning all.
Create Webhook omits `actions` when no action is selected, preserving Eventbrite's default behavior.


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
