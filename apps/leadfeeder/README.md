# Leadfeeder (Dealfront)

Identify the companies visiting your website, search and match companies and contacts, and manage
lists and tags through the **current** Leadfeeder API (`https://api.leadfeeder.com/v1/*`).

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
  `meta.credits.charged`; they spend the account's credit balance.
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
