# Leadfeeder (Dealfront)

Identify the companies visiting your website, search and match companies and contacts, and manage
lists and tags through the **current** Leadfeeder API (`https://api.leadfeeder.com/v1/*`).

- **Triggers** — 7 (poll)
- Reference: the vendor's OpenAPI document, <https://api.leadfeeder.com/openapi.yaml> (linked from
  <https://docs.leadfeeder.com/api/public>). Every path, parameter and body below was read from it
  on 2026-10-06.
- Auth: personal API key in the `X-Api-Key` header (Leadfeeder > Settings > Personal > API keys).
- Status: <https://status.leadfeeder.com> (Statuspage); the `Leadfeeder API` component decides the
  `service` health check.

## Which API this is (decision)

`docs.leadfeeder.com/api/` is the **legacy** API (`Authorization: Token token=…`, `/accounts/{id}/leads`,
rate limit 100/min). Its own page says "This documentation is available for maintaining existing
integrations only" and "New API tokens are not issued for the legacy API", and points to
`docs.leadfeeder.com/api/public`. The vendor rebranded to Dealfront, but the host is still
`api.leadfeeder.com`. This app is built only against the new API; the legacy one is not modelled,
so an old legacy token will not work here.

## Actions (24)

| Area | Actions |
| --- | --- |
| Account | List Accounts (one account returns its credit balance), Get Current User, Get API Usage |
| Companies | Get Company, Search Companies, Match Companies, Get Company Financials, Enrich IP Address |
| Contacts | Get Contact, Search Contacts |
| Website visits | Search Web Visits, List Visitor Companies, List Custom Feeds |
| Campaigns | List Campaigns |
| Lists | List Lists, Get List, Create List, Delete List, List Items In List, Add Company To Lists, Add Contact To Lists |
| Tags | List Tags, Create Tag, Assign Tags To Company |

Every action except List Accounts / Get Current User takes the required `accountId`; List Accounts
supplies the ids. Each returns `{ data, meta }` from the vendor, plus `nextCursor` (cursor-paged
searches) or `nextPage` (page-numbered lists) when more results exist.

## Things to know

- **Credits.** Search Companies, Search Contacts, Match Companies and Get Company Financials report
  `meta.credits.charged`; the vendor states that searches themselves do not consume credits (only deep-data retrieval does).
- **Errors** are `errors[0].code` bodies (`invalid_api_key`, `missing_token`, `quota_exceeded`,
  `entity_not_found`, `insufficient_entitlements`…). The 401 family also repeats a singular
  `error` object. The credential check reads the code, not the status.
- **Pagination** differs per route: `page[num]`/`page[size]` (lists, tags, campaigns, web visits)
  versus `page[cursor]`/`page[size]` (searches, list items). Page size is capped at 100.
- Search/match filters are accepted as arrays or comma-separated text; structured filters
  (`industries`, `locations`, `filters`) are JSON.
- The vendor marks its OpenAPI as work in progress ("the `summary` field contains information on
  the implementation status"), so some documented routes may not be live for every plan.

## Health checks

- `service` — the `Leadfeeder API` component (id `t9x0v3jzvfkt`) of the Statuspage at
  `status.leadfeeder.com/api/v2/summary.json`; other components cap at `degraded`.
- `api` — unsigned `GET /v1/users/me`; a schema-correct `missing_token` 401 is a pass.
- `quota` — declared absence: credits need an `account_id` and the API documents no rate-limit
  headers.
- The `auth:*` check is derived from the credential `test` (`GET /v1/users/me`, which returns the
  key owner's email, never the key).

## Not covered

Documented but deliberately left out: OAuth2 connection (this app is API-key only), company
enrichment jobs, find-contact-data jobs and their estimates, batch add/remove list and tag jobs,
company/contact update (PATCH, custom-field values), removal from lists and tags, company
signals, company IP listing, company and contact list-membership lookups, buyer personas, ICPs,
custom fields, custom-feed create/update/delete, campaign update and stats, geo suggestions,
countries, industries, the tracker script, and cookie-consent / data-processing settings.
No legacy-API route is implemented.

## Icon

`assets/icon.svg` is the vendor's own mark, byte-for-byte from
<https://www.leadfeeder.com/favicon.svg> (1,234 bytes, md5 `2bc5eb1a309c50b09d65234d2e23e6cd`).
Format with `deno task fmt`, never bare `deno fmt`.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

## Triggers

| Key | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-visitor-company` | poll | `visitor-company-list` | Each company that newly shows up as a website visitor (yesterday to today) |
| `new-campaign` | poll (snapshot) | `campaign-list` | Each advertising campaign newly created in the chosen account |
| `new-custom-feed` | poll (snapshot) | `custom-feed-list` | Each custom feed newly created in the chosen account |
| `new-tag` | poll (snapshot) | `tag-list` | Each company tag newly created in the chosen account |
| `new-list` | poll (snapshot) | `list-list` | Each company or contact list newly created in the chosen account (`scope` param) |
| `new-list-item` | poll (snapshot) | `list-items` | Each company or contact newly added to the chosen list (`listId` param) |
| `new-web-visit` | poll (since-filter) | `web-visit-search` | Each individual website visit in the chosen account |

`GET /v1/web-visits/companies` takes a required date range and, with no `sort[...]` parameter, "the companies that visited most recently come first" (vendor OpenAPI, `getWebVisitsCompanies`). The trigger requests yesterday-to-today, 100 per page, and emits a company id it has not seen in its last 200; a company that returns after leaving that memory fires again.

Campaigns, custom feeds, tags, lists and one list's items are small account collections with no sort or since filter in the OpenAPI document, so each check reads all of them through the matching list action (following `nextPage` / `nextCursor`, at most 5000 rows) and emits only ids it has not seen before; the first check records what exists without firing.

`new-web-visit` polls `POST /v1/web-visits` (vendor OpenAPI, `searchWebVisits`), which requires an inclusive `start_date`/`end_date` and documents no sort order. The first check stores a floor and reads nothing; later checks request the UTC day of (last check minus 2 minutes) through today, drain extra pages across checks, drop any visit whose `attributes.started_at` is before the floor, and dedupe on `id` + `started_at`.

Not covered: `account-list` (the accounts the key can reach: account administration, not a record feed), `company-search` (requires user-supplied search criteria — "At least one search criterion must be provided" in the vendor OpenAPI — so there is no criteria-free feed to poll) and `contact-search` (searches the vendor-wide contact database by caller-chosen terms, persona or location only, so it is a user query rather than a record feed).

Polling only: nothing is registered with the vendor and no extra credential is needed. Vendor API documentation: https://api.leadfeeder.com/openapi.yaml (verified 2026-11-10).
