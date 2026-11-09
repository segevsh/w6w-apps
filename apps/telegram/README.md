# Telegram

Send messages, media and chat actions through a Telegram bot, and manage chats.

- **Categories** — communication
- **Auth methods** — bot-token
- **Actions** — 21
- **Triggers** — 2 (webhook)
- **Egress allowlist** — `api.telegram.org`
- **Website** — https://telegram.org
- **API docs** — https://core.telegram.org/bots/api

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `new-message` — New Message | webhook (API-registered, `setWebhook`) | `message` update | chat id, sender id, text, message id, the raw update |
| `update` — Bot Update | webhook (API-registered, `setWebhook`) | any update, optionally narrowed by type | update type, chat/sender ids, text or button data, the raw update |

**Setup.** Nothing to do by hand: subscribing calls `setWebhook` with the trigger's callback URL and a random `secret_token`, and unsubscribing calls `deleteWebhook`.

**One webhook per bot.** Telegram allows a single webhook per bot (and `getUpdates` stops working while a webhook is set). Subscribing first calls `getWebhookInfo` and **refuses** if the bot already has a webhook pointed anywhere else, rather than replace it; so two subscriptions on the same bot cannot coexist. Unsubscribing deletes the webhook only while it still points at this subscription's URL.

**Update types.** With no types chosen, `setWebhook` is sent `allowed_updates: []`, which is Telegram's default set: every update type except `chat_member`, `message_reaction` and `message_reaction_count`. The setting is bot-level, so it is always sent rather than inherited from a previous subscription.

**Trust model.** Telegram echoes the `secret_token` in the `X-Telegram-Bot-Api-Secret-Token` header of every delivery. The trigger keeps the token in subscription state and compares the header to it in constant time; a missing, empty or wrong header, or a subscription with no stored token, refuses the delivery. The token travels in a header, not the body, so the check does not cover the body itself.

Sources (verified 2026-11-09): https://core.telegram.org/bots/api#setwebhook , https://core.telegram.org/bots/api#getwebhookinfo , https://core.telegram.org/bots/api#deletewebhook

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — none published.

Telegram runs no status service for the Bot API — no status page, JSON endpoint or feed.
Outages are announced on the @telegram channel. `getMe` is therefore the only liveness
signal available.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /bot{token}/getMe
```

Returns the bot's own identity. It is the only unconditional Bot API call — every other
method needs a chat the bot can reach. An invalid token answers 401 with a JSON body, so
the failure is unambiguous.

### Do we have quota left?

No headroom endpoint. Telegram allows roughly 30 messages/second overall and 20 per
minute to one group; a 429 carries `parameters.retry_after` **in the body**, not in a
header.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:bot-token` | credential | connection | signed | fatal | — | derived from the `bot-token` auth method's `test` hook |

**`service` is declared absent.** Telegram runs no status service for the Bot API at all — no status page, JSON endpoint or feed; outages are announced on the @telegram channel. The derived `auth:*` check (`getMe`) is the only liveness signal that exists.

**`quota` is declared absent.** Telegram publishes no headroom endpoint or headers. The documented allowance is roughly 30 messages/second overall and 20 per minute to one group; a 429 carries `parameters.retry_after` in the body rather than a header.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
