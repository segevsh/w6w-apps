# Uscreen

Video membership / OTT platform ([uscreen.tv](https://www.uscreen.tv)): customers, product
access, subscriptions, group (team) seats, invoices, offers, content visibility and view analytics
over the Uscreen **Publisher API**.

- App id: `io.w6w.uscreen`
- Auth: Publisher API key, sent as `Authorization: <key>` (no prefix)
- API host: `https://uscreen.io/publisher_api/v1` — `network.allow` is `uscreen.io`
- **Triggers** — 10 (poll)
- Icon: the vendor's own mark, `https://www.uscreen.tv/favicon.svg`, saved byte-for-byte (880 B).

Every path, verb, parameter and body field was checked on 2026-10-06 against the vendor's Swagger
2.0 document (`https://uscreen.io/api/publisher.yml`, v1.0.2, 39 operations) plus live probes of
`uscreen.io/publisher_api/v1` and `status.uscreen.tv`.

## Triggers

| Key | Mechanism | Wrapped list action | The run gets |
|---|---|---|---|
| `new-customer` | poll (5 min) | `customer-list` | each newly created customer |
| `new-invoice` | poll (5 min) | `invoice-list` | each newly created invoice |
| `new-or-updated-invoice` | poll (5 min) | `invoice-list` | each invoice that is created or edited (event identity `id:updated_at`) |
| `new-group` | poll (5 min) | `group-list` | each newly created group (team) subscription |
| `new-or-updated-group` | poll (5 min) | `group-list` | each group that is created or edited (event identity `id:updated_at`) |
| `new-group-member` | poll (5 min) | `group-member-list` | each member newly added to the chosen group (`groupId` parameter) |
| `new-content` | poll (5 min) | `content-list` | each new video, collection or live event |
| `new-customer-access` | poll (5 min) | `access-list` | each product access newly granted to the chosen customer (`customerId` parameter) |
| `new-offer` | poll (5 min) | `offer-list` | each offer newly added to the store (snapshot of the whole catalogue) |
| `new-playlist-item` | poll (5 min) | `playlist-item-list` | each playlist item newly added to the chosen content (`contentId` parameter) |

Both read `GET /customers` / `GET /invoices` with the vendor's documented `from=<RFC 3339>` and
`date_field=created_at` filter — the spec documents no sort order, so the trigger never relies on
one: it re-reads `cursor − 2 min`, pages through the window with the `Link` header's next page
(resuming on the next check if a window is larger than one page), and dedupes by `id`. The first
check only records the start time; records created before it are never emitted.
`new-or-updated-invoice` filters with `date_field=updated_at` (the spec lists `created_at, updated_at`
as the available fields and `Invoice.updated_at` is documented), drops invoices whose `updated_at`
predates the seed, and treats each new `id:updated_at` as a new event. The `Customer` schema carries
no update stamp, so there is no `new-or-updated-customer`. No webhook offering is
documented in the Publisher API, so there is nothing to subscribe to.

`new-group`, `new-or-updated-group` (`GET /groups`, `from` + `date_field` created_at | updated_at) and `new-group-member` (`GET /groups/{group_id}/members`, same filters; the member record has no `created_at`, so its `joined_on` is the stamp the first-check floor compares) use the same since-filter, paging and floor as the customer and invoice triggers. `new-content` (`GET /contents`) and `new-customer-access` (`GET /customers/{customer_id}/accesses`) send only `from` because the spec documents a `from`/`to` range there without naming the field or offering `date_field`; they stamp records by `created_at` and never emit one created before the first check. `new-offer` and `new-playlist-item` are bounded snapshots (the store's offer catalogue, read page by page; one content item's playlist, which takes no filter or page): each check reads the whole list and emits ids not seen before.
Not covered: `email-topic-list` (store configuration: at most 10 topics, the spec says), `views-list` and `views-summary-list` (analytics output, not records).

Vendor docs: https://uscreen.io/api/publisher.yml (`/customers`, `/invoices`, `/groups`, `/groups/{group_id}/members`, `/contents`, `/customers/{customer_id}/accesses`, `/offers`, `/contents/{content_id}/playlist_items` parameters, `Invoice.updated_at`, `Group.updated_at`; verified 2026-11-10).

## Actions (33)

| Resource | Actions |
|---|---|
| analytics | `views-list`, `watch-time-get`, `views-summary-list` |
| customer | `customer-list`, `customer-get`, `customer-create`, `customer-update`, `customer-sso-link-create` |
| access | `access-list`, `access-get`, `access-grant`, `access-revoke` |
| subscription | `subscription-get`, `subscription-create`, `subscription-cancel` |
| email topic | `email-topic-list` |
| group | `group-list`, `group-create`, `group-delete`, `group-member-list`, `group-member-add`, `group-member-remove` |
| invoice | `invoice-list`, `invoice-get` |
| offer | `offer-list`, `offer-get` |
| content | `content-list`, `content-get`, `playlist-item-list`, `playlist-item-get`, `content-publish`, `content-unpublish`, `content-schedule` |

List actions return **one page**: `{ items, totalCount, totalCountCapped, page, nextPage, hasMore }`.
Feed `nextPage` back as `page` until `hasMore` is false.

## Deliberately left out

The spec's `Content (Legacy)` tag is marked deprecated (`grep -i deprecat` on the document): `/programs`,
`/programs/{id}`, `/programs/{program_id}/chapters[/{id}]` each say "**Deprecated.** Use `/contents…`
instead". `/videos` and `/videos/{id}` sit under the same legacy tag with no replacement named, but
`content-list` with type `video` covers the same records, so they were not built either. Nothing here
is built against a deprecated path.

## Findings worth knowing

1. **Pagination lives in headers, not the body.** A list answers a bare JSON array; `Total-Count`
   and an RFC 5988 `Link` header carry the rest. `/invoices` and `/analytics/videos/views/summary`
   report `Total-Count: 10000+` past 10 000 and send no `last` link, so a client computing "last page"
   from `Total-Count` breaks there. The list actions parse both headers and expose `hasMore`.
2. **The key goes in `Authorization` raw.** `Authorization: Bearer <key>` is treated as a wrong
   key. A missing key is `401 {"message":"Missing private API key"}` and a wrong one
   `401 {"message":"Invalid private API key"}` — the body, not the status, is what tells them apart.
3. **204 is a real answer.** `GET`/`DELETE …/subscription` answer 204 with no body when the
   customer has no active subscription. These actions return `{ active: false, subscription: null }`
   rather than failing on an empty body.
4. **Several POSTs take their arguments in the query string**: `content-publish`
   (`event_launch_datetime`) and `content-schedule` (`scheduled_datetime`, `schedule_published`) have
   no body. Scheduling is refused for live events (422); a live event uses publish with a launch time.
5. **A customer id can be an email**, matched case-insensitively, anywhere a customer id is taken
   (including the analytics `user_id` filter). Path segments are percent-encoded.
6. **`tags` on customer update is a REPLACE; `unsubscribedTopicIds` only ever unsubscribes.**
   Omitting tags leaves them alone; there is no API to re-subscribe a customer.
7. **Two error shapes**: `{"message": "…"}` and, for 422 on writes, a field map such as
   `{"email": ["has already been taken"]}`. Both are folded into the thrown error text.
8. **`perform_action_at` is a string on access grants but an integer on subscriptions** in the
   spec; the actions take a number and convert for the access body.
9. **No documented rate limit**: no 429 response, no rate-limit header, no usage endpoint (checked
   in the spec and on live responses).

## Health checks

| Check | Probe |
|---|---|
| `service` | `https://status.uscreen.tv/api/v2/summary.json`. Atlassian Statuspage schema, `page.name` "Uscreen", `page.id` `hj2rt7vgpw2q` (pinned; a mismatch reports `unknown`), no redirect, a bogus sibling path 404s. The verdict is the `API V1` component (`v85f1q3jk6xj`, inside the `API` group); Storefront, Admin Portal, Video on Demand and Live Streaming are detail only. Page indicator is the fallback if the component disappears. |
| `api` | Unsigned `GET /email_topics` (`credential: "none"`). A schema-correct `401 {"message":"Missing private API key"}` is a **pass** — it proves DNS, TLS and the auth layer ran. HTML/edge shells are `down`, 5xx is `down`. |
| `quota` | Declared absence, `informational` — nothing to read (finding 9). |
| `auth:api-key` (derived) | `GET /email_topics` signed: a JSON array passes; the vendor's `message` is shown on rejection. The probe returns store config only, never the key or customer data. |

Credential validity is decided from the response body, never the status code.

## Tests

`deno task test` — 84 tests: the entry module, auth (sign/test), client helpers, health checks, and
two or more tests for every one of the 33 actions with a mocked `HookContext` (queued `ctx.fetch`,
no-op `ctx.log`).
