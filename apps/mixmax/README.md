# Mixmax

Send and schedule email, run sequences and read templates, tasks, teams and unsubscribes in
**Mixmax**, the email-engagement and sales-outreach platform, over the **Mixmax REST API (v1)**.

- **Categories** — marketing, email
- **Auth methods** — api-token (`X-API-Token: <token>`)
- **Actions** — 20
- **Health checks** — `service` (the `API` and `Public API` components of the Instatus status page),
  `api` (unsigned reachability: the documented 401 `{message}` is a pass), `quota` (declared
  unavailable, informational) + the derived `auth:api-token`
- **Egress allowlist** — `api.mixmax.com` (the `service` check also declares `status.mixmax.com`)
- **API docs** — https://developer.mixmax.com/reference/getting-started-with-the-api
- **Icon** — the vendor's `https://www.mixmax.com/favicon.png` (32x32 PNG, 1,323 bytes), verbatim.
  The homepage serves no larger square mark (its other images are the wordmark/product art).

Verified on 2026-10-06 against developer.mixmax.com (a ReadMe site: each reference page embeds its
own OpenAPI fragment, which were merged and read) and unauthenticated probes of `api.mixmax.com`.

## Actions

| Area | Actions |
|---|---|
| User | `user-get` |
| Messages | `message-list`, `message-get`, `message-create` (draft), `message-send` |
| Sequences | `sequence-list`, `sequence-search`, `sequence-recipient-list`, `sequence-recipient-add`, `sequence-cancel`, `sequence-folder-list` |
| Templates | `template-list`, `template-get` (Mixmax calls these snippets) |
| Tasks | `task-list` |
| Teams | `team-list`, `team-get`, `team-member-list` |
| Unsubscribes | `unsubscribe-list`, `unsubscribe-add`, `unsubscribe-remove` |

## Deliberately not covered

- **Contacts and contact groups** — every `/contacts*` and `/contactgroups*` page is marked
  `[deprecated]` in its title in the reference, so none is built.
- **Calls** (`/calls`, recording, transcript) — documented as a limited beta behind an access
  allowlist (callers without access get 404), so they cannot be verified or relied on.
- **Salesforce, integrations (commands/enhancements/link resolvers/sidebars), insights reports,
  rules/webhooks, polls, Q&A, reminders, meeting invites, meeting types, appointment links,
  code snippets, live feed, file requests, team create/edit/member management, template and
  sequence-folder writes** — outside the core scope of this first version, or admin-only.
- `GET /messages` and `GET /sequences` document no query parameters beyond the generic
  `limit`/`next` (messages) and `name`/`folder`/`expand` (sequences); only those are exposed.

## Things most likely to go wrong

1. **A rejected token is 401 with a JSON `message`, and a missing one reads differently.** `No API
   token provided; please visit …` vs `Invalid API token provided`. The auth test and the `api`
   health check both read the body's `message`, not just the status.
2. **`GET /users/me` returns only `{"_id": "<user id>"}`** — safe as the credential probe: it never
   echoes the token.
3. **Two pagination styles.** Most lists answer `{results, next, hasNext}` and page with `limit` and
   `next`; `GET /sequences/{id}/recipients` answers a **bare array** and pages with `limit` (max 50)
   and `offset` (10,000 records total). `sequence-search` pages with `limit`/`offset` too.
4. **`message-create` takes `to`/`cc`/`bcc` as arrays of `{email}`** — the reference's schema table
   flattens them to objects, but its examples and responses are arrays. The action accepts
   comma-separated addresses and builds the array. A draft is **not** sent until `message-send`.
5. **Sequence recipients need `variables.email`.** The reference still requires it (as of its
   2017 note); `sequence-recipient-add` fills it in from `email` when absent. `scheduledAt` is a
   millisecond timestamp, or `false` to keep recipients in draft.
6. **Rate limit** — 120 requests per 60 seconds per IP and user, a 429 carries `Retry-After`;
   `X-RateLimit-*` headers ride every response but there is no usage endpoint, so the `quota`
   check is a declared absence.
7. **Status page is Instatus and rolls up the whole product** (Gmail sidebar, Chrome extension,
   dialer, SMS ...). The `service` check therefore reports the worst of the `API` and `Public API`
   components, not the page-wide status. The page's `/api/v2/summary.json` is only an alias of
   `/summary.json` (Instatus schema, no Statuspage `indicator`); `/index.json` is a 404.
8. **Unsubscribe writes answer 204 with no body** (`DELETE /unsubscribes` takes a JSON body). The
   client treats an empty body as success.
