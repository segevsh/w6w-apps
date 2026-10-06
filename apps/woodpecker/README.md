# Woodpecker

Cold email and multichannel outreach through [Woodpecker](https://woodpecker.co) (30 actions).
API reference: <https://developers.woodpecker.co>. Base URL `https://api.woodpecker.co/rest`.

## Auth

One method, `api-key`: an API key from Woodpecker > Add-ons > API & Integrations > API keys,
sent as the `x-api-key` header by the `sign` hook (never inside an action). The plan needs the
API add-on. Connection test: `GET /rest/v2/users` (the user list, never a key); the verdict is
read from the body (`detail: "Invalid api key"`, `"No API addon"`, `"Upgrade your plan"`), not
the status code.

## Actions

| Key | Title | Type |
|---|---|---|
| `blacklist-domain-add` | Blacklist Domains | perform |
| `blacklist-domain-list` | List Blacklisted Domains | read |
| `blacklist-domain-remove` | Remove Blacklisted Domains | perform |
| `blacklist-email-add` | Blacklist Emails | perform |
| `blacklist-email-list` | List Blacklisted Emails | read |
| `blacklist-email-remove` | Remove Blacklisted Emails | perform |
| `campaign-delete` | Delete Campaign | perform |
| `campaign-get` | Get Campaign | read |
| `campaign-list` | List Campaigns | read |
| `campaign-pause` | Pause Campaign | perform |
| `campaign-run` | Run Campaign | perform |
| `campaign-stats-get` | Get Campaign Statistics | read |
| `campaign-stop` | Stop Campaign | perform |
| `campaign-update` | Update Campaign Settings | perform |
| `inbox-message-list` | List Inbox Messages | search |
| `inbox-message-reply` | Reply to Inbox Message | perform |
| `linkedin-account-list` | List LinkedIn Accounts | read |
| `mailbox-get` | Get Mailbox | read |
| `mailbox-list` | List Mailboxes | read |
| `mailbox-update` | Update Mailbox Footer | perform |
| `manual-task-list` | List Manual Tasks | read |
| `prospect-add-to-campaign` | Add Prospects to Campaign | perform |
| `prospect-add` | Add Prospects | perform |
| `prospect-delete` | Delete Prospects | perform |
| `prospect-list` | List Prospects | read |
| `prospect-response-list` | List Prospect Responses | read |
| `prospect-search` | Search Prospects | search |
| `prospect-update-in-campaign` | Update Prospects in Campaign | perform |
| `prospect-update` | Update Prospects | perform |
| `user-list` | List Users | read |

## Notes from the vendor docs (read 2026-10-06)

- **Two API versions.** Prospects, the campaign list and campaign statistics are `/rest/v1`;
  campaign settings and control, mailboxes, users, inbox, blacklist, LinkedIn accounts and
  manual tasks are `/rest/v2`. The v1 error envelope is `{status: {code, msg}}`, v2's is
  `{title, status, detail}` or `{code, message, details}`; both are surfaced as the error message.
- **A v1 import can fail inside a 200 body** (`status.status: "ERROR"`); that throws. Per-prospect
  errors in a partly successful import stay in the returned `prospects` array.
- **Rate limit is concurrency.** One request at a time per account, six queued for up to 15 s,
  then `429`. Prefer few large imports (up to 20,000 prospects per request).
- **Pagination differs per endpoint:** prospects 1-based `page`/`per_page` (total in the
  `X-Total-Count` header, returned as `total`), users 0-based `page`, inbox an opaque cursor
  (`nextCursor`), manual tasks a `limit`. Blacklists take `page`/`per_page` (max 500).
- Run, pause, stop, delete, reply, mailbox update and prospect delete answer `200` with no body.
- `prospects` for the import actions is a JSON array (the vendor's own field names, including
  `snippet1` to `snippet15`).

## Not covered

Left out rather than guessed; each is documented by Woodpecker but outside this app's core surface:

- Creating campaigns and editing steps: Create campaign / draft / simple campaign, Edit campaign, Add / update / delete step and step version (a deep nested payload).
- Bounce Shield threshold get / set / clear.
- Reports (asynchronous: a generated hash is fetched from `/rest/v2/reports/{hash}`).
- Lead Finder search and enrichment, prospect enrichment, LinkedIn profile collection.
- Mailbox creation (bulk, Microsoft Graph credentials, connection batches), domain search, ordering, mailboxes and forwarding.
- Agency APIs (companies, API keys, guests, agency blacklist), webhooks, MCP and CLI.

## Health

- `service`: status.woodpecker.co (Atlassian Statuspage, page id `rdk94jp5vv6h`); the
  "Woodpecker API" component decides, other components are detail.
- `quota`: declared unavailable (informational): the vendor documents a concurrency limit, not a remaining-requests counter.
- one derived `auth:api-key` check from the connection test.
