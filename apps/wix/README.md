# Wix

Manage a [Wix](https://www.wix.com) site from a workflow: its CMS collections and data items, its
contacts and labels, its Stores catalog, and its eCommerce orders — over the Wix REST API at
`https://www.wixapis.com`.

24 actions, one auth method, two health checks.

---

## A note on the API docs link

Our candidate list gave the Wix "API docs" as
`https://support.wix.com/en/ascend-by-wix/wix-automations`. That is **not an API reference** — it is a
Wix *support* page about the Wix Automations feature, aimed at site owners, with no endpoints in it.
It is also **dead**: as of 2026-08-03 it returns **HTTP 404**.

The real developer documentation is at **<https://dev.wix.com/docs/api-reference>** (verified 200).
The `dev.wix.com/docs/rest/...` paths that older material links to now redirect into that tree;
`https://dev.wix.com/docs/rest` itself no longer resolves as a menu node.

A useful property of the portal, and the one this app was built against: **appending `.md` to any
`dev.wix.com/docs/` URL returns the page as markdown**, including a machine-readable schema block per
method giving the exact HTTP verb and URL. Every endpoint below was read from that.

---

## Auth — which credential, and why

Wix offers several ways to authenticate a REST call. They are mutually exclusive, and picking wrong
makes the app unusable rather than merely awkward.

| Option | What it is | Verdict |
| --- | --- | --- |
| **OAuth 2 app install** | An *app instance* token minted per site that installs a Wix app you registered in the Wix Dev Center | **Rejected.** Requires a registered app, redirect URI, client secret, review, and an install on the target site before one call can be made. A workflow host cannot ask a user to publish a Wix app to read their own CMS collection. |
| **Wix API key** | Minted by an account owner/co-owner in the API Keys Manager, scoped to permissions and to specific sites | **Chosen.** |
| Legacy Wix Apps / instance token | The older pre-OAuth flow | Superseded by OAuth. |

**We ship the API key.** Wix's own documentation names this credential for exactly this situation —
its listed use cases include *"External integrations: enable 3rd-party tools that call Wix APIs on
your behalf"* and *"Automated workflows"*. It needs no app registration and no install, and it works
in unattended background runs. Wix is explicit that the two do not mix: API keys are not available to
third-party Wix apps, and OAuth is not available to API-key integrations.

A second `AuthDefinition` of `type: "oauth2"` could be added later without disturbing this one, if the
app is ever listed in the Wix App Market.

### The headers

A Wix call needs the key **and** an identity header. Wix's docs: *"API calls require either the
`wix-account-id` header or the `wix-site-id` header, but not both. Most APIs are site-level."*

```
Authorization: <API_KEY>        # bare — NOT `Bearer <API_KEY>`
wix-site-id: <SITE_ID>          # site-level calls (23 of the 24 actions)
wix-account-id: <ACCOUNT_ID>    # account-level calls (Query Sites only)
```

Note the `Authorization` header carries **no scheme prefix**. Every example in Wix's "Make API Calls
with an API Key" page sends the key raw, and `apiKey.prefix` is set to `""` to say so explicitly.

The connect form collects three fields: **API Key** (secret), **Site ID**, and **Account ID**. The IDs
are not secrets — a site ID is visible in the site's own dashboard URL — but they live on the
credential because `sign` is the only hook allowed to read a Connection.

### How the right header gets chosen

The header's *value* comes from the Connection, which only `sign` may read. *Which* header to send is
a property of the endpoint, which only the action knows. Neither half can decide alone, so:

1. `lib/client.ts` stamps an internal marker header, `x-w6w-wix-scope: site | account`.
2. `auth/api-key.ts` `sign` reads it, stamps `Authorization` plus **exactly one** identity header, and
   **deletes the marker** — it never reaches Wix.

Having `sign` pattern-match the request URL instead would silently send the wrong header the first
time Wix adds a path prefix. There is a unit test asserting the marker never survives signing, and
one asserting the two identity headers are never sent together.

`test` picks its probe to match how the key is scoped — `GET /site-properties/v4/properties` when a
site ID is present, `POST /site-list/v2/sites/query` when only an account ID is — because a key
restricted to account-level work would fail a site-level probe and be reported broken when it is fine.

---

## Scope — what is covered, and what is deliberately not

Wix's REST surface is enormous: the API reference index lists roughly **90 product areas** across App
Management, Business Solutions, Assets, CRM, Business Management, Account Level, Tools and Site.
Shipping all of it would be sprawl. This app covers a **coherent slice: reading and writing the
content and customer data of one site**, which is what a workflow automating a Wix site actually
touches.

### Covered (24 actions)

**CMS — Wix Data** (9) · the closest analogue to what Webflow's CMS actions do

| Action | Endpoint |
| --- | --- |
| `list-collections` | `GET /wix-data/v2/collections` |
| `get-collection` | `GET /wix-data/v2/collections/{id}` |
| `query-data-items` | `POST /wix-data/v2/items/query` |
| `get-data-item` | `GET /wix-data/v2/items/{id}` |
| `insert-data-item` | `POST /wix-data/v2/items` |
| `update-data-item` | `PUT /wix-data/v2/items/{id}` |
| `remove-data-item` | `DELETE /wix-data/v2/items/{id}` |
| `count-data-items` | `POST /wix-data/v2/items/count` |
| `bulk-insert-data-items` | `POST /wix-data/v2/bulk/items/insert` |

**CRM — Contacts and Labels** (9)

| Action | Endpoint |
| --- | --- |
| `list-contacts` | `GET /contacts/v4/contacts` |
| `get-contact` | `GET /contacts/v4/contacts/{id}` |
| `query-contacts` | `POST /contacts/v4/contacts/query` |
| `create-contact` | `POST /contacts/v4/contacts` |
| `update-contact` | `PATCH /contacts/v4/contacts/{id}` |
| `delete-contact` | `DELETE /contacts/v4/contacts/{id}` |
| `label-contact` | `POST /contacts/v4/contacts/{id}/labels` |
| `unlabel-contact` | `DELETE /contacts/v4/contacts/{id}/labels` |
| `list-labels` | `GET /contacts/v4/labels` |

**Commerce — Stores catalog and eCommerce orders** (4)

| Action | Endpoint |
| --- | --- |
| `query-products` | `POST /stores/v3/products/query` |
| `get-product` | `GET /stores/v3/products/{id}` |
| `search-orders` | `POST /ecom/v1/orders/search` |
| `get-order` | `GET /ecom/v1/orders/{id}` |

**Site and account** (2)

| Action | Endpoint |
| --- | --- |
| `get-site-properties` | `GET /site-properties/v4/properties` |
| `query-sites` | `POST /site-list/v2/sites/query` *(account-level)* |

`query-sites` earns its place despite being the only account-scoped action: every other action needs
a site ID, and this is the documented way to discover one from inside a workflow rather than copying
a GUID out of a dashboard URL.

### Deliberately excluded

- **Bookings, Events, Restaurants, Blog, Forum, Portfolio, Pricing Plans, Loyalty, Donations, Gift
  Cards, Coupons, Online Programs** — each is a large product API in its own right, and each is only
  relevant to sites that have installed that specific Wix app. They belong in a follow-up, not padded
  in here.
- **App Management (OAuth 2, App Instance, App Billing, Embedded Scripts, Market Listing)** — the
  surface for *building and selling a Wix app*, which is not what this app does. See the auth section.
- **Media Manager, Pro Gallery, Rich Content** — file upload has its own multi-step signed-URL flow
  and deserves proper treatment rather than a token action.
- **Members** — deliberately separated from Contacts. Wix restricts what the Contacts API may do to a
  member-linked contact and routes those changes through a different API; mixing the two in one action
  set invites silent failures.
- **Draft Orders, Order Billing, Order Transactions, Order Fulfillments, Order Payment Requests** —
  taking money and moving stock. Read paths only here.
- **Write access to the Stores catalog** (create/update/delete product, inventory, categories, brands,
  ribbons, promotions, customizations) — the catalog write model involves options, variants and
  inventory as separate coupled resources; a partial implementation would be worse than none.
- **All `by-filter` async bulk endpoints** across every product — they return a `jobId` and require
  polling `Get Async Job`, which is a job-orchestration pattern this app does not yet model.
- **Collection *management*** (create/update/delete collection, indexes, permissions, folders, data
  sharing) — schema administration rather than content automation. `get-collection` is included
  read-only so you can discover field names.
- **Contacts V5** — see below.

### Contacts V4, not V5

Wix documents **both** `contacts/v4` and `contacts/v5`, and as of 2026-08-03 **neither carries a
deprecation notice**. V4 was chosen because it is the long-standing version, it offers a plain
`GET /contacts/v4/contacts` list that V5 does not (V5 is query/search only), and its `label` /
`unlabel` sub-resources have no V5 equivalent in the reference. V5's advantages — upsert, matching,
trash-bin restore — are all in the excluded bulk/async category anyway. Both were verified live.

---

## Endpoint verification

Every path was confirmed against the **running service**, not just the docs. Wix returns an
`x-wix-responded-by` header naming the exact handler that answered:

```
GET  /wix-data/v2/items/{id}   -> 400  wix.data.v2.data_item:GetDataItem:com.wixpress.cloud.cloud-data
POST /contacts/v4/contacts     -> 400  wix.contacts.v4.contact:CreateContact:com.wixpress.contacts.contacts-proxy
GET  /ecom/v1/orders/{id}      -> 428  wix.ecom.v1.order:GetOrder:com.wixpress.ecom.ep-orders
```

An invented sibling path answers **404 with no such header**, so the signal discriminates cleanly:

```
GET  /wix-data/v2/definitely-not-a-real-route  -> 404  <no handler header>
POST /contacts/v4/contacts/not-a-real-method   -> 404  <no handler header>
```

**One exception, stated plainly.** `POST /site-list/v2/sites/query` (`query-sites`) sits behind a
different gateway: unauthenticated it answers **403 with an HTML body and no handler header**, and a
bogus sibling under the same prefix redirects to a Wix sign-in page rather than 404ing. It could not
be confirmed the same way as the other 23. It is included on the strength of Wix's own reference page,
which documents this exact URL, method and `wix-account-id` header. Treat it as
**documented-but-unverified**; the action's source says so too.

---

## Health checks

### `service` — Wix platform status

Reads the Atlassian Statuspage at `status.wix.com`, unauthenticated and unsigned. `summary.json`
rather than `status.json`: the same single request, but it carries the per-component breakdown, which
for a platform this broad is the point — a workflow driving the CMS can be perfectly healthy while the
Wix Editor is down.

`status.wix.com` is **not** on the app's `network.allow`; the check widens the allowlist for itself
only, which the spec permits precisely because the posture is unsigned.

**Verified genuine both ways, 2026-08-03**, per the standing requirement that a status endpoint be
proven real before it is probed:

1. **Bogus sibling comparison.** `https://status.wix.com/api/v2/status.json` returns **200**;
   `https://status.wix.com/totally-bogus-sibling-path.json` returns **404** with an empty body. The
   host discriminates paths rather than serving one catch-all page.
2. **Content-type and body inspection.** The response is `application/json` (206 bytes), *not* a large
   `text/html` marketing page, and its `page` object self-identifies as
   `{"id":"3x6vjqhj2cpt","name":"Wix","url":"https://status.wix.com"}`. `summary.json` carries **119
   real components** — Wix Editor, Wix Payments, Automations, Dashboard, Storefront, Site Loading, and
   so on.

One wrinkle worth knowing: Wix's 119 components are **not uniquely named**. "Player" and "Management
and Settings" each appear under several product groups. Slugging on the leaf name alone would collapse
them onto one key and report one product's outage under another product's name, so components are
keyed `<group>-<component>` with a numeric suffix as a last-resort tiebreak. There are unit tests for
both cases.

A `feed` was considered and rejected: Wix does publish Atom and RSS at `/history.atom` and
`/history.rss`, but an incident *history* feed says nothing about 119 components' current state.

### `quota` — declared `unavailable`, honestly

Wix publishes an allowance in prose (its Contacts documentation states **200 requests per minute, per
instance**, with tighter ceilings for bulk endpoints) but **publishes no way to read remaining
headroom**.

Confirmed live 2026-08-03 by calling `GET /wix-data/v2/collections` and `POST /contacts/v4/contacts/query`
and inspecting the full response headers. The complete set of non-standard headers Wix returns is:

```
x-wix-responded-by, x-seen-by, glb-x-seen-by, x-wix-request-id,
access-control-expose-headers, x-robots-tag, x-content-type-options,
server: Pepyaka, via, alt-svc, set-cookie: XSRF-TOKEN
```

No `RateLimit-*`, no `X-RateLimit-*`, no `Retry-After`, no vendor counter of any kind. Unlike Webflow
(`X-RateLimit-Remaining`), there is nothing on the wire to read. Reporting the documented 200/minute
constant as *remaining* headroom would be inventing a number, and it would be wrong the moment
anything else shares the key — the normal case, since a Wix API key is minted per **account** and may
be scoped to many sites.

So it ships as `unavailable: { reason }` with **`severity: "informational"`**. That severity is
load-bearing: an `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in the
roll-up, so at any other severity a declared absence would pin the app's verdict at `unknown` forever.

---

## Usage notes

- **Paging is not uniform, and the app does not pretend otherwise.** The older services (Contacts v4,
  Wix Data, Labels) take **offset** paging (`limit` / `offset`); the newer ones (Stores v3, eCommerce)
  take **cursor** paging (`limit` / `cursor`). Each action exposes whichever its endpoint actually
  implements. Cursor endpoints ignore filter and sort once a cursor is passed — set those on the first
  page only.
- **`update-contact` requires a `revision`.** It is optimistic-concurrency control: read the contact
  first with `get-contact`, pass the `revision` back. A stale revision is rejected rather than
  silently overwriting a concurrent change — which is also what makes the action safely idempotent.
- **`update-data-item` replaces, it does not merge.** A field omitted from `data` is cleared. Read the
  item first if you mean to change one field.
- **Labels must exist before they can be applied.** `label-contact` will not create one; use the Wix
  dashboard or the Find or Create Label endpoint (not currently wired as an action).
- **Wix Data is eventually consistent.** Several read actions expose `consistentRead` to force a read
  from the primary database when you need to see a write made moments ago.
- **Bulk insert reports per-item results.** A partial failure is normal — read `results`, do not assume
  all-or-nothing. Give each item its own `_id` if you need a retry to be safe.

---

## Development

```bash
deno task test    # 140 unit tests
deno task check
deno task lint
deno task fmt     # never bare `deno fmt` — it would reformat assets/icon.svg
```

Audit from the pack root:

```bash
deno run --no-check -A --config apps/wix/deno.json _tools/audit.ts wix
```

---

## Links

All verified **HTTP 200** on 2026-08-03.

- **Vendor:** <https://www.wix.com>
- **API reference (the real developer docs):** <https://dev.wix.com/docs/api-reference>
- **Authentication — About API Keys:**
  <https://dev.wix.com/docs/api-reference/articles/authentication/api-keys/about-api-keys>
- **Authentication — Make API Calls with an API Key:**
  <https://dev.wix.com/docs/api-reference/articles/authentication/api-keys/make-api-calls-with-an-api-key>
- **API Keys Manager:** <https://manage.wix.com/account/api-keys>
- **Status page:** <https://status.wix.com>
- **GitHub org:** <https://github.com/wix>

API base URL: `https://www.wixapis.com` — an API root, not a browsable page (it returns 404 at `/`),
so it is listed here as a base rather than a link.

**Not a link to the API docs:** `https://support.wix.com/en/ascend-by-wix/wix-automations`, the URL our
candidate list carried, is a support page about Wix Automations and currently returns **404**.
