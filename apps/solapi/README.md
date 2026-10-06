# SOLAPI

Send Korean SMS, LMS, MMS and Kakao AlimTalk through [SOLAPI](https://solapi.com) (솔라피) from a
workflow: send one message or a batch, assemble large batches as groups and schedule or cancel
them, and read delivery status, balance, sender numbers, statistics, stored files and the Kakao
channels and templates linked to the account.

- **Base URL** `https://api.solapi.com` (the only host in `network.allow`). SOLAPI also serves
  the same API from `api-static.solapi.com` on two fixed IPs for firewalled environments; this
  app does not use it.
- **Auth** an API key plus API secret, signed per request into an HMAC-SHA256 `Authorization`
  header by the Auth `sign` hook only (see below).
- **Source of truth** the SOLAPI developer reference at `solapi.com/developers/api/*`, fetched
  2026-10-06, plus the official Node SDK's `authenticator.ts` for the signature. SOLAPI
  publishes no OpenAPI document and no machine-readable reference; the pages are
  server-rendered HTML (the docs host `developers.solapi.com` redirects to
  `solapi.com/developers`). No page is marked deprecated.
- **Brand mark** `assets/icon.svg` is SOLAPI's own logo, fetched verbatim from
  `https://solapi.com/img/logo.svg` (mark plus wordmark, 116x30). Never pass it through bare
  `deno fmt`; use `deno task fmt`.

## Actions (22)

| Area | Actions |
|---|---|
| Send | `send-message`, `send-messages`, `send-alimtalk` |
| Delivery status | `list-messages`, `list-groups`, `get-group`, `list-group-messages` |
| Group flow | `create-group`, `add-group-messages`, `send-group`, `schedule-group`, `cancel-group-schedule`, `delete-group` |
| Account | `get-balance`, `get-statistics`, `list-sender-numbers`, `list-active-sender-numbers`, `list-files` |
| Kakao | `list-kakao-channels`, `get-kakao-channel`, `list-kakao-templates`, `get-kakao-template` |

Typical flows: **one-off** `list-active-sender-numbers` (pick a From) then `send-message`;
**bulk** `create-group`, `add-group-messages` (repeat, 10,000 per call), then `send-group` or
`schedule-group`, then poll `get-group`.

## Authentication

Every request carries

```
Authorization: HMAC-SHA256 apiKey=<key>, date=<ISO 8601>, salt=<random>, signature=<hex>
```

where `signature = hex(HMAC-SHA256(key = apiSecret, message = date + salt))`. The secret never
travels. The signature covers neither URL nor body. The app generates a UTC `date` with whole
seconds and a 32-character alphanumeric salt per request (the SDK's own recipe). Only `sign`
and the connection `test` hold the secret; `test` builds the same header by hand because `sign`
is applied to action traffic only. A unit test pins the header against an HMAC computed
independently with Python's `hmac`.

The connection test calls `GET /cash/v1/balance` and passes only on a 2xx with a numeric
`balance`. It never uses a probe that echoes a credential.

## Behaviour worth knowing

- **A 200 send can have sent nothing.** Messages SOLAPI refuses to register (unregistered
  sender, invalid number, ...) come back inside `failedMessageList` on an HTTP 200. The send
  actions return `failedCount` and the list; check it.
- **Sending is not idempotent.** SOLAPI documents no idempotency key, so a retried send sends
  twice. Every send, group-add and schedule action is declared `idempotent: false`.
- **Sender numbers must be pre-registered** (`list-sender-numbers`); an unregistered `from`
  fails, and for AlimTalk it silently breaks the SMS fallback.
- **Lists are keyed objects, not arrays.** `messageList` and `groupList` are objects keyed by id;
  the actions flatten them to `items` and expose the `nextKey` cursor (null on the last page).
- **Errors have no envelope.** A failure is `{errorCode, errorMessage}` (the 429 spells the
  second key `message`); the app throws `SOLAPI <status>: <errorCode>: <errorMessage>`.
- **Rate limits are per 5-second window**: 20 reads or 100 sends per window when authenticated,
  5 requests when not, returned in `x-ratelimit-*` headers. A 429 body is
  `{errorCode: "TooManyRequests", message}`.
- **Data retention**: message history is kept 12 months (6 months for messages created before
  2026-08-20).

## Health checks

| Check | What it does |
|---|---|
| `service` | Declared absent, informational. `status.solapi.com` is a client-rendered app with no feed or JSON endpoint; every conventional status path 404s (verified 2026-10-06). |
| `api` | Unsigned `GET /cash/v1/balance`. A JSON `{errorCode, errorMessage}` 401 proves the API and its auth layer answer, so it is a pass; HTML or a 5xx is down. |
| `quota` | Signed `GET /cash/v1/balance`: balance and points in KRW as two quota entries. Zero of both is `degraded`, never `down`, since post-paid accounts can still send. No `limit` is reported because SOLAPI has no balance ceiling. |
| `auth:api-key` | Derived from the Auth `test` hook. |

Credential classification is from the body: measured 2026-10-06, no header answers 401
`Unauthorized`, a well-formed header with an unknown key answers **400** `InvalidApiKey`, a
malformed key **400** `ValidationError` ("apiKey length must be 16 characters long") and a
Bearer token **400** `InvalidToken`. Both 400 and 401 are therefore treated as a rejected
credential.

## Not covered

SOLAPI's wider surface is left out rather than guessed: RCS, Naver and voice-specific option
shapes beyond passing a message object through `send-messages`, Kakao Brand Message authoring,
channel and template creation, sender-number registration and verification, payments and
auto-recharge writes, block lists, sub-accounts, the CRM API (`/crm-core/v1`) and the app-store
and OAuth2 flow. The fast-intake variants (`/send-many/fast`, `/groups/fast`) are not wrapped.
The channel-list reference names its next-page cursor `startKey` on the response (every other
list says `nextKey`), so `list-kakao-channels` reports `nextKey: null`; filter or raise the page
size to reach further channels, and confirm paging on an account with many.
