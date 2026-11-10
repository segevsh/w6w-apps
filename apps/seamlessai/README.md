# Seamless.AI

B2B contact and company data: search the Seamless.AI database, research (enrich) the records you pick,
and manage the lists, campaigns, tasks and saved searches around them. 45 actions over the public API
**v2** (`https://api.seamless.ai/api/client/v2`).

- **Triggers** — 11 (poll)

Every path, verb, parameter, body field and enum was read on 2026-10-06 from the vendor's own OpenAPI
documents — `docs.seamless.ai/openapi.json` (v1) and the v2 document its reference pages are rendered
from — and probed live against `api.seamless.ai` (a missing key answers `401 {"msg":"Unauthorized"}`, a
wrong one `401 {"msg":"Invalid token"}`, an unknown path `404`). **No live credential was available**, so
success-path response shapes are the documented ones, not captured ones.

The icon (`assets/icon.svg`) is the vendor's own mark, copied verbatim from the inline
`seamless-logo-icon` SVG on `seamless.ai` (the site serves no `favicon.svg`, and neither simple-icons nor
n8n carry the brand).

## Authentication

One method: an **API key**, created in Seamless.AI under *Settings > Public API > API Key > Create New
Connection* (the menu only appears if the account has Public API access). It is sent as the `Token`
header — the bare key, no `Bearer`. Credentials live only in the `sign` hook.

Seamless also documents an OAuth 2.0 authorization-code flow, but the customer registers the OAuth client
(`client_id`, `client_secret`, `redirect_uri`) in their own settings, so there is nothing for this app to
register; an API key does the same job with one field.

## Actions

| Group | Actions |
|---|---|
| Search (spends credits) | `contacts-search`, `companies-search`, `locations-lookup` (free) |
| Research (async) | `contacts-research`, `contacts-research-poll`, `companies-research`, `companies-research-poll` |
| Org data | `contacts-list`, `companies-list`, `contacts-lists-update`, `companies-lists-update` |
| Lists | `list-list`, `list-get`, `list-create`, `list-update`, `list-delete` |
| Saved searches | `saved-search-list`, `saved-search-get`, `saved-search-create`, `saved-search-delete` |
| Campaigns | `campaign-list`, `campaign-get`, `campaign-metrics-get`, `campaign-action`, `campaign-contacts-list`, `campaign-contacts-add`, `campaign-contacts-remove` |
| Tasks | `task-list`, `task-get`, `task-create`, `task-update`, `task-action`, `task-delete` |
| Templates & calls | `template-list`, `template-get`, `call-log`, `call-dispositions-list`, `call-sentiments-list` |
| Activity & lookups | `activity-list`, `contact-statuses-list`, `engagement-statuses-list`, `email-accounts-list` |
| Account | `credits-get`, `user-get`, `features-get` |

### The search-then-research flow

1. `contacts-search` / `companies-search` returns lightweight rows, each with a `searchResultId`, and
   `supplementalData.nextToken` for the next page.
2. `contacts-research` / `companies-research` takes those IDs (or identities such as a domain or an email)
   and answers `202` with `requestIds`. Research spends one credit per record.
3. `*-research-poll` reports each request as `researching`, then `done` with the full record. Poll every
   2-5 seconds; the vendor's limit is 60 requests per minute per endpoint, shared across the org.

List-valued fields (job titles, domains, IDs, ...) accept a JSON array or comma / newline separated text.
Each search action also takes a `filters` JSON object for any documented filter that has no named field;
named fields win on conflict.

## Health checks

| Check | Result |
|---|---|
| `service` | Declared **unavailable** at `informational` severity. `status.seamless.ai` answers `403` (Cloudflare challenge) to non-browser clients and `seamless.statuspage.io/api/v2/summary.json` answers `200 text/html` — the unclaimed Statuspage shell (127,718 bytes, no `page` object). The docs link no status page. |
| `quota` | Signed `GET /v2/credits`: one reading per credit category, `degraded` (never `down`) when a category is at zero. |
| `auth:api-key` | Derived from `Auth.test`: signed `GET /v2/credits`, which needs a credential, spends none and returns balances only. A `200` must carry the documented `{success, data}` shape. |

## Things worth knowing

- **The spec's error body is not the wire body.** Documented `{message}`; observed `{"msg": ...}`, and a
  422 carries a vendor `code` (`insufficientCredits`, a missing-licence code). The client reads both and
  puts the `code` in the error text. A 429 (`rateLimitExceeded`) includes the `X-RateLimit-Reset` epoch.
- **v1 and v2 coexist.** The docs' guides still show `/api/client/v1`; v2 is a superset of it, so this app
  uses v2 only. v2 adds `savedSearchId`, `locations`, `emailAddress`, `phoneNumber`, SIC/NAICS and radius
  filters to search.
- **Several enums in the spec are samples, not lists** (`companyState`, `companyCountry`, `technologies`
  list five values and say so), so those fields are free-form; use `locations-lookup` for place names.
- Engage features (campaigns, tasks, templates, email accounts) depend on the account's plan; `features-get`
  reports what is enabled.

## Not covered

Left out because they send mail or are destructive configuration with no way to verify safely without a
credential: `POST /emails/send`, `/emails/send-bulk`, `/emails/preview`, email drafts, email footers,
campaign create / update / delete / clone, campaign step CRUD and step actions, template create / update /
delete, saved-search update, and the OAuth token exchange. The v1 routes are superseded by their v2
equivalents.

## Triggers

Eleven polling triggers, all over the same authenticated client as the matching list action. Vendor
docs: <https://docs.seamless.ai/api-reference/v2/tasks/list-tasks> and the sibling v2 reference pages
named below (verified 2026-11-10).

| Trigger | Mechanism | Wrapped list action | The run gets |
| --- | --- | --- | --- |
| `new-task` — New Task | newest-first (`sortColumn=createdAt`, `sortOrder=desc`, documented) | `task-list` | each newly created task |
| `new-saved-search` — New Saved Search | newest-first (documented "newest first") | `saved-search-list` | each new saved search |
| `new-campaign` — New Campaign | newest-first (documented "newest first"), first 50 | `campaign-list` | each new campaign |
| `new-activity` — New Activity | newest-first (documented "newest first"), first 50 | `activity-list` | each email or call thread that first appears in the feed |
| `new-or-updated-activity` — New or Updated Activity | same feed; id is thread + latest event time | `activity-list` | each new thread and each thread with a newer event |
| `new-contact` — New Contact | since-filter (`startDate`..`endDate`, 100 per page) | `contacts-list` | each contact your organization researches |
| `new-company` — New Company | since-filter (`startDate`..`endDate`, 100 per page) | `companies-list` | each company your organization researches |
| `new-list` — New List | snapshot of the whole unpaged `/lists` response | `list-list` | each new list |
| `new-or-updated-list` — New or Updated List | same snapshot, changed rows included | `list-list` | each new or changed list |
| `new-template` — New Template | snapshot of all template pages (50 each, at most 20) | `template-list` | each new template |
| `new-campaign-contact` — New Campaign Contact | snapshot of one campaign's contacts (`campaignId` param, 50 per page, at most 20) | `campaign-contacts-list` | each contact added to that campaign |

The first check only records what already exists (no flood). Later checks emit what was not seen
before, oldest first. The two since-filter triggers read the window `cursor - 2 minutes`..now up to
3 pages per check and resume the next page on the next check when a window is longer; they ignore
records stamped before the first check. The vendor does not say which timestamp `startDate` /
`endDate` filter, so the trigger compares each record's `researchedAt` (else `createdAt`) with that
first-check time. A snapshot trigger fails with a clear error rather than truncating when its
collection passes 1000 rows.

No webhook is registered and nothing is delivered to a callback URL, so there is no delivery to
verify: the triggers only pull. Setup is just the connection. The API is rate limited to 60
requests per minute per endpoint; the 5-minute minimum interval keeps even the 20-page snapshots
well under it.

Not covered by a trigger (list actions skipped on purpose): `contacts-search` and `companies-search`
spend credits per returned record; `call-dispositions-list`, `call-sentiments-list`,
`contact-statuses-list`, `engagement-statuses-list` and `email-accounts-list` are reference values
(the vendor's Account API groups "contact statuses, email accounts, and footers" as reference
values, <https://docs.seamless.ai/api-catalog/account>).

Vendor docs: <https://docs.seamless.ai/llms.txt> (verified 2026-11-10).
