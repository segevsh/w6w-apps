# Pipefy

Pipefy is a no-code work-management / process-automation platform (pipes, phases, cards,
Database Tables). This app covers organizations, pipes, phases, cards and Database Tables over
Pipefy's **GraphQL-only** API, plus a raw-query escape hatch.

## Triggers

| Key | Mechanism | Wrapped list action | What the run gets |
| --- | --- | --- | --- |
| `new-pipe` | poll | `pipe-list` (GraphQL `organization(id) { pipes }`) | Each pipe newly created in the chosen organization (additions only). |
| `new-card` | webhook (API-registered) | `card.create` | Each card (or database table record) created in the chosen pipe or table: card id and pipe id, phase, creator, full payload. |
| `card-done` | webhook (API-registered) | `card.done` | Each card moved to a finished phase (or table record marked done): card id, phase, who finished it, full payload. |
| `card-moved` | webhook (API-registered) | `card.move` | Each card moved between phases: card id and title, the phase it left and entered, who moved it, full payload. |
| `card-deleted` | webhook (API-registered) | `card.delete` | Each card (or table record) deleted: card id and title, the phase it was in, who deleted it, full payload. |
| `card-field-updated` | webhook (API-registered) | `card.field_update` | Each field update on a card or record: the field, its new value, who changed it, full payload. |
| `card-comment-created` | webhook (API-registered) | `card.comment_create` | Each comment added to a card: the text, the mentioned users, the author, full payload. |
| `card-late` | webhook (API-registered) | `card.late` | Each card that becomes late in its phase (pipes only). |
| `card-overdue` | webhook (API-registered) | `card.overdue` | Each card that passes its due date. |
| `card-expired` | webhook (API-registered) | `card.expired` | Each card that expires in its phase (pipes only). |
| `any-event` | webhook (API-registered) | the `events` you list (default: every card event) | Any Pipefy webhook action, including `card.email_received`, `audit_log.export_finished` and `automation.execution`. One webhook is registered for the list you give; only those actions are delivered. |
| `new-phase` | poll | `phase-list` (GraphQL `pipe(id) { phases }`) | Each phase newly added to the chosen pipe (additions only). |
| `new-table` | poll | `table-list` (GraphQL `organization(id) { tables }`) | Each Database Table newly created in the chosen organization (additions only). |
| `new-organization` | poll | `organization-list` (GraphQL `organizations`) | Each organization the connected account newly gains access to (additions only). |

`pipe-list` reads all pipes of one organization in a single GraphQL query with no ordering argument, so the trigger snapshots the list and emits ids not seen before (renames and removals are ignored). It takes the organization ID as a parameter. `phase-list` and `organization-list` get the same snapshot treatment (`new-phase`, `new-organization`): each is a plain list that returns the whole collection in one query. `table-list` is a Relay connection that Pipefy caps at 50 rows a page (default and maximum; https://developers.pipefy.com/reference/limits-and-best-practices, verified 2026-11-10), so `new-table` walks every page with `first: 50` and `after: endCursor` while `pageInfo.hasNextPage` (the action takes the same optional `first`/`after`) and snapshots the ids; an organization with more than 1000 database tables fails the check with an error naming the cap rather than silently missing some. `card-list` and `table-record-list` are covered by the `new-card` webhook (Pipefy: "for webhooks those records are considered cards", so `card.create` fires for a new card in a pipe and a new record in a table); they have no sort argument, so they are not polled.

**Webhook triggers.** Every webhook trigger above (`new-card`, the `card-*` ones and `any-event`) registers itself: subscribing runs the `createWebhook` GraphQL mutation (one action per trigger) for the pipe or database table you name (`pipeId` or `tableId` — exactly one), with the callback URL w6w minted for the subscription; unsubscribing runs `deleteWebhook` (a webhook Pipefy no longer has counts as deleted). Nothing to set up by hand. The service account that authenticated the connection needs permission to manage webhooks on that pipe or table. Each named trigger registers one action; `any-event` registers the list in its `events` parameter (comma-separated; empty = every card event; `card.late` and `card.expired` are left out for a table, where Pipefy never sends them). `automation.execution` allows one webhook per pipe, and `audit_log.export_finished` only fires for an export requested with webhook delivery, so neither is in the default list.

**Trust model.** Pipefy documents no signature and no timestamp on a delivery, so a delivery cannot be proven unmodified and a captured one can be replayed. It does let the registrant attach custom JSON headers (`headers` on `CreateWebhookInput`), so subscribing registers a fresh random secret as the custom header `X-W6W-Webhook-Secret`, kept in the subscription, and the trigger refuses (constant-time comparison, before it reads the body) any delivery whose header is missing or wrong. That makes the secret a second credential besides the callback URL (w6w stores a custom header in the event history unredacted, so only people who can read events see it). It is not secrecy from other pipe members, whom Pipefy's webhook queries can show the headers. Keep the callback URL out of logs and tickets; unsubscribe (which deletes the Pipefy webhook) and subscribe again to rotate both. A delivery whose action is not the one the trigger registered is dropped.

Vendor documentation (verified 2026-11-09 unless dated):

- https://developers.pipefy.com/reference/pipes
- https://developers.pipefy.com/reference/pipe-table-webhooks (webhook registration mutations and payloads, verified 2026-11-10)
- https://developers.pipefy.com/docs/webhooks (webhooks overview, verified 2026-11-10)
- https://developers.pipefy.com/reference/organizations, https://developers.pipefy.com/reference/phases and https://developers.pipefy.com/reference/tables (the queries the three snapshot polls wrap, verified 2026-11-10), https://developers.pipefy.com/reference/pagination-basics (`first`/`after`/`pageInfo` cursor paging used by `new-table`, verified 2026-11-10)
- https://developers.pipefy.com/reference/authentication

## Auth model

Pipefy offers two ways to authenticate, and its own docs are explicit about which one to use:

> "Service Accounts are the recommended and long-term secure method for integrations, while
> Personal Access Tokens (PATs) are deprecated and should no longer be used."
> — [Pipefy's Authentication page](https://developers.pipefy.com/reference/authentication)

Both are implemented here, in that order:

1. **Service Account** (`client-credentials`, `type: "custom"`) — OAuth2 `client_credentials`
   grant. Create one under your organization's **Members and Permissions → Service Accounts**,
   which hands back a Client ID, a Client Secret, and "the token endpoint". Pipefy's own docs
   present that endpoint as if it were per-account — but **it isn't**: `POST
   https://app.pipefy.com/oauth/token` answers the standard OAuth2 `invalid_client` error shape
   even with no credentials at all (confirmed on the wire — not a 404, and the `www-authenticate:
   Bearer realm="Doorkeeper"` header on a rejected GraphQL call names the same auth engine), so
   this is **one fixed endpoint** for every Service Account; only the client id/secret differ per
   account. A Service Account's token expiry (5 minutes–30 days) is fixed by an org admin at
   creation and can't change afterward; `refresh` just re-runs the same grant.
2. **Personal Access Token** (`personal-access-token`, `type: "bearer"`) — a static token from
   `app.pipefy.com/tokens`, tied to a user, never expires. Still genuinely documented and working,
   just discouraged for production integrations — offered for a personal/single-operator setup.

Both `sign` hooks stamp `Authorization: Bearer <token>` — the standard header. **This matters
because Pipefy's own Authentication doc says otherwise**: it instructs "pass the key
`Authentication` in the request header, with `Bearer YOUR_TOKEN` as the value" (misspelled,
`Authentication` rather than `Authorization`). Confirmed wrong on the wire: a garbage
`authorization: Bearer x` header gets the real, schema-shaped rejection
(`{"error":"invalid_token","error_description":"The access token is invalid"}`, with a
`www-authenticate: Bearer realm="Doorkeeper"` response header), while the same garbage token sent
under `authentication: Bearer x` instead gets the generic, uninformative
`{"errors":[{"title":"Unauthorized","detail":"You are not authorized to access this page"}]}`
catch-all every unauthenticated request gets — i.e. the header the docs tell you to use is simply
ignored by the server. This would have cost a first integration attempt a very confusing debugging
session.

## Two independent verification sources

Pipefy's GraphQL endpoint **refuses unauthenticated introspection** (`{ __typename }` with no
token gets the same generic `Unauthorized` envelope as everything else) — unlike some other
GraphQL apps in this pack (Wave), there is no way to read the live schema without a valid
credential, which this app was built without. Every field/argument here was therefore verified
against two independent first-party sources instead of a live schema:

1. **Pipefy's own GraphQL reference docs** (`developers.pipefy.com/reference`) — real, structured
   docs with a machine-readable `.md` variant of every page (`llms.txt` indexes them) and worked
   query/mutation examples for every object.
2. **Pipefy's own open-source Terraform provider**
   ([`pipefy/terraform-provider-pipefy`](https://github.com/pipefy/terraform-provider-pipefy)) —
   a real, tested production GraphQL client for pipes, phases, Database Tables and phase fields.
   Cross-checking against it caught several fields the reference docs' worked examples simply
   didn't select (e.g. `public`/`color` on Pipe, `done`/`description` on Phase,
   `authorization`/`icon` on Table) and confirmed `createPipe`'s mutation payload actually does
   carry `pipe { id name }` — the doc's own example for that one mutation selects only
   `clientMutationId`, which would have shipped a create action that couldn't return the new
   pipe's id.

Every field/argument this app selects that came from a doc example vs. cross-verification via the
Terraform provider is called out in that field-list constant's own comment in `lib/client.ts`.

## Why arguments are inlined as GraphQL literals, not `$variables`

Because unauthenticated introspection is refused, a mutation's exact input **type name**
(`CreateCardInput`? something else?) can't be read off the schema — and GraphQL requires a
`$variable`'s declared type to match a real type name, or the whole query fails validation. Every
named action here therefore builds its query as a literal string (`gqlLiteral`/`gqlInput`/
`gqlArgs` in `lib/client.ts`) instead, exactly mirroring the shape of every worked example in
Pipefy's own docs (`createCard(input: { pipe_id: 123, title: "..." })`, never
`createCard(input: $input)`). Only the `graphql-query` escape hatch — where the caller writes and
declares their own query — uses real `$variables`, since a caller writing their own document can
declare whatever scalar-typed variables their own query actually needs.

A numeric-looking id is emitted **unquoted**: GraphQL's `ID` scalar accepts either an `IntValue` or
a `StringValue` literal (format-agnostic, per the GraphQL spec), but an `Int`-typed argument
accepts only an `IntValue` — so `123` rather than `"123"` is the one encoding that's valid whether
Pipefy typed that argument as `Int` or `ID`. A non-numeric id (a Database Table's alphanumeric id
like `"ZtEdWh"`, or a card field's slug like `"long_text_field"`) is always quoted.

## Three distinct failure shapes — only one of them GraphQL-shaped

- **A bare, unauthenticated call**: HTTP 200(!) with a REST-flavored envelope —
  `{"errors":[{"title":"Unauthorized","detail":"..."}]}`. No `data` key at all.
- **An invalid/expired bearer token**: the standard OAuth2 envelope —
  `{"error":"invalid_token","error_description":"..."}` — with neither `data` nor `errors`. This
  is not GraphQL-shaped at all.
- **A well-formed, authenticated call that fails GraphQL validation** (bad argument, unknown
  field, over the 50,000-complexity/15-deep/33-second limits documented in Pipefy's own "Limits
  and Best Practices" guide): the familiar `errors[{message, locations, path}]` shape, alongside
  `data` with the failed field `null`.

`PipefyClient.send` (`lib/client.ts`) throws on all three. Every credential-liveness `test` hook
checks all three explicitly rather than assuming the third is the only one that exists.

## No `inputErrors[]` validation channel

Unlike Wave (another GraphQL app in this pack), nothing in Pipefy's docs or its Terraform
provider's mutations shows a secondary `inputErrors[]`-style validation channel. A rejected write
here is either a top-level `errors[]` entry (already thrown by `send`) or a bare `success: false`
field — every `delete*` mutation and `moveCardToPhase` use this shape. `expectSuccess` closes that
second channel; every action selecting only `{ success }` routes through it (enforced by a test in
`tests/index.test.ts`).

## Actions (29)

**Reference** — `me-get`, `organization-list`, `organization-get`

**Pipes** — `pipe-list`, `pipe-get`, `pipe-create`, `pipe-update`, `pipe-delete`

**Phases** — `phase-list`, `phase-get`, `phase-create`, `phase-update`, `phase-delete`

**Cards** — `card-list`, `card-find` (by field value), `card-get`, `card-create`, `card-update`
(title only), `card-update-field` (a single field's value), `card-move` (to a different phase),
`card-delete`

**Database Tables** — `table-list`, `table-get`, `table-record-list`, `table-record-get`,
`table-record-create`, `table-record-update` (title only), `table-record-delete`

**Escape hatch** — `graphql-query` (arbitrary query/mutation with real `$variables`)

### `card-move` and Pipefy's "could not be moved" error

Moving a card to a phase that phase's own **Move card settings** don't allow from the card's
current phase, or to a phase in a different pipe, or leaving a destination phase's required field
empty, all fail as a top-level GraphQL error: `"Card could not be moved to phase id: <id>"` — per
Pipefy's own dedicated troubleshooting page for this exact failure. `PipefyClient.send` already
throws on it; there's no special-case handling needed.

## Deliberately out of scope

Left out because they weren't among the "most-used CRUD/query" objects this app focuses on, not
because they couldn't be verified — all reachable through `graphql-query`:

- **Labels**, **pipe/table members**, **pipe relations**, **automations**, **AI Agents**,
  **reports**, and **organization/pipe/table webhooks**.
- **Phase-field and table-field DEFINITION CRUD** (`createPhaseField`/`updatePhaseField`/
  `deletePhaseField`, `createTableField`/`updateTableField`/`deleteTableField`) — as opposed to a
  card/record's field **values**, which this app does cover (`card-update-field`, and field values
  are part of every card/record create). These were confirmed via the Terraform provider's
  `internal/pipefy/field.go` and `internal/pipefy/tablefield.go` but left unmodeled here since
  defining a pipe's schema is a much rarer workflow action than filling it in.
- **`updateFieldsValues`** (bulk multi-field update in one call, `nodeId` + `values[]`) —
  `card-update-field` covers the single-field case Pipefy's own reference documents most
  prominently.

## Health check

`health/service.ts` — Atlassian Statuspage at `status.pipefy.com`, verified as the real, claimed
page (`page.name: "Pipefy"`, `page.url: "https://status.pipefy.com/"`) rather than the inactive
`pipefy.statuspage.io` decoy (which 401s with `"Your page is inactive. Please include an API key
to access this resource."`). Anchored on the **`API (GraphQL)`** component specifically — one of
~19 components on that page (`Application`, `Billing`, `Webhooks`, `AI Automation`, …) — rather
than the page-level rollup, since this app only ever calls the GraphQL API.

No `quota` check ships: Pipefy publishes no rate-limit response header (checked signed and
unsigned) — only the query-complexity/depth/time limits from its "Limits and Best Practices"
guide, which aren't headroom a health check can read.

Both auth methods derive an `auth:<key>` credential-liveness check automatically from their `test`
hooks (2 derived checks total).

## No new runtime dependencies

Only `@w6w/types` (dev/types-only) and `@std/assert` (dev/test-only), per the app contract.
