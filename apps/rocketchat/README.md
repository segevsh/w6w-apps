# Rocket.Chat

Talk to a [Rocket.Chat](https://rocket.chat) Cloud workspace from a workflow: post and thread
messages, read channel, group and direct-message history, search a room, manage channels and
private groups, open DMs, and look up users.

- **Category** communication
- **Base URL** `https://<workspace>.rocket.chat/api/v1`. The host is per-workspace, so the manifest
  declares the narrow wildcard `*.rocket.chat` (any subdomain, not the apex) and the workspace
  name is a connection field republished as `connection.display.workspace`.
- **Auth** one method, a Personal Access Token: `X-Auth-Token` plus `X-User-Id` headers, stamped by
  the Auth `sign` hook only. Both headers are `required: true` on every operation in the spec; a
  token without its user id is rejected.
- **Source of truth** the vendor's OpenAPI documents at `github.com/RocketChat/Rocket.Chat-Open-API`
  (`authentication`, `messaging`, `rooms`, `user-management`), fetched 2026-10-06, plus one
  unauthenticated probe of the public workspace `open.rocket.chat` (server 8.10) to read the real
  error envelope.
- **Not supported: self-hosted.** A self-hosted server (or a Cloud workspace on a custom domain) is
  addressed by a URL the manifest cannot enumerate, and the only way to allow it is `network.allow:
  ["*"]`, which disables egress restriction entirely. This app stays on `*.rocket.chat`.

## Connecting

1. In Rocket.Chat: **Profile > My Account > Personal Access Tokens > Add**. Copy the token and the
   **User ID** shown with it (shown once).
2. Connection fields: **Workspace** (`acme` for `https://acme.rocket.chat`; a pasted URL also works),
   **User ID**, **Personal Access Token**.

The token carries the permissions of its user. Mark it "Ignore Two Factor Authentication" if the
user has 2FA and the workflow runs unattended. `afterConnect` labels the connection
`<username> @ <workspace>`.

## Actions (25)

| Area | Actions |
|---|---|
| Messages | `post-message`, `send-message`, `update-message`, `delete-message`, `get-message`, `search-messages`, `react-to-message`, `pin-message` |
| Channels | `list-channels`, `get-channel`, `create-channel`, `invite-to-channel`, `get-channel-history`, `list-channel-members`, `set-channel-topic` |
| Private groups | `list-groups`, `get-group`, `create-group`, `invite-to-group`, `get-group-history` |
| Direct messages | `create-dm`, `get-dm-history` |
| Users | `get-user`, `list-users`, `get-me` |

Typical flow: **Create Direct Message** with a username, then **Send Message** with the returned
`room._id`; or **Post Message** straight to `#channel` / `@username`.

## Verified against the spec, and what it does not say

- **`chat.postMessage` vs `chat.sendMessage`.** Neither is marked deprecated; both are included.
  Post Message takes `#channel` / `@user` shorthand and a flat body; Send Message takes a
  `{ message: { rid, msg, ... } }` envelope and a room id only, plus UI `blocks` and `tshow`.
- **Thread replies need the `roomId` body variant.** `chat.postMessage` documents two body shapes
  (`roomId` and `channel`); only the `roomId` one lists `tmid`. Post Message always sends `roomId`,
  which accepts a room id, `#name` or `@user`.
- **`dm.*`, not `im.*`.** The spec documents `dm.create` / `dm.history` (its only `im.*` entry is
  `im.blockUser`). The older `im.*` route names are not used.
- **`query` and `fields` are not exposed.** The list endpoints take a raw MongoDB `query`/`fields`;
  the spec calls `query` "unsafe and deprecated", `users.info` removed `fields` in 7.0.0, and servers
  may refuse both without the `ALLOW_UNSAFE_QUERY_AND_FIELDS_API_PARAMS` environment variable.
  Filtering is by `email` (Users), `filter` (channel members), `sort` and `count`/`offset` only.
- **`channels.history` documents the wrong response.** Its 200 schema is a copy of a file listing
  (`files[]`), but its own example, and the server, return `messages[]`. Get Channel History follows
  the example. The spec for `groups.history` and `dm.history` says `messages[]`.
- **Reactions toggle by default.** `chat.react` without `shouldReact` flips the reaction, so a
  retry would undo it. React to Message always sends `shouldReact` (default `true`).
- **Invites differ per room type.** `channels.invite` takes user IDs (`userId` or `userIds[]`);
  `groups.invite` also takes usernames, so the group action works from usernames directly.
- **`users.info` takes exactly one identifier** (`userId`, `username`, `email`; `importId` and
  `freeSwitchExtension` also exist and are not exposed). The action refuses zero or several.
- Errors are `{"success": false, "error": "...", "errorType": "..."}`, and an unauthenticated 401
  is `{"success": false, "status": "error", "message": "You must be logged in to do this."}`.
  The client reads whichever of `error` / `message` is present and also treats a 200 carrying
  `success: false` as an error.

Left out because the spec was not needed for a core messaging surface: file uploads, threads
listing, message follow/star/report, room moderation and settings, teams, integrations/webhooks,
omnichannel, user creation and admin endpoints.

## Health checks

| Check | What it does |
|---|---|
| `service` | Declared absence, `informational`. `status.rocket.chat` is a custom HTML page; verified 2026-10-06 that `/api/v2/summary.json`, `/index.json`, `/history.atom`, `/rss` and `/api/v1/components` all answer 404 and `/api/v1/incidents` answers `[]`. |
| `site` | `dependency`, per connection, `credential: context`. Unsigned `GET /api/v1/me` on the connection's own workspace; Rocket.Chat's JSON 401 passes (it proves the API answers), an HTML body or 5xx is `down`. |
| `quota` | Declared absence, `informational`: no usage endpoint or rate-limit header is documented. |
| `auth:personal-access-token` | Derived from `test`: `GET /api/v1/me` must return 200 with an `_id`. A 200 without one is a failure, not a pass. `/me` returns the profile only, never the token. |

## Icon

`assets/icon.svg` is the Simple Icons `rocketdotchat` mark, downloaded verbatim from
`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/rocketdotchat.svg`. It has no fill, so it
renders black; `assets/icon.dark.svg` is the generated white variant for dark tiles
(`_tools/icon-legibility.ts fix`).

## Tests

`deno task test` runs 77 tests with a mocked `HookContext` (fake `ctx.fetch`, no-op `ctx.log`): the
entry module, the client, the auth method, the health checks and each of the 25 actions.
