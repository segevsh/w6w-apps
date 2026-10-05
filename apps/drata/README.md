# Drata

Read compliance state from Drata (workspaces, users, personnel, controls, monitoring tests,
evidence, vendors, risks, policies, devices, assets, events) and write vendors, risks and evidence,
on the **Drata public API v2**.

- **Categories** — legal, security
- **Auth methods** — api-key (bearer)
- **Actions** — 27 (14 lists, 8 reads, 5 writes)
- **Health checks** — `service`, `quota` (declared unavailable, `informational`) + the derived
  `auth:api-key`
- **Egress allowlist** — `public-api.drata.com`, `public-api.eu.drata.com`,
  `public-api.apac.drata.com` (the `service` check adds `status.drata.com` to its own hook
  allowlist, never to the app's)
- **Website** — https://drata.com/
- **API docs** — https://developers.drata.com/openapi/reference/v2/overview/
- **Status page** — https://status.drata.com/

> Verified 2026-10-05 against the OpenAPI document embedded in the developer portal's page data
> (145 paths) and live probes of `status.drata.com`. Nothing here came from a third-party
> integration directory.

## Things most likely to go wrong

1. **Region.** A key only works on its own region's host (`us`, `eu`, `apac`); the wrong host
   answers 401, which reads as a bad key. Region is a field on the connection and is published to
   actions through `afterConnect` (never the key).
2. **412 on every call.** The user who owns the API key must have accepted Drata's terms in the web
   app once. The error message says so.
3. **403 is per key.** Each endpoint needs one named permission (`x-drata-permissions`, e.g.
   `vendors-get`). A scoped key is a supported configuration; the connection test accepts a
   Drata-shaped 403.
4. **Related objects need `expand[]`.** Responses carry ids only unless you ask. Every list/read
   exposes an `expand` input.
5. **Pagination is cursor-based.** `cursor` + `size` (1-500; this app defaults to 25). List actions
   return `{items, nextCursor, totalCount}`; pass `nextCursor` back as `cursor`. `totalCount` is
   only populated when `includeTotalCount` is set.

## Auth

`Authorization: Bearer <API key>` (OpenAPI `securitySchemes.bearer`, `bearerFormat: API_KEY`).
The credential is only seen by `sign`. The connection test is `GET /workspaces?size=1`: it needs
only `workspaces-get`, returns workspace names (no credential material, unlike probes such as
Mailjet's `/apikey`), and exists on every account. It is classified from the body: 2xx ok; 403 with
Drata's `{statusCode, message, code}` body ok (key accepted, permission missing); 401 and 412 not
ok; a 403 that is not Drata-shaped (proxy, WAF) is not ok.

## Actions

Lists: `workspace-list`, `user-list`, `personnel-list`, `control-list`, `monitoring-test-list`,
`monitoring-test-failures-list`, `evidence-list`, `vendor-list`, `risk-register-list`, `risk-list`,
`policy-list`, `device-list`, `asset-list`, `event-list`.

Reads: `company-get`, `personnel-get`, `control-get`, `monitoring-test-get`, `evidence-get`,
`vendor-get`, `risk-get`, `policy-get`.

Writes:

- `vendor-create` — `POST /vendors` (non-idempotent). The contact email field is `contactEmail`.
- `vendor-update` — `PUT /vendors/{id}` (idempotent). The same field is spelled `contactsEmail`
  here; Drata's own inconsistency, mirrored exactly.
- `risk-create` — `POST /risk-registers/{id}/risks`. Owner and control ids are comma-separated
  inputs, wrapped as `{id}` objects.
- `evidence-create` — `POST /workspaces/{id}/evidence`. One artifact from flat fields (`URL`,
  `S3_FILE` or `TICKET_PROVIDER`) or an `artifacts` JSON array. Uses the current `/evidence`
  API, not the superseded `/evidence-library`.
- `evidence-file-upload` — `POST /workspaces/{id}/evidence-files`. Multipart with a `base64File`
  part holding a JSON string `{base64String: <data URL>, filename}`; returns the `fileKey` to put
  in an `S3_FILE` artifact.

## Health checks

- **`service`** — `status.drata.com` is a real Atlassian Statuspage (`page.name` "Drata"; an
  unknown path 404s, so it is not a catch-all). It has components `Public API <US|EU|APAC>` and
  `API <US|EU|APAC>`; the check reads only the connection's own region (`credential: "context"`),
  ignoring the Agent, Auditor and Webhook products. A failing or reshaped page is `unknown`, never
  `down`.
- **`quota`** — unavailable, severity `informational`. Drata documents 500 requests/minute per IP
  address and no rate-limit header or 429 response, so no headroom can be read.

## Deliberately not covered

Audit Requests, Audits, Background Checks, Compliance Check Exclusions, Control Library, Control
Notes, Control Owners, Custom Connections, Custom Data Records, Custom Field Definitions, Device
Documents, Frameworks, Groups, HRIS User Identities, Policy Languages, Procurement Connection
Mappings, Risk Documents, Risk Library, Risk Notes, Standard Connections (AWS/Azure/GCP/GitLab),
Tasks, Uploads, User Documents, a user's assigned policies, Roles, Vendor Documents, Vendor
Security Reviews, Vendor Types, event download jobs, personnel write actions and the `*-search`
endpoints.

## Icon

`assets/icon.svg` wraps the vendor's own 192x192 PNG
(`developers.drata.com/icons/icon-192x192.png`) as base64; it is not redrawn. Format with
`deno task fmt`, never bare `deno fmt`.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

Layout: `actions/`, `auth/api-key.ts`, `health/`, `lib/client.ts` (region hosts, `DrataClient`,
error formatting), `lib/params.ts` (shared inputs and enums), `tests/` (mocked `HookContext` in
`tests/_helpers.ts`).
