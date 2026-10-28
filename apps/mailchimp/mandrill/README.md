# Mandrill

Send transactional email and manage templates, tags, rejects, and whitelist entries via
Mandrill (Mailchimp Transactional).

- **Categories** — email, marketing
- **Auth methods** — api-key
- **Actions** — 17
- **Egress allowlist** — `mandrillapp.com`
- **Website** — https://mailchimp.com/features/transactional-email-infrastructure/
- **API docs** — https://mailchimp.com/developer/transactional/api/

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
