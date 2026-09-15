# AddEvent

Create, search, update and delete calendar events and calendars, manage RSVP attendees and calendar
subscribers, and generate "add to calendar" links, on **AddEvent's Calendar & Events API v2**.

- **Categories** — calendar, productivity
- **Auth methods** — api-key
- **Actions** — 22
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.addevent.com` (the `service` check adds `addevent.statuspage.io` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.addevent.com/
- **API docs** — https://www.addevent.com/c/documentation/calendar-events-api
- **Status page** — https://addevent.statuspage.io/

AddEvent turns a date and a title into a working "add to calendar" link — one that opens correctly in
Google Calendar, Apple Calendar, Outlook, Office 365 and Yahoo without the caller having to know each
vendor's own calendar-link format. Every event this app creates or fetches comes back with
`link_long`/`link_short` URLs ready to hand to a user or drop in an email — that pair is the whole
point of the API.

> **Everything below was verified on 2026-09-15** against AddEvent's own OpenAPI 3.1 document
> (`v2.14.0`) — recovered from the `oasDefinition` embedded in the server-rendered `<script
> id="ssr-props">` payload of its ReadMe-hosted API reference pages
> (`docs.addevent.com/reference/*`), since no static OpenAPI file is published at any URL — plus its
> "Getting started", "Authentication" and "Response codes & errors" reference pages, and live probes
> against `api.addevent.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. The real endpoint-level reference is two redirects and one JS bundle away

`www.addevent.com/documentation` 301s to `www.addevent.com/c/documentation`, whose "Calendar & Events
API" page is prose only — it explicitly disclaims its own request/response examples as illustrative
("use the exact schema shown in the endpoint reference") and links out to
`docs.addevent.com/reference`, a ReadMe.io-hosted, React-rendered API explorer. **That page ships no
OpenAPI file at a stable URL either.** The actual OpenAPI 3.1 schema — every path, parameter, request
body and error shape — only exists inside a `<script id="ssr-props" type="application/x-ssr-props">`
blob that ReadMe's SSR renderer embeds in each reference page's HTML, under the key `oasDefinition`.
Fetching the marketing page and calling it "the docs" gets you field names that are stated, in the
vendor's own words, not to be trusted.

### 2. A 403 is not a bad API key — it is a plan or quota problem

AddEvent's own response-code reference draws a sharp, easy-to-miss line:

| Status | Meaning |
|---|---|
| `401` | No valid API key was provided. Confirmed live: `{"error_id":"...","error_message":"","error_code":900}`. |
| `403` | The key is fine, but "doesn't have the permission to perform the request" — **the account's plan does not include API access at all** (the free Hobby plan is the vendor's own documented example), or a usage limit has been exceeded. |

Treating every 4xx as "bad credential" would tell a Hobby-plan user to re-paste a key that was never
going to work no matter how many times they copy it. `auth/api-key.ts`'s `test` hook and every
action's error formatting (`lib/client.ts`) keep the two apart, and `error_message` is frequently an
empty string even when `error_code` is populated — so the client falls back to the status code's
documented meaning rather than surfacing a blank reason.

### 3. A real status page and its unclaimed decoy sit one DNS label apart

AddEvent's genuine status page is `addevent.statuspage.io` — a real Atlassian Statuspage instance
whose `page.name` is `"AddEvent"` and whose four components (`AddEvent Dashboard`, `AddEvent Website`,
`AddEvent API`, `AddEvent Landing Pages`) are the vendor's own product surfaces, confirmed live via
`GET /api/v2/summary.json`. Sitting right next to it, `addevent.instatus.com` **also answers `200`**
— but its page title is the generic, unclaimed "Instatus – Get ready for downtime" placeholder every
unregistered Instatus subdomain serves. Wiring the health check to the wrong one by pattern-guessing
the vendor's own domain would report a permanently-unclaimed page as "AddEvent is up." `health/
service.ts` also checks the live response's own `page.url` on every call, so a future redirect can't
silently repeat the same mistake.

## What this app covers

The Calendar & Events API v2 (`https://api.addevent.com/calevent/v2`) is REST, JSON in and out, one
object per request (no documented bulk endpoints), and covers:

- **Events** (`event-create`, `event-search`, `event-retrieve`, `event-update`, `event-delete`) — the
  full lifecycle of a calendar event, including its RSVP settings/stats and its public
  `link_long`/`link_short` add-to-calendar URLs.
- **Calendars** (`calendar-create`, `calendar-search`, `calendar-retrieve`, `calendar-update`,
  `calendar-delete`) — the containers events live inside; use several to separate events by customer,
  team or product area.
- **RSVP attendees** (`rsvp-attendee-create`, `rsvp-attendee-search`, `rsvp-attendee-retrieve`,
  `rsvp-attendee-update`, `rsvp-attendee-delete`) — record and manage responses to an RSVP-enabled
  event. Creating one via the API sends **no email at all** by default; set `notify: true` to opt into
  AddEvent's own confirmation and organizer-notification emails.
- **Calendar subscribers** (`calendar-subscriber-search`, `calendar-subscriber-retrieve`,
  `calendar-subscriber-delete`) — read-only plus delete (unsubscribe): subscribers are created by the
  vendor's own subscribe flow, not through this API, so there is no `calendar-subscriber-create`.
- **Templates & timezones** (`rsvp-form-list`, `event-template-list`, `calendar-template-list`,
  `timezone-list`) — lookups feeding the `rsvpFormId`, `landingPageTemplateId`,
  `embeddableCalendarTemplateId` and `timezone` fields elsewhere in this app. `timezone-list` is the
  one action that needs no Connection at all (`requiresAuth: false`) — AddEvent's OpenAPI document
  overrides `GET /timezones`'s security with `security: [{}]`, confirmed live to answer `200` with no
  `Authorization` header.

Every search endpoint answers `200` with an empty array for zero matches — AddEvent's own docs call
this out explicitly, and it is never treated as an error here.

## Auth

**API key** (`auth/api-key.ts`), sent as `Authorization: Bearer <apiKey>` — the entire authentication
story; AddEvent publishes no OAuth surface. The key is found on the account settings page and is
account-wide: there is no documented concept of a scoped key, unlike some other vendors in this pack.

The credential probe is `GET /calendars?page_size=1` — chosen over the tempting `GET /timezones`
(the one endpoint needing no credential at all, which would pass a Connection whose key never reached
the request) because it requires a credential, is not scoped to any one resource, and its response
carries nothing secret: just the account's own calendar objects.

## Health

- **`service`** (`kind: "service"`) — component status from `addevent.statuspage.io`, unsigned,
  scoped to the app (not per-connection). See finding #3 above for why this is the real page.
- **`quota`** (`kind: "quota"`) — a **declared absence**, `severity: "informational"`. Checked against
  the full OpenAPI document plus the "Getting started" and "Response codes & errors" pages: AddEvent
  states no rate-limit ceiling, no metered quota, and no `X-RateLimit-*` response header anywhere.
  `page_size`'s documented max of 20 is a pagination cap, not usage metering.
- **`auth:api-key`** — derived automatically from the Auth method's `test` hook.

## Development

```bash
deno task validate   # manifest + sandbox rules (@w6w/validator via _tools/audit.ts)
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt         # format — always via this task, never a bare `deno fmt`
deno task test        # unit tests (87 cases across every action, auth and health check)
```
