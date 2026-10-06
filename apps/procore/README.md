# Procore

Read and manage Procore construction projects: companies, projects, users, RFIs, submittals,
observations, punch items and project documents.

- **Categories** — project-management, documents
- **Auth methods** — oauth2 (production), oauth2-sandbox
- **Actions** — 20
- **Egress allowlist** — `api.procore.com`, `sandbox.procore.com` (OAuth hosts `login.procore.com` /
  `login-sandbox.procore.com` are allowed implicitly by the runtime)
- **Website** — https://www.procore.com
- **API docs** — https://developers.procore.com (OpenAPI per resource at
  `https://developers.procore.com/api/v1/resource_groups/resource/<resource>`)

Every path, query parameter and body field here was read on 2026-10-06 from Procore's published
OpenAPI documents, all at **REST v1.0**.

## Actions

| Area         | Actions                                                           |
| ------------ | ----------------------------------------------------------------- |
| Account      | `me-get`, `company-list`                                          |
| Projects     | `project-list`, `project-get`                                     |
| Directory    | `company-user-list`, `project-user-list`                          |
| RFIs         | `rfi-list`, `rfi-get`, `rfi-create`                               |
| Submittals   | `submittal-list`, `submittal-get`                                 |
| Observations | `observation-list`, `observation-get`, `observation-create`       |
| Punch list   | `punch-item-list`, `punch-item-get`, `punch-item-create`          |
| Documents    | `folder-list`, `folder-get`, `file-get` (metadata, not file bytes) |

List actions return `{ items, page, perPage, nextPage, lastPage, hasMore }`.

## The company header

Procore routes calls across regional zones, so **every call except `GET /me` and `GET /companies`
must carry a `Procore-Company-Id` header**. This app handles that in two layers:

1. The connection has an optional **Default company ID** field. `afterConnect` records it (with the
   company's name, looked up from `/companies`) on the connection.
2. Every action has an optional **Company ID** that overrides it for one call. The Auth `sign` hook
   also stamps the header from the credential if a request reaches it without one, and never adds it
   to `me` or `companies`.

`project-list` and `project-get` additionally need `company_id` as a **query** parameter, and
`project-list`'s company is therefore required. Find company IDs with `company-list`.

## Pagination

Collections use `page` / `per_page`. Procore reports the neighbours in a `Link` header
(`rel="next"`, `last`, `first`, `prev`); list actions parse `next`/`last` into `nextPage`/`lastPage`
and set `hasMore`. `folder-list` and `folder-get` are not paginated collections — they return one
folder object with its children.

## Sandbox

Production and sandbox are separate Procore systems with separate OAuth registrations. A connection
picks one auth method (`oauth2` or `oauth2-sandbox`), and `afterConnect` stores the matching API host
on the connection so actions call `sandbox.procore.com` for a sandbox connection. The host is
restricted to those two values.

## Health checks

| Question               | Check                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| Is Procore up?         | `service` — Statuspage component `API Gateway`                               |
| Is the API answering?  | `api` — unsigned `GET /rest/v1.0/me`; Procore's JSON 401 body is a pass      |
| Is the credential live?| derived `auth:oauth2` / `auth:oauth2-sandbox` — `GET /rest/v1.0/me`         |
| Quota headroom?        | `quota` — declared unavailable, informational                                |

- **Status page** — <https://status.procore.com> is a real Atlassian Statuspage (`page.id`
  `jxb4w0vdl2tv`, "Procore Technologies"; no redirect). It covers the whole company (~150
  components), so the page-level indicator is ignored. The `API Gateway` component (id
  `47gjht5rzqch`) lives inside the group "Sandbox Environments and API"; it is pinned by id and
  name, and the page id is checked on every run. `Webhooks` is shown as detail, capped at `degraded`.
- **Credential probe** — `GET /rest/v1.0/me` returns only `id`, `login` (email) and `name`, never the
  token. Pass requires a numeric `id` in the body; the status code alone is never the verdict (a
  stale token answers `401 {"errors": "..."}`, no token answers `401 {"error": "Invalid Token"}`).
- **`api` check** targets production only.
- **Quota** — no rate-limit header could be confirmed on live responses (only `x-complexity-score`),
  and no headroom endpoint is in the OpenAPI reference, so it is declared absent.

## Not covered

Procore's reference lists several hundred resources; this app is the core surface. Left out: update/delete
for every resource, RFI workflow actions (forward, advance ball-in-court, recycle), submittal create
and revisions, observation response logs and PDFs, punch item comments/attachments/emails, file and
folder upload/create (the multipart upload flow needs the Prostore storage handshake, not
implemented), the v1.1/v1.3/v2.0 endpoints (company users v1.3, documents v2.0, submittals v1.1),
drawings, specifications, meetings, daily logs and all other field-productivity logs, inspections
and checklists, forms, financials (budgets, commitments, prime contracts, change events/orders,
invoicing, direct costs), schedule, bidding and estimating, assets and equipment, BIM, workflows,
webhooks (`hooks`), and project/company configuration (custom fields, locations, trades, cost codes).

## Quirks worth knowing

- **Docs are client-rendered.** `developers.procore.com/documentation/*` answers HTTP 200 with the
  same ~6.8 KB JavaScript shell for every path, including ones that do not exist. The only
  machine-readable source is the OpenAPI JSON under `/api/v1/resource_groups/...`; the
  `Procore-Company-Id` requirement is stated in Procore's own SDK READMEs and in each operation's
  header parameter.
- **Versions differ per resource.** The same resource may exist at v1.0, v1.1 and v2.0 with
  different shapes. This app uses v1.0 throughout because every resource here has it.
- **`project_id` is a query parameter** for observations, punch items and folders/files, but a path
  segment for RFIs, submittals and project users.
- **Observation status filters take integer codes** (`0` Initiated … `4` Draft) while creating one
  takes the names (`initiated`, `ready_for_review`, …).
- **Short-lived tokens.** Procore access tokens expire quickly; refresh uses the same
  `/oauth/token` endpoint (`grant_type=refresh_token`).
- **No OAuth scopes.** A token can do whatever the signed-in user's Procore permissions allow.
