# Microsoft Teams

Read teams and channels, and send channel and chat messages, through the Microsoft Graph API.

- **Categories** — communication
- **Auth methods** — oauth2
- **Actions** — 16
- **Egress allowlist** — `graph.microsoft.com`
- **API version** — Microsoft Graph **v1.0** (`https://graph.microsoft.com/v1.0`). `beta` is not
  used. See [v1.0 vs beta](#v10-vs-beta) for what that costs.

## Read this first: posting is easy, reading is admin-gated

The single most surprising thing about the Teams API, and the thing most likely to make this App
look broken when it is working exactly as designed:

> **A normal user can post to a channel without any administrator's involvement. That same user
> cannot read that channel back without a tenant administrator consenting.**

`ChannelMessage.Send` needs no admin consent. `ChannelMessage.Read.All` does. So in a tenant where
no admin has consented, Send Channel Message and Reply to Channel Message work, and List Channel
Messages, Get Channel Message and List Message Replies return `403 Forbidden`.

Chats are the opposite and much simpler: `Chat.ReadWrite` covers listing, reading **and** sending,
and needs no admin consent.

The full consent picture is in [Authentication](#authentication). It is not a quirk of this App —
it is Microsoft's permission model, and it is why this App is honest about the split rather than
requesting one big scope and hoping.

## Scope: teams, channels, chats and messages

Microsoft Graph is one API in front of most of Microsoft 365, and "Teams" inside it is itself large
— messaging, calls, meetings, shifts, tabs, apps, tags, migration. This App covers the **collaboration
surface a workflow actually automates**: find a team, find a channel or a chat, post into it, read it
back, and manage who is in the team.

**Deliberately left out, and why:**

| Surface                              | Graph offers                                                                | Why it is not here                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Creating teams and channels**      | `PUT /teams`, `POST /teams/{id}/channels`                                   | Provisioning, not automation, and `Channel.Create` / `Team.Create` are admin-consented on top of an already long scope list. A workflow that creates a team is doing directory work.                                                                                    |
| **Creating a chat**                  | `POST /chats`                                                               | Genuinely useful and the most likely next addition. Left out because it needs `Chat.Create` and a `members` array with an `@odata.bind` per participant plus a `roles` array — a form shape that deserves its own design pass rather than being bolted onto Send.       |
| **Reactions**                        | `POST .../messages/{id}/setReaction`, `unsetReaction`                       | Real v1.0 endpoints. Skipped to keep this tranche to operations that carry information rather than sentiment; they are cheap to add on the same scopes.                                                                                                                 |
| **Editing and deleting messages**    | `PATCH .../messages/{id}`, `.../softDelete`, `.../undoSoftDelete`           | `PATCH` on a chatMessage updates **only** the `policyViolation` property — it is a DLP hook, not an edit — so the obvious "Update Message" action would not do what its name promises. Soft delete is real, but pairs naturally with an edit action that cannot exist.  |
| **Meetings, calls, presence**        | `/me/onlineMeetings`, `/communications/calls`, `/me/presence`               | A different product inside the same brand, with its own consent story (`OnlineMeetings.ReadWrite`, and the calling APIs need an application-hosted bot).                                                                                                                |
| **Shifts / schedules**               | `/teams/{id}/schedule`, `shift`, `timeOff`                                  | Workforce management. Coherent enough to be its own App.                                                                                                                                                                                                               |
| **Tabs, installed apps, tags**       | `/channels/{id}/tabs`, `/installedApps`, `/teamworkTags`                    | Teams-app administration rather than messaging.                                                                                                                                                                                                                        |
| **Files in a channel**               | `/channels/{id}/filesFolder` → SharePoint `driveItem`                       | Hands off to SharePoint/OneDrive, which belongs on the storage shelf.                                                                                                                                                                                                   |
| **Tenant-wide message export**       | `/teams/getAllMessages`, `/chats/getAllMessages`, `/users/{id}/chats/getAllMessages/delta` | **Protected APIs.** Application-permission only, and access is granted only after a request-and-validation process with Microsoft. (They *were* metered; Microsoft removed Teams API metering on 25 August 2025 — see [Verification](#verification).) Not something an App should quietly make available. |
| **Message import / migration**       | `Teamwork.Migrate.All` + channels in migration mode                         | The only thing application permissions can do on the message endpoints, and it is a bulk-import flow with its own back-dating rules and a stated possibility of future fees based on the volume imported.                                                                |
| **Change notifications / webhooks**  | `POST /subscriptions`                                                       | Would be a `TriggerDefinition`, not an Action. Called out again under [Not implemented](#not-implemented) because Microsoft's polling policy makes it more than a nice-to-have.                                                                                         |
| **Attachments, mentions, Adaptive Cards** | `chatMessage.attachments`, `.mentions`, `hostedContents`               | Sending an `<at>` mention means emitting matching `<at id="0">` markup **and** a parallel `mentions` array whose `mentioned` object identifies the user — a two-place invariant a flat form cannot express safely. Deferred rather than half-supported.                  |

## Actions

### Teams (2)

| Action    | Graph endpoint         | Least-privileged delegated scope |
| --------- | ---------------------- | -------------------------------- |
| List Teams | `GET /me/joinedTeams` | `Team.ReadBasic.All`             |
| Get Team   | `GET /teams/{id}`     | `Team.ReadBasic.All`             |

### Team membership (2)

| Action            | Graph endpoint                | Least-privileged delegated scope         |
| ----------------- | ----------------------------- | ---------------------------------------- |
| List Team Members | `GET /teams/{id}/members`     | `TeamMember.Read.All`                    |
| Add Team Member   | `POST /teams/{id}/members`    | `TeamMember.ReadWriteNonOwnerRole.All` † |

† `…NonOwnerRole.All` cannot grant the `owner` role, so this App requests the higher
`TeamMember.ReadWrite.All` — otherwise the action's Role field would be a lie.

### Channels (3)

| Action              | Graph endpoint                            | Least-privileged delegated scope |
| ------------------- | ----------------------------------------- | -------------------------------- |
| List Channels       | `GET /teams/{id}/channels`                | `Channel.ReadBasic.All`          |
| Get Channel         | `GET /teams/{id}/channels/{cid}`          | `Channel.ReadBasic.All`          |
| Get Primary Channel | `GET /teams/{id}/primaryChannel`          | `Channel.ReadBasic.All`          |

### Channel membership (1)

| Action               | Graph endpoint                            | Least-privileged delegated scope    |
| -------------------- | ----------------------------------------- | ----------------------------------- |
| List Channel Members | `GET /teams/{id}/channels/{cid}/members`  | `ChannelMember.Read.All` **(admin)** |

### Channel messages (5)

| Action                   | Graph endpoint                                                    | Least-privileged delegated scope        |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------- |
| Send Channel Message     | `POST /teams/{id}/channels/{cid}/messages`                        | `ChannelMessage.Send`                   |
| List Channel Messages    | `GET /teams/{id}/channels/{cid}/messages`                         | `ChannelMessage.Read.All` **(admin)**   |
| Get Channel Message      | `GET …/messages/{mid}` · `GET …/messages/{mid}/replies/{rid}`     | `ChannelMessage.Read.All` **(admin)**   |
| Reply to Channel Message | `POST …/messages/{mid}/replies`                                   | `ChannelMessage.Send`                   |
| List Message Replies     | `GET …/messages/{mid}/replies`                                    | `ChannelMessage.Read.All` **(admin)**   |

### Chats (1) and chat messages (2)

| Action            | Graph endpoint                    | Least-privileged delegated scope |
| ----------------- | --------------------------------- | -------------------------------- |
| List Chats        | `GET /me/chats`                   | `Chat.ReadBasic`                 |
| List Chat Messages | `GET /chats/{id}/messages`       | `Chat.Read`                      |
| Send Chat Message  | `POST /chats/{id}/messages`      | `ChatMessage.Send`               |

Every action runs as the signed-in user. The `/users/{id}/…` forms exist in Graph but need
application permissions and tenant-admin consent, which is a different authorization story than the
delegated OAuth flow this App uses — and for the message endpoints, application permissions do not
grant ordinary posting at all (see [Application permissions](#application-permissions-do-not-do-what-you-expect)).

## v1.0 vs beta

**Every endpoint in the table above is Microsoft Graph v1.0.** Nothing here is beta, and nothing
beta-only was shipped dressed as stable.

That constraint did cost something, and it is worth naming rather than hiding. Several Teams
operations that would round out this App are only in `/beta`, and were therefore **left out**:

- **`GET /me/chats/{id}/messages/delta`** and the other delta queries on Teams messages. The
  documented v1.0 `chatMessage: delta` is for *all* of a user's chats and is a protected, metered
  API; a per-chat incremental read is not v1.0.
- **The richer channel/chat search and filtering** surfaces. In v1.0, `List Channel Messages`
  supports `$top` and `$expand` and nothing else — no `$filter`, no `$orderby`, no `$search`. That
  is not this App being conservative; it is the whole documented query surface.
- **`GET /teams/{id}/channels/{cid}/messages/{mid}/hostedContents`** exists in v1.0 for reading
  inline images, but the useful write side (posting hosted content outside a migration) does not.

The rule applied throughout: **if the only path to a capability is `/beta`, the capability is
absent, and this section says so.** A beta path shipped as stable is a breaking change waiting for
Microsoft's schedule rather than ours.

## Things worth knowing before you wire this up

**A channel id is not a GUID, and it is not URL-safe.** Team ids are ordinary GUIDs; channel ids
look like `19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2` and chat ids like
`19:…@thread.v2` or `19:…@unq.gbl.spaces`. The App percent-encodes every id before it becomes a
path segment, which is the form Microsoft's own examples use. Paste the raw id; it will be encoded
for you.

**`List Teams` returns mostly nulls.** The reference is explicit: only `id`, `displayName`,
`description`, `isArchived` and `tenantId` are populated. Everything else needs `Get Team`.

**Teams threads are one level deep.** A reply's `replyToId` is always the *root* message, never
another reply. So Reply to Channel Message takes the root's id even when you are answering someone
else's reply, and there is no reply-to-a-reply.

**You cannot start a chat.** `Send Chat Message`'s own reference says it "can't create a new chat;
you must use the list chats method to retrieve the ID of an existing chat". Use List Chats to find
one that already exists. Creating chats is `POST /chats`, deliberately not implemented — see the
scope table.

**Paging is a URL, not a token, and the caps are small.** Collections return `@odata.nextLink`, an
absolute URL that already carries every query parameter from the original request. Feed it back into
the `Next link` param and the App replays it verbatim. `$top` caps at **50** on every message
collection and on chats — versus 999 on the member collections — so "give me the last 200 messages"
is a `Fetch all pages` walk, bounded by `Max pages` (default 10). There is no `$skip` on these
endpoints and the App does not pretend otherwise.

**`$filter` on chat messages is silently ignored unless it matches `$orderby`.** Graph's rule: "You
can only filter results if the request URL contains the `$orderby` and `$filter` query parameters
configured for the same property; otherwise, the `$filter` query option is ignored." Not rejected —
*ignored*, so a wrong filter looks like a wrong result. That is why Order by is a select with
exactly the two supported (descending-only) values.

**Channel message ordering is not chronological.** `List Channel Messages` sorts "by the last
modified date of the entire reply chain", so an old thread with a fresh reply floats to the top of
the root-message list. There is no `$orderby` to override it.

**System messages are in the results.** Channel and chat message collections include
`messageType: "systemEventMessage"` entries — "X added Y to the team" — whose `from` is `null` and
whose body is the literal `<systemEventMessage/>`. Filter on `messageType === "message"` downstream
if you only want human posts.

**`$select` on Get Channel works in both directions.** Populating `email` and `summary` is
documented as expensive, so excluding them is a speed-up; but `summary` (the owner/member/guest
counts) is *only* returned when named in `$select`, so excluding it by default is also why you have
to ask for it.

**`$expand=members` on List Chats truncates at 25.** A documented limitation: the response returns
at most 25 member entries per chat regardless of `$top`. Do not treat it as the roster of a large
group chat.

**Membership ids are opaque.** The `id` on a `conversationMember` is a base64 blob; the reference
says explicitly not to parse it or make assumptions about it. Use `userId` for the Entra object id.
And when filtering members, the properties live on a derived type, so the filter needs the full
prefix: `microsoft.graph.aadUserConversationMember/userId eq '…'`.

**Nothing here is idempotent, and the App says so.** Graph exposes no client-supplied dedupe key on
any Teams write — there is no `transactionId` equivalent to the one calendar events get — so every
`perform` action declares `idempotent: false`. A retried Send posts a second message; a retried Add
Team Member on an existing member is an error, not a no-op. Note also that adding a *disabled or
blocked* user answers `404 Not Found`, which reads like "no such team" and is not.

**Polling is capped at once per day.** Microsoft's Teams API terms state that an app polling to see
whether a resource has changed "can only do that once per day", and name change notifications as the
supported alternative; violating it is described as grounds for additional throttling or
suspension. Repeatedly running List Channel Messages on a schedule is exactly the pattern that rule
addresses. There is no trigger in this App yet (see [Not implemented](#not-implemented)) — so if you
build a polling loop, keep it inside that policy.

**And the terms of use say this out loud, so it is repeated here:** "It's a violation of the terms
of use to use Microsoft Teams as a log file. Only send messages that people will read."

## Application permissions do not do what you expect

Worth its own heading because the instinct is to reach for app-only auth for a workflow tool.

For every message-sending endpoint in this App, the *only* application permission Graph accepts is
`Teamwork.Migrate.All`, and it is for **data migration into channels in migration mode** — not for
posting ordinary messages. The reference adds that "in the future, Microsoft may require you or your
customers to pay additional fees based on the amount of data imported."

There is no app-only way to post a normal Teams message. This App is delegated-only, and that is the
API's shape rather than a limitation of the implementation.

Separately, the tenant-wide export endpoints (`getAllMessages`, `chatMessage: delta` across all
chats) are **protected APIs**: access is granted only through a Microsoft request-and-validation
process, over and above permissions and admin consent. Deliberately not implemented.

A correction worth recording, because the stale version of this fact is widespread: those APIs used
to be **metered** — billed per call against an Azure subscription — and much of the third-party
writing about them still says so. As of **25 August 2025** Microsoft's own metered-API list states
that "the Teams APIs are no longer metered, and no billing configuration is required to use these
APIs." They remain *protected*; they are no longer *billed*. That is why this README says "request
process" and not "metered".

## Authentication

One method: **oauth2** — the Microsoft identity platform (Microsoft Entra ID) v2.0 authorization
code flow with PKCE.

```
authorize  https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize
token      https://login.microsoftonline.com/organizations/oauth2/v2.0/token
```

**Why `organizations` and not `common`.** The sibling `outlook` App uses `common` because Outlook
genuinely serves personal Microsoft accounts. Teams does not: **every** delegated permission this
App requests is documented "Delegated (personal Microsoft account): **Not supported**."
`organizations` restricts the sign-in page to work-or-school accounts, so a consumer account is
refused at the door with a comprehensible message instead of completing the whole dance and then
failing every action with a 403. A single-tenant deployment substitutes its own tenant id or
verified domain and overrides these URLs.

Delegated scopes requested:

| Scope                      | Needed for                                                                   | Admin consent |
| -------------------------- | ---------------------------------------------------------------------------- | ------------- |
| `offline_access`           | The refresh token. Microsoft grants one only when this scope is requested.   | No            |
| `User.Read`                | The `test` / `afterConnect` probe (`GET /me`).                               | No            |
| `Team.ReadBasic.All`       | List Teams, Get Team.                                                        | *unconfirmed* |
| `TeamMember.ReadWrite.All` | List Team Members, Add Team Member (including as owner).                     | *unconfirmed* |
| `Channel.ReadBasic.All`    | List Channels, Get Channel, Get Primary Channel.                             | **No**        |
| `ChannelMember.Read.All`   | List Channel Members.                                                        | **Yes**       |
| `ChannelMessage.Send`      | Send Channel Message, Reply to Channel Message.                              | **No**        |
| `ChannelMessage.Read.All`  | List Channel Messages, Get Channel Message, List Message Replies.            | **Yes**       |
| `Chat.ReadWrite`           | List Chats, List Chat Messages, Send Chat Message — all three, one scope.    | **No**        |

The "No"/"Yes" values were read from Microsoft's permissions reference. The two marked
*unconfirmed* are honest gaps: the `Team*` / `TeamMember*` sections of that page did not resolve in
the retrieved document, and the per-endpoint reference pages that name them as least-privileged do
not restate the consent flag. They are org-wide `.All` scopes, so **plan for a tenant administrator
being required**, but this README will not assert a value it did not read. See
[Verification](#verification).

**What a normal user can do with self-consent alone:** list and read teams and channels, list chats,
read chat messages, send chat messages, post to a channel, and reply in a channel. **What needs an
administrator:** reading channel messages back, and listing channel members.

### RSC does not apply to this App

Resource-specific consent (RSC) comes up constantly in Teams API discussions, so it is worth saying
explicitly why it is absent here rather than leaving a reader to wonder.

Several of the endpoints this App calls advertise an RSC alternative in their permissions table —
`ChannelMessage.Read.Group`, `ChannelMember.Read.Group`, `TeamMember.Read.Group`,
`ChannelSettings.Read.Group`, `TeamSettings.Read.Group`, `ChatMessage.Read.Chat`. Every one of those
is an **application** permission: RSC lets a *Teams app installed into a specific team or chat* act
on that one resource without tenant-wide consent. It is a narrower alternative to
`ChannelMessage.Read.All` for an app-only caller.

This App is **delegated-only** — it acts as the signed-in user through the OAuth flow above, not as
itself. There is no `.Group` or `.Chat` scope in the delegated column of any of these endpoints, so
RSC is not a route this App can take, and none of its scopes are RSC scopes. Taking it would mean
becoming a packaged Teams app with a manifest, installed per team — a different distribution model
entirely, not a change of scope string.

The practical consequence: **the admin-consent requirement on `ChannelMessage.Read.All` and
`ChannelMember.Read.All` cannot be worked around from here.** If reading channel messages without
tenant-wide consent is a hard requirement for your deployment, that is an app-only + RSC design, and
it is a different App.

Set up: register an application in the Microsoft Entra admin center, add a Web redirect URI, then
store the `client_id` / `client_secret` / `redirect_uri` on this w6w installation via
`PUT /apps/io.w6w.teams/oauth-config/oauth2`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
this App can actually perform.

### Is the vendor up?

**No probe. Declared absent.**

The sibling `outlook` App reached this conclusion for Exchange Online. It was **re-verified for
Teams rather than inherited**, because a different Microsoft 365 workload could plausibly have had a
different status surface. It does not:

- **Graph's own service-health API** — `GET /admin/serviceAnnouncement/healthOverviews` is
  semantically right, and Teams appears in it as the `microsoftteams` service. But its only
  permission is `ServiceHealth.Read.All`, requiring tenant-admin consent and scoped to the calling
  tenant's subscribed services. This App already carries two admin-consented scopes; making the
  *health check itself* depend on a third would report a correctly working App as broken in every
  tenant that consented to the messaging scopes and no more.
- **`status.cloud.microsoft`** — a client-rendered single-page app. *Every* path under it answers
  `200 text/html`, so fetching it proves nothing. Its backing JSON endpoints are real and
  unauthenticated, but undocumented (discoverable only by reading the page's script bundle) and
  carry no stability contract.
- **`status.office365.com`** — answers `401`.
- **RSS** — the Service Health Dashboard's feed has been retired; current guidance points humans at
  the status site and at `@MSFT365Status`. Neither is a machine surface.
- **A Teams-specific status host** — there is none. No `status.teams.microsoft.com`.

So `service` carries an `unavailable` reason instead of a guessed probe. Outages reach this App the
ordinary way: as 5xx responses from `graph.microsoft.com`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three it
performs itself.

```
GET https://graph.microsoft.com/v1.0/me
```

The signed-in user's profile. The cheapest authenticated Graph call, and it needs only `User.Read` —
so a credential that legitimately lacks an admin-consented Teams scope still reports as live rather
than as broken. Deliberately **not** `GET /me/joinedTeams`: that needs `Team.ReadBasic.All`, and a
user who belongs to no teams would still be a perfectly good credential. `GET /me` returns
`displayName`, `mail` and `userPrincipalName`, which is also what labels the Connection.

### Do we have quota left?

**No probe. Declared absent.**

Microsoft's throttling model for the Teams endpoints is reactive, not advertised. A throttled call
answers `429 Too Many Requests` with error code `TooManyRequests` and a `Retry-After` header;
successful calls carry no rate-limit headers at all. The one proactive signal Graph documents —
`x-ms-throttle-limit-percentage`, emitted once an app passes 0.8 of its budget — belongs to the
*identity and directory* ResourceUnit model, not to the Teams service. There is nothing to poll from
a cold start.

Teams adds a second ceiling no probe could see even if one existed, and it is the limit most likely
to bite a workflow: the **once-per-day polling cap** described above. An App can be comfortably
inside every request-rate limit and still be in violation of the terms.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key           | Kind       | Scope      | Credential | Severity      | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | --------------------------------------------------- |
| `service`     | service    | app        | none       | informational | _declared absent_                                   |
| `quota`       | quota      | connection | signed     | informational | _declared absent_                                   |
| `auth:oauth2` | credential | connection | signed     | fatal         | derived from the `oauth2` auth method's `test` hook |

Both declared absences carry `severity: "informational"`. An `unavailable` entry always reports
`unknown`, and a non-informational check would pin this App's roll-up verdict at `unknown`
permanently.

No status host appears in `w6w.network.allow`, and neither check widens egress via `network.allow` —
because neither check makes a request at all.

## Not implemented

Stated plainly rather than left as a silent gap. Beyond the scope table above:

- **Triggers.** Graph's change-notification model (`POST /subscriptions` plus a validated webhook
  endpoint and periodic renewal) is a `TriggerDefinition`, not an Action, and was out of scope here.
  This is a more pointed gap for Teams than for most Apps, because Microsoft's polling policy caps
  polling at once per day and names change notifications as *the* supported alternative. Until a
  trigger exists, a low-frequency List Channel Messages poll is the interim — inside that policy.
- **Sending mentions, attachments and Adaptive Cards.** Requires emitting `<at id="n">` markup and a
  matching `mentions` array (or `attachment` markup and a matching `attachments` array) that must
  agree with each other — a two-place invariant a flat form cannot express safely.
- **Reactions** (`setReaction` / `unsetReaction`), **soft delete** and **undo delete**.
- **Creating teams, channels and chats**, and removing or re-roling members (only `Add` is here).
- **`allMembers` on a shared channel** — this App lists direct members only.
- **Application-permission access** of any kind, including the protected export APIs, and the
  resource-specific-consent (RSC) route that would require becoming a packaged Teams app. See
  [Application permissions](#application-permissions-do-not-do-what-you-expect) and
  [RSC](#rsc-does-not-apply-to-this-app).

## Verification

Every endpoint path, request-body property, permission scope, query parameter, page cap and status
code above was checked against the **live Microsoft Learn v1.0 reference in August 2026** — not
written from memory. The pages read: `teams-api-overview`, `channel`, `chatmessage`,
`user-list-joinedteams`, `team-get`, `team-list-members`, `team-post-members`,
`team-get-primarychannel`, `channel-list`, `channel-get`, `channel-list-members`,
`channel-list-messages`, `channel-post-messages`, `chatmessage-get`, `chatmessage-list-replies`,
`chatmessage-post-replies`, `chat-list`, `chat-list-messages`, `chat-post-messages`,
`permissions-reference`, and `metered-api-list`.

**One fact was corrected against the live docs mid-build**, and is recorded because the stale
version is everywhere: the Teams export APIs are commonly described as *metered* — billed per call
against an Azure subscription. Microsoft's `metered-api-list` now opens with "Starting August 25,
2025, the Teams APIs are no longer metered, and no billing configuration is required to use these
APIs", leaving only the SharePoint/OneDrive `assignSensitivityLabel` API on that list. They are
still **protected** (request-gated); they are no longer **billed**. This README says the latter and
not the former only because the page was read rather than recalled.

**One thing could not be confirmed and is not asserted:** the delegated *admin-consent* flag for
`Team.ReadBasic.All`, `TeamMember.Read.All`, `TeamMember.ReadWrite.All` and
`TeamMember.ReadWriteNonOwnerRole.All`. The `permissions-reference` page truncates before its
`Team*` sections in the retrieved document, and the per-endpoint pages that name those scopes as
least-privileged do not restate the flag. The Authentication table marks them *unconfirmed* rather
than guessing. Everything else in that table — `Channel.ReadBasic.All` (no), `ChannelMember.Read.All`
(yes), `ChannelMessage.Send` (no), `ChannelMessage.Read.All` (yes), `Chat.ReadWrite` (no) — was read
directly from the reference.

The icon is Microsoft's own mark, copied **byte-for-byte** from n8n's `nodes-base`
(`nodes/Microsoft/Teams/teams.svg`) and verified identical with `diff` after formatting.

## Links

- **Website** — https://www.microsoft.com/en-us/microsoft-teams/group-chat-software
- **API reference (the docs used to build this)** —
  https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0
- **channel resource** — https://learn.microsoft.com/en-us/graph/api/resources/channel?view=graph-rest-1.0
- **chatMessage resource** —
  https://learn.microsoft.com/en-us/graph/api/resources/chatmessage?view=graph-rest-1.0
- **chat resource** — https://learn.microsoft.com/en-us/graph/api/resources/chat?view=graph-rest-1.0
- **Permissions reference** — https://learn.microsoft.com/en-us/graph/permissions-reference
- **Resource-specific consent (RSC)** —
  https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent
- **Metered and protected APIs** (the page that records the 2025-08-25 de-metering of the Teams
  APIs) — https://learn.microsoft.com/en-us/graph/metered-api-list
- **Import messages into Teams** (the `Teamwork.Migrate.All` flow) —
  https://learn.microsoft.com/en-us/graph/teams-import-messages
- **OAuth 2.0 authorization code flow** —
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- **Paging** — https://learn.microsoft.com/en-us/graph/paging
- **Throttling** — https://learn.microsoft.com/en-us/graph/throttling
- **GitHub org** — https://github.com/microsoftgraph
- **API docs source** — https://github.com/microsoftgraph/microsoft-graph-docs-contrib
- **JavaScript SDK** — https://github.com/microsoftgraph/msgraph-sdk-javascript

---

Researched and endpoint-verified 2026-08-03 against Microsoft Graph v1.0. If the `Team*` consent
flags matter to your deployment, read them off the Entra admin center's consent screen — it is the
authoritative surface, and it is in front of you at connect time anyway.
