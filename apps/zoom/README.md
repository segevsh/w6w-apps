# Zoom

- **Triggers** — 20 (16 webhook, 4 poll)

## Triggers

| Key | Title | Mechanism | Zoom event or wrapped list action | What the run gets |
| --- | --- | --- | --- | --- |
| `meeting-created` | Meeting Created | webhook (manual) | `meeting.created` | the event's object |
| `meeting-updated` | Meeting Updated | webhook (manual) | `meeting.updated` | the event's object |
| `meeting-deleted` | Meeting Deleted | webhook (manual) | `meeting.deleted` | the event's object |
| `meeting-started` | Meeting Started | webhook (manual) | `meeting.started` | the event's object |
| `meeting-ended` | Meeting Ended | webhook (manual) | `meeting.ended` | the event's object |
| `meeting-registration-created` | Meeting Registration Created | webhook (manual) | `meeting.registration_created` | the event's object |
| `webinar-created` | Webinar Created | webhook (manual) | `webinar.created` | the event's object |
| `webinar-updated` | Webinar Updated | webhook (manual) | `webinar.updated` | the event's object |
| `webinar-deleted` | Webinar Deleted | webhook (manual) | `webinar.deleted` | the event's object |
| `webinar-started` | Webinar Started | webhook (manual) | `webinar.started` | the event's object |
| `webinar-ended` | Webinar Ended | webhook (manual) | `webinar.ended` | the event's object |
| `user-created` | User Created | webhook (manual) | `user.created` | the event's object |
| `user-updated` | User Updated | webhook (manual) | `user.updated` | the event's object |
| `user-deleted` | User Deleted | webhook (manual) | `user.deleted` | the event's object |
| `recording-completed` | Recording Completed | webhook (manual) | `recording.completed` | the event's object |
| `any-event` | Any Event | webhook (manual) | the event names in the `events` param (empty = every event the app is subscribed to) | the event and its object |
| `new-recording` | New Cloud Recording | poll | `recording-get-many` over a `from`/`to` date window | each meeting with a cloud recording |
| `new-meeting` | New Meeting | poll (snapshot) | `meeting-get-many`, `type=scheduled` | each meeting newly on the user's list |
| `new-webinar` | New Webinar | poll (snapshot) | `webinar-get-many` | each webinar newly on the user's list |
| `new-user` | New User | poll (snapshot) | `user-get-many` | each user newly on the account's list |

**Setup (event triggers).** Zoom event subscriptions live on the Marketplace app, not in the REST API:

1. Create the trigger and copy its callback URL.
2. In the Zoom Marketplace, open your app, Features, Event Subscriptions, add a subscription whose **Event notification endpoint URL** is that URL, and tick the events you want (the trigger's event, or any events for **Any Event**).
3. Copy the app's **Secret Token** (Features) into the trigger's `secretToken` param.
4. Click **Validate** in Zoom: the trigger answers Zoom's `endpoint.url_validation` challenge itself.

**Trust model.** Zoom signs each event: `x-zm-signature` must equal `v0=` plus the hex HMAC-SHA256, keyed by the Secret Token, of `v0:<x-zm-request-timestamp>:<raw body>`. The check runs over the raw body bytes before anything is parsed, rejects a timestamp more than 5 minutes from now (Zoom publishes no window of its own; this is the webhook kit's default), and refuses a missing secret, header or body and any mismatch. The URL-validation challenge is answered only after the same check and only for a plain token (letters, digits, `-`, `_`), so the endpoint cannot be used to sign a message of someone else's choosing. Zoom's 24-hour `download_token` in `recording.completed` is not passed on; fetch files with your connection instead.

**Polls.** The snapshot polls read the whole list (300 a page, at most 16 pages) and compare it check to check. Zoom's meeting and webinar lists only return unexpired items, so they stay bounded; a list longer than the pages read is refused rather than compared partly. `new-recording` reads from `from`/`to` (`yyyy-mm-dd` UTC, "The maximum range can be a month") and pages with `next_page_token` (valid 15 minutes). Each check reads from the day of the last drain, minus a 2 minute overlap, to tomorrow's date (Zoom does not say whether `to` is inclusive; its own default window is today to tomorrow); a window of more than three pages is resumed with the page token (a token Zoom rejects restarts the window, and ids are de-duplicated). A meeting that started before the trigger was first checked is never emitted. Pick the user with the `userId` trigger param (default `me`).

**Not covered.** Nothing: every list action is behind a trigger. Participant, chat, sharing, summary and phone-callout events (about 100 of Zoom's) are reachable through **Any Event**.

Vendor documentation (verified 2026-11-10): [Webhooks](https://developers.zoom.us/docs/api/webhooks/), [Meeting, webinar and recording events](https://developers.zoom.us/docs/api/meetings/events/), [User events](https://developers.zoom.us/docs/api/users/events/), [Meetings API](https://developers.zoom.us/docs/api/meetings/), [Users API](https://developers.zoom.us/docs/api/users/).

Schedule and manage Zoom meetings, webinars, registrants, users and cloud recordings.

- **Categories** — video, communication
- **Auth methods** — server-to-server, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.zoom.us`, `zoom.us`
- **Website** — https://www.zoom.com
- **API docs** — https://developers.zoom.us/docs/api/

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — <https://status.zoom.us>

```
GET https://status.zoom.us/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup (`status.indicator` is
`none` / `minor` / `major` / `critical`); `/api/v2/summary.json` adds per-component detail and open
incidents; `/api/v2/components.json` lists the components on their own. All three are
unauthenticated, CORS-enabled and cheap enough to poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

All 2 auth methods probe:

```
GET /v2/users/me
```

The authenticated user. Works for both credential types and needs only `user:read`.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is diagnosing a
failure, and the host it lives on is not in `w6w.network.allow`, so an action could not reach it
even if it tried.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Category` response headers. Zoom bands endpoints into Light /
Medium / Heavy / Resource-intensive categories with separate daily allowances.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key                     | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                         |
| ----------------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                           |
| `quota`                 | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                                             |
| `auth:server-to-server` | credential | connection | signed     | fatal         | —            | derived from the `server-to-server` auth method's `test` hook |
| `auth:oauth2`           | credential | connection | signed     | fatal         | —            | derived from the `oauth2` auth method's `test` hook           |

The host `status.zoom.us` (for `service`) is reachable **only inside that hook's worker** — not from
any action, and not from the other checks. The spec allows the widening precisely because the check
is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with `_tools/audit.ts`
conventions in mind if a probe starts failing for everyone at once.
