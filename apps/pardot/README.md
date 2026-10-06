# Pardot (Salesforce Account Engagement)

Manage prospects, lists, tags and the marketing assets around them in **Salesforce Account
Engagement** (still called Pardot in its API, hostnames and error messages), on **API v5**.

- **Categories** — marketing, crm
- **Auth methods** — `oauth2` (login.salesforce.com), `oauth2-sandbox` (test.salesforce.com),
  `access-token` (pasted Salesforce access token)
- **Actions** — 25
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:*` checks
- **Egress allowlist** — `pi.pardot.com`, `pi.demo.pardot.com` (a connection uses exactly one;
  the `service` check adds `api.status.salesforce.com` to its own hook allowlist, never to the app's)
- **API docs** — https://developer.salesforce.com/docs/marketing/pardot/guide/version5overview.html
- **Status** — https://status.salesforce.com/ (Trust API, see below)

> Everything here was verified on 2026-10-06 against the vendor's own v5 object pages, the
> Authentication and Error Codes pages, and live unauthenticated probes of `pi.pardot.com` and
> `pi.demo.pardot.com`. Only v5 is used; v3/v4 are still documented but transitioning.

## Connecting

Every call needs **two** headers, both stamped by the auth `sign` hook (no action touches either):

```
Authorization: Bearer <salesforce access token>
Pardot-Business-Unit-Id: 0Uv…            (18 characters)
```

1. **Connected app.** In Salesforce, create a connected app whose OAuth scopes include
   **`pardot_api`**. Without it only the username/password flow works with this API. The user who
   authorizes must be SSO-enabled for Account Engagement (able to log in at pi.pardot.com with "Log
   In with Salesforce", or open the Account Engagement Lightning app).
2. **Business unit id.** Salesforce Setup → *Business Unit Setup*. It begins `0Uv` and is 18
   characters. It is a connect-time field (validated against that shape).
3. **Environment.** The host is not discoverable from the token, so you pick it:

   | Account type                         | Sign-in host           | Choose                                   | API host              |
   | ------------------------------------ | ---------------------- | ---------------------------------------- | --------------------- |
   | Production                           | `login.salesforce.com` | `oauth2`, environment *Production*       | `pi.pardot.com`       |
   | Account Engagement developer org     | `login.salesforce.com` | `oauth2`, environment *Developer/sandbox* | `pi.demo.pardot.com`  |
   | Salesforce sandbox                   | `test.salesforce.com`  | `oauth2-sandbox`                         | `pi.demo.pardot.com`  |

`afterConnect` records the chosen host and the business unit id on the connection's redacted
`display`; actions read the host from there. Production is assumed if it is missing.

## Actions

Every query action takes `fields` (the API *requires* an explicit list; each action has a useful
default, and dot notation reaches related objects, e.g. `campaign.name`), `limit` (1–1000), `orderBy`,
a recycle-bin selector where the object has one, the filters the object's page documents, and
`nextPageToken`. A query returns `{ values, nextPageToken, nextPageUrl }`.

| Action                    | Type    | Endpoint                                              |
| ------------------------- | ------- | ----------------------------------------------------- |
| `prospect-list`           | search  | `GET /prospects`                                      |
| `prospect-get`            | read    | `GET /prospects/{id}`                                 |
| `prospect-create`         | perform | `POST /prospects`                                     |
| `prospect-update`         | perform | `PATCH /prospects/{id}`                               |
| `prospect-upsert`         | perform | `POST /prospects/do/upsertLatestByEmail`             |
| `prospect-delete`         | perform | `DELETE /prospects/{id}` (to the recycle bin)         |
| `prospect-add-tag`        | perform | `POST /prospects/{id}/do/addTag`                      |
| `prospect-remove-tag`     | perform | `POST /prospects/{id}/do/removeTag`                   |
| `prospect-account-list`   | search  | `GET /prospect-accounts`                              |
| `list-list`               | search  | `GET /lists`                                          |
| `list-get`                | read    | `GET /lists/{id}`                                     |
| `list-create`             | perform | `POST /lists`                                         |
| `list-membership-list`    | search  | `GET /list-memberships`                               |
| `list-membership-create`  | perform | `POST /list-memberships`                              |
| `list-membership-delete`  | perform | `DELETE /list-memberships/{id}`                       |
| `tag-list`                | search  | `GET /tags`                                           |
| `tag-create`              | perform | `POST /tags`                                          |
| `campaign-list`           | search  | `GET /campaigns`                                      |
| `custom-field-list`       | search  | `GET /custom-fields`                                  |
| `form-list`               | search  | `GET /forms`                                          |
| `form-handler-list`       | search  | `GET /form-handlers`                                  |
| `landing-page-list`       | search  | `GET /landing-pages`                                  |
| `email-list`              | search  | `GET /emails`                                         |
| `visitor-list`            | search  | `GET /visitors`                                       |
| `visitor-activity-list`   | search  | `GET /visitor-activities`                             |

All paths are under `/api/v5/objects`. Prospect writes expose the common fields as controls and
take anything else (address, notes, custom `…__c` fields) through `additionalFields`.

## Things that will cost you a day

- **`fields` is mandatory** on every read and query. Omit it and you get a 400, not "all fields".
- **A page token excludes everything else.** The next-page call may carry only `fields` and
  `nextPageToken`; `limit`, `orderBy`, `offset` or any filter next to it is a 400. Tokens expire
  after 4 hours and stop after 100,000 records (then no token and a `Pardot-Warning: 203` header).
  `offset` is deprecated and capped at 2000, so it is not exposed.
- **Query returns fewer custom fields than read.** The prospect query omits multi-select,
  checkbox and multi-response custom fields; the single read returns them all. Custom fields are
  selected with the `__c` suffix.
- **The wrong host looks like a bad business unit id** (`201 Business Unit … not found or
  inactive`), so does a mistyped id.
- **Reads can lag writes by up to a minute.** v5 is served from a cache that is allowed to be up
  to 60 seconds behind; a write followed at once by a read can show the old data.
- **The docs contain typos.** The tag page shows `GET` for create and `/tags/:2000` (a colon in the
  path) for update and merge; the endpoint tables say `POST /tags` and `PATCH /tags/{id}`, which
  is what this app uses. The custom-field page's table says type `Text`, its example sends `text`;
  create is therefore not exposed.

## Health checks

| Check     | Source                                                                 | Notes |
| --------- | ---------------------------------------------------------------------- | ----- |
| `service` | Salesforce Trust, `GET api.status.salesforce.com/v1/products/MCAccountEngagement` | Trust is Swagger-documented at `/v1/docs/`; the spec lists `GET /products/{key}`. Account Engagement is one product with one instance, so the check is app-scoped. The status vocabulary is not in the spec; it reuses the `salesforce` app's mapping, and an unrecognised non-`OK` value reads `degraded`. A Trust failure is `unknown`, never `down`. |
| `api`     | Unsigned `GET /prospects?fields=id&limit=1` on the connection's host    | A `401 {"code":49,"message":"Access Denied"}` (measured on both hosts) is a **pass**: it proves DNS, TLS and the auth layer. Verdict comes from the body envelope, not the status. 5xx or a non-JSON body is `down`. |
| ~~`quota`~~ | declared unavailable, `informational`                                 | The overview documents an `x-api-usage` response header (sent when the request has `X-Return-Api-Usage: 1`) but not its format, and there is no usage endpoint. Not guessed. |
| `auth:*`  | derived from each auth method's `test`                                 | `GET /campaigns?fields=id&limit=1`, signed. Returns ids only, never echoes the credential; passes only on the documented `{ "values": [...] }` shape. |

`status.salesforce.com` itself is a JS shell with no Statuspage/Atom feed, which is why the
Trust JSON API is used.

## Not yet covered

Left out because they were not needed for a first cut or a detail was unconfirmed:

- Prospect **undelete** (`do/undelete`), and form undelete.
- Prospect-account, campaign, visitor, custom-field **writes** (prospect accounts and
  opportunities are read-only when a CRM connector exists; custom-field `type` casing is
  inconsistent in the docs).
- Campaign **connectSalesforceCampaign**, tag **merge** (path shown with a colon in the docs),
  and **add/remove tag** on lists, campaigns, forms, form handlers, landing pages, emails.
- Visitor **assignToProspect** / **identifyCompany**, form **copyToCms** / **reorderFormFields**,
  landing-page and email **copyToCms**, **one-to-one email send** (`POST /emails`).
- Form, form-handler, landing-page, list **update/delete** and form/form-handler/landing-page
  **create** (large layout/content bodies).
- `tagged-object`, `user`, `file`, `folder`, `import`, `export` (the bulk path past the 100,000-record
  token cap), `engagement-studio-program`, `email-template`, `layout-template`, and the rest of
  the 39 v5 object pages.
- Triggers/webhooks: v5 documents none.

## Icon

`assets/icon.svg` is the pack's own `apps/salesforce/assets/icon.svg`, copied byte-for-byte
(same vendor; Account Engagement has had no separate mark since the rebrand — the vendor's mark
is the Salesforce cloud). That file in turn comes from n8n's `Salesforce` node
(`packages/nodes-base/nodes/Salesforce/salesforce.svg`). Always format with `deno task fmt`,
never bare `deno fmt`, which rewrites the SVG.
