# Acumbamail

Drive **Acumbamail** (email and SMS marketing) from a workflow: lists, subscribers, campaigns,
templates, transactional email, SMS and list webhooks, over the REST API at
`https://acumbamail.com/api/1/{function}/`.

- **Categories** — marketing, email
- **Auth methods** — auth-token (custom; the `auth_token` form parameter)
- **Actions** — 32
- **Health checks** — ~~`service`~~, ~~`quota`~~ (both declared unavailable, informational) + the derived `auth:auth-token`
- **Egress allowlist** — `acumbamail.com`
- **API docs** — https://acumbamail.com/en/apidoc/ (one page per function: `/en/apidoc/function/{name}/`)
- **Status page** — https://status.acumbamail.com/ (UptimeRobot, client-rendered, no feed)

> Every function name and parameter was read on 2026-10-06 from the vendor's per-function reference
> pages. The reference has **no public function index** and the landing page lists functions only to
> logged-in users, so candidates were collected from other integrations and each name was kept only
> after its own page answered with the documented signature.

## Connecting

Log in to Acumbamail, open https://acumbamail.com/en/apidoc/ and copy the auth token under
**Customer identifier**. The connection test calls `getLists` (needs only the token, returns list
names, never the token). Without a valid token the API answers HTTP 401 with the plain text body
`Unauthorized` (also for a bogus token and for an unknown function), so the test treats that body +
status as a rejection and reports any other failure (429, 5xx) as itself.

## Things most likely to go wrong

1. **The credential is a form parameter.** There is no header form, so the auth `sign` hook merges
   `auth_token` into the form body of each POST. Actions never carry it.
2. **Everything is a form-encoded POST.** Dictionaries are bracket-encoded (`merge_fields[email]=…`);
   `subscribers_data` and `messages` are sent as one JSON string, as the reference describes.
3. **A bad function name looks like a bad token.** The API answers 401 to both.
4. **Rate limits are per function** (for example 5 requests per second for `getLists`, 10 per minute for
   `deleteList` and most reads) and answer 429. The vendor publishes no headroom header, so `quota` is a
   declared absence.
5. **Response shapes are mostly undocumented** ("dict", "List of campaigns"), so reads return the parsed
   body under `result`; ID-returning calls return `{ id }`, void calls `{ ok: true }`.
6. **Documented inconsistencies are passed through, not fixed:** `getCampaigns` gives `start_date` as
   `YYYY-MM-DD` but `end_date` as `dd/mm/YYYY HH:MM`; `sendOne` scheduling says `DD//MM/YYYY HH:MM`;
   `getCampaignOpeners.exclude_clickers` is described as "displays the subscribers who have clicked".
7. **`createCampaign` creates and sends** (answers the campaign ID, or error text) and its `lists`
   parameter is only described as a "dict" of list or segment (`s`-prefixed) IDs; this app encodes an array
   as `lists[0]=7&lists[1]=s12`. That key shape is an assumption.
8. **No retries are safe on sends.** `email-send`, `sms-send`, `campaign-create`, `list-create`,
   `merge-tag-add`, `template-create` and `template-duplicate` are marked non-idempotent.

## Not covered

Probed by name with no function page (so left out): campaign
deletion, SMTP statistics, segments, account/credit queries, campaign opens/clicks by country or
client, and bounce/complaint lists (guessed names returned 404 on the docs site).
`createTemplate`'s `bee_json` (a dict of unspecified shape) is not exposed.

## Tests

`deno task test` — an entry-module test, auth/sign/probe tests, health tests, client encoding tests,
and per-action tests (request path, form fields, output, vendor error, empty-required, omitted optionals).
