# Help Scout

Manage Help Scout conversations, customers and inboxes via the Mailbox API 2.0.

- **Categories** — support
- **Auth methods** — oauth2
- **Actions** — 13
- **Egress allowlist** — `api.helpscout.net`
- **Website** — https://www.helpscout.com
- **API docs** — https://developer.helpscout.com/mailbox-api/

## Links

Real URLs found during research for this app (verified live, 2026-08-02):

- **Vendor site** — <https://www.helpscout.com>
- **Official Mailbox API 2.0 docs** — <https://developer.helpscout.com/mailbox-api/> (the
  authoritative source every endpoint/param below was checked against)
- **Status page** — <https://status.helpscout.com> (a real Atlassian Statuspage instance —
  see [Health check](#health-check))
- **GitHub org** — <https://github.com/helpscout> — publishes official API client libraries,
  e.g. <https://github.com/helpscout/helpscout-api-php> (PHP wrapper for the Mailbox API) and
  <https://github.com/helpscout/app-template> (Help Scout's own "Custom App" starter, a
  different integration surface from the Mailbox API this app covers).

## Auth: OAuth2, Authorization Code (`oauth2`)

Help Scout's Mailbox API implements **two** OAuth2 grants — verified against
developer.helpscout.com/mailbox-api/overview/authentication/ — and its docs say plainly which
each is for:

> "The Authorization Code flow is typically used for integrations to be used by other Help
> Scout users. The Client Credentials flow is meant for internal integrations."

A w6w App is exactly the first case: one published integration, connected by many different
customers' own Help Scout accounts. That is the opposite of "internal integration" (a
company's own scripts talking to its own single account), which is what Client Credentials is
for and what PayPal's `client-credentials` auth method in this pack uses — PayPal has no
per-user OAuth flow to choose between; Help Scout does, and the two flows aren't
interchangeable defaults, they're documented for different audiences.

It's also the cheaper implementation: w6w's `type: "oauth2"` gets the runtime's built-in
authorization-code exchange and refresh for free — no `exchange`/`refresh` hooks in
`auth/oauth2.ts`, the same shape as this pack's Zendesk and Asana oauth2 methods. Client
Credentials would need PayPal's hand-rolled `mintToken` + manual `refresh` hook
(`type: "custom"`) for no behavioral gain here: Help Scout's client-credentials tokens still
expire every 2 days and still have to be minted per application, just authorized for one
account instead of per connecting user.

Cross-checked against a second, independent source: n8n's own
`HelpScoutOAuth2Api.credentials.ts` hardcodes `grantType: 'authorizationCode'` and the
identical authorize/token URLs this app declares — n8n reached the same conclusion
independently.

Unlike Freshdesk/Zendesk, there is no per-account host to collect as a Connection field —
every customer's Mailbox API lives at the same `api.helpscout.net`, so `w6w.network.allow`
names that bare host rather than a wildcard.

- **Authorize URL** — `https://secure.helpscout.net/authentication/authorizeClientApplication`
- **Token URL** — `https://api.helpscout.net/v2/oauth2/token`
- `sign` stamps `Authorization: Bearer <token>` on every request.
- `test` / `afterConnect` both probe `GET /v2/users/me` — the same scope-free whoami other
  apps in this pack use for credential liveness.

## Actions

| Resource | Action | Wraps |
|---|---|---|
| Conversation | `list-conversations` | `GET /v2/conversations` |
| Conversation | `get-conversation` | `GET /v2/conversations/{id}` |
| Conversation | `create-conversation` | `POST /v2/conversations` |
| Conversation | `update-conversation` | `PATCH /v2/conversations/{id}` (JSON-Patch, one op) |
| Conversation | `add-reply` | `POST /v2/conversations/{id}/reply` |
| Conversation | `add-note` | `POST /v2/conversations/{id}/notes` |
| Inbox | `list-mailboxes` | `GET /v2/mailboxes` |
| Customer | `list-customers` | `GET /v2/customers` |
| Customer | `get-customer` | `GET /v2/customers/{id}` |
| Customer | `create-customer` | `POST /v2/customers` |
| Customer | `update-customer` | `PATCH /v2/customers/{id}` (JSON-Patch, array of ops) |
| User | `get-current-user` | `GET /v2/users/me` |
| Tag | `list-tags` | `GET /v2/tags` |

Every endpoint above was checked directly against developer.helpscout.com's live documentation
pages (not invented or assumed) — see the per-action code comments for the specific request/
response shape each was verified against.

### Two different JSON-Patch shapes, on purpose

Help Scout's own docs use JSON-Patch (`{ op, path, value }`) for both `Update Conversation` and
`Update Customer`, but the two endpoints do **not** take the same body shape:

- **Update Conversation** accepts exactly **one** operation object per request, from a fixed
  set of six `path`/`op` pairs (`/subject`, `/status`, `/assignTo` replace-or-remove,
  `/mailboxId` — using `move`, not `replace` — `/primaryCustomer.id`, `/draft`).
  `update-conversation` exposes this as a `field` select + a single `value`, and maps `field`
  to the right `path`/`op`/value-type itself (Help Scout rejects a string where a path expects
  a number).
- **Update Customer** accepts an **array** of operations in one call — Help Scout's own docs
  show a "change several fields at once" example this way. `update-customer` builds one
  `replace` op per param the caller actually set, so several fields change in a single request
  while an unset param generates no op at all (rather than a `replace` to an empty string).

### `add-reply` / `add-note` / `create-conversation` / `create-customer` return only an id

Help Scout's write endpoints answer `201 Created` with an **empty body** — the new id rides
the `Resource-ID` response header instead (`Location` too, for conversations and customers).
`lib/client.ts`'s `create()` reads that header so a workflow gets the new id back without a
second round trip to re-fetch what it just created.

### Deliberately out of scope

Real Mailbox API surfaces left out to stay within the 8–14 action budget for a first pass:
attachments, custom fields, conversation snooze, thread schedules, saved replies, inbox
routing config, organizations + organization properties, customer properties, satisfaction
ratings, every Reports endpoint, teams, system users, webhooks and workflows. The 13 actions
here are conversations/threads (read + write), customers (read + write), and the reference
lookups (`list-mailboxes`, `get-current-user`, `list-tags`) the ID params above depend on.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left. Only the second is
something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.helpscout.com>

Unlike Freshdesk (`updates.freshdesk.com`, human-only) and Zendesk (`status.zendesk.com`,
per-pod with no API), Help Scout's status page is a **real Atlassian Statuspage instance** —
confirmed live: `GET https://status.helpscout.com/api/v2/summary.json` returns genuine JSON
(2026-08-02). `health/service.ts` reads it directly (same shape as this pack's Asana check),
rather than declaring the check `unavailable`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself. The `oauth2` auth method probes:

```
GET /v2/users/me
```

The currently authenticated user — the same scope-free whoami the docs themselves use as
their own `curl` example for "how to authenticate."

### Do we have quota left?

`X-RateLimit-Limit-Minute` and `X-RateLimit-Remaining-Minute` response headers (plus
`X-RateLimit-Retry-After` once throttled), verified against
developer.helpscout.com/mailbox-api/overview/rate-limiting/. Help Scout meters per account per
minute, and a write request (POST/PUT/DELETE/PATCH) costs **2** against that same budget —
worth knowing when a workflow chains several writes.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` (Statuspage `summary.json`) |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-02 against developer.helpscout.com/mailbox-api/,
status.helpscout.com, and n8n's `packages/nodes-base/credentials/HelpScoutOAuth2Api.credentials.ts`
(cross-check on the OAuth2 grant choice). Status surfaces move; re-check if a probe starts
failing for everyone at once.
