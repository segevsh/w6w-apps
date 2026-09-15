# Softr

Read and write records in a Softr app's own **Softr Database** tables, manage that database's
structure, and manage the **users** signed up to a published Softr app — over Softr's two,
separately-hosted first-party APIs.

- **Categories** — databases, spreadsheets, productivity
- **Auth methods** — api-key
- **Actions** — 18
- **Health checks** — 2 (~~`service`~~, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `tables-api.softr.io`, `studio-api.softr.io`
- **Website** — https://www.softr.io/
- **API docs** — https://docs.softr.io/softr-api/api-setup-and-endpoints (Studio Users API) ·
  https://docs.softr.io/softr-api/softr-database-api (Softr Database API)
- **Status page** — https://status.softr.io/ (no machine-readable feed — see Health checks)

> **Everything below was verified against Softr's own documentation on 2026-09-15** —
> `docs.softr.io/softr-api/softr-database-api/*` (an OpenAPI-generated reference, production server
> `https://tables-api.softr.io/api/v1`) and `docs.softr.io/softr-api/api-setup-and-endpoints` (a
> prose setup guide for `https://studio-api.softr.io/v1/api`) — plus live probes against
> `status.softr.io`. Nothing here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. This is not an Airtable/Google Sheets proxy

A Softr *app* (the no-code website/portal a customer builds) can be built on top of an external
Airtable base or Google Sheet. But Softr's own API documents **no endpoint that reads or writes such
a connected external source** — the only records API Softr publishes is for its own native
**Softr Database**: a first-party multi-table store with its own field/view/AI-column model, reached
over `tables-api.softr.io`. If the app you're integrating with is backed by Airtable or Sheets
underneath, there is no Softr-side records API for it at all — use the Airtable or Google Sheets app
directly against that source instead. This app's records actions only ever reach a Softr Database.

### 2. Two hosts, one Personal Access Token, two different auth shapes

Both APIs are authenticated with the exact same **Personal Access Token** — generated the same way,
Softr Dashboard → workspace (top-left) → API tokens — passed in the exact same header name,
`Softr-Api-Key`. But the two hosts scope it differently:

| | Database API (`tables-api.softr.io`) | Studio Users API (`studio-api.softr.io`) |
|---|---|---|
| Scope | One or more **workspaces** (token setting) | One **published app**, per call |
| How the target is named | `databaseId`/`tableId` in the URL path | A `Softr-Domain` header (the app's own domain/subdomain) |

`Softr-Domain` is not secret — it is the target app's own public hostname — so it is sent as an
ordinary action param (`domain`) rather than travelling through the Auth `sign` hook the way the
token itself does. See [`lib/client.ts`](lib/client.ts) for where this is implemented.

### 3. One documented endpoint can't be reached through a static allowlist

`POST /v1/api/users/validate-token` is documented to be called against the Softr app's **own live
domain** — `https://yourdomain.softr.app/v1/api/users/validate-token`, or a connected custom domain —
a value that varies per app and per customer, not a fixed Softr host. It also carries no
`Softr-Api-Key` at all (just a JWT in the body), unlike every other endpoint in this app. Declaring
`network.allow` for an arbitrary per-tenant domain would mean `"*"`, which this pack reserves for
apps whose whole surface is a user-supplied host (a self-hosted install) — not appropriate here, where
every *other* endpoint lives on one of two fixed hosts. **This action is deliberately not
implemented.** If you need to validate a Softr-issued user JWT, call that endpoint directly against
the Softr app's own domain outside this app.

## Auth

One method: `api-key`, type `apiKey`, header `Softr-Api-Key`.

Per Softr's "Authorisation" page: tokens are scoped to one or more **workspaces**, inherit the access
rights of the user who created them, and Personal Access Tokens are the only supported form today
("OAuth access tokens may be supported in the future"). There is no narrower, resource-level scope
documented (unlike, say, Apify's Actor-scoped tokens).

### The probe is `GET /databases`

Neither host documents a `/me`/`/whoami` endpoint, so `GET /databases` — the cheapest read Softr
publishes at all — is the credential-liveness probe. It requires the token (there is no workspace
identity without one), and its response (`id`, `name`, `description`, `workspaceId`, `tablesCount`,
timestamps) carries no credential material. It doubles as the `database-list` action, so the probe
and a genuinely useful read share one code path.

Softr's error envelope is generic and undocumented per status code —
`{"message", "errorCode", "details"}` on a 4xx/5xx, with no enumerated `errorCode` vocabulary for auth
failures specifically. The `test` hook reads that body and surfaces `message`/`errorCode` verbatim
rather than collapsing every non-2xx into a bare "HTTP 401".

## Actions

18 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
|---|---|---|
| `database-list` | search | `GET /databases` |
| `database-get` | read | `GET /databases/{databaseId}` |
| `table-list` | search | `GET /databases/{databaseId}/tables` |
| `table-get` | read | `GET /databases/{databaseId}/tables/{tableId}` |
| `table-views-list` | search | `GET /databases/{databaseId}/tables/{tableId}/views` |
| `record-list` | search | `GET /databases/{databaseId}/tables/{tableId}/records` |
| `record-search` | search | `POST /databases/{databaseId}/tables/{tableId}/records/search` |
| `record-get` | read | `GET .../records/{recordId}` |
| `record-create` | perform | `POST .../records` |
| `record-update` | perform | `PATCH .../records/{recordId}` |
| `record-delete` | perform | `DELETE .../records/{recordId}` |
| `user-create` | perform | `POST /v1/api/users` (Studio API) |
| `user-delete` | perform | `DELETE /v1/api/users/{email}` |
| `user-activate` | perform | `POST /v1/api/users/{email}/activate` |
| `user-deactivate` | perform | `POST /v1/api/users/{email}/deactivate` |
| `user-invite` | perform | `POST /v1/api/users/{email}/invite` |
| `user-magic-link-generate` | perform | `POST /v1/api/users/magic-link/generate/{email}` |
| `user-sync` | perform | `POST /v1/api/users/sync` |

All records/tables/databases endpoints live on `tables-api.softr.io/api/v1`; all Users endpoints
live on `studio-api.softr.io/v1/api`.

### Records: field IDs, not field names, unless you ask

`fields` on Get/Search/Create/Update Record is a map keyed by **field ID** by default — a value like
`fldAbc123`, not the column header a person sees in Softr's UI. Every records action exposes
`fieldNames` (Softr's own query parameter) to key that map by field **name** instead; List Tables
returns the field list (`id`, `name`, `type`) either way, so you can resolve one from the other. Field
IDs are stable across a rename; names are not.

### Search Records' filter grammar is taken verbatim, not re-modelled

Softr's filter condition has four shapes — binary (`IS`, `CONTAINS`, `GREATER_THAN`, …), unary
(`IS_EMPTY`, `IS_NOT_EMPTY`), ternary (`IS_BETWEEN`, `IS_WITHIN`, with `lowerBound`/`upperBound`) and
composite (`AND`/`OR` over a nested `conditions` array) — plus relative-date tokens
(`PREDEFINED:TODAY`, `RELATIVE_DATE:PAST:7`, …) for date bounds. Building a generated form over that
would either drop operators or invent structure Softr never published, so `filter` and `sorting` are
free-form `json` params passed straight through as the documented request body. See
[`lib/params.ts`](lib/params.ts) for the full operator table, copied from the vendor's page.

### Create/Update Record's `fields` payload has no generated form either

Softr documents it as "a map of Field IDs to their values" — the shape is the target table's own
field schema, which this app cannot know ahead of a specific table. Use List Tables to get a table's
field list, then build the `fields` object by hand (or from an upstream workflow step).

### Users (Studio API): no documented response schema

The "API Setup and Endpoints" guide shows a request for each Users endpoint — host, method, path,
headers, body — but not one single example response body, success or error. That's a real
documentation gap, not an oversight on this app's part: every Users action returns the raw parsed
JSON body under `result` rather than asserting field names Softr has never published. `Sync Users`
also has a shape trap worth knowing: with emails, the body is a **bare JSON array**, not an object
(`["a@x.com", "b@x.com"]`); with no emails, the request sends **no body at all** to mean "sync every
user" — sending `[]` would be the (different, narrower) request Softr never describes.

## Health checks

Neither `service` nor `quota` is a live probe — both are declared absences at `severity:
"informational"`, so they never pin this app's rolled-up verdict at `unknown`.

**`service`** — `status.softr.io` answers `200` with ~34KB of client-rendered HTML (a genuine SPA,
not a parked domain), but none of the machine-readable shapes this pack knows how to read exist:
`/api/v2/summary.json`, `/summary.json`, `/index.json`, `/history.atom` and `/history.rss` all `404`.
`softr.statuspage.io` — the obvious guess for an unmigrated legacy page — 302-redirects to
statuspage.io's own marketing site, the signature of an **unclaimed** Statuspage subdomain, so it is
not where Softr actually publishes either.

**`quota`** — the Database API's "Rate Limiting" page documents fixed per-token ceilings only (40
reads/s for `GET`/`POST /search`, 30 writes/s for `POST`/`PUT`/`PATCH`/`DELETE`), refusing with `429`
over the limit; no response header carries a remaining count or reset time. The Studio Users API
documents no rate limit and no headers at all. The only signal either host gives is the `429` itself,
which arrives after the request was already refused — nothing to read *in advance*.

## Layout

```
softr/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts             # TablesClient + StudioClient, error formatting, encodeId/toList
│   └── params.ts             # shared Param fragments (ids, pagination, filter/sorting, domain/email)
├── auth/api-key.ts           # apiKey: sign, test
├── actions/                  # one file per action (18)
├── health/
│   ├── service.ts            # declared absence, informational
│   └── quota.ts              # declared absence, informational
├── assets/icon.svg           # vendor mark
└── tests/                    # entry module, every action, auth, health
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt`
deno task test
```
