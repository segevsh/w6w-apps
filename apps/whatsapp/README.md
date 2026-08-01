# WhatsApp

Send and manage messages, templates and the business profile through the WhatsApp Business
Cloud API — Meta's Graph-API-hosted platform (not the deprecated on-prem Business API).

- **Categories** — communication
- **Auth methods** — access-token
- **Actions** — 9
- **Egress allowlist** — `graph.facebook.com`

## Setup

1. In [Meta Business Settings](https://business.facebook.com/settings), create (or reuse) a
   **System User** and generate a **permanent** access token with the
   `whatsapp_business_messaging` permission — add `whatsapp_business_management` too if you'll
   use the template-listing action. Do **not** use the 24-hour temporary token the Graph API
   Explorer hands out by default; it expires mid-workflow.
2. Under **WhatsApp Accounts → Phone numbers**, copy the numeric **Phone Number ID** of the
   sending number (not the phone number itself).
3. If you'll list message templates, also copy the **WhatsApp Business Account ID** from
   **WhatsApp Accounts**.
4. Connect the app with the access token, phone number ID, and (optional) WABA ID.

## The 24-hour customer service window

This is WhatsApp's central messaging constraint, and it is not optional or app-side — it's
enforced by Meta on every send:

- **Freeform messages** (`message-send-text`, `message-send-image`, `message-send-document`,
  `message-send-video`) are only deliverable while a **customer service window** is open — the
  24 hours after the user last sent this business a message. Send one outside that window and
  the Cloud API rejects it.
- **Template messages** (`message-send-template`) are the only message type deliverable
  **outside** that window. A template must already be submitted and approved in Meta's Template
  Manager (or via the Business Management API, not exposed by this app) before it can be sent —
  `template-get-many` lists what's approved and what isn't.

In practice: use `message-send-template` to reach a user cold or to re-open a stale
conversation, and freeform sends for replies inside an active session.

## Media messages

`message-send-image`, `message-send-document` and `message-send-video` send media **by public
URL only** — Meta fetches the URL itself. The Cloud API also supports referencing a
previously-uploaded media `id` or a raw multipart upload, but both require moving bytes through
this app (a multipart body for the former, a POST to `/{phone-number-id}/media` for the latter),
which the sandboxed `ctx.fetch` deliberately does not do — the same limitation this pack's
Telegram app documents for its own media actions.

## Actions

| Key | Type | What it does |
|---|---|---|
| `message-send-text` | perform | Send a freeform text message (customer-service-window only) |
| `message-send-template` | perform | Send an approved template message (works anytime) |
| `message-send-image` | perform | Send an image by public URL |
| `message-send-document` | perform | Send a document by public URL |
| `message-send-video` | perform | Send a video by public URL |
| `message-mark-read` | perform | Mark an inbound message as read |
| `template-get-many` | read | List message templates on the WhatsApp Business Account |
| `business-profile-get` | read | Read this number's WhatsApp Business profile |
| `business-profile-update` | perform | Update this number's WhatsApp Business profile |

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://metastatus.com/whatsapp-business-api>, with a real machine-readable
feed:

```
https://metastatus.com/outage-events-feed-whatsapp-business-api.rss
```

Verified 2026-07-31 by fetching it directly: valid RSS 2.0 with a self-referencing `atom:link`,
titled "WhatsApp Business Platform Status". At verification time it carried zero `<item>`s, and
every sibling Meta-product feed (Ads Manager, Instagram, Messenger, …) was *also* empty
simultaneously — together with the URL's own `outage-events-feed-*` naming, that points at a
feed scoped to **currently open** outage events rather than a running log of every status change
the way Mistral's or Slack's status feeds are (see `rfcs/healthcheck.md`'s "feed is a log of
updates, not a statement of current state" warning — the concern that motivates `latest` doesn't
disappear just because Meta's shape is different). Meta gives no machine-readable
resolved/investigating vocabulary the way Mistral prefixes updates with `Status: Resolved`, so
an entry's mere presence is read as "Meta itself is reporting something about this product right
now" (`degraded`) rather than parsed for severity.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The `access-token` auth method probes:

```
GET /{phone-number-id}?fields=verified_name
```

The cheapest authenticated call the Cloud API offers: no side effect, no customer-service-window
constraint, and no scope beyond what every token here already needs.

### Do we have quota left?

No usable signal. Researched 2026-07-31:

- The `/{phone-number-id}/messages` endpoint carries no `ratelimit-*` (or equivalent) response
  headers the way Zendesk or GitHub expose headroom.
- The nearest field, `whatsapp_business_manager_messaging_limit` on `GET /{phone-number-id}`,
  reports a daily-conversation **tier ceiling** (`TIER_1K` / `TIER_10K` / `TIER_100K` /
  `TIER_UNLIMITED`) alongside `quality_rating` — a ceiling, not a live remaining-count, so it
  doesn't fit a `limit`/`remaining`/`resetAt` quota report.
- Per-second throughput (80 messages/sec by default per number, raisable) is documented but not
  queryable through any endpoint or header.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `health/service.ts` (metastatus.com feed) |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |

**`quota` is declared absent.** The messages endpoint carries no rate-limit response headers. The nearest field, `whatsapp_business_manager_messaging_limit`, reports a daily-conversation tier ceiling (TIER_1K/10K/100K/UNLIMITED) plus quality_rating — not a live remaining-headroom count, so it doesn't fit a limit/remaining/resetAt quota report. Per-second throughput (80 msg/s default) is documented but not queryable at all.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-31 against Meta's own Cloud API reference
(developers.facebook.com/documentation/business-messaging/whatsapp) and n8n's `WhatsApp` node.
Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
