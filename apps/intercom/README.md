# Intercom

Manage Intercom contacts, companies, conversations, notes and tags via its REST API, plus triggers for new conversations and contacts.

- **Categories** — support, communication, crm
- **Auth methods** — access-token, oauth2
- **Actions** — 14
- **Triggers** — 17 (15 webhook, 2 poll)
- **Egress allowlist** — `api.intercom.io`
- **Website** — https://www.intercom.com
- **API docs** — https://developers.intercom.com/docs/references/rest-api/

## Triggers

| Trigger | Mechanism | Vendor event / wrapped list action | The run gets |
|---|---|---|---|
| `conversation-created` — New Conversation | webhook (manual, signed) | `conversation.user.created` | notification id, topic, app id, the conversation object |
| `contact-created` — New Contact | webhook (manual, signed) | `contact.user.created` | notification id, topic, app id, the contact object |
| `new-contact` — New Contact or Lead | webhook (manual, signed) | `contact.user.created`, `contact.lead.created` | the contact object (user or lead) |
| `contact-updated` — Contact Updated | webhook (manual, signed) | `contact.user.updated`, `contact.lead.updated` | the updated contact |
| `contact-deleted` — Contact Deleted | webhook (manual, signed) | `contact.deleted` | the deleted contact's type and id only (Intercom sends a minimal identification payload for `*.deleted` topics) |
| `company-created` — Company Created | webhook (manual, signed) | `company.created` | the company object |
| `company-updated` — Company Updated | webhook (manual, signed) | `company.updated` | the updated company |
| `company-deleted` — Company Deleted | webhook (manual, signed) | `company.deleted` | the deleted company's type and id only (minimal identification payload) |
| `new-conversation` — New Conversation (Any Starter) | webhook (manual, signed) | `conversation.user.created`, `conversation.admin.single.created` | the conversation object |
| `conversation-user-replied` — Conversation Replied by Contact | webhook (manual, signed) | `conversation.user.replied` | the conversation with the new part |
| `conversation-admin-replied` — Conversation Replied by Admin | webhook (manual, signed) | `conversation.admin.replied` | the conversation with the new part |
| `conversation-closed` — Conversation Closed | webhook (manual, signed) | `conversation.admin.closed` | the conversation |
| `conversation-assigned` — Conversation Assigned | webhook (manual, signed) | `conversation.admin.assigned` | the conversation |
| `conversation-deleted` — Conversation Deleted | webhook (manual, signed) | `conversation.deleted` | the deleted conversation's type and id only (minimal identification payload) |
| `any-event` — Any Event | webhook (manual, signed) | any topic you subscribed, optionally narrowed by `events` | notification id, topic, app id, the item |
| `new-note` — New Note on Contact | poll (snapshot of note ids, order-independent) | `note-get-many` (`GET /contacts/{id}/notes`) | the note; you pick the contact id |
| `new-tag` — New Tag | poll (snapshot) | `tag-get-many` (`GET /tags`) | the tag (id, name) |

**Setup (manual webhook).** Intercom sets webhooks per app in the Developer Hub, not through the API, so:

1. Create the trigger and copy its callback URL.
2. In the Developer Hub open your app, **Webhooks**, paste the URL as the endpoint and tick the topic(s) the trigger fires on (the table above). One endpoint can carry several topics; each trigger runs only on its own.
3. Paste the app's **Client secret** (Basic information) into the trigger's `signingSecret` param.

**Any Event.** Subscribe whichever topics you want in the Developer Hub (the catalog has contact, company, conversation, ticket, article, call, audience and more); `any-event` runs on all of them, or only on the comma-separated `events` topics you list (`conversation.admin.noted, ticket.created`). Intercom's `ping` test is acknowledged without a run unless you list it.

**Trust model.** Intercom signs the exact request body with HMAC-SHA1 under the client secret and sends it as `X-Hub-Signature: sha1=<hex>`. The trigger checks it against the raw bytes received, in constant time, before parsing; a missing secret, header or raw body, or a mismatch, refuses the delivery. Intercom's signature carries no timestamp, so a captured delivery can be replayed. Deliveries for other topics (and Intercom's `ping`) are acknowledged without a run.

**Deleted items.** Intercom's `*.deleted` topics send "a minimal identification payload containing only identifying fields — not the full resource object" (webhook-models page below), so `contact-deleted`, `company-deleted` and `conversation-deleted` give the run the item's `type` and `id` and nothing else (no email, name or body); look the record up beforehand if you need more.

**Polls.** `new-note` wraps `note-get-many`: the notes endpoint takes only `page` and `per_page` for the pinned API version (2.11) and documents no sort order, so it does not rely on one. Each check reads every page of the contact's notes (50 per page, at most 100 pages; a contact with more notes is refused, not truncated) and diffs the note ids against the previous check, so a new note is found wherever it sits and an edited note is not a new one. `new-tag` wraps `tag-get-many`: `GET /tags` returns the whole workspace tag list in one response, so each check diffs the ids.

**Not covered.** `company-get-many` (companies list), `contact-search` and `conversation-get-many` are served by the webhook triggers `company-created`, `new-contact` and `new-conversation`: the companies list is ordered by `last_request_at` (not creation), `GET /conversations` documents no order, and a contact search needs a filter, so none would make a correct newest-first poll.

Docs (verified 2026-11-10): https://developers.intercom.com/docs/webhooks ,
https://developers.intercom.com/docs/references/webhooks/webhook-models (topic catalog and `X-Hub-Signature`) ,
https://developers.intercom.com/docs/references/2.11/rest-api/api.intercom.io/notes/listnotes (the version the client pins) ,
https://developers.intercom.com/docs/references/rest-api/api.intercom.io/tags/listtags ,
https://developers.intercom.com/docs/references/rest-api/api.intercom.io/companies/listallcompanies ,
https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations/listconversations

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
