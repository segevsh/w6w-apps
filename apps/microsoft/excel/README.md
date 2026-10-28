# Microsoft Excel

Read and write Excel workbooks stored in OneDrive for Business or SharePoint, through the Microsoft
Graph workbook API.

- **Categories** — spreadsheets, productivity
- **Auth methods** — oauth2
- **Actions** — 16
- **Egress allowlist** — `graph.microsoft.com`
- **API version** — Microsoft Graph **v1.0** (`https://graph.microsoft.com/v1.0`). `beta` is not
  used.

## Work or school accounts only

This is the first thing to know, because it is a hard boundary rather than a preference. The Excel
REST API does not serve consumer OneDrive:

> Support for workbooks stored in OneDrive Consumer platform is still not available. At this time,
> only the files stored in business platform are supported by Excel REST APIs.

The permissions tables agree: `createSession`, the worksheets list and `usedRange` all say
_Delegated (personal Microsoft account): **Not supported**_. So the OAuth flow targets the
`organizations` tenant segment rather than `common` — a personal account would otherwise complete
the consent screen and then fail on the first real call, which is a worse failure than being turned
away at the door.

Only `.xlsx`-family workbooks work. The API "supports only Office Open XML file formatted workbooks.
The `.xls` extension workbooks aren't supported", which is why List Workbooks filters for `.xlsx` /
`.xlsm` and deliberately excludes `.xls`.

## Addressing a workbook

There is no `/workbooks/{id}` collection. Every Excel resource hangs off a **driveItem**, in one of
exactly two documented forms — and every action here takes both:

| Param                 | Produces                                    |
| --------------------- | ------------------------------------------- |
| **Workbook item ID**  | `/me/drive/items/{item-id}/workbook/…`      |
| **File path**         | `/me/drive/root:/{item-path}:/workbook/…`   |

Set one or the other, never both — supplying both is rejected rather than silently preferred,
because the two can point at different files and quietly operating on the wrong workbook is the
worst outcome available.

The `:` characters in the path form are structural delimiters, so the path is encoded
**segment-by-segment** (`Q3 Reports/Final.xlsx` → `Q3%20Reports/Final.xlsx`) and the delimiters are
left alone. All of that lives in one function, `workbookPath()` in `lib/client.ts`.

Use **List Workbooks** to turn a filename into an item id. It is the only action here that is not a
workbook call — it is `GET /me/drive/root/search(q='…')`, because the item id has to come from
somewhere.

Worksheet, table and chart identifiers accept `{id|name}` in the same position. Ids are GUIDs wrapped
in literal braces (`{00000000-0001-0000-0000-000000000000}`), which the reference is explicit must be
URL-encoded; that happens for you. A **name** survives a workbook being moved; an **id** survives a
rename. Pick accordingly.

## The session model

This is the part of the Excel API most likely to be got wrong, so it gets its own section.

Excel calls run in one of **three** modes, selected entirely by whether the `workbook-session-id`
request header is present and what kind of session minted it:

| Mode                       | Header                     | Changes                       | Expiry                    |
| -------------------------- | -------------------------- | ----------------------------- | ------------------------- |
| **Persistent session**     | id from `persistChanges: true`  | **Saved** to the file    | ~5 min of inactivity      |
| **Non-persistent session** | id from `persistChanges: false` | **Discarded** on expiry  | ~7 min of inactivity      |
| **Sessionless**            | _no header_                | **Saved** to the file         | n/a                       |

The counter-intuitive row is the last one. Microsoft is blunt about it:

> The session header is not required for an Excel API to work. However, we recommend that you use
> the session header to improve performance. If you don't use a session header, changes made during
> the API call _are_ persisted to the file.

**So a session is a performance control and a discard-my-work control — it is not a save control.**
Omitting the header is not a dry run. If you want to calculate against a workbook without altering
it, you need a *non-persistent* session, not no session.

Practically:

1. **Create Session** with `Persist changes` on, and thread the returned `sessionId` through the
   `Workbook session ID` param of every subsequent action in the run. Sessionless calls make Excel
   locate the workbook from scratch each time, which the docs call out as inefficient.
2. **Close Session** when you are done, rather than waiting out the inactivity timeout. It is the one
   endpoint where `workbook-session-id` is **required** rather than optional — it is the argument,
   not a modifier — so `sessionId` is a required param on that action alone.
3. An expired id makes subsequent calls answer **`404`**. Recover by creating a new session; there is
   no refresh call.

`Prefer: respond-async` — Graph's long-running-operation form of `createSession`, which answers
`202 Accepted` plus a `Location` header to poll — is deliberately not used. An action that returned a
polling URL instead of a session id would not compose with the rest of this App.

## Actions

### Workbook (3)

| Action         | Graph endpoint                                                       |
| -------------- | -------------------------------------------------------------------- |
| List Workbooks | `GET /me/drive/root/search(q='…')`                                   |
| Create Session | `POST {workbook}/createSession`                                      |
| Close Session  | `POST {workbook}/closeSession`                                       |

### Worksheet (4)

| Action           | Graph endpoint                                     |
| ---------------- | -------------------------------------------------- |
| List Worksheets  | `GET {workbook}/worksheets`                        |
| Add Worksheet    | `POST {workbook}/worksheets/add`                   |
| Update Worksheet | `PATCH {workbook}/worksheets/{id\|name}`           |
| Delete Worksheet | `DELETE {workbook}/worksheets/{id\|name}`          |

### Range (4)

| Action         | Graph endpoint                                                              |
| -------------- | --------------------------------------------------------------------------- |
| Get Range      | `GET {workbook}/worksheets/{id\|name}/range(address='…')`                   |
| Update Range   | `PATCH {workbook}/worksheets/{id\|name}/range(address='…')`                 |
| Clear Range    | `POST {workbook}/worksheets/{id\|name}/range(address='…')/clear`            |
| Get Used Range | `GET {workbook}/worksheets/{id\|name}/usedRange(valuesOnly=true)`           |

### Table (4)

| Action          | Graph endpoint                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| List Tables     | `GET {workbook}/tables` · `GET {workbook}/worksheets/{id\|name}/tables`        |
| Add Table       | `POST {workbook}/tables/add` · `POST {workbook}/worksheets/{id\|name}/tables/add` |
| List Table Rows | `GET {workbook}/tables/{id\|name}/rows`                                        |
| Add Table Rows  | `POST {workbook}/tables/{id\|name}/rows/add`                                   |

### Chart (1)

| Action          | Graph endpoint                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| Get Chart Image | `GET {workbook}/worksheets/{id\|name}/charts/{name}/image(width=…,height=…,fittingMode='…')` |

`{workbook}` above is either `/me/drive/items/{id}/workbook` or
`/me/drive/root:/{item-path}:/workbook`. Every action supports both.

Every action targets the signed-in user's own drive (`/me/drive`). The `/users/{id}` and
`/sites/{id}` forms exist in Graph but need application permissions and tenant-admin consent, which
is a different authorization story than the delegated OAuth flow this App uses.

## Things worth knowing before you wire this up

**Get Used Range, not Get Range, is "read the whole sheet".** Get Range with an empty address
returns the *entire* worksheet — a million rows. The used range is "the smallest range that
encompasses any cells that have a value **or formatting** assigned to them", and that second clause
is why `Values only` defaults to **on** here: a sheet where someone once bolded row 5000 has a used
range 5000 rows tall. `valuesOnly=true` counts only cells with values. Note it is an OData *function*
parameter, so it rides in the path (`usedRange(valuesOnly=true)`), never the query string.

**A range carries several parallel grids for the same cells.** `values` is the raw typed data,
`text` is what Excel *displays* (the `#####` substitution the UI does is not reflected), `formulas`
is A1-style, and `valueTypes` is per-cell (`Unknown` | `Empty` | `String` | `Integer` | `Double` |
`Boolean` | `Error`). Use `$select` to fetch only the one you need — the others are not free on a
large range.

**Writing has four conventions, and all four bite.** Inside a grid, `null` means "leave this cell
alone" and `""` means "clear it". As a whole property, `null` is invalid — `{"values": null}` is
rejected, there is no clear-by-nulling. And a **single-cell grid fills the whole target range**, the
API's stated equivalent of Ctrl+Enter in the UI, which turns a one-cell mistake into a
two-hundred-cell one.

**Unbounded ranges read but do not write.** `C:C` or `2:2` returns `null` for the cell-level grids
while `address` and `cellCount` still describe the range; writing to one is explicitly not allowed.
Update Range therefore makes `address` required, where Get Range leaves it optional.

**Very large ranges should be split.** Microsoft's own recommendation is to "read or write for large
Range in multiple smaller range sizes"; a range whose formatting is non-uniform, or one over roughly
5M cells, can return `null` for individual properties rather than failing outright.

**Batch table rows.** Add Table Rows takes a two-dimensional array of *rows* precisely because the
reference says so: "Adding one row at a time could lead to performance degradation. The recommended
approach would be to batch the rows together in a single call." One call per batch, not one per row.

**Clear Range defaults to Contents, not All.** `applyTo` is documented as optional; defaulting it to
`Contents` means "clear this range" wipes the data rather than silently discarding the sheet's
styling. Set it to `All` or `Formats` deliberately.

**Only the converging writes are marked idempotent.** Update Range, Update Worksheet, Clear Range,
Delete Worksheet and Close Session describe an end state and replay onto the same one. Create
Session, Add Worksheet, Add Table and **Add Table Rows** do not — Graph exposes no client-supplied
dedupe key on any of them, so a retry mints a second session, a second sheet, or a second copy of
your rows. Add Table Rows is where this bites hardest, and it is worth noting the reference says the
request "might occasionally receive a 504 HTTP error" whose prescribed response is to repeat it. A
duplicate-tolerant downstream, or a de-duplicating read, is the honest mitigation.

**Excel collections do not page with a cursor.** Unlike the rest of Graph, the workbook collections
carry no `@odata.nextLink`; Microsoft's guidance for tables and table rows is explicitly `$top` +
`$skip`. Only List Workbooks — a Drive search — pages with `@odata.nextLink`, and that link is
replayed verbatim rather than rebuilt.

**Charts are addressed by name.** `Chart 1`, as shown in the Excel UI — that is the identifier the
reference's own path uses (`/charts/{name}/image`). The image comes back as
`{ "value": "<base-64 string>" }`, a JSON envelope rather than image bytes; `dataUri` is assembled
locally from it for direct embedding, at no extra request.

**Two documentation errors were worked around, not copied.** The Excel conceptual overview shows
`POST …/workbook/tables/{table-id}/add` for creating a table; the operation's own reference page
gives `POST …/workbook/tables/add`, and that is what this App sends. The same overview shows a bare
`POST …/workbook/worksheets` for adding a sheet, where the reference gives
`POST …/workbook/worksheets/add`. Both are noted in the relevant action's source.

## Authentication

One method: **oauth2** — the Microsoft identity platform (Microsoft Entra ID) v2.0 authorization
code flow with PKCE.

```
authorize  https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize
token      https://login.microsoftonline.com/organizations/oauth2/v2.0/token
```

The `organizations` tenant segment restricts the flow to work-or-school accounts — see "Work or
school accounts only" above. The alternatives are `common` (both account types), `consumers`
(personal only), and a tenant id or verified domain for a single-tenant registration. A deployment
that must be restricted to one tenant registers its own app and overrides these URLs.

Delegated scopes requested — the least-privileged set covering every action above:

| Scope              | Needed for                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `offline_access`   | The refresh token. Microsoft grants one only when this scope is requested — there is no `access_type=offline` equivalent. |
| `User.Read`        | The `test` and `afterConnect` probe (`GET /me`).                                                                          |
| `Files.ReadWrite`  | Every workbook read and write. The reference names `Files.Read` for reads and `Files.ReadWrite` for writes; this App writes. |

Set up: register an application in the Microsoft Entra admin center, add a Web redirect URI, then
store the `client_id` / `client_secret` / `redirect_uri` on this w6w installation via
`PUT /apps/io.w6w.excel/oauth-config/oauth2`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Here, unusually, two of the
three are answerable.

### Is the vendor up?

**No probe. Declared absent.**

Every plausible surface was re-checked on 2026-08-03, and none is a documented, unauthenticated,
machine-readable statement about Excel Online or SharePoint Online:

- **Graph's own service-health API** — `GET /admin/serviceAnnouncement/healthOverviews` is
  semantically the right answer, but its only permission is `ServiceHealth.Read.All`, which requires
  tenant-admin consent and is scoped to the calling tenant's subscribed services. A check most
  connections cannot run would report a working App as broken.
- **`status.cloud.microsoft`** — a client-rendered single-page app whose backing JSON endpoints are
  undocumented and carry no stability contract. `/api/v2/status.json` under it answers **401**.
- **`status.office365.com/api/v2/status.json`** — answers **301**, a cross-host redirect rather than
  a status document.
- **`portal.office.com/servicestatus`** — answers **302** into the authenticated admin centre.
- **RSS** — the Service Health Dashboard's feed has been retired; current guidance points humans at
  the status site and at `@MSFT365Status`. Neither is a machine surface.

Building a probe on the undocumented SPA endpoint would be inventing a check, not declaring one, so
`service` carries an `unavailable` reason instead. Outages reach this App the ordinary way: as 5xx
responses from `graph.microsoft.com`.

### Is this credential live?

This is what the Auth `test` hook does.

```
GET https://graph.microsoft.com/v1.0/me
```

The signed-in user's profile. The cheapest authenticated Graph call, and it needs only `User.Read` —
so a credential that legitimately lacks a files scope still reports as live rather than as broken.
Probing a workbook instead would require a workbook to probe, which a fresh connection does not have.
`GET /me` returns `displayName`, `mail` and `userPrincipalName` by default, which is also what labels
the Connection.

### Do we have quota left?

**A real probe** — and this is where Excel differs materially from the sibling `outlook` App, which
declares its quota check absent.

```
GET https://graph.microsoft.com/v1.0/me/drive
```

Exchange Online genuinely publishes nothing. **SharePoint Online — which is what actually hosts the
workbook and meters every `/me/drive/…` call — publishes the IETF `RateLimit-*` headers, and does so
on successful responses:**

```
HTTP/1.1 200 Ok
RateLimit-Limit: 1200
RateLimit-Remaining: 120
RateLimit-Reset: 5
```

Two documented properties of that surface shape the check, and both are the vendor's own words:

1. **The headers appear only past 80% consumption.** The condition for the one supported policy (the
   app 1-minute resource-unit limit) is "Usage >= 80% of the limit". So their **absence is not
   `unknown`** — it is the service saying the app is below four-fifths of its minute budget, and the
   check reports `ok` accordingly. `RateLimit-Reset` is a *relative* seconds delta, converted to an
   instant.
2. **They are best-efforts, and incomplete.** Microsoft says applications "may not receive the
   headers under all conditions", and that "there are other limits that aren't presented in the
   RateLimit headers, so applications can get throttled even before reaching the limit described in
   the RateLimit headers". In particular the **Excel service's own ceilings — 5,000 requests / 10 s
   per app across all tenants, 1,500 requests / 10 s per app per tenant — are a separate budget these
   headers say nothing about.**

So an `ok` from this check means "not near the SharePoint one-minute limit", never "you will not be
throttled". It is `severity: "informational"` for exactly that reason. A 429 during the probe is
reported as `down` with the `Retry-After` value, because that still answers the question being
asked; any other failure is `unknown`.

`GET /me/drive` was chosen over a workbook call deliberately: it is the cheapest Files operation
(1 resource unit, a single-item query), it needs only `Files.Read`, and a health check must not need
to be told which workbook to poke.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key           | Kind       | Scope      | Credential | Severity      | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | --------------------------------------------------- |
| `service`     | service    | app        | none       | informational | _declared absent_                                   |
| `quota`       | quota      | connection | signed     | informational | `GET /me/drive`, reading `RateLimit-*`              |
| `auth:oauth2` | credential | connection | fatal      | fatal         | derived from the `oauth2` auth method's `test` hook |

The declared absence carries `severity: "informational"`: an `unavailable` entry always reports
`unknown`, and a non-informational check would pin this App's roll-up verdict there permanently.

No status host appears in `w6w.network.allow`, and neither check widens egress via its own
`network.allow` — the `service` check makes no request at all, and the `quota` check stays on
`graph.microsoft.com`, which is required alongside its signed posture.

## Not implemented

Stated plainly rather than left as a silent gap:

- **Listing charts** (`GET …/worksheets/{id}/charts`), **adding** them (`…/charts/add`) and
  **setting their source data** (`…/charts/{name}/setData`). Get Chart Image covers the reporting
  case that motivates charts at all; chart names come from the Excel UI.
- **Table columns** — listing, adding and deleting (`…/tables/{id}/columns`). Rows are the
  automation surface; columns are schema work.
- **Deleting table rows and columns**, `convertToRange`, and table **sort** / **filter**
  (`…/sort/apply`, `…/columns(id='…')/filter/apply`). Real endpoints, deliberately deferred rather
  than padding this release.
- **Named items** (`GET {workbook}/names`) and the named-range addressing form
  (`{workbook}/names/{name}/range`).
- **Workbook functions** (`POST {workbook}/functions/{name}`) — 300-odd Excel functions exposed as
  individual endpoints, which is a generated surface rather than a hand-written one.
- **Range geometry and formatting** — `insert`, `delete`, `merge`/`unmerge`, `boundingRect`,
  `offsetRange`, `entireRow`/`entireColumn`, and the whole `format` relationship (font, fill,
  borders, alignment).
- **Pivot tables** and **worksheet protection**.
- **Application-permission access** to other users' or sites' drives (`/users/{id}`, `/sites/{id}`).
- **Triggers.** Graph's change-notification model would be a `TriggerDefinition`, not an Action.
  Polling List Workbooks ordered by `lastModifiedDateTime` is the interim.
- **The long-running-operation form of `createSession`** (`Prefer: respond-async`), for the reason
  given in the session section above.

## Verification

Every endpoint path, request-body property, permission scope, header name and status code above was
checked against the live Microsoft Learn v1.0 reference on 2026-08-03 — not written from memory. The
status endpoints in the health section were probed directly, not assumed from the sibling `outlook`
App's findings; the 401 / 301 / 302 responses recorded there are what they actually returned.

Two things could **not** be confirmed and are flagged rather than glossed:

- **Session expiry timings.** "Typically the persistent session expires after about 5 minutes of
  inactivity. Non persistent session expires after about 7 minutes of inactivity." The word
  *typically* is Microsoft's; these are not a contract, and nothing in this App depends on them.
- **Clear Range's success code.** The reference states `200 OK` in its Response section while its own
  example shows `204 No Content`. The action reports whichever status came back rather than asserting
  one, and both are covered by a test.

The `RateLimit-*` headers the quota check reads are documented as **preview / beta**: "These headers
are currently in beta and subject to change… The current implementation is based on draft-03 of the
IETF specification." The check degrades to a plain `ok` if they ever stop being sent.

The icon is n8n's `nodes-base` Microsoft Excel mark, copied **verbatim** — byte-identical to
`packages/nodes-base/nodes/Microsoft/Excel/excel.svg`.

## Links

- **Website** —
  https://www.microsoft.com/en-us/microsoft-365/excel
- **API reference — Excel overview** —
  https://learn.microsoft.com/en-us/graph/api/resources/excel
- **Worksheet resource** —
  https://learn.microsoft.com/en-us/graph/api/resources/workbookworksheet
- **Range resource** — https://learn.microsoft.com/en-us/graph/api/resources/workbookrange
- **Table resource** — https://learn.microsoft.com/en-us/graph/api/resources/workbooktable
- **createSession** — https://learn.microsoft.com/en-us/graph/api/workbook-createsession
- **closeSession** — https://learn.microsoft.com/en-us/graph/api/workbook-closesession
- **Workbook best practices** — https://learn.microsoft.com/en-us/graph/workbook-best-practice
- **Permissions reference** — https://learn.microsoft.com/en-us/graph/permissions-reference
- **Graph throttling limits (Excel service limits)** —
  https://learn.microsoft.com/en-us/graph/throttling-limits
- **SharePoint Online throttling and the `RateLimit` headers** —
  https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online
- **OAuth 2.0 authorization code flow** —
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- **Paging** — https://learn.microsoft.com/en-us/graph/paging
- **GitHub org** — https://github.com/microsoftgraph
- **API docs source** — https://github.com/microsoftgraph/microsoft-graph-docs-contrib
- **JavaScript SDK** — https://github.com/microsoftgraph/msgraph-sdk-javascript

---

Researched and endpoint-verified 2026-08-03. Status surfaces move; if the `service` check ever
becomes possible, the Graph `serviceHealth` API is the one to revisit.
