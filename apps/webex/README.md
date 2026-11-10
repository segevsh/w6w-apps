# Webex

Manage Webex spaces, messages, memberships, teams and webhooks — the Webex Messaging API.

- **Category** — communication
- **Auth methods** — oauth2
- **Actions** — 34
- **Triggers** — 11 (8 webhook, 3 poll)
- **Egress allowlist** — `webexapis.com`
- **Website** — https://www.webex.com
- **API docs** — https://developer.webex.com/docs/api/v1/people

Every path, verb, parameter and enum was read directly out of `developer.webex.com`'s own
API reference on 2026-09-29 (each reference page embeds a per-operation OpenAPI 3.0.3
fragment in `window.__INITIAL_STATE__.apiReference`), plus live probes against
`webexapis.com`. Covers Rooms, Messages, Memberships, Teams, Team Memberships, Webhooks,
and a read-only slice of People.

## Triggers

| Trigger | Mechanism | Vendor event / list call | The run gets |
|---|---|---|---|
| `new-message` — New Message | webhook (API-registered) | `messages` / `created` | space, sender, message id and text |
| `message-deleted` — Message Deleted | webhook (API-registered) | `messages` / `deleted` | space, who deleted it, message id (no text) |
| `new-membership` — New Space Member | webhook (API-registered) | `memberships` / `created` | space, the person who joined |
| `membership-updated` — Space Member Updated | webhook (API-registered) | `memberships` / `updated` | space, the person (moderator changes) |
| `membership-deleted` — Space Member Removed | webhook (API-registered) | `memberships` / `deleted` | space, the person who left or was removed (group spaces only) |
| `room-created` — Space Created | webhook (API-registered) | `rooms` / `created` | space id, title, type (spaces made by this account or its integrations) |
| `room-updated` — Space Updated | webhook (API-registered) | `rooms` / `updated` | space id, title, type, lock state |
| `any-event` — Any Event | webhook (API-registered, `all`/`all`) | every messaging event, or the ones named in `events` | resource, event, actor, record ids |
| `new-room` — New Space | poll (5 min) | `GET /rooms` (`list-rooms`) | each space the account newly joined or created |
| `new-team` — New Team | poll (5 min) | `GET /teams` (`list-teams`) | each team the account newly belongs to |
| `new-team-member` — New Team Member | poll (5 min) | `GET /team/memberships?teamId=` (`list-team-memberships`) | each person newly added to the team you pick |

**Setup.** Nothing to do by hand for the webhook triggers: subscribing creates a Webex webhook (`POST /v1/webhooks`) pointed at the trigger's callback URL with a random `secret`, after removing any leftover webhook already pointed at that URL; unsubscribing deletes it. A message trigger also reads `GET /v1/people/me` so it can skip the connection's own messages (turn on `includeOwnMessages` to keep them). **Any Event** registers Webex's "all resource" firehose (`resource: all`, `event: all`, which Webex documents as covering `memberships`, `messages` and `rooms`) and then keeps only the events you list in `events` (comma-separated `resource.event`, e.g. `messages.created,rooms.updated`; empty = all seven: `memberships.created|updated|deleted`, `messages.created|deleted`, `rooms.created|updated`). A misspelt name is refused when you subscribe. The firehose needs read scope on all three resources, which this app's OAuth scopes already carry.

**Polls.** `new-room`, `new-team` and `new-team-member` diff the whole list each time (Webex documents no usable order for them) and emit rows that were not there at the previous check. Webex silently cuts a list to a per-endpoint ceiling, so a check that comes back with a full page (1000 spaces, 100 teams, 100 team members) fails with an error saying so instead of guessing; narrow it or use the webhook triggers.

**Trust model.** Webex sends `X-Spark-Signature`, the hex HMAC-SHA1 of the unmodified raw body under the webhook's `secret`. The secret is generated per subscription and kept in subscription state; a missing signature, a mismatch or a subscription with no stored secret refuses the delivery. Webex puts no timestamp in a delivery, so there is no replay window. The notification holds ids only; the run's message text is fetched at dispatch time and is empty when the connection cannot read the message (a bot sees only messages that mention it).

**Not covered.** `list-messages` and `list-direct-messages` (new messages are `new-message`), `list-memberships` (`new-membership`). Skipped: `list-people` (an org directory search: non-admins must pass `email` or `displayName`, there is no created-since filter or order, and presence polling is rate-limited per the Webex docs) and `list-webhooks` (the app's own webhook registrations, not a record feed). Not offered: card interactions (`attachmentActions`), `rooms.migrated`, and Meetings/Recordings/Calling events, which are outside the Messaging API this app covers.

Sources (verified 2026-11-10): https://developer.webex.com/messaging/docs/api/v1/webhooks/create-a-webhook (event catalog, filters, signing), https://developer.webex.com/docs/basics#pagination , https://developer.webex.com/messaging/docs/api/v1/rooms/list-rooms , https://developer.webex.com/messaging/docs/api/v1/messages/list-messages ("sorts the messages in descending order by creation date").

## Why People is read-only

Webex's own callout on the People reference (since January 2024): "the Webex APIs have
been fully upgraded to support the industry-standard SCIM 2.0 protocol, which is used for
user and group management, provisioning, and maintenance. Developers are advised to use
this API instead of the people API." This app therefore ships `get-my-own-details`,
`get-person` and `list-people` but no create/update/delete-person.

## A webhook read echoes its own signing secret

Webex's OpenAPI schema documents `secret` — the HMAC key used to verify a webhook
payload's signature — as a field on `Create a Webhook`, `Get Webhook Details`, `Update a
Webhook` **and** every item of `List Webhooks`' `items` array (verified 2026-09-29:
identical field and example value across all four). An ordinary read of a webhook,
including one a caller did not create, would hand back the key that lets anyone forge its
callback payloads. `lib/client.ts`'s `stripWebhookSecret` deletes the field from every
response this app returns, the same way `apify`'s `stripSecrets` protects `proxy.password`
and `urlSigningSecretKey`.

## OAuth 2.0

Register an Integration at `developer.webex.com` > My Webex Apps, then connect with its
Client ID and Client Secret. `authorizationUrl`/`tokenUrl`/`refreshUrl` are all
`https://webexapis.com/v1/{authorize,access_token}` — the same host as the API, so
`network.allow` needs nothing beyond `webexapis.com`. An access token lasts 14 days, a
refresh token 90; both are event-driven ("use the expiration values returned by the
service"), which is why this declares `refreshUrl` rather than a fixed schedule.

PKCE is documented for a *separate* flow ("Login with Webex" — public clients,
device-code, OIDC) and is not part of the confidential-client Integration flow this Auth
targets, so `pkce` is left unset.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.webex.com>

```
GET https://status.webex.com/history.rss
```

`status.webex.com` self-identifies as Statuspage-branded (`<description>Statuspage
</description>` on its own RSS channel) but its `/api/v2/*.json` paths are **not real** —
confirmed 2026-09-29, every one answers `200 text/html`, the identical 463-byte SPA shell
every unknown route on that host serves. The SPA's own JS bundle calls a *different* host,
`service-status.webex.com`, for live JSON, but that endpoint requires an `Authorization`
header the bundle sources from Webex's own SSO — not a public, unsigned API this check
could call.

What IS real and public: `/history.rss` (confirmed `200 application/rss+xml`, 96 KB, live
items dated the day of verification) and a family of per-product feeds
(`Webex_Calling.rss`, `Webex_Meetings.rss`, `Webex_Contact_Center.rss`, `Webex_App.rss`,
`Collaboration_Control_Hub.rss`, all confirmed live and distinct). None of those
per-product feeds is scoped to the Messaging REST API this app calls — Rooms/Messages/
Teams are not "Webex Calling", "Webex Meetings" or "Webex App" in Cisco's own taxonomy.
The general `/history.rss` does occasionally carry a directly relevant item — one
confirmed live on 2026-09-29 was titled "Webex Services: Login failures for the Webex API
service in the APAC region" — but that same feed is dominated by Contact Center, Calling,
Meetings and Control Hub incidents unrelated to this app's calls, and there is no isolated
"Webex Messaging API" component to read instead. `health/service.ts` therefore wires the
general feed but caps it at `severity: "informational"` rather than this kind's `degraded`
default: a red state here is a hint to go look, not a verdict on whether `webexapis.com`
calls will succeed.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

```
GET /people/me
```

The vendor's own reference entry point for this app. Needs only the base
`spark:people_read` scope every Integration above carries, and returns no credential
material. Classified from the response body, never the status code alone: a missing or
invalid access token answers `401 {"message": "The request requires a valid access token
set in the Authorization request header.", "errors": [...], "trackingId": "..."}`,
confirmed live on 2026-09-29 — the message never echoes the token itself.

### Do we have quota left?

Nothing to read. Webex documents throttling only in prose — every 4xx/5xx entry across the
People, Rooms, Messages, Memberships, Teams, Team Memberships and Webhooks operations
describes `429` as "Too Many Requests... A `Retry-After` header should be present", but no
operation documents a remaining-quota header or a headroom endpoint, and a live
unauthenticated `GET /people/me` carried no `RateLimit-*` / `X-RateLimit-*` header of any
kind on its `401`. `health/quota.ts` declares this rather than omitting it, so a host can
tell "we checked, there is nothing" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | 60s | `health/service.ts` (feed) |
| `quota` | quota | connection | — | informational | — | declared unavailable |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The feed host (`status.webex.com`) is reachable **only inside that hook's worker** — the
spec's `feed` mechanism allowlists it implicitly, so it is deliberately absent from
`w6w.network.allow` and from every action.

---

Researched and endpoint-verified 2026-09-29. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
