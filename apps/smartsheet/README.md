# Smartsheet

Read and write Smartsheet sheets, rows, cells and columns; list workspaces, folders, users and
reports, on the **Smartsheet API 2.0**.

- **Categories** — spreadsheets, productivity
- **Auth methods** — access-token
- **Actions** — 16
- **Egress allowlist** — `api.smartsheet.com`
- **Website** — https://www.smartsheet.com
- **API docs** — https://developers.smartsheet.com/api/smartsheet/openapi
- **OpenAPI spec** — https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml

> **Smartsheet's API is restricted to Business and Enterprise plans.** The spec's own preamble says
> so. A token from a lower plan will fail here through no fault of this app.

## The docs moved twice, and both old links still return 200

This is worth stating plainly because the usual "does the link work?" test passes on two URLs that
are both dead ends. **Verified 2026-08-03:**

| Link | HTTP | Reality |
| --- | --- | --- |
| `https://smartsheet-platform.github.io/api-docs/` | **200** | 231-byte redirect stub: `<title>Redirecting to https://smartsheet.redoc.ly/</title>`. Its [repo](https://github.com/smartsheet-platform/api-docs) README reads "Smartsheet API Documentation Has Moved!" |
| `https://smartsheet.redoc.ly/` | **200** | Also superseded. Its own spec is titled **`(DEPRECATED site)`** and says "The new Smartsheet API reference documentation site is located at https://developers.smartsheet.com/api" |
| `https://developers.smartsheet.com/api/smartsheet/` | **404** | The bare path 404s — a trap for anyone copying the string out of the deprecation notice |
| **https://developers.smartsheet.com/api/smartsheet/openapi** | **200** | The live reference |

> **Note for whoever maintains the candidate list:** our entry for this app cites
> `https://smartsheet-platform.github.io/api-docs/`. That URL returns 200 but serves a redirect
> stub, and its target is *itself* deprecated. It should be updated to
> https://developers.smartsheet.com/api/smartsheet/openapi.

### What this app was actually built from

The Redocly-hosted portal serves a machine-readable OpenAPI 3.0.3 document at
**https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml** — 1.6 MB,
`application/yaml`, `info.title: "Smartsheet OpenAPI Reference"`, 185 operations. Every path, query
parameter, request body, enum and response envelope in this app was read out of that document
rather than recalled, and the live API was probed directly to confirm auth and error behaviour.

## Rows and cells: the model, honestly

**A cell is a `(columnId, value)` pair. There is no by-column-title form anywhere in the API.**

A Row is `{ id, rowNumber, cells: [...] }`, and each cell is `{ columnId, value }` (or `formula`, or
`objectValue`). Smartsheet's own request body documentation for Add Rows says it in as many words:
each cell object is "limited to the following attributes: **columnId** (required), one of the
following (required): **formula** / **value** / **objectValue**".

Column titles are renamable in the UI and are not unique by contract, so there is nothing for the
API to key on. This app therefore **refuses to fake a title-keyed path**. A convenience shim that
mapped titles to ids behind the scenes would write to the wrong column the moment two columns share
a title or somebody renames one — silently, because Smartsheet returns `SUCCESS` for a write to a
valid-but-wrong column.

### How to write a cell

Resolve titles to ids **once per sheet** with **List Columns**, then feed the ids in. The ids are
stable for the life of the column, so this does not belong inside a per-row loop.

```jsonc
// Add Rows → Cells, the map form: column id → value
{ "7960873114331012": "In Progress", "642523719853956": 42 }

// Add Rows → Cells, the array form: for formula / objectValue / hyperlink / strict
[
  { "columnId": 7960873114331012, "formula": "=SUM(Cost:Cost)" },
  { "columnId": 642523719853956, "value": "site", "hyperlink": { "url": "https://example.com" } }
]
```

Both forms go through one function (`lib/client.ts` → `toCells`), which is where the rule is
enforced. A title-keyed map like `{"Status": "Done"}` fails loudly with
`Status: "Status" is not an integer id` rather than writing nowhere.

Three behaviours that are easy to get wrong and are pinned by tests:

- **Clearing vs. leaving alone.** Sending `""` clears a cell ("Empty string values are converted to
  null"). *Omitting* the cell leaves it untouched. They are different instructions and are not
  collapsed.
- **`false` and `0` survive.** A checkbox `false` and a number `0` are real values, not absences.
- **Map key order is numeric, not source order.** ECMAScript orders integer-like object keys by
  ascending numeric value, so `{"20": …, "3": …}` emits column 3 first. Harmless — the `cells` array
  carries no positional meaning — but use the array form if you need a fixed order.

### Ids are strings in, numbers on the wire

Smartsheet ids are int64 and run to 16 digits (`8896508249565060`). `Number.MAX_SAFE_INTEGER` is
`9007199254740991` — so real ids fit, but only just. Every id in this app travels as a **string**
through params and URL paths, where no numeric conversion happens; `toId` is the single point where
one becomes a JSON number for a request body, and it **throws rather than round**. An id past the
safe range is refused with a message saying so, instead of quietly addressing a different column.

### There is no "list rows" endpoint

Rows are not an independently listable collection. The only ways to get many are **Get Sheet**
(narrowed with `rowIds`, `rowNumbers`, `rowsModifiedSince` or `columnIds`) and **Search Sheet**. No
`list-rows` action is shipped, because dressing `GET /sheets/{id}` up as one would misrepresent its
paging — those params page the *sheet*, not a row collection.

## `include` and `exclude` change the response shape

These are not size knobs. Getting them wrong changes what a downstream step can read, so every enum
below is transcribed from the OpenAPI document, and each is sent as **one comma-separated param**
(`?include=a,b`), never as a repeated one.

| Endpoint | `include` | `exclude` |
| --- | --- | --- |
| **Get Sheet** | `attachments`, `columnType`, `crossSheetReferences`, `discussions`, `filters`, `filterDefinitions`, `format`, `ganttConfig`, `objectValue`, `ownerInfo`, `proofs`, `rowPermalink`, `source`, `writerInfo` | `filteredOutRows`, `linkInFromCellDetails`, `linksOutToCellsDetails`, `nonexistentCells` |
| **Get Row** | `columns`, `filters` | same four as Get Sheet |
| **List Sheets** | `sheetVersion`, `source` | — |
| **List Reports** *(Get Report)* | `attachments`, `discussions`, `proofs`, `format`, `objectValue`, `scope`, `source`, `sourceSheets` | `linkInFromCellDetails`, `linksOutToCellsDetails` |
| **Search** | `favoriteFlag` | — |
| **List Container Children** | `source`, `ownerInfo` | — |
| **Create Sheet** *(from template)* | `attachments`, `cellLinks`, `data`, `discussions`, `filters`, `forms`, `ruleRecipients`, `rules` | — |

Three that matter more than the rest:

- **`include=columnType`** (Get Sheet) puts each cell's column type on the cell. Without it you have
  a value and no idea what it means.
- **`include=columns`** (Get Row) returns the sheet's full column list alongside the row — the only
  way to decode that row's `columnId`s in a single call.
- **`exclude=nonexistentCells`** drops empty cells, which makes each row's `cells` array **sparse**.
  Code that walks cells positionally breaks. This is the strongest reason cells must be matched on
  `columnId` and never on index.

`level` (`0` / `1` / `2`) is a separate axis — it decides whether multi-contact and multi-picklist
data comes back as plain text or as structured columns, and `include=objectValue` only does anything
when paired with it.

## Pagination — three different schemes

| Scheme | Params | Envelope | Used by |
| --- | --- | --- | --- |
| **Page-numbered** | `page`, `pageSize`, `includeAll` | `{ data, pageNumber, pageSize, totalPages, totalCount }` | List Sheets, List Columns, List Users, List Reports, Get Sheet (its rows) |
| **Token** | `maxItems`, `lastKey` | `{ data, lastKey }` | List Workspaces, List Container Children |
| **None** | — | `{ results, totalCount }` | Search, Search Sheet |

Three things that trip people up, all encoded in the params rather than left to a reader:

- **`includeAll=true` is mutually exclusive with `page`/`pageSize`** — Smartsheet ignores both when
  it is set. This app only sends the flag when it is true.
- **`maxItems` has a minimum of 100**, not just a default of 100. Asking for 10 is out of range.
- **Search returns `results`, not `data`.** Every other list in this API uses `data`. A step reading
  `data` off a search response gets `undefined`, silently, forever.

## Actions

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-sheets` | read | `GET /sheets` |
| `get-sheet` | read | `GET /sheets/{sheetId}` |
| `create-sheet` | perform | `POST /workspaces/{id}/sheets` · `POST /folders/{id}/sheets` · `POST /sheets` |
| `get-row` | read | `GET /sheets/{sheetId}/rows/{rowId}` |
| `add-rows` | perform | `POST /sheets/{sheetId}/rows` |
| `update-rows` | perform | `PUT /sheets/{sheetId}/rows` |
| `delete-rows` | perform | `DELETE /sheets/{sheetId}/rows?ids=` |
| `list-columns` | read | `GET /sheets/{sheetId}/columns` |
| `add-column` | perform | `POST /sheets/{sheetId}/columns` |
| `list-workspaces` | read | `GET /workspaces` |
| `list-container-children` | read | `GET /workspaces/{id}/children` · `GET /folders/{id}/children` |
| `search` | search | `GET /search` |
| `search-sheet` | search | `GET /search/sheets/{sheetId}` |
| `list-users` | read | `GET /users` |
| `get-current-user` | read | `GET /users/me` |
| `list-reports` | read | `GET /reports` |

Notes on the three that are not a straight one-to-one mapping:

- **`create-sheet`** covers three endpoints because Smartsheet has no single create path. Giving a
  workspace id or a folder id picks the supported one; giving neither falls back to `POST /sheets`,
  which the spec marks **DEPRECATED** ("The Sheets folder is being replaced by workspaces"). Three
  separate actions would have made the deprecated one look like a peer.
- **`list-container-children`** is how you list **folders**. There is no `GET /folders`, and in the
  current API no `GET /folders/{id}` either — that path declares only `PUT` and `DELETE`. Metadata
  moved to `/folders/{id}/metadata`, contents to `/folders/{id}/children`. `GET /home/folders` still
  exists but is deprecated for the same reason as `POST /sheets`.
- **`add-rows`** exposes the row location as one choice (`toBottom` / `toTop` / `parentId` /
  `parentIdToBottom` / `siblingId` / `siblingIdAbove`) plus an anchor row id, rather than six loose
  booleans. Smartsheet's rule is "use only one location-specifier attribute per request, unless you
  use **parentId** and **toBottom** or **siblingId** and **above**" — encoding it as one enum makes
  the illegal combinations unrepresentable instead of merely discouraged. `indent`/`outdent` live on
  `update-rows`, because they only apply to rows that already exist.

### Verified, but deliberately not shipped

These endpoints are real and were confirmed in the spec; they are simply outside this app's scope
today, and saying so is better than leaving a silent gap:

- **Attachments** — `GET/POST /sheets/{id}/attachments`, `.../rows/{rowId}/attachments`,
  `.../attachments/{attachmentId}` and its `/versions`. Listing works over plain JSON, but *posting*
  one is a `multipart/form-data` or raw-binary upload, which this app's JSON client does not model —
  shipping only the read half would be a half-integration.
- **Discussions and comments** — `GET/POST /sheets/{id}/discussions`,
  `.../discussions/{id}/comments`, `.../rows/{rowId}/discussions`. Coherent and JSON-only; left out
  to keep the surface tight around the sheet/row/cell model this app is actually about.
- **Webhooks** — `GET/POST /webhooks` and friends. These belong in a `TriggerDefinition`, not an
  action, and triggers are out of scope here.
- **Regional hosts** — the spec declares `api.smartsheet.eu` and `api.smartsheet.au` (plus a
  separate Gov endpoint) alongside the commercial host. Only `api.smartsheet.com` is called and only
  it is allowlisted; supporting a region means widening `w6w.network.allow` and should be done
  deliberately.

## Auth

**`access-token`** — an API access token, sent as `Authorization: Bearer <token>`. Generate one at
**Smartsheet → Account → Personal Settings → API Access → Generate new access token**
([help article](https://help.smartsheet.com/articles/2482389-generate-API-key)).

The OpenAPI document declares this as `{"type": "http", "scheme": "bearer"}` under `APIToken`, and
`GET /users/me` additionally declares an explicit `Authorization` header "used to authenticate
requests to Smartsheet APIs". Confirmed live on 2026-08-03:

```
GET /2.0/users/me                            → 403 {"errorCode":1004,"message":"You are not authorized to perform this action."}
GET /2.0/users/me  Authorization: Bearer bogus → 401 {"errorCode":1002,"message":"Your Access Token is invalid."}
```

The credential reaches only the `sign` hook, which stamps the header and returns; no action builds
one.

### OAuth 2.0 exists and is not shipped

The same document declares an authorization-code flow:

- `authorizationUrl` — `https://app.smartsheet.com/b/authorize`
- `tokenUrl` — `https://api.smartsheet.com/2.0/token`
- 17 scopes: `READ_SHEETS`, `WRITE_SHEETS`, `ADMIN_SHEETS`, `CREATE_SHEETS`, `DELETE_SHEETS`,
  `READ_SIGHTS`, `ADMIN_SIGHTS`, `CREATE_SIGHTS`, `DELETE_SIGHTS`, `SHARE_SHEETS`, `SHARE_SIGHTS`,
  `READ_USERS`, `ADMIN_USERS`, `ADMIN_WORKSPACES`, `ADMIN_WEBHOOKS`, `READ_CONTACTS`, `READ_EVENTS`

The access token ships instead because it needs no app registration, no redirect URI and no client
secret, and it carries the full permissions of the user who minted it — so no action here can fail
for want of a scope the connect flow forgot to request. OAuth is the right choice for a multi-org
listed integration; add it as a second `AuthDefinition` when that is needed. It is **not** stubbed,
because a half-wired OAuth method is worse than an absent one.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.smartsheet.com>

```
GET https://status.smartsheet.com/api/v2/summary.json
```

Atlassian Statuspage. `summary.json` is one request that carries both the rollup
(`status.indicator` ∈ `none` / `minor` / `major` / `critical`) and the per-component breakdown.

**The endpoint was verified genuine, both ways, on 2026-08-03** — the failure mode being guarded
against is an unclaimed subdomain that answers 200 with somebody else's marketing page:

1. **Bogus sibling paths.** `GET /api/v2/bogus-not-real.json` and `GET /api/v2/summary-nope.json`
   both return **404** with a zero-byte body, while `/api/v2/summary.json` returns **200**. A
   catch-all origin answers everything alike; this one does not.
2. **Content type and body.** `summary.json` is `application/json; charset=utf-8`, 28,897 bytes, and
   opens `{"page":{"id":"tvv76p250rdk","name":"Smartsheet","url":"https://status.smartsheet.com"…}`
   followed by this vendor's own component names — "Core Application", "Email Notifications" — each
   carrying a Statuspage status word. The sibling `/api/v2/status.json` independently returns
   `{"status":{"indicator":"none","description":"All Systems Operational"}}`. That is Statuspage's
   schema populated with Smartsheet's data: not HTML, and not a placeholder.

A status page that itself fails reports `unknown`, never `down` — a broken status page says nothing
about the vendor.

### Is this credential live?

This is what the Auth `test` hook does — the only one of the three the app performs itself.

```
GET /2.0/users/me
```

The scope-free whoami. Every token can read its own user, with no sheet, no workspace and no admin
right involved. `GET /sheets` would report a working token as broken for a user who owns nothing;
`GET /users` would do so for anyone who is not a System Admin.

### Do we have quota left?

**No probe is possible, and this is a checked finding rather than an assumption.**

Smartsheet documents the limits clearly: **300 requests per minute per API token** in general,
**30 per minute** on the heavy endpoints (attachment upload, cell images, sheet copy, publish,
`imageurls`), and `errorCode 4003 "Rate limit exceeded."` once you cross one.

What it does not publish is any way to read your remaining allowance. The
[rate-limiting guide](https://developers.smartsheet.com/api/smartsheet/guides/advanced-topics/scalability-options)
names no response header, and three live calls to `api.smartsheet.com` on 2026-08-03 —
`200 /serverinfo`, `401 /users/me` with a bad token, and a `404` on a bogus path — returned the same
header set, containing no `RateLimit`, no `X-RateLimit-*` and no `Retry-After`. The only
Smartsheet-specific headers present (`x-smar-halo-version`, `x-smar-halo-release`) are build
identifiers. A "quota" probe could therefore only report the constant 300, which is a number from a
document, not a reading.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |

`status.smartsheet.com` is reachable **only inside the `service` hook's worker** — not from any
action, and not from the other checks. The spec allows that widening precisely because the check is
unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

**`quota` is declared absent** for the reason above. A declared absence always reports `unknown`, so
it carries `severity: "informational"` — otherwise it would pin every verdict for this app at
`unknown` forever.

## Icon

`assets/icon.svg` is Smartsheet's own mark, taken verbatim from the official logo file the vendor
serves at
<https://www.smartsheet.com/sites/default/files/2022-10/smartsheet-logo-horizontal.svg>. That file
is the horizontal lockup — symbol plus wordmark — in Smartsheet's brand navy `#041C4E`. The symbol
occupies `x 0.3–50.4, y 12.4–73.9` of its `0 0 454 74` viewBox, so the icon here is that single
path, unmodified, with the viewBox cropped to `0 12 51 62`. The path data and the fill colour are
the vendor's; only the crop is ours.

n8n has no Smartsheet node, so there was no upstream mark to port. Smartsheet's brand portal
(<https://www.smartsheet.com/brand>) is a JavaScript-only Brandfolder app and serves no directly
fetchable SVG; replace this file if an official square mark is ever sourced from it.

## Links

All verified to return HTTP 200 on 2026-08-03.

- **Vendor site** — https://www.smartsheet.com
- **Developer portal** — https://developers.smartsheet.com/
- **API reference (used to build this app)** — https://developers.smartsheet.com/api/smartsheet/openapi
- **OpenAPI 3.0.3 document** — https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml
- **Introduction / guides** — https://developers.smartsheet.com/api/smartsheet/introduction
- **Getting started** — https://developers.smartsheet.com/api/smartsheet/guides/getting-started
- **Rate limiting & bulk operations** — https://developers.smartsheet.com/api/smartsheet/guides/advanced-topics/scalability-options
- **Pagination** — https://developers.smartsheet.com/api/smartsheet/guides/basics/pagination
- **Rows (include flags, location specifiers)** — https://developers.smartsheet.com/api/smartsheet/openapi/rows
- **Cells (the columnId contract)** — https://developers.smartsheet.com/api/smartsheet/openapi/cells
- **Columns (types and symbols)** — https://developers.smartsheet.com/api/smartsheet/openapi/columns
- **Error codes** — https://developers.smartsheet.com/api/smartsheet/error-codes
- **Changelog** — https://developers.smartsheet.com/api/smartsheet/changelog
- **Docs page index (markdown)** — https://developers.smartsheet.com/llms.txt
- **Generate an API access token (help centre)** — https://help.smartsheet.com/articles/2482389-generate-API-key
- **Status page** — https://status.smartsheet.com
- **GitHub org** — https://github.com/smartsheet
- **Official JavaScript SDK** — https://github.com/smartsheet/smartsheet-javascript-sdk
- **Official Python SDK** — https://github.com/smartsheet/smartsheet-python-sdk
- **Brand assets portal** — https://www.smartsheet.com/brand (JS-only Brandfolder; see *Icon* above)

Superseded, listed so nobody re-adopts them — both return 200 and both are dead ends:

- ~~`https://smartsheet-platform.github.io/api-docs/`~~ — redirect stub (repo:
  https://github.com/smartsheet-platform/api-docs, README: "Smartsheet API Documentation Has Moved!")
- ~~`https://smartsheet.redoc.ly/`~~ — spec titled `(DEPRECATED site)`

---

Researched and endpoint-verified against Smartsheet's live OpenAPI document and the live API on
2026-08-03. Every path, parameter, enum and response envelope in this app was read out of that
document rather than recalled. Status surfaces move; re-check with `_tools/audit.ts` conventions in
mind if a probe starts failing for everyone at once.
