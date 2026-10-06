# seven

Send SMS and text-to-speech voice calls, look up and validate phone numbers (format, HLR, MNP, CNAM,
RCS capability), read the logbooks and account usage, and manage contacts, groups and webhooks on
**seven** (seven.io, formerly sms77), over its HTTP gateway.

- **Categories** — communication, marketing
- **Auth methods** — api-key (`X-Api-Key: <key>`)
- **Actions** — 31
- **Health checks** — `service` (status.seven.io Atom feed), `api` (unsigned reachability), `quota`
  (prepaid balance) + the derived `auth:api-key`
- **Egress allowlist** — `gateway.seven.io`
- **API docs** — https://docs.seven.io/en/rest-api/first-steps (the docs publish no OpenAPI document)
- **Icon** — the vendor's own mark, https://www.seven.io/wp-content/uploads/icon-green-bold.png
  (168x168 PNG from seven.io's own `<link rel=icon>`, embedded verbatim as a base64 data URI in an SVG
  wrapper)

Everything here was verified on 2026-10-06 against docs.seven.io/en/rest-api/* and live probes of
`gateway.seven.io` and `status.seven.io`. The reference marks only `GET /api/status` (use the logbook
instead) and the legacy `GET /api/sms` deprecated; neither is called.

## Things most likely to go wrong

1. **Every response is HTTP 200, errors are in the body.** A junk key, no key, a missing scope and a
   wrong endpoint all answer `200`. A refused credential is the bare code `900` (`"900"` as JSON with
   `Accept: application/json`, plain `900` without). Other failures are a numeric `success` / `code`
   (`500` no credit, `202` bad number, `902` key lacks the endpoint's scope, `903` IP not allowed,
   `901` signing hash failed) or `success: false` with `error` / `error_message`. This app reads those
   and throws; it never judges from the status. The one non-error exception is SMS code `101`
   (sending to at least one recipient failed), which is returned: check each `messages[].success`.
2. **Without `Accept: application/json`, `GET /balance` is a bare float** as `text/plain`. The client
   always sends the header, so `balance-get` returns `{amount, currency}`.
3. **Send calls cost money and have a 180 second duplicate lock.** The same text to the same recipient
   inside 180 seconds is refused with code `402`. `sms-send` and `voice-call` are not idempotent.
4. **Delivery status is in the logbook, not a status endpoint.** `GET /api/status` is deprecated;
   read `journal-outbound` (`dlr`, `dlr_timestamp`) or subscribe a `dlr` webhook.
5. **Webhook `event_filter` only applies to `sms_mo`.** Setting it for any other event type prevents
   delivery, so `webhook-create` drops it unless the event is Inbound SMS.
6. **Credentials in responses are masked.** `webhook-list` replaces each webhook's custom `headers`
   (which can carry an `Authorization` value) with `has_headers`, and the number actions replace a
   Slack forwarding URL with `has_uri`.

## Actions

| Area        | Actions                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| SMS         | `sms-send`, `sms-delete`                                                                      |
| Voice       | `voice-call`, `voice-hangup`                                                                  |
| Lookup      | `lookup-format`, `lookup-hlr`, `lookup-mnp`, `lookup-cnam`, `lookup-rcs`                      |
| Account     | `balance-get`, `pricing-get`, `analytics-get`                                                 |
| Logbooks    | `journal-outbound`, `journal-inbound`, `journal-voice`                                        |
| Contacts    | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`           |
| Groups      | `group-list`, `group-get`, `group-create`, `group-update`, `group-delete`                     |
| Webhooks    | `webhook-list`, `webhook-create`, `webhook-delete`                                            |
| Numbers     | `number-available-list`, `number-active-list`, `number-active-get`                            |

Writes are sent form-encoded (every docs example uses `-d`); `sms-delete` is the one JSON body. Lookups
are billed per lookup.

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /api/balance` with the key in the
  `X-Api-Key` header. The answer is `{amount, currency}`, no key material. A numeric `amount` passes, a
  bare `900` fails, and `902` (no `balance` scope) counts as a recognised key.
- **service** — `https://status.seven.io/history.atom`, a real Atom feed (the Statuspage and Instatus
  JSON paths all 404). Each entry opens with `Status:`, `Impact:` and `Affected:` lines; an entry is
  open when its status is not `resolved` and its impact is not `none`, and counts only if it names a
  component this app reaches (HTTP Api, SMS/RCS Delivery, Inbound SMS, Voice, HLR, MNP, CNAM, Format).
  An open incident is `degraded`, never `down`.
- **api** — unsigned `GET /api/balance`. The bare `900` proves the gateway and its auth layer are
  serving, so it passes; a 5xx is `down`; an HTML body is `unknown`.
- **quota** — the prepaid balance from a signed `GET /api/balance`, informational. An empty balance is
  `down` (the next send would be refused with code 500). seven documents no rate-limit header or usage
  endpoint, so request-rate headroom is not declared.

## Not covered

Documented but left out, not guessed:

- RCS and WhatsApp sending (the RCS content object is large; `lookup-rcs` is covered).
- SMS file attachments (`files[n][name]` / `files[n][contents]`).
- Subaccount management (`/subaccounts`, `X-Account-Id`), booking (`POST /numbers/order`) and updating
  (`PATCH /numbers/active/:number`) phone numbers, and sender-ID validation (`/validate_for_voice`, which
  places a phone call to the number).
- Contact `groups` membership on create/update: the vendor's array replaces the whole list, and its
  form encoding is not documented.
- Request signing, OAuth2 bearer tokens, the CSV form of pricing, the deprecated `GET /status`, and the
  legacy GET-based SMS send.
