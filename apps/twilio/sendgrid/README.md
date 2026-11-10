# SendGrid

## Triggers

| Key | Mechanism | Wrapped list action | The run gets |
|---|---|---|---|
| `new-contact` | poll (5 min) | `contact-get-all` | each newly created Marketing Campaigns contact |
| `new-or-updated-contact` | poll (5 min) | `contact-get-all` | each contact that is created or edited (event identity `id:updated_at`) |
| `new-list` | poll (5 min) | `list-get-all` | each newly created Marketing Campaigns list |

The contact triggers run the existing `contact-get-all` search with the SGQL query
`created_at >= TIMESTAMP '<cursor − 2 min>'` (or `updated_at >=`). `created_at` and `updated_at` are
documented contact fields and `TIMESTAMP '…'` is SGQL's documented time literal. Search results are
unordered, so the window is deduped by contact id; a window larger than one check's cap (1000) is
drained over successive checks with the cursor held back. The first check only records the start
time: contacts stamped before it are never emitted. `new-list` snapshot-diffs the list index
(`list-get-all`, additions only).

SendGrid also offers an Event Webhook (delivered, bounce, open, click, …) configured in the
dashboard; it is not wired here (webhook candidate recorded for a webhook node).

Sources: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/segmentation-query-language
(fields, `TIMESTAMP` literal), https://www.twilio.com/docs/sendgrid/api-reference/lists/get-all-lists
(verified 2026-11-09), https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook.

Consume SendGrid API

- **Categories** — email, communication
- **Auth methods** — sendgrid-api
- **Actions** — 10
- **Triggers** — 3 (poll)
- **Egress allowlist** — `api.sendgrid.com`
- **Website** — https://sendgrid.com
- **API docs** — https://docs.sendgrid.com/api-reference

## Health check

The app checks whether the *vendor* is up, whether *this credential* is live, and
whether rate-limit *quota* remains.

### Is the vendor up?

**Service status** — <https://sendgrid.statuspage.io>

```
GET https://sendgrid.statuspage.io/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

The Auth `test` hook validates the configured API key.

The single auth method probes:

```
GET https://api.sendgrid.com/v3/scopes
Authorization: Bearer <apiKey>
```

The endpoint returns the key's available permissions. The test supplies the bearer
header explicitly because credential test hooks receive an unsigned fetch. A successful
response passes the check; a non-success response fails it and reports the HTTP status.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Reset` response headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:sendgrid-api` | credential | connection | signed | fatal | — | derived from the `sendgrid-api` auth method's `test` hook |

The host `sendgrid.statuspage.io` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
