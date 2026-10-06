# Uscreen

Video membership / OTT platform ([uscreen.tv](https://www.uscreen.tv)): customers, product
access, subscriptions, group (team) seats, invoices, offers, content visibility and view analytics
over the Uscreen **Publisher API**.

- App id: `io.w6w.uscreen`
- Auth: Publisher API key, sent as `Authorization: <key>` (no prefix)
- API host: `https://uscreen.io/publisher_api/v1` — `network.allow` is `uscreen.io`
- Icon: the vendor's own mark, `https://www.uscreen.tv/favicon.svg`, saved byte-for-byte (880 B).

Every path, verb, parameter and body field was checked on 2026-10-06 against the vendor's Swagger
2.0 document (`https://uscreen.io/api/publisher.yml`, v1.0.2, 39 operations) plus live probes of
`uscreen.io/publisher_api/v1` and `status.uscreen.tv`.

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
