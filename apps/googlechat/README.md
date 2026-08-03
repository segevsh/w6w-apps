# Google Chat

Post and manage **Google Chat** messages, spaces, memberships and reactions from a workflow.

Google Chat is the team-messaging surface in Google Workspace: named **spaces**, ad-hoc **group
chats** and 1:1 **direct messages**, all addressed by resource name. This app covers the four
resources a workflow actually reaches for — spaces, messages, memberships and reactions — as the
signed-in user.

> **Google Workspace only.** The Chat API is not available to consumer `@gmail.com` accounts. A
> connection needs a Workspace account and a Google Cloud project with the Google Chat API enabled.

---

## Auth

One method: **`oauth2`** — Google's standard authorization-code flow with PKCE, acting as the
signed-in user.

| Field           | Value                                             |
| --------------- | ------------------------------------------------- |
| Authorization   | `https://accounts.google.com/o/oauth2/v2/auth`    |
| Token / refresh | `https://oauth2.googleapis.com/token`             |
| Revoke          | `https://oauth2.googleapis.com/revoke`            |
| Extra params    | `access_type=offline`, `prompt=consent`           |
| PKCE            | yes                                               |

`access_type=offline` + `prompt=consent` are what make Google reliably return a `refresh_token`.

### Scopes — three, and only three

| Scope                                             | Covers                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| `https://www.googleapis.com/auth/chat.spaces`      | list / get / create / setup / update spaces, find DM       |
| `https://www.googleapis.com/auth/chat.messages`    | message create / get / list / search / update / delete, and all reactions |
| `https://www.googleapis.com/auth/chat.memberships` | list / add / remove members                                |

Deliberately **not** requested: `chat.delete` (nothing here deletes a space), every `chat.admin.*`
(no action sets `useAdminAccess`), `chat.import`, `chat.bot` and every `chat.app.*`. Each
`.readonly` variant is a strict subset of the read-write scope above it, so asking for both would
add nothing.

`test` probes `GET /v1/spaces?pageSize=1` — the cheapest read that proves a Chat scope is live, and
one that `chat.spaces.readonly` can also reach, so a legitimately read-only credential is never
reported as broken. A user who belongs to no spaces still returns `200`.

### Why there is no service-account method

This is the one thing to get right about Google Chat, and it is not a detail.

Google Chat has **two authentication modes that are not interchangeable**:

- **User authentication** (what this app ships) — a human consents; the API acts *as that human*.
  Messages are attributed to them, and only spaces they belong to are visible.
- **App authentication** — a **Chat app** configured in the Google Chat API console, calling with
  service-account credentials and the `chat.bot` / `chat.app.*` scopes. Messages are attributed to
  the Chat app.

A bare service account is not a lighter-weight version of the first; it is the *second* mode, and it
has **no Chat presence at all** until a Chat app is configured against that Cloud project and
installed in the target space. Google documents the `chat.app.*` scopes as requiring administrator
approval and as **not** supporting user credentials or domain-wide delegation. Shipping a
service-account method here would ship a credential that cannot make a single one of the calls
below. The sibling `google-tasks` and `google-contacts` apps reached the same conclusion.

### What that rules out — and how it is handled

Every action in this app was checked against the v1 discovery document's per-method `scopes` list
and works with a **user** credential. Where an operation or a field is app-auth-only it is
**excluded and documented**, never shipped as a call that would always fail:

| Excluded                                                          | Why                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `spaces.messages.attachments.get`                                  | `chat.bot` only — app authentication, no user scope exists                                        |
| `cards`, `cardsV2`, `accessoryWidgets`, `actionResponse` on a message | documented as requiring app authentication; **Create Message** and **Update Message** send text only |
| `attachment` on a message                                          | needs a `media.upload` round-trip and app-side handling                                            |
| `useAdminAccess` on every method that offers it                    | needs a `chat.admin.*` scope this app never requests, so the flag could only produce `403`s        |
| `spaces.search`, `spaces.completeImport`                           | admin-access / import-mode only                                                                    |
| `spaces.delete`                                                    | needs the extra `chat.delete` scope; excluded so no connection is asked to grant space deletion for a rarely-automated op |
| adding a Chat **app** to a space                                   | needs `chat.memberships.app` + app authentication; **Add Member** adds humans and Google Groups    |

Two actions are the reverse case — **user-auth only**, with no app-auth equivalent at all:
**Search Messages** and the whole reaction surface (**Add Reaction**, **List Reactions**,
**Remove Reaction**). They are noted as such in their descriptions.

---

## Actions

Base URL `https://chat.googleapis.com/v1` (discovery `rootUrl` + the `v1` path prefix; the
`servicePath` is empty).

### Spaces

| Key                   | Type    | Endpoint                                |
| --------------------- | ------- | --------------------------------------- |
| `list-spaces`         | read    | `GET /spaces`                           |
| `get-space`           | read    | `GET /spaces/{space}`                   |
| `create-space`        | perform | `POST /spaces`                          |
| `setup-space`         | perform | `POST /spaces:setup`                    |
| `update-space`        | perform | `PATCH /spaces/{space}`                 |
| `find-direct-message` | read    | `GET /spaces:findDirectMessage`         |

### Messages

| Key               | Type    | Endpoint                                              |
| ----------------- | ------- | ----------------------------------------------------- |
| `create-message`  | perform | `POST /spaces/{space}/messages`                       |
| `get-message`     | read    | `GET /spaces/{space}/messages/{message}`              |
| `list-messages`   | read    | `GET /spaces/{space}/messages`                        |
| `search-messages` | search  | `POST /spaces/{space}/messages:search`                |
| `update-message`  | perform | `PATCH /spaces/{space}/messages/{message}`            |
| `delete-message`  | perform | `DELETE /spaces/{space}/messages/{message}`           |

### Memberships

| Key             | Type    | Endpoint                                    |
| --------------- | ------- | ------------------------------------------- |
| `list-members`  | read    | `GET /spaces/{space}/members`               |
| `create-member` | perform | `POST /spaces/{space}/members`              |
| `delete-member` | perform | `DELETE /spaces/{space}/members/{member}`   |

### Reactions

| Key               | Type    | Endpoint                                                          |
| ----------------- | ------- | ----------------------------------------------------------------- |
| `create-reaction` | perform | `POST /spaces/{space}/messages/{message}/reactions`               |
| `list-reactions`  | read    | `GET /spaces/{space}/messages/{message}/reactions`                |
| `delete-reaction` | perform | `DELETE /spaces/{space}/messages/{message}/reactions/{reaction}`  |

---

## Usage notes

**Resource names.** Google Chat addresses everything by resource name — `spaces/{space}`,
`spaces/{space}/messages/{message}`, `spaces/{space}/members/{member}`. Every action takes the parts
as separate fields, and `lib/client.ts` assembles them. Each field accepts **either** the bare id
**or** the full resource name, because the full name is what every API response puts in `name` and
what a user copies out of a space URL. A full name in the deeper field wins over the shallower one:

```
{ space: "A1",        message: "B1.B1" }                     → spaces/A1/messages/B1.B1
{ space: "ignored",   message: "spaces/A9/messages/B9" }     → spaces/A9/messages/B9
```

Ids are validated as single path segments, so nothing can smuggle extra path structure into a URL.
`@` is preserved rather than percent-encoded, because a membership id may legitimately be the
member's email address. Names that travel in a JSON body or a query value (`users/{user}`,
`spaces/{space}/threads/{thread}`) are validated but *not* encoded — `URLSearchParams` owns the
query case, and encoding a body value would corrupt it.

**Sending a DM.** Chat has no "message this person" call. Resolve the space first:
`find-direct-message` → `create-message`. If they have never exchanged a DM that returns `404`;
`setup-space` with `spaceType: DIRECT_MESSAGE` and one member creates it.

**Threading.** `create-message` accepts *either* `thread` (a server-assigned thread resource name
from a previous message's `thread.name`) or `threadKey` (a caller-chosen key) — never both. Pair
with `messageReplyOption` to control whether a missing thread is an error or a new thread.

**Retries.** `create-space`, `setup-space` and `create-message` pass
`ctx.invocation.invocationId` as Google's `requestId`, so a retried step returns the resource
already created rather than a duplicate. Every other `perform` either converges on the same state
(`update-*`) or reports `ALREADY_EXISTS` / `404` on a repeat, so all of them are honestly
`idempotent: true`.

**Update masks.** `update-space` requires an explicit `updateMask` of **snake_case** field paths
(`display_name`, `space_details`, `space_history_state`) even though the body is camelCase, and
`space_details` writes description and guidelines *together* — pass both or the omitted one is
cleared. `update-message` pins its mask to `text`, the only path a user credential can write.

**Search scope.** `search-messages` uses Google's `spaces/-` wildcard parent when no space is given,
which searches everything the user can see. Any parent other than `spaces/-` or one concrete space
is an `INVALID_ARGUMENT`, so narrowing to several spaces is done with `space.name` inside the filter.

---

## Health

| Key       | Kind    | What it does                                                      |
| --------- | ------- | ----------------------------------------------------------------- |
| `service` | service | Open Google Chat incidents on the Google Workspace Status Dashboard |
| `quota`   | quota   | Declared `unavailable` — Google exposes no headroom to read         |

**`service`** was verified rather than assumed. Google Chat **is** a first-class product on the
dashboard: it appears in `https://www.google.com/appsstatus/dashboard/products.json` as
`"Google Chat"`, so `incidents.json` filtered by that `service_name` can genuinely match. (Had it
been absent — as `google-contacts` found for Contacts — the right answer would have been an
`unavailable` declaration, not a filter that can never fire.) The retired **Classic Hangouts** is a
separate product entry and is deliberately not matched.

The feed is a *history*, so "up" means "no incident without an `end`". Google's impact vocabulary
maps as `SERVICE_OUTAGE → down`, `SERVICE_DISRUPTION → degraded`, `SERVICE_INFORMATION → ok`, and
several open incidents fold to the worst. A dashboard that itself fails reports `unknown`, never
`down`. `www.google.com` is allowlisted **for this hook only** and is deliberately absent from the
app's egress allowlist, so no action can reach it.

**`quota`** is `unavailable` with a stated reason and `severity: "informational"`, so the permanent
`unknown` it reports never drags a roll-up verdict down. Google publishes the *ceilings*
(3,000 message reads/writes per project per 60s, but only 60 space writes; a per-space cap of 15
reads/s and **1 write/s**) but no headroom endpoint and no rate-limit response headers — exhaustion
surfaces only as a `429`.

The credential-liveness check is derived from `auth.test` automatically; nothing extra is declared
for it.

---

## Links

| What                                     | URL                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Product                                  | https://chat.google.com                                                 |
| Product overview                         | https://workspace.google.com/products/chat/                             |
| API overview                             | https://developers.google.com/workspace/chat                            |
| REST reference (used to build this app)  | https://developers.google.com/workspace/chat/api/reference/rest         |
| Discovery document (primary source)      | https://chat.googleapis.com/$discovery/rest?version=v1                  |
| Authentication & scopes                  | https://developers.google.com/workspace/chat/authenticate-authorize     |
| User authentication guide                | https://developers.google.com/workspace/chat/authenticate-authorize-chat-user |
| Usage limits                             | https://developers.google.com/workspace/chat/limits                     |
| Status dashboard                         | https://www.google.com/appsstatus/dashboard/                            |
| Google Workspace samples (GitHub org)    | https://github.com/googleworkspace                                      |
| Generated API clients (GitHub)           | https://github.com/googleapis/google-api-nodejs-client                  |

Icon: the vendor's own mark, copied verbatim from n8n's `nodes-base`
(`nodes/Google/Chat/googleChat.svg`), matching the provenance of the other ported apps in this pack.

---

Researched and endpoint-verified 2026-08-03 against the v1 **discovery document**
(`$discovery/rest?version=v1`, revision `20260728`) — the machine-readable source for every path,
parameter, request schema and per-method scope list — cross-checked against the REST reference and
the authentication guide. Every path, query parameter, body field, enum value and scope in this app
appears in that document; nothing was inferred. Every URL above was checked for a `200`.
