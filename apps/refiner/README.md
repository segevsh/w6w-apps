# Refiner

[Refiner](https://refiner.io) is an in-product survey tool for NPS, CSAT and product-feedback
surveys. This app lets a workflow read responses and reports, manage surveys, contacts and
segments, and push user traits, events and externally collected responses back in, over the
Refiner REST API v1 (`https://api.refiner.io/v1`).

- **App id:** `io.w6w.refiner`
- **Auth:** API key, sent as `Authorization: Bearer <key>` (`auth/api-key.ts`). One key per
  Refiner environment (Production, Testing, …); Integrations > Rest API in the Refiner dashboard.
- **Network:** `api.refiner.io` only.
- **Spec source:** <https://refiner.io/docs/api/> (verified 2026-10-06, plus live probes of
  `api.refiner.io`). The reference has no deprecation or sunset notices (grep for
  `deprecat|sunset|end of life|will be removed` is empty) and documents a single, current `v1`.
- **Icon:** the vendor's `apple-touch-icon.png`
  (<https://refiner.io/images/apple-touch-icon.png>, linked from the homepage), embedded as a base64
  data URI inside an SVG wrapper.

## Actions (19)

| Group | Action | Endpoint |
| --- | --- | --- |
| Account | `project-get` | `GET /v1/` (the environment this key belongs to) |
| Account | `account-get` | `GET /v1/account` (plan, monthly usage, environments) |
| Surveys | `form-list` | `GET /v1/forms` |
| Surveys | `form-publish` | `POST /v1/forms/publish` (publish or unpublish) |
| Surveys | `form-duplicate` | `POST /v1/forms/duplicate` |
| Surveys | `form-archive` | `DELETE /v1/forms` |
| Surveys | `form-history` | `GET /v1/forms/history` |
| Responses | `response-list` | `GET /v1/responses` (filters, cursor paging) |
| Responses | `response-store` | `POST /v1/responses` |
| Responses | `response-tag` | `POST /v1/responses/tags` |
| Reporting | `report-get` | `GET /v1/reporting` (nps, csat, ratings, distribution, count) |
| Contacts | `contact-list` | `GET /v1/contacts` |
| Contacts | `contact-get` | `GET /v1/contact` |
| Contacts | `contact-delete` | `DELETE /v1/contact` |
| Contacts | `contact-identify` | `POST /v1/identify-user` |
| Events | `event-track` | `POST /v1/track-event` |
| Segments | `segment-list` | `GET /v1/segments` |
| Segments | `segment-add-contact` | `POST /v1/sync-segment` |
| Segments | `segment-remove-contact` | `DELETE /v1/sync-segment` |

Every endpoint in the vendor's reference is covered. Not covered: creating or editing a survey's
questions (the API only duplicates, publishes, archives and reads surveys), webhook management (the
reference documents none; webhooks are configured in the Refiner dashboard), and the Basic-auth and
`api_key` request-parameter credential forms (the header form the vendor recommends is the only one
sent, so a key never lands in a logged URL).

## Behaviour worth knowing

- **Paging:** list actions take `page` + `pageLength` (vendor ceiling 1000; this app prefills 50) or
  `pageCursor`, the `pagination.next_page_cursor` of the previous page, which the vendor recommends
  past about 10,000 rows.
- **Filters:** `response-list` and `report-get` take answer, contact-trait and account-trait filters
  as JSON objects (`{"nps": 9}`) and send them in the vendor's bracket syntax
  (`response_data[nps]=9`); list-valued filters are sent as `form_uuids[]=…`.
- **Identifying contacts:** `contact-get`, `contact-delete` and `response-store` accept a user `id`,
  an `email` or the Refiner `uuid`; a call with none of them is refused before any request, so a
  delete can never go out unscoped.
- **Deleting a contact deletes their survey responses.** To erase personal data but keep the
  responses, overwrite the traits with `contact-identify`.
- **Rate limits:** 4,000 requests/min per API key and 100/min per user id (the per-user limit
  applies to calls carrying `id`, `email` or `uuid`). `429` is returned with `Retry-After`.
  Refiner exposes no remaining-request count, so only the plan quotas below are reported.

## Health

| Check | Kind | What it does |
| --- | --- | --- |
| `api` | service, fatal | Signed `GET /v1/`. Passes on the documented `project_uuid` shape, and also on each of Refiner's three key-refusal bodies, which prove the API is serving (the credential verdict belongs to the derived `auth:api-key` check). |
| `quota` | quota, informational | `GET /v1/account`: monthly tracked users, page views and survey responses against the plan limits; degraded from 90%. |
| `service` | service, informational | Declared unavailable. `status.refiner.io` is a real Hyperping page, but it has no JSON or feed route (every summary/feed path 404s) and only embeds Next.js page props in HTML. `refiner.statuspage.io` is not Refiner's (it serves Atlassian's marketing page). |

## API findings

- **A bad key is answered three different ways**, measured live: a missing (or too short) key is
  `401 {"error":"No API key found in headers"}`, a malformed one is
  `401 {"error":"API key does not look valid"}`, and a well-formed but unknown key is a **`404`**
  `{"message":"API key not valid or does not exist"}` — a different status *and* a different JSON key.
  Classification therefore reads the body, never the status.
- **Probe:** `GET /v1/` is the endpoint the vendor's own Authentication section names for verifying
  a key. It returns only `{project_uuid, project_name, message}`; there is no `/me` or `/apikey` that
  echoes the credential.
- **Request encoding:** the vendor accepts query parameters, form fields or a JSON body. This app
  sends JSON for writes and query strings for reads and `DELETE`s.

## Layout

```
refiner/
├── index.ts            # entry: { actions, auth, healthChecks }
├── package.json        # w6w identity block
├── lib/client.ts       # RefinerClient, bracket-syntax query builder, error formatting
├── auth/api-key.ts     # sign / test / afterConnect, three-way key classifier
├── actions/            # one file per action (19)
├── health/             # api, quota, service
├── assets/icon.svg     # vendor mark (PNG embedded as a data URI)
└── tests/              # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task fmt        # never bare `deno fmt`
deno task validate
deno task check
deno task lint
deno task test
```
