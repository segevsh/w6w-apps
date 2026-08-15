# RingCentral

Send SMS, read the message store and call log, look up extensions and the company directory, place
RingOut calls and read presence — on the **RingCentral Platform API v1.0**.

- **Categories** — communication, productivity
- **Auth methods** — oauth2 (Authorization Code + PKCE), jwt-bearer (JWT Bearer grant, custom)
- **Actions** — 13
- **Health checks** — 2 declared absences (`service`, `quota`) + 1 live probe (`api`) + the derived
  `auth:oauth2` and `auth:jwt-bearer`
- **Egress allowlist** — `platform.ringcentral.com` (this is also the only host any health check
  reaches — RingCentral publishes no separate machine-readable status host)
- **Website** — https://www.ringcentral.com/
- **API docs** — https://developer.ringcentral.com/api-docs/latest/index.html
- **OpenAPI** — https://netstorage.ringcentral.com/dpw/api-reference/specs/rc-platform.yml
- **Status page** — https://status.ringcentral.com/ (real, but not machine-readable — see below)

> **Everything below was verified against RingCentral's own sources on 2026-08-15** — its
> machine-readable OpenAPI 3.1 document (1,538,792 bytes), and live probes against
> `platform.ringcentral.com` and `status.ringcentral.com`. Nothing here came from a third-party
> integration directory.

## RingCentral's API surface is enormous. This app covers 13 of roughly 450 operations

The OpenAPI document spans Company/Account admin, phone provisioning, call control (telephony
sessions, call queues, IVR), SMS/MMS, fax, voicemail, meetings, webinars, video, analytics,
emergency-address management, and more. This app deliberately covers the "communicate and look
things up" core a workflow actually reaches for — see **Deliberately not covered** below for what
was left out and why.

## The three things most likely to cost someone a day

### 1. Two auth methods exist because of WHEN the workflow runs, not preference

RingCentral's OAuth token endpoint (`GetTokenRequest`'s `grant_type` discriminator) supports several
grants; this app implements the two that make sense for a third-party workflow platform:

| Method | `type` | Needs a browser? | Works in a scheduled/background run? |
| --- | --- | --- | --- |
| `oauth2` | `oauth2` (Authorization Code + PKCE) | Yes | No — needs a live user session |
| `jwt-bearer` | `custom` | No | Yes |

**`jwt-bearer` is not a self-signed JWT.** RingCentral's `urn:ietf:params:oauth:grant-type:jwt-bearer`
grant takes an `assertion` — but unlike a textbook RFC-7523 flow, the assertion is a long-lived,
**opaque JWT credential string** the account owner mints by hand in Developer Console (Auth
Credentials tab of a Server/Bot application), not something this app constructs or signs. That is
exactly what a network-less credential sandbox can use safely: no private signing key ever needs to
exist inside this app, because RingCentral already did the signing when it issued the credential. The
wire exchange is a confidential-client form POST:

```
POST /restapi/oauth/token
Authorization: Basic base64(clientId:clientSecret)
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<pasted JWT credential>
```

`exchange` performs this at connect time; `refresh` repeats the identical call when the access token
expires — the pasted JWT credential itself is valid until revoked in Developer Console, so re-minting
from it (rather than tracking a separate `refresh_token`) is the same "the credential never expires,
only the token does" shape as this pack's `zoom/auth/server-to-server.ts`.

### 2. The error envelope carries more than its own schema requires

`components.schemas.ApiErrorResponseModel` only requires `errors[]`. A live unauthenticated probe of
`GET /restapi/v1.0/account/~/extension/~` on 2026-08-15 shows the real wire shape carries **both** a
top-level `errorCode`/`message` **and** the nested array:

```json
{
  "errorCode": "TokenInvalid",
  "message": "OAuth token is invalid",
  "errors": [{ "errorCode": "OAU-149", "message": "OAuth token is invalid" }]
}
```

`formatRcError` ([`lib/client.ts`](lib/client.ts)) reads the top-level fields — present on every
response actually observed — and appends nested detail only when it adds information (more than one
sub-error, or a `parameterName` naming which field was rejected). `probeCredential`
([`auth/_shared.ts`](auth/_shared.ts), shared by both auth methods' `test` hooks — it lives in
`auth/` rather than `lib/` because it stamps an `Authorization` header, which the sandbox audit only
allows there) further distinguishes the specific codes worth telling a user apart:

| Code | Status | Reported as |
| --- | --- | --- |
| `AGW-401` "Authorization header is not specified" | 401 | the credential never reached the request |
| `TokenInvalid` | 401 | the access token was rejected — reconnect |
| any 403 | 403 | a permission refusal, with RingCentral's own error code and message |

### 3. Query-parameter arrays are repeated keys, not comma-joined

Every multi-valued filter in this API (`status`, `type`, `direction`, `messageType`, `readStatus`, …)
is documented `style: "form", explode: true` — `?status=Enabled&status=Disabled`, one key per value.
This is the opposite convention from this pack's `apify` app, which comma-joins. `appendQuery`
([`lib/client.ts`](lib/client.ts)) implements the repeated-key form; getting this backwards silently
returns zero results rather than erroring, because RingCentral reads an unrecognised comma-joined
value as one (nonexistent) enum member.

## `~` addresses "the connection's own account/extension"

`accountId` and `extensionId` path segments both accept the literal `"~"` — RingCentral's own
shorthand for "the account/extension associated with the current authorization session," and the
documented default for both parameters. Every action here defaults both to `"~"`; a real id is only
useful for a connection with account-admin permissions reading a *different* extension's data (e.g.
an admin pulling another user's call log).

## Auth

### `oauth2` — Authorization Code + PKCE

The interactive flow. Requires a RingCentral app (Client ID / Client Secret / redirect URI)
registered at developers.ringcentral.com and configured on this w6w installation, exactly like this
pack's `discord`/`airtable`/… `oauth2` methods.

**Scopes are literally the vendor's `x-app-permission` names.** RingCentral's `scope` request
parameter on the OAuth authorize/token endpoints is the space-separated list of "application
permissions" — the same string stamped as `x-app-permission` on every operation in the OpenAPI
document. This app requests exactly the six its actions need, read directly off the operations it
calls:

| Scope | Needed by |
| --- | --- |
| `ReadAccounts` | `account-get`, `extension-list`, `extension-get`, `phone-number-list`, `directory-entries-list` |
| `SMS` | `sms-send` |
| `ReadMessages` | `message-store-list`, `message-store-get` |
| `ReadCallLog` | `call-log-list`, `call-log-get` |
| `ReadPresence` | `presence-get` |
| `RingOut` | `ring-out-create`, `ring-out-get` |

The app itself must also hold these permissions in Developer Console; the OAuth scope only narrows
what a given Connection may request from an app that already has them.

### `jwt-bearer` — JWT Bearer grant (server apps, scheduled/background runs)

See "The three things most likely to cost someone a day" above for the full account. Three pasted
values: the JWT credential, Client ID, Client Secret.

### The credential probe is `GET /restapi/v1.0/account/~/extension/~`, and it was chosen by reading the schema

| Candidate | Requires a credential? | Needed permission | Leaks anything? |
| --- | --- | --- | --- |
| **`/account/~/extension/~`** | ✅ `401 AGW-401` unauthenticated, `401 TokenInvalid` with a bad token (both observed live) | `ReadAccounts` — the same one every read action already needs | ✅ nothing — no SIP credentials, no device provisioning data (those live behind `extension/{id}/device/{id}/sip-info`, never called here) |
| `/restapi` (API-discovery root) | ❌ answers 200 with **no token at all** (measured live) | none | — |

`/restapi` is exactly this pack's recurring trap (Apify's `/v2/store`, TidyCal's unauthenticated
paths): a Connection whose credential never got attached would sail through a probe against it. It is
used instead as the *reachability* probe (`health/api.ts`), where being public is precisely the point.

`afterConnect` calls the same whoami and keeps only `name`, `extensionNumber` and the account `id` for
`connectionLabel: "{{name}} ({{extensionNumber}})"` — `contact` (email, phone numbers), `roles` and
`permissions` never leave that function.

## Actions

13 actions. `resource` groups them in the editor.

| Key | Type | Endpoint | Scope needed |
| --- | --- | --- | --- |
| `account-get` | read | `GET /restapi/v1.0/account/{accountId}` | ReadAccounts |
| `extension-list` | search | `GET /restapi/v1.0/account/{accountId}/extension` | ReadAccounts |
| `extension-get` | read | `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}` | ReadAccounts |
| `phone-number-list` | search | `GET /restapi/v1.0/account/{accountId}/phone-number` | ReadAccounts |
| `directory-entries-list` | search | `GET /restapi/v1.0/account/{accountId}/directory/entries` | ReadAccounts |
| `sms-send` | perform | `POST /restapi/v1.0/account/{accountId}/extension/{extensionId}/sms` | SMS |
| `message-store-list` | search | `GET .../extension/{extensionId}/message-store` | ReadMessages |
| `message-store-get` | read | `GET .../extension/{extensionId}/message-store/{messageId}` | ReadMessages |
| `call-log-list` | search | `GET .../extension/{extensionId}/call-log` | ReadCallLog |
| `call-log-get` | read | `GET .../extension/{extensionId}/call-log/{callRecordId}` | ReadCallLog |
| `presence-get` | read | `GET .../extension/{extensionId}/presence` | ReadPresence |
| `ring-out-create` | perform | `POST .../extension/{extensionId}/ring-out` | RingOut |
| `ring-out-get` | read | `GET .../extension/{extensionId}/ring-out/{ringoutId}` | RingOut |

### Idempotency

**Neither `perform` action documents any idempotency key.** `sms-send`'s `CreateSMSMessage` body and
`ring-out-create`'s `MakeRingOutRequest` body carry no idempotency-key field of any kind in the
OpenAPI document — a retry sends a second text message or places a second phone call. Both are
declared `idempotent: false`.

### Notes on individual actions

- **`sms-send` is Toll-Free-only.** The vendor's own description: "Sending and receiving SMS is
  available for Toll-Free Numbers within the USA," rate-limited to 40 requests/minute. `from` must be
  a Toll-Free number the account owns.
- **`sms-send`/`ring-out-create` don't cover MMS/multipart.** `CreateSMSMessage` also accepts up to 10
  attachments (max 1,500,000 bytes total) via `multipart/form-data`/`multipart/mixed` — a materially
  different request shape (file params, per-part content types) left out to keep the action to one
  clear job. The plain-JSON `{from, to, text}` body this action sends is a fully documented,
  first-class request on its own, not a subset hack.
- **`call-log-list`'s `phoneNumber` filter has no leading `+`.** Documented as e.164 *without* the `+`
  sign (`"12053320032"`) — the opposite convention from the SMS/RingOut phone-number fields, which
  use full E.164 with `+`. Each action's param hint says which format that action expects.
- **`call-log-list` sends `recordingType`, not the deprecated `withRecording`.** RingCentral's own
  document marks `withRecording` deprecated in favor of `recordingType`, which answers both "has a
  recording" and "which kind" in one filter, with "if both are specified, `withRecording` is ignored."
- **`call-log-list`'s `view: "Detailed"` changes the record granularity, not just the field count.**
  One record per call *leg* (each ring, transfer, hold) instead of one per call, and caps `perPage` at
  250 instead of 1000.
- **`message-store-list`'s default date window is 24 hours**, not "everything" — `dateFrom` defaults
  to `dateTo` minus 24 hours per the vendor's own documented default, so an empty result for an old
  message is very often a missing `dateFrom`, not an absent message.
- **`directory-entries-list` needs only the `ReadAccounts` app permission** — the operation documents
  no `x-user-permission` at all, unlike almost every other action in this app. Its `perPage` also has
  a different ceiling (max 2000, vendor default 1000) than every other list action (max 1000).
- **`message-store-get`/`call-log-get` only build the single-id form.** Both endpoints document a bulk
  syntax (a comma-joined id list, answering a list instead of one record) which this app leaves out —
  covering it correctly would need a second, differently-shaped `output`.
- **`presence-get` legitimately answers `Offline` with most fields absent** for several extension
  types (Department, Announcement-only, Voicemail-only, Fax User, Paging Only, Shared Lines Group, IVR
  Menu, Application Extension, Park Location) — the vendor's own documented shape for those types, not
  a failed read.

## Health checks

Two declared absences plus one live probe, plus the derived `auth:oauth2` and `auth:jwt-bearer`.

### ~~`service`~~ — a real status page, but not a machine-readable one

Checked three ways on 2026-08-15:

1. **`https://status.ringcentral.com/` is a genuine live page, not a redirect or parked domain** —
   `200 text/html`, 2,330 bytes. The task's own reminder that a bare 200 proves nothing turned out to
   matter here: the body is a client-rendered Vue/Axios single-page app ("RC Service Status
   Dashboard") that fetches its data from a *separate* host declared in its own
   `content-security-policy`: `connect-src … https://statusapi.ext.ringcentral.com`.
2. **It is not Atlassian Statuspage, Better Stack or Instatus.** None of the standard machine-readable
   paths exist on this host:

   | Path | Status | Content-Type |
   | --- | --- | --- |
   | `/api/v2/status.json` | 404 | `application/json` |
   | `/api/v2/summary.json` | 404 | `text/html; charset=UTF-8` |
   | `/history.atom` | 404 | `text/html` |
   | `/history.rss` | 404 | `text/html` |
   | `/index.json` | 404 | `text/html` |

3. **The backing data API is undocumented, and its guessed paths also 404.**
   `statusapi.ext.ringcentral.com` answers a bare Tomcat-style
   `404 text/html;charset=iso-8859-1` for `/`, `/api/v1/services`, `/v1/services`, `/services`,
   `/api/services` and `/status`. The bundled JS is a minified Vue/Axios app with no published API
   reference.

So this is declared `unavailable` at `severity: "informational"` (an `unavailable` entry always
reports `unknown`, which outranks `ok` in the roll-up — any other severity would pin this app's
verdict at `unknown` forever) rather than reverse-engineering an undocumented private API from
obfuscated JS.

### `api` — unsigned reachability, because that IS readable

`GET /restapi`, unauthenticated. Unlike a typical unsigned probe that is *rejected* (the rejection
being the evidence — see this pack's `tidycal/health/api.ts`), RingCentral's API-discovery root is
*designed* to answer publicly: `operationId: readAPIVersions`, `x-throttling-group: "NoThrottling"`,
no narrowed `security`. Measured live on 2026-08-15:

```
GET https://platform.ringcentral.com/restapi
200 application/json;charset=utf-8
{"uri":"…/restapi","apiVersions":[{"uriString":"v1.0","versionString":"1.0.60", …}],
 "serverVersion":"26.3.1.10210249","serverRevision":"6b1ddbc8"}
```

A 200 with an empty `apiVersions`, a non-JSON body, or a 5xx reports `down`; anything else reports
`unknown` rather than guessing. `kind: "dependency"`, not `"service"`, because this is a narrower,
honestly weaker claim than "the vendor has declared itself healthy" — it only proves the platform
host is answering.

### ~~`quota`~~ — no readable rate-limit signal

Verified two ways on 2026-08-15: a full header dump of both an unauthenticated `GET /restapi` (200)
and a rejected `GET /restapi/v1.0/account/~/extension/~` (401) carries no `X-RateLimit-Limit`, no
`X-RateLimit-Remaining` and no `Retry-After`; and the OpenAPI document tags every operation only with
a throttling **group name** (`Light`/`Medium`/`Heavy`/`Auth`/`NoThrottling`), never a readable budget
or remaining count. `429 TooManyRequests` is documented as the only signal, and it is reactive, not
predictive.

## Deliberately not covered

RingCentral's OpenAPI document declares roughly 450 operations. This app covers 13. What is left out,
and why:

- **Call control** (`/telephony/**` — bring-in, hold, park, flip, transfer, bridge, supervise, answer,
  reject, …) — live real-time session manipulation, not a fire-and-forget request/response Action.
- **Account/extension provisioning** (create/update/delete extension, device management, sites,
  business hours, roles, custom fields, …) — admin configuration, not day-to-day workflow automation,
  and this app's OAuth scopes deliberately stop at `ReadAccounts` (no `EditAccounts`/`EditExtensions`).
- **Meetings, video (RCV) and webinars** (`/rcvideo/**`, `/webinar/**`, `meeting/**`) — a materially
  different product surface (scheduling, session bridges, recordings) worth its own coherent app
  rather than a few bolted-on actions.
- **Fax** (`extension/{id}/fax`) — accepts a document body via multipart, the same "different request
  shape" reasoning that excluded SMS attachments.
- **Voicemail-to-text, message-store attachment download, greeting/IVR-prompt audio content** — binary
  content endpoints (`.../content`) returning raw audio/image bytes, not JSON a workflow step can use
  directly.
- **Webhooks/subscriptions** (`/restapi/v1.0/subscription`) — a different integration model (push
  notifications) from the pull-based Actions this app builds; a natural `trigger` for a future
  version.
- **A2P SMS campaign management** (`a2p-sms/**`) — SMS *compliance/registration* administration, a
  different job from sending a message.
- **Call queues, IVR menus, answering rules, emergency locations, business hours** — configuration
  surfaces, same reasoning as account/extension provisioning above.
- **Company Pager / internal Team Messaging** (`/team-messaging/**`, `company-pager`) — a
  RingCentral-specific chat product, not covered by this pass.
- **The `/restapi/v2/**` accounts/extensions/device-inventory family** — a newer, largely
  provisioning-focused parallel surface to the `v1.0` endpoints this app already uses; left for a
  future pass rather than mixing API generations without a clear reason to.
- **The `platform.devtest.ringcentral.com` sandbox host** — RingCentral runs a separate developer
  sandbox environment with its own credentials and test data. This app targets the production host
  only; a sandbox-vs-production toggle is a reasonable future addition, not something to bolt on
  silently via an unannounced param.

Nothing was left out because it could not be confirmed: every endpoint named above is documented in
the vendor's OpenAPI document and was read there.

## Icon

`assets/icon.png` is the verified verbatim vendor mark — the 64×64 frame of
`https://app.ringcentral.com/favicon.ico`, extracted pixel-exact to PNG (1,133 bytes). It was placed
before this app was built and is not modified here; a test asserts its byte length and PNG signature
so a future edit that regenerates or replaces it fails the suite.

## Layout

```
ringcentral/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # RingCentralClient, error formatting, WHOAMI_PATH
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/
│   ├── _shared.ts                # probeCredential / whoAmIDisplay — shared by both methods below
│   ├── oauth2.ts                 # Authorization Code + PKCE
│   └── jwt-bearer.ts             # JWT Bearer grant (server apps / scheduled runs)
├── actions/                      # one file per action (13)
├── health/
│   ├── service.ts                # declared absence — status page is real but not machine-readable
│   ├── api.ts                    # unsigned reachability against platform.ringcentral.com
│   └── quota.ts                  # declared absence — no readable rate-limit signal
├── assets/icon.png               # vendor mark, verbatim
└── tests/                        # entry module, every action, both auth methods, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly, matching this pack's `apify` app —
see `apify/README.md` for why: without it, `_tools/audit.ts` picks up `_tools/deno.json` instead of
this app's own config.
