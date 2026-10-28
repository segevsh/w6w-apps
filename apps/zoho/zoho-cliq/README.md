# Zoho Cliq

W6W app for [Zoho Cliq](https://www.zoho.com/cliq/): post messages and files to channels, chats,
users and bots, manage channels and their members, read users, teams and chats, and manage
reminders. 32 actions, OAuth2 only, covering all nine Zoho data centres.

API reference: <https://www.zoho.com/cliq/help/restapi/v2/>. Every endpoint here is taken from that
reference and the paths were probed unauthenticated on every data centre (all answered `401`).

## Hosts and data centres

The API host is `cliq.zoho.<tld>` directly (not the `zohoapis` gateway). Each data centre is its own
auth method, because OAuth URLs are static per method. On connect the app records
`{apiHost, region}` on the connection and the client reads it from there.

| Region | API host | Accounts host |
| ------ | -------- | ------------- |
| US | cliq.zoho.com | accounts.zoho.com |
| EU | cliq.zoho.eu | accounts.zoho.eu |
| India | cliq.zoho.in | accounts.zoho.in |
| Australia | cliq.zoho.com.au | accounts.zoho.com.au |
| Japan | cliq.zoho.jp | accounts.zoho.jp |
| Canada | cliq.zohocloud.ca | accounts.zohocloud.ca |
| China | cliq.zoho.com.cn | accounts.zoho.com.cn |
| Saudi Arabia | cliq.zoho.sa | accounts.zoho.sa |
| UK | cliq.zoho.uk | accounts.zoho.uk |

Canada breaks the pattern on both hosts: `cliq.zoho.ca` does not resolve. `network.allow` lists
exactly these nine API hosts.

## Auth setup

1. Register a Server-based Application in the Zoho API Console of the data centre your org lives in.
2. Pick the matching auth method (e.g. "Zoho Cliq (US)"). Picking the wrong data centre gives an
   `invalid_client` / `invalid_code` error from the accounts host, not a Cliq error.
3. Scopes requested (`access_type=offline`, `prompt=consent` so a refresh token is issued):
   `ZohoCliq.Channels.ALL`, `ZohoCliq.Chats.READ`, `ZohoCliq.Users.READ`, `ZohoCliq.Teams.READ`,
   `ZohoCliq.Messages.READ`, `ZohoCliq.Messages.UPDATE`, `ZohoCliq.Messages.DELETE`,
   `ZohoCliq.Webhooks.CREATE`, `ZohoCliq.Reminders.ALL`.
4. The credential travels as `Authorization: Zoho-oauthtoken <token>` and is set only in `sign`.

The connection test calls `GET /api/v2/channels?limit=1`. A missing token returns a blank-body 401,
a bad token returns JSON; both are reported as failures with the vendor's message, never guessed
from the status code alone.

## Actions

| Resource | Actions |
| -------- | ------- |
| User | `user-list`, `user-get`, `user-team-list` |
| Chat | `chat-list`, `chat-member-list` |
| Channel | `channel-list`, `channel-get`, `channel-create`, `channel-update`, `channel-delete`, `channel-member-list`, `channel-member-add`, `channel-member-remove`, `channel-join`, `channel-leave` |
| Team | `team-list`, `team-get` |
| Message | `message-list`, `message-get`, `message-post-channel`, `message-post-chat`, `message-post-user`, `message-post-bot`, `message-edit`, `message-delete` |
| File | `file-share-channel`, `file-share-chat`, `file-share-user` |
| Reminder | `reminder-create`, `reminder-list`, `reminder-delete`, `reminder-complete` |

Notes:

- Posts, creates and file shares are non-idempotent; edit, delete and member changes are idempotent.
- Many mutations answer `204` with no body; those actions return `{ success: true }`.
- Message ids can contain a space; path segments are always URL-encoded.
- Bot messages take `userids` as a comma-separated string; the action joins an array for you.
- A reminder takes at most 4 assignees.
- File uploads are multipart with the field named `file`. The docs are inconsistent (`file` vs
  `files`); `file` is what this app sends.
- Only the bot `broadcast` parameter is deprecated; it is not exposed.

## Not yet covered

Add-user (docs inconsistent); Cliq network (`/network/{name}/api/v2`) endpoints; events and
calendars; user and role admin (user fields, statuses, departments, roles, designations, remote
work/check-in); databases, widget map tickers, custom domain/email, extensions; maintenance CSV
exports; threads, scheduled messages, bot subscribers/calls, mute/unmute, pinned messages, leaving a
group chat, reactions, channel permissions/approve/reject/archive/unarchive; file download
(`GET /files/{id}`), bot file share, mediasessions (calls); team create/update/delete/members;
reminder get/update/snooze.

## Health checks

- `service`: Zoho's StatusIQ feed (`https://us.zohostatus.com/rss`), matched on the exact component
  "Zoho Cliq". It is the US status page only; other data centres' incidents may not appear there.
- `quota`: unavailable, with `severity: "informational"` (Cliq publishes no quota endpoint).

## Icon provenance

zoho.com/cliq/ serves no favicon. `assets/icon.svg` is
<https://www.zohowebstatic.com/sites/zweb/images/productlogos/cliq.svg> saved verbatim (an Adobe
Illustrator export, viewBox `0 0 672 296`, a wide logo).
