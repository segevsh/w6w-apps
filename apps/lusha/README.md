# Lusha

B2B contact and company data: find people and companies, reveal emails and phone numbers, prospect
against an ideal customer profile, find lookalikes, read buying signals and subscribe webhooks.
Built against the **v3** API (`https://api.lusha.com`), verified 2026-10-06 against the OpenAPI
document at `docs.lusha.com/openapi.json` (`docs.lusha.com/llms.txt` lists it) and live
unauthenticated probes.

## Triggers

6 webhook triggers (API-registered, HMAC-signed) and 1 poll trigger.

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `signal-received` — Signal Received (any signal) | webhook (API-registered, signed) | any signal for a subscribed contact or company, narrowed by the optional `signalTypes` list it registers | signal type, entity type and id, subscription id, signal time, credits charged, the signal data |
| `contact-promotion` — Contact Promoted | webhook (API-registered, signed) | contact signal `promotion` | the same, for a contact id |
| `contact-company-change` — Contact Changed Company | webhook (API-registered, signed) | contact signal `companyChange` | the same, for a contact id |
| `company-hiring-surge` — Company Hiring Surge | webhook (API-registered, signed) | company signals `surgeInHiring`, `surgeInHiringByDepartment`, `surgeInHiringByLocation` | the same, for a company id |
| `company-headcount-change` — Company Headcount Change | webhook (API-registered, signed) | company signals `headcountIncrease1m`/`3m`/`6m`/`12m` and `headcountDecrease1m`/`3m`/`6m`/`12m` | the same, for a company id |
| `company-news` — Company News | webhook (API-registered, signed) | company signals `commercialActivityNews`, `corporateStrategyNews`, `financialEventsNews`, `marketIntelligenceNews`, `peopleNews`, `productActivityNews`, `riskNews` | the same, for a company id |
| `new-subscription` — New Webhook Subscription | poll, newest first (`GET /api/subscriptions`, `limit=100`, every 5 minutes) | a webhook subscription created on the account | each new subscription: entity, signal types, callback URL, active flag |

The company signals `websiteTrafficIncrease`, `websiteTrafficDecrease`, `itSpendIncrease` and `itSpendDecrease` have no named trigger: use `signal-received` with `entityType` company and those names in `signalTypes`.

**Setup.** For `signal-received`, give the `entityType` (`contact` or `company`) and up to 25 comma-separated `entityIds`; optionally narrow `signalTypes` (the Signal Type List actions list them). The named triggers fix the entity type and the signal types themselves, so they ask only for the `entityIds` and the secret; a verified delivery of any other signal type is acknowledged without starting a run. Subscribing registers the callback URL with `POST /api/subscriptions` (one Lusha subscription per id) and keeps the created ids; unsubscribing removes them with `POST /api/subscriptions/delete` (a subscription Lusha reports `NOT_FOUND` counts as deleted). If Lusha creates only some of the subscriptions, the ones it created are removed again and the subscribe fails. Lusha signs with your **account webhook secret**: create it with `POST /api/account/secret/regenerate` (Lusha shows it once; there is no action for it here), and paste it into the trigger's `signingSecret` param. A delivery costs Lusha credits (`creditsCharged` in the payload), each signal once.

**Trust model.** Every delivery carries `X-Lusha-Signature` (hex HMAC-SHA256) and `X-Lusha-Timestamp`. The trigger refuses a delivery whose secret is unset, whose headers are missing, whose timestamp is more than five minutes from now, or whose signature over `timestamp + "." + the exact received body` does not match (constant-time compare), before it parses the body. Lusha documents the signed text as `JSON.stringify(payload)`; the host verifies the received text itself, so a body re-serialised anywhere in between will fail. The signature binds the body, so tampered data is refused; an identical delivery replayed inside the five-minute window is not detected (use the delivery `id` to de-duplicate downstream). Lusha requires an acknowledgement body `{ received: true, timestamp, webhookId }`; the trigger answers with it.

**Not covered as polls.** The six filter and signal-type list actions (`company-filter-list`, `company-filter-value-list`, `company-signal-type-list`, `contact-filter-list`, `contact-filter-value-list`, `contact-signal-type-list`) return reference data (the valid filter and signal names), not records. `contact-search` and `company-search` look up the identifiers you pass in and are billed per successful result ("Search Contacts / Companies is charged per successful result via the `api_search` action"), so there is no feed to poll without spending credits on every check. Signals arrive through the webhook triggers above.

Docs (verified 2026-11-10): https://docs.lusha.com/v2/webhooks/overview.md, https://docs.lusha.com/v2/webhooks/manage-subscriptions.md, https://docs.lusha.com/v2/webhooks/security.md, https://docs.lusha.com/v2/api-reference/signals/get-signal-options.md (signal types), https://docs.lusha.com/api-reference/webhooks/list-subscriptions.md (newest-first order, limit 100) and https://docs.lusha.com/enrichment/search-contacts.md / https://docs.lusha.com/enrichment/search-companies.md (billing)

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
