# JumpCloud

Manage JumpCloud users, devices, groups and remote commands from one directory.

- **Categories** — security, devops, hr
- **Auth methods** — api-key
- **Actions** — 31
- **Egress allowlist** — `console.jumpcloud.com`, `console.eu.jumpcloud.com`,
  `console.in.jumpcloud.com`
- **Website** — https://jumpcloud.com
- **API docs** — https://docs.jumpcloud.com/api ·
  schema: `docs.jumpcloud.com/api/1.0/index.yaml` and `.../api/2.0/index.yaml`
  (OpenAPI 3.1, served from JumpCloud's own docs host)

## Setup

### API Key

1. JumpCloud console → your user menu (top right) → **My API Key**.
2. Paste it into the connection's **API Key** field. It is sent as `x-api-key`.
3. Choose the **Region**. This is not cosmetic — see below.
4. **Organization ID** is for multi-tenant (MSP) accounts only, and leaving it
   blank on one is the trap described below.

### The region is part of the credential

JumpCloud runs three consoles — `console.jumpcloud.com` (US),
`console.eu.jumpcloud.com` (EU) and `console.in.jumpcloud.com` (India). A key
issued in one is rejected by the others as an ordinary `401`, and there is no
endpoint that reports which console a key belongs to. So the region is asked
for rather than guessed, and `test` probes the chosen one at connect time —
which is what makes a mismatch a connect failure instead of a 3am mystery.

All three hosts were verified live on 2026-08-18 (each answers `401` to a bogus
key), which is why all three are in the allowlist.

### `x-org-id`, and the tenant you did not mean to change

An MSP admin's key can see several organizations. **Without `x-org-id`,
JumpCloud acts on that key's default organization** — a real organization, so
the call succeeds and changes the wrong tenant rather than failing. The header
is set once on the connection rather than per action, so it cannot be forgotten
on one of them, and `organization-list` exists to find the id.

A single-organization account sees one entry there and never needs to set it.

## Two APIs, not two versions

V2 did not replace V1. This app uses both:

| Surface | Base | What lives there |
|---|---|---|
| V1 | `/api` | users, devices, commands, organizations |
| V2 | `/api/v2` | user groups, device groups, the membership graph |

A user is at `/api/systemusers/{id}` while the group they belong to is at
`/api/v2/usergroups/{id}`. Every action's doc comment names which one it is on.

**They also disagree about their list envelope, silently.** V1 answers
`{results: [...], totalCount: n}`; V2 answers a **bare array**. An app that knew
only one shape would return an empty list from half its own endpoints without
erroring, so the client handles both.

## Actions

| Key | Type | API | Description |
|---|---|---|---|
| `user-list` | read | V1 | List directory users |
| `user-get` | read | V1 | One user, with state and MFA config |
| `user-create` | perform | V1 | Create a user, staged by default |
| `user-update` | perform | V1 | Change profile fields — not state |
| `user-delete` | perform | V1 | Permanently delete (suspending is usually meant) |
| `user-state-set` | perform | V1 | Suspend or activate — the offboarding verb |
| `user-unlock` | perform | V1 | Clear a failed-login lockout |
| `user-password-set` | perform | V1 | Set a password with no email |
| `user-password-expire` | perform | V1 | Force a change at next login |
| `user-mfa-reset` | perform | V1 | Clear the enrolled TOTP factor |
| `user-sshkey-list` | read | V1 | The keys pushed to this user's devices |
| `user-sshkey-add` | perform | V1 | Grant shell access across bound devices |
| `system-list` | read | V1 | List enrolled devices |
| `system-get` | read | V1 | One device, its OS, agent and encryption state |
| `system-update` | perform | V1 | Rename, retag, or change SSH login policy |
| `system-delete` | perform | V1 | Unenrol and uninstall the agent |
| `system-command` | perform | V1 | Lock, restart or shut down |
| `system-erase` | perform | V1 | **Wipe the device** |
| `command-list` | read | V1 | Saved commands |
| `command-get` | read | V1 | One command, its script and its bindings |
| `command-run` | perform | V1 | Queue a command against devices |
| `command-result-list` | read | V1 | What the devices reported back |
| `user-group-list` | read | V2 | User groups |
| `user-group-get` | read | V2 | One group, and whether it is dynamic |
| `user-group-create` | perform | V2 | Create a static or dynamic group |
| `user-group-delete` | perform | V2 | Delete a group and every binding it carried |
| `user-group-member-list` | read | V2 | Direct or effective membership |
| `user-group-member-set` | perform | V2 | Grant or revoke by membership |
| `system-group-list` | read | V2 | Device groups |
| `system-group-member-set` | perform | V2 | Move a device in or out of a group |
| `organization-list` | read | V1 | The org ids `x-org-id` takes |

## Four ways this API goes wrong quietly

Each returns something plausible rather than an error, which is why each is
handled here rather than left to the workflow author.

### 1. A missing API key is a redirect, not a 401

Measured 2026-08-18:

| Request | Result |
|---|---|
| `GET /api/systemusers` with a **wrong** key | `401` `{"error":"Unauthorized","message":"Unauthorized: api key user not found"}` |
| `GET /api/systemusers` with **no** key | `302`, `location: /login` |
| …following that redirect | `200 text/html` — the JumpCloud login page |

`fetch` follows redirects by default, so the naive client ends up with a `200`,
`res.ok === true`, and a `JSON.parse` failure complaining about `<!DOCTYPE`
that reads like a JumpCloud bug. Every request here is made with
`redirect: "manual"`, and a 3xx is reported as the missing credential it is.

### 2. Device commands queue

JumpCloud's own wording on the builtin endpoints: *"If a device is offline, the
command will be run when the device becomes available."*

So success means **accepted**, not **done**, and nothing in the response
distinguishes the two. For a restart that is an inconvenience. For
`system-erase` it means a wipe aimed at a switched-off laptop is a landmine
that fires whenever someone next opens it — possibly weeks later, possibly
after the decision was reversed. **There is no unqueue.**

### 3. `command-run` with no device list is not a no-op

JumpCloud's parameter description: *"An optional list of device IDs to run the
command on. If omitted, the command will run on devices bound to the command."*
A command bound to a device group runs on every machine in it.

This app refuses the ambiguity: either name `systemIds`, or tick **"run on the
command's own bound devices"** and mean it. Doing both is also refused, since
naming devices overrides the bindings and asking for both says two things.

The response is `queueIds` and a `workflowInstanceId` — a queue receipt, not a
result. The exit code and output arrive in `command-result-list`, immediately
for an online machine and whenever it reconnects for an offline one. **A
missing result is not a failure; it means the device has not reported yet.**

### 4. Writing to a dynamic group looks like it worked

A user group created with a `memberQuery` computes its own membership.
JumpCloud accepts a manual add against it — `204`, no complaint — and then
recomputes over it. `user-group-member-set` fetches the group first and refuses,
with an `allowDynamic` override for the case where you know what you are doing.

The membership endpoints are also two different questions with two different
answers: `members` returns edges attached directly to the group, `membership`
returns everyone effectively in it including through nesting. For "who can reach
this application?", the first under-reports without saying so — so
`user-group-member-list` defaults to the second.

Neither write endpoint tells you anything: both answer a bare `204`, the same
for adding an existing member as for a fresh one. These actions return what
they asked for rather than pretending to report what changed.

## Where the destructive verbs live

Four actions do damage that no later call undoes, and each is deliberately
separated from its safe neighbour rather than sharing a control with it:

- **`system-erase`** is its own action. It is not a value in `system-command`'s
  dropdown, because one wrong select value should not be able to wipe a laptop.
- **`user-delete`** is not `user-state-set`. Deleting takes the group
  memberships and device bindings with it and cannot be undone; suspending
  revokes access and keeps the record, which is what an exit checklist usually
  means.
- **`system-delete`** unenrols and uninstalls the agent. It does **not** wipe
  the machine, and it does not recover a lost laptop.
- **`user-group-delete`** removes every application, LDAP, RADIUS and device
  binding the group carried, for everyone in it, while leaving the users
  untouched — which is exactly why the blast radius is easy to underestimate.

All four require an explicit confirmation flag on top of the id, and a test
asserts that.

## Smaller sharp edges

- **`sort` and `fields` are space-separated** in JumpCloud's grammar. A
  comma-separated value is not rejected; it is read as one impossible field name
  and ignored, so the call succeeds and comes back unsorted. These actions take
  the pack's usual comma-separated form and convert.
- **A lockout is not a suspension.** `account_locked` comes from failed logins
  and clears with `user-unlock`; `state: "SUSPENDED"` is a decision and needs
  `user-state-set`.
- **`user-create` defaults to `STAGED`**, not `ACTIVATED`. An account that goes
  live the moment it is created is the harder mistake to notice, and staged is
  what pre-hire provisioning wants.
- **`active` on a device** means the agent checked in recently, not that the
  machine is powered on now.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are this connection's **region's** components up? |
| `quota` | quota | Declared unavailable — see below |

`service` is unusual in this pack: it is `scope: "connection"` with
`credential: "context"`. JumpCloud's status page publishes 140 components and
the relevant ones are region-suffixed — "General Access API - US Region",
"General Access API - EU Region", and so on — so "is JumpCloud up" has three
different answers at once. The check needs the Connection to know *which* answer
to give, but not the credential to get it, which is exactly the posture the
three-way `CredentialPosture` exists for, and is why it may widen egress to
`status.jumpcloud.com` at all.

It watches three components for the connection's region: the REST API, the
command runner and the group graph. The other 137 — LDAP, RADIUS, SSO, MDM, the
billing portal — are real JumpCloud services that no action here touches.

`quota` is a **declared absence**, and it is worth stating rather than leaving
as a gap, because JumpCloud does rate limit and does publish retry guidance, so
the omission looks like an oversight until you check. Measured 2026-08-18: no
`X-RateLimit-*`, `RateLimit-*` or `Retry-After` header on any response observed,
and searching both OpenAPI documents for those names returns zero hits.
Exhaustion is only visible as a `429` at the moment it happens.

## What this app deliberately does not do

- **Directory Insights**, JumpCloud's event log — a separate API with its own
  host and query language.
- **Policies, MDM, Password Manager, PAM and the SaaS management surfaces.** V2
  has 699 paths; each of those is its own vocabulary and would make this app
  about something other than the directory.
- **System Context auth.** The V1 spec carries a second scheme — a signed
  request an agent makes about *itself*. It is for code running on a managed
  device, which an App in a sandbox is not.
- **Creating commands.** Running a saved command is a workflow step; authoring
  the script that runs as root across the fleet is not, and the API offers no
  dry run.

## Errors

JumpCloud's envelope is `{"error": "...", "message": "..."}`, and `message` is
the useful half — *"Unauthorized: api key user not found"* rather than just
*"Unauthorized"*. Failures surface the status and the whole envelope.
