# LaunchDarkly

Read and change LaunchDarkly feature flags, segments and the audit trail behind
them.

- **Categories** — devops, developer-tools
- **Auth methods** — api-key
- **Actions** — 21
- **Egress allowlist** — `app.launchdarkly.com`, `app.launchdarkly.us`
- **Website** — https://launchdarkly.com
- **API docs** — https://launchdarkly.com/docs/api ·
  schema: `https://app.launchdarkly.com/api/v2/openapi.json` (served by the
  API's own host)

## Setup

### API Access Token

1. LaunchDarkly → **Account settings → Authorization → Access tokens**.
2. Choose the **Instance** — commercial or US-government.
3. Optionally set a default **Project** and **Environment**.

**The token is the entire `Authorization` header value.** LaunchDarkly's
security scheme is `type: apiKey, in: header, name: Authorization` — not
`Bearer <token>`, not `token <token>`. That is unusual enough to be the first
thing to check when a valid-looking key is rejected, and the connection test
says so in its 401 message.

**Two instances, and a key belongs to one.** `app.launchdarkly.com` is the
commercial service; `app.launchdarkly.us` is LaunchDarkly's US-government
(FedRAMP) instance. A key from one is unknown to the other, so the instance is
asked for rather than guessed and `test` probes the chosen one.

**On the token's role:** a service token with the Writer role can turn a flag
on in production. The scoping happens when the token is minted, not here, so
prefer a custom role over Writer or Admin.

## Actions

| Key | Type | Description |
|---|---|---|
| `flag-list` | read | A project's flags |
| `flag-get` | read | One flag, with its state in each environment |
| `flag-create` | perform | Create a flag, off everywhere |
| `flag-toggle` | perform | Turn a flag on or off in one environment |
| `flag-update` | perform | Apply semantic patch instructions |
| `flag-archive` | perform | Archive or restore |
| `flag-delete` | perform | Permanently delete |
| `flag-status-list` | read | Every flag's evaluation status — the cleanup report |
| `flag-status-get` | read | Is one flag still being evaluated? |
| `segment-list` | read | An environment's segments |
| `segment-get` | read | One segment, its members and rules |
| `segment-create` | perform | Create a segment in one environment |
| `segment-update` | perform | Add or remove members, or patch |
| `project-list` | read | Projects |
| `project-get` | read | One project and its environments |
| `environment-list` | read | A project's environments |
| `environment-get` | read | One environment (**contains SDK keys**) |
| `audit-log-list` | read | Who changed what, account-wide |
| `audit-log-get` | read | One entry, with the before and after states |
| `member-list` | read | Members and their roles |
| `metric-list` | read | What experiments measure |

## Semantic patch, and the content type that selects it

This is the detail everything else rests on. LaunchDarkly's `PATCH` endpoints
accept three formats and tell them apart **by the `Content-Type` alone**:

| Content-Type | Format |
|---|---|
| `application/json` | JSON Patch (RFC 6902) — `[{op, path, value}]` |
| `application/merge-patch+json` | JSON merge patch |
| `application/json; domain-model=launchdarkly.semanticpatch` | **instructions** |

Send an instructions body **without** that parameter and LaunchDarkly reads it
as a JSON Patch, which it is not — so the call fails with a complaint about the
patch document rather than anything about the header.

Every semantic write in this app goes through one client method that sets it,
and a test asserts that no action builds a `PATCH` by hand.

Instructions are also the right format to automate against: `turnFlagOn` means
what it says whatever the flag's current shape, while a JSON Patch that assumes
an array index is wrong the moment somebody adds a targeting rule.

## Four things that go wrong quietly

### 1. A flag exists in every environment of its project

Naming the wrong environment does not fail — it toggles the flag somewhere
else, successfully. A wrong *project* is a 404; a wrong *environment* is a
change you did not mean to make.

That is why the environment is its own parameter with its own warning rather
than folded into the project, and why the connection's default environment is
worth thinking about rather than filling in reflexively.

### 2. "On" does not mean everyone gets the new behaviour

On means the flag's **targeting rules apply**. If the fallthrough rule still
serves the old variation, on and off are indistinguishable to users — the flag
is on and nothing has changed. `flag-get`'s output labels say so, and `rules`
plus `fallthrough` are where the real answer is.

### 3. Segments are per environment, unlike flags

A flag exists once in a project and is configured per environment. A **segment**
with the same key in `staging` and `production` is two independent lists that
can hold different people and drift apart. So `segment-create` makes one in one
environment, and says so.

### 4. Audit log times are epoch milliseconds

`before` and `after` on `audit-log-list` take epoch milliseconds. An ISO
timestamp is **accepted and simply does not filter**, so a "changes since
yesterday" query quietly returns everything. This app refuses a non-numeric
value rather than passing it on.

## Archiving is the cleanup verb, not deleting

Both stop a flag being evaluated, and code still calling it falls back to the
SDK's default either way — which may be neither of the values it was serving.
The difference is what survives:

- **Archive** — reversible, keeps the flag's history and audit trail.
- **Delete** — takes the targeting, the history and the audit trail across every
  environment.

`flag-delete` requires an explicit confirmation and points at the other one.

`flag-status-get` is the question to ask *before* either: it reports `new`,
`active`, `inactive` or `launched`, where the last two mean the flag is dead
weight. Neither is visible from the flag's own configuration, which looks
identical whether a flag is load-bearing or forgotten.

## Smaller sharp edges

- **`flag-toggle`, `flag-update` and `flag-archive` log at `warn`.** A flag
  change reaches production users within seconds, and that log line may be the
  only local record of it. The `comment` parameter puts a reason in
  LaunchDarkly's own audit log, which is worth using.
- **`environment-get` returns SDK keys** — `apiKey` and `mobileKey` are
  credentials, returned in full. A workflow storing that response is storing
  secrets. Nothing here logs them, and a test asserts it.
- **`confirmChanges` on an environment does not apply to the API.** It makes the
  web UI ask a human to confirm flag changes; an API call goes straight
  through.
- **`flag-list` without `env`** returns each flag's configuration for *every*
  environment, which on a project with a dozen of them is a lot of payload for a
  question about one.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are the **management** components up? |
| `quota` | quota | How much of the global rate limit is left, if LaunchDarkly says |

The `service` check's design point is which components to read.
LaunchDarkly's status page publishes 39 leaf components, **four of which have
"API" in the name — and none of those four is the API this app calls.**
Verified 2026-08-18, "Server-side streaming API", "Client-side streaming API",
"Polling API" and "Edge API" are the *flag delivery network* that SDKs connect
to. Watching them would report an outage in something no action here touches,
and would stay green through an outage of the surface this app uses.

So it reads **Authentication**, **Flag targeting**, **Segment management**,
**Account management** and **Audit log**.

`quota` is a **live but conditional** reading. LaunchDarkly rate limits three
ways, all resetting every ten seconds, and documents the headers **in prose
only** — the OpenAPI document declares no rate-limit header on any of its 250
paths. So this app reads what actually arrives and says plainly when nothing
does, rather than assuming:

- **Global** (`X-Ratelimit-Global-*`) is per account and shared by every token
  on it — LaunchDarkly's own note: *"exceeding the limit with one access token
  will impact other tokens"*. This is the verdict.
- **Route-level** (`X-Ratelimit-Route-*`) describes whichever endpoint was just
  called and says nothing about the next one. Reported as context only.
- `X-Ratelimit-Reset` is epoch **milliseconds**, unlike most APIs' seconds.

It reports `degraded` rather than `down` at the limit, because a ten-second
window recovers by itself.

## What this app deliberately does not do

- **Experiments and guarded rollouts.** Metrics are readable; starting or
  stopping an experiment from an unattended workflow is a decision with
  statistical consequences, not an operational switch.
- **Creating projects, environments and members.** Account administration — and
  an environment carries SDK keys, which would then be minted by a workflow.
- **Approvals and workflows.** LaunchDarkly's own change-management layer exists
  so that changes are reviewed; routing around it from a workflow step would
  defeat the point.
- **Code references, integrations, webhooks and the relay proxy** — each its own
  surface.

## Errors

LaunchDarkly's envelope is `{code, message}`. `code` is the machine-readable
half — `unauthorized`, `not_found`, `invalid_request` — and the message names
which instruction or field was rejected, which is what makes a failed semantic
patch diagnosable.
