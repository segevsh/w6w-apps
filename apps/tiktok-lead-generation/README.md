# TikTok Lead Generation

Read Instant Form and direct-message leads from TikTok's Business API — the Lead
Generation surface of the Marketing API, distinct from campaign/ad-group/ad management
(out of scope here on purpose).

- **Categories** — marketing, social-media
- **Auth methods** — access-token (apiKey, `Access-Token` header)
- **Actions** — 4
- **Triggers** — 1 (webhook)
- **Egress allowlist** — `business-api.tiktok.com`
- **API docs portal** — https://business-api.tiktok.com/portal/docs

## Read this before trusting any endpoint below

TikTok's docs portal is real (confirmed live, HTTP 200, page title "TikTok API for
Business"), but every doc page renders its **body** entirely client-side from an
internal, non-public API. Checked and ruled out: the page's `__NEXT_DATA__` SSR payload
(carries only `seoTitle`/`seoDescription`, never the body), a `_next/data` prerendered
JSON (the page uses `getServerSideProps`, so nothing is statically exported), every
decompiled JS chunk the `/docs` and `/api-playground` routes load (~1.5 MB, zero
`/open_api/...` path strings anywhere), and a plausible internal REST path for the doc
content itself (a dozen guesses, all 404). **This means no doc page's exact
request/response field names could be read for this app** — everything below was
verified a different way: by **live-probing the real API** and by cross-referencing
**TikTok's own official SDK** (`github.com/tiktok/tiktok-business-api-sdk`, verified real
via the GitHub API, MIT-licensed, 2,565 files across Java/JS/Python).

### How "the route is real" was verified without reading its doc page

TikTok's API answers a **plain-text `Not Found`** for a path that doesn't exist, and a
**structured JSON error** — `{"code": 40105, "message": "Access token is incorrect or
has been revoked.", "request_id": "..."}` — for a path that exists but was called with a
syntactically-fake token. That distinction is a reliable existence probe that needs no
real credential, and it's how every route this app calls was confirmed live on
2026-09-05:

| Route | Method | Confirmed |
|---|---|---|
| `/open_api/v1.3/lead/get/` | GET | structured error, not plain-text 404 |
| `/open_api/v1.3/lead/field/get/` | GET | structured error, not plain-text 404 |
| `/open_api/v1.3/page/lead/get/` | GET | structured error, not plain-text 404 |
| `/open_api/v1.3/page/lead/task/download/` | GET | structured error, not plain-text 404 |
| `/open_api/v1.3/oauth2/advertiser/get/` | GET | structured error, not plain-text 404; matches the SDK's `oauth2_advertiser_get` |

The same technique also ruled things **out** rather than leaving them silently absent: a
dozen plausible "list Instant Forms" paths (`page/lead/form/list/`, `instant_form/list/`,
`page/leadgen_form/list/`, `lead/list/`, …) all answered the plain-text 404, so no
"list forms" action exists in this app — see `get-lead-fields`'s doc comment.

### What TikTok's own sitemap confirms exists (but not the field-level detail)

`business-api.tiktok.com/portal/sitemap.xml` is a real, static, non-JS sitemap listing
1,117 real doc pages. It confirms these Lead Generation pages genuinely exist at v1.3,
even though their bodies couldn't be fetched:

- `get-an-instant-form-lead-or-a-direct-message-lead` — server-rendered SEO title: "Get a
  TikTok Instant Form lead or a direct message lead" (maps to `get-lead`)
- `get-fields-of-an-instant-form-or-direct-message-leads` (maps to `get-lead-fields`)
- `download-leads`, `create-a-lead-download-task` (maps to `download-page-leads`)
- `obtain-leads-as-advertisers`, `export-leads-and-postback-crm-events`,
  `migrate-leads-to-a-bc`, `create-a-test-lead`, `get-a-test-lead`,
  `delete-a-test-lead` — real pages, but no live route could be found or confirmed for
  any of them, so none is implemented here.

### A finding worth a day of someone's time: this surface is excluded from TikTok's own SDK

TikTok's official, auto-generated SDK has a dedicated API class for **every** other
Marketing API category — `AdApi`, `AdgroupApi`, `CampaignCreationApi`, `AudienceApi`,
`CatalogApi`, `IdentityApi`, `ReportingApi`, 24 in total — generated straight from
TikTok's internal OpenAPI spec. It has **zero** references to `lead`, `leadgen`,
`instant_form`, or `instant_page` anywhere in its 2,565 files, despite the four routes
above being demonstrably live. n8n (500+ integrations, checked via its real GitHub tree)
has no TikTok node at all. Read together, this is strong circumstantial evidence that
TikTok deliberately keeps Lead Generation data-retrieval **out of its general-purpose,
self-serve tooling** — consistent with the real-world requirement that TikTok Lead
Generation API access is gated behind a separate CRM-partner approval process, not
granted to every app that completes standard OAuth. **If your app can authenticate but
every action here 404s or 400s with a permission-shaped error, this is almost certainly
why** — it is not a bug in this app.

### Why `filtering` is a raw JSON pass-through instead of named fields

Every other Marketing API GET/list endpoint TikTok documents uses the same convention —
confirmed directly in the SDK's `ad_api.py`: `ad_get(advertiser_id, filtering, page,
page_size, fields)`, where `filtering` is a JSON-encoded object whose **allowed keys are
specific to that one endpoint** and documented per-endpoint. Since this app's own
Lead Generation doc pages couldn't be read, the exact allowed keys for `filtering` on
`lead/get/`, `lead/field/get/`, `page/lead/get/`, and `page/lead/task/download/` could
not be confirmed. Rather than fabricate field names, every action exposes `filtering` as
a raw JSON param the caller fills in from whatever TikTok's UI or account-specific
support documentation actually names — the universal envelope (`advertiser_id`/
`business_id`, `page`, `page_size`, response shape `{code, message, data, request_id}`)
is handled for you.

### `businessId` on the two `page/lead/*` actions is a lower-confidence choice

`GET /open_api/v1.3/business/get/`, probed with **zero** query params, answered
`{"code": 40002, "message": "Missing required field(s): creator_id or business_id."}`
— confirming `business_id` is a real scoping parameter in this API, for a *different*
endpoint. It is used here on `get-page-lead` and `download-page-leads` by analogy (a Page
belongs to a Business Center), not because it was confirmed for those two routes
directly. If it's the wrong field for your account, pass the correct one through
`filtering` instead.

## Actions

| Key | Route | Notes |
|---|---|---|
| `get-lead` | `GET /lead/get/` | Ads-side: a single Instant Form or DM lead. `advertiserId` required. |
| `get-lead-fields` | `GET /lead/field/get/` | Ads-side: the field schema of a form. `advertiserId` required. |
| `get-page-lead` | `GET /page/lead/get/` | Organic-Page-side lead. `businessId` required (see caveat above). |
| `download-page-leads` | `GET /page/lead/task/download/` | Organic-Page-side bulk export. `businessId` required (see caveat above). Confirmed GET-only: `POST` on the same path 404s. |

## Triggers

| Key | Mechanism | Vendor event | What the run gets |
|---|---|---|---|
| `new-lead` — New Lead | webhook (registered through the API) | `subscribe_entity: LEAD` | the lead's id and source, the ad account, campaign, ad group and ad, and the answers submitted |

**Setup.** Add the trigger to a workflow and fill in:

- **App ID** and **App Secret** — TikTok for Business developer portal > My Apps > your app > App
  Detail > Basic Information. The same two values as in the connection.
- **Access Token** — the long-lived token of the account that authorized the app (the connection's
  token). Trigger hooks cannot read the connection's credential, so it is pasted here too. TikTok
  stops sending leads if that token is revoked; regenerate it and re-save the trigger.
- **Advertiser ID** or **Form Library ID** (one of them). The advertiser needs you to be Admin on
  the ad account. **Instant Form (Page) ID** narrows it to one form; **Lead source** picks
  Instant Form (default) or Direct message.

On activation w6w calls `POST /open_api/v1.3/subscription/subscribe/` with the callback URL and
stores the returned `subscription_id`; deleting the trigger calls `/subscription/unsubscribe/`.

**Trust model.** TikTok's lead-subscription pages do not themselves describe the signature; the scheme
below comes from its general webhook-verification page and no live lead delivery has been observed. If lead
deliveries are unsigned or signed differently, every delivery is refused (the trigger never fires and each
refusal is recorded as a failed event). The expected header is `TikTok-Signature: t=<unix seconds>,s=<hex>`, an
HMAC-SHA256 of `<t>.<raw request body>` keyed with the App Secret. w6w recomputes it over the exact
bytes received, compares in constant time, and accepts only a timestamp within 300 seconds of now
(TikTok's own sample uses 5 s; 300 s tolerates clock skew and a delayed first attempt). A missing or
malformed header, a wrong signature, a stale or future timestamp, or an unset App Secret refuses the
delivery: no run starts, and nothing from the request is echoed back. TikTok delivers at least once, so
the same lead can arrive twice; use `leadId` to dedupe. Lead and advertiser ids are 64-bit and
arrive as strings.

**Docs.** https://business-api.tiktok.com/portal/docs/create-a-subscription/v1.3,
https://business-api.tiktok.com/portal/docs/cancel-a-subscription/v1.3 and
https://business-api.tiktok.com/portal/docs/webhook-verification/v1.3 (verified 2026-11-10). The
docs need a JavaScript-rendering browser: plain `curl` returns an empty shell. They describe the
signed text as "a stringified JSON copy of the webhook request body" and sample `JSON.stringify` of
the parsed body; this trigger verifies over the raw bytes TikTok sent, which is the same string whenever TikTok
sends compact JSON. If TikTok signs a re-serialised form of a body it sent differently, deliveries
are refused rather than accepted unverified; no live delivery was available to confirm which.

## Auth

**Access Token** (`type: "apiKey"`, header `Access-Token`) — confirmed exact casing
against TikTok's own SDK (`header_params['Access-Token']` in
`authentication_api.py`) and live (a fake token is recognized and rejected with a
specific "incorrect or revoked" error, not a "no credential" error).

Three fields are collected because the one credential-liveness probe this app could
confirm is both real and scope-independent — `GET /oauth2/advertiser/get/` — needs all
three, per the same SDK method (`oauth2_advertiser_get(app_id, secret, access_token)`):

- `appId` — the TikTok for Business app's App ID (Client Key)
- `appSecret` — the app's App Secret (Client Secret)
- `accessToken` — the long-lived token minted for an account that authorized the app

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared absent.** `business-api.tiktok.com/portal/api-service-status` is a real page
(confirmed live, HTTP 200) but — like every doc page — renders entirely client-side; its
SSR payload carries only `isMobileDevice`/`isTabletDevice` flags, and no JSON/RSS/Atom
feed could be found behind it.

### Is this credential live?

This is what the Auth `test` hook does. It calls `GET /oauth2/advertiser/get/` with the
connection's `appId`/`appSecret` as query params and the `accessToken` as the
`Access-Token` header — the narrowest usable credential can always reach it, since it
needs no `advertiser_id`/`business_id` scope the credential might legitimately lack. None
of this app's four Lead Generation routes could serve as the probe instead: every one of
them requires a scope id this Auth method doesn't collect, so probing them would report a
live credential missing only that scope as broken.

### Do we have quota left?

**Declared absent.** No `X-RateLimit-*`/`RateLimit-*`-shaped header of any kind was
observed on live responses from any route this app calls, checked 2026-09-05. TikTok
documents Marketing API ceilings as prose tiers, not response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | _declared absent_ |
| `quota` | quota | app | signed | informational | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | derived from the `access-token` auth method's `test` hook |

---

Researched and endpoint-verified live 2026-09-05 by direct HTTP probing of
`business-api.tiktok.com` and by reading TikTok's own official SDK source
(`github.com/tiktok/tiktok-business-api-sdk`) — **not** by reading the docs portal's
rendered content, which this app's tooling could not fetch. Re-verify against the live
portal directly (in a real browser session) before extending this app's scope.
