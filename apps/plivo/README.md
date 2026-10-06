# Plivo

Send SMS/MMS, place and manage voice calls, search and manage phone numbers, and read account
details via Plivo.

- **Categories** — communication
- **Auth methods** — basic (Auth ID + Auth Token)
- **Actions** — 21
- **Egress allowlist** — `api.plivo.com`
- **Website** — https://www.plivo.com
- **API docs** — https://www.plivo.com/docs (every page has a `.md` twin, e.g.
  `https://www.plivo.com/docs/messaging/api/messages.md`; index at `/docs/llms.txt`)

## Auth

HTTP Basic, Auth ID as the username and Auth Token as the password. Every endpoint lives under
`https://api.plivo.com/v1/Account/{auth_id}/…`, so the Auth ID is both the username **and** part of
the path. The connection therefore asks for it as a plain (non-secret) field; `afterConnect`
publishes it as `ctx.connection.display.authId` and the actions build their URLs from that. The
token only ever reaches the `sign` hook.

Subaccounts authenticate with their own Auth ID / Token. Buying a number needs main-account
credentials (see below).

## Actions

| Area         | Actions                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Messages     | `send-message`, `get-message`, `list-messages`, `list-message-media`                                |
| Calls        | `make-call`, `get-call`, `list-calls`, `list-live-calls`, `hangup-call`, `cancel-call-request`      |
| Recordings   | `list-recordings`, `get-recording` (metadata only)                                                  |
| Numbers      | `search-phone-numbers`, `buy-phone-number`, `list-numbers`, `get-number`, `update-number`           |
| Account      | `get-account`                                                                                       |
| Applications | `list-applications`, `get-application`, `create-application`                                        |

Lists return Plivo's `{ api_id, meta, objects }` envelope unchanged; page with `limit` (max 20) and
`offset`, and read `meta.next` / `meta.total_count`.

### Things that behave differently from what you would guess

- **Trailing slashes are part of the URL.** `/Message/`, `/Call/{uuid}/`, `/Number/{n}/`. The client
  always sends them.
- **`make-call` cannot return a `call_uuid`.** Plivo answers `call fired` with a `request_uuid`; the
  `call_uuid` exists only once the call is answered and arrives in your `answer_url`/`ring_url`
  callbacks. Use `cancel-call-request` with the request UUID to stop a call that has not connected.
- **Hanging up with no UUID hangs up every call on the account** (documented by Plivo). `hangup-call`
  therefore refuses a blank UUID client-side. `cancel-call-request` is guarded the same way.
- **`search-phone-numbers` (`/PhoneNumber/`) and `list-numbers` (`/Number/`) are different
  resources**: the first is Plivo's rentable inventory, the second is what you already own.
- **`buy-phone-number` bills you** (setup + monthly) and answers 404 with subaccount credentials,
  even for a number a search just returned. A number that needs verification documents stays
  `pending`.
- **Delivery state is not in the send response.** `send-message` returns `message_uuid`s with
  `message(s) queued`; poll `get-message` (`message_state`, `error_code`) or set a callback URL.
- **Call history is short.** `list-calls` covers 90 days, defaults to the last 7 unless an end-time
  filter is set, and one search spans at most 30 days.
- **Recording URLs are on another host.** `list-recordings`/`get-recording` return metadata; the
  `recording_url` host is not allowlisted here, so fetch the audio elsewhere.

### Not covered

Deliberately left out of this version (documented by Plivo, but not built here): updating and
deleting applications, transferring/recording/playing/speaking into a live call, DTMF, call
conversion, multiparty calls, conferences, audio streams, deleting recordings, transcription,
unrenting numbers, subaccounts, SIP authentication, Powerpack and Number Pool management, 10DLC
brand/campaign and toll-free verification APIs, WhatsApp templates/interactive/location payloads
(`send-message` can send a plain `whatsapp`-typed text or media message only), CNAM lookup, Caller
Reputation, number porting and compliance, Number Masking, Verify and PHLO. The India DLT fields on
the send call are deprecated by Plivo and not exposed. Plivo's docs index lists **no** standalone
number-lookup API (`/docs/lookup/…` is a 404), so none is offered.

## Health check

### Is the vendor up?

**Service status** — <https://status.plivo.com> (`health/service.ts`)

```
GET https://status.plivo.com/api/v2/summary.json
```

Atlassian Statuspage. Verified on 2026-10-06: `page.name` is `Plivo` (id `kwh95bwgs0qz`),
`status.indicator` is present (so the Statuspage schema is right, not Instatus or Better Stack),
the host answers 200 directly with no redirect, and the page has components for the surface this
app calls: *REST APIs and XML*, *Messaging API*, *Voice API*, *SMS API*, *MMS API*, *Account & Phone
Number APIs* and *CDR (Call Detail Records)*. Declared `kind: "service"`, unsigned, with the status
host on the hook's own allowlist only (it is not in `network.allow`). A failing or unrecognised
status page reports `unknown`, never `down`. The rollup `indicator` covers the whole page (it also
includes Console, PHLO and others), so the per-component map is the more precise signal.

### Is this credential live?

The Auth `test` hook (derived into the health surface as `auth:basic`) reads
`GET /v1/Account/{auth_id}/`.

- **It does not echo the credential.** The documented Account object is `account_type`, `address`,
  `auth_id`, `auto_recharge`, `billing_mode`, `cash_credits`, `city`, `name`, `state`, `timezone`
  and `resource_uri` — no token, so it is safe as a probe (unlike Mailjet's `/apikey` or Follow Up
  Boss's `/me`). It needs no product scope either.
- **The verdict is read from the body, not the status code.** Plivo answers a bad credential and a
  missing one with the *same* plain-text 401 (`Could not verify your access level for that URL.`,
  not JSON, checked live on 2026-10-06 against both Account and Message with bad and no credentials),
  so the status alone cannot say which. `test` passes only on a JSON document whose `auth_id` equals
  the one asked about; a 200 with any other body (proxy page, captive portal, another account)
  fails.

### Quota headroom

`health/quota.ts` is a declared absence (`severity: "informational"`): CPS, concurrency and API rate
limits are documented as prose only, with no endpoint or rate-limit header that reports headroom.
The one readable number is the prepaid credit balance, `cash_credits` from `get-account`; it has no
account-defined ceiling, so it is not reported as quota.

## Tests

`deno task test` — unit tests with a mocked `HookContext` for the entry module, auth, client, health
checks and every action (request URL, method, JSON body / query names, error propagation, blank-id
guards). `deno task validate` runs the pack audit.

## Verification notes

All endpoints, parameter names and response shapes were taken from Plivo's own reference pages
(the `.md` renderings listed above), fetched 2026-10-06. Only the live, non-deprecated surface was
built: a grep of those pages for deprecated/sunset language found only the India DLT message fields
and the legacy Caller Reputation callback fields, neither of which is exposed.
