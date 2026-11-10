# Mautic

Manage Mautic contacts, segments, companies, campaigns and email sends.

- **Categories** — marketing, email, crm
- **Auth methods** — client-credentials (OAuth2 Client Credentials grant)
- **Actions** — 28
- **Triggers** — 18 (14 webhook, 4 poll)
- **Egress allowlist** — `*` (self-hosted — see below)
- **Website** — https://www.mautic.org
- **API docs** — https://developer.mautic.org (redirects to
  https://devdocs.mautic.org/en/7.1/) — `rest_api/getting_started.html`,
  `authentication.html`, `contacts.html`, `segments.html`, `companies.html`,
  `campaigns.html`, `emails.html`, `tags.html`, `users.html`; read 2026-08-30.

## Setup

### API Credentials (Client Credentials grant)

1. Mautic → **Settings → API Credentials → New**, grant type **Client
   Credentials**. Give it a recognisable name — every action it takes is
   attributed to that name in Mautic's own audit trail, e.g. "Contact was
   identified by Mautibot test [1]".
2. Paste the **Client ID** and **Client Secret** into the connection, along
   with your **Instance URL**.
3. The REST API must be turned on first, under **Configuration → API
   Settings** (or `'api_enabled' => 1` in `config/local.php`) — a
   freshly-installed instance answers every action with a 404 until this is
   done, which reads like a wrong URL rather than a disabled setting.

### Why Client Credentials, and not the other two ways in

Mautic's docs describe two authentication methods: **Basic Authentication**
(a real Mautic user's own username and password, off by default until an
admin flips `api_enable_basic_auth`) and **OAuth2**, which itself supports
three grants. This app implements only **Client Credentials**:

- Mautic's own words: Client Credentials "suits Machine-to-Machine (M2M)
  communications such as Cron jobs", while the Authorization Code flow "is
  best if you want Users to log in with their own Mautic accounts". An
  unattended workflow is the former — Authorization Code needs a browser
  login and does not fit a scheduled or background run.
- Client Credentials is independently revocable and auditable (delete the API
  Credential in Settings, done) — the same property this pack looks for
  before trusting a credential, e.g. Gitea's personal access token or
  Mattermost's bot token. Basic Auth is a real user's actual password:
  revoking it means changing that user's password, not deleting one
  credential.
- Mautic's client-credentials token response carries **no `refresh_token`**
  (confirmed against the documented response shape — only `access_token`,
  `expires_in`, `token_type`, `scope`). There is nothing to trade in when the
  token expires, so this app's `refresh` hook simply re-runs the same
  `client_credentials` grant — which is also Mautic's own recommended
  fallback once a refresh token lapses elsewhere.

### Why the allowlist is `*`

Mautic is self-hosted open-source software — some organisations buy a hosted
edition from a partner, but there is no single fixed `api.mautic.*` host the
way there is for a SaaS vendor. So the base URL is a connection field and the
egress allowlist has to be open, the same posture this pack already uses for
`gitea`, `mattermost`, `ghost`, `grafana` and `jenkins`.

## Actions

| Key | Type | Description |
|---|---|---|
| `contact-get` | read | A single contact by ID |
| `contact-list` | read | Contacts, filtered by a Mautic search command |
| `contact-create` | perform | Create a contact |
| `contact-edit` | perform | Update a contact's fields (`PATCH`, fails if missing) |
| `contact-delete` | perform | Permanently delete a contact |
| `contact-points-add` | perform | Increase a contact's lead score |
| `contact-points-subtract` | perform | Decrease a contact's lead score |
| `contact-dnc-add` | perform | Suppress a contact on a channel |
| `contact-dnc-remove` | perform | Re-enable a channel for a contact |
| `segment-list` | read | Segments (envelope key is `lists` — see below) |
| `segment-get` | read | A single segment, including its filters |
| `segment-create` | perform | Create a segment |
| `segment-contact-add` | perform | Manually add a contact to a segment |
| `segment-contact-remove` | perform | Remove a contact from a segment |
| `company-list` | read | Companies, filtered by a Mautic search command |
| `company-get` | read | A single company |
| `company-create` | perform | Create a company |
| `company-contact-add` | perform | Associate a contact with a company |
| `company-contact-remove` | perform | Disassociate a contact from a company |
| `campaign-list` | read | Campaigns |
| `campaign-get` | read | A single campaign, including its events |
| `campaign-contact-add` | perform | Manually add a contact to a campaign |
| `campaign-contact-remove` | perform | Manually remove a contact from a campaign |
| `email-list` | read | Emails (segment and template/transactional types) |
| `email-send-to-contact` | perform | Send a specific email to one contact, now |
| `email-send-to-segment` | perform | Send an email to its assigned (or given) segments |
| `tag-list` | read | Every tag defined on the instance |
| `user-get-self` | read | The profile of the user this connection runs as |

## Four things that go wrong quietly

### 1. The segment list envelope key is `lists`, not `segments`

Mautic still calls the underlying entity a "list" internally even though
every current surface — including the docs page's own title — calls it a
Segment. `GET /segments` answers `{"total", "lists": {...}}`; reading
`body.segments` gets you `undefined` rather than an error. `segment-list`
handles this so a workflow author never has to know it.

### 2. Company field aliases are all prefixed `company*`

A Contact takes bare `firstname`/`email`; a Company takes
`companyname`/`companyemail`. Mixing the two conventions up is a **silent
no-op**, not a validation error — Mautic accepts an unknown field alias on
create and just ignores it. `company-create` only exposes the `company*`
aliases for this reason.

### 3. `PATCH` vs `PUT` on every `.../edit` route change more than the status code

`PUT` creates the record if the ID doesn't exist **and clears every field the
request omits**; `PATCH` fails on a missing ID and only touches the fields
sent. `contact-edit` uses `PATCH` deliberately — an "edit" action that could
silently blank untouched fields, or silently create a new contact under a
typo'd ID, is a surprise this app should not deal a workflow.

### 4. There is no unauthenticated version or health endpoint

Unlike Gitea's `GET /version`, nothing in Mautic's REST API documentation
answers without a Connection. `health/instance.ts` instead reads Mautic's own
documented behaviour for an **unsigned** request: a structured JSON auth-error
body (`{"error":{"message":"…","code":401}}`) proves the instance is up and
its REST API is enabled, without needing (or sending) this connection's own
credential. See that file for the reasoning, including the disclosure that no
public Mautic instance was reachable to confirm the envelope on the wire while
building this app — the shape is taken from the documentation's own example.

## Smaller sharp edges

- **Labels are ids when writing to a Contact, tags are names everywhere.**
  Unlike some sibling apps, Mautic's tags are always referred to by name —
  `contact-edit`'s `tags` field takes `vip,-cold` to add `vip` and remove
  `cold` in the same call, the exact syntax the docs specify.
- **`Add Points`/`Subtract Points` are deltas, not a `Set Score` operation.**
  Calling `contact-points-add` twice adds the amount twice; there is no
  idempotency key Mautic accepts for this endpoint.
- **`email-send-to-segment`'s `segmentIds` only changes who this call
  targets** — it does not change which segments the email is assigned to in
  Mautic's own UI.
- **A contact's `id` is the only identifier its endpoints take** — there is
  no separate "number" the way Gitea distinguishes an issue's number from its
  internal id.

## Triggers

| Key — title | Mechanism | Vendor event | What the run gets |
| --- | --- | --- | --- |
| `new-contact` — New Contact | webhook (API-registered) | `mautic.lead_post_save_new` | The new contact |
| `contact-updated` — Contact Updated | webhook (API-registered) | `mautic.lead_post_save_update` | The contact after the update |
| `contact-deleted` — Contact Deleted | webhook (API-registered) | `mautic.lead_post_delete` | The id of the deleted contact |
| `form-submitted` — Form Submitted | webhook (API-registered) | `mautic.form_on_submit` | The submission (form, contact, submitted values) |
| `company-saved` — Company Created or Updated | webhook (API-registered) | `mautic.company_post_save` | The company after the save |
| `company-deleted` — Company Deleted | webhook (API-registered) | `mautic.company_post_delete` | The id of the deleted company |
| `contact-points-changed` — Contact Points Changed | webhook (API-registered) | `mautic.lead_points_change` | The contact and the old/new points |
| `contact-channel-subscription-changed` — Contact Channel Subscription Changed | webhook (API-registered) | `mautic.lead_channel_subscription_changed` | The contact, the channel, the old/new status |
| `contact-company-changed` — Contact Company Changed | webhook (API-registered) | `mautic.lead_company_change` | The contact, the company, and whether it was added |
| `email-sent` — Email Sent | webhook (API-registered) | `mautic.email_on_send` | The email, the contact, subject and sent HTML |
| `email-opened` — Email Opened | webhook (API-registered) | `mautic.email_on_open` | The email and the contact (opens are unreliable: proxies and bots load the pixel) |
| `sms-sent` — Text Message Sent | webhook (API-registered) | `mautic.sms_on_send` | The SMS id, the contact and the content |
| `page-hit` — Page Hit | webhook (API-registered) | `mautic.page_on_hit` | The page visit |
| `any-event` — Any Event | webhook (API-registered) | the event types you list in `events` (empty = all 13 in the catalog) | One run per payload: event type, time, record id, payload |
| `new-campaign` — New Campaign | poll (5 min) | `GET /api/campaigns` (`campaign-list`), snapshot of ids | The campaign |
| `new-segment` — New Segment | poll (5 min) | `GET /api/segments` (`segment-list`), snapshot of ids | The segment |
| `new-email` — New Email | poll (5 min) | `GET /api/emails` (`email-list`), snapshot of ids | The email |
| `new-tag` — New Tag | poll (5 min) | `GET /api/tags` (`tag-list`), snapshot of ids | The tag |

**Setup.** None by hand, but the Mautic API user needs the Webhooks permissions. Subscribing
generates a random 64-character secret and calls `POST /api/hooks/new` (`name`, `webhookUrl`,
`secret`, `triggers`, `isPublished`); a retried subscribe first looks up `GET /api/hooks?search=<name>`
and deletes a webhook already pointing at its callback URL. Unsubscribing calls
`DELETE /api/hooks/{id}/delete` (one Mautic no longer has counts as deleted). If Mautic is set to
queue webhook events, one delivery can carry several payloads (and several event types); the
trigger emits one run per payload of its own event type. `any-event` registers one webhook for all the event types you list (Mautic's `triggers` field takes a list).

**Trust model.** Mautic signs every webhook, and the trigger never accepts an unsigned
delivery. Each delivery is checked, before anything is parsed, against the `Webhook-Signature`
header = base64(HMAC-SHA256(secret, raw request body)). The check uses the exact bytes Mautic
sent and a constant-time compare. The scheme has no timestamp or nonce, so a captured delivery stays
verifiable indefinitely (there is no replay protection). A
missing header, an unset secret or a body that was not delivered raw refuses the delivery; the
host stores one failed row and starts no run. The secret is kept in the subscription state, which
the host stores unsealed.

Sources (verified 2026-11-10): https://devdocs.mautic.org/en/7.1/rest_api/webhooks.html ,
https://devdocs.mautic.org/en/7.1/webhooks/getting_started.html ,
https://devdocs.mautic.org/en/7.1/webhooks/events/index.html ,
https://devdocs.mautic.org/en/7.1/rest_api/{campaigns,segments,emails,tags}.html (the four polls)

Not covered as their own triggers: `contact-list` (its records arrive through `new-contact`, `contact-updated`) and `company-list` (through `company-saved`). Campaigns, segments and tags have no webhook event in Mautic's catalog, hence the polls; the polls read the whole list every check and refuse more than 5000 rows.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** server reachable, and does it look like Mautic's REST API? |
| `service` | service | Declared unavailable — the question does not apply |

`instance` sends an **unsigned** `GET /api/contacts?limit=1` and reads the
response body rather than the status code: a structured Mautic error envelope
proves the instance is alive and its API is enabled, and is treated as a
`pass` — not a failure — because the point of this check is reachability, not
credential validity (that is the derived `auth:client-credentials` check).

`service` is a **declared absence**. Mautic is self-hosted software, so there
is no vendor running the instance a connection points at. The project's own
`status.mautic.org` is not used for this — verified 2026-08-30 via its own
`/api/v2/summary.json`, its components are the project's website and
community infrastructure (Confluence, GitHub, Slack, Auth0, Cloudflare,
DigitalOcean) plus its own web presence, not any self-hosted instance's
application server. A same-named `mautic.statuspage.io` also exists and is
the unclaimed Statuspage decoy — its components are still the default
template names, "API (example)" and "Management Portal (example)".

## What this app deliberately does not do

- **The campaign builder itself** — creating or editing a campaign's event
  graph (email sends, conditions, actions) is a visual-editor surface, not a
  handful of REST calls a workflow step should reconstruct.
- **Forms, landing pages, dynamic content, focus items and themes.** Each is
  its own authoring surface.
- **Reports, stats and dashboard widget data.** Analytics reads, not the
  daily loop of running contacts through campaigns.
- **Plugin/integration configuration, webhooks, and Mautic's own user
  management.** Administrative surfaces, out of scope the same way Gitea's
  admin/mirrors/wikis are.

A detail worth naming precisely: **Basic Authentication is a documented
Mautic auth method this app does not implement**, on purpose — see "Why
Client Credentials" above. If an instance has no API Credential support (very
old Mautic versions) this app cannot connect to it; that is a real gap, not
one this app works around by falling back to a user's password.

## Errors

Mautic's two documented envelopes are both handled: a system error is
`{"error":{"message":"…","code":403}}`, and an OAuth failure is
`{"error":"invalid_grant","error_description":"…"}`. `lib/client.ts`'s
`errorMessage()` reads either shape and falls back to the raw response body
when neither matches — a Mautic instance behind a misconfigured reverse proxy
can answer with an HTML error page instead of JSON, and that text is still
surfaced rather than swallowed as "undefined".
