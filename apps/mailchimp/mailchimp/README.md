# Mailchimp

- **Triggers** — 10 (7 webhook, 3 poll)

## Triggers

| Key | Title | Mechanism | Mailchimp event or wrapped list action | What the run gets |
| --- | --- | --- | --- | --- |
| `member-subscribed` | Member Subscribed | Webhook (registered by the app) | `subscribe` | The member (ID, email, merge fields) |
| `member-unsubscribed` | Member Unsubscribed | Webhook (registered by the app) | `unsubscribe` | The member, the action and the reason |
| `member-updated` | Member Profile Updated | Webhook (registered by the app) | `profile` | The member's updated profile |
| `member-cleaned` | Member Cleaned | Webhook (registered by the app) | `cleaned` | The audience ID and the event data for the cleaned address |
| `email-changed` | Member Email Changed | Webhook (registered by the app) | `upemail` | The audience ID and the event data for the change |
| `campaign-status` | Campaign Sent | Webhook (registered by the app) | `campaign` | The audience ID and the event data for the campaign |
| `any-event` | Any Event | Webhook (registered by the app) | the `events` you list (empty = the six audience events; the SMS betas `sms_subscribe`, `sms_unsubscribe`, `upsms`, `sms_campaign` by name) | The event and its data |
| `new-member` | New Audience Member | Poll | `list-members` ordered by `last_changed DESC` | The new audience member |
| `new-campaign` | New Campaign | Poll | `list-campaigns` sorted `create_time DESC` | The new campaign |
| `new-group-interest` | New Group Interest | Poll (snapshot) | `list-group-interests` (one group, up to 5000 interests) | The new interest |

**Webhook setup.** Nothing to paste: choosing an audience makes the app create a webhook on it (`POST /lists/{list_id}/webhooks`, sources `user` and `admin`; tick *Include API changes* to add `api`) and remove it again when the trigger is deleted. The webhook's `signing_secret`, which Mailchimp returns only once, is kept with the subscription.

**Trust model.** Every delivery must carry `X-Mailchimp-Signature: t=<unix seconds>,v1=<hex>`, where `v1` is the HMAC-SHA256 of `<t>.<raw body>` keyed by that signing secret. The check runs over the raw body bytes before the form body is parsed, rejects a timestamp more than 5 minutes from now, and refuses a missing secret, header or body, a malformed header or any mismatch. Only `subscribe` and `unsubscribe` payloads are shown in Mailchimp's guide; for the other events the run gets Mailchimp's fields unchanged in `data`.

**Not covered.** Nothing: every list action is behind a trigger.

Vendor documentation (verified 2026-11-10): [Webhooks guide](https://mailchimp.com/developer/marketing/guides/sync-audience-data-webhooks/), [Add webhook](https://mailchimp.com/developer/marketing/api/list-webhooks/add-webhook/), [List members](https://mailchimp.com/developer/marketing/api/list-members/list-members-info/), [List campaigns](https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns/), [List interests in category](https://mailchimp.com/developer/marketing/api/interests/list-interests-in-category/).

Manage Mailchimp audiences: create/update members, tag them, and send campaigns.

- **Categories** — marketing, communication
- **Auth methods** — api-key, oauth2
- **Actions** — 14
- **Egress allowlist** — `*.api.mailchimp.com`, `login.mailchimp.com`
- **Website** — https://mailchimp.com
- **API docs** — https://mailchimp.com/developer/marketing/api/root/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.mailchimp.com>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /3.0/ping
```

Mailchimp is one of the few vendors here with a **dedicated health-check endpoint**. It
returns `{"health_status":"Everything's Chimpy!"}`, touches no list data and needs no
scope beyond a valid key.

### Do we have quota left?

No headroom endpoint or headers. Mailchimp caps concurrency at 10 simultaneous
connections per key rather than metering a request rate.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.mailchimp.com is a human page with no JSON API or feed. `GET /3.0/ping` — which the auth `test` hook already calls — is the automatable signal.

**`quota` is declared absent.** Mailchimp meters concurrency rather than request rate: 10 simultaneous connections per key, enforced by rejection. There is no counter, endpoint or header to read.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
