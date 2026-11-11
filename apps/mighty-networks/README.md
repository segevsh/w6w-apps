# Mighty Networks

Run a [Mighty Networks](https://www.mightynetworks.com) community — members, spaces, posts,
comments, events and RSVPs, invitations, tags, plans and course content — through the **Admin API**.

31 actions · 21 triggers (17 webhook, 4 poll) · 1 auth method · 2 declared health checks (+1 derived) · 282 unit tests.

## Triggers

17 webhook triggers (manual setup, shared-secret bearer token) and 4 polls.

| Trigger | Mechanism | Vendor event or wrapped list action | The run gets |
|---|---|---|---|
| `member-joined` — Member Joined | webhook (manual) | `MemberJoined` | event id, type and time; the payload (member, space id, network id) |
| `member-left` — Member Left | webhook (manual) | `MemberLeft` | the member, space id, network id, reason |
| `member-updated` — Member Updated | webhook (manual) | `MemberUpdated` | the member (profile), space id, network id |
| `member-purchased` — Member Purchased | webhook (manual) | `MemberPurchased` | the member, the plan, the purchase |
| `member-subscription-canceled` — Subscription Canceled | webhook (manual) | `MemberSubscriptionCanceled` | the member, the plan, the subscription |
| `member-tag-added` — Member Tag Added | webhook (manual) | `MemberTagAdded` | the member, the tag, network id |
| `member-tag-removed` — Member Tag Removed | webhook (manual) | `MemberTagRemoved` | the member, the tag, network id |
| `member-lesson-completed` — Lesson Completed | webhook (manual) | `MemberLessonCompleted` | the member, the course, the lesson, completion time |
| `post-created` — Post Created | webhook (manual) | `PostCreated` | event id, type and time; the payload (post id, title, summary, type, status, space, creator, permalink) |
| `post-updated` — Post Updated | webhook (manual) | `PostUpdated` | the post (same fields as Post Created) |
| `comment-created` — Comment Created | webhook (manual) | `CommentCreated` | the comment (id, text, author, target, space) |
| `event-created` — Event Created | webhook (manual) | `EventCreated` | the event (title, start/end, location, recurrence, space, creator) |
| `event-updated` — Event Updated | webhook (manual) | `EventUpdated` | the event |
| `event-canceled` — Event Canceled | webhook (manual) | `EventCanceled` | the event |
| `rsvp-created` — RSVP Created | webhook (manual) | `RsvpCreated` | the RSVP (status), the event, the member |
| `invite-requested` — Invite Requested | webhook (manual) | `InviteRequested` | the request (status, space/plan ids) and the requesting member |
| `network-event` — Network Event (any event) | webhook (manual) | any event the webhook sends, optionally narrowed with the `events` param | event id, type and time; the full payload |
| `new-space` — New Space | poll (every hour) | `GET /spaces` (`space-list`, snapshot diff) | the new space |
| `new-plan` — New Plan | poll (every hour) | `GET /plans` (`plan-list`, snapshot diff) | the new plan |
| `new-tag` — New Tag | poll (every hour) | `GET /tags` (`tag-list`, snapshot diff) | the new tag |
| `new-coursework` — New Coursework | poll (every hour) | `GET /spaces/{space_id}/courseworks` (`coursework-list`, snapshot diff; `spaceId` param) | the new lesson, quiz or section |

The four polls exist because the webhook catalog has no event for a new space, plan, tag or coursework item. Each reads the whole list page by page (100 per page; the Admin API documents no sort order or since filter on these lists), diffs it against the last check and reports additions only; a list that fills 20 pages (2,000 records) or whose response cannot be read is refused with an error rather than cut short.

**Cost.** The Admin API is metered per request (Scale includes 5,000 a month, then $0.002 per extra request; see Plan requirement below), and every check of a poll is at least one request. The four polls therefore run at most once an hour (about 720 requests a month each, more for lists over 100 records); the webhook triggers are inbound and cost no requests. Unsubscribe a poll you do not need.

Not covered as triggers: `space-member-list` and `member-list` (per space join: `member-joined` fires when a member joins a space, not for a network-level sign-up), `post-list`, `comment-list` and `event-list` are unbounded with no sort order or since filter in the Admin API, so their new records arrive through the webhook triggers above (`member-joined`, `post-created`, `comment-created`, `event-created`); `invite-list` has only an email filter and no order (https://api.mn.co/admin/v1/spec/rest.json) and no webhook event announces an invitation sent from the dashboard, so it has no trigger. Events with no named trigger (for example `MemberJoinRequested`, `ReactionCreated`, `ArticleCreated`, the poll events, `MemberPlanChanged`, `MemberBadgeAdded`, `CustomFieldResponseCreated`, `ReportedContentCreated`) are reachable through `network-event` with the `events` filter.

**Setup (manual).** The Admin API this app uses has no endpoint to register a webhook. Subscribe the trigger in w6w, copy its callback URL, then in your Network settings add a webhook endpoint with that URL, pick the events (for example `MemberJoined`, `PostCreated`, or one per named trigger above) and set an API key for it. Paste the same key into the trigger's `webhookKey` param. The webhook endpoint must be HTTPS, and Mighty Networks retries any non-2xx answer and pauses delivery to an endpoint that keeps failing, so keep the trigger subscribed.

**Trust model.** Mighty Networks does not sign the body. Every delivery carries `Authorization: Bearer <the API key configured on the webhook>`; the trigger refuses a delivery whose key is unset, whose bearer token is missing, or that does not match the pasted key (constant-time compare), before it parses the body. The key proves the sender knows it; it does not bind the event data, and a captured delivery could be replayed with another body, so keep both the key and the callback URL private. The vendor's prose example names the event `PostCreatedHook`, its event schemas name it `PostCreated`; both spellings are accepted, and a delivery with no `event_type` is refused by the two specific triggers (the generic one passes it through).

Docs (verified 2026-11-10): https://docs.mightynetworks.com/api/webhooks.md, Admin API https://api.mn.co/admin/v1/spec/rest.json, event schemas https://api.mn.co/webhooks/v1/spec.json?format=json and https://docs.mightynetworks.com/api-reference/webhooks/postcreated.md

## Links

| | |
|---|---|
| **Website** | <https://www.mightynetworks.com> |
| **API docs** | <https://docs.mightynetworks.com> (index: [`llms.txt`](https://docs.mightynetworks.com/llms.txt)) |
| **OpenAPI (Admin v1)** | <https://api.mn.co/admin/v1/spec/rest.json> — 3.1, 61 paths / 137 operations; every action was built from it |
| **Webhooks spec** | <https://api.mn.co/webhooks/v1/spec.json?format=json> — the event schemas the triggers follow |
| **Status page** | <https://status.mightynetworks.com> |

## Plan requirement

The Admin API is only available on the **Scale, Growth and Mighty Pro** plans (quick start,
fetched 2026-10-05). It is metered: Scale includes 5,000 requests a month and bills $0.002 per
extra request; the other plans are custom. A 403 from `test` is reported as a permission-or-plan
problem rather than a bad token.

## Authentication

One method, `api-token` (`bearer`): `Authorization: Bearer <token>`.

| Field | Secret | Notes |
|---|:-:|---|
| Network ID or subdomain | no | numeric id or the `acme` in `acme.mn.co` |
| Admin API Token | yes | Admin → Settings → API Keys → Generate New API Key (shown once) |

**Design choice — the Network ID lives on the connection, not on each action.** Every route is
`/admin/v1/networks/{network_id}/…` and a key belongs to exactly one Network, so it is a non-secret
connection field that actions read from `ctx.connection.display.networkId` (the same pattern as
`adalo`'s App ID). One Connection = one Network; run two Networks with two Connections. An
action on a connection without it fails fast with "reconnect it with the Network ID field set".
The spec's `networkId` parameter accepts the integer id or the subdomain; both work.

The credential check is `GET /networks/{id}/me` — the quick start's own first call. It returns the
token's user and Network, never the token. The result is classified from the response **body**
(a pass needs the documented `me` payload; a 200 with an HTML shell or an `{error}` body is not
one) and failures are reported with the vendor's own `error`/`message` text. Observed unauthenticated
on 2026-10-05: HTTP 401 `{"error":"Missing or malformed Authorization header"}`.

## Actions

| Resource | Actions |
|---|---|
| Token | `me-get` |
| Members | `member-list`, `member-get`, `member-find-by-email`, `member-create`, `member-update` |
| Spaces | `space-list`, `space-get`, `space-create`, `space-member-list`, `space-member-add`, `space-member-remove` |
| Posts | `post-list`, `post-get`, `post-create`, `post-update`, `post-delete` |
| Comments | `comment-list`, `comment-create` |
| Events | `event-list`, `event-get`, `event-create`, `event-update`, `rsvp-create` |
| Invites | `invite-list`, `invite-create` |
| Tags | `tag-list`, `member-tag-add`, `member-tag-remove` |
| Plans / courses | `plan-list`, `coursework-list` |

### List responses

The OpenAPI document references a `…ResponsePaged` schema for every list route but never defines
it (the `$ref`s dangle), and the prose docs show two different envelopes (`{data, meta}` on one
page, `{items, links}` on another). The shape is therefore **unconfirmed**, and list actions
return `{ items, result }`: `result` is the body untouched, and `items` is lifted out of it when
the body is an array or has an `items`/`data` array (otherwise `null`). Paging is `page` (from 1)
and `per_page` (max 100).

### Notes on specific actions

- `space-member-add` sends `user_id` as a **query** parameter on a body-less POST, as the spec
  defines it.
- Delete-style actions return `{ success: true }`; the spec documents no response body for them.
- `event-create` / `event-update` omit `by_days` and `by_month_days`: the spec types them as an
  integer on create and a string on update, so the wire format is ambiguous.
- `event_type` is a free string: the spec says "'online_meeting', 'local_meetup', etc." and
  publishes no closed list.

### Left out (about 106 of 137 operations)

Courseworks create/update/delete, space update/delete, member delete, member removal from the
Network, space-member role updates and **ban**, password resets, badges (and member badges),
polls, collections, custom fields / options / answers, reactions, post mute, plan members and
plan invites, plan archive, subscriptions and purchases (list/show/cancel), abuse reports,
asset upload, event delete, RSVP list/update/delete, invite
update/delete, tag create/update/delete, and the duplicate `PUT` forms of every `PATCH`. The
destructive ones were left out deliberately; the rest are additive work. Webhook triggers are not
shipped.

The spec marks only two things deprecated, neither of which is used: the invite response's
`user_id` (use `sender_id`) and an asset `input_type` field.

## Health checks

`` `service` · ~~quota~~ · 1 derived ``

- **`service`** — `https://status.mightynetworks.com/api/v2/summary.json`, checked on 2026-10-05:
  200 `application/json`, `page.name` "Mighty Networks", 25 components including **API Access**;
  unknown paths on the host answer 404 (so it is not a catch-all) and the host does not redirect.
  The payload is Statuspage-shaped but has no `incidents` key. The verdict follows the
  **API Access** component, not the page indicator (which also covers iOS/Android, Looker, Intercom
  and the marketing site); `API (Public Network Feed)` is a different surface and is not used.
  A page that does not identify as "Mighty Networks", or fails, reports `unknown`, never `down`.
  Unsigned, with `status.mightynetworks.com` allowed for this hook only.
- **`quota`** — declared unavailable (`informational`): the API is metered per plan but there is
  no usage endpoint or rate-limit header in the spec or docs.
- **`auth:api-token`** — derived from `test` (`GET /me`, above).

## Icon

`assets/icon.svg` is the vendor's own favicon, fetched from
<https://www.mightynetworks.com/favicon.svg> and stored byte-for-byte (`cmp` clean).
