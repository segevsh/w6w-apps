# Demio

List Demio webinar events and sessions, register attendees, and read participant reports.

- **Categories** — video, communication
- **Auth methods** — custom (API key + API secret, sent as `Api-Key` / `Api-Secret` headers)
- **Actions** — 6
- **Egress allowlist** — `my.demio.com`
- **Website** — https://demio.com
- **API docs** — https://publicdemioapi.docs.apiary.io/ (blueprint: https://jsapi.apiary.io/apis/publicdemioapi.apib)

## Verification

Every path, verb, parameter and header was checked on 2026-10-05 against the vendor's Apiary
blueprint, plus live unauthenticated and garbage-credential probes of `my.demio.com/api/v1`
(`/ping` answers 401 `{"pong":false,"messages":["Authorization failed"]}`; an unknown-credential
`/events`, `/event/1` and `PUT /event/register` all answer 401 `{"messages":["Authorization failed"]}`).
The blueprint contains no deprecation notice (grep for `deprecat|depreciat|sunset|will be
removed`: zero hits). The icon is Demio's own favicon from its website CDN, embedded verbatim as
base64 inside `assets/icon.svg`.

## Actions

| Action | Endpoint |
|---|---|
| `ping` | `GET /ping` |
| `event-list` | `GET /events[?type=upcoming\|past\|automated]` |
| `event-get` | `GET /event/{id}[?active=]` |
| `session-get` | `GET /event/{id}/date/{date_id}` |
| `event-register` | `PUT /event/register` |
| `participants-list` | `GET /report/{date_id}/participants[?status=]` |

That is every operation in the public API. Left out on purpose: `GET /ping/query`, the same ping
with `api_key`/`api_secret` in the URL (a credential in a URL lands in access logs; the header
form is used instead).

## Health checks

- `service` — Statuspage `status.demio.com` (page id `02cw9qfm3jdr`, `page.name: "Demio"`, same
  page served from `demio.statuspage.io`). Demio names **no component for the public API**:
  `Webinar Room API` is the in-room service and two components are both called `API` (under
  `Billing/Subscriptions` and `Video Streaming`). The API is served from `my.demio.com`, the
  dashboard's host, so the verdict is the `User Dashboard` component, an inference, hence
  `informational`. The page-level indicator is not used: it rolls in a dozen AWS and mailgun
  components.
- ~~`quota`~~ — declared unavailable: no rate limit, quota endpoint or header is documented or
  observed.
- derived `auth:api-key` — `GET /ping`. `{"pong": true}` is a pass; a body with `pong: false` is a
  rejection (401 `Authorization failed`, 403 `Account is not active`). The body never echoes the
  credential, and validity is classified from the body, not the status code.

## Findings

1. **Two credentials, two headers**, so the auth method is `custom`, not `apiKey`.
2. **The blueprint contradicts itself on the phone field.** The attribute table says
   `phone_number`; the worked example body says `phone`. This app sends `phone_number` (the
   documented attribute). Unconfirmed against a live registration.
3. **Registration needs an event ID or a registration URL**, enforced client-side before any
   request. Custom registration fields go in the `customFields` object and are merged into the
   request body; named fields always win a key clash.
4. **No pagination is documented** on any list endpoint, so none is offered.
5. The blueprint's `automated` property is typed as an array in the attribute table but shown as
   an object (`{ready, duration}`) or `null` in examples; responses are passed through untouched.
