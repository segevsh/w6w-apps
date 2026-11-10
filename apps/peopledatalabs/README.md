# People Data Labs

Enrich and search people and companies, identify a person from loose inputs, resolve IPs to
companies, clean company, school and location strings, autocomplete field values, enrich job titles
and search job postings, over the **People Data Labs (PDL) v5 API**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (`X-Api-Key: <key>`)
- **Actions** — 15
- **Triggers** — 1 (webhook)
- **Health checks** — `service` (status.peopledatalabs.com, a real Statuspage; the production API
  components decide, the dashboard and sandbox are detail), `api` (unsigned reachability), `quota`
  (credits left from a response header) + the derived `auth:api-key`
- **Egress allowlist** — `api.peopledatalabs.com`, `sandbox.api.peopledatalabs.com`
  (`status.peopledatalabs.com` is allowlisted for the `service` check only, not for actions)
- **API docs** — https://docs.peopledatalabs.com (index: https://docs.peopledatalabs.com/llms.txt)
- **Icon** — the vendor's own mark, https://docs.peopledatalabs.com/favicon.svg, saved verbatim as
  `assets/icon.svg`

## Triggers

| Key | Mechanism | Vendor event | What the run gets |
| --- | --- | --- | --- |
| `person-updates` | webhook (manual) | PDL's person-update webhook (records updated in a data release that match your registered filters) | One batch of PDL person ids (up to 1,000 per delivery) and their count. |

The search and enrichment endpoints compute or query external data and expose no account-owned feed, so there is no poll. The only event source is PDL's webhook, and it has three limits worth knowing before you plan on it:

- **Enterprise only.** PDL offers webhooks "only [to] our subscribing enterprise API and Data License customers".
- **Registered by PDL, not by API.** There is no registration endpoint: you work with your PDL team, who need a target URL, headers and filters (the kinds of update to watch, e.g. `job_change`, `work_email`, `location`).
- **Monthly batches.** Payloads are JSON arrays of PDL ids, sent in batches of 1,000, around PDL's monthly data release. If your endpoint does not answer 200, PDL does not resend by itself; ask your PDL team to resend the batch.

**Setup (manual).**

1. Subscribe the `person-updates` trigger in w6w, giving it a **Shared Key**: a long random string, entered as the exact header value you will tell PDL to send (for example `Bearer <random string>`). Copy the callback URL it shows.
2. Give your PDL team that URL as the Target URL (it must be https), the header (default name `Authorization`; if you pick another name, put it in the trigger's **Header Name** param) with that value, and the filters you want.
3. Each delivery arrives as one event with the batch of ids; look the people up with the enrich actions.

**Trust model.** PDL does not sign deliveries. Its documentation says the registered headers should at a minimum carry a shared key for secure authorization, so the trigger refuses any delivery whose header is missing or differs from the Shared Key (constant-time comparison, an unset key is refused before any comparison), and reads the body only after that. A shared key is not a signature: it proves the sender knows the key, not that the body is unmodified, and a captured delivery could be replayed because there is no timestamp. Keep the key and the callback URL private.

Vendor documentation: https://docs.peopledatalabs.com/docs/webhooks (verified 2026-11-10).

Everything here was verified on 2026-10-06 against the per-endpoint reference pages and live,
credential-free probes of the API and the status page.

## Not covered

- **Skill Enrichment API** — removed by PDL in its April 2025 (v30.0) release; the docs page is kept
  only for history.
- **Preview Search API** — it is the same endpoint as Person Search; the API key decides which one
  you get, so `search-people` already covers it.
- **Person Changelog, Person Retrieve and Subject Request APIs** — enterprise-only surfaces; left
  out rather than guessed at.

## Things most likely to go wrong

1. **A 404 is a "no match", not an error.** Enrich, identify, IP, job title, cleaner and search
   calls answer `404 not_found` when nothing matched (and a search answers 404 when pagination has
   run out). Every such action returns `found: false`, `status: 404` and, for the list-shaped ones,
   empty `data`/`matches`, so a flow can branch on `found` instead of catching a failure. Any other
   non-200 (400 bad input, 401 key, 402 out of credits, 429 rate limit, 5xx) throws.
2. **`error.type` is an array on the wire.** The docs show `"type": "not_found"`; the live API
   answers `"type": ["authentication_error"]`. Anything matching on it must accept both, and this
   app does.
3. **Company Enrichment is flat; Person Enrichment nests under `data`.** `enrich-company` (and the
   cleaners) return the profile fields at the top level next to `status` and `likelihood`; person
   enrich, IP enrich and every search put the record under `data`. The `found` flag is added by this
   app, and PDL's own `matched` list (with `include_if_matched`) is passed through untouched.
4. **Searches cost one credit per RECORD returned.** `size` defaults to 1; set it deliberately
   (1-100) and page with `scroll_token`. Identify is the opposite: one credit per call whatever the
   number of candidates. Bulk enrichment charges per 200 entry only.
5. **Search bodies pass through as written.** `query` is an Elasticsearch 7.7 object (term, terms,
   exists, bool, match, match_phrase, range, wildcard, prefix, match_all — no aggregations, arrays of
   at most 1,000 elements for people and 100 for companies); `sql` is `SELECT * FROM person WHERE …`
   (column lists and LIMIT are ignored, at most 20 LIKE wildcards, subfields only). Give exactly one.
   Person Search, Company Search and Job Posting Search are sent as `POST` with a JSON body.
6. **Phone inputs must start with `+<country code>`** or the person enrich silently matches
   nothing; `min_likelihood` defaults to 2 (roughly a 10-30% chance of being the right person), so
   raise it to 6 or more when accuracy matters.
7. **Rate limits are per endpoint and small on search** (10 requests a minute by default for the
   search APIs and identify; 20 for job postings; 100 a minute for free enrichment). Responses are
   capped at 1 MB, so a 100-record page may need a smaller `size` or `data_include`.
8. **The sandbox is a separate host with a tiny fixed dataset.** The `sandbox` switch on the
   billable actions sends the call to `sandbox.api.peopledatalabs.com`: free, no credits, 5 calls a
   minute. Autocomplete and the cleaners have no sandbox twin.

## Actions

| Area         | Actions                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| People       | `enrich-person`, `preview-enrich-person`, `bulk-enrich-persons`, `identify-person`, `search-people` |
| Companies    | `enrich-company`, `bulk-enrich-companies`, `search-companies`                    |
| IP           | `enrich-ip`                                                                      |
| Supporting   | `autocomplete`, `clean-company`, `clean-location`, `clean-school`, `enrich-job-title` |
| Job postings | `search-job-postings` (Beta)                                                     |

`bulk-enrich-*` take a JSON array of up to 100 `{ "params": { … }, "metadata": { … } }` entries
(a bare params object per entry also works) and return `results`, `count` and `matches` (the
200-status entries, which are the credits spent).

## Health checks

- **`service`** — `status.peopledatalabs.com/api/v2/summary.json`, verified real (`page.name`
  "People Data Labs", page id `dxgjh0ymdqy6` pinned, checked every run). The verdict is the worst
  state among the production API components; the API Dashboard group (web portal, login, Auth0) and
  API Sandbox group are listed as detail but do not drive it, and group rows are skipped.
- **`api`** — unsigned `GET /v5/autocomplete?field=title&size=1`; the schema-correct
  `401 authentication_error` envelope is a pass (reachability), a 5xx or network failure is `down`.
- **`quota`** — signed `GET /v5/person/enrich` with no inputs (rejected as a bad request, so free):
  `x-totallimit-remaining` is the credits left; `degraded` at 0, `unknown` when the header is
  absent, `informational`. The header shape is taken from the usage-limits page; it was not
  observable here without a key.
- **`auth:api-key`** (derived from `test`) — the same free autocomplete call, signed. It passes on a
  200 with a `data` array, and on a 402 or 429 (the key was recognised, the account is just out of
  credits or going too fast); it fails on `authentication_error`.

## Testing

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/peopledatalabs && deno task validate && deno task check && deno task lint && deno task fmt && deno task test'
```
