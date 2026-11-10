# Findymail

Find and verify work emails, find phone numbers, companies and tech stacks, run Intellimatch company
searches, manage contact and exclusion lists, monitor buying signals and read credit usage, over the
**Findymail API**.

- **Categories** — email, marketing
- **Auth methods** — api-key (`Authorization: Bearer <token>`)
- **Actions** — 35
- **Triggers** — 5 (poll)
- **Health checks** — `service` (declared unavailable — Findymail publishes no status page), `api`
  (unsigned reachability), `quota` (finder and verifier credit balances) + the derived `auth:api-key`
- **Egress allowlist** — `app.findymail.com`
- **API docs** — https://app.findymail.com/docs (OpenAPI: https://app.findymail.com/docs/openapi.yaml)
- **Icon** — the vendor's own favicon, https://app.findymail.com/favicon.ico (230x230 ICO, 219,022
  bytes, saved verbatim as `assets/icon.ico` and declared as `appearance.icon.url`)

Everything here was verified on 2026-10-06 against the OpenAPI document and live probes of
`app.findymail.com`.

## Deprecated, not covered

- `POST /api/search/domain` ("Find from domain") — marked in the reference as *"DEPRECATED: This
  endpoint is no longer recommended for production usage. Please use Find Employees instead."*
  Use the `find-employees` action.

## Things most likely to go wrong

1. **Always send `Accept: application/json`.** It is a Laravel app: without it an unauthenticated
   call answered `403` in a probe, with it the documented `401 {"message":"Unauthenticated."}`. The
   client and every probe set it.
2. **Three error shapes.** Credit and billing failures are `{"error": "Not enough credits"}` (`402`)
   and `{"error": "Subscription is paused"}` (`423`); auth and lookup failures are
   `{"message": "..."}`; validation is `{"message", "errors": {field: [...]}}` (`422`). The client
   joins them into one line. A `423` means the account is recognised, so the credential test treats it
   as a live key.
3. **Finders charge only on a hit.** Find, phone and company lookups spend credits only when
   something is found (per each endpoint's documented cost); an empty balance answers `402`.
4. **A `webhook_url` changes the answer.** On `find-email-by-name` and `find-email-by-linkedin`
   the search then runs in the background and the action returns Findymail's acknowledgement; the
   contact arrives at your webhook, not in the action output.
5. **Four endpoints have no documented 200 body:** `find-phone`,
   `reverse-email-lookup`, `lookalike-search`, `lookup-technologies` return Findymail's JSON
   verbatim under `result`. `find-employees` and `list-monitors` answer a bare array and are wrapped as
   `employees` / `monitors`.
6. **Intellimatch is asynchronous.** `intellimatch-search` returns only a `hash`; poll
   `intellimatch-status` until `success`, then page `intellimatch-results` (a `404` there means not
   ready or expired). Email costs 1 credit per hit and phone 10.
7. **`remove-excluded-domains` takes domain row IDs**, not domain names — read them from
   `list-excluded-domains`.
8. **Signals endpoints answer an empty `404`** when the feature is disabled on the account.
9. **Limits.** All endpoints allow 300 concurrent requests; the synchronous finders have lower caps
   (30 for LinkedIn lookups), the technology search is 10 requests per minute, and no rate-limit
   header is published, so `quota` reports credit balances instead.

## Actions

| Area        | Actions                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Verifier    | `verify-email`                                                                                                          |
| Finders     | `find-email-by-name`, `find-email-by-linkedin`, `find-employees`, `find-phone`, `reverse-email-lookup`, `get-company`   |
| Lists       | `list-lists`, `create-list`, `update-list`, `delete-list`, `list-contacts`                                              |
| Exclusions  | `list-exclusion-lists`, `create-exclusion-list`, `get-exclusion-list`, `update-exclusion-list`, `delete-exclusion-list`, `list-excluded-domains`, `add-excluded-domains`, `remove-excluded-domains` |
| Intellimatch | `intellimatch-search`, `intellimatch-status`, `intellimatch-results`, `lookalike-search`                               |
| Signals     | `list-signals`, `get-signal`, `list-monitors`, `create-monitor`, `update-monitor`, `delete-monitor`                     |
| Technologies | `search-technologies`, `lookup-technologies`                                                                           |
| Usage       | `get-credits`, `get-usage`, `get-team-usage`                                                                            |

## Health checks

- **`service`** — declared unavailable at `informational` severity. The reference links no status
  page, `status.findymail.com` does not resolve and `findymail.statuspage.io` redirects to the
  Statuspage homepage.
- **`api`** — unsigned `GET /api/credits`; the schema-correct `401 {"message":"Unauthenticated."}`
  is a pass (reachability), a 5xx or network failure is `down`.
- **`quota`** — signed `GET /api/credits` (free): finder and verifier balances; `degraded` at 0,
  `informational`.
- **`auth:api-key`** (derived from `test`) — same endpoint; passes only on a numeric `credits`, or a
  `423` paused-subscription body.

## Testing

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/findymail && deno task validate && deno task check && deno task lint && deno task fmt && deno task test'
```

## Triggers

| Trigger | Mechanism | Vendor event / wrapped action | What the run gets |
|---|---|---|---|
| `new-list` — New Contact List | poll (snapshot) | Get the list of contact lists (`GET /api/lists`) | each newly created contact list |
| `new-signal` — New Signal | poll (since-filter) | `list-signals` (`GET /api/signals`, `date_from`, 100 per page) | each signal newly detected by your monitors (optional `signal_type`, `monitor_id`) |
| `new-monitor` — New Signal Monitor | poll (newest first) | `list-monitors` (`GET /api/signals/monitors`) | each newly created signal monitor |
| `new-exclusion-list` — New Exclusion List | poll (snapshot) | `list-exclusion-lists` (`GET /api/intellimatch/exclusion-lists`) | each newly created exclusion list |
| `new-list-contact` — New Contact in List | poll (snapshot) | `list-contacts` (`GET /api/contacts/get/{id}`) | each contact newly saved to the chosen list (`id`) |

Setup: none. Subscribing starts polling (every 5 minutes by default); the first check only records what already exists, so the run starts with records that appear afterwards.

Trust model: the `list-lists` action; the collection is one unpaginated response of the account's contact lists (a handful, far below the 5000-row snapshot cap), diffed on each check with additions only. Renames are not events. Nothing is sent to the vendor to register, and no inbound webhook or callback URL exists, so there is nothing to sign or verify.

`new-signal` calls the `list-signals` request with `date_from` set to the UTC day of the previous check minus two minutes (OpenAPI: "Filter signals detected on or after this date (format: YYYY-MM-DD)"), `per_page=100` (the documented maximum), up to 10 pages per check, and drops signals whose own `detected_at` is before that moment or before the first check; a longer window is resumed on the next check. `new-monitor` relies on the documented order ("ordered by most recent first"). `new-exclusion-list` and `new-list-contact` diff the whole unpaginated response by id with the poll kit (additions only; more than 5000 rows fails the check naming the cap, and a contact list larger than one response fails loudly).

Not covered: `find-email-by-linkedin`, `find-email-by-name`, `find-employees`, `find-phone`, `lookalike-search` (credit-consuming lookups, not record feeds); `search-technologies` (Findymail's technology catalogue — reference data); `list-excluded-domains` (configuration the account's own users write with `add-excluded-domains`; the OpenAPI documents no sort order and no `per_page` maximum for it).

Vendor docs: <https://app.findymail.com/docs> and <https://app.findymail.com/docs/openapi.yaml> (verified 2026-11-10).

Intellimatch search stays an action: it starts a credit-consuming task, so it is not a feed.

Vendor docs: https://app.findymail.com/docs/openapi.yaml (`GET /api/lists`) (verified 2026-11-09).
