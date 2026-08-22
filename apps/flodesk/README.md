# Flodesk

Manage Flodesk subscribers, segments, workflows, custom fields and webhooks via the Flodesk API v1.

- **Categories** — marketing, email
- **Auth methods** — api-key (HTTP Basic), oauth2
- **Actions** — 22
- **Health checks** — quota (implemented), service (declared `unavailable`)
- **Egress allowlist** — `api.flodesk.com`

## Is this API actually available?

**Yes — it is generally available, publicly documented, and self-serve for any paying customer.**
No beta label, no waitlist, no partner gate on the ordinary path. There is one real restriction and
it is worth stating plainly:

| Question | Answer |
| --- | --- |
| GA, beta, or gated? | **GA.** Flodesk's docs carry no beta/early-access wording anywhere. |
| Waitlist? | **No** — for the API-key path. |
| Plan tier? | **Yes.** "API keys are available to paid Flodesk members only. They're not available on trial or free plan accounts." A paid plan of any tier is enough. |
| Docs public? | **Yes**, at https://developers.flodesk.com/ — full OpenAPI 3, no login. |

The one thing that *is* gated is **OAuth** — see [Auth](#auth) below. That gate applies to partner
integrations only; a single account connecting itself needs nothing but an API key.

## How big is this API, really?

**Twenty-two operations, and all 22 have an Action here.** Nothing was padded to make this app look
comparable to the larger integrations in the pack, and nothing was held back.

This app was built against Flodesk's own OpenAPI 3 document, read on **2026-08-03**. That document
is not served at a `.json` URL — `/openapi.json`, `/reference` and `/api-reference` on
`developers.flodesk.com` all answer **403**. It is embedded in the Redoc bundle at the docs root as
`__redoc_state.spec.data`, and that object is the authoritative source every path, parameter name,
enum value and response field below was read off. Nothing here came from memory.

**What Flodesk does not have.** Worth knowing before you plan a workflow around it:

- **No campaign/email endpoints.** You cannot create, schedule, send or report on an email. Flodesk
  is an email tool whose API cannot send email.
- **No form endpoints**, despite forms being a headline Flodesk feature.
- **No analytics** — no opens, clicks, or per-email stats.
- **No delete** for subscribers, segments or custom fields. The only delete in the entire API is
  `DELETE /webhooks/{id}`.
- **No update** for custom fields, and no way to choose a custom field's `key`.
- **No workflow management** — you can list workflows and move subscribers in and out, but not
  create, edit, start, pause or delete one. A workflow object carries only `id` and `name`.
- **No re-subscribe.** `unsubscribe` is one-way through the API.
- **No whoami under `/v1`** — the only user lookup is `GET /oauth2/userinfo`, which needs an OAuth
  token, so an API-key connection cannot label itself.

### The three operations deliberately NOT implemented

Flodesk's OpenAPI document also contains three operations under a `campaign` tag —
`GET /campaigns`, `POST /campaigns/canva`, `GET /campaigns/canva/design-state`. **They are excluded
here on purpose**, and the reasoning is recorded so the decision can be re-litigated rather than
guessed at:

- The `campaign` tag is **absent from Flodesk's own `x-tagGroups`**, so Redoc never renders these
  three. They appear in no published documentation page; only in the machine-readable file. The
  vendor has deliberately withheld them from its documented surface.
- Two of the three are plainly a **private Canva partner integration** (`bundle_url`,
  `design_token`, `page_id`) that no third party can drive.
- **Liveness could not be confirmed.** Flodesk checks auth *before* routing, so an unauthenticated
  request to `/v1/campaigns` and to a deliberately invented `/v1/bogus-endpoint-xyz` return the
  **identical** `401 {"code":"unauthorized"}`. A probe cannot distinguish a real endpoint from a
  nonexistent one without a live key.

Implementing an intentionally-undocumented endpoint whose existence cannot be verified would be
exactly the padding this app avoids. If Flodesk publishes them, they are three easy additions.

## Auth

Flodesk documents two schemes and **both are implemented**, because both are fully specified — there
is no guesswork in either.

### `api-key` — HTTP Basic (the default path)

Flodesk's OpenAPI declares this as `{ "type": "http", "scheme": "basic" }`, and its description is
explicit:

> "Enter the API key as the username and set the password to an empty string."
>
> `curl "api_endpoint_here" -H "User-Agent: Your App Name (www.yourapp.com)" -H "Authorization: Basic $(echo YOUR_API_KEY: | base64)"`

Note the **trailing colon** inside the base64 — the wire value is `base64("<API_KEY>:")`, the key as
username with an *empty* password. That transformation cannot be expressed by a plain `apiKey`
config (which only prefixes a verbatim value), so this app declares `type: "basic"` and does the
encoding in `sign`. Only the key is collected; the password half is fixed at empty by the vendor and
is not a field a user could get right or wrong.

Mint one at **Flodesk → Account → Integrations → API**
(https://app.flodesk.com/account/integration/api). Paid plans only.

`test` probes `GET /v1/segments/colors` — the cheapest authenticated read in the surface (a fixed
array of hex strings; no pagination, no account data). Flodesk API keys carry **no scopes at all**,
so there is no permission a valid key could lack that would make this probe misreport a working app
as broken. It is also the only endpoint in the document whose declared responses are `200` and
`401`, which suggests Flodesk treats it as the auth-shaped call.

### `oauth2` — authorization code (the partner path)

Fully published, so nothing is invented:

| | |
| --- | --- |
| Authorize | `https://api.flodesk.com/oauth2/authorize` |
| Token | `https://api.flodesk.com/oauth2/token` (HTTP Basic `client_id:client_secret`, form-encoded) |
| Scopes | exactly one — `all` |
| Access token | `expires_in: 86400` (24h) |
| Auth code | expires in 30 minutes |
| UserInfo | `GET https://api.flodesk.com/oauth2/userinfo` → `{ id, email, full_name, profile_url, created_at }` |

Two details that matter:

- **PKCE is explicitly `false`.** The `pkce` option *defaults to true*, so omitting it would
  silently enable PKCE. Flodesk's documented authorize URL carries no `code_challenge`, its token
  exchange sends no `code_verifier`, and it authenticates the client with a Basic
  `client_id:client_secret` pair — the confidential-client pattern. It is turned off deliberately.
- **Refresh tokens are single-use.** "Every time a client performs a token refresh, a new
  refresh_token is issued along with a new access_token, and the previous refresh_token is
  invalidated." The host must persist the new one from every refresh; replaying a spent token fails
  and the connection then needs re-authorization.

**This method is gated.** Client credentials are not self-serve — Flodesk reviews partner
integration applications via a form linked from its API description. Use `api-key` unless you are
building a multi-tenant partner integration and Flodesk has approved you.

## Actions

| Resource | Action | Endpoint |
| --- | --- | --- |
| subscriber | List Subscribers | `GET /subscribers` |
| subscriber | Get Subscriber | `GET /subscribers/{id_or_email}` |
| subscriber | Create or Update Subscriber | `POST /subscribers` |
| subscriber | Batch Create or Update Subscribers | `POST /subscribers/batch` |
| subscriber | Add Subscriber to Segments | `POST /subscribers/{id_or_email}/segments` |
| subscriber | Remove Subscriber from Segments | `DELETE /subscribers/{id_or_email}/segments` |
| subscriber | Unsubscribe Subscriber | `POST /subscribers/{id_or_email}/unsubscribe` |
| segment | List Segments | `GET /segments` |
| segment | Get Segment | `GET /segments/{id}` |
| segment | Create Segment | `POST /segments` |
| segment | List Segment Colors | `GET /segments/colors` |
| workflow | List Workflows | `GET /workflows` |
| workflow | Add Subscriber to Workflow | `POST /workflows/{workflow_id}/subscribers` |
| workflow | Remove Subscriber from Workflow | `DELETE /workflows/{workflow_id}/subscribers/{id_or_email}` |
| custom-field | List Custom Fields | `GET /custom-fields` |
| custom-field | List All Custom Fields | `GET /custom-fields/all` |
| custom-field | Create Custom Field | `POST /custom-fields` |
| webhook | List Webhooks | `GET /webhooks` |
| webhook | Get Webhook | `GET /webhooks/{id}` |
| webhook | Create Webhook | `POST /webhooks` |
| webhook | Update Webhook | `PUT /webhooks/{id}` |
| webhook | Delete Webhook | `DELETE /webhooks/{id}` |

### Usage notes

**Identifiers.** Flodesk's path parameter is literally `{id_or_email}` — the same endpoint takes
either a subscriber id or an email address. There is no separate lookup-by-email action because the
vendor needs none. Values are percent-encoded, which matters for addresses containing `+`.

**Upserts.** `POST /subscribers` is a genuine upsert (Flodesk's own summary is "Create or update",
and it answers `200`, not `201`), so it is marked `idempotent: true`. It also accepts `segment_ids`
directly, which is usually better than a create followed by an add — one call, and it works for a
subscriber who does not exist yet. `POST /subscribers/{id}/segments` does **not** create anyone and
404s for an unknown address.

**Batch is partially successful by design.** `POST /subscribers/batch` returns
`{ successes, failures }`, each failure carrying the zero-based `index` of the offending item plus a
`code` and `message`. **A 200 does not mean every subscriber was written** — read `failures`. Both
arrays are declared as separate outputs for that reason. The 50-item cap is enforced before the call
so a mistake does not spend one of the twenty requests you get per minute.

**Custom fields are keyed, not labelled.** A subscriber's `custom_fields` object is addressed by
each field's `key`, not its display `label`. `List All Custom Fields` (the unpaginated form) is the
one to reach for when building that object.

**Idempotency was decided per endpoint, not by rule.** Segment membership is a set, so both
membership writes converge and are marked idempotent. **Adding a subscriber to a workflow is not** —
entering a workflow is an *event*, not a state, and Flodesk documents no dedupe, no
"already enrolled" response and no idempotency key. A retry can plausibly re-enter the subscriber
and resend the whole sequence, so it is honestly marked `idempotent: false`. Removal from a
workflow, by contrast, converges and is marked `true`.

**Two quirks reproduced exactly rather than tidied up.** `GET /workflows` takes **`perPage`** (not
`per_page`, which every other list endpoint uses) and defaults to 10 rather than 20. Sending
`per_page` there would be silently ignored. And `DELETE /subscribers/{id}/segments` carries a JSON
**request body** — unusual for a DELETE, but exactly what Flodesk documents.

**Webhooks have no signature.** Flodesk's webhook schema exposes no signing secret and no signature
header, so a receiver cannot verify authenticity. Treat the post URL as a secret and make its path
unguessable. The three published events are `subscriber.created`, `subscriber.added_to_segment` and
`subscriber.unsubscribed`; Flodesk types the `events` array as a bare `string[]` with no enum, so
this app offers those three without rejecting others.

### Pagination and envelope

Offset pagination throughout — **no cursors anywhere**. `page` and `per_page` (default 20, max 100),
with responses shaped `{ meta, data }` where `meta` is
`{ page, total_pages, per_page, total_items }`.

Two endpoints break the pattern and return a **bare array with no envelope**:
`GET /segments/colors` and `GET /custom-fields/all`. Both are modelled as `read` actions rather than
`search`, and neither advertises a `meta` output.

## Health

### `quota` — implemented

Flodesk publishes real rate-limit response headers, so this is a live reading rather than a restated
constant:

```
X-Fd-RateLimit-Limit: 100
X-Fd-RateLimit-Remaining: 68
```

| Endpoint | Limit |
| --- | --- |
| All endpoints (default) | 100 requests/minute |
| `POST /v1/subscribers/batch` | 20 requests/minute |

The check probes `GET /v1/segments/colors` (the cheapest signed read), reports `degraded` below 10%
of the allowance and `down` at zero, and is `severity: "informational"` so headroom never fails a
verdict — a 429 is a wait, not an outage. It needs no `network.allow` of its own, since
`api.flodesk.com` is already the app's single egress entry, which is what makes signing it legal.

Two limits stated honestly in the hook itself:

1. **No reset time is reported.** Flodesk documents no `X-Fd-RateLimit-Reset` and no `Retry-After`.
   "Per minute" in prose is not the same as knowing when the current window ends, so `resetAt` is
   left unset rather than computed from an assumption.
2. **Header presence on a 200 is unverified.** This app was written without a live Flodesk key.
   Unauthenticated requests carry no `X-Fd-RateLimit-*` headers, which is expected (a 401 never
   reaches the metered handler) and therefore proves nothing either way. When the headers are
   absent the hook reports `unknown` with an explicit message instead of passing off the documented
   100 as a live reading.

The batch endpoint's separate 20/minute bucket is deliberately not probed — doing so would spend a
request from a budget of twenty, and Flodesk offers no way to read that bucket without a write.

### `service` — declared `unavailable`, not omitted

**Flodesk publishes no status page.** Established by probing on 2026-08-03, not assumed:

| Probe | Result |
| --- | --- |
| `status.flodesk.com` | **NXDOMAIN** — does not resolve |
| `status.flodesk.io` | **NXDOMAIN** |
| `flodesk.statuspage.io/api/v2/status.json` | **HTTP 200** — but 127 KB of `text/html` titled *"Real-Time Incident Communication with Statuspage \| Atlassian"*, after a cross-host redirect to `atlassian.com`. The subdomain is unclaimed. |
| `flodesk.statuspage.io/api/v2/bogus-not-real.json` | **404, empty body** |

That third row is the trap worth naming. A naive probe sees `200` on the Statuspage-shaped path and
concludes the API is real — and the bogus-sibling control *appears* to confirm it, because the two
paths return different responses. **It is the content type that settles it**: a genuine Statuspage
v2 API answers `application/json` with a `page.name`; this answers `text/html` with an Atlassian
sales pitch. Both checks were needed, and neither alone would have been enough.

Flodesk also publishes no Atom/RSS feed, so the "declare a feed, don't parse one" route is closed
too. The entry therefore carries `unavailable: { reason }` and no hook.

`severity: "informational"` is load-bearing here: an `unavailable` entry always reports `unknown`,
and `unknown` outranks `ok` in the roll-up — so at any other severity this declared absence would
pin every Flodesk health verdict at `unknown` forever.

## Links

Every URL below was fetched and confirmed **200** on 2026-08-03.

- **Website** — https://flodesk.com
- **API documentation** — https://developers.flodesk.com/ — the authoritative source this app was
  built against. Its embedded OpenAPI 3 document (`__redoc_state.spec.data` in the page's Redoc
  bundle) supplied every path, parameter, enum and response shape above.
- **What is the Flodesk API?** — https://help.flodesk.com/en/articles/4477761 — availability and
  the paid-plan requirement
- **About API Keys** — https://help.flodesk.com/en/articles/4477889 — creating and managing keys
- **API key page (in-app)** — https://app.flodesk.com/account/integration/api
- **OAuth 2.0** — https://oauth.net/2/ — the spec Flodesk's partner flow implements
- **GitHub** — **none cited.** `github.com/flodesk` exists and resolves, but it is named
  "Flodesk VN" with no description, no linked website, and a single public repo
  (`wp-theme-extras`, "Composer package for ED. WordPress Themes") unrelated to the email product.
  It could not be verified as the vendor's official organisation, so it is not presented as one.
  Flodesk publishes no official SDK.

## Icon

`assets/icon.png` — Flodesk's app icon; the previous artwork was the wordmark at 4.65:1, the widest mark in the pack.

Taken from <https://flodesk.com/web-app-manifest-512x512.png> on 2026-08-15.

- **2,774 bytes**, `image/png`, 512 × 512, md5 `96484f3f9598db0d5a3b9a3001b4d5b8`
- raster, because the vendor publishes no vector of this mark

Flodesk publishes no usable vector: their `safari-pinned-tab.svg` is a potrace of the bitmap, not the source artwork. The previous file was the wordmark at 4.65:1 — the widest mark in the pack.

## Development

```bash
deno task test    # 112 unit tests, mocked HookContext — no network
deno task check
deno task lint
deno task fmt
```
