# RocketReach

Search and look up people and companies, reveal professional and personal emails and phone numbers,
run bulk lookups, and verify email addresses, over the **RocketReach API v2**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (`Api-Key: <key>`)
- **Actions** — 15 (8 standard, 7 Universal Credits)
- **Health checks** — `service` (status.rocketreach.co, a real incident.io page in the Statuspage v2
  shape; the `API` component decides), `api` (unsigned reachability), `quota` (credit pools from
  `GET /account/`) + the derived `auth:api-key`
- **Egress allowlist** — `api.rocketreach.co` (`status.rocketreach.co` is allowlisted for the
  `service` check only, not for actions)
- **API docs** — https://docs.rocketreach.co/reference (index: https://docs.rocketreach.co/llms.txt)
- **Icon** — the vendor's own mark, https://static.rocketreach.co/images/favicons/apple-icon-180x180.png,
  saved verbatim as `assets/icon.png`

Verified on 2026-10-06 against the OpenAPI document embedded in each reference page (base URL
`https://api.rocketreach.co/api/v2`, security scheme `Api-Key` header) and live, credential-free
probes of the API and the status page. No API key was available, so **no authenticated response has
been observed**; response shapes come from the published schemas.

## Actions

| Standard credits | Universal Credits | Notes |
|---|---|---|
| `get-account` | `get-universal-account` | usage and rate limits |
| `search-people` | `universal-search-people` | `POST /person/search`, `/universal/person/search` |
| `lookup-person` | `universal-lookup-person` | asynchronous, see below |
| `check-lookup-status` | `universal-check-lookup-status` | poll by profile id |
| `bulk-lookup-people` | `universal-bulk-lookup-people` | up to 100 per request |
| `search-companies` | `universal-search-companies` | `POST /searchCompany` |
| `lookup-company` | `universal-lookup-company` | by domain, id, name, LinkedIn URL or ticker |
| `verify-email` | (same action) | `POST /email/verify/`, its own credit pool |

## Not covered

- **People and Company Lookup (`GET /profile-company/lookup`)** — a person lookup plus the employer's
  profile in one call; `lookup-person` followed by `lookup-company` does the same. Left out to keep
  the surface small.
- **`lookup_type` on person lookup** (`standard`, `premium`, `phone`, `enrich`, ...) and **`metadata`**
  — the docs list the values without saying what each costs or does, so they are not exposed on
  `lookup-person`. `metadata` can still be set per query in the bulk actions, which pass each query
  object through untouched.
- **Creating an API key (`Get a RocketReach API Account`)** — it provisions a new account, not an
  action on the connected one.
- **Webhook management and delivery** — webhooks are configured in the RocketReach account UI and
  have no API. Deliveries are signed (`X-RocketReach-Signature`, base64 HMAC-SHA256 of the raw body)
  and carry the `RR-Request-ID` that the bulk actions return as `requestId`; receiving one needs a
  trigger, which this app does not declare.
- **Search filters beyond the curated fields** — the person query has ~65 filters and the company
  query ~40. The common ones are fields; every other (signals, intent topics, NAICS/SIC, health
  credentials, ...) goes in the `query` JSON param, merged over the fields.

## Things most likely to go wrong

1. **There are two credit systems and two endpoint families.** Essentials, Pro and Ultimate plans
   use `/person/...`, `/searchCompany`, `/company/...`. Accounts on Universal Credits use
   `/universal/...`, and the vendor states those are "not currently available" to Essentials, Pro or
   Ultimate. Pick the family that matches the account; `get-account` and `get-universal-account` show
   which one answers.
2. **`GET /universal/account/` returns the caller's own `api_key`.** `get-universal-account` drops
   it, and neither the auth test nor any health check uses that endpoint. The standard
   `GET /account/` carries no key in its published schema, and is the probe.
3. **Person lookup is asynchronous.** The first answer carries a `status`; anything other than
   `complete` (`searching`, `progress`, `waiting`, `failed`) means the data is not final. Use
   `check-lookup-status` with the returned `id`, or a webhook (`webhook_id`; omitted, RocketReach
   uses your top-most enabled webhook). `complete` on the action output is the flag to branch on.
4. **A missing key and a wrong key are both `401`** with `{"detail": …, "error_code":
   "authentication_failed"}`, told apart only by `detail` (`Anonymous requests are not allowed.
   Please use the test API key.` vs `Invalid API key`). The vendor's own error guide shows a
   different shape (`{"status": 401, "message": …}`); the live one is `detail`/`error_code`.
5. **Running out of credits is not `402` for lookups.** Lookup and search credits exhausted is a
   `403` with a prose `detail`; `402` (with `credit_type` and `purchase_url`) belongs only to
   `verify-email`'s separate balance, which is refunded when the verdict is `unknown`.
6. **Search is documented as a bare array, and nothing documents pagination.** The reference prints
   the response as an array of profiles. The actions accept that, or an object with
   `profiles`/`companies` and `pagination` (`next`, `total`), and compute `nextStart` from a full
   page when no pagination block exists. `start` is 1-based and capped at 10,000, so a search cannot
   walk past the first 10,000 results; narrow the filters instead.
7. **Every search filter is an array**, even for one value, and the curated fields split on commas
   and newlines. A value that contains a comma (a `name` like `Smith, John`) must go in the `query`
   JSON param.
8. **`check-lookup-status` sends `ids` as repeated parameters** (`ids=1&ids=2`), which is what the
   spec's untyped array style means. The docs show no example request, so if the live API wants a
   comma-joined list this is the first thing to adjust.
9. **Limits stack.** A global 10 requests/second applies across every API, on top of per-plan
   minute/hour/day/month windows for search, lookup and company search, and a tighter bulk-job
   window (10/min, 25/hour, 100/day on standard plans). A `429` carries `Retry-After`, which the
   error message includes. Email verification is 10/second and 300/minute on every plan.
10. **Credits are charged on the data, not the call.** A standard lookup charges when a verified
    (A or A-) email or a valid phone is found, a company lookup when any company data is returned;
    re-looking-up a profile is free. Universal Credits price each data type separately (professional
    email 2, personal email 3, phone 6, detailed enrichment 1, healthcare 1, person search 1 per
    page, company search 2 per page) and reveal nothing without the matching `reveal_*` flag.
11. **Universal search defaults to 100 results per page, standard to 10.** The page-size default
    differs between the two endpoint families, so the actions follow each.
12. **The `api_key` query parameter is deprecated.** This app only ever sends the `Api-Key` header.

## Health checks

- **`service`** — `https://status.rocketreach.co/api/v2/summary.json`. Real: `page.name` is
  `RocketReach`, page id `01JTK0DSQ2EAV562MX5BKDW29X` (checked on every run), and the page's Atom
  feed names `incident.io` as its generator. The page has five components — `RocketReach.co`,
  `Extension`, `API`, `MCP` and `RocketReach Verify`; only `API` decides the verdict, `RocketReach
  Verify` (which backs only `verify-email`) is capped at `degraded`, and the rest are detail. The
  Statuspage-shaped `/api/v2/*` paths work; `/summary.json` and `/index.json` are 404 HTML.
  A failing or foreign status page reports `unknown`, never `down`.
- **`api`** — an unsigned `GET /account/`. The vendor's schema-correct JSON `401` with
  `error_code: authentication_failed` counts as reachable (it proves the application is serving);
  a 5xx is `down`; any other body is `unknown`.
- **`quota`** — signed `GET /account/`, `credit_usage` per credit type. Unlimited pools (the schema
  says `allocated`/`remaining` are `"inf"`) are skipped. A pool at 90% used degrades the verdict;
  every finite pool exhausted is `down`. Both the array shape (standard) and the object shape the
  Universal account schema describes are read, since it is unconfirmed which one `GET /account/`
  returns on a Universal account. The vendor publishes no rate-limit response headers, so there is
  no `request-rate` check.
- **`auth:api-key`** (derived) — the Auth `test`: `GET /account/`, passing only on a 200 whose body
  has a numeric `id`; the key is never echoed, and a 401 is classified from the body.

## Tests

`deno task test` — 79 tests: the entry module, each of the 15 actions, the auth `sign`/`test`
hooks, the three health checks and the shared client/search/profile helpers, all against a mocked
`HookContext`. `deno task validate` reports 0 errors, 0 warnings.
