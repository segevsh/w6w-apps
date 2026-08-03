# Kajabi

Creator commerce — courses, memberships and digital products — via the **Kajabi Public API v1**.

49 actions across contacts, tags, offers, products, courses, orders, purchases, transactions,
payouts and forms; one OAuth2 client-credentials auth method; two health checks.

Everything here is transcribed from Kajabi's **vendor-generated OpenAPI document** or verified on
the wire against `api.kajabi.com` on **2026-08-03**. Nothing is recalled.

---

## Links

| | |
|---|---|
| **Website** | <https://kajabi.com> |
| **API docs** | <https://developers.kajabi.com> — 301-redirects to <https://help.kajabi.com/api-reference> |
| **OpenAPI** | <https://raw.githubusercontent.com/Kajabi/public_api_docs/main/openapi.yaml> — `openapi: 3.1.1`, `info.version: 1.1.0`, 12,530 lines. **The ground truth this app was built from.** |
| **Source / git repo** | <https://github.com/Kajabi/public_api_docs> — the **documentation** repo, and the closest thing to a source repo that exists. Kajabi is closed-source SaaS and publishes **no SDK or API client** in any language. Its engineering org, <https://github.com/Kajabi>, has 100+ public repos, but they are design systems (`pine`, `sage-lib`, `ds-tokens`, `pine-icons`), forks (`rails`, `ci-queue`, `bootboot`) and internal tooling — none is Kajabi itself and none is a Kajabi client. Listing the docs repo is the honest answer; it is also genuinely useful, because it contains the generated spec. |
| **Postman collection** | <https://www.postman.com/kajabi-apis/kajabi-public-api-v1/overview> |
| **Status page** | <https://status.kajabi.com> |
| **Where to mint credentials** | <https://app.kajabi.com/admin/settings/security> → User API Keys |

---

## Feasibility: the catalogue link was wrong, but the API is real

The candidate entry cited `help.kajabi.com/hc/en-us/articles/360037178613` as "API docs". **It is
not developer documentation.** It is a Zapier walkthrough covering Kajabi's inbound and outbound
*webhooks*, gated to the Growth and Pro plans, with no base URL and no endpoints. Built from that
link alone, the honest outcome would have been the `apps/odoo/` one — *this cannot be built* — or
at best a trigger, which this pack has no surface for.

That was the historical state and it is no longer current. Kajabi shipped a genuine public REST API
alongside the September 2025 Pro plan and publishes it at `developers.kajabi.com`. Three things make
it safe to build against:

1. **The spec is generated, not hand-written.** The docs repo states the OpenAPI file "is
   automatically generated from the main Kajabi application and should not be edited directly", so
   it describes the live surface rather than prose that can drift.
2. **It is versioned and self-describing.** `GET /v1/version` answers
   `{"meta":{"title":"Kajabi API V1","version":"1.1.0"},"links":{"documentation":…},"jsonapi":{"version":"v1.1"}}`.
3. **It is a normal customer credential.** A User API Key is minted from the admin portal by an
   Owner or Sub-owner — no partner programme, no application process. It does require a plan that
   includes the Public API (bundled with Pro, or a paid add-on).

**Verdict: feasible, and comfortably so.** ~60 documented paths, of which this app implements 49
operations.

---

## Which API this is

| | |
|---|---|
| **Base URL** | `https://api.kajabi.com`, paths prefixed `/v1` |
| **Style** | JSON:API v1.1 (`application/vnd.api+json`) |
| **Auth** | OAuth2 `client_credentials` → bearer token |
| **Tenancy** | One fixed host for every customer; the site travels as `filter[site_id]` |

### One host — no wildcard, no `dependency` check

Kajabi sites are per-tenant with their own vanity domains (`yoursite.mykajabi.com`, or a custom
domain), so it would be reasonable to expect a per-tenant API host — which would force a wildcard
allowlist plus a `dependency` health check, as in `apps/wordpress/` and `apps/grist/`.

It does not work that way. The spec states the server once, globally, with no `servers:` list and no
templated host anywhere in the document. Confirmed on the wire: `GET
https://api.kajabi.com/v1/version` answers 200 for an unauthenticated caller with **no site
selector of any kind**.

So `w6w.network.allow` is the single literal `api.kajabi.com` — the `apps/quickbase/` shape (narrow
allowlist, tenant passed as data) rather than the `wordpress` one. The site is a documented query
*filter*, which is also why `siteId` is deliberately permitted as an action param while every
credential spelling is banned by test.

### The one sharp edge: `filter[site_id]`

Kajabi's own words, on nearly every collection: *"It is recommended to always filter by site_id…
This param is required when the account has multiple sites."* It is declared `required: false`, so
this app cannot make it required either — but a multi-site account that omits it gets ambiguity
rather than a helpful 400. `site-list` is usually the first call a Kajabi workflow should make.

The single exception is `payout-list`, where Kajabi marks it *"(required)"* explicitly. That action
is the only one where the param is required, and a test pins the difference.

---

## Authentication

`auth/client-credentials.ts` — `type: "custom"`, because the `oauth2` type in this spec models the
browser authorization-code flow. This is the machine-to-machine grant, so it keeps working in
scheduled runs. Same shape as `apps/paypal/`.

Two secret fields (Client ID, Client Secret) exchanged for an access/refresh token pair.
`refresh` tries the refresh-token grant first and **falls back to a fresh client-credentials
grant** when it fails — the refresh token has its own lifetime and rotating the API key invalidates
it, so without the fallback a Connection would need reconnecting by hand for a condition it can
self-heal from.

### The password grant is refused

Kajabi documents three grants: `client_credentials`, `refresh_token`, and **username + password**.
The third is implemented as an explicit non-feature. Kajabi deprecates it in the same breath as
documenting it — *"(client credentials is preferred)"* — it is the resource-owner-password pattern
OAuth 2.1 removes outright, and it would mean storing a Kajabi operator's actual account password
where a scoped, nameable, rotatable API key already exists. `tests/index.test.ts` greps the auth
source to keep `username`/`password` from reappearing as fields.

### The credentials go in the body, not a Basic header

PayPal's identically-named grant uses HTTP Basic. Kajabi's does not: its request schema lists
`client_id` and `client_secret` as **form properties** and the operation declares no `security`.
The grant type being the same does not make the wire format the same — pinned by test so the two
apps are not "harmonised".

### Why `GET /v1/me` is the probe

A `/me` route is guilty until proven innocent in this pack: Follow Up Boss's returns the caller's
own API key, and Mailjet's `/apikey` returns key *and* secret. So the probe was chosen by reading
its **response schema**, not its name.

Kajabi's `me_attributes` is documented field by field as exactly four things: `initials`, `name`,
`email`, `role_level`. No token, key, secret or credential field — and because the document is
generated from the application, an undocumented extra attribute is not the likely failure mode it
would be with prose docs. A test asserts that nothing credential-shaped reaches the Connection
display.

Every alternative is a collection (`/v1/contacts`, `/v1/sites`), which would drag customer PII
across the wire to prove a token works *and* would report a working credential as broken whenever
the key's selected permissions excluded that resource. `/v1/me` describes the key's own user, so no
permission selection can withhold it.

`test` separates three failures because they need three fixes: **401** (token wrong/expired, or the
key was rotated or deleted), **403** (token fine, permissions or plan insufficient), anything else
(Kajabi itself).

---

## A 2xx that means failure — checked, and Kajabi is clean

The dominant bug class in recent batches (Grist 200-when-anonymous, Circle v1 200-on-auth-failure,
Quickbase 207-partial, ManyChat `200 {"status":"error"}`) was probed for specifically rather than
assumed. All on 2026-08-03:

| Request | HTTP | Body |
|---|---|---|
| `GET /v1/me`, no `Authorization` | **401** | `{"errors":[{"status":"401","title":"Unauthorized","detail":"The request is missing an Authorization token…"}]}` |
| `GET /v1/me`, `Authorization: Bearer bogus_zzz…` | **401** | identical envelope |
| `POST /v1/oauth/token`, bogus id + secret | **401** | `{"error":"Invalid client credentials"}` |
| `POST /v1/oauth/token`, empty body | **400** | — |
| `GET /v1/totally_bogus_zzz` | **404** | `text/html` Kajabi 404 page |

Anonymous access is a real 401, not a 200 carrying an error object. A bad credential is a real 401.
So `KajabiClient` can trust the status line — and does — while still reading the body on failure,
because the JSON:API `errors[].detail` string is the actionable part.

Note the last row: an unknown path answers **HTML**. `errorMessage` handles both Kajabi envelopes
(the JSON:API array form and the flat OAuth form) and degrades to a capped text slice, so a 404
never turns into a swallowed parse error or a full HTML page in a workflow's error string.

---

## Health checks

### `service` — Kajabi platform status · live · **`severity: "informational"`**

`GET https://status.kajabi.com/api/v2/summary.json`, unauthenticated, egress widened for this hook
alone.

#### The page was found in the vendor's own markup

Not guessed from the vendor name: Kajabi's API 404 page (`GET /v1/totally_bogus_zzz`) links
`https://status.kajabi.com/` in its footer under "App Status" — a first-party citation from the
same host this app calls.

| Candidate | Result |
|---|---|
| `status.kajabi.com` | 200, `text/html`, 132,241 B — **the real page**, vendor-linked |
| `kajabi.statuspage.io` | 200, 132,256 B — the same page under its `statuspage.io` name. **Not** the 127,720 B / md5 `8d3c480a2267` unclaimed shell |
| `kajabi.instatus.com` | 200 after redirect to `instatus.com`, **216,836 B, md5 `b9120253d885`** — the known unclaimed-Instatus trap, hit exactly as catalogued. **Rejected.** |
| `status.kajabi.io` | DNS does not resolve |

#### All three required checks pass

**(a) Bogus siblings** — a catch-all would answer identically for everything; this host routes:

| Path | Result |
|---|---|
| `/api/v2/summary.json` | 200, `application/json`, 5,954 B |
| `/api/v2/status.json` | 200, `application/json`, 229 B |
| `/api/v2/components.json` | 200, `application/json`, 5,841 B |
| `/api/v2/notarealthing.json` | **404, 0 bytes, no content-type** |
| `/api/v9/summary.json` | **404, 0 bytes** |
| `/totally-bogus-zzz` | **404, 0 bytes** |

**(b) Content-type and body** — `application/json; charset=utf-8` on a `.json` path, parsing as a
Statuspage summary.

**(c) Does it describe THIS product?** — the check `circle.statuspage.io` passed (a) and (b) on
while belonging to a Discord bot. Kajabi's passes on both signals: `page.url` is
`https://status.kajabi.com` (the vendor's own domain, matching where it was fetched) with
`page.name: "Kajabi"`, and the components are unmistakably this product: *Offer Checkout*, *Inbound
Webhooks*, *Coupons*, *Kajabi Signups*, *Automated Site Emails*, *Custom Email Domain Setup
(CEDS)*, *Marketing Email Editing and Scheduling*, *Page rendering*.

#### The trap: the group named "API" is not this app's API

The obvious narrowing — track the component group called **API**, exactly as `apps/circle/` tracks
its *Developer API* group — is **wrong here, and quietly so.**

Kajabi's `API` group (`id: 6ht1c6z0fty9`) contains exactly one leaf: **Inbound Webhooks**. That is
the Zapier-style webhook *receiver* described in the help-centre article the catalogue mistook for
developer docs. It is a different surface from `api.kajabi.com`, and no action here touches it. A
check narrowed to that group would report the health of a feature this app never uses while
reporting nothing about the one every action depends on.

**There is no component for the public REST API on the page at all.** Kajabi shipped that API in
late 2025; the status page has not grown a component for it.

#### What is tracked, and why informational

The verdict tracks **App Availability** — the top-level ungrouped component that reports whether
Kajabi is serving at all. It is the only component that is a genuine precondition for
`api.kajabi.com`. Everything else is either a surface this app never touches or the wrong API.

But the signal is **one-directional**: Kajabi being down means the REST API is down; Kajabi being up
proves nothing about `api.kajabi.com`, because nothing on the page speaks for it. A signal that can
only ever explain a failure and never certify health must not be able to pull a tenant's app into
`degraded` — hence `severity: "informational"`.

This is the `discourse`/`followupboss` conclusion reached from the opposite direction: there the
rollup was too *broad*; here the page has no component narrow enough to be conclusive. If Kajabi
ever publishes a REST API component, this should narrow to it and return to the default severity.

All components are still reported for display and the vendor's global indicator is folded into
`message`, so nothing is hidden — it just does not drive the verdict. A *removed* `App
Availability` component falls back to the global indicator **loudly**, saying so in the message.

### `quota` — declared **unavailable**, `severity: "informational"`

Kajabi publishes no rate limit and no usage counter. Established four ways rather than inferred:

1. **Nothing in the spec.** Case-insensitive search of all 12,530 lines for `rate limit`,
   `ratelimit`, `quota`, `throttl`, `429`, `x-ratelimit` → **zero matches**. No operation declares a
   429; no response declares a rate-limit header. Strongest signal, because the document is
   generated from the application.
2. **Nothing in the prose docs.** The `introduction` and `authentication` pages cover the server
   URL, the grants and the Postman collection — nothing on limits.
3. **No headers on the wire.** `GET /v1/version` returned 16 headers; no `RateLimit-*`,
   `X-RateLimit-*` or `Retry-After` among them.
4. **No usage endpoint.** No path matches `usage`, `limit` or `quota`.

**What is deliberately not claimed:** that Kajabi has no limits. It sits behind Cloudflare
(`server: cloudflare`, `cf-ray` on every response), so edge protection very likely exists — and
signal (3) was observed on an unauthenticated 200, not across a sustained authenticated burst. The
honest statement is narrower: there is **no readable remainder**, so any figure reported here would
be invented.

A self-counting probe was rejected for the same reason as in `apps/circle/`, and more strongly: any
Kajabi budget would be per-account, shared with the creator's Zapier zaps and their own scripts.
Counting only this app's calls is correct exclusively for an account using nothing else, and wrong
in the optimistic direction otherwise.

`severity: "informational"` is load-bearing — an `unavailable` entry reports `unknown`, which
outranks `ok`, so at any other severity it would pin the app at `unknown` forever.

### Why there is no `dependency` check

One fixed host serves every tenant, and the site is a query filter rather than a hostname. There is
nothing per-Connection to probe; a `dependency` check would have to invent a host. Pinned by test.

---

## Actions (49)

### Account & sites (3)
`me-get` · `site-list` · `site-get`

### Contacts (5)
`contact-list` · `contact-get` · `contact-create` · `contact-update` · `contact-delete`

`contact-list` surfaces a dozen filters as real params and forwards the rest — Kajabi documents
**75+** `filter[…]` parameters on this one endpoint, and neither rendering all of them nor picking a
favourite dozen is a good answer. See *Additional filters* below.

`contact-create` requires `siteId` (a contact cannot exist without a site relationship) and
deliberately omits `external_user_id`, which Kajabi annotates *"Supported once contact is granted an
offer or makes a purchase"* — a field that silently does nothing at creation time is worse than an
absent one. It **is** offered on `contact-update`.

### Contact tags (4)
`contact-tag-list` · `contact-tag-add` · `contact-tag-remove` · `contact-tag-replace`

Add and remove are additive/subtractive; **`contact-tag-replace` is destructive** — every tag not
listed is removed. Kept as a separate action so the destructive one cannot be reached by accident
from a form that looked like "set the tags". It **refuses a blank list** rather than clearing every
tag: JSON:API would honour an empty array, but a blank input here is far more often an unset
template variable than a deliberate wipe, and the previous tag set is unrecoverable.

### Contact offers — access granting (3)
`contact-offer-list` · `contact-offer-grant` · `contact-offer-revoke`

`contact-offer-grant` is what most Kajabi workflows are actually built for: giving someone access to
a course, membership or digital product paid for outside Kajabi's checkout. Its
`send_customer_welcome_email` flag lives in the request document's **`meta`**, beside `data` rather
than inside it, and is left **unset by default** — this call mails real people, and neither forcing
`true` (mailing someone mid-migration) nor `false` (stripping access instructions from a new
customer) is this app's decision to make silently.

### Contact notes (5)
`contact-note-list` · `contact-note-get` · `contact-note-create` · `contact-note-update` ·
`contact-note-delete`

### Tags & custom fields (3)
`tag-list` · `tag-get` · `custom-field-list`

`custom-field-list` is how you discover what a site's opaque `custom_1`…`custom_3` slots actually
mean, instead of writing a birthday into the field that holds a T-shirt size.

### Customers (2)
`customer-list` · `customer-get`

Not an alias for contacts. `customer_id` is the key `/orders`, `/purchases` and `/transactions` all
filter by, and nothing filters those by contact — so money questions start here.

### Offers & products (5)
`offer-list` · `offer-get` · `offer-product-list` · `product-list` · `product-get`

A **product** is the deliverable; an **offer** is the priced wrapper around one or more products.
Access is granted at the *offer* level, which is why `contact-offer-grant` takes offer ids.

### Courses (2)
`course-list` · `course-get`

### Orders (3)
`order-list` · `order-get` · `order-item-list`

### Purchases & subscriptions (5)
`purchase-list` · `purchase-get` · `purchase-reactivate` · `purchase-deactivate` ·
`purchase-cancel-subscription`

**The sharpest edge in this API.** Kajabi, verbatim: *"Deactivate a purchase by ID, this will not
cancel the subscription… the purchase will be deactivated and the subscription will remain
active."* So the intuitive workflow — "the member cancelled, deactivate their purchase" — **keeps
charging their card** while removing what they were paying for. That is a billing incident reachable
in one step from a plausible action name, so the warning is in the action's *description*, not only
in its source. `purchase-cancel-subscription` cancels at the payment provider **and** deactivates,
making it the complete cancellation.

### Money (4)
`transaction-list` · `transaction-get` · `payout-list` · `payout-get`

Transactions are money in; payouts are money out, and only meaningful for sites on Kajabi Payments.

### Forms (5)
`form-list` · `form-get` · `form-submit` · `form-submission-list` · `form-submission-get`

`form-submit` is the one write that **triggers Kajabi's own automations** — email sequences, tag
application, offer grants the creator configured in the UI. That makes the choice between it and
`contact-create` a real one: use `contact-create` for a migration (firing a year of welcome
sequences at imported addresses would be a serious mistake), and `form-submit` for a live capture
from an external landing page, where the automations *should* run. It is `idempotent: false` and
cannot be made otherwise — every call is a new submission event and there is no dedupe key.

### Additional filters — the escape hatch

`contact-list` and `customer-list` accept a JSON object of any other documented Kajabi filter:
`{"never_subscribed": true}` becomes `filter[never_subscribed]=true`. Keys are validated against
`[A-Za-z0-9_]+` and rejected otherwise — a key containing `]` or `&` would otherwise close the
bracket and reach a different query parameter entirely.

This forwards a **documented** surface; it is not a route to undocumented endpoints.

---

## Not covered, and why

| Not built | Why |
|---|---|
| **Triggers / webhooks** | Kajabi's outbound webhooks (form submitted, purchase made, payment succeeded, order created, tag added/removed) are a real and well-documented surface — the spec even ships `/v1/hooks/*_sample` endpoints returning example payloads. **This pack has no trigger surface.** Registering a webhook via `POST /v1/hooks` without anywhere to receive it would create a subscription pointing at nothing, so `hooks` is deliberately absent entirely. This is the single largest gap and it is architectural, not a research failure. |
| **Blog posts, podcasts, landing pages, website pages** | Read-only CMS collections (`/v1/blog_posts`, `/v1/podcasts`, `/v1/landing_pages`, `/v1/website_pages`). Genuinely available and trivially addable, but they are site-content browsing rather than commerce or CRM, and none is writable — there is no endpoint to publish a post or edit a page. Left out to keep the app's 49 actions on the four things the product is for. |
| **Course authoring and learner progress** | Does not exist in the API. `/v1/courses` is `GET`-only; nothing creates a course, adds a lesson, or reads completion. `filter[completed_assessment_id]` on the contact collection is the only progress signal exposed anywhere, and it is a filter, not a resource. |
| **Tag creation** | The document declares only `GET` on `/v1/contact_tags` and `/v1/contact_tags/{id}`. Tags can be *applied* through this app but not *created* — a tag must already exist in Kajabi. Inventing a create action would mean guessing at an unpublished endpoint. |
| **`PATCH /contacts/{id}/relationships/offers`** (replace offers) | The endpoint exists and is deliberately not exposed. Replacing a contact's offer set revokes every offer not listed — including things they **paid for** — and unlike tags that is not a recoverable mistake. `contact-offer-revoke` states the same intent explicitly and only touches what it names. The tag equivalent *is* exposed, because tags are cheap and reversible. |
| **`relationships.tags` on `PATCH /contacts/{id}`** | The update schema declares it, but as a sibling of `data` rather than inside it — which is not what JSON:API's update semantics describe. Rather than guess the behaviour, tags go through the purpose-built relationship routes, which are unambiguous and keep additive and destructive operations visibly separate. |
| **`/v1/customers/{id}/relationships/offers`** | Duplicates the contact-side offer routes on a different key. One way to grant access is better than two that can disagree. |
| **The username/password grant** | See *Authentication*. Deprecated by Kajabi in the same sentence that documents it, removed by OAuth 2.1, and unnecessary — a User API Key carries everything this app needs. |
| **Repeated `filter[exclude_product_types][]`** | Declared repeatable, but there is no verified example of Kajabi's expected serialisation, and guessing between `[]=a&[]=b` and `=a,b` would produce a filter that silently matches nothing. One value is sent, which is unambiguous. |

### Nothing was taken from a private endpoint

No undocumented or web-app-internal endpoint was used, and none was needed — unlike
`apps/ticktick/`, where declining TickTick's private `/api/v2` cost real coverage. Kajabi's public
surface is broad enough that the question never became a trade-off. The one *documentation*
inconsistency found (`filter[referrer]` declared, but its own example reads `filter[referrer_cont]`)
is resolved in favour of the **declared parameter name**, since that is the generated half of the
document, and it is flagged in `purchase-list`'s source and pinned by test.

---

## Sandbox posture

- Network **only** via `ctx.fetch`, always through `KajabiClient`. Tests grep every action's source
  for a bare `fetch(` and for `Deno.*`.
- Credentials **only** in the auth hooks. Tests grep every action for `credential`, `authorization`,
  `bearer`, `client_secret` and `access_token`, and assert no action param is named anything
  credential-shaped. Comments are stripped before scanning, so explanatory prose neither trips the
  guard nor hides a violation — and the stripper itself is tested.
- No action contains an absolute URL literal; the base URL lives in `lib/client.ts` alone.
- `w6w.network.allow` is the single host `api.kajabi.com`. The `service` check widens egress to
  `status.kajabi.com` for itself only, and runs unsigned — a third-party status host never sees a
  Kajabi token.
- Path ids are percent-encoded; tests assert an id containing `/` cannot escape its path segment.

---

## Icon

`assets/icon.svg` is **Kajabi's own mark**, not a drawing. It was extracted verbatim from the
`<header>` of the 404 page served by `api.kajabi.com` itself — the black rounded square with the
three white gradient facets. Provenance is therefore first-party: the same host this app calls.

n8n has **no** Kajabi node (`/home/segevs/dev/n8n/packages/nodes-base/nodes/` checked first, per
convention), so there was no existing vendor asset in-tree to reuse.

The only modification is that the three `<linearGradient>` element ids were renamed from
`paint0_…`/`paint1_…`/`paint2_…` to `kajabi-a`/`kajabi-b`/`kajabi-c`, so that inlining several icons
into one document cannot collide on a DOM id. Path data, viewBox, fills and stop colours are
untouched. `deno task fmt` is scoped to `.ts` paths only, so it cannot rewrite this file.

---

## Development

```bash
# from packages/apps/apps/kajabi — no deno on the host, it lives in the api container
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/kajabi && deno task check'   # or test / lint / fmt
```

Use `deno task fmt`, never bare `deno fmt` — the bare form would rewrite `assets/icon.svg` and
falsify the verbatim-mark claim above.

**237 tests**, covering every action's path/method/query/body mapping, the client's JSON:API
handling and both error envelopes, all seven auth hooks, and both health checks.

---

## Verification note

Every endpoint, parameter, enum, body shape and error envelope in this app comes from the generated
OpenAPI document or from a live request to `api.kajabi.com` / `status.kajabi.com` on **2026-08-03**.
Where the vendor is quoted, it is the document's own wording. Where something could not be verified
— Kajabi's rate limits, the predicate governing whether a purchase can be reactivated, the
serialisation of the repeated product-type filter — the app says so rather than shipping a guess.
