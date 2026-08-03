# Constant Contact

Manage Constant Contact contacts, contact lists, custom fields, and email campaigns through the
V3 API.

- **Categories** — marketing, email
- **Auth methods** — oauth2 (authorization code + refresh)
- **Actions** — 22
- **Egress allowlist** — `api.cc.email`

## Which Constant Contact API this targets — and what "V2 is retired" actually means

This app is built **exclusively against the V3 API**, `https://api.cc.email/v3`. Every path,
query parameter, request body and enumerated value in it was read out of Constant Contact's own
OpenAPI document (`AppConnect V3`, `info.version` 3.0.172) rather than recalled.

The common claim that "the V2 API is retired" is **half true, and the half that is false
matters**. Verified 2026-08-03:

| Claim | Status |
|---|---|
| New V2 API keys can be created | **False** — key creation was retired in April 2025, along with the `constantcontact.mashery.com` portal. |
| The V2 API is switched off | **Not established.** `GET https://api.constantcontact.com/v2/account/info` still answers `401 {"error_key":"unauthorized"}` — a live endpoint refusing an anonymous caller, not a `410 Gone`. |
| A V2 sunset date has been published | **No date found** on the developer portal or in Constant Contact's own community announcement. |
| The V2 developer portal is gone | **No** — `v2.developer.constantcontact.com` still serves, carrying the banner "Creating new v2 API keys is no longer supported." |

So the accurate statement is: **V2 is closed to new integrations and V3 is the only option for
anything built today, but V2 has not been decommissioned.** Nothing in this package touches it.

The two hosts are also easy to confuse and share nothing:

| | V3 — **what this app uses** | V2 |
|---|---|---|
| Base URL | `https://api.cc.email/v3` | `https://api.constantcontact.com/v2` |
| Auth | OAuth2 bearer JWT from `authz.constantcontact.com` | `api_key` + `access_token` query params |
| Docs | <https://developer.constantcontact.com> | <https://v2.developer.constantcontact.com> |

**The docs domain has not moved.** `v3.developer.constantcontact.com` and
`developer.constantcontact.com` both answer 200 and serve **byte-identical** content (same MD5,
6,923 bytes) — the `v3.` host is an alias, not a relocation. The unprefixed domain is the
canonical one and is what this app's links use.

## Auth

One method: **OAuth 2.0, Authorization Code grant**. There is no API-key mode — V3 accepts a
bearer JWT minted by Constant Contact's authorization server and nothing else. (The `x-api-key`
scheme that appears in the vendor's OpenAPI document belongs to the Technology Partner surface,
not to a normal integration.)

| | |
|---|---|
| Authorize | `GET https://authz.constantcontact.com/oauth2/default/v1/authorize` |
| Token | `POST https://authz.constantcontact.com/oauth2/default/v1/token` |
| PKCE | Not used — a w6w host is a confidential client and holds the secret server-side |
| Access token life | 86,400 s (24 h) |
| Refresh token life | 180 days if never used; rotated on every exchange |

Both endpoints were called for real on 2026-08-03: the authorize URL answers `302`, and a bare
`POST` to the token URL answers a well-formed Okta error (`E0000021`). The older
`idfed.constantcontact.com/as/token.oauth2` host that some third-party integrations still
hardcode **does not respond at all** — connection timeout. If a connection fails at the token
step, check that first.

Scopes requested:

| Scope | Why |
|---|---|
| `contact_data` | contacts, lists, custom fields, bulk activities |
| `campaign_data` | email campaigns and campaign activities |
| `account_read` | `GET /account/summary` |
| `offline_access` | **required** or no refresh token is issued at all |

`account_update` and `billing_data` are deliberately **not** requested — no action here writes
account settings or reads billing, and asking for access the app never uses is a needless ask on
the consent screen.

Register the application on Constant Contact's developer portal (My Applications), then register
its client id / secret / redirect URI on this w6w installation.

### Liveness probe

`test` probes `GET /contacts?limit=1`, **not** `/account/summary`. A whoami reads like the
natural choice, but `/account/summary` needs `account_read` — the one scope in this app's set a
credential can legitimately be missing while every contact and campaign action still works.
Probing it would report a perfectly good connection as broken.

`401` and `403` are reported differently: `401` is a dead or malformed token, `403` is a live
token whose grant is too narrow to include `contact_data`.

## Actions

### Contacts

| Action | Endpoint |
|---|---|
| `list-contacts` | `GET /contacts` |
| `get-contact` | `GET /contacts/{contact_id}` |
| `create-contact` | `POST /contacts` |
| `update-contact` | `PUT /contacts/{contact_id}` |
| `create-or-update-contact` | `POST /contacts/sign_up_form` |
| `delete-contact` | `DELETE /contacts/{contact_id}` |
| `unsubscribe-contact` | `GET` then `PUT /contacts/{contact_id}` |

### Contact lists

| Action | Endpoint |
|---|---|
| `list-contact-lists` | `GET /contact_lists` |
| `get-contact-list` | `GET /contact_lists/{list_id}` |
| `create-contact-list` | `POST /contact_lists` |
| `update-contact-list` | `PUT /contact_lists/{list_id}` |
| `delete-contact-list` | `DELETE /contact_lists/{list_id}` (async, 202) |
| `add-contacts-to-lists` | `POST /activities/add_list_memberships` (async, 201) |
| `remove-contacts-from-lists` | `POST /activities/remove_list_memberships` (async, 201) |

### Custom fields, campaigns, activities, account

| Action | Endpoint |
|---|---|
| `list-custom-fields` | `GET /contact_custom_fields` |
| `list-email-campaigns` | `GET /emails` |
| `get-email-campaign` | `GET /emails/{campaign_id}` |
| `create-email-campaign` | `POST /emails` |
| `get-campaign-activity` | `GET /emails/activities/{campaign_activity_id}` |
| `import-contacts` | `POST /activities/contacts_json_import` (async, 201) |
| `get-activity-status` | `GET /activities/{activity_id}` |
| `get-account-summary` | `GET /account/summary` |

### Three create/update endpoints, and which to use

This is the part of the V3 API that most often gets used wrongly. All three exist, and they are
not interchangeable:

| | `create-contact` | `update-contact` | `create-or-update-contact` |
|---|---|---|---|
| Endpoint | `POST /contacts` | `PUT /contacts/{id}` | `POST /contacts/sign_up_form` |
| On an existing email | `409 Conflict` | n/a (addressed by id) | `200`, partial update |
| Omitted top-level field | not set | **overwritten with null** | left alone |
| Omitted sub-resource | not set | left alone | left alone |
| Supplied `list_memberships` | set | **replaces** the array | **appends** to the array |

`update-contact` is a genuine full replace — the vendor's wording is "any properties left blank
or not included in the request are overwritten with null value". Use it only when you hold the
whole record. For everything else, `create-or-update-contact` is the safe default.

### Unsubscribe is not delete, and neither is "remove from list"

Three different operations that all stop email arriving, with three different consequences:

- **`delete-contact`** — the contact stops receiving email and stops counting toward the billable
  active-contact total. **Reversible**: a `PUT` with `update_source: "Account"` revives them.
- **`unsubscribe-contact`** — consent is withdrawn. **The account cannot undo this.** Only the
  contact can resubscribe, by confirming a resubscribe email (`PUT /contacts/resubscribe/{id}`),
  and Constant Contact permits exactly one such email per contact.
- **`remove-contacts-from-lists`** — membership only. The contact still exists, still has their
  permission, and still receives campaigns sent to other lists they are on.

There is no dedicated unsubscribe endpoint on V3 for a normal integration
(`/partner/accounts/{id}/contacts/unsubscribe` is a Technology Partner surface for managing
*client accounts*). The documented way is a plain `PUT` with
`email_address.permission_to_send: "unsubscribed"` — but because that PUT nulls every omitted
top-level property, doing it naively unsubscribes the contact *and* wipes their name, job title,
company and dates. `unsubscribe-contact` therefore reads the contact first and echoes the scalars
back. Sub-resources are neither fetched nor echoed, since the API leaves an omitted sub-resource
untouched.

### Asynchronous actions

Four actions return an `activity_id` instead of a result — `import-contacts`,
`add-contacts-to-lists`, `remove-contacts-from-lists` and `delete-contact-list`. Their `201` /
`202` means **queued**, not done. Poll `get-activity-status` until `state` reaches `completed`,
`cancelled`, `failed` or `timed_out`. A `completed` activity can still carry per-row failures in
`activity_errors`, so read both.

### Pagination

Every collection pages with an **opaque cursor**, surfaced as a relative link rather than a bare
token:

```json
{ "contacts": [ … ], "_links": { "next": { "href": "/v3/contacts?limit=50&cursor=bGltaXQ9…" } } }
```

`lib/client.ts` extracts the `cursor` query parameter from that `href` and every list action
returns it as `next_cursor`, so a caller passes one plain string back rather than parsing a URL.
The absence of `_links.next` is how the API says "last page" — there is no total-pages counter.

### Bulk-import vocabulary

`import-contacts` rows are **not** contact resources. The import format is its own flat
vocabulary — `email`, `first_name`, `phone` / `home_phone` / `work_phone`, `street` / `city` /
`state` / `zip` / `country` and their `home_`, `work_`, `other_` variants, `sms_number` — and a
custom field is set with a `cf:` prefix on the field's *name*, e.g. `"cf:membership_level":
"gold"`. Rows are passed through verbatim; no key translation happens, because inventing a
mapping would hide exactly the differences a caller needs to see.

One consent consequence worth reading twice: importing a **new** contact this way sets
`permission_to_send` to `implicit` and `opt_in_source` to `Account` automatically. There is no
way to import somebody as `explicit`.

## Health checks

### `service` — Constant Contact platform status

A `service` check against the Statuspage-format summary at
`https://status.constantcontact.com/api/v2/summary.json`.

**The endpoint was verified genuine rather than assumed**, because a Statuspage URL shape is easy
to fake with an HTML catch-all. On 2026-08-03:

- `GET /api/v2/summary.json` → `200`, `application/json`, 8,244 bytes, real `page.id`
  `g83kktkx21mx`, 24 components;
- `GET /api/v2/bogus-not-real.json` → `404`, zero bytes.

A catch-all would have answered both identically. It does not.

`summary.json` rather than `status.json` because the component breakdown is worth more here than
the rollup: Constant Contact tracks **"API's and Integrations"** as a component distinct from
"Email Delivery", "Contact Management" and the rest of the marketing suite. An outage of the
campaign editor is not an outage of this app, and the rollup indicator cannot tell the two apart.

Two implementation notes:

- `status.constantcontact.com` is **not** on the app's egress allowlist. The check widens egress
  for its own hook only, which the spec permits precisely because the posture is unsigned.
- Several component names on this page are duplicated across groups ("Email Campaigns" appears
  twice). Duplicates fold to their **worst** state, not last-wins — an outage must not be
  overwritten by a healthy namesake.

A failing status page reports `unknown`, never `down`: a status page that itself breaks tells us
nothing about the vendor.

### `quota` — declared `unavailable`, and why

Constant Contact publishes hard allowances in prose — **4 requests per second** and **10,000
requests per day** per API key, the daily counter resetting at 00:00:00 UTC — but publishes no
way to read how much of that is left.

Verified two ways on 2026-08-03:

1. The vendor's V3 OpenAPI document declares **no response headers anywhere** — no `RateLimit-*`,
   no `X-RateLimit-*`, no `Retry-After`. Its 429 responses carry a `description` and nothing else.
2. The Rate Limits guide documents the 429 by its **body** only:
   `{"error_key": "quota_exceeded", "error_message": "Limit Exceeded"}` for the daily cap and
   `{"error_key": "throttled", "error_message": "Too Many Requests"}` for the per-second one. It
   mentions no header, in either case.

So there is nothing live to read, and reporting "9,999 of 10,000 remaining" from the published
constant would be inventing a number — the allowance is per *API key*, and any other integration
sharing that key spends from the same budget invisibly.

Nor is there an account-level substitute. `/v3/contacts/counts` returns contact *consent* counts,
not a plan entitlement; the `/v3/billing/*` paths are declared with empty bodies in the vendor's
own document (no operations, no schemas); and `/v3/partner/accounts/{id}/plan` belongs to the
Technology Partner surface and is unreachable with a normal integration's token.

The entry carries `severity: "informational"` deliberately: an `unavailable` check always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity a declared absence
would pin every verdict at `unknown` forever.

### `auth:oauth2` — derived

Comes free: the runtime derives a credential check from the Auth `test` hook.

## Scope notes — what is deliberately absent

- **Scheduling and sending.** `POST /emails/activities/{id}/schedules` exists and works, but
  scheduling a campaign is the irreversible step in this API. It is left out of the first cut
  rather than shipped with thinner verification than everything else here.
- **Tags, segments, events, social posts, reporting.** All real V3 surfaces, all out of scope for
  a contacts-and-campaigns app.
- **`create-custom-field`.** `POST /contact_custom_fields` exists; defining a custom field is a
  schema/admin operation rather than a workflow one, and `list-custom-fields` is what a workflow
  actually needs (to resolve a `custom_field_id`).
- **The Technology Partner surface.** `/v3/partner/*` needs a different authorizer entirely.

## Links

Every URL below was fetched and returned 200 on 2026-08-03.

- **Developer portal (canonical)** — <https://developer.constantcontact.com>
- **Developer portal (alias, identical content)** — <https://v3.developer.constantcontact.com>
- **API reference** — <https://developer.constantcontact.com/api_reference/index.html>
- **OpenAPI document (the source used here)** —
  <https://developer.constantcontact.com/api_reference/bundledWithSamples.yaml>
- **OAuth2 overview** — <https://developer.constantcontact.com/api_guide/auth_overview.html>
- **Authorization Code flow** — <https://developer.constantcontact.com/api_guide/server_flow.html>
- **Scopes** — <https://developer.constantcontact.com/api_guide/scopes.html>
- **Rate limits** — <https://developer.constantcontact.com/api_guide/rate_limits.html>
- **V2 portal (legacy, still serving)** — <https://v2.developer.constantcontact.com>
- **Status page** — <https://status.constantcontact.com>
- **GitHub org** — <https://github.com/constantcontact>

The marketing site, `https://www.constantcontact.com`, is **not** listed above because it could
not be verified: it answers `403` to every non-browser client, apex and `www` alike, with or
without browser headers. It is presumably fine in a browser, but this file only lists URLs that
were actually confirmed reachable.

Icon: Constant Contact's own "ripple" mark, `ctct_nav_logo.svg`, fetched verbatim from the
vendor's CDN (`https://imgssl.constantcontact.com/ui/images1/ctct_nav_logo.svg`). One line is
changed: the mark ships white-on-transparent for a coloured nav bar, so the `.st1` fill is set to
`#1856ED` — the exact blue the vendor uses for the same mark in its own favicon, read out of
`static.ctctcdn.com/ui/images1/favicon/REBRAND_favicon.png`. Geometry and the `#FF9E1A` accent are
untouched.

---

Researched and endpoint-verified against Constant Contact's live V3 OpenAPI document and
developer-portal guides on 2026-08-03. Every path, parameter, request body, response envelope and
enumerated value in this app was read out of those sources rather than recalled; the OAuth
endpoints, the status endpoints and the V2 host were called for real. Status surfaces move;
re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
