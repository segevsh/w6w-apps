# MessageBird

Send SMS and text-to-speech voice messages, run phone-number verification (OTP) flows, and look up
phone numbers, on MessageBird's classic REST API.

- **Categories** — communication
- **Auth methods** — access-key
- **Actions** — 7
- **Triggers** — 1 (webhook)
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:access-key`
- **Egress allowlist** — `rest.messagebird.com` (the `service` check adds `status.bird.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://bird.com (formerly messagebird.com)
- **API docs** — https://developers.messagebird.com/api/
- **Status page** — https://status.bird.com/ (formerly status.messagebird.com)

## Triggers

1 webhook trigger (manual setup, JWT-signed).

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `inbound-sms` — Inbound SMS | webhook (manual, signed) | a message received on a virtual mobile number (MO SMS callback) | message id, your number, the sender, the text, the creation time, full callback data |

**Setup (manual).** MessageBird has no API to register an inbound callback: it is set in **Flow Builder** with a **Forward to URL** step on the number's flow, or by MessageBird support. Subscribe the trigger in w6w, copy its callback URL, and use it exactly as given (the signature covers the URL). Choose **POST** as the method: GET callbacks, which MessageBird uses by default for some numbers and always for status reports, carry no body the host can hash and a query string it cannot reproduce byte for byte, so the trigger refuses them. Paste your **signing key** (the one MessageBird's Dashboard lets you regenerate; see "Verifying HTTP requests" in the docs) into `signingKey`. Delivery-status reports (`reportUrl`) are GET callbacks and are not covered; use the Get Message action to read a message's status.

**Trust model.** Every request MessageBird sends carries `MessageBird-Signature-JWT`, a JWT signed HS256 with the signing key. The trigger refuses a callback whose key is unset, whose header is missing, whose algorithm is not HS256, whose signature does not match (constant-time compare), whose `iss` is not `MessageBird`, whose `nbf`/`exp` window (5 seconds of leeway) does not contain now, whose `url_hash` is not the SHA-256 of the callback URL stored with the subscription, or whose `payload_hash` is not the SHA-256 of the exact received body, all before it parses the body. The signature binds the URL and the body, so tampered data is refused. The `jti` claim could detect replays inside the token's window, but a handler cannot write state, so an identical callback replayed before `exp` is not detected; de-duplicate on the message id. MessageBird's docs do not spell out how it canonicalises the URL; the hash follows MessageBird's PHP SDK (SHA-256 of the URL string), so if a callback is refused as "another URL", check that the URL configured in MessageBird is the callback URL w6w shows, character for character.

Docs (verified 2026-11-10): https://developers.messagebird.com/api/ (Verifying HTTP requests), https://developers.messagebird.com/api/sms-messaging/ (Receive and handle inbound SMS) and https://github.com/messagebird/php-rest-api/blob/master/src/MessageBird/RequestValidator.php

## MessageBird is now Bird — what that changes here

MessageBird rebranded to **Bird**. Verified 2026-09-01, live:

- **The API host does NOT move.** `https://developers.messagebird.com/api/` is still the current,
  documented reference, and its examples still hit `https://rest.messagebird.com` with
  `Authorization: AccessKey {accessKey}`. This app calls that host — not any newer `bird.com` API —
  because it is the one the reference above actually documents end to end.
- **The marketing site and icon moved.** `www.messagebird.com` now redirects to `bird.com`, and
  `www.messagebird.com/favicon.svg` 301s to `bird.com/favicon.svg` — the file used at
  [`assets/icon.svg`](assets/icon.svg) (1,430 bytes, black/white with a dark-mode media query). That
  redirect target, not the old messagebird.com mark, is the vendor's current live icon.
  `appearance.icon.alt` says "Bird (formerly MessageBird)" so the rename doesn't get lost in the UI.
- **The status page moved.** `status.messagebird.com` 301s to `status.bird.com` (Statuspage page name
  "Bird"). That page now covers Bird's *entire* platform — Dashboard, CRM, Payments, AI Hub, and
  per-region Connectivity components — not just this classic REST API, so the `service` health check
  below reads only the two components whose own description names this app's surface.
- **A separate, newer Bird API exists and is out of scope here.** The status page lists a
  `Messaging - API` component distinct from `SMS - API` (whose description is literally
  `https://rest.messagebird.com`) — that is Bird's newer unified messaging product. This app does not
  call it; everything here is the classic, still-documented REST API.

## Actions

| Key | Type | What it does |
|---|---|---|
| `send-sms` | perform | Send an SMS (plain, binary, or flash) to one or more recipients, with optional scheduling and a status-report callback. |
| `message-get` | read | Retrieve a sent/received SMS message and its per-recipient delivery status. |
| `message-list` | search | List messages, filtered by originator, recipient, direction, type, status, or a free-text search term. |
| `verify-request` | perform | Start an OTP flow: send a one-time code by SMS, flash SMS, voice call, or email. |
| `verify-check` | perform | Check the code a user typed back in. Can only be done once per token — MessageBird invalidates it either way. |
| `lookup-number` | read | Resolve a phone number's country, line type (mobile/landline/voip/…), and canonical formats, without sending anything. |
| `voice-message-send` | perform | Call one or more recipients and read a text-to-speech message aloud, with answering-machine handling and repeat count. |

Everything above was verified directly against `developers.messagebird.com/api/{sms-messaging,
verify, lookup, voice-messaging}/` on 2026-09-01 — request/response shapes, required vs. optional
parameters, and the documented error envelope (`{"errors":[{"code","description","parameter"}]}`).
**Not included, deliberately:** the Conversations API (WhatsApp/omnichannel — a separately
authorized, much larger surface), the Voice **Calling** API (call flows/TwiML-equivalent — a
different resource from the Voice *Messaging* API this app uses), Contacts/Groups, HLR, MMS, Numbers,
and Partner Accounts. None of these were skipped for lack of verification; they were left out to keep
this app to the messaging/verification/lookup slice actually asked for.

## Auth

**Access Key** (`type: apiKey`) — MessageBird's single credential, sent as
`Authorization: AccessKey {accessKey}` (not Bearer, not Basic). Test keys carry a `test_` prefix;
live keys have none.

`test` probes `GET /balance`, which returns the account's own prepaid/postpaid balance
(`{"payment","type","amount"}`) — never the caller's own key, so the probe can't leak the credential
it's validating. Per this pack's rule against classifying a credential from the HTTP status alone,
the hook reads the response **body**: a balance object means the key is live, and MessageBird's
documented `{"errors":[...]}` envelope means it isn't — its `description` is surfaced rather than a
bare status code.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something the
app itself performs directly (via `Auth.test`, above).

### Is the vendor up?

**Service status** — <https://status.bird.com>, Atlassian Statuspage, unauthenticated:

```
GET https://status.bird.com/api/v2/summary.json
```

Bird's status page is huge — it covers the whole Bird platform, not just this API — so `service`
reads only the two components whose own `description` field names this app's surface:

| Component | Description | Covers |
|---|---|---|
| `SMS - API` | `https://rest.messagebird.com` | send-sms, message-get, message-list, verify-request, verify-check, lookup-number |
| `Voice - API` | (none — matched by name) | voice-message-send |

`SMS - API V1` (`https://api.messagebird.com`, a **different** host this app never calls) and
`Messaging - API` (Bird's newer unified messaging product) are excluded on purpose — including a
degraded/major-outage state there does **not** move this check.

### Is this credential live?

The Auth `test` hook, above — `GET /balance`.

### Do we have quota left?

No headroom endpoint or rate-limit response headers. MessageBird documents fixed per-method request
ceilings (`GET` 50/s, `POST` 500/s, `PATCH`/`DELETE` 50/s) and answers `429 Too Many Requests` once
exceeded, but nothing to read ahead of that.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-key` | credential | connection | signed | fatal | — | derived from the `access-key` auth method's `test` hook |

The host `status.bird.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

**`quota` is declared absent.** MessageBird publishes fixed rate limits but no headroom endpoint or
response headers to read against them. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-09-01, including the MessageBird→Bird rebrand's effect on the
host, icon, and status page. Status surfaces move; re-check with `_tools/audit.ts` conventions in
mind if a probe starts failing for everyone at once.

