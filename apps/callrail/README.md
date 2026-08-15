# CallRail

Read and manage CallRail calls, text-message conversations, form submissions, tracking numbers,
companies, tags and users, on the **CallRail API v3**.

- **Categories** — marketing, communication, analytics
- **Auth methods** — api-token
- **Actions** — 26
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.callrail.com` (the `service` check adds `status.callrail.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.callrail.com/
- **API docs** — https://apidocs.callrail.com/
- **Status page** — https://status.callrail.com/

CallRail is a call-tracking and conversation-analytics platform: it assigns dynamic tracking
numbers to marketing channels so a call, text or form submission can be attributed back to the
source that produced it. The unit almost everything nests under is the **account**, and within it
the **company** (a separate business or client the account tracks calls for); calls, texts, form
submissions, tags and tracking numbers all belong to one company.

> **Everything below was verified against CallRail's own reference on 2026-08-15** —
> [`apidocs.callrail.com`](https://apidocs.callrail.com/) (a single page, 891,328 bytes, fetched and
> read whole — it *is* the entire reference), plus live, unauthenticated probes against
> `api.callrail.com` and `status.callrail.com`. Nothing here came from a third-party integration
> directory.

## The three things most likely to cost someone a day

### 1. An API key can see more than one account — nothing infers `accountId` for you

CallRail's own words: "These API keys are scoped to individual users, and have access to the same
data as the user who created the key." A user (and therefore a key) can belong to several accounts,
and the reference gives no way to ask "which one did the caller mean" — there is no default, no
"primary account" concept. Every action in this app therefore takes an explicit `accountId` param
rather than guessing; **List Accounts** (`GET /v3/a.json`) is how a workflow discovers which ids a
given key can reach. Get this wrong and every other action 401s or 403s for a reason that has
nothing to do with whether the key itself is good.

### 2. The error body is a flat string, not a structured code

Verified live: an unauthenticated request to `/v3/a.json` answers `401` with
`{"error":"HTTP Token: Access denied"}` (37 bytes) — and a request signed with a syntactically
plausible but wrong key gets **the identical body**. Unlike vendors that ship a machine-stable error
`type` (Apify's `token-not-provided` vs. `user-or-token-not-found`), CallRail's `error` is one plain
sentence for both cases, so `auth/api-token.ts`'s `test` hook can report "the credential was
rejected" but not distinguish *why* — there is nothing more specific in the response to read.

### 3. List endpoints don't share one envelope key

Apify, for comparison, wraps almost everything in `{"data": …}`. CallRail instead keys each
collection response by that resource's own plural — `"calls"`, `"companies"`, `"users"`, `"tags"`,
`"trackers"`, `"form_submissions"`, `"conversations"`, `"accounts"` — alongside the shared
`page`/`per_page`/`total_pages`/`total_records` pagination block. `lib/client.ts` does not attempt a
generic list-page type the way `ApifyListPage<T>` does; every list action reads its own key.

## Authentication

**API Key** (`auth/api-token.ts`) — `Authorization: Token token=<api_key>`. Generated in the
CallRail app under **Settings > API Access**. The reference states the scheme once, quoted, in
prose (`Token token="YOUR_API_KEY"`); all 69 of its own curl examples render it unquoted. A live
probe confirms the unquoted form is correct — see the comment in `auth/api-token.ts`.

The probe used for both the Auth `test` hook and Connection liveness is `GET /v3/a.json` (Listing
All Accounts): it requires a credential, needs no account id or company access (so it never
under-reports a key correctly scoped away from some accounts as broken), and returns nothing but
account labels — no secret material. `afterConnect` publishes only the count of accounts the key can
see, for the Connection label (`CallRail (N account(s))`).

CallRail's reference asks *third-party integrations* (not end users querying their own data) to
send a `Request-From: <lowercased_name_with_underscores>` header identifying the integration. This
app has no fixed product name to send on a publisher's behalf, so it does not set the header.

## Actions

### Accounts

| Action | Type | Endpoint |
|---|---|---|
| List Accounts | read | `GET /v3/a.json` |
| Get Account | read | `GET /v3/a/{account_id}.json` |

### Calls

| Action | Type | Endpoint |
|---|---|---|
| List Calls | search | `GET /v3/a/{account_id}/calls.json` |
| Get Call | read | `GET /v3/a/{account_id}/calls/{call_id}.json` |
| Create Outbound Call | perform | `POST /v3/a/{account_id}/calls.json` |
| Update Call | perform | `PUT /v3/a/{account_id}/calls/{call_id}.json` |
| Summarize Calls | read | `GET /v3/a/{account_id}/calls/summary.json` |
| Get Call Recording URL | read | `GET /v3/a/{account_id}/calls/{call_id}/recording.json` |

Create Outbound Call places a real, billed phone call (US/Canadian numbers only — the reference is
explicit it "cannot be used to place calls to the United Kingdom and Australia") and is marked
`idempotent: false`: retrying a timed-out request risks placing the call twice.

Get Call Recording URL returns two different shapes depending on account type. For most accounts,
a long-lived CallRail redirect URL. For **HIPAA accounts**, a temporary S3 link that expires in
about 24 hours — the reference's own warning is "you should never store the URL returned in this
response... the permanent reference to this recording is this API endpoint itself." This action
returns whichever shape the account gets; a HIPAA caller should re-invoke it rather than cache the
result.

### Companies

| Action | Type | Endpoint |
|---|---|---|
| List Companies | search | `GET /v3/a/{account_id}/companies.json` |
| Get Company | read | `GET /v3/a/{account_id}/companies/{company_id}.json` |
| Create Company | perform | `POST /v3/a/{account_id}/companies.json` |
| Update Company | perform | `PUT /v3/a/{account_id}/companies/{company_id}.json` |

Update Company deliberately does not expose `swap_exclude_jquery` or `keyword_spotting_enabled` —
the reference marks both `(Deprecated)`, "accepted for compatibility purposes but has no effect."
Exposing a documented no-op as a working param would mislead a workflow author.

### Tags

| Action | Type | Endpoint |
|---|---|---|
| List Tags | search | `GET /v3/a/{account_id}/tags.json` |
| Create Tag | perform | `POST /v3/a/{account_id}/tags.json` |
| Update Tag | perform | `PUT /v3/a/{account_id}/tags/{tag_id}.json` |
| Delete Tag | perform | `DELETE /v3/a/{account_id}/tags/{tag_id}.json` |

### Trackers

| Action | Type | Endpoint |
|---|---|---|
| List Trackers | search | `GET /v3/a/{account_id}/trackers.json` |
| Get Tracker | read | `GET /v3/a/{account_id}/trackers/{tracker_id}.json` |

**Creating a tracker is deliberately not implemented.** The request body's shape depends entirely
on `type` — `session` trackers take a `pool_size`/`pool_numbers` pair that `source` trackers don't,
and the `source` object's own shape varies again by search-vs-offline source type. Modeling that
faithfully as one static form risks silently dropping fields CallRail actually needs; left out
rather than guessed at. Say so here rather than shipping a form that lies about what it accepts.

### Form Submissions

| Action | Type | Endpoint |
|---|---|---|
| List Form Submissions | search | `GET /v3/a/{account_id}/form_submissions.json` |
| Create Form Submission | perform | `POST /v3/a/{account_id}/form_submissions.json` |
| Update Form Submission | perform | `PUT /v3/a/{account_id}/form_submissions/{form_submission_id}.json` |

The reference lists `referrer`, `referring_url`, `landing_page_url` and `form_url` as `required` on
create, then in the same field notes `session_id` "can be provided instead of the referrer,
referring_url, and landing_page_url" — an either/or, not four independently required fields. Only
`form_url` and `form_data` are required params here; the rest are optional, matching the vendor's
actual constraint.

`created_at` is flagged in the reference as sortable today but "will be deprecated as a sortable
field in the future" in favor of `submitted_at` — both remain accepted; the param's own option label
carries that note forward.

### Users

| Action | Type | Endpoint |
|---|---|---|
| List Users | search | `GET /v3/a/{account_id}/users.json` |
| Get User | read | `GET /v3/a/{account_id}/users/{user_id}.json` |

Note from the reference's Changelog (October 26, 2023): "passwords can no longer be managed via the
API, regardless of the user making the request" — so there is no create/update-password action to
add here; user management beyond read is out of the documented surface.

### Text Messages

| Action | Type | Endpoint |
|---|---|---|
| List Text Conversations | search | `GET /v3/a/{account_id}/text-messages.json` |
| Get Text Conversation | read | `GET /v3/a/{account_id}/text-messages/{conversation_id}.json` |
| Send Text Message | perform | `POST /v3/a/{account_id}/text-messages.json` |

Send Text Message supports MMS via `media_url` (a publicly reachable URL CallRail fetches) only —
**not** the alternative `media_file` multipart-upload form. `HookContext` gives a hook no documented
way to read the bytes behind a `type: "file"` param or build a `multipart/form-data` body correctly;
guessing at that shape risks corrupting the upload. `media_url` reaches the same outcome (an MMS
attachment) without it.

CallRail requires the sender to identify themselves and include an opt-out keyword (STOP, CANCEL,
UNSUBSCRIBE, QUIT or END) — it auto-adds opt-out instructions to a lead's *first* text if none are
present, but the identification requirement is the caller's own responsibility. The endpoint also
explicitly forbids automated bulk messaging ("strictly prohibited by the CallRail Terms and
Conditions") — this action is for one-at-a-time, person-to-person sends.

### Left out entirely, for this first pass

All real, documented endpoints, left out to keep the surface reviewable rather than exhaustive:
Ignoring Form Fields, Summarizing Form Data, Call Timeseries, Call Page Views, Message Flows,
Notifications, Caller IDs, Integrations, Integration Triggers, Summary Emails, and Leads (the
`leads`/`leads/{id}/timeline` endpoints, which are nested oddly under an `{agency_id}` rather than
`{account_id}` in the reference and were left out rather than guessed at).

## Health checks

- **`service`** (`kind: "service"`, `app`-scoped, unsigned) — reads
  `https://status.callrail.com/api/v2/summary.json`, an Atlassian Statuspage confirmed to be
  CallRail's own (`page.name: "CallRail"`) and to carry a component literally named `API` alongside
  `SMS`, `MMS`, `Call Tracking`, `Call Routing`, `Webhooks`, `Call Recording` and `Call
  Transcription` — not just product-level components that would say nothing about the API this app
  calls. The page-level `status.indicator` drives the verdict; individual components are reported
  as detail.
- **`quota`** (`kind: "quota"`) — **declared unavailable, `severity: "informational"`.** The
  reference documents fixed rate-limit ceilings (1,000 requests/hour and 10,000/day general;
  150/hour and 1,000/day for SMS sends; 100/hour and 2,000/day for outbound calls) but no header or
  endpoint reports remaining headroom against them. A live, unauthenticated probe against
  `/v3/a.json` carried no `X-RateLimit-*` header. `informational` keeps the declared absence from
  pinning the app's overall verdict at `unknown` forever.
- **`auth:api-token`** — derived automatically from the Auth `test` hook (see Authentication above).

## Development

```bash
deno task validate   # manifest checks (@w6w/validator)
deno task check       # typecheck
deno task lint         # deno lint
deno task fmt           # format — always via this task, never bare `deno fmt`
deno task test           # unit tests
```

`assets/icon.png` is the verified verbatim vendor mark — the 48×48 frame of
`https://app.callrail.com/favicon.ico` extracted pixel-exact to PNG. Do not modify, replace or
regenerate it. Always run `deno task fmt`, never bare `deno fmt` — the bare form rewrites binary
assets and would falsify this claim.
