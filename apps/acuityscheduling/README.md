# Acuity Scheduling

Book, read, cancel and reschedule Acuity Scheduling appointments; list appointment types,
calendars and clients; check availability.

- **Categories** — calendar
- **Auth methods** — basic, oauth2
- **Actions** — 9
- **Triggers** — 3 (webhook)
- **Egress allowlist** — `acuityscheduling.com`
- **Website** — https://acuityscheduling.com
- **API docs** — https://developers.acuityscheduling.com

## Actions

Acuity identifies every object by a plain numeric ID (no absolute URIs, unlike Calendly), so
every action just takes the ID directly.

| Key | Resource | Endpoint |
|---|---|---|
| `appointment-get-many` | appointment | `GET /appointments` |
| `appointment-get` | appointment | `GET /appointments/{id}` |
| `appointment-create` | appointment | `POST /appointments` |
| `appointment-cancel` | appointment | `PUT /appointments/{id}/cancel` |
| `appointment-reschedule` | appointment | `PUT /appointments/{id}/reschedule` |
| `appointment-type-get-many` | appointment-type | `GET /appointment-types` |
| `calendar-get-many` | calendar | `GET /calendars` |
| `client-get-many` | client | `GET /clients` |
| `availability-time-get-many` | availability | `GET /availability/times` |

Not modelled: the `field:id` dynamic custom-intake-form filter on `GET /appointments` (its key
name is per-account, not a fixed field this app can declare statically), and the
`/appointments/{id}/payments` sub-resource. Both are additive follow-ups, not omissions with
silent data loss.

## Auth

Two methods, both verified 2026-08-01 against the official docs
(developers.acuityscheduling.com) and cross-checked against n8n's
`AcuitySchedulingApi.credentials.ts` / `AcuitySchedulingOAuth2Api.credentials.ts`:

- **`basic`** (recommended, matches Acuity's own default) — HTTP Basic Auth with the account's
  numeric **User ID** as the username and its **API Key** as the password. Both are found at
  Business Settings → Integrations → API
  (`secure.acuityscheduling.com/app.php?action=settings&key=api`).
- **`oauth2`** — the "public integrator" path (one Acuity OAuth app, many end users).
  - Authorization URL: `https://acuityscheduling.com/oauth2/authorize`
  - Token URL: `https://acuityscheduling.com/oauth2/token`
  - Scope: `api-v1` (Acuity has no finer-grained scopes)
  - PKCE and refresh tokens are not documented, so neither is declared.

## Triggers

| trigger — title | mechanism | vendor event | what the run gets |
|---|---|---|---|
| `appointment-scheduled` — Appointment Scheduled | webhook (API-registered) | `appointment.scheduled` | the full appointment |
| `appointment-rescheduled` — Appointment Rescheduled | webhook (API-registered) | `appointment.rescheduled` | the appointment at its new time |
| `appointment-canceled` — Appointment Canceled | webhook (API-registered) | `appointment.canceled` | the canceled appointment |

### Setup

Subscribing needs your **API Key** (Business Settings > Integrations > API) as the trigger's secret
param: Acuity signs deliveries with the account's API key and the connection does not expose it to a
trigger. The trigger runs `POST /webhooks` (`event`, `target`); Acuity allows at most 25 webhooks per
account and the target must be on port 443 or 80. Unsubscribing runs `DELETE /webhooks/{id}` (already
gone counts as deleted). The delivery is form-encoded (`action`, `id`, `calendarID`,
`appointmentTypeID`); each run fetches the appointment with `GET /appointments/{id}`.

### Trust model

Every delivery's `X-Acuity-Signature` header (base64 HMAC-SHA256 of the exact form-encoded request
body, keyed by the API key) is verified before the body is parsed. A missing or wrong signature, an
absent raw body or an unset API key refuses the delivery. The signature carries no timestamp, so there
is no replay window.

Docs (verified 2026-11-09): https://developers.acuityscheduling.com/docs/webhooks, https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second is
something the app itself performs on every workflow run (via `Auth.test`); the others are
declared checks.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.acuityscheduling.com/api/v2/summary.json
```

One request carries both the rollup `indicator` (`none` / `minor` / `major` / `critical`) and
the per-component breakdown. Verified live 2026-08-01.

The status host is reachable **only inside this hook's worker** — it is not in
`w6w.network.allow`, so no action can call it. The spec permits the widening precisely because
the check is unsigned (`credential: "none"`): a signed request must never reach a third-party
status host.

### Is this credential live?

This is what each Auth method's `test` hook does — the app's own health check, and the only one
of the three it performs itself. Both methods probe:

```
GET /me
```

Cheap, always available, and doubles as the source for `afterConnect`'s connection label
(`{{user.name}} ({{user.email}})`).

### Do we have quota left?

**Declared absence.** Acuity's official API reference documents no headroom endpoint and no
`x-ratelimit-*` / `RateLimit-*` response headers on any endpoint checked. Throttling exists but
is undocumented, so headroom has to be budgeted from observed failures rather than read. The
`quota` check is declared `unavailable` (reporting `unknown`, `severity: informational`) rather
than omitted, so a host can tell "we cannot know" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | `health/quota.ts` (declared `unavailable`) |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the Basic auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the OAuth auth method's `test` hook |

The host `status.acuityscheduling.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

## Icon

Copied verbatim from n8n's `AcuityScheduling` node
(`packages/nodes-base/nodes/AcuityScheduling/acuityScheduling.png`, 1024×1024 PNG) — no official
standalone SVG mark was found, so no vector was fabricated.

---

Researched and endpoint-verified 2026-08-01 by fetching the live official docs
(developers.acuityscheduling.com) for every endpoint listed above, plus a live check of the
Statuspage `summary.json` probe. Re-verify if a probe starts failing for everyone at once.
