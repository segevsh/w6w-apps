# Home Assistant

Read and control a Home Assistant instance — entity states, service calls,
history, templates, calendars and events.

- **Categories** — iot, productivity
- **Auth methods** — token
- **Actions** — 19
- **Egress allowlist** — `status.home-assistant.io`, `*`
- **Website** — https://www.home-assistant.io
- **API docs** — https://developers.home-assistant.io/docs/api/rest/

Built against the official REST API documentation, read 2026-08-18.

> **On the allowlist.** Home Assistant is software you run, so the instance can
> be at any hostname — the trailing `*` is what admits it. `status.home-assistant.io`
> is named for the `service` health check alone.

## Setup

### The instance has to be reachable, and usually it is not

This is the first thing that goes wrong and it is not a Home Assistant problem.
A typical install lives at `http://homeassistant.local:8123` on a home network.
A workflow runner in a datacentre cannot reach that any more than it can reach
your printer.

Making a connection work means one of:

- **Nabu Casa Cloud Remote UI** — the `*.ui.nabu.casa` hostname, which is what
  most people already have.
- **A tunnel or reverse proxy** with a public hostname.
- **A runner on the same network.**

The connection test detects a private address specifically and says this,
rather than reporting a timeout that suggests the instance is down.

If there *is* a reverse proxy, Home Assistant needs `trusted_proxies`
configured for it in `configuration.yaml` — without that it rejects the
forwarded request with a **400**, which reads like a malformed request and is
not. The error handler names it.

### The token

Profile → **Security** → Long-lived access tokens → Create token. Shown once.

They do not expire — valid for ten years — and they are **revocable**, which
matters because there is nothing else to notice: a revoked token and a wrong
token look identical.

More importantly, **this API has no scopes.** A long-lived token carries the
full permissions of the user who created it, so a token made by an
administrator can restart Home Assistant, unlock doors and read every camera in
the house. The mitigation Home Assistant offers is to create a **separate
non-admin user** and generate the token as them. The field hint says so.

## Setting a state is not controlling a device

This is the trap that matters most in this API, and it fails silently. From
Home Assistant's own documentation for `POST /api/states/<entity_id>`:

> This endpoint sets the representation of a device within Home Assistant and
> will not communicate with the actual device.

Writing `"on"` to `light.kitchen` makes the dashboard show the light on. The
light does not turn on. The next time the integration polls the bulb it
overwrites the state back to `off`, and the change vanishes — leaving a workflow
that appeared to work, an automation that fired on a value that was never true,
and nothing in any log to explain it.

**Controlling a device is `service-call`, or `entity-switch`.**

`state-set` exists because it is genuinely useful for entities that have *no*
device behind them — values pushed in from outside, computed statuses, flags an
automation watches. Nothing overwrites those. But because the failure mode is
invisible, it **refuses** to write to the domains that always have a device
(`light`, `switch`, `climate`, `cover`, `lock`, `media_player`, and the rest)
unless the caller explicitly acknowledges it, and the error says which action to
use instead. `state-delete` guards the same list for the same reason.

## `unavailable` is a value, not an error

When an integration breaks — a vendor's cloud changes, a device drops off the
network, an OAuth token expires — Home Assistant raises nothing. Its entities
simply start returning the string `"unavailable"`, in a perfectly good `200`.
An entity that has never reported returns `"unknown"`.

Both parse to `NaN`. A threshold comparison against `NaN` is false. So the
alert that was supposed to fire when the freezer got warm silently never fires,
and every other signal says the instance is healthy.

`state-get` returns `usable` alongside the raw state, and `numericState` only
when the value really is a number. `state-list` counts them. And the `entities`
health check exists entirely for this — see below.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `state-list` | read | Every entity, filtered client-side |
| `state-get` | read | One entity, with the value's usability |
| `state-set` | perform | Set what Home Assistant *believes* — not device control |
| `state-delete` | perform | Remove a pushed-in entity |
| `service-call` | perform | Do something — the endpoint that controls devices |
| `service-list` | read | What this instance can actually do |
| `entity-switch` | perform | Turn things on, off or toggle |
| `history-get` | read | Recorded state changes |
| `logbook-get` | read | What happened, and what caused it |
| `template-render` | read | Evaluate Jinja2 against live state |
| `event-fire` | perform | Trigger an automation from outside |
| `event-list` | read | Event types, with listener counts |
| `config-get` | read | Version, time zone, units, components |
| `config-check` | read | Validate `configuration.yaml` before restarting |
| `calendar-list` | read | Calendar entities |
| `calendar-events` | read | Events in a window |
| `camera-snapshot` | read | The latest still, as base64 |
| `error-log` | read | Why an entity is unavailable |
| `intent-handle` | perform | Do something by intent, not entity id |

### Things the actions do that the API does not

- **`state-list` reports totals separately from matches.** There is no
  server-side filter on this endpoint — no `?domain=`, no `?entity_id=` — so a
  well-instrumented install returns several megabytes every time. Filtering here
  narrows the result, not the transfer, and saying so is more honest than
  implying a query.
- **`history-get` requires entity ids**, which the documentation calls
  optional. Omitting `filter_entity_id` asks the recorder for every state change
  of every entity: on a Raspberry Pi with SQLite that takes minutes and makes
  Home Assistant itself unresponsive. It also defaults `minimal_response`,
  `no_attributes` and `significant_changes_only` **on**, because the un-flagged
  response is an order of magnitude larger and is rarely what anyone wants.
- **`template-render` refuses to pretend the output is JSON.** The endpoint
  returns rendered *text*: `{{ 1 + 1 }}` gives the two characters `2`, and a
  list gives Python's repr (`['a', 'b']`, single quotes) which will not parse.
  Asking for JSON parsing without `| to_json` produces an error that says
  exactly that, instead of "unexpected token `'`".
- **`calendar-events` normalises the two event shapes.** A timed event has
  `start.dateTime`; an all-day event has `start.date` and no `dateTime` at all.
  Code reading `dateTime` silently drops every all-day event. Both are
  normalised to `start`/`end` with an `allDay` flag, and the originals kept.
- **`service-call` reports `changedCount` explicitly.** A `200` with an empty
  list is normal — the light was already on, the device is offline, the service
  is asynchronous — but it is not confirmation. Naming the count lets a workflow
  decide; reading the state back is the honest way to confirm.
- **`entity-switch` uses the domain-agnostic services.** `homeassistant.turn_on`
  dispatches to whatever the target is, so one action covers lights, switches,
  fans, scripts and scenes — and sidesteps the common failure of calling
  `light.turn_on` on a `switch` entity.
- **`event-fire` refuses core event types.** Forging `state_changed` or
  `call_service` puts the state machine and the recorder into a state nothing
  expects. Custom types are the intended use. `event-list` exists as its
  companion: `listener_count` is the only way to find out whether anything is
  listening *before* firing, since firing always reports success.
- **`config-check` is the one that saves a broken restart.** A syntax error in
  `configuration.yaml` does not stop a running instance — it stops it coming
  back up. Restarting to find out is how an instance ends up down until somebody
  with SSH access fixes it.
- **`error-log` takes the tail.** A single retrying integration writes a
  traceback every ten seconds, so the log is routinely tens of megabytes. It is
  also the only place that explains *why* an entity is unavailable.
- **`camera-snapshot` says the frame may be old.** The proxy returns whatever
  the integration last received, which for a motion-triggered camera can be
  minutes ago, and nothing in the response says when.
- **`intent-handle` is for human input.** It resolves "kitchen light" the way
  the voice assistant does — against friendly names, areas and aliases — which
  is right for a chat message or a transcript and wrong when the entity id is
  already known, because the matching can pick something else.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Home Assistant's *project* infrastructure and Nabu Casa |
| `instance` | dependency | connection | signed | Is this instance answering, and has it finished starting |
| `entities` | dependency | connection | signed | How much of it is actually working |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

### `entities` — the one worth reading about

Every other check here can pass while the thing a workflow depends on is dead.
The API answers, the token is valid, the state is `RUNNING` — and a broken
integration's entities are quietly returning `"unavailable"` to every read.

This check reports what **proportion** of entities are in that state, and names
the domains it is concentrated in. A handful is background noise: a phone off
the network, a device unplugged for the season. A quarter of the instance is an
integration that has fallen over, and "all thirty are `climate`" points straight
at which one — `error-log` then says why. It runs at most every ten minutes,
because it fetches every state to answer.

### `instance`

Probes `/api/config` and reads `state`. After a restart Home Assistant serves
the API immediately but spends anywhere from seconds to several minutes loading
integrations, during which entities exist and read `unavailable` and service
calls fail. That is `STARTING`, and reporting it as `degraded` rather than
`down` is the difference between waiting and paging somebody.

It is **signed**, unusually for a dependency check here, because there is no
unauthenticated endpoint worth probing — the web UI on `/` returns 200 while the
API is entirely dead. A 401 is therefore reported as `unknown`: the derived
`auth:token` check owns credential failures, and a revoked token is not an
outage.

### `service`

`status.home-assistant.io` is a real Atlassian Statuspage. Read its components
and it is clear what they are: Website, Forums, Developer Docs, PyPi, npm,
GitHub, Updater, Alexa, Google Assistant, Home Assistant Cloud and Remote UI.
That is the **project's** infrastructure and Nabu Casa's cloud services — not
your instance, which is software on hardware you own, quite possibly with no
internet connection at all. An all-green board and a dead instance are entirely
compatible.

It is probed anyway, because for one common class of connection it *is* the
answer: an instance reached through **Nabu Casa Remote UI** depends on that
component directly, and when it is down the instance is fine and unreachable —
which no amount of probing the instance explains. So the check weights the cloud
components, names them when affected, and is capped at `degraded` and marked
`informational`, since an app-scoped check cannot know whether a given
connection goes through Nabu Casa or somebody's own proxy.

### `quota`

Declared unavailable: Home Assistant imposes no API rate limit, because it is
your own server. What constrains an instance is its hardware, and that shows up
as **latency rather than refusal** — a Raspberry Pi asked for `/api/states`
every second gets slower, and the recorder's SQLite database is usually what
gives first. The one real limit is not a quota either: an unfiltered history
query can occupy the recorder for minutes, which is why `history-get` requires
entity ids.

## Icon

`assets/icon.png` (256×256), downloaded verbatim from
`https://brands.home-assistant.io/homeassistant/icon.png` on 2026-08-18 — Home
Assistant's own brands CDN. Checked with `_tools/icon-legibility.ts`.

## Tests

199 assertions across 26 files: one per action, one per auth method, one per
live health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook — plus two specific to this app: `state-set` must keep its device guard,
`history-get` must keep requiring entity ids, and nothing logs a state value, a
template, event data or log content, because these entities are somebody's house.
