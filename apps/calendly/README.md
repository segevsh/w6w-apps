# Calendly

Read Calendly users, event types, scheduled events and invitees; create single-use
scheduling links and manage webhook subscriptions.

- **Categories** — calendar, productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 12
- **Triggers** — 9 (webhook)
- **Egress allowlist** — `api.calendly.com`
- **Website** — https://calendly.com
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

## Triggers

| trigger — title | mechanism | vendor event | what the run gets |
|---|---|---|---|
| `invitee-created` — Invitee Scheduled | webhook (API-registered) | `invitee.created` | the invitee, event time and location, answers |
| `invitee-canceled` — Invitee Canceled | webhook (API-registered) | `invitee.canceled` | the invitee, the canceled meeting, the reason |
| `invitee-no-show-created` — Invitee Marked No-Show | webhook (API-registered) | `invitee_no_show.created` | the invitee, the missed meeting, the no-show record (in `payload.no_show`) |
| `invitee-no-show-deleted` — Invitee No-Show Removed | webhook (API-registered) | `invitee_no_show.deleted` | the invitee and the meeting |
| `event-type-created` — Event Type Created | webhook (API-registered) | `event_type.created` | name, slug, scheduling URL, duration, kind, active |
| `event-type-updated` — Event Type Updated | webhook (API-registered) | `event_type.updated` | the same fields after the change |
| `event-type-deleted` — Event Type Deleted | webhook (API-registered) | `event_type.deleted` | the same fields of the deleted event type |
| `routing-form-submission-created` — Routing Form Submitted | webhook (API-registered, organization scope) | `routing_form_submission.created` | the form, the answers, the routing result |
| `any-event` — Any Event | webhook (API-registered) | the `events` param (any of the 14 below) | event name, creator, resource URI, name, email and the full payload |

Calendly's event catalog (create-webhook-subscription): `invitee.created`, `invitee.canceled`,
`invitee_no_show.created`, `invitee_no_show.deleted`, `event_type.created`, `event_type.updated`,
`event_type.deleted`, `routing_form_submission.created`, `meeting_recap.created`,
`meeting_recap.updated`, `meeting_recap.deleted`, `contact.created`, `contact.updated`,
`contact.deleted`. The last six (recaps, contacts) have no named trigger because this app has no
actions for those records: reach them through **Any Event**.

**Any Event.** Calendly has no "all events" value, so the `events` param is the subscription's event
list (comma-separated). Left empty it subscribes to `invitee.created`, `invitee.canceled`,
`invitee_no_show.created`/`.deleted` and `event_type.created`/`.updated`/`.deleted`: the events every
plan allows. Opt in explicitly to `routing_form_submission.created` (organization scope only),
`meeting_recap.*` (user scope only) and `contact.*`; those need a paid plan (Calendly answers
`403 Please upgrade to a paid Calendly account` otherwise), and routing forms and recaps cannot share
one subscription. An unknown event name or a wrong scope is refused before any request is made.
Deliveries for events outside the subscribed list are acknowledged without starting a run.

**Not covered by a poll.** `event-type-get-many` is delivered by `event-type-created`;
`invitee-get-many` by `invitee-created` (same Invitee records);
`webhook-subscription-get-many` lists this app's own webhook configuration (admin data). No poll for
`scheduled-event-get-many`: it can only be ordered or filtered by `start_time`
(<https://developer.calendly.com/api-docs/calendly-api/scheduled-events/list-scheduled-events>), so a
newly booked meeting cannot be found by polling; new bookings arrive through `invitee-created`, which
carries the scheduled event.

### Setup

Subscribing looks up the connected user (`GET /users/me`) and runs `POST /webhook_subscriptions` for
the trigger's event (or the Any Event list), with a random per-subscription `signing_key` kept in the subscription's state;
unsubscribing runs `DELETE /webhook_subscriptions/{uuid}` (already gone counts as deleted). Scope
defaults to the whole organization; choose "Only my events" to limit it to the connected user.
**OAuth connections:** Calendly signs an OAuth app's webhooks with the app's own webhook signing key,
so paste it into the trigger's *Signing key* param; with a personal access token leave it blank.
The OAuth flow requests `users:read`, `event_types:read`, `scheduled_events:read`, `scheduling_links:write`, `webhooks:read` and `webhooks:write` (developer.calendly.com/scopes, checked 2026-11-09); a newly created Calendly OAuth app is granted nothing until scopes are requested.
Webhook subscriptions need a Calendly plan that allows them. `routing_form_submission.created` needs the
`routing_forms:read` scope: a personal access token has it, but the OAuth flow here does not request it
(add it to the OAuth app before using that trigger with OAuth).

### Trust model

Every delivery's `Calendly-Webhook-Signature: t=<unix>,v1=<hex>` is verified before the body is
parsed: HMAC-SHA256 of `t + "." + exact request body` under the signing key, compared in constant
time, and a timestamp more than 180 seconds (Calendly's documented 3 minute tolerance) from now is
refused. A missing, malformed or wrong signature, an absent raw body or an unset key refuses the
delivery.

Docs (verified 2026-11-10): https://developer.calendly.com/api-docs/overview/webhooks/webhook-signatures, https://developer.calendly.com/api-docs/calendly-api/webhooks/create-webhook-subscription, https://developer.calendly.com/api-docs/calendly-api/webhooks/get-sample-webhook-data

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
