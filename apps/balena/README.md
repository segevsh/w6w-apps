# balena

Manage fleets of Linux devices on balenaCloud — inspect them, configure them,
choose what they run, and reach into them.

- **Categories** — iot, devops
- **Auth methods** — api-key
- **Actions** — 16
- **Egress allowlist** — `api.balena-cloud.com`, `status.balena.io`
- **Website** — https://balena.io
- **API docs** — https://docs.balena.io/reference/api/overview/

Built against balena's **v7** API and its supervisor documentation, probed live
on 2026-08-19.

## The obvious listing endpoint answers 200 with no credential

This is the thing to know before writing anything against balena. Measured
live, with **no `Authorization` header at all**:

```
GET /v7/application?$top=2
→ 200 {"d":[{"app_name":"internetspeedmonitor", …}, …]}
```

Those are strangers' **public fleets**. balena's own documentation notes that
the unfiltered listing "will also include all public fleets of the platform",
but the consequence in a workflow is sharper than the note suggests:

- A workflow listing "our fleets" silently includes a few hundred hobby
  projects belonging to other people.
- A connection whose credential was revoked **keeps returning a plausible
  answer** rather than failing. `/device` correctly answers 401, so the silence
  is on precisely the call people write first.

Two consequences in this app. `fleet-list` scopes to organizations the caller
belongs to and reports how many public fleets it excluded — a count of zero from
a scoped query means something different from a count of zero overall. And
`auth.test` probes `/user/v1/whoami`, because a credential test written against
the fleet listing would pass with no credential at all.

## Fleets are `application` in the API

balena renamed applications to *fleets* in the product. The resource is still
`application`, the field on a device is still `belongs_to__application`, and the
dashboard says fleet throughout. This app says fleet and sends `application`.

## Two transports, failing independently

| | Reaches | Needs |
| --- | --- | --- |
| OData API | `api.balena-cloud.com/v7` | the API |
| Supervisor proxy | the device itself | the API **and** Cloudlink (the VPN) |

Twelve actions are the first kind. Four — `device-reboot`,
`device-restart-services`, `device-identify`, `device-purge-data` — travel over
balena's VPN to the supervisor running on the device. A Cloudlink outage leaves
every read and every configuration change working perfectly while no device can
be reached, so `health/service.ts` reports the two separately and names the
actions each covers.

The supervisor proxy also means the device must be **online**. There is no
queued reboot: a device that is powered on but off the network cannot receive
the request, and it fails rather than waiting. All four actions check first.

## OData, and a typo is a 500

Queries are `$filter`, `$select`, `$expand`, `$top`, `$orderby`; the array is
always under `d`. Measured: a filter on an unknown field returns **HTTP 500**,
not 400, so a misspelled field name looks like balena having a bad day.
`describeError` says so on any 500 carrying a filter.

Two more shapes worth stating: a filter matching nothing returns an **empty
list**, never a 404 — so "device not found" and "device you cannot see" are the
same response — and a device's `uuid` is 32 hex characters with no dashes, not
an RFC 4122 UUID. The dashboard displays the **first seven**, and that short
form matches nothing, which reads as a device that has been removed.
`assertUuid` catches it with that explanation.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `fleet-list` | search | Fleets in your organizations, not the platform's |
| `fleet-get` | read | One fleet, with the counts that make it legible |
| `device-list` | search | Devices, with both health fields balena reports |
| `device-get` | read | One device, running against target |
| `device-rename` | perform | Give a device a meaningful name |
| `device-move` | perform | Move a device between fleets |
| `device-pin-release` | perform | Pin for a canary, or unpin to follow the fleet |
| `device-env-list` | read | The effective environment, across all three layers |
| `device-env-set` | perform | Set, change or remove a device variable |
| `device-tag-list` | search | Tags for a device, or every device carrying one |
| `device-tag-set` | perform | Set or remove a tag |
| `device-reboot` | perform | Reboot, respecting the update lock |
| `device-restart-services` | perform | Restart the application, not the host |
| `device-identify` | perform | Blink the LED for fifteen seconds |
| `device-purge-data` | perform | Delete `/data` and every named volume |
| `release-list` | search | What has been built, and what is safe to pin to |

### Things the actions do that the API does not

- **`device-list` reads both health fields.** `is_online` is the VPN's view;
  `api_heartbeat_state` adds `timeout` — a device that was talking recently and
  has gone quiet, but is not yet declared offline. On a cellular fleet that
  state is most of the fleet most of the time, and treating it as offline is an
  alert storm about devices that are working. It also requests
  **`overall_status`**, which balena's documentation says is "returned only when
  explicitly requested with $select" — so a plain fetch silently omits the field
  the dashboard displays.
- **`device-get` compares running against target.** balena has three release
  fields — `is_running__release`, `should_be_running__release` and
  `is_pinned_on__release` — and the useful question is whether the first two
  agree. It also reports **how stale the metrics are**: `cpu_temp`,
  `memory_usage` and the rest come from the last heartbeat, so an offline device
  keeps returning a plausible reading from whenever it died, with nothing
  marking it.
- **`device-env-list` layers three endpoints.** A variable can be set on the
  fleet, on the device, or on one service of one device, and the more specific
  wins. No single balena endpoint shows that, so a workflow reading only
  device-level variables gets a wrong answer whenever the value came from the
  fleet. This returns the **effective** value and where it came from, plus the
  fleet values this device shadows — a variable set once for debugging keeps
  overriding the fleet a year later.
- **`device-env-set` says that setting a variable is a deployment.** balena
  applies the change by **recreating the container**; there is no reload. It
  also distinguishes *removing* a variable, which restores the fleet's value,
  from setting it to `""`, which shadows the fleet with an empty string — a
  common way to break a service that checks whether a variable is set.
- **`device-move` names the fleet variables that do not travel.** Device-level
  variables and tags survive a move; **fleet-level ones do not**, and the device
  inherits the destination's instead. That is the commonest way a moved device
  comes up misconfigured, and nothing surfaces it.
- **`device-pin-release` refuses a release that cannot work** — one from another
  fleet, or one whose build failed, both of which balena reports in terms of the
  release rather than the mismatch. It warns when pinning to an **invalidated**
  release, which balena permits. And it states what unpinning means: *follow the
  fleet's target*, which may be newer than what the device is running, so
  unpinning is not a rollback.
- **The supervisor actions understand the update lock.** A service holding one
  is saying it is mid-transaction — a machine cutting metal, a device writing a
  batch. `device-reboot` respects it by default and reports a refusal as the
  **healthy outcome it is**, rather than an error; `force` overrides it and says
  what that interrupts.
- **`device-restart-services` and `device-purge-data` look up the fleet id.** The
  supervisor's body wants an `appId` that nobody driving a workflow has to hand.
  Both also state what they really do: restart **removes and recreates the
  containers** (so anything in a container's writable layer is gone, while named
  volumes survive), and purge clears `/data` and every named volume with no
  snapshot and no undo.
- **`device-identify` admits it cannot be verified.** The supervisor answers 200
  whether or not the board has a user-controllable LED, so a silent success is
  possible. It is also the only action in this app that reaches the physical
  world, and it beats unplugging things until something goes offline.
- **`release-list` filters to releases that can actually run.** A release row
  exists as soon as a build **starts**, so "the latest release" by creation time
  can be a build still going or one that failed. Invalidated releases are
  withdrawn rather than deleted — devices already running them carry on — so a
  rollback target has to exclude them.
- **`device-tag-set` is the safe one.** Unlike an environment variable, a tag
  restarts nothing, redeploys nothing, and does not need the device online. Tags
  are also balena's only grouping between a fleet and a device, which makes them
  how a thousand devices become "the ones in the Berlin warehouse".

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is the API up — and, separately, is the VPN |
| `api` | dependency | app | none | Is `api.balena-cloud.com` answering right now |
| `quota` | quota | connection | none | Declared unavailable — no headers exist |

### `api` — an unauthenticated liveness probe

balena publishes `GET /ping`, which answers the plain text `OK` with no
credential. That is unusual and worth using: most APIs force a choice between
probing with a credential (and being unable to tell an outage from a revoked
key) and trusting a status page a human updates minutes late. This reads the API
itself and still cannot be confused by a credential problem.

The response is two bytes of text, not JSON — a check parsing it would fail on a
healthy API. A body that is *not* `OK` is reported as a proxy or captive portal
answering for balena, which is what that actually means.

### `service`

Weights the **API** component and reports **Cloudlink (VPN)** separately, capped
at `degraded`, naming the four actions a VPN outage breaks. The release pipeline
— `Application Builder`, `Application Registry`, `Delta Image Downloads` — is
reported too, because when it is unhappy the fleet keeps running and a
deployment simply never arrives.

balena's feed also carries a dozen `AWS …` components. They are upstream
context, not balena's health, so this check names the components it cares about
rather than taking the feed's worst — otherwise a regional AWS notice reads as a
balena outage.

### `quota`

A declared absence, measured. On 2026-08-19 neither a successful request nor a
401 carried `RateLimit-*`, `X-RateLimit-*` or `Retry-After`. What binds a balena
account is the plan's **device count**, and what binds a workflow is whether the
device is online at all — which `device-list` reports as the `timeout` heartbeat
state.

## Icon

`assets/icon.png`, 256×256, downloaded verbatim from the favicon the balena.io
site links (md5 `52e3c1a0f7779289559c4160dcc28824`) on 2026-08-19. A raster icon
rather than an SVG, as in `apps/cal-com`; checked in both themes with
`_tools/icon-legibility.ts`.

## Tests

351 assertions across 21 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

Writing the tests found a real bug: the supervisor proxy's JSON body was being
returned as text and never parsed, so a **successful reboot reported
`accepted: false`**.

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: every supervisor action **checks the
device is online first**, the auth test **never probes `/application`**, and
purging **requires a confirmation**.
