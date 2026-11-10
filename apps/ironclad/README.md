# Ironclad

- **Triggers** — 5 (poll)

## Triggers

| Key — title | Mechanism | Wrapped action | What the run gets |
|---|---|---|---|
| `new-record` — New Record | poll | `record-list` | Each new contract record |
| `new-or-updated-record` — New or Updated Record | poll | `record-list` | Each newly created or updated contract record |
| `new-workflow` — New Workflow | poll | `workflow-list` | Each newly launched workflow (`lastUpdated` since-filter; optional `status`) |
| `new-or-updated-workflow` — New or Updated Workflow | poll | `workflow-list` | Each workflow launched or updated (deduped on `id:lastUpdated`) |
| `new-or-updated-entity` — New or Updated Entity | poll | `entity-list` | Each legal entity created or edited (`sortField=lastUpdated`, `sortDirection=DESC`) |

`GET /workflows` has no sort argument but takes `lastUpdated` (workflows updated since a UTC date), so the workflow triggers send the date of the last check minus two minutes, read 100 per page, resume a longer window from the saved page number, and never emit a workflow whose own `created`/`lastUpdated` stamp is before the trigger was first checked. Ironclad lists only active workflows unless `status` is given. Not covered: `webhook-list` (webhook registrations, integration setup), `workflow-schemas-list` (launch-form schemas, reference data), `workflow-approvals-list` and `workflow-signers-list` (approval groups and signers carry no ids), `workflow-comments-list` (no documented order or date filter).

Ironclad documents records, workflows and entities at https://developer.ironcladapp.com/reference/list-all-workflows and https://developer.ironcladapp.com/reference/list-all-entities (verified 2026-11-10).

Contract lifecycle management for w6w: launch and track workflows, read and edit the contract
repository (records), manage legal entities, and register webhooks, over the Ironclad Public API v1
(`https://{host}/public/api/v1`).

Verified 2026-10-06 against the OpenAPI document embedded in `developer.ironcladapp.com` and live
probes of the API, OAuth and status hosts.

## Authentication

OAuth only (Ironclad's legacy static tokens are deprecated and not offered). Create an OAuth client
in Ironclad under Company Settings > API.

| Method | Use |
| --- | --- |
| `oauth2`, `oauth2-eu1`, `oauth2-demo` | Authorization Code grant, one method per environment (US `ironcladapp.com`, EU `eu1.ironcladapp.com`, Demo `demo.ironcladapp.com`). Access tokens last 6 hours; refresh tokens rotate on use. |
| `client-credentials` | Client Credentials grant for service identities. Needs a region, client id and secret, and an **acting user** (email or id): every request carries `x-as-user-email` / `x-as-user-id` and runs with that user's permissions. No refresh token exists, so refresh repeats the grant. |

The environments are separate stacks. The connection records its region (`display.region`) and every
Action calls that host. `na1.ironcladapp.com` answers on the API but appears in neither the OpenAPI
`servers` nor this app, so it is not modelled.

Credentials appear only in `sign`. The auth probe is `GET /oauth/userinfo`: it needs no scope and
returns the token's user, company and scopes, never the token.

## Actions (28)

- Workflows: list, get, launch, update attributes, cancel, pause, resume, list approvals, update an
  approval, list comments, add a comment, list signers, list schemas, get schema.
- Records: list, get, create, update, delete, get schema (`/records/metadata`).
- Entities: list, get, create, delete.
- Webhooks: list, create, delete.
- Account: get token user info.

Comment creation needs the `public.records.createComments` scope; the workflows-prefixed
`createComments` scope belongs to the deprecated `POST /workflows/{id}/comment`, which is not used.

## Health

`service` reads `status.ironcladapp.com/api/v2/summary.json` (an incident.io page, `page.name`
"Ironclad Contract Management"). It has 25 components and **none is "API"**, so the check reports the
page-level indicator and lists non-operational components for context. A failing status API is
`unknown`, never `down`. `quota` is `unavailable` at `informational` severity: Ironclad's limits are
per-company buckets by method and path under a 4,500 rpm company cap, and the `X-RateLimit-*` headers
describe only the bucket a request fell in.

## Findings

- A bad or missing bearer gets the same `401 {"code":"UNAUTHORIZED"}` on ANY path under
  `/public/api/v1`, even nonexistent ones, so a 401 never proves a route exists.
- A wrong client secret returns `403 {"error":"unauthorized_client"}` from the token endpoint, not
  401 and not `invalid_client`; a malformed `client_id` returns `400 invalid_request`.
- Cancel, pause, resume and the deletes answer 204 with no body.

## Not covered

Obligations, exports, SCIM, smart import, signature requests, documents, email threads, async
workflow create, multipart file upload (workflow create takes JSON attributes only), record
attachments, and legacy tokens.

## Icon

`assets/icon.svg` embeds the verbatim 256x256 mark, converted losslessly to PNG from the 256x256
entry of `https://status.ironcladapp.com/favicon.ico`. Nothing was drawn.
