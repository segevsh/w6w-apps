# Checkly

Run and inspect Checkly synthetic monitors, their results, alerts and
maintenance windows.

- **Categories** — monitoring, devops, developer-tools
- **Auth methods** — api-key
- **Actions** — 25
- **Egress allowlist** — `api.checklyhq.com`
- **Website** — https://www.checklyhq.com
- **API docs** — https://developers.checklyhq.com ·
  schema: `https://api.checklyhq.com/openapi.json` (served by the API's own host)

## Setup

### API Key

1. Checkly → **Settings → User → API keys**, and create a key.
2. Checkly → **Settings → Account → General**, and copy the **Account ID**.
3. Paste both into the connection.

Both go on every request — `Authorization: Bearer <key>` and
`X-Checkly-Account: <accountId>` — which is what Checkly's own scheme
description shows.

**The account header is not optional, whatever the document implies.** It is
declared on **188 of the spec's 194 operations**; the six without it are an
inconsistency rather than a different kind of endpoint, and `/v1/checks` is one
of them. It is set once in the auth hook, so no action can be the one that
forgets — because a key that can see several accounts and does not say which it
means succeeds *against the wrong one*.

The connection test probes `GET /v1/accounts/me` rather than `/v1/checks`, so a
key pointed at an account it cannot reach fails at connect time instead of
silently reading someone else's monitors.

## Actions

| Key | Type | Description |
|---|---|---|
| `check-list` | read | List monitors, filtered by type, tag or name |
| `check-get` | read | One monitor and its configuration |
| `check-toggle` | perform | Activate, deactivate or mute |
| `check-delete` | perform | Delete a monitor and its history |
| `check-run` | perform | Trigger an ad-hoc run |
| `check-status-list` | read | The current state of every check, in one call |
| `check-status-get` | read | One check's current state |
| `check-result-list` | read | One check's run history |
| `check-result-get` | read | The full record of one run |
| `check-alert-list` | read | The alerts Checkly actually sent |
| `check-group-list` | read | Check groups |
| `check-group-get` | read | One group and the settings it imposes |
| `check-group-checks-list` | read | A group's members, with its settings applied |
| `maintenance-window-list` | read | Maintenance windows |
| `maintenance-window-create` | perform | Silence (or pause) monitoring for a period |
| `maintenance-window-delete` | perform | End a window early |
| `alert-channel-list` | read | Where alerts are sent |
| `alert-channel-get` | read | One channel, and which events it sends |
| `variable-list` | read | Environment variables checks can read |
| `variable-set` | perform | Create or update a variable |
| `variable-delete` | perform | Delete a variable |
| `location-list` | read | Regions checks can run from |
| `runtime-list` | read | Node runtimes available to check scripts |
| `reporting-get` | read | Aggregated success rate and response times |
| `account-entitlements-get` | read | What the plan allows |

## Four things that go wrong quietly

### 1. Deactivated and muted are different, and one loses history

| | Runs? | Records results? | Alerts? |
|---|:-:|:-:|:-:|
| Activated, unmuted | yes | yes | yes |
| **Muted** | yes | yes | **no** |
| **Deactivated** | **no** | **no** | no |

For a deploy window, muting is almost always what was meant: the checks keep
running, so afterwards you can tell whether the deploy actually broke anything.
Deactivating leaves a hole in the history exactly where you most wanted data.

Better still is a **maintenance window** — it has an end time, so nothing stays
silenced because a workflow failed between the "off" step and the "on" step.

### 2. `check-run` with no target runs everything

Checkly's own description of the trigger endpoint: *"Starts a check session for
each check that matches the provided target filters. **If no filters are given,
matches all eligible checks.**"* On an account with a few hundred monitors that
is a few hundred simultaneous runs, billed as such, from every configured
location.

So this app refuses the ambiguity: name `checkIds` or `tags`, or tick **"Run
every check in the account"** and mean it. Doing both is also refused.

The response is a **check session, not a verdict**. Whether anything passed is
in `check-result-list` afterwards. A workflow that treats the trigger's success
as "the site is fine" is testing nothing.

### 3. Failures and errors are not the same event

A **failure** is the monitored thing being wrong — an assertion failed, the
status code was not what you asked for. An **error** is the check itself not
completing — the script threw, the run timed out.

`check-status-get` returns both, and a workflow that pages on one is blind to
the other. `hasErrors` in particular usually means *your monitoring* is broken
rather than the thing being monitored.

### 4. Result rows include retry attempts

Checkly distinguishes a `FINAL` result from the `ATTEMPT` runs that preceded it
under a retry strategy. Counting every row in `check-result-list` as an incident
overcounts by however many retries are configured — so the filter is exposed and
its hint says why.

## Neither health check is live, and that is the honest answer

| Key | Kind | Status |
|---|---|---|
| `service` | service | Declared unavailable |
| `quota` | quota | Declared unavailable |

**`service`.** Checkly *appears* to publish two status surfaces and neither is
usable. Verified 2026-08-18:

- `status.checklyhq.com` — and its canonical address `is.checkly.online` — is a
  single-page app with a catch-all route. It answers `200 text/html` with the
  **same 257,163 bytes** for `/api/v2/status.json`, `/api/v2/summary.json`,
  `/feed.xml`, `/rss` and `/history.atom` alike. Every path "exists"; none is an
  endpoint.
- `checkly.statuspage.io` *is* real Statuspage JSON — page id `nq8lf8mrmvw6`,
  thirteen components — and it was last updated **2026-04-28**. Its `API`
  component is stuck at `partial_outage` while `/incidents/unresolved.json`
  returns **zero** incidents. Reading it would report `degraded` forever, off an
  incident nobody has closed since April, on a page the vendor no longer links.

A check that is confidently wrong is worse than no check. If Checkly restores
the JSON API, this becomes a live probe against the first surface.

**`quota`.** Checkly publishes the plan's *allowance* but never its
*consumption*. `GET /v1/accounts/me/entitlements` returns rows of
`{key, name, type, enabled, quantity}` where `quantity` is documented as the
**maximum allowed** — there is no `usage`, `consumed` or `remaining` field on any
schema in the document, no rate-limit header is declared anywhere, and
`/v1/reporting` aggregates check results rather than account usage. Reading
`quantity` as headroom would show a full allowance forever, so `quota` declines
and `account-entitlements-get` offers the allowance as the plain read it is.

## Smaller sharp edges

- **A group's settings override its members'.** Locations, frequency, retry
  strategy and alert channels set on a group apply to every check in it, so "why
  does this check run from Frankfurt" is answered on the group.
  `check-group-checks-list` shows members with the group's settings applied.
- **Alerts sent ≠ failures recorded.** A muted check fails without alerting, an
  escalation may hold back the first failure, and a maintenance window suppresses
  them entirely. `check-alert-list` is where "why was nobody paged" starts.
- **A secret variable is one-way.** It can be overwritten but never read back,
  so a secret written by mistake cannot be inspected to find out what it was.
- **Deleting a variable does not fail loudly.** A script reading a missing
  variable often requests the wrong URL or asserts against nothing, so the
  monitor goes on passing while measuring something else — which is why
  `variable-delete` asks for confirmation on a call that otherwise looks
  trivial.
- **`variable-set` creates or updates.** It tries the update and falls back to
  the create on a 404, so a re-run of a deploy workflow does not fail on a
  variable that already exists. Any other failure is raised rather than
  swallowed.

## What this app deliberately does not do

- **Create checks.** The eight check types have eight different create endpoints
  and substantially different bodies, and a browser check's body is a Playwright
  script. Authoring monitors belongs in Checkly's editor or its
  code-as-monitoring CLI; this app runs them, reads them, and turns them on and
  off.
- **Checkly's own status pages, incidents and dashboards.** A whole second
  product living in the same API — publishing incidents to your customers is a
  different job from watching your own checks.
- **Result assets.** Screenshots, traces and videos sit behind a separate
  endpoint as files, and an App returns JSON rather than bytes.
- **Private location keys and client certificates** — credential material, which
  this app reads around rather than mints.

## Errors

Checkly's envelope is `{statusCode, error, message}`. The message is the useful
half — *"Missing authentication"* — and validation failures put per-field detail
there too, so the whole body is surfaced.
