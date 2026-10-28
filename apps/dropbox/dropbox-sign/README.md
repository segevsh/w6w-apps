# Dropbox Sign

Send documents for signature, track them to completion, and manage the
templates and teams around them.

- **Categories** — legal, documents, productivity
- **Auth methods** — api-key, oauth2
- **Actions** — 27
- **Egress allowlist** — `api.hellosign.com`, `app.hellosign.com`
- **Website** — https://sign.dropbox.com
- **API docs** — https://developers.hellosign.com ·
  schema: `github.com/hellosign/hellosign-openapi` — the vendor's own
  repository, described there as "Official Dropbox Sign OpenAPI Spec"

> **The name.** The product was renamed from HelloSign to Dropbox Sign; the API
> was not. Measured 2026-08-18, `api.hellosign.com` is live and
> `api.sign.dropbox.com` does not resolve. Every URL in this app is deliberate.

## Setup

### API Key

1. Dropbox Sign → **Settings → API → API Keys**, and create a key.
2. Paste it into the connection's **API Key** field.

It is sent as HTTP Basic with the key as the **username and an empty
password** — `base64("key:")`, colon included. That trailing colon is not
decoration: a header built without it is rejected exactly like a wrong key, so
the mistake looks like a credential problem rather than an encoding one. The
auth method declares `type: "basic"` rather than `type: "apiKey"` for that
reason — Basic is genuinely what goes over the wire.

### OAuth

For acting on behalf of *another* Dropbox Sign user. Requires an API App
registered in Dropbox Sign, whose client id and secret are configured on this
w6w installation.

**The OAuth endpoints are not where the spec puts them**, which is why
`app.hellosign.com` is in the allowlist even though no action calls it. The
document lists `/oauth/token` among its paths, and its `servers` block is
`https://api.hellosign.com/v3` — but that URL does not exist. Measured
2026-08-18:

| Request | Result |
|---|---|
| `POST https://api.hellosign.com/v3/oauth/token` | `404` `{"error_name":"not_found"}` |
| `POST https://app.hellosign.com/oauth/token` | `400` `invalid_request`, *"Either the combo client_id/code is wrong…"* |
| `GET https://app.hellosign.com/oauth/authorize?client_id=…` | `200` (the login page) |

Two further things the document says about that endpoint are not true of the
running one, both checked the same day and both the kind that strand a
connection at "connect failed" with no explanation:

- It declares the token request as `application/json`. The live endpoint parses
  **form-encoded** bodies — posting one without `client_id` answers
  `"Parameter client_id is missing"`, which it could only know by having read
  the form. The ordinary OAuth2 client works.
- It marks `state` **required** on the token request. It is not: omitting
  `state` produces the ordinary client_id/code error, while omitting `client_id`
  names that parameter specifically.

The connection asks for six scopes — `basic_account_info`, `account_access`,
`request_signature`, `signature_request_access`, `template_access`,
`team_access` — and not `api_app_access`, because this app ships no API App
action.

## Actions

| Key | Type | Description |
|---|---|---|
| `signature-request-send` | perform | Email a document to signers |
| `signature-request-send-with-template` | perform | Fill a template's roles and send it |
| `signature-request-get` | read | One request and each signer's status |
| `signature-request-list` | read | Search requests with Dropbox Sign's query syntax |
| `signature-request-cancel` | perform | Stop an incomplete request |
| `signature-request-remove` | perform | Permanently drop access to a completed one |
| `signature-request-remind` | perform | Nudge one signer |
| `signature-request-update` | perform | Correct a signer's email or name |
| `signature-request-release-hold` | perform | Send a request created on hold |
| `signature-request-files-get` | read | A temporary link, or a data URI, for the signed PDF |
| `template-list` | read | List reusable templates |
| `template-get` | read | A template's roles, fields and documents |
| `template-delete` | perform | Delete a template |
| `template-add-user` | perform | Share a template with an account |
| `template-remove-user` | perform | Revoke that access |
| `template-files-get` | read | A link, or data URI, for a template's documents |
| `embedded-sign-url-get` | read | The short-lived URL for signing inside your page |
| `embedded-edit-url-get` | perform | The short-lived URL for editing a template inline |
| `unclaimed-draft-create` | perform | A claimable draft plus the one-time claim URL |
| `account-get` | read | The account, its plan and its remaining quota |
| `account-update` | perform | The account-wide callback URL or locale |
| `team-get` | read | The team this account belongs to |
| `team-members-list` | read | Members, with the account ids other actions take |
| `team-invites-list` | read | Invitations not yet accepted |
| `bulk-send-job-list` | read | Bulk send jobs |
| `bulk-send-job-get` | read | One job and the requests it created |
| `report-create` | perform | Queue a usage report (it arrives by email) |

## Three ways this API goes wrong quietly

Each produces a plausible result rather than an error, which is why each is
handled in the app rather than left to the workflow author.

### 1. Test mode decides whether a signature is legally binding, and it defaults to off

`test_mode: false` — Dropbox Sign's own schema default, which this app keeps —
means the request emails real people, consumes plan quota, and produces a
signature with legal standing. `test_mode: true` is a rehearsal that binds
nobody.

The tempting move is to default to the safe one. That would be the worse
surprise: a workflow that looks like it is sending contracts would quietly send
nothing binding, and nobody finds out until they need the signature. So the
default matches the API, the parameter is labelled **"Test Mode (off = legally
binding)"**, and a test asserts that every action able to create a request
offers it and that none of them overrides the default.

The value is also always sent explicitly rather than omitted when false, and the
string `"false"` — which is truthy in JavaScript — is coerced in one place so a
mis-typed flag cannot send a real contract.

> A free Dropbox Sign plan can only ever create test-mode requests. `account-get`
> returns `is_paid_hs`, and the connection records it, so "why is nothing
> binding" has an answer.

### 2. A 200 can carry warnings

Twenty-eight response schemas in the document have a `warnings[]` array —
an ignored field, a signer who has already signed. The HTTP status is still
200, so a caller that only checks for an exception never sees them. The send
actions return the array and log it at `warn`.

### 3. `signature_id` is not `signature_request_id`

The request has one id; each signer inside it has another, and both are long
hex strings. `signature-request-update` and `embedded-sign-url-get` take the
**signer's** id, and passing the request id fails with an error about the
signature rather than about the id. Both say so in the parameter hint; the
signer's id comes from `signature-request-get`'s `signatures[]`.

Note too that `is_complete` only turns true once **every** signer has signed —
polling for "did Ada sign" means reading `signatures[].status_code`.

## Two verbs that are not the same verb

`signature-request-cancel` stops an **incomplete** request: signers can no
longer sign, and it stays visible in the account.

`signature-request-remove` applies to a **completed** one and permanently
removes this account's access to it and its files. It is not undoable, so it
requires an explicit `confirm` flag on top of the id — a blank field must not be
able to destroy the wrong thing. Download anything you need first;
`signature-request-files-get` returns a link while you still have access.

## Documents go in by URL, and come out as a link

Every send endpoint accepts either JSON with `file_urls` or multipart with
`files`. This app sends JSON. An App runs in a sandbox whose only outbound reach
is `ctx.fetch` to an allowlisted host — it has no local file to attach and no
business reading one — so Dropbox Sign fetches the document itself.

Coming back, `GET /signature_request/files/{id}` streams the PDF. An App returns
JSON to a workflow, so that variant is deliberately not offered; the two JSON
variants are. **The `file_url` is short-lived** — the response carries
`expires_at`, and a workflow that stores the URL and fetches it later gets
nothing. Fetch it in the same run, or store the id and ask again.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are the **signing** components up, per Dropbox Sign's own status page? |
| `quota` | quota | How much plan quota and hourly request allowance is left? |

Two things had to be checked before the service probe could be trusted, and both
changed its design. Verified 2026-08-18:

**It is not Dropbox's status page.** `status.dropbox.com` and
`status.hellosign.com` are different Statuspage instances — different page ids
(`t34htyd6jblf` vs `djw9397fmqd1`), different components, the latter titled
"Dropbox Sign and Fax". The pack's `dropbox` app watches the first; this app
watches the second.

**The component group named "API" is not this app's API.** The page groups nine
components under Core / Web / API / Integrations, and the *only* member of the
API group is **"API callbacks from Dropbox Sign"** — outbound webhook delivery,
not the REST surface every action here calls. Filtering on the group whose name
matches would report green while sending was down. So the check reads four named
components by hand, excluding the fax and CRM-integration ones, since this app
ships no fax action.

`quota` is unusual in this pack: both meanings of "how much is left" are
answerable, from a single `GET /account`.

- **Plan quota, in the body.** `account.quotas` carries
  `api_signature_requests_left`, `documents_left`, `templates_left` and
  `sms_verifications_left`. This is the number that actually stops a workflow.
- **Request rate, in the headers.** The wire carries `x-ratelimit-limit`,
  **`x-ratelimit-limit-remaining`** and `x-ratelimit-reset` — note the middle
  one is *not* the `X-RateLimit-Remaining` the spec declares. A check written
  from the document alone would read a header that never arrives and report
  `unknown` forever, so both spellings are read, the measured one first.

Two measured details shape the rest: the rate-limit headers are **absent on a
401** (an unauthenticated `GET /v3/account` carries none of them, while a `404`
from the same host carries all three), so only a signed call can sample them;
and `quotas` fields are **nullable**, where null means an unlimited plan rather
than an exhausted one.

## What this app deliberately does not do

- **Fax.** `/fax/*` and `/fax_line/*` are a separate product needing a purchased
  fax line, with its own billing and its own status components. A test asserts
  no action calls those paths.
- **API App management.** Creating and deleting API Apps is account
  administration, and it is the one OAuth scope this app does not request.
- **Team creation and membership changes.** Reading a team resolves account ids;
  restructuring one from a workflow is not what this integration is for.
- **Starting a bulk send.** The jobs are readable, but starting one takes a CSV
  upload — the multipart path this app does not use.

## Errors

Dropbox Sign's envelope is `{"error": {"error_msg", "error_name"}}`.
`error_name` is the machine-readable half — `unauthorized`, `not_found`,
`bad_request`, `exceeded_rate` — and `error_msg` is the sentence a human needs,
so failures surface the status and the whole envelope rather than a summary.

The two 401 shapes are told apart at connect time, because they have different
fixes: *"Unauthorized user. No credentials supplied."* means the header never
arrived, and *"Unauthorized api key"* means it did and was wrong.
