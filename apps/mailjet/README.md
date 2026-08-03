# Mailjet

Send transactional email via Mailjet's v3.1 Send API and manage the contacts, lists, templates,
senders and statistics behind it.

- **Categories** — email, marketing
- **Auth methods** — basic
- **Actions** — 17
- **Egress allowlist** — `api.mailjet.com`

## Links

| | |
|---|---|
| **Website** | <https://www.mailjet.com/> |
| **API docs** | <https://dev.mailjet.com/email/reference/> |
| **Source / git** | <https://github.com/mailjet> — Mailjet has no public product repo. This is their SDK org: the official clients (`mailjet-apiv3-nodejs`, `mailjet-apiv3-php`, `mailjet-apiv3-python`, `mailjet-apiv3-go`, …) plus **[`mailjet/api-documentation`](https://github.com/mailjet/api-documentation)**, the Markdown source that generates dev.mailjet.com. That doc repo is the primary source used to build this app. |

> **The integration catalogue's link was stale.** The candidate entry cited
> `https://dev.mailjet.com/email-api/v3/apikey/`. That URL still returns HTTP 200, which is why it
> looks alive — but it **302s to `https://dev.mailjet.com/email/reference/`**, discarding the path.
> It is a leftover from Mailjet's previous docs layout and points at no particular resource. The
> real reference root is `https://dev.mailjet.com/email/reference/`. Worth noting separately:
> dev.mailjet.com is client-rendered, so a plain fetch of any of its pages returns an empty
> document — the content in this app was taken from the docs' own GitHub source and from
> JS-rendered reads of the reference pages.

## Auth

HTTP Basic, **API key as the username and secret key as the password**. Confirmed on the wire
rather than only from docs — an unauthenticated request names both halves in its challenge:

```
$ curl -sSI https://api.mailjet.com/v3/REST/apikey
HTTP/2 401
www-authenticate: Basic realm="Provide an apiKey and secretKey"
```

Both are minted with the account and live at <https://app.mailjet.com/account/apikeys>. The same
pair is also the SMTP relay's login and password, so the secret half is a genuine password.

**Both fields are typed `secret`**, including the one Mailjet calls the *public* API key and shows
unmasked in its own UI. Basic auth has no notion of a public username — `base64(apiKey:secretKey)`
is a single credential, and half of it is still credential material.

### There is deliberately no connection label

The natural way to label a connection would be to read the account name from `GET
/v3/REST/apikey`. **That endpoint returns `APIKey` and `SecretKey` in plaintext** — its documented
response body is `{ "ACL", "APIKey", ..., "SecretKey", "TrackHost", "UserID" }`. Anything
`afterConnect` returns becomes stored, displayed connection metadata, so harvesting a label there
would pipe the credential out of the one hook allowed to hold it. **This app never calls
`/v3/REST/apikey` from any hook**, and a Mailjet connection is left unlabelled rather than labelled
at that price. Mailjet documents no other account-identity read (`/email/reference/settings/` 404s
as of 2026-08-03), so there is nothing verified to substitute.

The auth `test` hook therefore probes `GET /v3/REST/contactslist?Limit=1` instead. It is
entitlement-free in a way that matters here specifically: sub-accounts are a first-class Mailjet
feature, and per their account-management guide "Each API key will have its own dedicated database
for contacts, lists, newsletters and statistics." Every key, master or sub, has a contacts database
it can read — where a probe against an account-management endpoint would report a perfectly good
sub-account key as broken.

## Two API versions, one host

Not a migration in progress — the documented steady state:

| Surface | Base |
|---|---|
| Transactional send | `https://api.mailjet.com/v3.1/send` |
| Everything else (contacts, lists, templates, senders, messages, stats) | `https://api.mailjet.com/v3/REST/<resource>` |

`send` is the **only** v3.1 endpoint; there is no `/v3.1/REST/...`. Mailjet also still serves a v3
Send API at `/v3/send`. This app implements v3.1 only: it is Mailjet's own recommendation for new
integrations and reports per-recipient errors, where v3's response is a flat blob. The trade-off is
batch size — per Mailjet, v3.1 "allows you to send up to 50 messages in a single API call, as
opposed to v3, where the limit is 100". Better error attribution was judged worth 50 messages.

**Regional endpoints:** `api.eu.mailjet.com` resolves, but to the *same* IP as `api.mailjet.com`
(both names came back on one `getent hosts` line — an alias). Mailjet's docs describe no regional
split and never print that hostname, so the allowlist declares `api.mailjet.com` alone. Putting an
undocumented alias on an egress allowlist buys nothing and widens the sandbox on a guess.

## Partial failure — the one trap to know

**The v3.1 Send API returns HTTP 200 for a request in which individual messages failed.** `Status`
is per message:

```json
{ "Messages": [
  { "Status": "error", "Errors": [ { "ErrorCode": "send-0003",
      "ErrorMessage": "At least \"HTMLPart\", \"TextPart\" or \"TemplateID\" must be provided." } ] },
  { "Status": "success", "To": [ { "MessageUUID": "cb92...", "MessageID": 70650219165027410 } ] }
] }
```

A workflow that treats a 2xx as "sent" will be wrong. Check every `Messages[i].Status`. Mailjet
preserves input order ("The messages' order is preserved from the user input"), so `Messages[i]`
corresponds to the *i*-th message you sent — which is the only way to attribute the failure, and
why `send-email-batch` neither reorders nor filters the array it is given.

## Actions

| Group | Actions |
|---|---|
| Send (v3.1) | `send-email`, `send-template-email`, `send-email-batch` |
| Contact | `list-contacts`, `get-contact`, `create-contact`, `update-contact`, `manage-contact-lists` |
| Contact list | `list-contact-lists`, `create-contact-list`, `manage-many-contacts`, `get-contact-import-job` |
| Message log | `list-messages`, `get-message` |
| Config & reporting | `list-templates`, `list-senders`, `get-stat-counters` |

Notes on the ones with sharp edges:

- **`manage-contact-lists` and `manage-many-contacts` both default to `addnoforce`.** Mailjet's
  `addforce` "adds the contact and resets the unsub status to false" — it silently resurrects an
  opt-out. That is occasionally legitimate and usually a compliance problem, so overriding an
  unsubscribe is a decision someone has to type, never one they inherit from a default.
- **They are two actions, not one, because Mailjet's casing differs.** The single-contact endpoint
  takes a capitalised per-list `Action` inside `ContactsLists`; the bulk endpoint takes a
  **lowercase** top-level `action`. A shared implementation would have to silently re-case a
  caller's field. Both casings are pinned by tests.
- **`manage-many-contacts` is asynchronous.** It returns `{"Data": [{"JobID": 35800}]}` the instant
  Mailjet queues the upload — nothing about whether the contacts landed. `get-contact-import-job`
  polls it; `Completed` is the only success, and `Allocated`/`Upload`/`Prepare`/`Importing` all mean
  still running.
- **`list-messages` hides the useful fields by default.** `Subject`, `CustomID` and the recipient
  address are omitted unless `showSubject` / `showCustomId` / `showContactAlt` are set. Without
  them you get a list of opaque integers.
- **`get-message` takes `MessageID`, not `MessageUUID`.** The two travel together in every send
  response; passing the UUID returns a 404 that reads like the message does not exist.
- **`update-contact` cannot change an email address** — it is the contact's identity. Mailjet's
  `PUT` also behaves as `PATCH` ("The update will affect only the specified properties"), so
  omitted fields are preserved rather than cleared.

Every `perform` action declares `idempotent`, which drives the host's retry policy and invocation
dedupe. All three send actions are `false` — a retry delivers the mail twice. `create-contact` and
`create-contact-list` are `false` because a duplicate is an error rather than a repeat.
`update-contact`, `manage-contact-lists` and `manage-many-contacts` are `true`: each sets named
state to a fixed value, and Mailjet guarantees the bulk path converges ("multiple entries or
subsequent uploads will not add duplicate entries").

## Health checks

Three questions get confused with each other, so this section keeps them apart: is the *vendor* up,
is *this credential* live, and is there *quota* left.

### Is the vendor up?

**`service`** — `GET https://status.mailjet.com/api/v2/summary.json`, an Atlassian Statuspage.

Status pages are the single most trap-laden thing in this pack — HTML catch-alls, 302s that discard
the path, and unclaimed `*.statuspage.io` subdomains that serve a ~127KB Atlassian marketing page to
anything that asks. So this one was verified **two ways** on 2026-08-03, and both had to pass:

| Check | Result |
|---|---|
| **(a) Bogus sibling path** — `GET /api/v2/wibble-not-real.json` | **HTTP 404, 0 bytes, no content-type.** A catch-all would have returned the real path's bytes. This host routes. |
| **(b) Content-type and body** — `GET /api/v2/summary.json` | **HTTP 200, `application/json; charset=utf-8`, 4477 bytes**, opening `{"page":{"id":"wkf4h18hjr2r","name":"Mailjet",...}` with a populated component array. |

(a) rules out a catch-all; (b) rules out an HTML impostor and an unclaimed subdomain — a page id
and Mailjet's own name mean the page is claimed, and 4477 bytes is nowhere near the 127KB marketing
shell. Verdict: **genuine, trustworthy**.

*Why `summary.json` over the obvious alternatives.* `/api/v2/status.json` is the same single round
trip but returns only the rollup indicator. `summary.json` costs identically and additionally
carries the per-component array, so one probe reports the app, the API and SMTP independently —
which is the whole reason `HealthReport.components` exists. Reporting one boolean when the vendor
publishes eight named components throws away the attribution an operator needs to tell "Mailjet is
down" from "the part we don't use is down". An RSS/Atom feed also exists, but a feed is a log of
incident *updates*, not a statement of current state (the trap `rfcs/healthcheck.md` calls out
explicitly); `summary.json` states the present, which is the question being asked.

### Is this credential live?

The auth `test` hook — `GET /v3/REST/contactslist?Limit=1`. See "Auth" above for why that endpoint
rather than the account-management read that would have leaked the secret key.

### Is there quota left?

**`quota`** — declared `unavailable`, and that is the honest answer rather than a gap.

A quota check reads one of two signals. Mailjet publishes **neither**, checked on the wire rather
than inferred from silence:

- **No rate-limit headers.** Their rate-limits page says only that "If you reach a rate limit, our
  API will return a `429` HTTP error code", with no numbers and no `X-RateLimit-*` contract. Live
  responses agree — the complete header set from `api.mailjet.com` was `date` / `content-type` /
  `www-authenticate` on v3, and `content-length` / `content-type` / `x-mj-request-guid` / `date` on
  v3.1. Not one rate-limit header on either version; `x-mj-request-guid` is a trace id, not a
  counter.
- **No allowance endpoint.** None of the twelve resource families in Mailjet's API reference exposes
  plan limits, remaining sends or credits — pricing lives on mailjet.com and in the web app.
  `/v3/REST/statcounters` counts what has been *sent*, which is a numerator with no denominator;
  deriving headroom from it would mean inventing the allowance, i.e. fabricating the exact answer
  the check exists to report.

`severity: "informational"` is load-bearing, not cosmetic: an `unavailable` entry always reports
`unknown`, and at the default `degraded` severity that `unknown` would propagate into every roll-up
and pin this app at `unknown` permanently.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` — `status.mailjet.com/api/v2/summary.json` |
| `quota` | quota | connection | — | informational | — | declared `unavailable` — Mailjet publishes neither headers nor an endpoint |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

`status.mailjet.com` is deliberately **not** on the app's main egress allowlist — no action has
business calling it. The `service` check widens egress for its own unsigned probe only, which the
spec permits precisely because the posture is unsigned: a signed request must never reach a
third-party status host.

## Not built, and why

- **Campaigns and newsletters** (`/campaigndraft`, `/newsletter`) — Mailjet's marketing-campaign
  authoring surface is large and stateful (draft → content → test → schedule → send), and a
  half-implemented campaign builder is worse than none. The contact and list actions here are what
  a workflow needs to *feed* campaigns; composing them stays in Mailjet's UI.
- **Creating senders** (`POST /v3/REST/sender`) — the endpoint exists, but adding a sender only
  *starts* a validation flow that completes out of band (a confirmation email, or a DNS record for a
  whole domain). An action that appears to add a sender and leaves it unusable until a human acts is
  worse than no action. `list-senders` is included precisely so the most common send failure —
  an unvalidated `From` — is diagnosable.
- **Custom contact properties** (`/contactmetadata`, `/contactdata`) — defining a property schema is
  account configuration, not a workflow step. `manage-many-contacts` *accepts* `Properties` for
  properties already defined, which is the part automation needs.
- **CSV import** (`/csvimport`, `/v3/DATA/...`) — the JSON path (`manage-many-contacts` +
  `get-contact-import-job`) covers bulk loading. The CSV path additionally requires uploading raw
  `text:plain` payloads to a `/v3/DATA/` surface with its own conventions; it is redundant here.
- **Webhooks / Event API** (`/eventcallbackurl`) — inbound event delivery belongs to the host's
  trigger surface, not to an app's action list.
- **Segmentation** (`/contactfilter`) — a formula language of its own; not verifiable to the
  standard the rest of this app was built to without an account to test against.

## Icon

`assets/icon.svg` is **Mailjet's own mark** — the orange delta/paper-plane glyph — copied verbatim
from n8n's `nodes-base` (`packages/nodes-base/nodes/Mailjet/mailjet.svg`), the same provenance the
rest of this pack uses. Not drawn for this pack.

---

Researched and endpoint-verified 2026-08-03. Sources, in the order they were trusted: **the wire**
(auth challenge, response headers, status-page probes, DNS), then
[`mailjet/api-documentation`](https://github.com/mailjet/api-documentation) (the Markdown source
that generates dev.mailjet.com), then JS-rendered reads of `dev.mailjet.com/email/reference/` for
field-level detail.

Two things could **not** be verified and are stated rather than papered over:

1. **Endpoint existence cannot be probed unauthenticated.** Mailjet's Basic-auth gate sits in front
   of routing — `GET /v3/REST/wibblenotreal` returns the same `401` as `GET /v3/REST/contact`. So
   every path in this app is docs-verified, not wire-verified. A live credential would be needed to
   distinguish them.
2. **`/email/reference/settings/` 404s**, so the API-key/account resources could not be checked
   against rendered docs. Nothing in this app depends on them — which is the point.
