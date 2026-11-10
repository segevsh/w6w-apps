# Clearout

Verify emails (instant and bulk), find professional emails, reverse-lookup people and companies,
validate names and resolve domain MX/Whois with [Clearout](https://clearout.io). 27 actions.

Verified 2026-10-06 against the vendor's API reference (`docs.clearout.io/developers/api/*`, the
OpenAPI 3.0.2 documents embedded in each page, `servers: https://api.clearout.io/v2`) and live
unauthenticated probes of `api.clearout.io`. No `deprecat`/`sunset`/`end of life` wording appears
anywhere in the API reference; `v2` is the only version documented.

- **Triggers** — 8 (webhook)

## Auth

**API token**, sent as `Authorization: Bearer <token>` by the Auth `sign` hook (nothing in an action
sees it). Create it under *Developer > API > Create API Token* in the Clearout dashboard. The
overview page's own curl example sends the token with no `Bearer` prefix while its prose and the
OpenAPI `securitySchemes` say Bearer; unauthenticated, both forms answer the same code 1000, so
this could not be settled without a live token. Bearer is what is sent.

The connect-time `test` calls `GET /account/credits` (free, counters only, never echoes the token)
and classifies from the body: a 2xx without `status: "failed"` passes, error code 1000 / HTTP 401 is
a rejected token.

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `email-verifier-bulk-completed` — Bulk Verification Completed | webhook (manual, signed) | `email_verifier.bulk.completed` | list id and name, event id and mode, the full payload |
| `email-finder-bulk-completed` — Bulk Finder Completed | webhook (manual, signed) | `email_finder.bulk.completed` | list id and name, event id and mode, the full payload |
| `form-guard-email-validated` — Form Guard Email Validated | webhook (manual, signed) | `form_guard.email_validation.completed` | the verification result, page URL, event id and mode, the full payload |
| `email-verifier-instant-completed` — Instant Verification Completed | webhook (manual, signed) | `email_verifier.instant.completed` | the verification result, event id and mode, the full payload |
| `email-finder-instant-completed` — Instant Finder Completed | webhook (manual, signed) | `email_finder.instant.completed` | the addresses found, event id and mode, the full payload |
| `form-guard-phone-validated` — Form Guard Phone Validated | webhook (manual, signed) | `form_guard.phone_validation.completed` | the phone validation result, page URL, event id and mode, the full payload |
| `form-guard-name-validated` — Form Guard Name Validated | webhook (manual, signed) | `form_guard.name_validation.completed` | the name validation result, page URL, event id and mode, the full payload |
| `any-event` — Any Event | webhook (manual, signed) | every event above; the optional `events` param (comma-separated event types, empty = all) narrows it | the event type, id, mode, status, data and the full payload |

**Setup (manual webhook).** Clearout webhooks are created in the Clearout app, not through the API this app calls, so:

1. Create the trigger and copy its callback URL.
2. In the Clearout app open **Developers, Webhook**, choose **Create Webhook**, paste the URL and select the trigger's event (for Any Event select every event you want, and optionally list them in its `events` param; a trigger ignores, and acknowledges without a run, any other event sent to its URL).
3. Under **Secret Token** click **Generate Token**, copy it immediately (Clearout shows it only when it is generated or rotated) and paste it into the trigger's `signingSecret` param. The token is account-wide, so every Clearout trigger takes the same one; rotating it means updating each trigger.

**Trust model.** Clearout sends `x-co-webhook-signature: t=<unix seconds>,v1=<hex>`, where `v1` is the HMAC-SHA256 of `<t>.<raw body>` under the secret token. The trigger recomputes it over the exact bytes received, in constant time, and refuses a `t` more than five minutes from now (Clearout recommends 2 minutes and allows 2 to 5) before it parses anything; a missing secret, header or raw body, a malformed header, a stale timestamp or a mismatch refuses the delivery. A captured delivery can still be replayed inside that window. Clearout's own JavaScript and PHP samples hash a re-serialised body; its prose and Python sample hash the raw body, which is what this trigger checks.

Clearout's webhook catalog has seven events, and every one has a trigger above (the three Form Guard events and the instant and bulk verifier and finder events); `find-email` and `find-company-domains` have no trigger because they are billed per call or a free-text autocomplete (see Not covered).

No poll trigger ships with the webhooks: a poll over `list-verify-lists` or `list-finder-lists` would announce a list when it is created, not when its verification or search completes, which only the webhook reports.

Docs (verified 2026-11-10): https://docs.clearout.io/developers/webhooks, https://docs.clearout.io/developers/webhooks/set-up-and-edit-webhooks, https://docs.clearout.io/developers/webhooks/webhook-events-and-payloads and https://docs.clearout.io/developers/webhooks/validate-deliveries

## Actions

| Group | Actions |
|---|---|
| Verify (instant) | `verify-email`, `check-email-attribute` (catch-all, disposable, business, free, role, gibberish) |
| Verify (bulk) | `bulk-verify-start`, `bulk-verify-status`, `bulk-verify-download`, `bulk-verify-cancel`, `bulk-verify-remove`, `list-verify-lists` |
| Finder (instant) | `find-email`, `get-find-email-status` (read a queued search) |
| Finder (bulk) | `bulk-find-start`, `bulk-find-status`, `bulk-find-download`, `bulk-find-cancel`, `bulk-find-remove`, `list-finder-lists` |
| Lookups | `reverse-lookup-email`, `reverse-lookup-linkedin`, `reverse-lookup-domain`, `validate-name`, `find-company-domains`, `resolve-mx`, `resolve-whois` |
| Account | `get-credits`, `get-verify-credits` (adds the daily verify limit), `get-plans`, `get-limits` |

Bulk flow: `bulk-verify-start` (an `emails` list, or your own CSV/XLSX with an `Email` column) returns a
`listId`; poll `bulk-verify-status`; then `bulk-verify-download` for the result file URL. Finder is the
same with `bulk-find-*`. `list-*-lists` use the vendor's cursor pagination (`startAfter` = the previous
page's `nextCursor`, `hasMore` says whether there is another).

Credits are spent by verify, find and lookup calls. The vendor's `*@example.com` test addresses
(`valid@example.com`, `invalid@example.com`, `catch_all@example.com`, ...) cost none.

## Health checks

| Check | What it does |
|---|---|
| `service` | **Declared unavailable**, informational. `status.clearout.io` is a real Pulsetic page, but a client-rendered shell: `/summary.json`, `/index.json`, `/history.atom`, `/feed`, `/rss`, `/api/v2/summary.json`, `/api/status`, `/status.json` all answer the same ~11.7 KB `text/html` 200. `clearout.statuspage.io` 302s to Atlassian's marketing page. No genuine feed, so none is invented. |
| `api` | Unsigned `GET /account/credits`. The schema-correct `401 {"status":"failed","error":{"code":1000,...}}` is a **pass** (the API is serving); 5xx is `down`; a body that is not Clearout's envelope is `unknown`. |
| `quota` | Signed `GET /account/credits`: `down` at zero credits, `degraded` at or under the account's own `low_credit_balance_min_threshold`, else `ok`. |
| `auth:api-key` | Derived from the Auth `test` hook. |

## Not covered (and why)

- **List actions without a trigger:** `find-email` spends a credit on every call, so polling it would bill the account; `find-company-domains` is a free-text autocomplete keyed by a required query string (its response body is undocumented), not a record feed.
- **Webhooks** (`developers/webhooks/*`): a trigger surface, not an action — see Triggers above.
- **Form Guard, Data Pulse, Prospecting, Chrome extension, integrations**: dashboard products with no
  documented REST endpoints in the API reference.
- **Bulk-finder CSV builder**: the docs name the required columns (a Name column and a
  Domain/Company column) but the API reference does not state the exact header spelling the parser
  matches, so `bulk-find-start` takes a file you supply instead of writing one.
- **Typed output for `find-company-domains`, `resolve-mx`, `resolve-whois`**: the vendor's OpenAPI 200
  is an empty schema for all three, so the `data` object is returned as is. Likewise
  `check-email-attribute` (below).

## Findings

- **Auth runs before routing and validation.** A missing token, a wrong token and a path that does not
  exist all answer `401` code 1000 (`Invalid API Token, please generate new token`). A 401 on a
  guessed path proves nothing; HTTP 401 means "token", never "path".
- **Errors can ride a 2xx.** Responses are `{status: "success"|"failed", ...}` envelopes and several
  endpoints document the `failed` shape under HTTP 200, so the client throws on `status: "failed"`
  regardless of the HTTP status.
- **Two path spellings.** The six single-attribute checks are `/email/verify/{catchall,disposable,
  business,free,role,gibberish}` (slash) while every other verifier endpoint is `/email_verify/...`
  (underscore), the bulk result download is the unprefixed `/download/result` while the finder's is
  `/email_finder/download/result`, and the two progress endpoints disagree on the field name
  (`percentile` for the verifier, `percentage` for the finder). The vendor's response schemas for
  `free`, `role` and `gibberish` are copy-pasted from `business` (all three document
  `business_account`), so `check-email-attribute` returns their `data` unmapped.
- **Timeouts become queue IDs.** An instant finder search that outlives `timeout` answers `524` with
  `error.additional_info.queue_id` and keeps running (`queue: true` is the default); `find-email`
  returns that as `queued: true` and `get-find-email-status` reads it.
- The reverse-lookup `lead` documents `contructed_title` (sic); it is surfaced as `constructedTitle`.
- Rate limit: 100 requests per 60 s by default (`x-ratelimit-*` headers, 429 + code 1030), with much
  lower per-endpoint ceilings on small plans.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

The icon is Clearout's own 512x512 mark, fetched from `clearout.io/fav-icon/icon-512x512.png` (the
vendor's `<link rel=icon>` set).

