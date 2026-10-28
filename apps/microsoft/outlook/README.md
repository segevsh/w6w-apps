# Microsoft Outlook

Read, send, and organize Outlook mail and calendar events through the Microsoft Graph API.

- **Categories** — communication, email, calendar
- **Auth methods** — oauth2
- **Actions** — 18
- **Egress allowlist** — `graph.microsoft.com`
- **API version** — Microsoft Graph **v1.0** (`https://graph.microsoft.com/v1.0`). `beta` is not
  used.

## Scope: mail and calendar, nothing else

Microsoft Graph is one API in front of most of Microsoft 365 — mail, calendar, contacts, OneDrive
files, Teams, To Do, users, groups, devices, security alerts. That breadth is the reason this App
needs an explicit boundary rather than an implicit one: an App whose id is `io.w6w.outlook` should
cover **what a user means by Outlook**, and no more.

So the line is drawn at **mail + calendar** — the two surfaces Outlook is, in every client Microsoft
ships under that name.

**Deliberately left out, and why:**

| Surface                             | Graph offers                                    | Why it is not here                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contacts / People**               | `/me/contacts`, `/me/contactFolders`            | Real and coherent with Outlook, but it costs a whole extra consent scope (`Contacts.Read` / `Contacts.ReadWrite`) that no other action needs. A scope every user must approve should earn its place; two read actions do not. This is the closest call in the table and the natural first extension. |
| **OneDrive / files**                | `/me/drive`                                     | Belongs to the `google-drive`/`dropbox` shelf, not to a mail app. Would add `Files.ReadWrite`.                                                                                                                                                                                                       |
| **Teams, chats, channels**          | `/me/chats`, `/teams`                           | A different product with a different mental model.                                                                                                                                                                                                                                                   |
| **To Do / Planner / tasks**         | `/me/todo`, `/planner`                          | Task management, not mail.                                                                                                                                                                                                                                                                           |
| **Users, groups, directory**        | `/users`, `/groups`                             | Directory administration. Needs admin-consented scopes, and the blast radius of a mistake is the whole tenant.                                                                                                                                                                                       |
| **Mailbox settings, auto-replies**  | `/me/mailboxSettings`                           | Account configuration rather than automation. Would add `MailboxSettings.ReadWrite`.                                                                                                                                                                                                                 |
| **Inbox rules**                     | `/me/mailFolders/inbox/messageRules`            | Server-side automation that competes with the workflow itself; a rule created by a workflow is invisible to it.                                                                                                                                                                                      |
| **Change notifications / webhooks** | `/subscriptions`                                | Would be a `TriggerDefinition`, not an Action. Not attempted — see "Not implemented" below.                                                                                                                                                                                                          |
| **MIME message bodies**             | `GET /me/messages/{id}/$value`, MIME `sendMail` | Answers `text/plain` rather than a JSON resource, so it needs a different return contract than every other action.                                                                                                                                                                                   |
| **Attachment endpoints**            | `/messages/{id}/attachments`                    | Sending inline attachments _is_ supported (see Send Message); listing and downloading them separately is not.                                                                                                                                                                                        |

## Actions

### Mail — messages (10)

| Action           | Graph endpoint                                             |
| ---------------- | ---------------------------------------------------------- |
| Send Message     | `POST /me/sendMail`                                        |
| List Messages    | `GET /me/messages` · `GET /me/mailFolders/{id}/messages`   |
| Get Message      | `GET /me/messages/{id}`                                    |
| Create Draft     | `POST /me/messages` · `POST /me/mailFolders/{id}/messages` |
| Send Draft       | `POST /me/messages/{id}/send`                              |
| Reply to Message | `POST /me/messages/{id}/reply` · `.../replyAll`            |
| Forward Message  | `POST /me/messages/{id}/forward`                           |
| Update Message   | `PATCH /me/messages/{id}`                                  |
| Move Message     | `POST /me/messages/{id}/move`                              |
| Delete Message   | `DELETE /me/messages/{id}`                                 |

### Mail — folders (1)

| Action            | Graph endpoint                                                  |
| ----------------- | --------------------------------------------------------------- |
| List Mail Folders | `GET /me/mailFolders` · `GET /me/mailFolders/{id}/childFolders` |

### Calendar (7)

| Action             | Graph endpoint                                                          |
| ------------------ | ----------------------------------------------------------------------- |
| List Calendars     | `GET /me/calendars`                                                     |
| List Events        | `GET /me/events` · `GET /me/calendars/{id}/events`                      |
| List Calendar View | `GET /me/calendar/calendarView` · `GET /me/calendars/{id}/calendarView` |
| Get Event          | `GET /me/events/{id}` · `GET /me/calendars/{cid}/events/{id}`           |
| Create Event       | `POST /me/events` · `POST /me/calendars/{id}/events`                    |
| Update Event       | `PATCH /me/events/{id}` · `PATCH /me/calendars/{cid}/events/{id}`       |
| Delete Event       | `DELETE /me/events/{id}` · `DELETE /me/calendars/{cid}/events/{id}`     |

Every action targets the signed-in user's own mailbox (`/me`). The `/users/{id}` forms exist in
Graph but need application permissions and tenant-admin consent, which is a different authorization
story than the delegated OAuth flow this App uses.

## Things worth knowing before you wire this up

**List Events and List Calendar View are not the same query.** `/events` returns single-instance
meetings and _series masters_ — a weekly stand-up appears once. `/calendarView` expands recurring
series into their actual occurrences within a date range, alongside exceptions and single instances.
For anything scheduling-shaped, you want Calendar View.

**Moving a message changes its id.** `POST /move` answers `201 Created` with a _new_ message
resource carrying a different `id`, because Graph models a move as create-and-delete. Downstream
steps must use the returned id.

**Only Create Event is safe to retry.** Graph exposes a client-supplied dedupe key (`transactionId`)
on event creation and nowhere else, so Create Event defaults it to the invocation id and declares
`idempotent: true`. `sendMail`, `reply`, `forward`, `send` and `createDraft` have no such key — a
retry sends or creates a second copy, and they are marked `idempotent: false` accordingly. The PATCH
and DELETE actions converge on a fixed end state and are marked idempotent on that basis.

**`comment` and `body` are mutually exclusive on a reply.** Graph rejects both together with
`400 Bad Request`; Reply to Message catches that locally so you get a legible error instead of a
remote one.

**Paging is a URL, not a token.** Collections return `@odata.nextLink`, an absolute URL that already
carries every query parameter from the original request. Feed it back into the `Next link` param and
the App replays it verbatim — Microsoft's paging guidance is explicit that you must not reconstruct
it from `$skip`. Turning on `Fetch all pages` walks the chain, bounded by `Max pages` (default 10)
so an unbounded mailbox cannot become an unbounded run.

**Bodies come back as HTML unless you ask otherwise.** Set `Return body as` to `text` and the App
sends `Prefer: outlook.body-content-type="text"`. Likewise, event times come back in UTC unless
`Time zone` is set, which sends `Prefer: outlook.timezone`. One exception: Calendar View's own
`startDateTime`/`endDateTime` are read using the offset embedded in the value and are _not_ affected
by that header — include an explicit offset, or they are read as UTC.

**Deleting a meeting you organize notifies everyone.** Graph sends a cancellation to every attendee,
and there is no flag to suppress it.

**`$filter` and `$orderby` on messages have a pairing rule.** Every ordered property must also
appear in the filter, in the same order, before any property that is not ordered — otherwise Graph
fails with `InefficientFilter`.

## Authentication

One method: **oauth2** — the Microsoft identity platform (Microsoft Entra ID) v2.0 authorization
code flow with PKCE.

```
authorize  https://login.microsoftonline.com/common/oauth2/v2.0/authorize
token      https://login.microsoftonline.com/common/oauth2/v2.0/token
```

The `common` tenant segment is used because it is the only one that accepts **both** work-or-school
and personal Microsoft accounts, which is what "Outlook" means to a user. The alternatives are
`organizations` (work/school only), `consumers` (personal only), and a tenant id or verified domain
for a single-tenant registration. A deployment that must be restricted to one tenant registers its
own app and overrides these URLs.

Delegated scopes requested — the least-privileged set covering every action above:

| Scope                 | Needed for                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `offline_access`      | The refresh token. Microsoft grants one only when this scope is requested — there is no `access_type=offline` equivalent. |
| `User.Read`           | The `test` and `afterConnect` probe (`GET /me`).                                                                          |
| `Mail.ReadWrite`      | List, get, draft, update, move, delete.                                                                                   |
| `Mail.Send`           | Send, send draft, reply, reply-all, forward.                                                                              |
| `Calendars.ReadWrite` | Every calendar and event action.                                                                                          |

Set up: register an application in the Microsoft Entra admin center, add a Web redirect URI, then
store the `client_id` / `client_secret` / `redirect_uri` on this w6w installation via
`PUT /apps/io.w6w.outlook/oauth-config/oauth2`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
this App can actually perform.

### Is the vendor up?

**No probe. Declared absent.**

Every plausible surface was checked, and none is a documented, unauthenticated, machine-readable
statement about Exchange Online:

- **Graph's own service-health API** — `GET /admin/serviceAnnouncement/healthOverviews` is
  semantically the right answer, but its only permission is `ServiceHealth.Read.All`, which requires
  tenant-admin consent, is scoped to the calling tenant's subscribed services, and is unsupported
  for personal Microsoft accounts. A check most connections cannot run would report a working App as
  broken.
- **`status.cloud.microsoft`** — a client-rendered single-page app. _Every_ path under it answers
  `200 text/html`, so fetching it proves nothing. Its backing JSON endpoints are real and
  unauthenticated, but they are undocumented (discoverable only by reading the page's script
  bundle), carry no stability contract, and the one covering mail covers **consumer Outlook.com**,
  not Exchange Online.
- **`status.office365.com/api/v2/status.json`** and **`outlook.office.com/api/v1.0/status`** — both
  answer `401`.
- **RSS** — the Service Health Dashboard's feed has been retired; current guidance points humans at
  the status site and at `@MSFT365Status`. Neither is a machine surface.

Building a probe on the undocumented SPA endpoint would be inventing a check, not declaring one, so
`service` carries an `unavailable` reason instead. Outages reach this App the ordinary way: as 5xx
responses from `graph.microsoft.com`.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET https://graph.microsoft.com/v1.0/me
```

The signed-in user's profile. The cheapest authenticated Graph call, and it needs only `User.Read` —
so a credential that legitimately lacks a mail or calendar scope still reports as live rather than
as broken. It returns `displayName`, `mail` and `userPrincipalName` by default, which is also what
labels the Connection.

### Do we have quota left?

**No probe. Declared absent.**

Microsoft's throttling model for the Outlook endpoints is reactive, not advertised. A throttled call
answers `429 Too Many Requests` with error code `TooManyRequests` and a `Retry-After` header;
successful calls carry no rate-limit headers at all. The one proactive signal Graph documents —
`x-ms-throttle-limit-percentage`, emitted once an app passes 0.8 of its budget — belongs to the
_identity and directory_ ResourceUnit model, not to the Outlook mail/calendar service. There is
nothing to poll from a cold start.

The published Outlook ceilings, recorded so an operator diagnosing a burst of 429s has the numbers:
**10,000 requests per 10 minutes** per app-and-mailbox pair, **4 concurrent requests**, and **150
MB** of PATCH/POST/PUT payload per 5 minutes.

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

Stated plainly rather than left as a silent gap:

- **Triggers.** Graph's change-notification model (`POST /subscriptions` plus a validated webhook
  endpoint and periodic renewal) is a `TriggerDefinition`, not an Action, and was out of scope here.
  Polling with List Messages ordered by `receivedDateTime` is the interim.
- **MIME bodies**, on both the read (`/$value`) and write (`Content-Type: text/plain`) sides.
- **Attachment listing and download** as separate operations; only inline `fileAttachment` send is
  supported.
- **`itemAttachment` and `referenceAttachment`**, which need a nested resource or a sharing URL that
  a form field cannot supply honestly.
- **Application-permission (`/users/{id}`) access** to other users' mailboxes.
- **Event responses** (`accept` / `decline` / `tentativelyAccept`) and `cancel`. Real endpoints,
  deliberately deferred with contacts as the next tranche rather than padding this one.

## Verification

Every endpoint path, request-body property, permission scope and status code above was checked
against the live Microsoft Learn v1.0 reference in August 2026 — not written from memory.

One item is documented unevenly and is worth flagging: on `replyAll`, Graph's v1.0 request-body
**table** lists only `comment`, while the same page's **prose** describes a `message` parameter
("specify either a comment or the body property of the `message` parameter"). This App sends
`message` on both `reply` and `replyAll`; on `reply` that is table-backed, on `replyAll` it rests on
the prose alone.

## Links

- **Website** —
  https://www.microsoft.com/en-us/microsoft-365/outlook/email-and-calendar-software-microsoft-outlook
- **API reference** — https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0
- **Outlook mail API overview** —
  https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview?view=graph-rest-1.0
- **Calendar resource** —
  https://learn.microsoft.com/en-us/graph/api/resources/calendar?view=graph-rest-1.0
- **Permissions reference** — https://learn.microsoft.com/en-us/graph/permissions-reference
- **OAuth 2.0 authorization code flow** —
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- **Paging** — https://learn.microsoft.com/en-us/graph/paging
- **Throttling** — https://learn.microsoft.com/en-us/graph/throttling
- **GitHub org** — https://github.com/microsoftgraph
- **API docs source** — https://github.com/microsoftgraph/microsoft-graph-docs-contrib
- **JavaScript SDK** — https://github.com/microsoftgraph/msgraph-sdk-javascript

---

Researched and endpoint-verified 2026-08-03. Status surfaces move; if the `service` check ever
becomes possible, the Graph `serviceHealth` API is the one to revisit.
