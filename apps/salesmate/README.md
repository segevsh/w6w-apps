# Salesmate

Manage Salesmate (sales CRM) contacts, companies, deals, activities and notes on the **v4** API.

- **Categories** — crm
- **Auth methods** — access-token (`accessToken` header + link name)
- **Actions** — 28
- **Egress allowlist** — `*.salesmate.io`
- **Website** — https://www.salesmate.io/
- **API docs** — https://apidocs.salesmate.io/ (Postman collection `7811505/S1ZucWTA`)
- **Icon** — the vendor's `fav-icon-5q4xph6c.png` (32×32 PNG, md5 `a71078cd…`) embedded verbatim as base64
  in `assets/icon.svg`. The site's `favicon.svg` and `apple-touch-icon.png` are a catch-all HTML page,
  not images, so they were not used.

## Actions

| Resource | Actions |
|---|---|
| Contact | `contact-create`, `contact-get`, `contact-update`, `contact-search`, `contact-delete` |
| Company | `company-create`, `company-get`, `company-update`, `company-search`, `company-delete` |
| Deal | `deal-create`, `deal-get`, `deal-update`, `deal-search`, `deal-delete` |
| Activity | `activity-create`, `activity-get`, `activity-update`, `activity-search`, `activity-delete` |
| Note | `note-create`, `note-update`, `note-delete`, `note-pin`, `note-unpin`, `note-get-many`, `note-get` (contact, company, deal or activity) |
| User | `user-get-many` (active users — to find an owner id) |

## Host and auth

Every account has its own host: `https://<linkname>.salesmate.io/apis/...`. The v4 reference
("For our v4 API's we need to pass the following Headers") specifies exactly two request headers:

```
accessToken: <token from Profile > My Account > Access Keys>
x-linkname:  <linkname>.salesmate.io
```

Both are stamped by `sign`, which also **refuses to sign a request for any host other than the one
the credential's link name names** (so a mis-built URL cannot hand the token to a different
`*.salesmate.io` account). `*.salesmate.io` is a wide allowlist, so the **link name is validated as a
single DNS label** (`^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$`) in the connection form, in the
client, in `sign` and in the health probes; `evil.com/x`, `acme.salesmate.io`, ports and userinfo are
all rejected. `afterConnect` records the link name on the connection so actions can build the URL
without ever seeing the credential.

Responses are wrapped in `{ "Status": "success", "Data": … }` or `{ "Status": "failure", "Error": … }`
(the failure envelope can arrive with HTTP 200 — the client treats `Status: "failure"` as an error).
The docs capitalise `Error.Code/Name/Message`; the live API returns lowercase `Error.name/message`
(measured), and both are read.

## Health checks

`` `domain` · ~~service~~ · ~~quota~~ · 1 derived `` (`auth:access-token`)

- **Is the vendor up?** `service` is a declared absence. `status.salesmate.io` answers 200 but is **not a
  status page**: it is Salesmate's own web-app shell (title "Salesmate", `server: istio-envoy`), its
  `/api/*` paths are proxied to the Salesmate API (`/api/v2/summary.json` returns the API's own
  `{"Status":"failure","Error":{"Name":"ObjectNotFound"…}}`), and `/index.json`, `/history.atom`,
  `/history.rss`, `/feed.rss` all 404. `salesmate.statuspage.io` answers 401 "Your page is inactive".
- **Is this credential live?** The `access-token` auth `test` calls `GET /core/v4/users?status=active`
  ("Get Active Users", the cheapest read without module-specific access). The body is a list of the
  account's users and never echoes the token. Classified by body: `Status: "success"` with an array
  `Data` is live; `Error.name = AuthorizationFailed` (HTTP 403 measured against a real account host) is a
  rejected token; `NoSuchLinkExist` (HTTP 404) is an unknown link name.
- **Is this account's host reachable?** `domain` (`dependency`, `scope: connection`,
  `credential: context`) makes the same call **unsigned**. An `AuthorizationFailed` answer is a pass — it
  proves the host is serving; a 404 / `NoSuchLinkExist` or a 5xx is down.
- **Quota.** `quota` is a declared absence: the docs state "up to 1500 api calls per hour for each link"
  in prose, and a live response carries no rate-limit header.

Both absences carry `severity: "informational"` so they never pin the roll-up at `unknown`.

## Searching

Salesmate search is a `POST` with a query object, not a list endpoint. The `*-search` actions build the
documented body (`displayingFields`, `filterQuery.group{operator:"AND", rules[]}`, `sort`, `moduleId`,
`reportType: "get_data"`, `getRecordsCount: true`) and page with `rows` (max 250) / `from` in the query
string. Supply `rules` as the array of rule objects the reference shows; with none, the reference's own
sample rule (created after 1970) is used so the call returns everything. Output is
`{ records, totalRows, totalPages }`.

## Notes on what the docs leave open (and what this app did about it)

- **Company search body is inferred.** The reference's "Search a Company" sample body is a verbatim copy of
  the *contact* body (`moduleId: 1`, `contact.*` fields). This app uses the module id from the "Module
  Ids" table (5) and the same `<module>.<field>` naming the other modules use, with `company.id` /
  `company.name` as default fields. Pass `fields` explicitly if your account needs others.
- **Deal search paging is undocumented.** Its URL carries no `rows`/`from` (the others do), so those two
  params have no default there; they are sent only if set.
- **Delete takes the id in the path.** The reference describes a `contactIds`/`companyIds`/`dealIds`/
  `taskIds` array argument but shows the request as `DELETE …/v4/{id}` with no body; the documented
  URL is what is implemented. Activity delete also sends `hardDelete` (sample: `false`).
- **Update requires the same fields as create** per the reference (contact: `lastName`, `owner`;
  company: `name`, `owner`; deal: `title`, `primaryContact`, `owner`, `pipeline`, `status`, `stage`;
  activity: `title`, `owner`, plus `type`, which the sample 400 shows is required). Those are required
  params here too.
- **Deal `status`** allows `Open`, `Close`, `Lost` (the reference's allowed-values list; its prose says
  "Won", the list says `Close`).
- **Activity `dueDate`** is typed Integer in the field table but the sample sends an ISO string or `""`;
  it is passed through as given.
- **Note reads** (`note-get-many`, `note-get`) use the generic `/module/v4/modules/:moduleId/objects/…`
  endpoints, whose response body is not shown in the reference, so `Data` is returned as-is.
- **Custom fields** are accepted as a JSON object and sent as top-level body keys, which is how the
  company sample body carries them.

## Deprecation

The reference's banner: "We will be deprecating the v1 and v3 versions of the Salesmate APIs by May 1,
2023." This app uses **v4 only**. Products (`/v1/products`, `/v3/products/search`) are documented only on
v1/v3, so they are **not covered**.

## Not covered

Products and product variants (v1/v3 only), custom-module records (`/module/v4/{moduleId}/records` — the
module id is per-account and needs the "Get Module IDs" lookup; left out of this core set), lookup-field
association (`PUT /{module}/v4/{id}` with undocumented bodies and an unfilled placeholder URL), note
attachments, custom-module/ticket/quote notes, deal `associatedProducts`, and bulk operations.
