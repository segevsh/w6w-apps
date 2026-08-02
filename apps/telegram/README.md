# Telegram

Send messages, media and chat actions through a Telegram bot, and manage chats.

- **Categories** — communication
- **Auth methods** — bot-token
- **Actions** — 21
- **Egress allowlist** — `api.telegram.org`
- **Website** — https://telegram.org
- **API docs** — https://core.telegram.org/bots/api

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
