# Prospeo

Enrich people and companies, search Prospeo's B2B lead database, resolve search-filter values and
read the credit balance, over the **Prospeo API**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (`X-KEY` header)
- **Actions** — 8
- **Health checks** — `service` (declared absence: no vendor status page), `api` (unsigned
  reachability), `quota` (credit balance, informational) + the derived `auth:api-key`
- **Egress allowlist** — `api.prospeo.io`
- **API docs** — https://prospeo.io/api-docs
- **Icon** — the vendor's own mark, https://prospeo.io/favicon/apple-touch-icon.png (180x180 PNG,
  saved verbatim)

Verified on 2026-10-06 against the docs pages under `prospeo.io/api-docs` and live probes of
`api.prospeo.io`.

## Things most likely to go wrong

1. **The old endpoints are gone.** `/email-finder`, `/email-verifier`, `/mobile-finder`,
   `/domain-search` and `/social-url-enrichment` now answer
   `{"req_status":false,"error_code":"DEPRECATED"}`. Their replacement is Enrich Person (email and
   mobile in one call) and Search Person; there is no standalone verifier. Only the current API is
   built here.
2. **Errors are HTTP 400 with a body code, including "not found" and "bad key".** A wrong key is
   `400 {"error":true,"error_code":"INVALID_API_KEY"}`, an unmatched person is `400 NO_MATCH`, an
   empty search is `400 NO_RESULTS`. Only rate limiting is a real 429. The credential test and the
   `api` health check read `error_code`, never the status. Enrich and search actions return
   `matched: false` / empty `results` for NO_MATCH / NO_RESULTS and throw for everything else.
3. **Search never returns emails or phones.** `/search-person` results carry masked fields only;
   feed each `person.person_id` to Enrich Person (or Bulk Enrich Persons) to reveal them. Search
   costs 1 credit per page of 25 and caps at 1000 pages; enrich costs 1 credit per email and 10 per
   mobile, with no charge for no match or a repeat within 90 days.
4. **Bulk calls report per-record outcomes inside a 200.** Read `matched`, `not_matched` and
   `invalid_datapoints` by your own `identifier`; max 50 records. Matching needs a LinkedIn URL, an
   email, a person ID, or a name plus a company field; a bare company name is discouraged.
5. **Search filters are strict.** Industries, locations, technologies etc. must match enum values
   exactly (use Search Suggestions, which is free); exclude-only searches are rejected;
   `company.company_oids` works on people search but is rejected on company search; some filters
   need a higher plan (`PLAN_REQUIRED`). Search endpoints have much lower rate limits than enrich.

## Actions

| Area    | Actions                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| Enrich  | `enrich-person`, `bulk-enrich-person`, `enrich-company`, `bulk-enrich-company` |
| Search  | `search-person`, `search-company`, `search-suggestions`                       |
| Account | `get-account-information`                                                     |

`filters` (search) and `records` (bulk) are JSON params that use the API's own snake_case names.

## Health

- **Credential** — derived from `Auth.test`, which probes the free `GET /account-information`
  (plan and credits; the key is never echoed). Judged on `error_code`; a 429 counts as live.
- **service** — declared absence: `status.prospeo.io` does not resolve and no status link exists.
  `informational` so it never pins the app at `unknown`.
- **api** — unsigned `GET /account-information`; the documented `INVALID_API_KEY` body is a pass.
- **quota** — credit balance from a signed `GET /account-information`: 0 is down, under 10 is
  degraded (informational).
