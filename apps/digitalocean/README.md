# DigitalOcean

Droplets, block storage, snapshots, reserved IPs, DNS and managed databases —
with the billing surprises made explicit rather than left to the invoice.

- **Categories** — devops, storage
- **Auth methods** — token
- **Actions** — 15
- **Egress allowlist** — `api.digitalocean.com`, `status.digitalocean.com`
- **Website** — https://www.digitalocean.com
- **API docs** — https://docs.digitalocean.com/reference/api/

Probed live against `api.digitalocean.com` on 2026-08-19.

## Everything bills by the hour until it is destroyed

Three consequences of that surprise people, none of them visible in an API
response, and the app is built around making each one impossible to miss:

| | |
| --- | --- |
| **A powered-off droplet still bills.** | Only `archive` stops the charge — `off` does not. "Turn it off over the weekend" saves nothing. |
| **Destroying a droplet does not destroy its volumes or snapshots.** | They survive, keep billing, and are no longer attached to anything that would remind you. |
| **A reserved IP bills while it is *not* assigned.** | The charge is for holding an address out of the pool, so the state that looks unused is the one that costs — and destroying a droplet creates it automatically. |

`droplet-list` counts the powered-off droplets, `droplet-delete` refuses until
the volumes it will orphan are acknowledged, and `reserved-ip-list` names the
addresses being paid for. The `index.ts` suite asserts all three statements are
still in the app.

## `power_off` is pulling the plug; `shutdown` is not

The names do not convey this and DigitalOcean's own documentation warns about
it:

- **`shutdown`** sends an ACPI signal and lets the OS stop cleanly. It can fail
  — a hung machine ignores it — and then nothing happens.
- **`power_off`** cuts the power. It always works, and risks exactly what
  pulling the plug on a server risks: unflushed writes lost, filesystems dirty,
  databases recovering on next boot.

So `droplet-power` defaults to `shutdown` and gates the hard forms, which is the
reverse of how convenient they are to type.

## Half of a resize cannot be undone

`disk: false` changes CPU and RAM and is reversible. `disk: true` grows the disk
**permanently** — it can never be shrunk, so the droplet is stuck at or above
that size, and so is its price floor. One boolean apart. `droplet-resize`
defaults to the reversible form.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `account-get` | read | The account and its resource limits |
| `billing-get` | read | Month-to-date usage and the balance |
| `droplet-list` | search | Droplets, and how many are off but billing |
| `droplet-get` | read | One droplet, public and private IPs separated |
| `droplet-create` | perform | Create one — not ready when it returns |
| `droplet-power` | perform | On, graceful stop, or cut the power |
| `droplet-resize` | perform | Resize — permanently, if the disk is included |
| `droplet-delete` | perform | Destroy it, and see what it orphans |
| `snapshot-create` | perform | The only way back from either |
| `snapshot-list` | search | Snapshots, their size and their age |
| `volume-list` | search | Volumes, and which are attached to nothing |
| `reserved-ip-list` | search | Reserved IPs, and which are being charged |
| `domain-record-list` | search | DNS records, with qualified names |
| `domain-record-create` | perform | Add one, without the doubling mistake |
| `database-list` | search | Managed clusters, passwords stripped |

### Things the actions do that the API does not

- **`droplet-get` separates the public and private addresses.** Taking
  `networks.v4[0].ip_address` gets whichever came first, which on a droplet with
  private networking is often the private one — and connecting to that from
  outside fails in a way that looks like a firewall problem.
- **`droplet-create` refuses to omit SSH keys silently.** With no key,
  DigitalOcean generates a root password, **emails it in plain text**, and
  leaves password authentication enabled. That is a real security difference
  decided by an optional field, so it needs an acknowledgement. It also defaults
  `monitoring` on (free, and off in the API) and reports `ready: false`, because
  a 202 is a droplet that exists and does not work yet.
- **`droplet-resize` checks the droplet is off first** and explains why that is
  not a formality: the droplet is unavailable for the whole operation, which on
  a large disk is tens of minutes. It also reports that the droplet **stays
  off** afterwards, which a workflow that resizes and walks away otherwise
  discovers later.
- **`snapshot-create` says whether the snapshot is crash-consistent.** Taking one
  of a running droplet is allowed and gives the state a machine would be in
  after a power cut — for a database, a restore that may need recovery.
- **`domain-record-create` refuses a fully-qualified name.** A record named
  `www.example.com` under `example.com` serves
  `www.example.com.example.com`, and the API accepts it without complaint — it
  resolves to nothing and looks like a propagation delay for as long as anyone
  is prepared to wait. It also adds the trailing dot to CNAME, MX and NS data
  for the same reason, and defaults the TTL to **300** rather than 1800, because
  a TTL is the length of the window a mistake keeps being served after it is
  fixed.
- **`database-list` strips the password.** DigitalOcean's connection strings
  embed the admin password; returning one into a workflow's data puts a
  credential into a log. Host, port, user and database come back separately, and
  the private endpoint too — private traffic is not billed and does not leave the
  VPC.
- **`snapshot-list` reports the oldest and its age.** Snapshots have no expiry,
  outlive whatever they were taken from, and nothing mentions them afterwards.
  The oldest ones in an account are usually the orphans, and age is the only
  clue — there is no flag for "the source is gone".

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is the API up — and which product, where? |
| `quota` | quota | connection | signed | How much of the hourly budget is left |

### `service` — a component's name is not its identity

Measured: `status.digitalocean.com` lists **256 components**, 17 of them groups.
And the names repeat, heavily:

| Component name | Appearances |
| --- | --- |
| `Global` | **15** |
| `MKC1` | 14 |
| `ATL1`, `AMS3`, `FRA1`, `SFO3` | 13 each |

`Global` appears once per product group; each region code once per product that
runs there. So "FRA1 is down" means nothing on its own — a check matching on name
would conflate Droplets in Frankfurt with Volumes in Frankfurt and Kubernetes in
Frankfurt.

**The only identity is `(group, component)`**, resolved through `group_id`, and
that is what this reports: `Droplets / FRA1`. It also skips group components when
counting, because a group rolls up its children and counting both double-counts.

The `API` component sits outside every group and is the one this app needs. When
it is out, every action fails and every existing droplet keeps serving traffic —
the same split as `apps/particle`, for the same reason.

### `quota` — a real one, for once

DigitalOcean is one of the few APIs in this pack that publishes an account-wide
budget and reports it on every authenticated response: **5,000 requests an
hour**, per token, shared by every automation using it.

Two things worth knowing. `RateLimit-Reset` is a **Unix timestamp**, not a
duration — the opposite of nearly everything else here, and treating it as a
delay produces a wait of fifty-five years. And the headers are **absent on a
401**, verified, so a check that fails to authenticate learns nothing about
headroom and reports `unknown` rather than exhausted.

## Icon

`assets/icon.svg`, downloaded verbatim from DigitalOcean's own favicon at
`www.digitalocean.com/_next/static/media/favicon.91372345.svg` on 2026-08-19 —
the mark alone, 877 bytes, md5 `c557e0307df1378cfbf3f452a872d6b6`.
`assets/icon.dark.svg` is the reversed variant generated by
`_tools/icon-legibility.ts`.

## Tests

343 assertions across 20 files: one per action, one per auth method, one per
health check, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no dynamic imports,
no action touching a credential — plus three specific to this app: **every
irreversible or expensive path still has its gate**, **all three billing
surprises are still stated by an action**, and **nothing logs a connection URI,
DNS record data or cloud-init user data**, checked on the log call's values
rather than its keys.
