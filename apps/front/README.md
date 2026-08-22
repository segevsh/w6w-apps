# Front

Work a Front shared inbox from a workflow — find the conversation, reply to the
customer or comment for the team, tag, assign, snooze, and keep the contact
behind it current.

- **Categories** — support, communication, productivity
- **Auth methods** — api-token
- **Actions** — 30
- **Egress allowlist** — `api2.frontapp.com`
- **Website** — https://front.com
- **API docs** — https://dev.frontapp.com/reference ·
  schema: [`frontapp/front-api-specs`](https://github.com/frontapp/front-api-specs)
  (`core-api/core-api.json`, 147 paths, fetched 2026-08-18)

## Setup

### API Token

1. Front → **Settings → Developers → API tokens → Create API token**.
2. Tick the scopes the actions you plan to use need (below).
3. Paste it in. It is a JWT, so it is long and starts with `eyJ`.

The token belongs to the **company**, not to a person — which is why the
connection label shows the company name, and why every action that acts "as"
somebody takes an explicit teammate id.

### Scopes

Front's spec annotates every operation with the scopes it needs — 55 of them
across the API. A token missing one **authenticates perfectly and then fails on
exactly the call that needs it**, so the connection test cannot warn you. These
are what this app's actions use:

| Scope | Needed by |
|---|---|
| `conversations:read` | every conversation list, get, search, events |
| `conversations:write` | update, assign, snooze, tags, followers, create |
| `messages:read` | message list and get |
| `messages:send` | reply, send message |
| `comments:read` / `comments:write` | comment list, add comment |
| `contacts:read` / `contacts:write` | every contact action |
| `tags:read` | list tags |
| `teammates:read` | list teammates |
| `inboxes:read` | list inboxes, inbox conversations |
| `channels:read` | list channels |
| `statuses:read` | list ticket statuses |

### The two 401s

Measured 2026-08-18, Front distinguishes them in the body:

```json
{"_error":{"status":401,"title":"Unauthenticated","message":"Invalid token"}}
{"_error":{"status":401,"title":"Unauthenticated","message":"JSON Web Token error"}}
```

The first is a well-formed token Front does not recognise; the second is a value
that is not a JWT at all — usually a credential that never arrived. The two have
different fixes, so the connection test names which one happened.

### Why not OAuth

Front supports OAuth 2.0 only for a **registered Front partner app**: client
credentials are issued by Front to listed integration partners, not created
inside a customer's own account. A token any Front admin can mint in Settings is
the credential a workflow can actually get.

## Reply, or comment?

Front's point is that the customer conversation and the team's discussion of it
live in the same place. Two actions write into it, and they are **not**
interchangeable:

| Action | Who sees it |
|---|---|
| `conversation-reply` | **The customer.** It sends. |
| `conversation-comment-add` | The team only. It never leaves Front. |

Getting them the wrong way round emails your internal notes to a customer. Both
are named for what they do rather than for the endpoint behind them.

## Replying archives the conversation — unless you say otherwise

This is the sharpest edge in Front's API. The request body's `options.archive`
**defaults to `true`** on both message routes. Send a reply with no options and
the conversation leaves the queue: right for "answered, done", wrong for every
workflow that sends an acknowledgement and expects a human to pick the thread up
afterwards. Those conversations vanish from the inbox and nobody notices until
the customer chases.

So `conversation-reply` and `message-send` both:

- expose **Archive After Sending** as a parameter,
- default it to **`false`**, deliberately inverting Front's default, and
- **always send the flag**, so the API's default can never apply by omission.

A test asserts the flag is present in the body of both.

## Tags: the update route replaces, so this app does not use it

`PATCH /conversations/{id}` accepts `tag_ids`, documented as "the tag IDs
**replacing** the old conversation tags". One tag sent to a conversation that has
three removes the other two, silently, and the call succeeds.

Front already ships additive routes, so **`conversation-update` has no tag
field**. Tagging goes through `conversation-tag-add` and
`conversation-tag-remove`, where the intent is written on the action, and a test
asserts no action sends `tag_ids` on a PATCH.

`custom_fields` — on both the conversation and the contact — behaves the same
way: Front erases what you omit. There is no per-field alternative, so it stays,
with the warning on the param. Read first, merge, send the whole object.

## Actions

| Key | Type | Description |
|---|---|---|
| `conversation-list` | read | Conversations across the company, newest activity first |
| `conversation-search` | search | Front's search syntax — rate limited at 40% |
| `conversation-get` | read | One conversation's state (not its messages) |
| `inbox-conversation-list` | read | One inbox's queue, filtered at Front |
| `conversation-reply` | perform | **Sends a message to the customer** |
| `conversation-comment-add` | perform | Posts an internal note the customer never sees |
| `conversation-message-list` | read | The customer-visible messages |
| `conversation-comment-list` | read | The internal comments |
| `conversation-event-list` | read | Assignments, tags, archives — the history |
| `message-get` | read | One message in full |
| `conversation-update` | perform | Status, inbox, assignee, custom fields |
| `conversation-assign` | perform | Give it to a teammate, or unassign |
| `conversation-snooze` | perform | Out of the queue until a stated time |
| `conversation-tag-add` | perform | Add tags without removing the others |
| `conversation-tag-remove` | perform | Remove tags without touching the rest |
| `conversation-follower-add` | perform | Subscribe teammates without reassigning |
| `conversation-follower-remove` | perform | Unsubscribe them |
| `message-send` | perform | **Start** a customer conversation through a channel |
| `conversation-create` | perform | An internal discussion or task (comment-only) |
| `contact-list` | read | Contacts, or only those changed since a moment |
| `contact-get` | read | One contact — by id, or by `alt:email:…` handle |
| `contact-create` | perform | Create a contact; a handle is required |
| `contact-update` | perform | Name, description, links, lists, custom fields |
| `contact-note-add` | perform | A note on the person, not on one thread |
| `contact-conversation-list` | read | Everything one customer ever wrote |
| `inbox-list` | read | Shared inboxes and their ids |
| `channel-list` | read | The channels messages can be sent from |
| `teammate-list` | read | Teammates, with availability |
| `tag-list` | read | Company tags — names to ids |
| `status-list` | read | Ticket statuses, for companies with ticketing |

## Things worth knowing

### An inbox is not a channel

An inbox is where conversations land; a channel is a way of sending. One inbox
can hold several channels (an email address and a chat widget both landing in
"Support"), which is why moving a conversation (`inbox_id`) and choosing where a
reply goes out (`channel_id`) are different fields with different lookups.

### There is no `open` status

Front's `q[statuses]` filter takes the four states a conversation is *stored*
in — `assigned`, `unassigned`, `archived`, `trashed` — and open work is
`assigned` **plus** `unassigned`. A company with ticketing enabled gets a second
axis of named statuses with their own `sts_…` ids, which is what `status-list`
reads and what `conversation-update`'s Ticket Status ID takes. `status` and
`status_id` are mutually exclusive; sending both is refused before the call.

### Handles, not contact ids, in `to`

`message-send` addresses **handles** — an email address, a phone number, a
Twitter handle — because the channel decides the medium. A `cnt_…` contact id
there fails. Going the other way, `contact-get` and friends accept a *resource
alias* (`alt:email:ada@example.com`) in place of an id, which is the only way to
look a person up by address: the contact list has no email filter, only a
`updated_after` / `updated_before` window.

### `_pagination.next` points at a hostname we do not call

Front builds the next-page link against the company's own host
(`https://yourCompany.api.frontapp.com/…`) rather than the `api2` host the
request went to. Following it verbatim would call a host outside this app's
egress allowlist, on a URL Front chose rather than one this code did — so only
the opaque `page_token` is carried over and the next page is asked for on the
same host and path as the first.

Not every collection pages: conversations, contacts, messages and events have a
cursor; tags, ticket statuses, inboxes, channels, teammates and comments come
back whole.

### Snoozing belongs to a teammate

`conversation-snooze` requires a teammate id because Front does. On a **shared**
conversation any teammate with inbox access will do and the reminder is shared;
on a **private** one it must be the owner. Leaving the time empty unsnoozes —
Front reads a null `scheduled_at` as "cancel" — which is why the time is
optional and the null is sent explicitly.

All Front timestamps are **Unix seconds**. This app converts the ISO strings its
date params produce, because milliseconds would put a reminder 50,000 years out
and Front rejects that with a validation tree rather than a hint.

### A DELETE with a body

Removing tags and removing followers both take their ids in a **request body on
a `DELETE`**. A client that strips bodies from DELETEs appears to succeed and
changes nothing; this app sends them, and tests assert the body is there.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Front up — and is it the API or just one channel? |
| `quota` | quota | How much of the minute allowance, and the burst behind it, is left |

`service` reads Front's Statuspage (`status.frontapp.com` redirects cross-host to
`www.frontstatus.com`, which this check calls directly) and splits its 16
components in two, because a shared inbox has two ways to be broken:

- **"API and integrations" is down** → nothing works. Reported as `down`.
- **"Gmail" is down** → every read still works and every comment still posts;
  only sending on that channel fails. **Capped at `degraded`**, however loudly
  Statuspage shouts.

`quota` reads both rate-limit buckets. Front meters per company per minute — 50
rpm on Starter, 100 on Professional, 200 on Enterprise (120 for a partner OAuth
app) — with a **burst allowance worth 50% of that, refilled over a rolling ten
minutes**. The burst bucket is the one that empties quietly: a workflow can run
at twice the nominal rate briefly and then stop dead while the headline number
still looks healthy. An empty burst is therefore reported as `degraded` on its
own.

Two limits are deliberately **not** modelled, because they are per-endpoint and
no header reports them: **search** runs at 40% of the company rate (said on
`conversation-search` itself), and **message endpoints** are capped at 5 requests
per second *per conversation or channel* — fanning out across many conversations
is fine, a loop hammering one is not.

## What this app deliberately does not do

- **Attachments.** Every attachment path is `multipart/form-data` carrying binary
  a sandbox cannot produce — the same call this pack's `documenso` and
  `dropbox-sign` apps make. A test asserts no action builds a multipart body.
- **The Channel API.** Front's second API is the contract a *custom channel
  provider* implements so Front can hand it outbound messages: a webhook
  receiver, not something to call.
- **Analytics exports.** Asynchronous jobs polled to completion, rate limited at
  one request per second — a reporting tool's job, not a workflow step.
- **Knowledge base authoring, rules, shifts, teams, views and drafts.** Front
  configuration, changed by an admin in the UI.

## Errors

Front answers with `{"_error":{"status","title","message","details"}}`. The
`message` names the field and `details` usually holds the actual reason, so both
are surfaced rather than the top-level status alone.
