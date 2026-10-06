# Twist

Read and write **Twist** (Doist's async team messaging): workspaces, channels, threads, comments,
conversations, messages, groups, the inbox, search and webhooks, on the **Twist API v3** (v4 for
workspace users only).

- **Categories** — communication, productivity
- **Auth methods** — oauth2, api-token (bearer test token)
- **Actions** — 111
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:oauth2` and `auth:api-token`
- **Egress allowlist** — `api.twist.com` (the `service` check adds `status.twist.io` to its own hook
  allowlist, never to the app's)
- **Website** — https://twist.com/
- **API docs** — https://developer.twist.com/v3/
- **Status page** — https://status.twist.io/

> Verified against Twist's own developer docs and live probes of `api.twist.com` and
> `status.twist.io` on 2026-10-06.

## The things most likely to go wrong

### 1. Reading your own user returns your live API token

`users/get_session_user` and `users/update` return a User object that includes `token`, the user's
API token. Those two actions delete the field before returning, so a workflow never receives or logs
the credential. For the same reason the auth probe is **not** the whoami call: it uses
`GET /api/v3/workspaces/get`, and the connection label calls `get_session_user` and keeps only
`name` and `id`.

### 2. A missing token and an invalid token look the same

Both return **HTTP 403** with `error_code` `200`. `120` is "not logged in". `109` is Forbidden and
means the token is valid but lacks a scope or access to that resource. The probe classifies from the
response body, never from the status code: an array body is a pass, `200`/`120` is a rejected
credential, `109` is accepted with a scope message, anything else is a failure.

### 3. Workspace users live on v4 only

The v3 `workspace_users` endpoints are deprecated. All ten workspace-user actions call
`/api/v4/workspace_users/*`; everything else is v3.

### 4. Bodies are form-encoded, lists are JSON strings

POST bodies are `application/x-www-form-urlencoded` and GET parameters go in the query string. List
parameters (`ids`, `recipients`, ...) are JSON-encoded strings: the action accepts `1, 2` and sends
`[1,2]`. The docs mix form examples with JSON-looking lists, so this is an assumption taken from the
documented examples and covered by unit tests, not something a live write was run against.

### 5. Closing a thread is a comment

There is no close or reopen endpoint. `comments/add` with `thread_action` of `close` or `reopen`
does it, and the two actions here are thin wrappers around that.

## Auth

- **oauth2** — authorize `https://twist.com/oauth/authorize`, token `https://twist.com/oauth/access_token`,
  27 scopes, comma separated, no PKCE. OAuth endpoints report errors as `{error, error_message}`;
  the API reports `{error_code, error_string, error_extra, error_uuid}`. Both are handled.
- **api-token** — the bearer test token from the Twist integration console. Credentials are only
  attached in `sign`; no action sets an `Authorization` header.

## Health checks

- **service** — Instatus page `status.twist.io` (`/summary.json`, `/components.json`). The page
  name must be `Twist`; the API component is matched by id, falling back to name. The Website
  component is ignored. A page-level fallback is capped at degraded. If the status page itself is
  down the result is `unknown`.
- **api** — unsigned dependency check on `GET /api/v3/workspaces/get`. A Twist error body or an
  array means the API is up; non-JSON or 5xx is down; any other JSON is unknown.
- **quota** — unavailable, severity `informational`. Twist exposes no rate-limit or quota endpoint.

## Deliberately omitted

| Endpoint                                        | Why                                                         |
| ----------------------------------------------- | ----------------------------------------------------------- |
| login, password and token endpoints             | Credential handling belongs to the auth methods             |
| `users/delete`, `invalidate_token`, `validate_token` | Destructive account actions or the credential in the body |
| workspace remove                                | Irreversible workspace destruction                          |
| avatar and attachment upload                    | Multipart bodies, which `ctx.fetch` helpers here do not build |
| `away_mode`                                     | Account preference, not workflow material                   |
| conversation `remove_user(s)`                   | Documented as GET for a state change                        |
| deprecated v3 `workspace_users`                 | Replaced by the v4 actions                                  |
