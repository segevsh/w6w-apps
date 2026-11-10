# Google Calendar

Read and manage Google Calendar events: check availability, create, update, and delete
calendar events.

- **Categories** — calendar, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 8
- **Triggers** — 7 (poll)
- **Egress allowlist** — `www.googleapis.com`
- **Website** — https://calendar.google.com
- **API docs** — https://developers.google.com/workspace/calendar

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

See the Workspace Status Dashboard note above; Calendar appears under its own
`service_key`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /users/me/calendarList?maxResults=1
```

One entry from the calendar list. There is no whoami on the Calendar API, and capping
the page at 1 keeps it cheap. It succeeds even for an account with no calendars — an
empty list is still a 200.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint; quota is per-project and visible in the Google Cloud console.

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

## Triggers

| Key — title | Mechanism | Wrapped list action | What the run gets |
|---|---|---|---|
| `event-changed` — Event Changed | poll | `list-events` with `syncToken` | One event that was created, updated or cancelled since the last check, plus `changeType` (`created`, `updated` or `cancelled`) |
| `new-event` — New Event | poll | `list-events` with `syncToken` | One event newly created since the last check |
| `event-updated` — Event Updated | poll | `list-events` with `syncToken` | One existing event edited since the last check |
| `event-cancelled` — Event Cancelled | poll | `list-events` with `syncToken` | One event cancelled (deleted) since the last check |
| `event-started` — Event Started | poll | `list-events` with `timeMin`/`timeMax`, `orderBy=startTime` | One event whose start time passed since the last check |
| `event-ended` — Event Ended | poll | `list-events` with `timeMin`/`timeMax`, `orderBy=startTime` | One event whose end time passed since the last check |
| `new-calendar` — New Calendar | poll | `list-calendars` (bounded snapshot) | One calendar newly added to the account's calendar list |

The first check does a full `events.list` walk on the chosen calendar (page size 250, no time or
query filters, `singleEvents=true`) and stores the final `nextSyncToken`; it emits nothing. Each later
check sends one `events.list` page with `syncToken=<stored token>` and `maxResults=100`, and nothing
Google forbids alongside a sync token (`timeMin`, `timeMax`, `updatedMin`, `q`, `iCalUID`, `orderBy`).
Cancelled events are emitted with `changeType: "cancelled"` (Google always returns deleted entries on
an incremental sync). `changeType` is `created` when the event's `updated` is within two seconds of
its `created`, otherwise `updated`. So an event created and edited again before the next check is `updated`: `new-event`
misses it and `event-updated` emits it (the feed shows the latest state only). If Google answers `410 GONE` the token is invalid and the
trigger re-syncs from scratch and emits nothing for that check, so changes made in between are not
reported. If a changes page has a following page, the next check continues from it.
`new-event`, `event-updated` and `event-cancelled` share that sync feed and each keeps its own sync
token, so each emits only its own kind of change. `event-started` and `event-ended` read a time window
`[last check, now)` (`timeMin`/`timeMax` are whole-second RFC 3339; Google treats `timeMin` as an
exclusive bound on an event's end and `timeMax` as an exclusive bound on its start), emit the events
whose start (or end) falls inside it, and move the window forward only after every page of it was
read (at most 3 pages of 100 per check; a bigger window continues on the next check). The first check
emits nothing, and events whose start/end passed before it are never emitted. All-day events start and end at midnight in the calendar's time zone (the
`timeZone` Google returns with the listing; UTC if it returns none). `new-calendar` reads the whole calendar list (up to 2,500 calendars, else an error)
and emits ids not in the seeded snapshot.

Not covered: Google's push channels (`events.watch`) — a notification carries no event data, only
headers, the channel expires and nothing in the trigger lifecycle renews it, so a w6w user cannot run it
safely; polling the sync feed delivers the same changes.

Trust model: the trigger only reads the calendar through the connection's own credential; nothing is
received from outside.

Verified 2026-11-10: push-notification limits https://developers.google.com/workspace/calendar/api/guides/push,
`timeMin`/`timeMax`/`orderBy` in https://developers.google.com/workspace/calendar/api/v3/reference/events/list,
calendar list https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list. Verified 2026-11-09: sync guide https://developers.google.com/calendar/api/guides/sync (initial
full sync, `nextSyncToken` only on the last page, 410 means full re-sync) and the `syncToken`
parameter of https://developers.google.com/workspace/calendar/api/v3/reference/events/list.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
