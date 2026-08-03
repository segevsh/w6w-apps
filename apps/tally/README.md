# Tally

Build and manage Tally forms, questions, blocks, submissions, analytics, workspaces, folders,
webhooks and organization members via the Tally API.

- **Categories** — forms, productivity
- **Auth methods** — api-key
- **Actions** — 38
- **Egress allowlist** — `api.tally.so`
- **Website** — https://tally.so
- **API docs** — https://developers.tally.so
- **OpenAPI** — https://developers.tally.so/api-reference/openapi.json
- **GitHub org** — https://github.com/tallyforms

## How this app was built

Every action here is a 1:1 rendering of an operation in Tally's own OpenAPI document (fetched
2026-08-03). **All 38 operations that document declares are implemented, and nothing that is not in
it is.** Enums (`FormStatus`, `EventType`, the submission `filter`, the analytics `period`),
pagination ceilings and required-field lists are copied from that document rather than inferred.

## How big is Tally's API, really?

Bigger than expected, and bigger than every other form vendor in this pack. The starting point for
this app was a Notion page about an OAuth reference, which suggested a thin surface; the real
published API is a full REST surface with an OpenAPI spec, a date-based versioning scheme, an MCP
server and a 45-type block schema.

| App          | Actions | Form authoring                      | Submission read | Submission write   | Analytics       | Webhook mgmt |
| ------------ | ------: | ----------------------------------- | --------------- | ------------------ | --------------- | ------------ |
| **tally**    |  **38** | full (create/update/delete, blocks) | yes             | delete only        | **5 endpoints** | yes          |
| jotform      |      14 | none (read-only)                    | yes             | create/edit/delete | no              | no           |
| google-forms |      12 | yes                                 | yes             | no                 | no              | no           |
| surveymonkey |      12 | yes                                 | yes             | no                 | no              | no           |
| typeform     |      10 | yes                                 | yes             | delete only        | no              | no           |

Where Tally is **ahead** of the siblings:

- **Analytics.** Five dedicated endpoints — metrics, visits, submissions, dimensions, drop-off. No
  other form app in this pack exposes any analytics surface.
- **Programmatic authoring.** Forms are created and edited as block arrays, and blocks can be
  rewritten independently of the form. This is what makes "change a dropdown's options without
  shipping code" work.
- **Webhook management.** Subscriptions, their delivery log, and replay of a failed delivery.
- **Team management.** Organization members and invites.

Where Tally is **behind**:

- **You cannot create a submission.** Tally publishes no write endpoint for responses — they arrive
  through the hosted form. jotform, alone among the siblings, lets you POST one. This is a real gap,
  not an omission on our side: there is nothing to call.
- **Deleting a submission is the only submission write.** Unlike jotform, there is no edit.
- **No file-download endpoint** for uploaded files beyond whatever URLs ride on a submission
  payload.

## Auth

**`api-key`** — a bearer token. Tally's OpenAPI declares exactly one security scheme (`bearerAuth`,
`type: http`, `scheme: bearer`) applied globally, and the introduction says authentication "requires
an Authorization header with a Bearer token".

Mint a key at **Settings -> API keys -> Create API key**. It is shown once. Keys carry **no scopes**
— the vendor's API-keys page states each key "is tied to a specific user, meaning that it will
inherit the permissions of the user" — so a key can do anything its owner can, and it stops working
if that user is removed from the organization.

The connection also takes an optional **API version**. Tally versions by calendar date through a
`tally-version` header (e.g. `2025-02-01`). Leaving the field blank is the documented default
behaviour: a key is bound to the API version current when it was created. The header is sent only
when a value was recorded, so an unpinned connection behaves exactly as Tally intends.

### Why there is no OAuth2 method

Tally runs an OAuth2 authorization-code service, and it is live. Verified 2026-08-03:

- `GET https://tally.so/oauth/authorize?client_id=…` redirects to Tally's login page, while a
  nonsense path on the same host returns 404 — so the route is real.
- `POST https://api.tally.so/oauth/token` returns
  `{"error":"invalid_client","error_description":"Invalid client: cannot retrieve client credentials"}`
  — a well-formed OAuth error, not a 404.

It is nonetheless **undocumented**. There is no OAuth page in the developer docs index (`llms.txt`,
40 pages), no `oauth2` security scheme in the OpenAPI document, and no mention on the API-keys page.
The scope vocabulary and the client-registration process are both unpublished. Writing an `oauth2`
AuthDefinition would mean inventing `scopes` and a registration story, so it is deliberately left
out. Add it when Tally documents it; the endpoints above are the starting point.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — Better Stack status page.

```
GET https://status.tally.so/index.json
```

Tally's status page is **Better Stack**, not Atlassian Statuspage, so the `/api/v2/summary.json`
convention the rest of this pack leans on does not exist here — that path falls through to the
page's HTML catch-all, byte-identical to a nonsense path (verified 2026-08-03).

Two real sources were found, and the JSON one was chosen:

| Source                               | What it gives                                                                                                                            | Verdict  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `https://status.tally.so/index.json` | `data.attributes.aggregate_state` plus a `status_page_resource` per component — live: _Tally Application_, _Tally API_, _Custom domains_ | **used** |
| `https://status.tally.so/feed.rss`   | a genuine RSS incident feed (`application/rss+xml`)                                                                                      | rejected |

The spec ordinarily prefers a declared `feed`, because the host parses it for free. It is rejected
here for the reason the spec itself gives for preferring `latest` over `entries`: **a feed is a log
of updates, not a statement of current state.** Better Stack emits paired "X went down" / "X
recovered" items sharing one `guid`, so reading current health off it means inferring state from
title text. `aggregate_state` _is_ the current state, and the per-resource breakdown names **Tally
API** separately from the app — which is precisely what a caller of this integration cares about.
Same single request either way.

An operator's `explicit_status` override wins over the measured `status` when present. A status page
that itself fails reports `unknown`, never `down`.

`status.tally.so` is deliberately absent from the app's egress allowlist and is widened onto this
one hook's allowlist instead — safe because the check is never signed.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /users/me
```

The cheapest read Tally publishes, it touches no form data, and since API keys carry no scopes there
is no permission a valid credential could legitimately lack. It is also the only place
`organizationId` is published, which every `organization-*` action needs.

Tally answers a bad key with `401` and a `text/plain` body (`Unauthorized`), not JSON, so `test`
reads the body as text first and only then tries to parse it.

### Do we have quota left?

Declared absent. Tally documents **100 requests per minute** and a `429`, but the budget is enforced
rather than reported:

- the OpenAPI document declares **no response headers at all**, on any operation, so no
  `X-RateLimit-*` / `RateLimit-*` contract exists;
- a live request to `GET https://api.tally.so/users/me` carried none either (verified 2026-08-03);
- there is no usage or metering endpoint. `GET /users/me` reports a `subscriptionPlan` (`FREE` /
  `PRO` / `BUSINESS`), which is a plan name rather than a counter, and Tally publishes no per-plan
  call ceiling to compare it against.

The vendor's own advice is to sidestep the budget rather than watch it: the docs recommend webhooks
over polling because deliveries "won't count against your rate limit". Stated as a positive fact
rather than left as a gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key            | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                |
| -------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ---------------------------------------------------- |
| `service`      | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                  |
| `quota`        | quota      | connection | signed     | informational | —            | _declared absent_                                    |
| `auth:api-key` | credential | connection | signed     | fatal         | —            | derived from the `api-key` auth method's `test` hook |

**`quota` is declared absent.** A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Actions

38 actions across nine resources.

### user (1)

| Key        | Method | Endpoint    |
| ---------- | ------ | ----------- |
| `user-get` | GET    | `/users/me` |

### workspace (5)

| Key                  | Method | Endpoint           |
| -------------------- | ------ | ------------------ |
| `workspace-get-many` | GET    | `/workspaces`      |
| `workspace-get`      | GET    | `/workspaces/{id}` |
| `workspace-create`   | POST   | `/workspaces`      |
| `workspace-update`   | PATCH  | `/workspaces/{id}` |
| `workspace-delete`   | DELETE | `/workspaces/{id}` |

### folder (4)

| Key               | Method | Endpoint                        |
| ----------------- | ------ | ------------------------------- |
| `folder-get-many` | GET    | `/workspaces/{id}/folders`      |
| `folder-create`   | POST   | `/workspaces/{id}/folders`      |
| `folder-update`   | PATCH  | `/workspaces/{id}/folders/{id}` |
| `folder-delete`   | DELETE | `/workspaces/{id}/folders/{id}` |

### form (5)

| Key             | Method | Endpoint      |
| --------------- | ------ | ------------- |
| `form-get-many` | GET    | `/forms`      |
| `form-get`      | GET    | `/forms/{id}` |
| `form-create`   | POST   | `/forms`      |
| `form-update`   | PATCH  | `/forms/{id}` |
| `form-delete`   | DELETE | `/forms/{id}` |

### question (2) and block (2)

| Key                 | Method | Endpoint                     |
| ------------------- | ------ | ---------------------------- |
| `question-get-many` | GET    | `/forms/{id}/questions`      |
| `question-update`   | PATCH  | `/forms/{id}/questions/{id}` |
| `block-get-many`    | GET    | `/forms/{id}/blocks`         |
| `block-update-many` | PATCH  | `/forms/{id}/blocks`         |

Questions are the _answerable projection_ of a form — only input-collecting blocks, each with a
response count. Blocks are the _raw layout_, including headings, images, dividers and page breaks.
Retitling is a question operation; everything structural is a block operation.

### submission (3)

| Key                   | Method | Endpoint                       |
| --------------------- | ------ | ------------------------------ |
| `submission-get-many` | GET    | `/forms/{id}/submissions`      |
| `submission-get`      | GET    | `/forms/{id}/submissions/{id}` |
| `submission-delete`   | DELETE | `/forms/{id}/submissions/{id}` |

### analytics (5)

| Key                         | Method | Endpoint                            |
| --------------------------- | ------ | ----------------------------------- |
| `analytics-get-metrics`     | GET    | `/forms/{id}/analytics/metrics`     |
| `analytics-get-visits`      | GET    | `/forms/{id}/analytics/visits`      |
| `analytics-get-submissions` | GET    | `/forms/{id}/analytics/submissions` |
| `analytics-get-dimensions`  | GET    | `/forms/{id}/analytics/dimensions`  |
| `analytics-get-drop-off`    | GET    | `/forms/{id}/analytics/drop-off`    |

All five take a required `period` from Tally's nine-value vocabulary (`today`, `yesterday`, `24h`,
`7d`, `30d`, `3m`, `6m`, `12m`, `all`).

### webhook (4) and webhook-event (2)

| Key                      | Method | Endpoint                     |
| ------------------------ | ------ | ---------------------------- |
| `webhook-get-many`       | GET    | `/webhooks`                  |
| `webhook-create`         | POST   | `/webhooks`                  |
| `webhook-update`         | PATCH  | `/webhooks/{id}`             |
| `webhook-delete`         | DELETE | `/webhooks/{id}`             |
| `webhook-event-get-many` | GET    | `/webhooks/{id}/events`      |
| `webhook-event-retry`    | POST   | `/webhooks/{id}/events/{id}` |

### organization-user (2) and organization-invite (3)

| Key                            | Method | Endpoint                           |
| ------------------------------ | ------ | ---------------------------------- |
| `organization-user-get-many`   | GET    | `/organizations/{id}/users`        |
| `organization-user-remove`     | DELETE | `/organizations/{id}/users/{id}`   |
| `organization-invite-get-many` | GET    | `/organizations/{id}/invites`      |
| `organization-invite-create`   | POST   | `/organizations/{id}/invites`      |
| `organization-invite-cancel`   | DELETE | `/organizations/{id}/invites/{id}` |

## Things worth knowing before you use this

**Updating a form replaces its blocks.** Tally's help page is explicit: when you PATCH a form you
must submit the complete blocks array, because any block you omit is deleted. Both `form-update` and
`block-update-many` therefore log a `warn` when a block array is supplied, and neither sends
`blocks` unless you set it. The safe sequence for a partial edit is `form-get` (or `block-get-many`)
-> mutate the returned array -> send it back whole.

**Blocks are passed as JSON, not modelled as form params.** A Tally block is a 45-member
discriminated union, each arm with its own payload. Flattening that into a fixed param list would
either lose most block types or invent a schema Tally does not have, so `blocks` is a `json` param.
The authoritative shape is [the blocks reference](https://developers.tally.so/blocks-reference); the
easiest way to get a valid array is to read one back off `form-get`.

**Three list endpoints do not use the standard envelope**, and this app surfaces the real field
names rather than normalising them:

| Endpoint                  | Collection key | Notes                                                                  |
| ------------------------- | -------------- | ---------------------------------------------------------------------- |
| `/forms/{id}/submissions` | `submissions`  | plus `questions`, no `total`, adds `totalNumberOfSubmissionsPerFilter` |
| `/webhooks`               | `webhooks`     | `limit` caps at 100, not 500                                           |
| `/webhooks/{id}/events`   | `events`       | pages fixed at 25, no `limit` param, adds `totalNumberOfEvents`        |

`/workspaces/{id}/folders`, `/organizations/{id}/users` and `/organizations/{id}/invites` are not
paginated at all — they return bare JSON arrays.

**`organization-invite-create` takes emails as a _string_.** The documented body pairs
`workspaceIds` (array of strings) with `emails` (a single comma- or semicolon-separated string).
That asymmetry is Tally's, and it is reproduced here rather than smoothed over.

**`webhook-update` requires four fields on every call.** Despite being a PATCH, the API marks
`formId`, `url`, `eventTypes` and `isEnabled` as required, so the action requires them too rather
than letting you discover the 400. Toggling `isEnabled` is how you pause a webhook; there is no
separate enable/disable endpoint.

**Deleting a submission is recoverable.** Tally moves it to trash with a recovery window rather than
erasing it.

**`analytics-get-drop-off` can legitimately return nothing.** The 200 body is declared `nullable`; a
form with no analytics yet answers `null`, which this app normalises to `available: false` rather
than throwing.

## Not implemented, and why

- **Creating or editing a submission** — Tally publishes no such endpoint. Responses arrive through
  the hosted form.
- **An OAuth2 auth method** — the endpoints exist but are undocumented. See above.
- **A Trigger** — Tally's webhooks are managed here as Actions, matching `calendly`, the pack's only
  other webhook-managing app. Declaring a `TriggerDefinition` is separate work and no app in this
  pack ships one yet.
- **The MCP server** at `https://developers.tally.so/api-reference/mcp` — a different integration
  shape from a w6w App, and out of scope here.

## Icon

`assets/icon.svg` is Tally's own mark, taken verbatim from `https://tally.so/favicon.svg`.

---

Researched and endpoint-verified against the vendor's OpenAPI document on 2026-08-03. Status
surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for
everyone at once.
