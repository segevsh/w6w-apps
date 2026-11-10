# HubSpot

Work with HubSpot CRM: contacts, companies, deals, tickets, engagements, lists, owners
and forms.

- **Categories** — crm, marketing
- **Auth methods** — private-app-token, oauth2, api-key
- **Actions** — 42
- **Triggers** — 23 (webhook + poll)
- **Egress allowlist** — `api.hubapi.com`, `api.hsforms.com`
- **Website** — https://www.hubspot.com
- **API docs** — https://developers.hubspot.com/docs/api/overview

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.hubspot.com>

```
GET https://status.hubspot.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 3 auth methods probe:

```
GET /account-info/v3/details
```

Portal id, time zone and data-hosting region. Cheap, and — unlike a CRM object read — it
needs no object scope, so it works for a narrowly-scoped private app.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`X-HubSpot-RateLimit-Daily` / `-Daily-Remaining` / `-Secondly` / `-Secondly-Remaining`
response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:private-app-token` | credential | connection | signed | fatal | — | derived from the `private-app-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.hubspot.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

## Triggers

Two kinds: **webhook** triggers that HubSpot calls (instant, set up once in HubSpot), and **poll**
triggers that ask HubSpot every few minutes through the same search and list actions this app
already has (nothing to set up).

| Key | Type | HubSpot event or source action | The run gets |
|---|---|---|---|
| `contact-created` | webhook | `contact.creation` | the contact id, account id and change source |
| `contact-updated` | webhook | `contact.propertyChange` | the contact id, the property name and its new value |
| `contact-deleted` | webhook | `contact.deletion` | the id of the deleted contact |
| `company-created` / `company-updated` / `company-deleted` | webhook | `company.creation` / `company.propertyChange` / `company.deletion` | the company id (and the property and new value for updates) |
| `deal-created` / `deal-updated` / `deal-deleted` | webhook | `deal.creation` / `deal.propertyChange` / `deal.deletion` | the deal id (and the property and new value for updates) |
| `ticket-created` / `ticket-updated` / `ticket-deleted` | webhook | `ticket.creation` / `ticket.propertyChange` / `ticket.deletion` | the ticket id (and the property and new value for updates) |
| `any-event` | webhook | any notification the app is subscribed to, narrowed by the `events` param | event type, object id and the raw notification |
| `new-contact` | poll | `search-contacts`, `createdate DESCENDING` | the new contact |
| `new-company` | poll | `search-companies`, `createdate DESCENDING` | the new company |
| `new-deal` | poll | `search-deals`, `createdate DESCENDING` | the new deal |
| `new-ticket` | poll | `search-tickets`, `createdate DESCENDING` | the new ticket |
| `new-or-updated-contact` | poll | `search-contacts`, `lastmodifieddate DESCENDING` | a contact created or edited since the last check |
| `new-or-updated-company` | poll | `search-companies`, `hs_lastmodifieddate DESCENDING` | a company created or edited |
| `new-or-updated-deal` | poll | `search-deals`, `hs_lastmodifieddate DESCENDING` | a deal created or edited |
| `new-or-updated-ticket` | poll | `search-tickets`, `hs_lastmodifieddate DESCENDING` | a ticket created or edited |
| `new-form` | poll (snapshot) | `list-forms` | a marketing form added to the account |
| `new-owner` | poll (snapshot) | `list-owners` | an owner (portal user) added to the account |

Each poll trigger sends the same request as its action, with one sort rule (CRM search takes one
per request) and a page of 100. `list-contacts`, `list-companies`, `list-deals` and `list-tickets`
return the same records as the search triggers, so those four are covered by `new-contact`,
`new-company`, `new-deal` and `new-ticket`. Forms and owners are small configuration collections:
each check walks every page (up to 2000 rows, and fails loudly beyond that) and reports rows that
were not there before. The edit triggers identify a record by its id plus its `updatedAt`, so an
edit is a new event. The first check of every poll trigger records what already exists and emits
nothing.

Not covered: `list-lists` calls the v1 contacts lists API (`/contacts/v1/lists`), which HubSpot
sunset on 2026-04-30 and which no longer answers
(https://developers.hubspot.com/docs/api-reference/legacy/crm/lists/v1-list-api-migration-guide),
so no trigger can be built on it.

### Setup for the webhook triggers (manual)

HubSpot webhooks belong to a HubSpot **app**, and an app has **one** Target URL, so one trigger
receives that app's notifications (use `any-event` with its `events` filter to take several event
types in one workflow, or one HubSpot app per named trigger). A connection cannot create the
subscription for you, so:

1. Create the trigger and copy its callback URL.
2. In HubSpot open the app that will send events: for an existing legacy private app,
   **Development, Legacy apps**, the app, its **Webhooks** tab, **Edit webhooks**
   (https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/create-and-edit-webhook-subscriptions-in-private-apps);
   for a public app, its **Webhooks** page
   (https://developers.hubspot.com/docs/apps/legacy-apps/public-apps/create-generic-webhook-subscriptions).
   HubSpot stopped letting new legacy private apps be created on 2026-10-26, so an account without
   one needs a public app.
3. Paste the callback URL as the **Target URL**, exactly as w6w shows it (HubSpot signs it).
4. **Create subscription** for the objects and events you want, for example Contacts, Created, then
   **Commit changes**.
5. Paste the app's **client secret** (private app: its Auth tab, Show secret) into the trigger's
   `signingSecret` param.

HubSpot posts a batch of up to 100 notifications per request; each becomes one run. A property
change arrives as one notification per changed property; `contact-updated` and the other update
triggers take a `properties` param to keep only some. HubSpot does not guarantee a notification is
sent once, so every event carries `eventId` and `attemptNumber`.

**Trust model.** Every delivery is verified before it is read. When `X-HubSpot-Signature-v3` is
present it is the only proof accepted: it must equal the base64 HMAC-SHA256, under the client
secret, of the HTTP method, the Target URL, the exact raw body and `X-HubSpot-Request-Timestamp`,
and the timestamp must be within five minutes. When it is absent the delivery must carry
`X-HubSpot-Signature` with `X-HubSpot-Signature-Version: v1`, which is the hex SHA-256 of the
client secret followed by the raw body. v1 has no timestamp, so it cannot reject a replay.
Any other signature version is refused, as is a missing or empty
secret, a missing signature and a missing raw body. Nothing is accepted unsigned.

Sources (verified 2026-11-10):
https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide (event types, payload),
https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests (v1 and v3 signatures),
https://developers.hubspot.com/docs/api-reference/legacy/crm/search-the-crm (search sorting and properties).

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
