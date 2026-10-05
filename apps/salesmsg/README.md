# Salesmsg

Business SMS and MMS: send texts, and manage contacts, conversations, tags, inboxes and numbers, on
**Salesmsg's public API v2.3**.

- **Categories** — communication, marketing
- **Auth methods** — `access-token` (a Personal Access Token, sent as a Bearer token)
- **Actions** — 27
- **Health checks** — ~~`service`~~ · ~~`quota`~~ + the derived `auth:access-token`
- **Egress allowlist** — `api.salesmessage.com`
- **Website** — https://salesmessage.com/
- **API docs** — OpenAPI 3.0 at https://app.salesmessage.com/api/docs/salesmessage-public-api-v2.3.json
  (a Postman rendering is at https://documenter.getpostman.com/view/13783878/2sBYApyDGF)
- **Status page** — https://status.salesmessage.com/ (not used, see below)

> Verified on 2026-10-05 against the OpenAPI document above (416 operations) and unauthenticated
> probes of `https://api.salesmessage.com/pub/v2.3`. No operation was exercised with a valid token,
> so response shapes are the document's, not observed ones.

## Findings most likely to cost someone a day

1. **Most writes take query parameters, not a body.** `POST /contacts`, `POST /messages`,
   `POST /messages/{conversation}`, `POST /tags`, `PUT /tags/{tag}`, `POST /conversations` and
   `POST /conversations/{id}/reassign` declare their fields as `in: query` and have no
   `requestBody`. Only `PUT /contacts/{contact}` and `POST /contacts/list` take JSON. The actions
   follow the document operation by operation. Attachments are `media_url[][url]`, repeated once
   per URL.
2. **Three collection envelopes.** `/teams`, `/conversations` and `/organization/members` answer a
   bare array; `/tags`, `/contacts/list` and paginated messages answer `{data, meta}`;
   `/contacts/search` answers `{results}`. Every list action returns `{items, meta}`. `/numbers`
   declares its 200 with no schema, so an unrecognised body comes back whole in `meta`.
3. **Credential failures share no status or body.** Unauthenticated, live: `GET /users/me` answers
   `401 {"message":"Unauthorized","auth_required":false}`. A malformed token answers
   `403 {"message":"Could not decode token: …","auth_required":true}` on `/users/me` but
   `500 {"message":null}` (`AuthorizerConfigurationException`) on `/teams`. The auth probe
   (`GET /user`, the caller's own profile, which carries no token) reads the body's wording and
   treats the status as a hint; a 500 with an empty message is reported as an unknown failure, not
   as a bad credential. How a *revoked* PAT answers was not observed.
4. **`GET /contacts` is deprecated** (one of two deprecated operations in the document; the other
   is `GET /contacts/filters/count`). Listing uses `POST /contacts/list`, which only reads and is
   tagged `contacts:write` in the document.
5. **Teams are inboxes.** `team_id` in `message-send` is the inbox to send from.
6. **No idempotency key anywhere**, so every send and create is `idempotent: false`.
7. **Rate limit**: 60 requests per minute globally, then HTTP 429 for 60 seconds.

## Auth and why there is no OAuth2

Only the Personal Access Token is shipped (Settings > Developer > Access Tokens). The document
describes an OAuth2 authorization-code flow, but not well enough to declare: the prose gives the
token URL two ways (`https://app.salesmessage.com/app/auth/token` in one sentence and
`https://api.salesmessage.com/pub/v2.3/oauth/token` in the URL table and request example), refresh
is a separate `/oauth/token/refresh` path with a `scope=public-api` quirk, and the scope names are
never enumerated beyond per-endpoint hints (`contacts:read`, `messages:write`, …). Guessing any of
that would ship a connection flow that cannot be verified, so it is left out.

## Health checks

- **`service` — declared unavailable (informational).** `status.salesmessage.com` is a real
  [Statping](https://statping.com) install named "Salesmsg Status Page"; `GET /api/services` is
  machine-readable. It monitors eleven services (AVG Platform Response Time, SMS, Broadcasts, Calls
  and seven CRM/automation integrations). None is the public API, nothing says what `SMS` probes,
  and two entries are stale (`Calls` last updated 2025-10-29). It is not read as a statement about
  this API.
- **`quota` — declared unavailable (informational).** No usage endpoint and no rate-limit header.
- **Credential** — derived `auth:access-token` from the Auth `test` hook.

## Actions (27)

| Area | Actions |
|---|---|
| Account | `user-get`, `organization-get`, `member-list`, `team-list`, `team-get`, `number-list` |
| Contacts | `contact-list`, `contact-search`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`, `contact-opt-out`, `contact-opt-in` |
| Tags | `tag-list`, `tag-create`, `contact-tag-add`, `contact-tag-remove` |
| Conversations | `conversation-list`, `conversation-get`, `conversation-start`, `conversation-close`, `conversation-open`, `conversation-assign` |
| Messages | `message-send`, `message-send-to-conversation`, `message-list` |

Page parameters differ per endpoint and are kept as the vendor spells them: `page`/`length`
(contacts, tags), `page`/`per_page` (messages), `page`/`limit` (numbers), `limit`/`offset`
(conversations).

## Left out

The document has 416 operations; this app covers 27. Not covered, by tag: Broadcasts and Recurring
Broadcasts, Triggers, Keywords, Groups, Saved Replies, Voice and Call History, Analytics, Billing,
Attachments, Contact Import, Custom Fields (and the `custom-fields` contact update, whose value
type the document does not describe), the bulk, filter, merge, note, block and link contact
operations, Website Chat, Toll-Free, Conversions, Opt-In Data Files, number purchase/release and
landline management, team and member administration, organization settings, invitations and agency
clients. `GET /conversations/find-by-contacts` is a GET with a request body and is skipped;
`GET /contacts/{contact}/conversations` is not exposed either, to keep the set small. Scheduled
and async sends (`/async/messages`) and `PUT /messages/{message}` are not covered.

## Icon

`assets/icon.svg` embeds the vendor's own 256x256 favicon PNG
(`https://cdn.prod.website-files.com/61e005adf5b93f9f89f0ddd4/61e69bcaba496cec8f1e87a2_fav-256.png`)
verbatim as base64 inside an SVG `<image>`, the same approach as `apps/addevent`.
