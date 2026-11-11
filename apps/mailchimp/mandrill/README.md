# Mandrill

Send transactional email and manage templates, tags, rejects, and whitelist entries via
Mandrill (Mailchimp Transactional).

- **Categories** — email, marketing
- **Auth methods** — api-key
- **Actions** — 17
- **Triggers** — 13 (12 webhook, 1 poll)
- **Egress allowlist** — `mandrillapp.com`
- **Website** — https://mailchimp.com/features/transactional-email-infrastructure/
- **API docs** — https://mailchimp.com/developer/transactional/api/

## Triggers

12 webhook triggers (API-registered, HMAC-signed) and 1 poll.

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `email-event` — Email Event | webhook (API-registered, signed) | `send`, `deferral`, `delivered`, `hard_bounce`, `soft_bounce`, `open`, `click`, `spam`, `unsub`, `reject` (default: send, hard_bounce, soft_bounce, open, click, reject) | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, bounce reason, metadata, full event data |
| `email-sent` — Email Sent | webhook (API-registered, signed) | `send` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-delivered` — Email Delivered | webhook (API-registered, signed) | `delivered` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-deferred` — Email Deferred | webhook (API-registered, signed) | `deferral` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-bounced` — Email Bounced | webhook (API-registered, signed) | `hard_bounce`, `soft_bounce` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-opened` — Email Opened | webhook (API-registered, signed) | `open` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-link-clicked` — Email Link Clicked | webhook (API-registered, signed) | `click` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-marked-spam` — Email Marked as Spam | webhook (API-registered, signed) | `spam` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-unsubscribed` — Email Unsubscribed | webhook (API-registered, signed) | `unsub` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `email-rejected` — Email Rejected | webhook (API-registered, signed) | `reject` | event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata, full event data |
| `reject-denylist-changed` — Reject Denylist Changed | webhook (API-registered, signed) | sync event `blacklist` (add, change, remove) | list, action, email, reason, full sync event |
| `reject-allowlist-changed` — Reject Allowlist Changed | webhook (API-registered, signed) | sync event `whitelist` (add, remove) | list, action, email, reason, full sync event |
| `new-template` — New Template | poll (5 min) | `list-templates` (`POST /templates/list.json`, whole list, no paging parameters) | the new template |

`email-event` is the Any-event trigger (its **Events** param picks any of the message events). The two
`reject-*-changed` triggers deliver exactly the entries `list-rejects` and `list-whitelist` return, so
those actions are covered by them. **Not covered:** `list-senders` and `list-tags` return sending
statistics per sender / tag (analytics output, no records of their own).

**Setup.** Optionally pick the `events` to fire on. Subscribing registers the callback URL with `POST webhooks/add` and keeps the webhook's id, its signing key (`auth_key`) and the URL with the subscription; unsubscribing removes it with `POST webhooks/delete` (a webhook Mandrill no longer has counts as deleted). No key has to be pasted. Mandrill batches events and posts about once a minute, up to 1,000 per request; the trigger emits one run per message event in the batch. The message-event triggers skip sync (allowlist/denylist) items and inbound mail; the `reject-*-changed` triggers take the sync items.

**Trust model.** Every delivery carries `X-Mandrill-Signature`: the base64 HMAC-SHA1, under the webhook's signing key, of the callback URL exactly as registered followed by each POST variable's name and value (the only one is `mandrill_events`). The trigger refuses a delivery whose key is unset, whose header is missing, or that does not match (constant-time compare), before it parses the batch. The signature binds the batch, so tampered data is refused. **Mandrill's scheme has no timestamp**, so an identical delivery replayed later is not detected; de-duplicate on the message id and event time downstream. While Mandrill registers a webhook it probes the URL with a HEAD and then a POST of an empty batch, before the subscription has a stored key; that one shape (an empty `mandrill_events` array, no stored key) is acknowledged and emits nothing, and nothing else is accepted without verification.

Docs (verified 2026-11-10): https://mailchimp.com/developer/transactional/api/templates/list/ (`new-template`), https://mailchimp.com/developer/transactional/api/webhooks/add/ (events include `blacklist`, `whitelist`), https://mailchimp.com/developer/transactional/docs/webhooks/, https://mailchimp.com/developer/transactional/guides/track-respond-activity-webhooks/ (Authenticating webhook requests) and https://mailchimp.com/developer/transactional/api/webhooks/add.md

## Auth

Mandrill's API is unusual among this pack's email integrations: every endpoint is
`POST <resource>/<method>.json` with the API key carried as a `key` field in the **JSON
request body** — never a header, never a query string. Verified against Mailchimp's own docs
(`mailchimp.com/developer/transactional/docs/fundamentals/`): "The API key parameter must be
included in the JSON body of your POST request." The auth `sign` hook (`auth/api-key.ts`)
parses the action's already-built JSON body, merges `key` into it, and re-serializes — see
that file for why a body-located credential needs this special handling (most Auth methods in
this pack only ever inject a header).

Mandrill also returns errors as HTTP **500**, not 4xx — a functional failure (invalid key, bad
template name, …) comes back with `{status: "error", code, name, message}` and a 500 status.
`lib/client.ts` treats any non-2xx as an error and surfaces the vendor `message`.

## Actions

| Group | Actions |
|---|---|
| Message | `send-message`, `send-template-message` |
| Account | `get-user-info`, `list-senders` |
| Tag | `list-tags`, `get-tag-info`, `delete-tag` |
| Reject (denylist) | `list-rejects`, `add-reject`, `delete-reject` |
| Whitelist | `list-whitelist`, `add-whitelist`, `delete-whitelist` |
| Template | `list-templates`, `add-template`, `update-template`, `delete-template` |

`send-message`'s `to` array carries **all** recipients — Mandrill distinguishes `cc`/`bcc` with
a `type` field on the same array rather than separate `cc`/`bcc` arrays, unlike most
transactional-email APIs. `lib/client.ts`'s `parseRecipients()` handles the tagging.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second is
something the app itself performs with a live probe.

### Is the vendor up?

**Service status** — <https://status.mailchimp.com>

Declared `unavailable`. Unlike most vendors in this pack, status.mailchimp.com is a
StatusCake-hosted HTML page, not an Atlassian Statuspage instance: `GET
https://status.mailchimp.com/api/v2/summary.json` returns a plain Apache 404 (there is no
`/api/v2/*` surface), and none of the usual RSS/Atom paths exist either (`/rss`,
`/history.rss`, `/feed` all 404 or redirect away). There is nothing machine-readable to poll —
verified directly, 2026-08-02.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

The single auth method probes:

```
POST /users/ping.json
{"key": "..."}
```

A dedicated, scope-free liveness ping — Mandrill's own recommended way to validate a key
without touching account data.

### Do we have quota left?

`POST /users/info.json` — read `hourly_quota` and `backlog` off the response. Per the official
API client's field-level documentation: `hourly_quota` is "the maximum number of emails
Mandrill will deliver for this user each hour," and `backlog` is "the number of emails that are
queued for delivery due to exceeding your monthly or hourly quotas." Mandrill exposes no
`X-RateLimit-*` response headers and no explicit "remaining" count — `backlog > 0` is the
vendor's own real signal that the account is currently over quota and queuing mail, so the
check reports on that rather than fabricate a headroom figure the API does not provide.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | declared `unavailable` — no machine-readable feed exists |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-02 against Mailchimp's own developer docs
(`mailchimp.com/developer/transactional/`) and the official generated API client
(`mandrill-api-python-3.7/mandrill.py`, the most complete field-level reference available for
this API). Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe
starts failing for everyone at once.
