# HighLevel

Work with HighLevel (GoHighLevel) CRM: contacts, opportunities, pipelines, calendars,
appointments, conversations and location (sub-account) metadata.

- **Categories** — crm, marketing
- **Auth methods** — oauth2
- **Actions** — 18
- **Triggers** — 22 (17 webhook, 5 poll)
- **Egress allowlist** — `services.leadconnectorhq.com`
- **Website** — https://www.gohighlevel.com
- **API docs** — https://marketplace.gohighlevel.com/docs/

## Triggers

Webhook triggers (manual, signed, instant) — one per event users build on, plus an Any-event trigger:

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `contact-created` — New Contact | webhook (manual, signed) | `ContactCreate` | location id, contact id, full contact payload |
| `contact-updated` — Contact Updated | webhook (manual, signed) | `ContactUpdate` | location id, contact id, full contact payload |
| `contact-deleted` — Contact Deleted | webhook (manual, signed) | `ContactDelete` | location id, id of the deleted contact, its payload |
| `contact-tag-updated` — Contact Tags Changed | webhook (manual, signed) | `ContactTagUpdate` | location id, contact id, payload with the current tags |
| `opportunity-created` — New Opportunity | webhook (manual, signed) | `OpportunityCreate` | location id, opportunity id, contact id, full payload |
| `opportunity-updated` — Opportunity Updated | webhook (manual, signed) | `OpportunityUpdate` | location id, opportunity id, contact id, full payload |
| `opportunity-deleted` — Opportunity Deleted | webhook (manual, signed) | `OpportunityDelete` | location id, id of the deleted opportunity, its payload |
| `opportunity-stage-changed` — Opportunity Stage Changed | webhook (manual, signed) | `OpportunityStageUpdate` | location id, opportunity id, payload with the new stage |
| `opportunity-status-changed` — Opportunity Status Changed | webhook (manual, signed) | `OpportunityStatusUpdate` | location id, opportunity id, payload with the new status |
| `appointment-created` — New Appointment | webhook (manual, signed) | `AppointmentCreate` | location id, appointment id, contact id, full payload |
| `appointment-updated` — Appointment Updated | webhook (manual, signed) | `AppointmentUpdate` | location id, appointment id, contact id, full payload |
| `appointment-deleted` — Appointment Deleted | webhook (manual, signed) | `AppointmentDelete` | location id, id of the deleted appointment, its payload |
| `inbound-message` — New Inbound Message | webhook (manual, signed) | `InboundMessage` | location, conversation, contact and message ids, full payload |
| `outbound-message` — New Outbound Message | webhook (manual, signed) | `OutboundMessage` | location, conversation, contact and message ids, full payload |
| `location-created` — New Location | webhook (manual, signed) | `LocationCreate` | the location id, agency (company) id, name, email |
| `location-updated` — Location Updated | webhook (manual, signed) | `LocationUpdate` | the location id, agency (company) id, name, email |
| `any-event` — Any Event | webhook (manual, signed) | any event type, narrowed by the `events` param | event type, location id, record / contact / conversation ids where present, full payload |

Poll triggers (no Marketplace setup, checked every 5 minutes):

| Trigger | Mechanism | Wrapped list action | The run gets |
|---|---|---|---|
| `new-opportunity` — New Opportunity (polling) | poll, newest first (`order=added_desc`, 100 per page) | `list-opportunities` | each opportunity added since the last check; optional pipeline filter |
| `conversation-active` — Conversation Became Active | poll, most recently active first (`sort=desc&sortBy=last_message_date`, 20 per page) | `list-conversations` | a conversation the first time it appears among the most recently active ones |
| `new-pipeline` — New Pipeline | poll, snapshot of the location's pipelines (one unpaged response) | `list-pipelines` | each pipeline created since the last check |
| `new-calendar` — New Calendar | poll, snapshot of the location's calendars (one unpaged response, drafts included) | `list-calendars` | each calendar created since the last check; optional calendar-group filter |
| `new-form` — New Form | poll, snapshot of the location's forms (`skip`/`limit` pages of 50, at most 2000 forms) | `list-forms` | each form created since the last check |

`conversation-active` has no activity timestamp to compare (HighLevel's documented conversation fields carry none), so it reports a conversation once, the first time it shows up among the 20 most recently active: a brand-new conversation, or an older one that gets a message after being quiet. Use the message triggers for every message.

**Setup (manual webhook).** HighLevel webhooks are set on the Marketplace app, not through the API. Create the trigger, copy its webhook URL, then in the HighLevel Marketplace app's **Advanced Settings → Webhooks**, turn on the event named in the table and paste the URL beside it. There is nothing to paste into the trigger: the signature is checked against HighLevel's published public key. A URL pasted beside several events still works: an event of another type is acknowledged without a run, so give each named trigger its own URL beside its own event. For events with no named trigger (tasks, notes, invoices, products, users, associations, custom objects and the rest of the catalog) use `any-event`: turn the events on beside its URL and list the ones that should start a run in its **Events** param (comma-separated, e.g. `TaskCreate,NoteCreate`), or leave it empty for every event delivered to that URL. HighLevel retries a non-2xx answer up to 12 times.

**Trust model.** HighLevel signs the exact request body with an Ed25519 private key and sends the base64 signature in `X-GHL-Signature`; the trigger verifies it with HighLevel's documented public key (`crypto.subtle`, Ed25519) before it parses anything, and refuses a delivery whose signature is missing, wrong, malformed or whose raw body is unavailable. There is no shared secret, so there is no secret param. The legacy RSA header `X-WH-Signature` was documented as deprecated on 2026-09-01 and is not accepted. HighLevel documents no timestamp in the signed text, so there is no freshness window: keep the URL private. The `events` filter of `any-event` runs only after the signature has verified.

**Not covered as polls.** `list-contacts` (new contacts come from `contact-created`; the deprecated `GET /contacts/` has no sort or since filter), `list-appointments` (a time-window query with no created filter; `appointment-created` delivers new appointments) and `list-locations` (agency-level; `location-created` delivers new locations) are served by the webhook triggers named; `list-custom-fields` returns field definitions (reference data), not records.

Docs (verified 2026-11-10): https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html (signature headers, public keys, event list), the event pages such as https://marketplace.gohighlevel.com/docs/webhook/ContactCreate/index.html, https://marketplace.gohighlevel.com/docs/ghl/opportunities/search-opportunity (`order`, `limit`), https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation (`sort`, `sortBy`), https://marketplace.gohighlevel.com/docs/ghl/forms/get-forms (`skip`, `limit` max 50), https://marketplace.gohighlevel.com/docs/ghl/opportunities/get-pipelines and https://marketplace.gohighlevel.com/docs/ghl/calendars/get-calendars

## Auth: location scope

HighLevel is multi-tenant per "location" (its term for a sub-account) the same way a
QuickBooks Connection carries a `realmId` or a Xero Connection carries a `tenantId` —
except HighLevel returns the id directly on the OAuth token response rather than
requiring a follow-up discovery call: exchanging the authorization code for a token
also returns `locationId` (and, for an Agency-level install, `companyId`) as top-level
fields alongside `access_token`.

`auth/oauth2.ts`'s `afterConnect` hook lifts `locationId`/`companyId` off the credential
onto the Connection's `display`, plus a friendly label from:

```
GET https://services.leadconnectorhq.com/locations/{locationId}
```

`lib/client.ts`'s `locationIdFromConnection()` reads it back. Because the query-param
(and, on writes, JSON-body) key that carries the location id varies per HighLevel
resource — `locationId` almost everywhere, but `location_id` (snake_case) on
`GET /opportunities/search` — each action threads it onto the request itself rather
than the shared client doing it silently; `list-opportunities.ts` documents the
snake_case exception at the call site.

This app only supports a **Location-scoped** install (`user_type: Location`, what
HighLevel's "choose location" screen produces when an installer picks a single
sub-account). An **Agency-scoped** install additionally needs the
`POST /oauth/locationToken` exchange to mint a per-location token before any of these
actions would work; that flow is not implemented here.

`sign` stamps one header on every outbound request:

```
Authorization: Bearer <access token>
```

Access tokens are valid for 1 day; refresh tokens rotate on use and are valid for a
year (or until first refreshed) — the standard OAuth 2.0 `refresh_token` grant against
the same token endpoint, handled by the host's built-in default refresh handler (the
same choice HubSpot, Xero, Jira and Salesforce make in this pack). Whether HighLevel's
authorize endpoint supports PKCE isn't documented publicly, so `pkce` is left unset
rather than guessed at.

### `Version` header

Every request must carry a dated `Version` header naming an API revision. Most
resources (contacts, opportunities, locations, custom fields, forms) pin
`2021-07-28`; **Calendars and Conversations were versioned separately and still pin
the older `2021-04-15`** — passing the wrong one 400s. `lib/client.ts` defaults to
`2021-07-28` and exports `CALENDAR_API_VERSION` for the actions that need the older
one (`list-calendars`, `list-appointments`, `create-appointment`, `send-message`,
`list-conversations`).

### Scopes

Narrowed to exactly what this app's actions touch:

| Scope | Covers |
|---|---|
| `contacts.readonly` / `contacts.write` | Contact CRUD, tags |
| `opportunities.readonly` / `opportunities.write` | Opportunities, pipelines |
| `calendars.readonly` | List calendars |
| `calendars/events.readonly` / `calendars/events.write` | List/create calendar events (appointments) |
| `conversations.readonly` | List/search conversations |
| `conversations/message.write` | Send a message |
| `locations.readonly` | Get/list locations |
| `locations/customFields.readonly` | List custom fields |
| `forms.readonly` | List forms |

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.gohighlevel.com>, a Better Stack ("Better
Uptime") page, not an Atlassian Statuspage instance. A Statuspage-compatible JSON API
does exist at `gohighlevel.statuspage.io`, but its two components are both literally
named `"(example)"` — an unused demo page, not what HighLevel actually operates.
`status.gohighlevel.com` is the one linked from HighLevel's own site and support docs.

```
GET https://status.gohighlevel.com/feed.atom
```

Declared as a `feed` rather than fetched by the check itself — the host fetches and
parses it, folding successive updates to one entry per incident (`latest`), before
handing it to `health/service.ts`. The feed carries no severity/indicator field (unlike
Statuspage), so the mapping is a title heuristic: HighLevel publishes a paired
`"<X> went down"` / `"<X> recovered"` entry per monitored component (sharing one id, so
`latest` already resolves the pair to whichever happened last), plus free-form incident
narratives whose description says so once resolved. The whole-platform monitor
(`"gohighlevel.com went down"`) maps to `down`; every other open entry (a named
feature — Social Planner, Voice AI, Forms, …) maps to `degraded`, since the feed gives
no way to tell a partial disruption from a full outage of that one feature.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself.

```
GET /locations/{locationId}
```

Cheap, and needs no object scope beyond `locations.readonly` (already required for
`afterConnect`'s display label), so it works even for an app not granted contacts or
opportunities access.

### Do we have quota left?

`X-RateLimit-Limit-Daily` / `-Daily-Remaining` (daily allowance) and
`X-RateLimit-Max` / `-Remaining` (a 10-second burst window), read off the same
`GET /locations/{locationId}` probe the credential check uses. Per HighLevel's docs,
these are metered per app (client) per resource (Location or Company): burst is 100
requests / 10s, daily is 200,000 requests / day.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` (feed) |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.gohighlevel.com` (for `service`) is reachable only inside that check's
own worker via the declared `feed` — not from any action, and not from the other
checks.

---

Researched and endpoint-verified 2026-08-02 against HighLevel's published OpenAPI spec
(`github.com/GoHighLevel/highlevel-api-docs`) and developer docs. Status surfaces move;
re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for
everyone at once.
