# KlickTipp

Manage KlickTipp contacts, tags, data fields and opt-in processes, and sign contacts in
through a Listbuilding API key.

- **Categories** — email, marketing
- **Auth methods** — `session` (username + password), `listbuilding-key` (Listbuilding API key)
- **Actions** — 25
- **Egress allowlist** — `api.klicktipp.com`
- **Website** — https://www.klicktipp.com
- **API docs** — https://developers.klicktipp.com (OpenAPI: `_bundle/management-api.yaml`,
  `_bundle/listbuilding-api.yaml`; guides for authentication, error handling and the
  Listbuilding API). All fetched 2026-10-06. The German handbook older integrations cite is gone.

## Setup

API access needs a KlickTipp **Premium** plan or higher.

**Management actions — `session` connection.** Create a dedicated API user rather than using the
main account: My Account → Settings → User Account → Sub-Accounts → Create Sub-Account, role
**API User**. Its username is `mainaccount-subaccountname`. Enter that username and its password.
Connecting calls `POST /account/login` and stores the session (`Cookie: <session_name>=<sessid>`);
a lapsed session is replaced by logging in again, and disconnecting calls `/account/logout`.

**Listbuilding actions — `listbuilding-key` connection.** Listbuilding → New Listbuilding → Entry
via API key. The key is permanently bound to one opt-in process and one tag, and travels as
`apikey` in the JSON body.

The runtime cannot bind an action to one auth method, so the pairing is on you: a Management
action on a Listbuilding connection answers 403 `API access denied`, and a `listbuilding-*`
action on a session connection answers error 100 (invalid API key).

## Actions

| Key | Type | Description |
|---|---|---|
| `field-get` | read | Return the ID and name (and optionally type) of one data field. |
| `field-list` | read | List the key and name (and optionally type) of every contact data field. |
| `listbuilding-signin` | perform | Add or update a contact through a Listbuilding API key, applying the key's tag and opt-in process. Needs a Listbuilding API Key connection. |
| `listbuilding-signoff` | perform | Unsubscribe a contact through a Listbuilding API key so it receives no further communication. Needs a Listbuilding API Key connection. |
| `listbuilding-signout` | perform | Remove the key's tag from a contact through a Listbuilding API key. Needs a Listbuilding API Key connection. |
| `optin-get` | read | Return the complete configuration of one opt-in process. |
| `optin-list` | read | List the ID and name of every opt-in process. The unnamed entry is the default double opt-in. |
| `optin-redirect` | read | Look up the redirect URL of an opt-in process for a given contact email. |
| `subscriber-bulk-get` | read | Return the complete records of up to 200 contacts by ID in one call. |
| `subscriber-changed` | read | List the IDs of contacts changed since a Unix timestamp, one cursor page at a time. |
| `subscriber-delete` | perform | Permanently delete a contact by contact ID or contact key. |
| `subscriber-get` | read | Return the complete record of one contact by contact ID or contact key. |
| `subscriber-list` | read | List contact IDs, filtered by subscription and bounce status, one cursor page at a time. |
| `subscriber-search` | search | Return the contact ID for an email address. |
| `subscriber-tag` | perform | Add one or more manual tags to a contact, which can start automations. |
| `subscriber-tagged` | search | Return the contacts carrying a tag, with the time each got it. |
| `subscriber-unsubscribe` | perform | Unsubscribe a contact by email so it receives no further communication. |
| `subscriber-untag` | perform | Remove a manual tag from a contact. |
| `subscriber-update` | perform | Change a contact's email, SMS number or data fields. |
| `subscriber-upsert` | perform | Add a contact, or update the one with the same email. Triggers the opt-in process, which may email the contact. |
| `tag-create` | perform | Create a manual tag. |
| `tag-delete` | perform | Delete a manual tag and remove it from every contact. Smart tags cannot be deleted. |
| `tag-get` | read | Return the name and description of a tag, manual or smart, by ID. |
| `tag-list` | read | List the ID and name of every manual tag. Smart tags are not listed. |
| `tag-update` | perform | Rename a manual tag or change its description. Smart tags cannot be updated. |

All 21 documented paths are covered: the 16 non-auth Management paths carry 22 actions,
`/account/login` and `/account/logout` are the session auth's connect/disconnect, and the three
Listbuilding paths are the three `listbuilding-*` actions.

## Not covered

- **Developer Key + Customer Key** (`X-Un` + `X-Ci` headers). The guide calls it the recommended
  method for partner integrations, but says `X-Ci` is "a Base64-encoded cipher generated from
  Developer Key + Customer Key" as defined by the official PHP connector, and publishes no
  construction of it. It cannot be written or unit-tested from the docs, so it is left out.
- **Managed OAuth 2.0.** Client credentials cannot be created in the KlickTipp UI (support issues
  them to selected partners), so there is nothing a user could enter.
- Webhooks/event subscriptions (a guide exists, no OpenAPI paths) and SMS-specific endpoints
  (none are published beyond the `smsnumber` field).

## Things that behave unexpectedly

- **Errors are decided by the body.** Business rejections are HTTP 406 with
  `{"error": <code>, "error_message": <German text>}`; the app maps the numeric code to English from
  the vendor's published table. Auth/permission failures are 400/401/403 with a bare array of
  strings. A successful write is `[true]`, a create is `[<id>]` — anything else is treated as a
  failure whatever the status said.
- **A dead session and a missing plan look the same:** both are 403 `["API access denied."]`.
- **`GET /subscriber` without `limit` returns every contact ID in one flat array.** The
  `subscriber-list` action always sends a limit (default 100, max 500) so it paginates.
- **`POST /subscriber/tagged` marks `status` and `bounceStatus` required** in the schema although the
  prose gives defaults; the action sends the documented defaults explicitly.
- **Dates are Unix-second strings**, not formatted dates; data-field values are stringified.
- Contacts can be addressed by numeric ID or alphanumeric contact key on the single-contact routes,
  but only by numeric ID in the bulk route.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service | Statuspage-v2-shaped feed at **https://klicktipp-status.com/api/v2/summary.json** (`status.klicktipp.com` 301s there, so the true host is declared). `page.name` is "KlickTipp", page id `01K9VN704VAA3GSBB0GMM66GNE`, both checked on every run. The page has an `API` component and a `Login` component; the verdict is the worse of the two, because the page-level indicator also rolls in Website, Landingpages, Support and others that do not affect API calls. If `API` ever disappears the check falls back to the indicator and says so. |
| `api` | dependency | Unsigned `GET /tag`. The documented 403 `["API access denied."]` shape proves the API answered, so it is a pass; 5xx, a transport failure, or any other body is `down`; 429 is `degraded`. Sends no credential. |
| `auth:session` | derived | `test` hook: `GET /field` with the session cookie; a JSON object is live. `/field` is bounded and does not echo the credential (unlike `/tag`, which can be huge). |
| `auth:listbuilding-key` | derived | `test` hook: `POST /subscriber/signin` with the key and no email. Measured 2026-10-06 with a bogus key: error 100 comes back even with no fields, so the key is checked first. A documented missing-contact error (32, 5 or 7) is read as "the key got past the check". **The valid-key branch is inferred from the vendor's error table, not observed — no live key was available.** |

No quota check: the vendor documents HTTP 429 but no rate-limit headers or usage endpoint.

## Unverified without a live account

The session lifetime is not documented, so `refresh` is simply "log in again". Whether
`/account/login` tolerates a stale session cookie being present on the request was not testable.
Login failure (401 `["Wrong username or password."]`) was observed live; a successful login was
taken from the OpenAPI example.

## Icon

`assets/icon.svg` is the vendor's own mark, saved verbatim (4,211 bytes, md5
`c8eb70852bdc166247c272fdb0816a64`) from the developer portal:
https://developers.klicktipp.com/assets/klicktipp.c3f8114c33a76db3eaaef29c5d3baea243313b864d8f3e856a0f7af2cb88866e.9c1bb791.svg
A unit test pins its size and hash. Format with `deno task fmt`, never bare `deno fmt`.
