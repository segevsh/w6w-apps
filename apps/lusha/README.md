# Lusha

B2B contact and company data: find people and companies, reveal emails and phone numbers, prospect
against an ideal customer profile, find lookalikes, read buying signals and subscribe webhooks.
Built against the **v3** API (`https://api.lusha.com`), verified 2026-10-06 against the OpenAPI
document at `docs.lusha.com/openapi.json` (`docs.lusha.com/llms.txt` lists it) and live
unauthenticated probes.

## Auth

`api_key: <uuid>` request header, added by `sign`. Probe and credit/rate check: `GET /v3/account/usage`
(body is `credits`, `rateLimits`, `plan`, `pricing` — never the key; limited to 5 requests/minute).

## Actions (24)

| Key | Type | Title |
|---|---|---|
| `account-usage` | read | Get Account Usage |
| `company-enrich` | perform | Enrich Companies |
| `company-filter-list` | read | List Company Filter Types |
| `company-filter-value-list` | read | List Company Filter Values |
| `company-lookalike` | read | Find Lookalike Companies |
| `company-prospect` | read | Prospect Companies |
| `company-search-and-enrich` | perform | Search and Enrich Companies |
| `company-search` | read | Search Companies |
| `company-signal-type-list` | read | List Company Signal Types |
| `company-signals` | read | Get Company Signals |
| `contact-enrich-job-get` | read | Get Contact Enrich Job |
| `contact-enrich` | perform | Enrich Contacts |
| `contact-filter-list` | read | List Contact Filter Types |
| `contact-filter-value-list` | read | List Contact Filter Values |
| `contact-lookalike` | read | Find Lookalike Contacts |
| `contact-prospect` | read | Prospect Contacts |
| `contact-search-and-enrich` | perform | Search and Enrich Contacts |
| `contact-search` | read | Search Contacts |
| `contact-signal-type-list` | read | List Contact Signal Types |
| `contact-signals` | read | Get Contact Signals |
| `subscription-create` | perform | Create Webhook Subscriptions |
| `subscription-delete` | perform | Delete Webhook Subscriptions |
| `subscription-get` | read | Get Webhook Subscription |
| `subscription-list` | read | List Webhook Subscriptions |

Enrich actions, search-and-enrich and subscription creation are `perform` and not idempotent: they
spend credits or create rows. Batch endpoints answer 200 with a per-item `error`
(`NOT_FOUND`, `COMPLIANCE_RESTRICTED`, `ENRICH_FAILED`, `NO_SCORE`) — read `results[].error`.

## Health checks

- `service` — Statuspage `status.lusha.com` (page id `swcqqk7psrfy`, name "Lusha Status Page"). Reads
  only the `Lusha API` and `Prospecting` components; the page also covers the website, dashboard,
  plugin, Engage and AWS/Intercom, which must not fail an API check.
- `api` — unsigned `GET /v3/account/usage`; the JSON 401 is a pass.
- `quota` — credits plus the daily/hourly/minute windows from `/v3/account/usage`; degraded below 10% left.
- `auth:api-key` — derived from the credential test, classified from the body.

## Decisions and gaps

- **Only v3.** The v2 document (`/v2/person`, `/prospecting/*`, `/account/usage`) is the legacy
  surface (changelog "API Versioning": 1.x Legacy, 2.x Recent); not built. v3 has no `deprecated` operations.
- **Not covered** (confirmed in the reference, left out): the Tables API (beta; 25 operations),
  Contact Buying Group, Signal Score, Website Visits, Conversations, Audit Logs, account secret,
  opt-out subscriptions, subscription update/test, signal-filter discovery. Only confirmed paths are shipped.
- Prospect/lookalike `filters`, `seeds` and `exclude` are JSON passthroughs (the filter grammar is
  large and versioned by Lusha); use the `*-filter-list` / `*-filter-value-list` actions to discover values.
- Contact `reveal` takes `emails` and/or `phones`; company `reveal` takes the extras listed in the
  reference (each charged per result).
- Icon: `assets/icon.png` is the vendor's `https://www.lusha.com/apple-touch-icon.png` byte-for-byte
  (180x180, 1,762 bytes; the homepage `<link rel>` tags serve only 32/180/192 px favicons).
  `assets/icon.dark.png` is the same image with the palette's transparent entries composited on white
  (pixels and indices untouched) so the black mark is legible on the dark tile; the audit requires a dark variant.
