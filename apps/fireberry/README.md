# Fireberry

Read, create, update, delete and query records across any Fireberry (formerly Powerlink) CRM object,
and read object, field and picklist metadata, over the **Fireberry API**.

- **Categories** — crm
- **Auth methods** — token (API access token, sent as a `tokenid` header)
- **Actions** — 14
- **Health checks** — `service` (fireberry.statuspage.io, `API` component), `api` (unsigned
  reachability), `quota` (declared absence, informational) + the derived `auth:token`
- **Egress allowlist** — `api.fireberry.com`
- **API docs** — https://developers.fireberry.com/reference
- **Icon** — the vendor's own site icon, downloaded verbatim from
  `https://cdn.prod.website-files.com/62dd2d4e17b06b9a1df8fdfd/62de3cd2029d0241d2595ef9_Artboard%201icon.png`
  on 2026-10-06 (`assets/icon.png`, 256x256 PNG). The mark is a black disc, so `assets/icon.dark.svg`
  composes that same PNG, unaltered, on a white plate for the dark theme.

Built on 2026-10-06 from the OpenAPI block embedded in each `developers.fireberry.com/reference/<op>.md`
page and the guides under `/docs`, plus unauthenticated probes of `api.fireberry.com`. No live token
was available, so no authenticated response has been observed.

## Things most likely to go wrong

1. **The token goes in a `tokenid` header, not `Authorization`.** (The metadata reference pages
   declare the key as a query parameter; the authentication guide and every other page say header,
   which is what this app sends.) The token acts as its owner: lists return only the records that
   user may see, so an empty list can mean "no permission", not "no data".
2. **One endpoint takes a name or a number, but the names are not what the UI calls things.** Support
   tickets are `cases`, meetings are `activity`, phone calls are `calllog`, assets are
   `accountproduct`, orders are `crmorder`, users are `crmuser`, and the invoice family is
   `invoice` (transactions!), `invoiceno` (invoices), `invoicereno`, `invoicereceipt`, `invoicecredit`,
   `invoicedelivery`, `invoicedraft`. Custom objects (number 1000 and up) are addressed by number.
   Batch and related-record calls take the object **number** only; read it from **Get Objects**.
3. **Three different pagination schemes.** `GET` lists use `pagesize` (max 50) and `pagenumber`
   (max 10), so they reach 500 records at most; the v3 query uses `pageSize` (1-500) and
   `pageNumber` and returns `isLastPage`; the legacy query used `page_size`/`page_number` (not
   exposed here).
4. **Errors have no single shape.** Legacy routes answer `{"Message": "..."}` (capital M), v3 routes
   `{"message": "..."}` or `{"error":"Unauthorized","status":401,"message":"..."}`, and a legacy 401
   has an **empty body**. A 200 with `success: false` is treated as a failure.
5. **Rate limits are per organisation, per minute and per day.** 100 requests/minute, and a daily
   cap by plan (Free 500, Standard 10,000, Professional 25,000, Enterprise 50,000) that resets at
   00:00 UTC. Failed requests count, and so do SDK calls. 429 once either is exceeded.
6. **Batch calls are not on every licence**, take at most 20 records, and skip invalid records while
   creating or updating the valid ones, so check the result. Their response shape is undocumented, so
   it is returned verbatim under `result`.

## Actions

| Area     | Actions                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Records  | `record-list`, `record-get`, `record-create`, `record-update`, `record-delete`, `record-list-related` |
| Batch    | `records-batch-create`, `records-batch-update`                                                       |
| Query    | `query-records` (v3: filter, order, group, aggregate)                                                |
| Metadata | `object-list`, `object-get`, `field-list`, `field-get`, `picklist-values`                            |

## Not covered

- Per-object typed field schemas (the reference lists a fixed field set per built-in object; custom
  fields vary per tenant, so `fields` is a JSON object keyed by system field name — read them with
  **Get Object Fields**).
- Batch delete (the reference page has no OpenAPI definition), custom object and custom field
  creation/update/delete, files, and the legacy `POST /api/query` (marked "Legacy"; the v3 query
  replaces it).
- Note: the v3 query's OpenAPI document is titled "Development/staging API spec for unreleased
  endpoints" while its guide is published; it is included because both describe the same shape.

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /metadata/records` (the object list;
  its body is object metadata, never the token). A `{success:true, data:[…]}` body is a pass; a 401
  is a rejected token; a 403 is a recognised token with limited permissions, still a pass; 429, 5xx
  and non-JSON bodies are reported as such, never as a bad token.
- **service** — `fireberry.statuspage.io` is Fireberry's own Statuspage (linked from
  www.fireberry.com, page id `38bggw1y3d14`, name "Fireberry", 17 components). The `API` component
  decides; the others are detail. A wrong page, missing component, 5xx or bad JSON is `unknown`.
- **api** — unsigned `POST /api/v3/query` with `{}`; the JSON 401 `{"error":"Unauthorized",…}` is a
  pass. A bodiless 401 is only `degraded`, since it could come from any intermediary.
- **quota** — declared absence (`severity: informational`): the vendor documents ceilings but no
  headers or consumption endpoint.
