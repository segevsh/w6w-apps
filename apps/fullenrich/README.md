# FullEnrich

Waterfall-enrich contacts with verified work emails, personal emails and phone numbers, reverse-look-up
an email to the person behind it, search and look up people and companies, and check credits, over
the **FullEnrich API v2**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (`Authorization: Bearer <key>`)
- **Actions** — 10
- **Health checks** — `service` (status.fullenrich.com, informational), `api` (unsigned reachability),
  `quota` (credit balance, informational) + the derived `auth:api-key`
- **Egress allowlist** — `app.fullenrich.com`
- **API docs** — https://docs.fullenrich.com (spec: `/api/v2/reference/openapi.yaml`)
- **Icon** — the vendor's own favicon,
  https://fullenrich.com/_app/immutable/assets/favicon.qhQ-VE9A.svg, saved verbatim

Verified on 2026-10-06 against the v2 OpenAPI document and live probes of the API. The older **v1**
surface (`/api/v1`) is not built; v2 is a superset of it.

## Things most likely to go wrong

1. **Enrichment is asynchronous.** `enrich-start` and `reverse-email-start` only answer an
   `enrichment_id`; the data comes later (typically 30-90 s per contact). Either pass a webhook URL or
   poll `enrich-get` / `reverse-email-get` until `status` is `FINISHED`. `CREATED` and `IN_PROGRESS` are
   not final; `CREDITS_INSUFFICIENT`, `CANCELED` and `RATE_LIMIT` are terminal failures. Results expire
   after 3 months.
2. **Webhooks** (`webhookUrl`, `contactFinishedWebhookUrl`): FullEnrich POSTs the same document the GET
   returns when the whole batch finishes, runs out of credits or is canceled, and (optionally) once per
   contact. Each call carries `X-Signature-SHA1`, the HMAC-SHA1 of the **raw** body keyed by your API
   key. The receiver is yours to build; this app only sets the URLs.
3. **`enrich_fields` is mandatory** and drives the bill: 1 credit per work email, 3 per personal email,
   10 per mobile phone, only when found. This app defaults to work emails only.
4. **The reference contradicts itself on `custom`**: "limited to 20 entries" on one schema, "max 10 keys,
   100 characters per value" in the error list and the reverse-email schema. Stay within the stricter one.
5. **Reverse-email GET answers HTTP 402 with a full result document** (`CREDITS_INSUFFICIENT`) — treated
   as a result, not an error.
6. **Rate limit is a flat 60 calls/minute** across every endpoint (100 contacts per bulk, 100 concurrent
   jobs). There are no rate-limit headers; a 429 carries `error.rate.limit`.
7. **Errors are `{code, message}`** with dotted codes (`error.api.key`, `error.authorization.not_set`).
   A bad key and a missing header are both 401 and differ only in `code`.
8. **Free test contact**: Grégoire Démogé / fullenrich.com / linkedin.com/in/demoge costs 0 credits.
   Re-enriching an identical contact within 3 months is free; duplicates inside one bulk are not
   deduplicated.
9. **Search costs 0.25 credit per result returned**, and `offset` stops at 10,000 — use `searchAfter`
   beyond that.

## Actions

| Area       | Actions                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| Enrichment | `enrich-start`, `enrich-get`                                               |
| Reverse    | `reverse-email-start`, `reverse-email-get`                                 |
| Search     | `people-search`, `company-search`                                          |
| Lookup     | `people-lookup`, `company-lookup`                                          |
| Account    | `account-credits-get`, `account-verify-key`                                |

The search actions expose the most common filters as named lists and accept every other documented
filter through the `filters` JSON object (a named field wins over the same key there).

## Health

- **Credential** — derived from `Auth.test`, which calls the documented `GET /account/keys/verify`. It
  answers `{workspace_id}`, never the key. A 200 must carry `workspace_id`; failures report the vendor's
  own message.
- **service** — `status.fullenrich.com` is a Better Stack page (the Statuspage paths return an HTML
  shell; `/index.json` is the real document, page id `183195`). It lists a single resource,
  `app.fullenrich.com/app` — the web app, not the API — so the check is `informational` and capped at
  `degraded`. A wrong page, missing resource, 5xx or HTML is `unknown`.
- **api** — unsigned `GET /account/credits`; a 401 carrying the `{code, message}` envelope is a pass.
- **quota** — signed `GET /account/credits`; the balance is reported as a `credits` bucket, zero is
  `degraded` (informational).

## Not covered

- API v1 (superseded).
- Webhook receiving/verification — FullEnrich pushes to a URL you host.
