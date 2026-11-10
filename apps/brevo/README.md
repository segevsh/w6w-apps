# Brevo

- **Triggers** — 12 (10 webhook, 2 poll)

## Triggers

| Key | Title | Mechanism | Vendor event / wrapped list action | What the run gets |
| --- | --- | --- | --- | --- |
| `new-contact` | New Contact | Webhook | marketing `listAddition` | The vendor delivery: `event` (`list_addition`), `email`, `list_id` (array), `date`, `ts` |
| `contact-created` | Contact Created | Poll | `list-contacts` (`GET /contacts?sort=desc`, newest first) | Each newly created contact, any list |
| `new-sender` | New Sender | Poll | `list-senders` (`GET /senders`, small unpaged list, diffed) | Each newly added sender identity |
| `contact-updated` | Contact Updated | Webhook (API) | marketing `contactUpdated` | The contact event with the changed attributes in `content` |
| `contact-deleted` | Contact Deleted | Webhook (API) | marketing `contactDeleted` | The contact event (email, list ids) |
| `email-delivered` | Email Delivered | Webhook (API) | transactional `delivered` | The delivery event |
| `email-opened` | Email Opened | Webhook (API) | transactional `opened` | The open event |
| `email-clicked` | Email Clicked | Webhook (API) | transactional `click` | The click event with the link |
| `email-bounced` | Email Bounced | Webhook (API) | transactional `hardBounce` + `softBounce` | The bounce event (`event` says which) |
| `email-unsubscribed` | Email Unsubscribed | Webhook (API) | transactional `unsubscribed` | The unsubscribe event |
| `inbound-email` | Inbound Email | Webhook (API) | inbound `inboundEmailProcessed` | One event per parsed message; needs your **Inbound domain** |
| `any-event` | Any Event | Webhook (API) | the **Events** you list for the chosen **Webhook type** (empty = every event of that type): transactional `sent`/`request`/`delivered`/`hardBounce`/`softBounce`/`blocked`/`spam`/`invalid`/`deferred`/`click`/`opened`/`uniqueOpened`/`unsubscribed`; marketing `spam`/`opened`/`click`/`hardBounce`/`softBounce`/`unsubscribed`/`listAddition`/`delivered`/`contactUpdated`/`contactDeleted`; inbound `inboundEmailProcessed` | The vendor delivery |

Every webhook trigger registers itself with `POST /v3/webhooks` and removes itself on unsubscribe. Each
new webhook tells Brevo to send a caller-chosen bearer token (`auth: { type: "bearer", token }`, a random
secret kept in the subscription state); a delivery is accepted only when its `Authorization` header is
`Bearer <that token>` (constant-time compare, fail closed; the raw body must be present). Brevo
publishes no body signature, and the exact header Brevo sends for a bearer webhook is the docs' "token-based
header authentication" (partly UNVERIFIED: if Brevo sent another header the trigger would refuse every
delivery rather than accept an unverified one). `new-contact` (older) has no token: its callback URL is the secret.
Brevo's marketing contact events carry an internal `key` field; the new triggers drop it before the run.

Not covered: `list-attributes` is account field-definition data (reference data, no records).

Vendor documentation (verified 2026-11-10): [Create a webhook](https://developers.brevo.com/reference/create-webhook),
[Secure webhook calls](https://developers.brevo.com/docs/secured-webhooks),
[Transactional webhooks](https://developers.brevo.com/docs/transactional-webhooks),
[Marketing webhooks](https://developers.brevo.com/docs/marketing-webhooks),
[Inbound parsing webhooks](https://developers.brevo.com/docs/inbound-parse-webhooks),
[Get contacts](https://developers.brevo.com/reference/get-contacts),
[Get senders](https://developers.brevo.com/reference/get-senders).

Manage Brevo (formerly Sendinblue) contacts, senders, attributes, and send transactional
emails.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 15
- **Egress allowlist** — `api.brevo.com`
- **Website** — https://www.brevo.com
- **API docs** — https://developers.brevo.com

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.brevo.com>

```
GET https://status.brevo.com/api/v2/status.json
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
GET /v3/account
```

Account details — plan, credits and company. Read-only and available to any API key.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`x-sib-ratelimit-limit` / `-remaining` / `-reset` response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.brevo.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
