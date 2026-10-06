# Seamless.AI

B2B contact and company data: search the Seamless.AI database, research (enrich) the records you pick,
and manage the lists, campaigns, tasks and saved searches around them. 45 actions over the public API
**v2** (`https://api.seamless.ai/api/client/v2`).

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
