# Statuspage

Publish to an Atlassian Statuspage from a workflow — set component statuses,
open and update incidents, and read the subscribers who will be told.

- **Categories** — monitoring, communication, devops
- **Auth methods** — api-key
- **Actions** — 12
- **Egress allowlist** — `api.statuspage.io`
- **Website** — https://www.atlassian.com/software/statuspage
- **API docs** — https://developer.statuspage.io

## This app writes what the rest of this pack reads

Nearly every health check in this catalogue consumes a Statuspage document —
`components.json`, `summary.json`, `status.json`. This app is the other side of
that seam: it is how a workflow publishes the status *its own* customers read.

The vocabularies are the same strings those checks map from:

| | Values |
|---|---|
| Component status | `operational`, `degraded_performance`, `partial_outage`, `major_outage`, `under_maintenance` |
| Incident status | `investigating`, `identified`, `monitoring`, `resolved` |
| Incident impact | `none`, `minor`, `major`, `critical` |

## Setup

Statuspage → **Account settings** (top-right menu) → **API info** → copy the key.

The header scheme word is **`OAuth`**, not `Bearer` — Statuspage's own
convention, and unusual enough that a client assuming `Bearer` fails with the
same `{"error":"Could not authenticate"}` a wrong key produces. There is no
OAuth flow behind it; it is a static key.

The **page id** is recorded on the connection so actions do not each ask for it.
When the key reaches exactly one page — the common case — it is resolved
automatically at connect time; an account running several (an internal page
beside a public one) can name one, and any action can override it.

## One request per second — which shapes the whole design

Statuspage: *"Each API token is limited to 1 request / second as measured on a
60 second rolling window."* That is the tightest limit in this pack, and
exceeding it answers **`420` or `429`** — the 420 being Statuspage's own, and
unusual enough that a generic client treats it as an unknown failure. This app
names both.

So **nothing here loops over components**:

- `incident-create` sets every affected component's status in the *same request*
  that opens the incident;
- `incident-update` does the same for an update;
- `incident-resolve` restores them in the request that closes the incident;
- `metric-data-add` takes an array of points for a backfill.

A workflow that instead called `component-status-set` six times would take six
seconds, during which the page is half-updated in front of customers. A test
asserts no action writes inside a loop.

## Telling customers is a decision, so it is never a default

`deliver_notifications` emails, texts and pushes **every subscriber
immediately**, and cannot be recalled. It defaults to **off** on every action
that offers it, and is always sent explicitly, so an automated first post cannot
page an entire customer base off a flapping check.

It is per **update**, not per incident — which makes the sensible pattern easy:

1. `incident-create` — publish quietly, so the page is honest immediately;
2. `incident-update` — notify once, on the update a human has confirmed is worth
   interrupting somebody for;
3. `incident-resolve` — notify again, because the all-clear is usually worth
   sending if anything was.

`subscriber-list` is how a workflow can see the blast radius first. Subscribers
can be subscribed to the whole page or to **specific components**, so a raw
count understates how targeted a notification actually is.

## Two mistakes this app is shaped to prevent

### A red component with no incident

Setting a component's status changes a coloured dot and the page's headline
indicator. It posts **no update, notifies nobody, and creates no incident** — so
customers see that something is wrong and are told nothing about it, which is
usually worse than the outage.

`component-status-set` says so in its own description and points at
`incident-create`, which does both in one request. The status-only action is
still right for an automated recovery, a degradation not worth a notification,
or closing the loop after the incident was already published.

### A resolved incident above red components

Closing an incident does not restore what it broke. The page then reads "all
resolved" over a row of outage dots, which looks like broken tooling and
undermines every future update.

`incident-resolve` reads the incident's own component list and returns those
components to `operational` in the same call that resolves it. Turn the restore
off and pass explicit statuses for a partial recovery where one component
genuinely is still degraded.

## Actions

| Key | Type | Description |
|---|---|---|
| `incident-create` | perform | Open an incident **and** move its components |
| `incident-update` | perform | Post an update to the timeline |
| `incident-resolve` | perform | Close it and restore the components |
| `incident-list` | read | Unresolved, all, or scheduled |
| `incident-get` | read | One incident with its full timeline |
| `component-status-set` | perform | One component's status, silently |
| `component-list` | read | Components, ids and current statuses |
| `component-create` | perform | Add a component to the page |
| `component-group-list` | read | Groups (whose status is derived) |
| `metric-data-add` | perform | Publish a value to a metric graph |
| `subscriber-list` | read | Who gets notified, and how |
| `page-list` | read | Pages this key can reach |

## Things worth knowing

### Check what is already open

`incident-list` defaults to the **unresolved** collection, which answers "is
something already open that we have told customers about". That is the check
behind "open a new incident or update the existing one" — and skipping it is how
a status page ends up with three incidents for one outage, which reads as
unattended.

### A component group's status cannot be set

It is derived from its members. The way to make a group go red is to make a
component inside it go red, and there is no action here that pretends otherwise.

Note the path spelling too: `component_groups` with an underscore, while
components and incidents use plain segments. Statuspage mixes conventions, and
the wrong one 404s.

### A component nobody can see

`showcase` decides whether a component appears on the public page. Without it
the component exists, can be set to `major_outage`, and no customer sees
anything. `only_show_if_degraded` is the middle ground: hidden until it breaks,
which keeps a long tail of subsystems off the page while still letting them
raise an alarm.

Component names are **not unique**, so `component-create` run twice makes two
components with the same name — which is why it is not idempotent and why a
provisioning workflow should read `component-list` first.

### Metric timestamps are seconds

Not milliseconds. A millisecond timestamp lands the point roughly fifty thousand
years in the future, where the graph will never show it and nothing will
complain. `metric-data-add` converts an ISO date and refuses anything it cannot
read.

A metric shows customers that things are *fine*, continuously — a different job
from an incident telling them things are broken occasionally. The metric must
already exist and be configured for API submission; this writes points, it does
not create it.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Statuspage itself up? |
| `quota` | quota | Declared absent — see below |

`service` reads **Atlassian's own status page**, which is itself a Statuspage
(`metastatuspage.com`, verified 2026-08-18, page name "Atlassian Statuspage").
So this check parses exactly the document shape that this app's actions write.

It matters more than a usual vendor check because of what this app is for: when
Statuspage is down, a workflow cannot tell its customers that anything *else* is
down — the outage silences the channel used to report outages. Catching it lets
a workflow fall back to another channel rather than assuming the message got
out.

`quota` is a **declared absence**. The limit is the tightest in this pack — one
request per second per key — but there is no way to see the remaining budget:
verified 2026-08-18, responses carry no `x-ratelimit-*` header of any kind and
no endpoint reports consumption. The only signal is the breach, as a `420` or a
`429`. Probing would spend the very budget it measures, against a limit of one
per second, so the client names the limit in the error instead.

## What this app deliberately does not do

- **Creating and deleting subscribers.** Adding somebody to an outage mailing
  list is a consent decision, and removing them silently ends a notification
  they may be relying on.
- **Deleting incidents.** A status page is a public record; rewriting history is
  not something a workflow should make easy. Resolving is the honest close, and
  a test asserts no action issues a DELETE.
- **Page settings, branding and custom domains.** Configured once, by a human.
- **Postmortems.** Written prose with a publication workflow of their own; an
  automation has nothing useful to say in one.
