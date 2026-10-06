# SavvyCal

Scheduling links: list, create, update, duplicate, toggle and delete links; read open time slots;
book and cancel events; manage webhooks; read SavvyCal workflows. App id `io.w6w.savvycal`, API
`https://api.savvycal.com/v1` (the "SavvyCal Meetings" API).

## Source of truth

Every path, verb, query parameter, body field and enum was taken on 2026-10-06 from the OpenAPI
operation data that renders `developers.savvycal.com` (22 operations). There is one current API
(`/v1`, "Meetings Platform"); no deprecation, sunset or end-of-life notice appears in the reference.
An unsigned `GET /v1/me` answers `401` `text/plain` `Unauthenticated` (15 bytes), which matches.

## Auth

| Method | Use |
| --- | --- |
| `personal-access-token` | `Authorization: Bearer pt_secret_…`, made in Settings > Developers. Acts as you. |
| `oauth2` | Authorization code: `https://savvycal.com/oauth/authorize`, `https://savvycal.com/oauth/token`. Access tokens last 2 hours; refresh token renews. No scopes or PKCE documented. |

Both are probed with `GET /v1/me`, classified from the **body**: a JSON profile with a string `id`
is a pass; `Unauthenticated` (or any 401) is a rejection; a `200` of any other shape is not a pass,
and a 5xx is reported by status rather than as a bad credential. `/me` returns the profile (name,
email, plan), never the token, so it is safe to store. `afterConnect` keeps only `email` and `id`.

## Actions (21)

Events: `event-list`, `event-get`, `event-create`, `event-cancel`.
Links: `link-list`, `link-get`, `link-create` (personal scope, or `/scopes/{slug}/links` when a scope
slug is given), `link-update`, `link-delete`, `link-duplicate`, `link-toggle`, `link-slots-get`.
Account: `user-get`, `time-zone-list`, `time-zone-get`.
Webhooks: `webhook-list`, `webhook-get`, `webhook-create`, `webhook-delete`.
Workflows: `workflow-list`, `workflow-rules-list`.

List actions are cursor-paginated (`limit` 1-100, default 20; `after` / `before` from
`metadata`) and return `{entries, metadata}`. Endpoints that return a bare array (slots, time
zones, workflow rules) are returned under `slots`, `timeZones`, `rules`.

## Things that cost a day

1. **Errors are plain text.** A bad credential is `401 Unauthenticated` as `text/plain`, not JSON.
   The client formats errors from the raw text.
2. **Webhook objects carry their signing `secret` on every read.** `webhook-list`, `-get` and
   `-delete` strip it; `webhook-create` keeps it because that is the one place it is handed over for
   the receiver. Signature header: `x-savvycal-signature: sha256=<HEX HMAC-SHA256 of the raw body>`.
3. **`event-create` only accepts a real slot.** `start_at` / `end_at` must match an available slot of
   the link; read them with `link-slots-get` first (a multi-duration link returns several slots per
   start time). Conferencing details (Zoom) may be attached to the event after creation.
4. `GET /v1/events` defaults to `state=confirmed`, `period=upcoming`, `attendance=attending`:
   a cancelled, past, or someone else's event is invisible unless you widen the filter.

## Health checks

- **`service`** (unsigned, app scope): `savvycal.instatus.com`, an Instatus page linked from
  savvycal.com (`summary.json` identifies itself as `SavvyCal`). Instatus is not Statuspage: no
  `status.indicator`; component statuses are `OPERATIONAL`/`UNDERMAINTENANCE`/`DEGRADEDPERFORMANCE`/
  `PARTIALOUTAGE`/`MAJOROUTAGE`. The verdict follows the `App` component; calendar-connection and
  integration components are reported but do not move it. `status.savvycal.com` does not resolve and
  `savvycal.betteruptime.com` is a generic Better Stack page, so neither is used. The host is declared on
  the check only, not in `network.allow`.
- **`quota`**: declared unavailable, `informational`. The reference documents no rate limit, no
  headers and no usage endpoint.
- Credential liveness is the derived `auth:*` check from `Auth.test`.

## Not covered

The reference exposes no endpoints for availability rules, calendars, teams/scopes management,
polls, attendees, rescheduling an event, or link settings beyond name/description/private name/type,
so none exist here. Webhook event delivery (`event.created`, `event.canceled`, …) is received by a
host endpoint and is not an Action.

## Icon

`assets/icon.svg` embeds SavvyCal's real mark: the 180x180 PNG at
`https://savvycal.com/apple-touch-icon.png` (2,224 bytes), as a base64 data URI in an SVG wrapper.

## Development

```
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
