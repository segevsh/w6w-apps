# DICE
Read the [DICE Ticket Holders API](https://partners-endpoint.dice.fm/graphql/docs/index.html)
from w6w. The integration uses the partner GraphQL endpoint at
`https://partners-endpoint.dice.fm/graphql` and a bearer API token generated in **MIO**.
It has ten actions and requires no database driver or new runtime capability.

## Connect

Create a DICE connection using **MIO API token**, then paste the token without the `Bearer`
prefix. The token's partner permissions determine which events, records, and fields are visible.
The credential check queries only `viewer { id name }`; it does not fetch ticket-holder data or
echo the token. Credentials are interpreted and stamped only by the auth module's sign function.
The current runtime gives ordinary bearer auth tests an unsigned fetch, so the auth test reuses
that same sign function before sending its probe. Actions use the runtime's signed `ctx.fetch`.

## Actions

| Action | Result and purpose |
| --- | --- |
| `viewer-get` | Authenticated partner ID and name. |
| `events-list` | One page of event metadata; optional start-date filter. |
| `event-get` | One event by GraphQL ID, including artists, venues, and ticket types. |
| `tickets-list` | Ticket-holder records, barcode, amounts, claim time, and ticket type; optional event ID. |
| `orders-list` | Order amounts, purchase time, quantity, channel, and event; optional event ID and purchase date. |
| `returns-list` | Returns and related ticket/order IDs; optional event ID and return date. |
| `extras-list` | Purchased extras and product/ticket metadata; optional event ID. |
| `ticket-transfers-list` | Transfer timestamps and related ticket/order IDs; optional event ID and transfer date. |
| `genre-types-list` | Event genre-type IDs and names. |
| `graphql-query` | Native GraphQL document, variables, and optional operation name; returns `{ data }`. |

**Restricted access:** DICE marks many fields as restricted, including event names/dates,
ticket barcodes, holders, ticket types, and some financial details. The ticket-holder action
intentionally selects holder names, email, and partner opt-in status for attendance and reporting.
It requires permission to those fields. The order and extra list defaults avoid buyer/holder
personal data. Use the native query action to request a narrower selection for a restricted token.
A permission error fails the action; it is never reported as an empty list or a complete partial
financial/attendance result. DICE's `optInPartners` is preserved as data, not interpreted as consent
for any particular downstream use.

## Rows and pagination

Every list action fetches **one page**, with page size 50 by default and an app-enforced range
of 1–500. This ceiling is an app choice, not a claimed DICE service maximum. The result is:

```json
{
  "rows": [{ "id": "opaque-record-id" }],
  "rowCount": 1,
  "totalCount": 25,
  "page": { "hasMore": true, "nextCursor": "opaque-cursor" },
  "pageInfo": { "hasNextPage": true, "endCursor": "opaque-cursor" }
}
```

Use `rows` as the input to a For each node. To fetch another page, pass `page.nextCursor` into
**After**, retaining the same filters, while `page.hasMore` is true. No action silently loops
through every page. `rowCount` counts returned rows; `totalCount` is the server's nullable total.
The native `pageInfo` is preserved. A final page has a null normalized next cursor even when the
server provides an end cursor. Missing rows or unusable continuation information fail explicitly.

Use **Additional filters** for the documented resource's `*WhereInput` object, for example:

```json
{ "purchasedAt": { "gte": "2026-11-01T00:00:00Z" }, "eventId": { "eq": "event-id" } }
```

Filters set in the visual fields cannot also appear in Additional filters; conflicting values
are rejected instead of silently overriding one another. All values travel as GraphQL variables,
including IDs, dates, and cursors. Identifiers returned by GraphQL are opaque; do not substitute
an event URL or assume it is the same as another DICE event identifier.

Money remains in **integer cents**, as the API returns it. Nullable fields remain null. The app
does not convert amounts to floating point or flatten nested ticket/holder objects.

## Native GraphQL

The query action accepts a GraphQL document and a separate JSON variables object. For example:

```graphql
query MyEvents($first: Int) {
  viewer {
    events(first: $first) {
      pageInfo { endCursor hasNextPage }
      edges { node { id name } }
    }
  }
}
```

Variables: `{ "first": 10 }`. Set Operation name to `MyEvents` when selecting among several
operations in one document. The action is conservatively marked `perform`, `idempotent: false`
because it forwards caller-authored documents without trying to infer their safety. The published
API documents queries; this integration supplies no invented mutations.

Every response is checked for both HTTP errors and GraphQL errors, including HTTP 200 with
`errors` and responses containing both `data` and `errors`. Upstream error messages are not
copied into logs or exceptions because they can echo query values. Queries, variables, and row
contents are not logged by the app.

## Health and verification

- `api`: unsigned partner-API probe every five minutes at most. On 2026-11-05 both missing and
  deliberately invalid tokens returned HTTP 401 with
  `{ "error": "unauthorized", "description": "unauthorized", "key": "error_unauthorized" }`.
  That exact refusal proves reachability; it does not prove a credential works. HTML and arbitrary
  JSON 200s do not pass.
- `auth:api-token`: derived credential check using `viewer { id name }`.
- `service`: unavailable, informational. No official partner-API status feed was found;
  `status.dice.fm` did not resolve, and `dice.statuspage.io` returned an unrelated HTML shell for
  `/api/v2/summary.json`, `/index.json`, and `/history.atom`.
- `quota`: unavailable, informational. No quota endpoint is documented and no headroom header
  appeared on the unsigned probes. Authenticated quota headers have not been verified.

Tests cover every action, variable binding, continuation, nulls, failed/partial responses, auth,
and health classification. The implementation was checked against the published schema reference
and live unauthenticated/invalid-token responses. On **2026-11-05**, all ten actions also passed
authenticated, read-only checks through the real `@w6w/runtime` `loadApp` and `invoke` path using
an in-memory connection. Verification covered a one-row page from every list, fetching an event
by its returned ID, continuing the event list with its returned cursor, partner metadata, and a
native GraphQL partner query. The token was not stored, and no raw partner data was logged.

Run `npm test` with Node 24, or `deno task test`. Also run `deno task check`, `deno task lint`,
`deno task fmt`, and `deno task validate`.

## Scope and artwork

This release does not create events, sell tickets, issue refunds, check fans in, or register
webhooks. No such operations are documented in the supplied Ticket Holders API. It does not expose
visual sorting or promise arbitrary SQL-style filters: the API defines its own filter inputs and
cursor order. Other documented nested fields can be selected through native GraphQL.

`assets/icon.svg` is the verbatim
[DICE wordmark](https://upload.wikimedia.org/wikipedia/commons/6/66/DICE_logo_2022.svg), whose
[source record](https://commons.wikimedia.org/wiki/File:DICE_logo_2022.svg) attributes the artwork
to DICE's press kit. `icon.dark.svg` is the pack's sanctioned white-ink variant generated by
`_tools/icon-legibility.ts`; its geometry is unchanged. The original artwork is not generated.

## Triggers

| Trigger — title | Mechanism | Wrapped list action | What the run gets |
| --- | --- | --- | --- |
| `new-order` — New Order | Poll | `orders-list` | Each newly purchased order |
| `new-return` — New Return | Poll | `returns-list` | Each newly recorded ticket return |
| `new-ticket-transfer` — New Ticket Transfer | Poll | `ticket-transfers-list` | Each newly recorded ticket transfer |

Each check calls the existing list action with its documented on-or-after filter (`purchasedAfter`, `returnedAfter`, `transferredAfter`) set two minutes before the previous check and de-duplicates by id; the first check only records what exists. An optional Event ID narrows the feed. A window of more than three pages of 100 is read across successive checks from a saved page position, and the checkpoint moves forward only once the whole window has been read.

Source: [DICE partner GraphQL API](https://partners-endpoint.dice.fm/graphql/docs/index.html) (verified 2026-11-09).
