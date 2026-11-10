# Acumbamail

Drive **Acumbamail** (email and SMS marketing) from a workflow: lists, subscribers, campaigns,
templates, transactional email, SMS and list webhooks, over the REST API at
`https://acumbamail.com/api/1/{function}/`.

- **Categories** — marketing, email
- **Auth methods** — auth-token (custom; the `auth_token` form parameter)
- **Actions** — 32
- **Triggers** — 1 (poll)
- **Health checks** — ~~`service`~~, ~~`quota`~~ (both declared unavailable, informational) + the derived `auth:auth-token`
- **Egress allowlist** — `acumbamail.com`
- **API docs** — https://acumbamail.com/en/apidoc/ (one page per function: `/en/apidoc/function/{name}/`)
- **Status page** — https://status.acumbamail.com/ (UptimeRobot, client-rendered, no feed)

> Every function name and parameter was read on 2026-10-06 from the vendor's per-function reference
> pages. The reference has **no public function index** and the landing page lists functions only to
> logged-in users, so candidates were collected from other integrations and each name was kept only
> after its own page answered with the documented signature.

## Triggers

| Key | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-list` | poll | `list-get-all` | Each newly created subscriber list. |

`getLists` returns every list as a dictionary indexed by list ID in one request; each check diffs the ids against the last check. Source: https://acumbamail.com/en/apidoc/function/getLists/ (verified 2026-11-10).

Not covered (no trigger is built where the vendor documents no id or order to dedupe on, or the list is unbounded):

- `campaigns-list` — `getCampaigns` is documented only as returning a `dict` "List of campaigns" with no id keying or order; its date filter takes `dd/mm/YYYY HH:MM` strings and the item shape is unspecified (https://acumbamail.com/en/apidoc/function/getCampaigns/).
- `templates-list` — `getTemplates` is documented only as a `dict` "List of templates with their ID, their name and if they are available"; the dict's keying is not specified (https://acumbamail.com/en/apidoc/function/getTemplates/).
- `subscribers-list` — `getSubscribers` has no created-after filter or order, returns the list in blocks of up to 10,000 emails, which exceeds the 5000-row snapshot cap (https://acumbamail.com/en/apidoc/function/getSubscribers/). New subscribers are a list-webhook event (`subscribes`), queued for a webhook trigger.
- `subscriber-search` — a lookup of one email the caller already knows, not a feed (https://acumbamail.com/en/apidoc/function/searchSubscriber/).
- `campaign-openers-list`, `campaign-clicks-list` — per-campaign engagement reports (https://acumbamail.com/en/apidoc/function/getCampaignOpeners/, https://acumbamail.com/en/apidoc/function/getCampaignClicks/).

Acumbamail list webhooks (subscribes, unsubscribes, hard_bounce, soft_bounce, complain, opens, click) are configured with `list-webhook-configure`; no webhook trigger ships here.

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
