# Enrich Layer

B2B data enrichment for w6w: profile lookups for people, companies, schools and jobs, dataset
search, contact discovery and reverse lookups. Wraps the **v2** API documented at
[enrichlayer.com/docs](https://enrichlayer.com/docs).

- Base URL: `https://enrichlayer.com/api/v2` (the only host the app calls, besides the status page).
- Auth: API key, sent as `Authorization: Bearer <key>` (stamped by `sign`, never by an action).
  Probe: `GET /credit-balance`, which is free and answers `{credit_balance}`.
- Every call spends credits; each action's description states its cost. New accounts get 500 free credits.

## Actions (25)

| Key | Type | Endpoint | What it does |
|---|---|---|---|
| `person-profile-get` | read | `GET /profile` | Return the structured profile of a person from their public profile, Twitter/X or Facebook URL. |
| `person-lookup` | read | `GET /profile/resolve` | Find a person's profile URL from a first name and a company name or domain. |
| `person-role-lookup` | read | `GET /find/company/role/` | Return the person who most closely matches a role at a company, for example the CTO of Apple. |
| `person-profile-picture-get` | read | `GET /person/profile-picture` | Return a temporary URL for a person's profile picture, from a cached profile. |
| `person-search` | search | `GET /search/person` | Search the people dataset by criteria. |
| `company-profile-get` | read | `GET /company` | Return the structured profile of a company from its profile URL. |
| `company-lookup` | read | `GET /company/resolve` | Find a company's profile URL from its name and/or domain. |
| `company-id-lookup` | read | `GET /company/resolve-id` | Return the vanity ID of a company from its internal numeric ID. |
| `company-profile-picture-get` | read | `GET /company/profile-picture` | Return a temporary URL for a company's logo, from a cached profile. |
| `company-employees-list` | search | `GET /company/employees/` | List a company's employees. |
| `company-employee-count` | read | `GET /company/employees/count` | Return employee counts for a company from several sources. |
| `company-employee-search` | search | `GET /company/employee/search/` | Search a company's employees by job title keywords. |
| `company-search` | search | `GET /search/company` | Search the company dataset by criteria. |
| `personal-email-lookup` | read | `GET /contact-api/personal-email` | Find personal email addresses for a social profile. |
| `work-email-lookup` | read | `GET /profile/email` | Queue a work-email lookup for a person profile. |
| `personal-contact-number-lookup` | read | `GET /contact-api/personal-contact` | Find personal phone numbers for a social profile. |
| `reverse-phone-lookup` | read | `GET /resolve/phone` | Find social profiles from a phone number. |
| `reverse-email-lookup` | read | `GET /profile/resolve/email` | Resolve a person profile from a personal or work email address. |
| `disposable-email-check` | read | `GET /disposable-email` | Check whether an email address belongs to a disposable or free email service. |
| `job-profile-get` | read | `GET /job` | Return the structured data of a job posting from its URL. |
| `job-search` | search | `GET /company/job` | List jobs posted by a company. |
| `job-count` | read | `GET /company/job/count` | Count the jobs posted by a company. |
| `school-profile-get` | read | `GET /school` | Return the structured profile of a school from its profile URL. |
| `school-students-list` | search | `GET /school/students/` | List the students of a school. |
| `credit-balance-get` | read | `GET /credit-balance` | Return the account's remaining API credits. |

Select fields left blank send nothing, so the vendor default applies (for example `use_cache`
defaults to `if-recent` on profile endpoints, which costs 1 extra credit).

## Pagination

Search and listing responses return `next_page` as a full URL. The actions return the token
instead, ready to feed back in: `nextToken` (people and company search, `next_token`),
`nextCursor` (employee, employee-search and student listings, `after`) and `nextPagination`
(job search, `pagination`).

## Health checks

| Check | Probe | Notes |
|---|---|---|
| `auth:api-key` (derived) | `GET /credit-balance` signed | verdict read from the body, not the status |
| `api` | `GET /credit-balance` unsigned | the vendor's 401 `{code, description, name}` envelope is a pass |
| `quota` | `GET /credit-balance` signed | remaining credits; informational |
| `service` | `status.enrichlayer.com/api/v1/components` | Cachet page, one component per endpoint; informational |

## Not built

- The v3 API and the Autocomplete API (both BETA in the docs) and the deprecated Customers group.
- The work-email callback payload: the docs show only `{email_queue_count}` for the immediate
  response and name a `workEmailResult` callback without publishing its schema, so the action
  returns the queue count and the caller supplies a callback URL.

## Vendor quirks worth knowing

- Errors are `{"code": 401, "description": "Invalid API key", "name": "Unauthorized"}`: `code` is the HTTP status as a number.
- Job Search's `next_page_api_url` points at `http://enrichlayer.com/api/pc/...`, not the v2 path. Use only its `pagination` token.
- Person Lookup and Reverse Email Lookup charge credits on a null result by default; use
  `similarity_checks=skip` / `lookup_depth=superficial` to avoid that.
- Employee and student listings cost per result, and `sort_by` adds a flat 50 credits plus 10 per result.

## Icon

`assets/icon.svg` is the mark from the vendor's own `https://enrichlayer.com/frontend/enrichlayer/logo.svg`
(the polygons and the cream path, without the wordmark), with only the root `width`, `height` and
`viewBox` changed to crop to the mark.

## Develop

```bash
deno task validate && deno task check && deno task lint && deno task test
deno task fmt   # never bare `deno fmt`
```
