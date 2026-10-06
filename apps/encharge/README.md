# Encharge

Drive [Encharge](https://encharge.io) marketing automation from a workflow: create, update, read,
archive and unsubscribe people, add and remove tags (which starts and stops Encharge flows), read
segments and the people in them, manage custom person fields, send transactional email, record
product events and subscribe webhooks.

- **Base URLs** `https://api.encharge.io/v1` (REST) and `https://ingest.encharge.io/v1/` (Ingest
  API, used only by `event-track`). Both are in `network.allow`, and nothing else is.
- **Auth** `X-Encharge-Token`, stamped by the Auth `sign` hook only. The account **API key** goes to
  `api.encharge.io`; the optional **write key** goes to `ingest.encharge.io` and nowhere else
  (both are on app.encharge.io > Account > Account Info).
- **Source of truth** docs.encharge.io (`llms.txt`, API documentation, Ingest API and Transactional
  Email API pages) and the OpenAPI 3 definition it links
  (`encharge-app-resources.s3.amazonaws.com/merged.yaml`), fetched 2026-10-06, plus live probes of
  both hosts. Nothing in either is marked deprecated, sunset or removed (searched for
  `deprecat|sunset|no longer|end of life`).
- **Icon** `assets/icon.svg` wraps the verbatim 180x180 `apple-touch-icon.png` served by
  `app.encharge.io/favicons/apple-touch-icon.png` in a base64 data URI. Encharge publishes no
  full-colour vendor SVG (its `safari-pinned-tab.svg` is a monochrome mask, not used).

## Actions (17)

| Area | Actions |
|---|---|
| Account | `account-get` |
| People | `person-get`, `person-upsert`, `person-upsert-batch`, `people-archive`, `person-unsubscribe` |
| Tags | `tag-add`, `tag-remove` |
| Segments | `segment-list`, `segment-people-list` |
| Person fields | `field-list`, `field-create`, `field-delete` |
| Webhooks | `webhook-create`, `webhook-delete` |
| Email | `email-send` |
| Events | `event-track` |

Typical flow: Create or Update Person, Add Tags to Person (a tag can be a flow trigger), later
List People in Segment to see who qualified.

## Behaviour worth knowing

- **Naming a person.** Encharge identifies people by any of `id` (Encharge UUID), `userId` (your
  own ID) or `email`. `person-get`, `people-archive` send them as `people[0][email]=…` query
  pairs (repeat the index for several people, via the `people` JSON array); `person-unsubscribe`
  sends plain `email`/`userId`/`id` query parameters; the tag actions put them in the JSON body.
  An action with none of the three fails before any request.
- **Upsert.** `POST /people` creates or updates (matched on id/userId/email). Custom fields go in
  `Other fields`; they must exist first (`field-create`). Identifiers win over a same-named key in
  that JSON.
- **Archive vs delete.** `people-archive` archives; `Permanently delete` sends `force=true` and
  erases the person's data (GDPR) irreversibly.
- **Tags are comma-separated** in one string (`"customer,beta"`), and the person must already
  exist. `tag-remove` is a `DELETE` with a JSON body.
- **Empty answers.** 201/202/204 responses have no body; those actions return `{ ok: true }`.
- **Errors.** REST failures are `{ "error": { "message", "errorCode"?, "markdown", "traceId"?,
  "stack"? } }`. Only `message` is surfaced; the server stack some responses include is dropped.
  The Ingest API answers `{ "error": "<text>" }`.
- **`event-track` needs the write key.** Without it Encharge answers `Missing Encharge write key.`
  and the request fails; the API key is never sent to the ingest host as a fallback. Encharge's
  own guidance is to use the REST API, not Ingest, when building an integration for other
  Encharge customers.
- **`email-send`** takes exactly one of `template` (name, or a numeric id sent as a number), `html`
  or `text`. HTML and text emails need `from` and `subject`. Encharge creates a recipient who is
  not yet in the account, and by default skips people who unsubscribed. The docs say the API is
  included with the Premium plan. Success is `202`.
- **Pagination.** Only `segment-people-list` pages (`limit`, `offset`); `attributes` is sent as
  repeated `attributes=` pairs. The other lists are not paginated.

## Health checks

| Check | What it does |
|---|---|
| `auth:api-key` (derived) | `GET /people?people[0][email]=w6w-connection-test@example.invalid` with the key. Passes on a 200 `users` array, or on a non-auth `{"error":{"message"}}` 404 (the request got past authentication). Refuses on a 401/403, error code 10082 (`Token without payload (should be JWT token).`) or auth wording in the message, classified from the body rather than the status. The response carries no key material. |
| `api` | Unauthenticated `GET /accounts/info`; the schema-correct `401 {"error":{"message":"User not logged in: ..."}}` is a pass (reachability). An HTML page (an unknown path answers `Cannot GET ...`), a 5xx or a non-JSON body is down. |
| `service` | Declared absence, `informational`: Encharge has no status page. `status.encharge.io` answers 200 but is an unclaimed Freshstatus shell (`"Status page not found"`), and `encharge.statuspage.io` redirects to Atlassian's marketing page. |
| `quota` | Declared absence, `informational`: no rate limit, header or usage endpoint is documented. |

## Unverified against a live account

No Encharge credential was available, so every request shape comes from the documentation and the
OpenAPI document, and the unauthenticated behaviour was probed live. One thing to know: the OpenAPI
document marks `GET/POST/DELETE /people` as API-key authenticated but marks `accounts/info`,
`fields`, `segments`, `tags`, `people/unsubscribe` and `event-subscriptions` as OAuth2 only (its
`securitySchemes` lists only `oauth2`; the `apiKey` scheme the people routes cite is not defined).
The same JWT-shaped key is rejected by the same auth layer on all of them
(`Token without payload (should be JWT token).`, code 10082), and the Transactional Email docs say
the API key authenticates against `api.encharge.io`, so this app sends the API key to all of them.
If a route turns out to want OAuth2, that action will fail with an auth error naming the token.

## Not covered, and why

- **OAuth2** (`api.encharge.io/v1/oauth/authorize|token`): credentials are issued only through a
  vendor form for integration partners.
- **Edit Person Field** (`PATCH /fields/{fieldName}`): the OpenAPI request schema marks `name`,
  `type`, `readOnly` and `array` required even for a patch, and whether a partial body is accepted
  cannot be confirmed without an account, so it is left out rather than guessed.
- **Ingest `alias` and `group` events** (change a person's id/email; create or update custom
  objects such as companies): documented, but `event-track` covers the common identify/track case
  and the object schemas are account-specific.
- **Activity Stream** (a paid add-on that posts every event to your endpoint) and **JavaScript
  event tracking** (a browser library): neither is a server-callable API.
- **Custom objects, flows, emails and forms**: no endpoints exist for them in the OpenAPI document.
