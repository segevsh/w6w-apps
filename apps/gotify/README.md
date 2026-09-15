# Gotify

Send and manage push notifications through a self-hosted Gotify server.

- **Categories** — communication, monitoring
- **Auth methods** — client-token
- **Actions** — 12
- **Egress allowlist** — `*` (self-hosted — see below)
- **Website** — https://gotify.net
- **API docs** — https://gotify.net/api-docs · schema:
  https://raw.githubusercontent.com/gotify/server/master/docs/spec.json
  (OpenAPI/Swagger 2.0, `info.version: "2.1.0"`; fetched 2026-09-15), cross-checked
  against the handler source in `gotify/server` (`api/*.go`, `auth/authentication.go`,
  `router/router.go`) for behaviour the spec document alone doesn't state

## Setup

### Client Token

1. In the Gotify web UI: **Settings → Clients → Create Client**.
2. Paste the token it shows into the connection, along with the **Instance
   URL**.
3. Do **not** paste an *application* token here — see below.

### Two token types, and why this app asks for the one it does

Gotify issues two kinds of token:

- an **application token** — meant for whatever *sends* notifications
  (`POST /message` only), and
- a **client token** — meant for whatever *receives and manages* them: the
  official apps, and anything that lists, prunes or configures.

`POST /message` accepts either, per the spec's own `security` list for
`createMessage` — but every other action here (listing/pruning messages,
managing applications and clients) needs a client token specifically. So this
app's one Auth method asks for a client token, not an application one. An
application token pasted in by mistake will send messages fine and then 403
on everything else — a confusing way to discover the distinction after the
fact. The connection test (`GET /current/user`) catches this at connect time,
since that endpoint has no meaning for an application token at all.

### The header is `X-Gotify-Key`, not `Authorization: Bearer`

Gotify accepts three equivalent forms for either token type — the
`X-Gotify-Key` header, `Authorization: Bearer <token>`, or a `?token=` query
parameter (the spec's own `info.description`, confirmed in
`auth/authentication.go`). `X-Gotify-Key` is used here: it needs no prefix to
get wrong, and unlike the query parameter it never lands a credential in a
URL, a proxy log, or browser history.

### Why the allowlist is `*`

Gotify is self-hosted by design — there is no shared `api.gotify.net`, only
whichever instance an operator runs. So the base URL is a connection field
and the egress allowlist has to be open, the same posture this pack already
uses for `gitea`, `mautic`, `tableau` and `bubble`. It is deliberately wide,
and it is the price of an app whose server address only the operator knows.

## Actions

| Key | Type | Description |
|---|---|---|
| `message-send` | perform | Push a notification |
| `message-list` | read | List messages, optionally scoped to one application |
| `message-delete` | perform | Delete one message by id |
| `message-delete-all` | perform | Delete every message, or every message for one application |
| `application-list` | read | List applications (message senders) |
| `application-create` | perform | Create an application and mint its token |
| `application-update` | perform | Rename an application or change its priority |
| `client-list` | read | List clients (receivers/managers) |
| `client-create` | perform | Register a client and mint its token |
| `client-update` | perform | Rename a client or change its inactivity expiry |
| `user-get` | read | The account this client token belongs to |
| `version-get` | read | The connected server's version, commit and build date |

## Three things that would have cost a day

### 1. `appid` is required with a client token — and silently ignored with an application token

`POST /message`'s own handler doc comment (`api/message.go`) spells it out:
*"When authenticating with a client token or basic auth, the request body
must include `appid` … When authenticating with an application token, the
application is derived from the token and any `appid` in the body is
ignored."* Nothing in the OpenAPI document itself says this — the `appid`
field on `CreateMessage` is optional in the schema. A client-token request
that omits it gets `400 "appid is required when not authenticating with an
application token"`.

Since this app's Connection is always a client token, `message-send`'s
`applicationId` parameter is `required: true` rather than left optional per
the schema.

### 2. Deleting an Application or a Client needs more than a valid token

`DELETE /application/{id}` and `DELETE /client/{id}` sit behind
`RequireElevatedClient` in the server's router (`router/router.go`) — a
**freshly re-authenticated** client session (a WebAuthn ceremony via
`POST /client/{id}/elevate`), not merely a valid, fully-privileged token. The
OpenAPI document's `security` list for both endpoints is identical to every
other client-token route; the elevation requirement exists only in
`auth/authentication.go`'s `checkClientElevated` and is invisible to anyone
reading the spec alone. Call either with a plain client token — even one
created five seconds ago with every intended permission — and Gotify answers
`403 "session not elevated, use basic auth or call /client:elevate"`.

A stored API credential has no way to perform a WebAuthn ceremony, so both
actions are **left out of this app** rather than shipped to fail every time.
The error message itself names the one thing that *would* satisfy the check
— HTTP Basic Auth with the account's own username and password, which bypasses
the elevation requirement entirely (`evaluate()` tries `handleUser` — basic
auth — before `handleClient`). That trade (a revocable, scoped token vs. the
full account password) is deliberately not offered as a second auth method
here, for the sake of two destructive actions. If you need to delete an
application or client from a workflow, that is the vendor's own answer:
issue the request yourself with basic auth.

### 3. A listed application/client token is not a secret — because it isn't a credential

Gotify's newer token format is an ed25519 keypair: creation mints a
public/private pair and returns the **private** (usable) form exactly once,
in `application-create`'s / `client-create`'s own response. Every
subsequent read — `application-list`, `client-list`, and even
`application-update`'s own response — returns or DB-stores only the
**public** form, which identifies the application/client but cannot
authenticate as it (`auth/token.go`, `GenerateApplicationToken`/
`GenerateClientToken`). `GetApplications`/`GetClients` additionally blank
the field outright (`app.Token = ""`) before responding.

Capture the token from the `*-create` action's own output. There is no way
to recover it afterwards short of creating a new application or client.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** server healthy — app and database? |
| `service` | service | Declared unavailable — the question does not apply |

`instance` reads `GET /health`, the endpoint Gotify ships for exactly this
purpose (`api/health.go`): it pings the database and answers
`{"health": "green"\|"orange", "database": "green"\|"red"}`, with a failed
ping answering **HTTP 500** carrying `{health: "orange", database: "red"}`
rather than a bare transport error — so this check reads the response body on
both 200 and 500, never the status code alone. `green` maps to `ok`, `orange`
to `degraded`, anything else to `down`. It sends no credential: `/health`
needs none, and an expired client token must not make a healthy server look
down.

`service` is a **declared absence**: Gotify is self-hosted *software*, so
there is no vendor running the instance a connection points at, and
`gotify.net` is documentation for the project rather than a hosted product
with a status of its own. `instance` is the check that answers the real
question, by asking the server directly.

## What this app deliberately does not do

- **`application-delete` / `client-delete`.** See finding #2 above.
- **Application images** (`POST`/`DELETE /application/{id}/image`) — a binary
  upload with no clean fit in a text-first param form.
- **`PUT /application/{id}/security`** — configures per-application stream
  token rotation, and is itself elevation-gated like the deletes above.
- **Plugins** (`/plugin/*`) — a plugin's config schema is defined by the
  plugin binary installed on that instance, not by Gotify itself, so there is
  no fixed shape to build params from.
- **The WebSocket `/stream`** — a long-lived connection, not a request/response
  call.
- **OIDC/local login and user administration** (`/auth/*`, `/user/*` under
  `RequireAdmin`) — about *operating* a Gotify instance, not about sending and
  triaging the notifications that pass through it.

## Errors

Gotify's error envelope is `{"error", "errorCode", "errorDescription"}` on
every non-2xx response. `errorDescription` is what actually says what went
wrong — `error` alone just repeats the HTTP reason phrase. Failures thrown by
this app's client surface `errorDescription` (falling back to `error`, then
the raw body) alongside the status.
