# 1Password

Read and manage vault items through a self-hosted Connect server, and read the
account's audit trail through the Events API.

- **Categories** — security, developer-tools
- **Auth methods** — connect-token, events-token
- **Actions** — 14
- **Egress allowlist** — `events.1password.com`, `events.1password.eu`,
  `events.1password.ca`, `events.ent.1password.com`, `status.1password.com`,
  `*`
- **Website** — https://1password.com
- **API docs** — https://developer.1password.com

All four Events hosts probed live on 2026-08-18.

> **On the allowlist.** Connect runs on your own infrastructure, so its host can
> be anything — the trailing `*` is what admits it. The named entries are the
> Events hosts and the status page.

## This app reads secrets, so start here

A connection to 1Password Connect can read **every credential in the vaults its
token is scoped to**. That is the point of it, and it is the most powerful
credential in this pack. Three things follow, and they shape the whole app.

**`item-get` redacts by default.** It returns the item's *structure* — which
fields exist, their labels, their types, whether a value is set — with concealed
values replaced by `[redacted]`. That is enough for most of what a workflow
wants: checking an item exists, reading a username or URL, seeing whether a
password has been set. None of it needs the secret.

**Reading a value is a separate, deliberate act**, and there are two ways to
make it:

- `revealSecrets` on `item-get`, which returns everything on the item.
- **`item-field-get`**, which returns exactly one named field — the better
  choice when a workflow needs one password, because the rest of the item never
  enters the run's data at all, where it would be carried through subsequent
  steps and possibly logged by something with no idea what it is holding.

**No action logs a field value, a title or a filename, ever.** A title names
what a secret is for; a filename names what a key unlocks. The `index.ts` suite
walks every action's source and asserts it.

What is treated as secret: `CONCEALED`, `OTP`, `SSHKEY` and
`CREDIT_CARD_NUMBER` fields, plus anything marked `purpose: PASSWORD` whatever
its declared type — because a password field can be typed `STRING` and still be
the password.

## Two APIs, two credentials, two surfaces

They do not overlap, and a connection is one or the other:

| | Connect | Events |
| --- | --- | --- |
| Host | **yours** — a container you run | `events.1password.com` and three regional siblings |
| Credential | a Connect token, scoped to vaults | an Events Reporting token, scoped to event kinds |
| Reads | vault items, including secrets | the audit trail — who did what, who read which item |
| Writes | items | nothing |

They are deliberately **two auth methods rather than two halves of one
connection**: a connection holding both would be a credential that can read
every secret *and* read the record of having done so.

This runtime has no per-action auth binding, so an action needing Connect on an
Events connection would otherwise fail somewhere deep with a 404.
`requireConnect()` and `requireEvents()` catch it up front and name which kind
of connection the action needs — and a test asserts every action calls one of
them.

## Setup

### Connect token

Issued alongside the Connect server's credentials file, **scoped to specific
vaults at issue time**. The scope cannot be widened afterwards — the only way to
change it is a new token — so the right shape is a vault per purpose and a token
per integration.

A Connect token is not an account credential: it cannot sign in, cannot see the
account's users, and cannot reach anything outside its own server.

The server itself is a container on your own infrastructure, usually inside a
private network. A workflow runner elsewhere cannot reach it, and the connection
test detects a private or container-internal address specifically rather than
reporting a timeout.

### Events Reporting token

1Password account → Integrations → Events Reporting. Grants are **per event
kind**: sign-in attempts, item usages and audit events are granted
independently, so a token missing one returns 403 on that endpoint alone while
working perfectly on the others. `token-introspect` is the fastest way to see
which.

Four hosts — global, EU, Canada, enterprise. The wrong one answers `401
Unauthorized`, identical to a bad token, so a failed test names the others.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `vault-list` | read | The vaults this token can reach |
| `vault-get` | read | One vault's metadata |
| `item-list` | search | Items in a vault — never their values |
| `item-get` | read | One item, redacted by default |
| `item-field-get` | read | Exactly one field's value |
| `item-create` | perform | Store a new secret |
| `item-update` | perform | Change part of an item |
| `item-delete` | perform | Archive an item |
| `item-file-list` | read | Attachments — certificates, keys |
| `item-file-get` | read | An attachment's bytes |
| `audit-event-list` | read | What changed in the account |
| `item-usage-list` | read | Who opened which secret |
| `signin-attempt-list` | read | Every sign-in attempt |
| `token-introspect` | read | What the Events token may read |

### Things the actions do that the API does not

- **`item-update` does not expose the replace endpoint.** Connect offers both
  `PUT` and `PATCH`; `PUT` replaces the whole item, so any field not in the
  request is **deleted**. For a rotation workflow that means the password
  updates and the username, notes and URLs vanish — silently. This action is
  `PATCH` only, and `setField` builds the JSON Patch path from a field label so
  nobody has to compose `/fields/<id>/value` by hand.
- **`item-field-get` refuses ambiguity.** 1Password allows two fields to share a
  label; picking one silently is how a workflow ends up using the wrong
  credential while the item looks right. It also matches `password` and
  `username` on `purpose` rather than label, which survives a renamed or
  localised field.
- **`item-create` defaults fields to `CONCEALED`.** The field type is what makes
  a value secret — a password stored as `STRING` is visible in the UI and is not
  audited as a secret read. Defaulting the other way round would be a quiet
  downgrade.
- **`item-delete` asks for the id twice** and says what it does not do:
  1Password *archives* rather than destroys, so an administrator can restore
  it — but the credential the item held still works wherever it was valid.
  Deletion is bookkeeping; revocation happens elsewhere.
- **`item-list` explains the SCIM filter.** `title eq "…"` is exact and
  case-sensitive, and there is no `contains` — so `titleContains` filters after
  the fetch, which the action says rather than implying a query.
- **`vault-list` is the token's scope.** A vault missing from it was never
  granted, and no permission change will add it. That makes it the first thing
  to run when an item lookup 404s.
- **`audit-event-list`, `item-usage-list` and `signin-attempt-list` return
  `hasMore` as its own field.** The Events cursor is *always* present in the
  response, so a loop that continues while a cursor exists never terminates.
  `has_more` is the only usable stop condition. A continuation also sends the
  cursor **alone** — every other filter is ignored, because the cursor already
  encodes them.
- **`signin-attempt-list` counts `mfa_failed` separately.** A run of
  `credentials_failed` is noise; `mfa_failed` means somebody had a *working
  password* and was stopped by the second factor. Those deserve different
  responses.
- **`item-usage-list` covers reads made through Connect.** Which means this is
  how an automated consumer of secrets is held to account — an app that reads
  secrets ought to ship the means of auditing itself.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | 1Password's own status, by region |
| `surface` | credential | connection | signed | Does this credential still reach what it did |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

### `surface` — the one worth reading about

A connection is either Connect or Events, so this reads its own surface and
probes accordingly: `GET /v1/vaults` for Connect, `GET /api/auth/introspect` for
Events. Both return a **scope**, and both scopes can shrink without anything
failing.

A Connect token whose vault was deleted still authenticates and now reaches
fewer vaults. An Events token whose grants were narrowed still works on the
endpoints it kept. Neither raises anything — the workflow simply starts getting
404s and 403s that look like bugs. So the check compares the current scope
against what was recorded at connect time and reports a reduction as `degraded`,
naming what was lost. An empty scope is `down`: a credential that reaches
nothing is not a working connection, however valid it is.

### `service`

`status.1password.com` is an Atlassian Statuspage with **88 components**,
grouped by region (`USA/Global`, `Canada`, `Europe`) with the same component
names repeating inside each group — so the keys are group-qualified, or the same
name in three regions collapses to one and two are silently dropped.

The interesting part is that **for a Connect connection this page is nearly
irrelevant**. A Connect server holds a local copy of its vaults and keeps
serving them while 1Password's own services are down — much of the point of
running one. An outage means it stops receiving *updates* and will serve
slightly stale secrets until it can sync. For an Events connection the page
matters directly. So the check is capped at `degraded` and says which.

### `quota`

Declared unavailable. The Events hosts return no rate-limit headers — verified
by reading the full response headers from each — and the API publishes no
allowance in advance, though it does answer 429 when exceeded. The Connect side
has no vendor quota at all: it is a container you run, so its limits are its own
CPU and memory, and what actually constrains it is how fast it can sync rather
than how many requests it will take. What is worth watching there is
reachability and token scope, which `surface` covers.

## Icon

`assets/icon.png` (180×180), downloaded verbatim from
`https://1password.com/apple-touch-icon.png` on 2026-08-18 — 1Password's own
site. Checked with `_tools/icon-legibility.ts`.

## Tests

164 assertions across 21 files: one per action, one per auth method, one per
live health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app and to what it holds:

- **Every action asserts which surface it needs** — there is no per-action auth
  binding, so nothing may assume.
- **`item-get` still defaults `revealSecrets` to false**, and `item-field-get`
  still takes a single field. If either changed, reading a secret would stop
  being deliberate.
- **No action logs a value, a title, a filename or a uuid.** A run log may
  record labels and counts; it may not record what the secret is or what it is
  for.
