# Upsales

Manage the core objects of **Upsales**, the Nordic sales and marketing CRM, over the Upsales API v2.

- **Categories** — crm, marketing
- **Auth methods** — api-key (sent as the `token` query parameter)
- **Actions** — 68
- **Health checks** — 3 (`service`, `api`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `integration.upsales.com` (the `service` check adds `status.upsales.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.upsales.com/
- **API docs** — https://api.upsales.com (Postman collection:
  `api.upsales.com/api/collections/4421023/RW87rVf1`)
- **Status page** — https://status.upsales.com/

> Everything here was verified on 2026-10-06 against Upsales' own published Postman collection
> (907 KB, 32 folders, changelog through 2026-09-02) and live probes of `integration.upsales.com` and
> `status.upsales.com`. Nothing came from a third-party directory.

## Things most likely to go wrong

1. **The credential is a query parameter, and there is no header form.** Every documented request is
   `https://integration.upsales.com/api/v2/<path>?token=<API key>`. `sign` stamps it onto the URL;
   no Action touches it, and a caller-supplied `token` key in a `filter` is dropped. A host that logs
   request URLs logs the key, and the app cannot avoid that because no header scheme is documented.
2. **An unsigned or rejected key answers plain text, not JSON.** `401`, `content-type: text/plain`,
   body `Unauthorized`. Every other failure is `{"error": {"key","code","errorCode","msg"}}`, and
   `GET /self` spells its envelope key `errors`. The client and `auth.test` classify by *body*, never
   by status: a `200` that is not JSON is refused as a proxy page, and a `200` whose JSON lacks
   `data.id` is not a passing credential.
3. **Orders and opportunities are one object.** Both live on `/orders`; the difference is
   `probability` (100 = order, 1-99 = opportunity). The vendor's opportunity list needs the *same
   query key twice* (`probability=gte:1&probability=lte:99`), which an object-shaped `filter` cannot
   express, so `order-list` has a `kind` parameter that sends the repeated key.
4. **Rate limits are per key, in fixed windows, and writes have their own budget.** 200 requests/10 s,
   6 000/10 min, 20 000/hour, plus 2 000/10 min and 5 000/hour for writes; 99 999 calls/day free.
   Exceeding any returns `429 ThrottleLimit` (errorCode 4). A *session* login (not an API key) has
   a tighter write limit, `SessionWriteLimit` (errorCode 177). Use an API key.
5. **Contacts**: create sends `usingFirstnameLastname=true` so `firstName`/`lastName` are accepted;
   the vendor's update example sends the combined `name` instead, so `contact-update` takes `name`.

## Actions

List actions page with `limit` (vendor default 1000, max 2000) and `offset`, take a `sort`, and a
`filter` object of Upsales filters (`attribute: "comparison:value"`, comparisons `eq ne gt gte lt lte`;
custom fields `custom: "eq:<fieldId>:<value>"`). They return `{data, total, limit, offset}`. Writes take
the common fields as typed parameters; every other field (custom fields, nested objects) goes through
`fields`, a JSON object, and typed parameters win over the same key in `fields`. Relations are given as
ids and sent as the `{id: n}` objects Upsales expects; multi-valued relations take comma-separated ids.

| Object | Actions |
| --- | --- |
| Contacts | list, get, create, update, delete |
| Companies (`/accounts`) | list, get, create, update, delete |
| Orders and opportunities (`/orders`) | list (`kind`), get, create, update, delete |
| Activities (to-dos, phone calls) | list, get, create, update, delete |
| Appointments | list, create, update, delete (sends `isAppointment: true`) |
| Campaigns (`/projects`) | list, get, create, update, delete |
| Products | list, get, create, update (no delete; set `active` false) |
| Product categories | list, get, create, update, delete |
| Price lists | list, get, create, update (no delete) |
| Order stages | list, get, create, update, delete |
| Comments | list, get, create, update, delete |
| Support tickets | list, get, create, update, delete, add comment |
| Subscriptions (`/agreements`) | list, get, delete |
| Users | list, get (`/master/users/{id}`), get current user (`/self`) |
| Lookups | activity types, appointment types, currencies, custom-field definitions (10 object types) |

Only `delete` actions that the vendor documents exist. `idempotent` is `false` on every create and on
the ticket comment (Upsales documents no idempotency key), `true` on updates and deletes.

### Deliberately not covered

Left out because they are administrative, binary or their request shape was not fully documented:
create/update/delete of **users** (`/master/users`, sets passwords), **subscription** create/update
(a deeply nested `agreement` document), **custom-field** create/update/delete, **client/contact
category** types and values, **UDOs** (user-defined objects) and their fields/instances, **file
uploads** (multipart), **NPS**, **events** and their contacts, **forms**, **mail**, **e-signatures**
(incl. download), **phone-call** endpoints (`/phoneCall`; phone calls are covered as activities),
**price-list product tiers**, **currency** create/update, **appointment-type** create/update/merge,
and **product bundles**. The ticket, comment, e-sign, form, mail and currency folders were added to
the vendor docs on 2026-09-02 with request examples only for some, so tickets and comments pass the
returned record through untouched rather than describing a shape the vendor has not published.

Deprecation scan: the reference's only deprecation markers are on individual *fields* (e.g.
`activitytype.name`, `account.parId`, `contact.optin`); no endpoint is deprecated. None of those fields
is sent by this app.

## Health

| Check | What | Credential | Severity |
| --- | --- | --- | --- |
| `service` | `status.upsales.com/api/v2/summary.json` page indicator + components | none | informational |
| `api` | unsigned `GET /api/v2/self`; `401 Unauthorized` plain-text body = reachable | none | degraded |
| `quota` | `X-RateLimit-*` headers from a signed `GET /self` | signed | degraded |
| `auth:api-key` | derived from `auth.test` (`GET /self`, classified by body) | signed | fatal |

**Status page.** `status.upsales.com` is a real Atlassian Statuspage (`page.name` "Upsales", id
`xgxqnwgpzcyz`, JSON 200, no redirect, not the unclaimed-host signature). It has **no component named
API**: it lists Upsales App, Mail Events, Fortnox integration, Prospecting, Outgoing Email, File service,
Other integrations, Office 365 calendar sync, Insights, Gmail, PE Accounting and Chat. The API runs on
the same platform as "Upsales App", so the page is evidence, not a statement, and the check is
`informational`. The `api` check covers actual API reachability.

**Auth probe.** `GET /self` returns the key's user (`id`, `email`, `name`, `client`, `features`...)
and no key material (checked field-by-field in the documented response), so it is safe to store. It
needs no role beyond a valid key. Mailjet's `/apikey` and Follow Up Boss's `/me` style endpoints, which
return the caller's own key, are not used.

**Quota.** Headers are on every response and describe the window closest to its limit. Remaining 0 is
`down`, under 10% is `degraded`. Probing costs one request against the key's budget.

## Tests

`deno task test` runs 430 tests with a mocked `HookContext` (a fake `ctx.fetch`, a no-op `ctx.log`): the
entry module, the client, auth (`sign`, every `test` outcome), the three health checks, and each of the
68 actions (request method, URL, query, body mapping, output shape, the plain-text and JSON error
paths). No test makes a network call.
