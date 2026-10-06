# Clientify

CRM and marketing-automation platform. This app wraps the core CRM surface of the Clientify v1
REST API (`https://api.clientify.net/v1`): contacts, companies, deals, tasks, notes, users,
pipelines and task types.

Source of truth: Clientify's published Postman collection (the data behind developer.clientify.com,
279 requests, fetched 2026-10-06) plus live unauthenticated probes of `api.clientify.net`.

## Auth

API key, sent as `Authorization: Token <key>` (account settings). Only `sign` ever sees it. The
connection test calls `GET /v1/users/` (account users — never the token) and decides from the
**body**: a `results` list passes, `{"detail":"Invalid token."}` is a bad key.

## Actions (27)

| Resource | Actions |
|---|---|
| Contact | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`, `contact-add-note`, `contact-add-tag` |
| Company | `company-list`, `company-get`, `company-create`, `company-update`, `company-delete`, `company-add-note` |
| Deal | `deal-list`, `deal-get`, `deal-create`, `deal-update`, `deal-delete`, `deal-close`, `deal-add-note`, `pipeline-list` |
| Task | `task-list`, `task-get`, `task-create`, `task-complete`, `task-type-list` |
| User | `user-list` |

List actions return Clientify's `{count, next, previous, results}` envelope (max 100 per page); pass
`page` for the next one. Filters not given a named parameter (`created[gt]`, `modified[lt]`,
`amount[gte]`, custom fields as `cf_<name>`) go in the JSON `filters` param. Create/update actions
take a JSON `extra` param for any body field not listed (for example `custom_fields`).

Related records in request bodies (a deal's `contact`/`company`, a task's `taskType`,
`relatedContacts`, …) are **full resource URLs** (`https://api.clientify.net/v1/contacts/<id>/`),
not bare ids.

## Health checks

| Check | What it does |
|---|---|
| `service` | `https://status.clientify.com/index.json` (Better Stack, verified: page self-identifies as Clientify). The page has `API V1 Principal` (66651), `API V1 Secundaria` (8762879) and `API V2`; this app calls only `/v1`, so the verdict is the worst of the two V1 components. The page-level aggregate and every other component (web app, forms, analytics, MCP, V2) are shown but never drive the verdict. |
| `api` | Unsigned `GET /v1/users/`. Clientify's JSON `{"detail": …}` refusal proves the API is answering and is a **pass**; an HTML body is down. |
| `quota` | Declared unavailable (`informational`): the reference documents no rate limit, no rate-limit header and no usage endpoint. |
| `auth:api-key` | Derived from the auth `test` hook. |

## Findings

- A **missing** key answers **HTTP 404** `{"detail":"Api key not provided."}`; a **wrong** key is
  401 `{"detail":"Invalid token."}`. Status code alone cannot classify a credential. An unknown path
  under `/v1/` returns an HTML 404, so JSON-versus-HTML is the "is this the API" signal.
- Every documented path ends in a trailing slash and the client keeps it.
- Contact create takes singular `email` / `phone`; the response lists `emails` / `phones` arrays
  (and a `contacts-dynamic` URL).
- The task-create table marks `start_datetime`/`end_datetime` required while the reference's own
  example omits them; only `name` is required here, and a vendor 400 is surfaced verbatim.
- Contact notes are documented as multipart form data; company and deal notes as JSON.

## Left out (not confirmed or out of scope)

Contact sub-resources (addresses, emails, phones, other companies), company/deal tag and employee
management, batch creates, GDPR queries, campaigns, calls, wall entries, products, orders, budgets,
taxes, real estate, automations and settings: documented, but not part of this CRM core. Task edit
was left out because its documented response shows deprecated `type`/`status` fields. The
`/v1/api-auth/obtain_token/` login is not used so no password is collected.
