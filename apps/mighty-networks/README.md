# Mighty Networks

Run a [Mighty Networks](https://www.mightynetworks.com) community — members, spaces, posts,
comments, events and RSVPs, invitations, tags, plans and course content — through the **Admin API**.

31 actions · 1 auth method · 2 declared health checks (+1 derived) · 217 unit tests.

## Links

| | |
|---|---|
| **Website** | <https://www.mightynetworks.com> |
| **API docs** | <https://docs.mightynetworks.com> (index: [`llms.txt`](https://docs.mightynetworks.com/llms.txt)) |
| **OpenAPI (Admin v1)** | <https://api.mn.co/admin/v1/spec/rest.json> — 3.1, 61 paths / 137 operations; every action was built from it |
| **Webhooks spec** | <https://api.mn.co/webhooks/v1/spec.json?format=json> — read for context only; no triggers are shipped |
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
