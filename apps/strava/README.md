# Strava

Read and log activities, comments, kudos and athlete stats via the Strava API v3.

- **Categories** — productivity
- **Auth methods** — oauth2
- **Actions** — 9
- **Triggers** — 3 (webhook)
- **Egress allowlist** — `www.strava.com`
- **Website** — https://www.strava.com
- **API docs** — https://developers.strava.com/docs/reference/

## Actions

All paths are relative to `https://www.strava.com/api/v3`.

| Key | Resource | Method + path |
|---|---|---|
| `athlete-get` | athlete | `GET /athlete` |
| `athlete-stats-get` | athlete | `GET /athletes/{id}/stats` |
| `activity-list` | activity | `GET /athlete/activities` |
| `activity-get` | activity | `GET /activities/{id}` |
| `activity-create` | activity | `POST /activities` |
| `activity-update` | activity | `PUT /activities/{id}` |
| `activity-comments-list` | activity | `GET /activities/{id}/comments` |
| `activity-kudos-list` | activity | `GET /activities/{id}/kudos` |
| `activity-zones-get` | activity | `GET /activities/{id}/zones` |

Deliberately out of scope for this port, noted in `index.ts`: file-based activity uploads
(`POST /uploads`, a multipart flow distinct from the manual `POST /activities` this app
covers), segments/routes/clubs/gear resources, and creating the push subscription itself (see Triggers).

`activity-create` and `activity-update` send `sport_type` only — Strava's older `type` field
is deprecated and silently ignored whenever `sport_type` is present, so sending both would be
dead weight. `athlete-stats-get` requires the caller to pass their own athlete id (from
`athlete-get`): Strava's docs are explicit that the `id` path param "must match the
authenticated athlete."

## Auth

One credential type:

- **oauth2** (`Authorization: Bearer <accessToken>`) — a Strava API application (client
  credentials live on the w6w server). Authorize at `https://www.strava.com/oauth/authorize`;
  exchange **and refresh** both go through `https://www.strava.com/oauth/token`, distinguished
  only by `grant_type` — Strava has no separate refresh host. Scopes are sent
  comma-separated (Strava documents comma **or** space; this app and n8n's Strava node both
  use comma). PKCE is not documented as supported, so it is left off.

**Refresh is not an afterthought here.** Strava's access tokens are genuinely short-lived —
**6 hours** (`expires_in: 21600`) — so a host that treats this as a "connect once" OAuth
credential will see actions fail a few hours after every connect. There is no long-lived
alternative token type. Refresh tokens also **rotate on every use**: each refresh response
carries a new `refresh_token`, and the previous one stops working immediately. The generic
host-side refresh flow (store whatever the token response returns) already satisfies this —
called out here so it is not "fixed" into reusing the old refresh token.

Scopes requested: `profile:read_all`, `activity:read_all`, `activity:write` — exactly what
this app's actions call. `activity:read_all` (rather than the narrower `activity:read`) is
needed so activity reads are not silently filtered to "everyone"-visible activities only, and
`profile:read_all` so `athlete-get` returns full (not summary-only) profile fields.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.strava.com/api/v2/summary.json
```

Verified live 2026-08-01: returns `{ status: { indicator }, components: [...], ... }`, page
name "Strava", components Mobile Applications / Strava.com / API / Upload / AWS / MCP
Connector — the same shape used by Statuspage-hosted vendors elsewhere in this pack.

The check is unsigned (`credential: "none"`) and `status.strava.com` is reachable **only
inside this hook's worker** — deliberately absent from `w6w.network.allow`, so no action can
call it and no credential can ever reach the status host.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself. It probes:

```
GET /athlete
```

The authenticated athlete's profile — the cheapest read this app has, works for any scope
combination that includes at least the implicit base read access every token carries.

### Do we have quota left?

`GET /athlete`, reading the `x-ratelimit-limit` / `x-ratelimit-usage` response headers.
Strava's format is unusual and worth calling out explicitly: each header carries **two**
comma-separated values, the 15-minute window first, then the daily window —
e.g. `X-Ratelimit-Limit: 600,30000` / `X-Ratelimit-Usage: 314,27536`. Verified against
https://developers.strava.com/docs/rate-limits/ (checked 2026-08-01). Default limits are 100
requests/15min + 1,000/day for a non-approved app, higher once Strava approves the
application; "upload" and `POST /activities` calls are excluded from the "non-upload" limit
but still count toward the overall one.

This check reports the two windows as separate components (`15min`, `daily`) rather than
folding them into one number, since either can independently be the one that throttles the
next call.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.strava.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against `developers.strava.com/docs/` and
`status.strava.com`. Status surfaces move; re-check if a probe starts failing for everyone at
once.

## Triggers

Manual-webhook receivers for Strava's push subscriptions. Strava creates a subscription with the
API application's own `client_id` and `client_secret` (not the athlete's access token), so a
connection cannot register one; you register the trigger's callback URL once, by hand.

| Trigger | Mechanism | Vendor event | What the run gets |
|---|---|---|---|
| `activity-created` — Activity Created | webhook (manual) | `object_type=activity`, `aspect_type=create` | The event: activity id, athlete id, event time |
| `activity-updated` — Activity Updated | webhook (manual) | `object_type=activity`, `aspect_type=update` | The event plus `updates` (the changed fields) |
| `activity-deleted` — Activity Deleted | webhook (manual) | `object_type=activity`, `aspect_type=delete` | The event: the deleted activity id |

Setup:

1. Add the trigger to a workflow and set **Verify token** to a long random string you choose.
2. Take the subscription's callback URL and register it with Strava, using the same token:

   ```sh
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=YOUR_CLIENT_ID -F client_secret=YOUR_CLIENT_SECRET \
     -F callback_url=THE_CALLBACK_URL -F verify_token=THE_SAME_TOKEN
   ```

3. Strava sends a `GET` handshake; the trigger answers `{"hub.challenge": "<challenge>"}` only
   when Strava's `hub.verify_token` equals your **Verify token**, and refuses (no reply) when it
   differs or when no token is configured.

A Strava application has at most one push subscription; delete the old one
(`DELETE /push_subscriptions/{id}`) before registering a new URL. Athletes must have authorized
your Strava application for events to be sent for them.

Trust model: Strava documents **no signature** on event deliveries, so the callback URL (it carries
the subscription's unguessable id) is the shared secret — keep it private. The handshake is the only
step gated by the verify token. Optional **Athlete ID** narrows a trigger to one athlete.

Vendor docs: <https://developers.strava.com/docs/webhooks/> (verified 2026-11-09).
