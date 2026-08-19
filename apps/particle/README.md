# Particle

Manage Particle IoT devices: list and inspect them, read variables and call
functions on the hardware itself, publish events to a fleet, and watch what a
cellular fleet is costing.

- **Categories** — iot, devops
- **Auth methods** — access-token
- **Actions** — 13
- **Egress allowlist** — `api.particle.io`, `status.particle.io`
- **Website** — https://www.particle.io
- **API docs** — https://docs.particle.io/reference/cloud-apis/api/

Probed live against `api.particle.io` on 2026-08-19.

## This app talks to hardware, and that changes everything

Every other app in this pack moves data between services. Reading a variable or
calling a function here is **forwarded to a physical device over its own
connection** — cellular, Wi-Fi or Ethernet — and waits for it to answer.

So the failure modes are the hardware's, and the most important one is not a
failure at all: **a device that is offline is very often working exactly as
designed.** A battery-powered sensor that wakes for four seconds an hour is
offline 99.9% of the time and perfectly healthy. A mains-powered gateway that is
offline is broken. The API cannot tell them apart, and neither can this app — so
`device-list` reports counts and the last-heard spread rather than calling
anything unhealthy, and leaves the judgement to a workflow that knows what the
hardware is.

## No credential at all is a 400, not a 401

Measured:

| Request | Status | Body |
| --- | --- | --- |
| no token | **400** | `invalid_request` — "The access token was not found" |
| bad token | 401 | `invalid_token` — "The access token provided is invalid" |
| somebody else's device | 403 | — |

A missing credential presents as a malformed *request*, which is the opposite of
where anyone would look. The client says so.

## A function returns one integer, and that is the whole channel

`Particle.function` handlers have the signature `int (String)`. There is no way
to return data — the convention is a status code, with `-1` commonly meaning
failure — so a function that needs to report something publishes an event or
sets a variable instead. `function-call` returns the integer without
interpreting it, because 0 usually means success and sometimes does not.

The argument is one string, and its limit is not one number. Particle's own
documentation: "a maximum size of 64 to 1024 bytes of UTF-8 characters … the
limit varies depending on Device OS version and sometimes the device". **The
identical call can succeed on one device and fail on another in the same
fleet.** This app enforces the 1024 ceiling, measures in bytes rather than
characters, and says the effective limit may be a sixteenth of that.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `device-list` | search | Devices, with the online split and firmware spread |
| `device-get` | read | One device, and what its firmware exposes |
| `device-ping` | perform | Force a round trip rather than trusting the flag |
| `device-rename` | perform | Change the name or notes |
| `device-signal` | perform | Make one device flash, to find it physically |
| `device-unclaim` | perform | Remove it from the account — not from the world |
| `diagnostics-get` | read | Signal, battery and memory |
| `variable-get` | read | Read a value off the device |
| `function-call` | perform | Make the device do something |
| `event-publish` | perform | Reach a whole fleet with one call |
| `product-list` | read | The fleets this token can reach |
| `product-device-add` | perform | Move devices into a fleet |
| `sim-list` | search | Cellular SIMs and what they are using |

### Things the actions do that the API does not

- **`device-get` is the only place the firmware's contract is written down.**
  `variables` and `functions` are declared by the code *currently running on the
  device*, so the list changes when somebody reflashes it. `variable-get` and
  `function-call` both check it first by default, because a name that is not
  there is a 404 indistinguishable from a missing device.
- **`device-ping` exists because `connected` can be stale.** The flag is the
  cloud's belief, and a device that lost power does not announce it — the cloud
  finds out when the connection times out. A ping is a round trip now, and the
  action reports `stale` when the record and reality disagree. It costs the
  device a little data, which is real on a metered SIM.
- **`diagnostics-get` returns the three numbers that explain most field
  failures** — signal strength, battery charge and free memory — none of which
  appear in `device-get`. A device at the edge of coverage reconnects constantly
  and looks intermittently broken; a firmware leak shows as free memory falling
  between reports, days before resets start. These are the **last reported**
  vitals, so an offline device still has them, from just before it went quiet.
- **`device-signal` is the only action here whose output is in the physical
  world.** It answers "which of these forty identical boxes is
  `0123…4567`" by making that one flash. Nothing else can: the device id is not
  printed on the case.
- **`device-unclaim` does not touch the device.** Same firmware, same
  credentials, still connecting to Particle — and on cellular, still using data.
  It is not a way to decommission hardware, and it is not destructive either:
  reclaiming restores everything.
- **`event-publish` defaults to private, against the API.** `private=false`
  publishes to the stream **every Particle account in the world** can subscribe
  to, and there is no way to recall an event. Both byte limits are checked here
  because a device receiving a truncated payload cannot tell that it was.
- **`product-device-add` warns that it can reflash.** A device added to a
  product with an active firmware release is updated to that firmware on its
  next connection, with nobody touching the device — and it leaves the claiming
  account, so a personal token stops reaching it.
- **`sim-list` is the only visibility into what a fleet costs.** A device with a
  firmware bug publishing every second instead of every hour looks connected,
  responsive and healthy, and surfaces weeks later as a data bill. A SIM past its
  limit stops passing traffic entirely, silencing its device in a way that looks
  exactly like an outage.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is the API up — and is device connectivity? |
| `quota` | quota | connection | none | Declared unavailable — data is the real budget |

### `service` — two halves that fail independently

This is what makes an IoT status page different. Particle lists 23 components,
and they split into two groups:

- **`REST API`** — what this app talks to. When it is out, every action here
  fails and every device carries on running its firmware perfectly well.
- **`Cellular Connectivity`, `Wi-Fi Connectivity`, `2G/3G NorAm`, `Ether SIM`,
  and a component per device family** — how devices reach the cloud. When one of
  those is out, **the API answers normally** and the affected devices are
  unreachable: variables time out, functions do not run, and nothing about the
  API looks wrong.

A workflow reading variables cares about the second; one listing devices cares
about the first. Reporting a single "Particle is fine" would be wrong for one of
them, so the check reports both — and names the affected hardware families
rather than counting them, because a cellular outage is usually partial and the
names are the only way to tell which devices are in it.

### `quota` — declared unavailable

Particle publishes no rate-limit header, and its documented limits are **per
endpoint**, so there is no single number even in principle.

More to the point, the budget that runs out on a cellular fleet is **data**, not
requests — and `sim-list` reports that, including the SIMs already cut off for
exceeding it.

## Icon

`assets/icon.png` (256 × 256), extracted from Particle's own console favicon at
`console.particle.io/favicon.ico` on 2026-08-19 — the largest entry in the
multi-resolution icon, re-encoded from its BMP frame to PNG without resampling
or recolouring, so the artwork is unmodified. md5
`fcc6d2a97c7d0c74f70f313443c1908d`.

A raster rather than a vector because Particle publishes no square SVG mark: the
docs logo is a 512×121 lockup, which a square tile cannot hold. `apps/cal` sets
the same precedent for the same reason.

## Tests

310 assertions across 18 files: one per action, one per auth method, one per
health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no dynamic imports,
no action touching a credential — plus three specific to this app: **every
consequential path is still gated or checked**, **publishing still defaults to
private and the device checks still default to on**, and **nothing logs a
variable value, a function argument or an event payload**, checked on the log
call's values rather than its keys.
