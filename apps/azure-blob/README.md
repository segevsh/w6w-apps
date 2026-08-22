# Azure Blob Storage

Containers and blobs, uploads and downloads, tiers, leases and metadata —
completing the pack's object-storage set alongside `apps/s3` and `apps/gcs`.

- **Categories** — storage, devops
- **Auth methods** — shared-key
- **Actions** — 14
- **Egress allowlist** — `*.blob.core.windows.net`, `azurestatuscdn.azureedge.net`
- **Website** — https://azure.microsoft.com/products/storage/blobs
- **API docs** — https://learn.microsoft.com/rest/api/storageservices/blob-service-rest-api

Built against Microsoft's REST documentation and probed live against a public
storage account on 2026-08-19. API version `2021-12-02`.

## It answers XML, and there is no JSON option

Every other app in this pack parses JSON. There is no `Accept` header that
changes this one — `List Containers`, `List Blobs` and every error come back as
XML.

`lib/xml.ts` is a deliberately small reader for exactly the shape Azure sends:
element-only trees of text leaves. It is **not a general XML parser** and says
so, because a general one has to take a position on namespaces, entities, CDATA
and mixed content, and would be wrong in subtler ways. In particular it resolves
no entities beyond the five XML predefines — the class of bug that makes XML
parsing dangerous is absent because the capability is absent, and a test asserts
that a declared external entity stays literal text.

XML also has no types. `<Content-Length>1024</Content-Length>` is the string
`"1024"`, and the actions convert what they need rather than coercing on the way
through.

## Shared Key is the one scheme here that signs inside the hook

The pack now has three signing schemes, and this is the only one where the auth
hook can do the whole job:

| App | Scheme | Where the signature comes from |
| --- | --- | --- |
| `apps/s3` | AWS SigV4 | — |
| `apps/gcs` | Google V4 | IAM Credentials, remotely — an action must not hold the key |
| **`apps/azure-blob`** | **Shared Key** | **the auth hook, from the request in front of it** |

Everything Shared Key needs is on the request being signed: method, path,
query, the `x-ms-*` headers and the body's length and type. So no action ever
touches the key.

The string to sign is twelve fixed lines, most of them empty, then the
canonicalized headers and resource. The positions are load-bearing — a missing
line shifts everything after it — and two details cause most failures:

- **`Content-Length` is an empty string when the body is empty**, not `0`. This
  is the single most common reason a signature verifies for GETs and fails for
  writes.
- **The account key is base64 and must be decoded before use as the HMAC key.**
  Using the text produces a signature that never verifies and a 403 that says
  only `AuthenticationFailed`.

Both constructions are pinned to **known-answer vectors computed independently**
in Python from Microsoft's documented format, not from this code. The GET
vector's string-to-sign is byte-identical in shape to the worked example in
Microsoft's own documentation. A drift in line order, header sorting or query
encoding fails the suite even while the code stays self-consistent.

## The account is the hostname

`https://{account}.blob.core.windows.net`. There is no global endpoint and no
account parameter, which is why the account is part of the credential and why a
wrong name **fails to resolve** rather than answering 404. The health check
reports that case separately, because it is a deleted or renamed account far
more often than an outage.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `container-list` | search | The account's containers, and which are public |
| `container-get` | read | One container's access, lease and immutability |
| `container-create` | perform | Create one, private by default |
| `container-delete` | perform | Delete it **and everything in it** |
| `blob-list` | search | What is in a container, including what is hidden |
| `blob-get` | read | A blob's properties, from headers alone |
| `blob-download` | read | Its contents, as text |
| `blob-upload` | perform | Write one, safely if asked |
| `blob-copy` | perform | Copy, or move |
| `blob-delete` | perform | Remove one |
| `blob-undelete` | perform | Bring a soft-deleted one back |
| `blob-set-tier` | perform | Move between Hot, Cool, Cold and Archive |
| `blob-metadata-set` | perform | Replace custom metadata |
| `blob-lease` | perform | Take an exclusive lock |

### Things the actions do that the API does not

- **`blob-lease` is a real lock, and its neighbours have none.** S3 and Cloud
  Storage offer only optimistic concurrency — write with a precondition, lose
  the race. Azure has a *lease*: a pessimistic lock on one blob that makes every
  other writer fail until it is released. That is the right tool for read →
  compute slowly → write back, where a precondition wastes the work.
  **Infinite leases are deliberately not offered**, and the index test asserts
  it: losing the id of one locks the blob until somebody breaks it by hand.
- **`container-delete` counts the blobs first.** Unlike S3 and Cloud Storage,
  Azure deletes a container **with all its blobs**, however many, from one call
  — no count in the request, no confirmation in the response. So this counts
  them, requires the number acknowledged, and refuses outright when there is
  more than a page and no honest number can be shown.
- **`blob-get` reads everything from headers**, because the body is empty by
  design. It reports `readable: false` for an Archive-tier blob, which is not
  slow storage — it is **offline**, and a download is a 409 until a rehydration
  of up to 15 hours completes.
- **`blob-set-tier` gates archiving and reports what each move commits you to.**
  Cool bills 30 days minimum, Cold 90, Archive **180**, restarted on every move
  and billed whether or not the blob survives. A lifecycle policy that tiers
  aggressively and then deletes can cost more than leaving everything in Hot.
- **`blob-delete` reads the retention policy first**, because whether a delete
  is reversible is an account setting and the response is identical either way.
  When the policy cannot be read — it needs an account-level permission — it
  says so rather than guessing.
- **`container-create` and `container-list` treat the two public levels as
  different things.** `blob` means any known URL is readable; `container` means
  anyone can *list* and read everything, with nothing to guess. Creating either
  needs an acknowledgement, and the refusal says which one you asked for.
- **`blob-metadata-set` reports what it removed.** There is no merge — sending
  one name leaves the blob with only that name — and both the replace and the
  clear succeed silently. Metadata names must also be valid **C# identifiers**,
  so a hyphen is rejected, and their case does not survive the round trip
  because they travel as HTTP headers.
- **`blob-copy` refuses to delete the source of a pending copy.** A copy is
  asynchronous: 202 comes back with the destination already existing and its
  contents still being written.
- **`blob-list` names what is hidden.** Snapshots, versions, soft-deleted blobs
  and — the one that explains a container billing for more than it appears to
  hold — **uncommitted blocks** from an interrupted upload that belongs to no
  blob at all.

## What this app deliberately does not do

**Mint SAS URLs.** Azure's equivalent of a signed URL is signed with the account
key, and an action never sees a credential — that is a rule of the app sandbox,
not a preference. Google's version of this feature is buildable because Google
offers a *remote* signing service (`IAM Credentials signBlob`); Azure has no
equivalent for a service SAS, so the same feature is possible there and not
here, for a structural reason rather than an oversight.

Two things would change that: a host signing extension (`ctx.host`, which would
tie the app to one host), or Entra ID authentication plus a user delegation key,
which is a different credential from the account key this app takes.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Declared unavailable — the feed is prose |
| `account` | dependency | connection | signed | Is *this* account reachable |

### `service` — declared unavailable

Azure publishes no status API. The machine-readable surface is an **RSS feed**
of incident announcements whose items are English prose — a title, a
description, a date — with no per-service state to read. Deciding health from it
would mean matching prose against a service name, which reports a historical
incident as a current outage and misses a live one worded differently.

It would also answer the wrong question. Azure Storage health is per **region**
and per account, while the feed is a global announcement channel. Per-
subscription health does exist in the Azure Service Health API, but that is
Azure Resource Manager: it needs an Entra ID credential and a subscription id,
and is not reachable with a storage account key.

### `account`

Lists containers against this connection's own account. It is **signed**, and
unusually so: almost every other connection check in this pack probes something
unauthenticated so a revoked credential does not read as an outage, and Azure
gives no such endpoint — an unauthenticated request is a 400 or 403 whatever the
account's health.

So rather than implying it can separate an outage from a rotated key, it says
which a given failure looks like:

- **A name that does not resolve** — a deleted or renamed account, not an
  outage.
- **`AuthenticationFailed` or 403** — a rotated key, *or* **clock drift**: Azure
  rejects a request whose `x-ms-date` is more than 15 minutes from its own
  clock, with an error that mentions nothing about time.
- **A 5xx** — Azure.

## Icon

`assets/icon.svg` is `10780-icon-service-Blob-Block.svg`, taken **verbatim**
from Microsoft's own Azure architecture icon set
(`arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip`, linked
from `learn.microsoft.com/azure/architecture/icons/`) on 2026-08-19 — first
party rather than a mirror. 1,073 bytes, md5 `95f797f1faa2b3a1cbb532efbfabe268`.
Checked with `_tools/icon-legibility.ts`; it passes both themes unmodified.

## Tests

448 assertions across 21 files: one per action, one per auth method, one per
health check, the client, the XML reader, the signer, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, **no dynamic
imports**, and no action touching a credential **or the signing key** — plus
three specific to this app: **every irreversible or exposure-widening path still
has its gate**, **no action offers an infinite lease**, and **nothing logs a
blob's contents, its metadata values or a lease id**, checked on the log call's
values rather than its keys.
