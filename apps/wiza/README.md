# Wiza

Reveal contacts, enrich lists and companies, search Wiza's prospect and company databases, resolve
filter values and read the credit balance, over the **Wiza API**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (`Authorization: Bearer <key>`)
- **Actions** — 13 (every operation in the published OpenAPI reference)
- **Health checks** — `service` (Wiza's own Statuspage, the "Wiza API" component), `api` (unsigned
  reachability), `quota` (API credit balance, informational) + the derived `auth:api-key`
- **Egress allowlist** — `wiza.co` (the status host `status.wiza.co` is allowlisted on the `service`
  check only)
- **API docs** — https://docs.wiza.co (reference: `https://docs.wiza.co/swagger/v1/openapi.yaml`)
- **Icon** — the vendor's own mark, https://wiza.co/favicon.svg, saved verbatim

Verified on 2026-10-06 against the OpenAPI document and the guide pages at `docs.wiza.co`, plus
unsigned probes of `wiza.co/api`. No endpoint was called with a real key, so response shapes are
the documented ones, not sampled.

## Things most likely to go wrong

1. **The docs are not at `wiza.co/api-docs` for a script.** That URL is Cloudflare-challenged
   (403 to curl) and its `/swagger/v1/openapi.yaml` 404s. The real host is `docs.wiza.co`, and
   the spec is `https://docs.wiza.co/swagger/v1/openapi.yaml` (every page also serves `.md`).
   The API itself, `https://wiza.co/api/...`, is not challenged.
2. **Reveals and lists are asynchronous.** Start Individual Reveal, Create List, Create Prospect
   List and Continue Prospect Search return an id and a `queued` status immediately. Poll Get
   Individual Reveal (until `is_complete`) or Get List, or let the webhook configured under
   Settings → API (or a per-request `callbackUrl`) deliver it. A list can also fail outright
   (LinkedIn rate limiting), so check `status`.
3. **A billing problem is a 200, not a 402.** Out of credits or an unpaid invoice returns HTTP 200
   and the reveal record comes back `status: "failed"` with `fail_error: "billing_issue"`. Read
   `status`/`fail_error` on Get Individual Reveal; do not treat a 200 as a success. Only the list
   creation endpoints and company search report billing in the body of a 400.
4. **A missing key and a wrong key are the same 401.**
   `{"status":{"code":401,"message":"Invalid API key."}}` either way, so the credential test and
   the `api` health check read that body, never the status alone.
5. **Two error envelopes.** Most errors are `{"status":{"code","message"}}`; "list not found" and
   "continue search not found" flatten it to `{"status":404,"message"}`. The client reads both.
6. **Credits are charged on success only**, and email/phone credits can be the string
   `"unlimited"` while `api_credits` is a number. Individual reveal: 1 credit profile, 2 email,
   5 phone; company enrichment 2; company search 0.5 per company returned.
7. **Reveal enrichment levels differ from list levels.** An individual reveal accepts `none`,
   `partial`, `phone` and `full`; a list accepts only `none`, `partial` and `full`. One guide page
   mentions an `email` level; the OpenAPI enum does not, and this app follows the enum.
8. **Rate limits** are prose-only: company enrichment 30/minute and 43,200/day; individual reveals
   are bounded by a plan concurrency limit (5 Starter, 15+ Enterprise) with a queue of 200x that,
   after which a 429 is returned. No rate-limit headers are documented.

## Actions

| Area             | Actions                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Individual       | `start-individual-reveal`, `get-individual-reveal`                                        |
| Lists            | `create-list`, `get-list`, `get-list-contacts`                                            |
| Prospect lists   | `search-prospects`, `create-prospect-list`, `continue-prospect-search`                    |
| Companies        | `enrich-company`, `search-companies`                                                      |
| Filter helpers   | `search-locations`, `search-technologies`                                                 |
| Account          | `get-credits`                                                                             |

`filters` (prospect and company search) and `items` (Create List) are JSON params that use the
API's own snake_case names.

## Not covered

- **CSV list export.** `GET /api/lists/{id}/contacts.csv` is mentioned in the description of Get
  List Contacts but is not a separate documented operation; the JSON contacts are returned.
- **Webhook receiving.** Wiza POSTs finished reveals and lists to a URL; receiving is a trigger
  concern, not an action, and this app declares no triggers.
- **Account-settings webhook configuration**, which is done in the Wiza dashboard (no API).

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /api/meta/credits` (balances, never
  the key). Passes only on a `credits` object; a 401 is judged by the vendor's own envelope.
- **service** — `status.wiza.co`, verified real (`page.id` `4kq3dv00xkgb`, name Wiza, a bogus
  sibling path 404s). Four flat components; only **Wiza API** (`wyrqs0vs76yr`) drives the verdict,
  the web app, LinkedIn plugin and marketing site are reported as detail. A broken status API is
  `unknown`, never `down`.
- **api** — unsigned `GET /api/meta/credits`; the documented `Invalid API key.` envelope is a pass
  (reachability, not credential validity).
- **quota** — `api_credits` from a signed `GET /api/meta/credits`: 0 is down, under 10 is degraded
  (informational).
