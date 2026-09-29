# Webex

Manage Webex spaces, messages, memberships, teams and webhooks — the Webex Messaging API.

- **Category** — communication
- **Auth methods** — oauth2
- **Actions** — 34
- **Egress allowlist** — `webexapis.com`
- **Website** — https://www.webex.com
- **API docs** — https://developer.webex.com/docs/api/v1/people

Every path, verb, parameter and enum was read directly out of `developer.webex.com`'s own
API reference on 2026-09-29 (each reference page embeds a per-operation OpenAPI 3.0.3
fragment in `window.__INITIAL_STATE__.apiReference`), plus live probes against
`webexapis.com`. Covers Rooms, Messages, Memberships, Teams, Team Memberships, Webhooks,
and a read-only slice of People.

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
