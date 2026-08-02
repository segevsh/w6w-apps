# HighLevel

Work with HighLevel (GoHighLevel) CRM: contacts, opportunities, pipelines, calendars,
appointments, conversations and location (sub-account) metadata.

- **Categories** — crm, marketing
- **Auth methods** — oauth2
- **Actions** — 18
- **Egress allowlist** — `services.leadconnectorhq.com`
- **Website** — https://www.gohighlevel.com
- **API docs** — https://marketplace.gohighlevel.com/docs/

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
