# Intercom

Manage Intercom contacts, companies, conversations, notes and tags via its REST API, plus triggers for new conversations and contacts.

- **Categories** — support, communication, crm
- **Auth methods** — access-token, oauth2
- **Actions** — 14
- **Triggers** — 2 (webhook)
- **Egress allowlist** — `api.intercom.io`
- **Website** — https://www.intercom.com
- **API docs** — https://developers.intercom.com/docs/references/rest-api/

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `conversation-created` — New Conversation | webhook (manual, signed) | `conversation.user.created` | notification id, topic, app id, the conversation object |
| `contact-created` — New Contact | webhook (manual, signed) | `contact.user.created` | notification id, topic, app id, the contact object |

**Setup (manual webhook).** Intercom sets webhooks per app in the Developer Hub, not through the API, so:

1. Create the trigger and copy its callback URL.
2. In the Developer Hub open your app, **Webhooks**, paste the URL as the endpoint and tick the topic (`conversation.user.created` or `contact.user.created`).
3. Paste the app's **Client secret** (Basic information) into the trigger's `signingSecret` param.

**Trust model.** Intercom signs the exact request body with HMAC-SHA1 under the client secret and sends it as `X-Hub-Signature: sha1=<hex>`. The trigger checks it against the raw bytes received, in constant time, before parsing; a missing secret, header or raw body, or a mismatch, refuses the delivery. Intercom's signature carries no timestamp, so a captured delivery can be replayed. Deliveries for other topics (and Intercom's `ping`) are acknowledged without a run.

No poll trigger: `conversation-get-many` takes no sort or since filter and the Intercom docs checked do not state a newest-first order for `GET /conversations`.

Docs (verified 2026-11-09): https://developers.intercom.com/docs/webhooks and https://developers.intercom.com/docs/references/webhooks/webhook-models

Every request pins the API version with an `Intercom-Version` header (currently `2.11`)
so response shapes stay predictable across workspaces. Note that **listing contacts is a
POST, not a GET**: Intercom lists contacts through its Search API
(`POST /contacts/search`), so `contact-search` is the "get many" for contacts.

## Actions

| Resource | Actions |
|---|---|
| contact | `contact-create` · `contact-get` · `contact-search` · `contact-update` · `contact-delete` |
| company | `company-create-or-update` · `company-get` · `company-get-many` |
| conversation | `conversation-get` · `conversation-get-many` · `conversation-reply` |
| note | `note-create` · `note-get-many` |
| tag | `tag-get-many` |

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://www.finstatus.com/api/v2/summary.json
```

The host is `www.finstatus.com`, not `status.intercom.com`. Intercom moved its status
page onto Fin's (its AI product) Statuspage: `status.intercom.com` and
`www.intercomstatus.com` both redirect (301/302) to `www.finstatus.com`, which serves the
real Statuspage JSON. The check probes the final host directly so no cross-host redirect
has to be followed inside the worker.

`summary.json` rather than `status.json`: identical request cost, but it carries the
per-component breakdown, so one probe can report against individual components rather than
greying out the whole platform. `status.indicator` maps `none`/`minor`/`major`/`critical`
onto our four states; a status page that itself 500s reports `unknown`, never `down`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /me
```

Identifies the admin (and embedded workspace) behind the token. It needs no scope, so it
reports a good token as good regardless of what the credential is otherwise entitled to.

### Do we have quota left?

`X-RateLimit-Limit` / `-Remaining` / `-Reset` response headers, read off the same
`GET /me` probe. Intercom meters a single request bucket per rolling rate-limit window;
`X-RateLimit-Reset` is a Unix UTC timestamp in **seconds** of when that window resets.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `www.finstatus.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Endpoints and shapes cross-checked against
Intercom's OpenAPI 2.11 description. Status surfaces move; re-check if a probe starts
failing for everyone at once.
