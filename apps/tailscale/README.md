# Tailscale

Inspect and manage the devices, auth keys, users and access policy of a
tailnet.

- **Categories** — security, devops
- **Auth methods** — api-key, oauth-client
- **Actions** — 16
- **Egress allowlist** — `api.tailscale.com`, `status.tailscale.com`
- **Website** — https://tailscale.com
- **API docs** — https://tailscale.com/api

Built against the OpenAPI 3.1 spec that Tailscale's own API serves at
`https://api.tailscale.com/api/v2?outputOpenapiSchema=true`, and probed live on
2026-08-19.

## An API outage is not a network outage

Tailscale's data plane is peer-to-peer. Devices that have already exchanged keys
keep talking whether or not `api.tailscale.com` is answering — what an outage
stops is *change*: new devices joining, ACL updates propagating, keys being
exchanged for connections not yet established.

That inverts the intuition every other app in this pack teaches, so the health
check is built around it: the reported state follows the **API** component, and
the **coordination service** and **DERP relays** are reported alongside it and
never as this app's failure. A workflow's calls can fail while the tailnet
carries on, and the reverse is equally possible.

## There is no pagination

Tailscale's spec says it in as many words: "The Tailscale API does not currently
support pagination. All results are returned at once." A tailnet with five
thousand devices returns five thousand devices, and there is no cursor to loop
on and no page size to lower.

So `device-list` filters **server-side** — `<field>=<value>` on any top-level
property, matched exactly and ANDed together, with repeated `tags` meaning *all
of them*. That is not a convenience; it is the difference between a query and a
megabyte of JSON.

## Two credentials, and the error cannot tell them apart

| | API access token | OAuth client |
| --- | --- | --- |
| Prefix | `tskey-api-` | `tskey-client-` |
| Expires | **1 to 90 days**, no refresh | never |
| Belongs to | a person, with their permissions | the tailnet |
| Scoped | no — whatever that user can do | yes, fixed at creation |

Verified live: a bad token and a bad OAuth client **both** return
`{"message":"API token invalid"}` with HTTP 401. The message says nothing about
which is wrong, or that a token has simply reached its expiry date — which is
the single commonest way an automation against Tailscale stops working. Both
`describeError` and the auth test say so.

For anything long-lived, use `oauth-client`. Its one sharp edge: **scopes are
fixed at creation**, so a missing one appears as a 403 on a single endpoint
while everything else keeps working, and the only fix is a new client. The auth
test names that case specifically.

## Every path takes a tailnet, and it should be `-`

`-` means the calling credential's own tailnet. An explicit id like
`T1234CNTRL` is offered on the connection for a credential with access to
several, which is rare.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `device-list` | search | Every machine, filtered server-side |
| `device-get` | read | One machine, and how long its key has left |
| `device-authorize` | perform | Approve a waiting device, or cut one off reversibly |
| `device-tags-set` | perform | Give a machine a non-human identity |
| `device-routes-get` | read | Advertised against enabled routes |
| `device-routes-set` | perform | Approve what a subnet router may carry |
| `device-expire-key` | perform | Force a machine to log in again |
| `device-delete` | perform | Remove a machine from the tailnet |
| `key-list` | search | Auth keys, API tokens and OAuth clients |
| `key-create` | perform | Mint an auth key so something can join |
| `key-delete` | perform | Revoke a key |
| `acl-get` | read | The policy file, comments intact |
| `acl-validate` | perform | Test access, or a proposed policy, changing nothing |
| `user-list` | search | Who is in the tailnet, and in what state |
| `user-suspend` | perform | Suspend or restore a person |
| `dns-get` | read | Nameservers, MagicDNS, search paths and split DNS |

### The app reads the policy file and does not write it

`acl-validate` covers the half of policy automation that is safe to hand to a
machine: send an **array** and Tailscale runs those tests against the live
policy; send an **object** and it validates a hypothetical policy file without
installing it. Neither changes anything.

Writing the policy file is deliberately absent. A change to who may reach what
belongs in a reviewed commit, and the natural shape is a workflow that validates
a proposed policy in CI and lets a human merge it. An `index.ts` test asserts no
action POSTs to `/acl`.

### Things the actions do that the API does not

- **Three actions replace a list, and all three offer `add` and `remove`
  instead.** Tailscale has no add-a-tag and no add-a-route endpoint: `POST`
  replaces. Sending `["tag:web"]` to a device tagged `["tag:web","tag:prod"]`
  removes `tag:prod` and every ACL rule that depended on it, and the symptom is
  a machine quietly losing access. `device-tags-set` and `device-routes-set`
  read the current list first, merge if asked, and report exactly what was
  withdrawn.
- **`device-routes-get` returns the overlap and both differences.** Traffic
  flows only where advertised and enabled meet, and each half alone is its own
  failure: advertised-not-enabled is a subnet router carrying nothing;
  enabled-not-advertised is an approval for a route the device no longer offers.
  Advertised routes **cannot be set through the API** — they are set on the
  machine — so `device-routes-set` warns when it approves something that is not
  on offer.
- **Approving `0.0.0.0/0` requires an acknowledgement.** The same field and the
  same shape as a subnet route, and a completely different decision: an exit
  node carries all of the tailnet's internet traffic. Pattern-matching a CIDR
  list is exactly how that happens by accident.
- **`device-list` computes `offline` from `connectedToControl`, not
  `lastSeen`.** Tailscale *omits* `lastSeen` when a device is connected, so
  sorting by it puts the healthy machines at the bottom as undefined —
  indistinguishable from a device that has never been online. It also surfaces
  `multipleConnections`: several machines live on one node key, which usually
  means a Tailscale state directory was copied, and which nothing else reports.
- **`key-create` defaults to the careful end of every choice** — single-use,
  ephemeral, not preauthorized — and warns when a key is both reusable *and*
  preauthorized, which is a standing invitation into the tailnet. The secret it
  returns exists nowhere else: Tailscale's spec says "the full key can no longer
  be retrieved after the initial response", so whatever receives it must store
  it then. A test asserts it is never logged.
- **`key-delete` refuses to revoke an API token or OAuth client** without an
  explicit flag, because those are what programs authenticate with and one of
  them may be this connection's own — revoking it succeeds, and then every later
  call 401s in a way that reads as an outage. It also reports that revoking an
  auth key **does not evict machines that already joined**; they hold their own
  node keys now.
- **`device-expire-key` and `device-delete` both demand confirmation, and each
  points at the gentler option.** Expiring a key forces a login *on the machine*,
  which an unattended server may have nobody to perform; deleting does not stop
  Tailscale on the machine, so one holding a valid auth key can rejoin as a new
  device. De-authorizing does neither and is reversible.
- **`user-suspend` reports the device count.** Suspending stops a person
  authenticating and leaves their existing devices working until their node keys
  expire — up to 180 days, or never for a tagged machine. Offboarding is this
  plus expiring those devices, and the count is the part people miss.
- **`user-list` separates the two states that mean "locked out with no error"**:
  `needs-approval` and `over-billing-limit`. One is fixed by an admin clicking
  approve and the other by a purchase order, and to the user both look like
  Tailscale simply not working.
- **`acl-get` returns HuJSON verbatim.** The policy file is JSON *with comments*,
  and the endpoint will hand back plain JSON — losing every one of them. A
  policy file is mostly explanation, so round-tripping it through JSON deletes a
  team's reasoning in a diff that looks like reformatting. It also fetches
  `details=true` separately, which is the only way to see Tailscale's
  **warnings**: rules that parse, are live, and grant access to nobody.
- **`dns-get` reads four endpoints as one setting.** Removing the last global
  nameserver switches **MagicDNS off automatically**, and adding one back does
  not switch it on — between those moments every `*.ts.net` name stops
  resolving. It also names the split-DNS resolvers on private addresses, since
  those depend on a subnet route and a withdrawn route presents as DNS being
  broken rather than as routing being broken.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is the API up — and, separately, is the network |
| `quota` | quota | connection | none | Declared unavailable — no headers exist |

### `service`

Reads `status.tailscale.com/api/v2/summary.json` and weights **API
(api.tailscale.com)**, which is what every action here calls. The coordination
service and DERP relays are reported alongside and cap the state at `degraded`,
never `down`, because they are the tailnet's problem rather than this app's.

DERP is the subtler of the two: relays carry traffic only for peers that could
not connect directly, so an outage takes out *some* connections — typically
behind hard NATs — while leaving most of the tailnet fine. A per-device symptom
with a global cause.

A component the feed no longer lists reports `unknown` rather than an outage.
Statuspage component names are editable, and a rename is a check to fix.

### `quota`

A declared absence, measured rather than assumed. On 2026-08-19 neither a
successful request nor a rejected one carried `RateLimit-*`, `X-RateLimit-*` or
`Retry-After`, and the spec documents no rate-limit response. The one header
worth having is `x-tailscale-request-id`, which Tailscale support can trace —
a diagnostic, not a budget, so this app puts it into error messages instead.

The ceiling that actually binds an account is the plan's **user and device
count**. `user-list` reports anyone in `over-billing-limit` — a person locked
out because the plan is full — and `device-list` counts the fleet.

## Icon

`assets/icon.svg`, downloaded verbatim from `https://tailscale.com/favicon.svg`
on 2026-08-19 (md5 `1070ee40cdde998e428dfa0821d30bfc`) — the site's own icon
link. `assets/icon.dark.svg` applies **Tailscale's own dark-theme palette**,
which the source file ships commented out in its `<style>` block, as attributes
so `_tools/icon-legibility.ts` reads the same colours a renderer does. Both
themes pass.

## Tests

377 assertions across 22 files: one per action, one per auth method, one for the
health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus four specific to this app: **no action writes the policy file**,
the irreversible actions **require a confirmation**, `device-routes-set` gates
approving an **exit node**, and no action logs a key, an address or a login name.
