# Twilio

Send SMS/MMS/WhatsApp messages and make phone calls via Twilio.

- **Categories** — communication
- **Auth methods** — api-key
- **Actions** — 2
- **Triggers** — 5 (webhook)
- **Egress allowlist** — `api.twilio.com`
- **Website** — https://www.twilio.com
- **API docs** — https://www.twilio.com/docs/usage/api

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `incoming-message` — Incoming Message | webhook (manual) | an SMS/MMS sent to your Twilio number | message SID, from, to, text, media URLs, all parameters |
| `message-status` — Message Status Update | webhook (manual) | a delivery status callback for a message you sent | message SID, status, error code, all parameters |
| `call-status` — Call Status Update | webhook (manual) | a status callback for a call (`initiated`, `ringing`, `in-progress`, `completed`, `busy`, `failed`, `no-answer`, `canceled`) | call SID, status, direction, duration, all parameters |
| `call-summary-complete` — Call Summary Complete | webhook (manual, Event Streams) | `com.twilio.voice.insights.call-summary.complete` | the event and its Voice Insights summary data |
| `any-event` — Any Event | webhook (manual, Event Streams) | any Event Streams type your sink delivers, filtered by the `events` param (empty = all) | the event and its data |

**Setup (manual webhook).** Twilio webhooks are set per phone number, messaging service or message, not through an API this app calls.

1. Create the trigger and copy its callback URL. Use **exactly** that URL: Twilio's signature covers the full URL.
2. Paste it into the number's (or messaging service's) **A message comes in** webhook, method `POST`; for status updates, use it as the `StatusCallback` URL.
3. Paste your **Auth Token** (Twilio Console, Account info) into the trigger's `authToken` param.

**Setup (Event Streams: `call-summary-complete`, `any-event`).** Create a webhook sink pointing at the trigger's callback URL and subscribe it to the event types you want (Twilio Console, or the CLI: `twilio api:events:v1:sinks:create --description <text> --sink-configuration '{"destination":"<callback URL>","method":"POST"}' --sink-type webhook`, then create a subscription for the sink). Twilio delivers a JSON array of CloudEvents; each one becomes a run. Paste your **Auth Token** into the trigger's `authToken` param. This app does not create the sink itself: that needs `events.twilio.com`, a host outside this app's egress allowlist.

**Not covered.** Incoming voice calls are not a trigger: Twilio requires TwiML as the reply to the Voice webhook and the host can only answer with JSON or plain text. This app has no list or search actions, so there is nothing to poll.

**Trust model.** `X-Twilio-Signature` must equal the base64 HMAC-SHA1, keyed by the Auth Token, of the callback URL followed by every POST parameter as name + value sorted by name. A missing or empty Auth Token, a missing signature or a mismatch refuses the delivery. Form-encoded webhooks (SMS, MMS, status callbacks) are verified this way. An Event Streams delivery has a JSON body, which Twilio signs as the callback URL with `?bodySHA256=<SHA-256 hex of the raw body>` appended and no form parameters; the body is verified over its raw bytes before it is parsed. Twilio expects TwiML as the reply to an incoming message; the host replies with a JSON acknowledgement, not TwiML, so Twilio may log a warning per inbound message (not verified); answer through the Send SMS action.

Sources (verified 2026-11-10): https://www.twilio.com/docs/usage/webhooks/webhooks-security , https://www.twilio.com/docs/messaging/guides/webhook-request , https://www.twilio.com/docs/voice/api/call-resource#statuscallback , https://www.twilio.com/docs/events/webhook-quickstart

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.twilio.com>

```
GET https://status.twilio.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /2010-04-01/Accounts/{accountSid}.json
```

The account record. Confirms both that the credentials are live and that the SID they
are paired with actually exists.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Twilio queues rather than rejecting for messaging, and applies
concurrency limits per resource.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.twilio.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Twilio publishes no headroom endpoint or rate-limit headers. Messaging queues rather than rejecting, and other resources apply concurrency limits, so there is no counter to read.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
