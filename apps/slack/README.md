# Slack

Post messages, manage channels, files, reactions, stars, users and user groups on Slack.

- **Categories** — communication
- **Auth methods** — access-token, oauth2
- **Actions** — 47
- **Triggers** — 25 (webhook + poll)
- **Egress allowlist** — `slack.com`
- **Website** — https://slack.com
- **API docs** — https://api.slack.com

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `new-message` — New Message | webhook (manual Events API receiver) | `message.*` events | channel, user, text, message `ts`, thread `ts`, bot flag, the raw event |
| `event` — Slack Event | webhook (manual Events API receiver) | any subscribed Events API event, optionally narrowed by type | event type, subtype, channel, user, the raw event |
| `app-mention` — App Mentioned | webhook (manual Events API receiver) | `app_mention` | the channel, the user and the message text |
| `reaction-added` — Reaction Added | webhook (manual Events API receiver) | `reaction_added` | who reacted, the emoji and the item reacted to |
| `reaction-removed` — Reaction Removed | webhook (manual Events API receiver) | `reaction_removed` | who removed it, the emoji and the item it was on |
| `message-edited` — Message Edited | webhook (manual Events API receiver) | `message` (subtype `message_changed`) | the channel and the raw event with the old and new message |
| `message-deleted` — Message Deleted | webhook (manual Events API receiver) | `message` (subtype `message_deleted`) | the channel and the raw event with the deleted message |
| `channel-created` — Channel Created | webhook (manual Events API receiver) | `channel_created` | the new channel's id (in channel) and the raw event with its name and creator |
| `channel-renamed` — Channel Renamed | webhook (manual Events API receiver) | `channel_rename`, `group_rename` | the channel id and the raw event with the new name |
| `channel-archived` — Channel Archived | webhook (manual Events API receiver) | `channel_archive`, `group_archive` | the channel id and the user who archived it |
| `channel-unarchived` — Channel Unarchived | webhook (manual Events API receiver) | `channel_unarchive`, `group_unarchive` | the channel id and the user who restored it |
| `channel-deleted` — Channel Deleted | webhook (manual Events API receiver) | `channel_deleted`, `group_deleted` | the id of the deleted channel |
| `member-joined-channel` — Member Joined Channel | webhook (manual Events API receiver) | `member_joined_channel` | the channel, the user and who invited them |
| `member-left-channel` — Member Left Channel | webhook (manual Events API receiver) | `member_left_channel` | the channel and the user |
| `file-created` — File Created | webhook (manual Events API receiver) | `file_created` | the file id; fetch the file with the Get File action |
| `file-shared` — File Shared | webhook (manual Events API receiver) | `file_shared` | the file id, the channel and the user who shared it |
| `file-deleted` — File Deleted | webhook (manual Events API receiver) | `file_deleted` | the id of the deleted file |
| `team-join` — New User Joined Workspace | webhook (manual Events API receiver) | `team_join` | the new user's id (in user) and the raw event with the full user object |
| `user-updated` — User Updated | webhook (manual Events API receiver) | `user_change` | the user's id and the raw event with the updated user object |
| `usergroup-created` — User Group Created | webhook (manual Events API receiver) | `subteam_created` | the raw event with the group |
| `usergroup-updated` — User Group Updated | webhook (manual Events API receiver) | `subteam_updated` | the raw event with the group |
| `usergroup-members-changed` — User Group Members Changed | webhook (manual Events API receiver) | `subteam_members_changed` | the group id and the added and removed user ids in the raw event |
| `star-added` — Star Added | webhook (manual Events API receiver) | `star_added` | who starred it and the item |
| `star-removed` — Star Removed | webhook (manual Events API receiver) | `star_removed` | who unstarred it and the item |
| `new-search-match` — New Message Matching a Search | poll (`message-search`, newest first) | search.messages with `sort=timestamp&sort_dir=desc` | the matching message: text, `ts`, user, channel, permalink. Needs a user token with `search:read`. |

**Setup (manual webhook).** Slack does not let an app register an Events API URL through the API, so:

1. Create the trigger and copy its callback URL.
2. In the Slack app's settings, open **Event Subscriptions**, switch it on and paste the URL into **Request URL**. Slack sends a signed `url_verification` request; the trigger answers it with the `challenge` once the signature checks out.
3. Under **Subscribe to bot events** add the events you want (for example `message.channels`), and reinstall the app.
4. Paste the app's **Signing Secret** (Basic Information, App Credentials) into the trigger's `signingSecret` param.

A Slack app has **one** Request URL, so one trigger receives that app's events. Use `event` ("Slack Event") with an event-type filter to receive several event types in one workflow, or create one Slack app per named trigger. Each named trigger only fires for its own event type; the scopes each event needs are on its reference page, for example https://docs.slack.dev/reference/events/reaction_added/. Event types without a named trigger (for example `pin_added`, `link_shared`, `emoji_changed`, `dnd_updated`) arrive through `event` with `eventTypes` set; the events reference lists them all: https://docs.slack.dev/reference/events/.

Not covered, by list action: `message-search` is behind `new-search-match`, which polls `search.messages` (Tier 2, 20+ calls a minute, so the five-minute poll is within limits). `channel-get-many`, `user-get-many`, `usergroup-get-many`, `file-get-many` and `star-get-many` return records the webhook triggers `channel-created`, `team-join`, `usergroup-created`, `file-created` and `star-added` already deliver. `message-get-many-scheduled` has no trigger: `chat.scheduledMessages.list` returns only pending scheduled messages (https://docs.slack.dev/reference/methods/chat.scheduledMessages.list/), a queue that empties as each one sends and that the workflow fills itself through `message-schedule`.

**Trust model.** Every delivery is verified before it is read: `X-Slack-Signature` must equal `v0=` + the hex HMAC-SHA256 of `v0:<X-Slack-Request-Timestamp>:<raw body>` under the Signing Secret, and the timestamp must be within five minutes. A missing or empty Signing Secret refuses every delivery; nothing is accepted unsigned. Slack retries a delivery it did not see a 200 for; each event carries its `eventId` so a workflow can drop a repeat.

Sources (verified 2026-11-10): https://docs.slack.dev/authentication/verifying-requests-from-slack/ , https://docs.slack.dev/reference/events/ , https://docs.slack.dev/reference/events/url_verification/ , https://docs.slack.dev/apis/events-api/ , https://docs.slack.dev/reference/methods/search.messages/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://status.slack.com/api/v2.0.0/current
```

Slack runs its own status API rather than Statuspage. `/api/v2.0.0/current` returns
`status` plus `active_incidents`; `/api/v2.0.0/history` is the archive. Unauthenticated.

Slack also publishes an incident feed, in both formats, on a **different host**:

```
GET https://slack-status.com/feed/atom
GET https://slack-status.com/feed/rss
```

Same content either way. The feed is history — it keeps incidents that have already
closed and therefore dropped out of `active_incidents`, which is exactly what you want
when a run failed twenty minutes ago and works now. The `incidents` check reads it, kept
separate from `service` because the two answer different questions and only `service` is
authoritative about the present.

Atom is the one declared, because its `<updated>` says when an incident last *changed*
where RSS's `<pubDate>` conflates that with first publication. The app does not parse it:
the check declares `feed: { url, format: "atom" }` and the host hands over parsed entries.

Note that `slack-status.com` is a third host, distinct from both `status.slack.com` (the
JSON API) and `slack.com` (the app's actions). Declaring the feed allowlists that host for
this one hook and no other.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
POST /api/auth.test
```

Slack's documented credential test. It identifies the token's user, bot and workspace,
and works for every token type including a bot token with almost no scopes.

`POST /api/api.test` is the **unauthenticated** counterpart — it returns `{"ok":true}`
and checks that the API itself is reachable without needing a credential at all.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

No headroom endpoint. Slack tiers limits per method and signals exhaustion with 429 plus
`Retry-After`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `incidents` | service | app | none | informational | 900s | `health/incidents.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The hosts `status.slack.com` (for `service`), `slack-status.com` (for `incidents`) are reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

**`quota` is declared absent.** Slack publishes no headroom endpoint or rate-limit headers. Limits are tiered per method and exhaustion surfaces as a 429 with `Retry-After`.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
