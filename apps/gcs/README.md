# Google Cloud Storage

Buckets and objects, uploads and downloads, lifecycle and access — plus V4
signed URLs for handing one object to somebody who has no Google credentials.

- **Categories** — storage, devops
- **Auth methods** — service-account
- **Actions** — 16
- **Egress allowlist** — `storage.googleapis.com`, `oauth2.googleapis.com`,
  `iamcredentials.googleapis.com`, `status.cloud.google.com`
- **Website** — https://cloud.google.com/storage
- **API docs** — https://cloud.google.com/storage/docs/json_api

Built against Google's own discovery document (revision 20260805) and probed
live on 2026-08-19.

## Folders do not exist

Everything else follows from this. A bucket is a flat namespace of objects
whose **names contain slashes**: `logs/2026/08/app.log` is one object with one
name, and there is no `logs` and no `2026`.

The folder-shaped view is synthesised on request. `prefix=logs/` plus
`delimiter=/` splits the response in two — objects directly under the prefix in
`items`, and the next level's synthetic directories in a **separate `prefixes`
array**. Reading only `items` from a delimited listing shows an empty folder
while everything sits one level deeper, and produces no error at all.
`object-list` returns both and counts them.

Two more consequences: there is no rename (a copy and a delete of every object
under a prefix), and an empty folder cannot exist — the console shows one only
because something wrote a zero-byte object whose name ends in `/`.

## Uploads go to a different path

| | |
| --- | --- |
| Metadata, listing, everything else | `storage.googleapis.com/storage/v1/…` |
| Content | `storage.googleapis.com/**upload**/storage/v1/…` |

Posting bytes to the ordinary path does not upload anything, and the error
mentions neither uploads nor paths. It is the most common reason a hand-built
Cloud Storage upload fails.

## Preconditions are what make a write safe

Without one, an upload to an existing name **overwrites it and returns 200**.

| | |
| --- | --- |
| `ifGenerationMatch=0` | only if the object does not exist |
| `ifGenerationMatch={generation}` | only if it is still the version I read |

A precondition that fails is a **412**, which means the safety worked. Every
write action here offers one, and `object-get` returns the `generation` that
makes the second form possible — the only concurrency control this API has.

## A cold storage class is not automatically cheaper

| Class | Minimum billed duration, per object |
| --- | --- |
| STANDARD | — |
| NEARLINE | 30 days |
| COLDLINE | 90 days |
| ARCHIVE | **365 days** |

The minimum is billed **whether or not the object still exists**. Deleting an
archived object after a week costs the same as leaving it for a year, so a
lifecycle rule that moves objects to ARCHIVE and deletes them at 30 days costs
*more* than doing nothing. Nothing in the API warns about it; `bucket-get`,
`object-get` and `object-delete` all report it.

## Creating a key grants nothing

A brand-new service account authenticates perfectly and can see **no buckets at
all**, because IAM roles are granted separately — on the project, or on an
individual bucket. The 403 says "does not have storage.objects.list access" and
never says "you never granted a role". `bucket-list` reports an empty result as
probably that, and the auth test says so too.

One more ordering quirk, measured: an unauthenticated request with a bad project
id answers **400 "Project id: 0 is invalid or not found"**, not 401. Cloud
Storage validates the project before the caller, so an error about projects can
be a token problem and vice versa.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `bucket-list` | search | Buckets in a project |
| `bucket-get` | read | One bucket's configuration |
| `bucket-create` | perform | Create one, closed by default |
| `bucket-update` | perform | Versioning, class, access, lifecycle |
| `bucket-delete` | perform | Remove an empty bucket |
| `bucket-iam-get` | read | Who can reach it |
| `object-list` | search | What is in a bucket, including the subfolders |
| `object-get` | read | An object's metadata |
| `object-download` | read | Its contents, as text |
| `object-upload` | perform | Write one, safely if asked |
| `object-update` | perform | Content type, cache control, metadata, class |
| `object-copy` | perform | Copy, or move |
| `object-compose` | perform | Concatenate, server-side |
| `object-delete` | perform | Remove one |
| `object-restore` | perform | Bring a deleted one back |
| `object-signed-url` | perform | Hand one object to somebody with no credentials |

### Things the actions do that the API does not

- **`object-signed-url` is the reason to reach for this app** rather than
  moving bytes through a workflow. The URL lets a recipient with no Google
  account fetch or upload one object over ordinary HTTPS, for a bounded time.
  It **cannot be revoked** — nothing is registered, so there is no list and no
  cancel; until it expires it works for whoever holds it. The lifetime is the
  only control, so this defaults to **15 minutes** rather than the seven-day
  maximum, and never logs the URL it minted.
- **`object-compose` is the only way to append**, because objects are
  immutable: write each chunk as its own object, concatenate server-side.
  32 sources per call, everything in one bucket, and the result has a CRC32C
  and **no MD5** — so a pipeline verifying by MD5 fails on exactly the objects
  it assembled itself.
- **`object-delete` reads the bucket first and says which of three deletes this
  was.** Versioning on, the old version is retained and still billed; soft
  delete on, it is restorable for a window; neither, it is gone. Nothing in the
  API's response says which.
- **`bucket-delete` checks the two things an ordinary listing hides.** A bucket
  must be empty, and "empty" includes non-current versions and soft-deleted
  objects — the usual reason a delete keeps failing after somebody deleted
  everything they could see.
- **`bucket-create` defaults to the closed configuration** — uniform
  bucket-level access **on** and public access prevention **enforced**, both
  against the API's own defaults. A bucket created by an automation is one
  nobody reviewed.
- **`bucket-update` warns that lifecycle rules replace rather than merge.** A
  PATCH meaning to add one rule removes every other, silently and successfully.
- **`bucket-iam-get` flags `allUsers` *and* `allAuthenticatedUsers`
  separately.** The second sounds narrower and means anybody with a Google
  account. It also states what it cannot see: project-level roles apply to the
  bucket and are not in this response.
- **`object-copy` does the move.** There is no move and no rename; this offers
  the delete alongside the copy, and refuses to delete the source when the copy
  came back unfinished — a large copy returns `done: false` with a token, and
  deleting between the halves loses the object.
- **`object-update` says which precondition to use.** Metadata edits bump the
  **meta**generation and leave the generation alone, so a precondition on the
  wrong one does nothing it was meant to.
- **`object-download` has a size ceiling and points at signed URLs** for
  anything larger. It also sends `alt=media` — the one parameter between the
  file and a description of the file, which otherwise returns valid JSON where a
  CSV was expected.

## Signed URLs, and where the signature comes from

Signing needs the service account's private key, and an action never sees a
credential — a rule of the sandbox, not a preference. So the string-to-sign is
built locally, where it contains no secret, and the signature comes from **IAM
Credentials' `signBlob`**, using the same access token everything else carries.

That needs **Service Account Token Creator**, held by the service account *on
itself*. It is unrelated to every Cloud Storage role, so an account that can
read and write every object still gets a 403 here until somebody grants it —
and the 403 arrives from a host the workflow was not expecting to talk to.

The V4 construction is checked against a **known-answer vector computed
independently** — in Python, from Google's documented canonical-request format,
not from this app's code. `tests/lib/_vector.ts` carries a throwaway key and the
signature it should produce, so a drift in header ordering, query sorting or
path encoding fails the suite even though the code would still be internally
consistent.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is Cloud Storage up |
| `quota` | quota | connection | none | Declared unavailable — no header exists |

### `service` — the feed is an archive, not a status board

`status.cloud.google.com/incidents.json` is a rolling list of **recent
incidents**, and measured on 2026-08-19 it held four entries — **every one
already closed**, each with an `end` timestamp. A check asking "is Cloud Storage
mentioned in here" reports an outage that finished last month, permanently. Only
entries with no `end` are current.

The sharper half: an incident affecting Storage is usually not *named* Storage.
Google files a multi-product outage as `service_name: "Multiple Products"` and
lists the real ones in `affected_products` — three of the four live entries had
exactly that shape. Matching on the name misses every large outage while
catching the small single-product ones.

So this matches on the product **id** (`UwaYoXQ5bHYHG6EdiPB8`), because the
names are ambiguous too: `Cloud Storage for Firebase` and `Storage Transfer
Service` are different products that a substring match on "Storage" would
collect. And `status_impact` is the field that separates a disruption from a
notice — not `severity`, which can read `low` on a real outage.

### `quota` — declared unavailable

Cloud Storage returns no rate-limit header of any kind: verified live, no
`x-ratelimit-*`, no `ratelimit`, no `retry-after` before a 429. There is
nothing to sample.

The limit that exists is also the wrong shape for a quota check. It is
**per-object** — roughly one write per second to a single object name, however
many clients — while overall request volume scales freely. A loop appending to
one object is capped at one iteration per second no matter how it is
parallelised, and the fix is `object-compose`. No headroom number would have
said so.

## Icon

`assets/icon.svg` (192×192), downloaded verbatim from
`https://fonts.gstatic.com/s/i/productlogos/google_cloud/v7/192px.svg` on
2026-08-19 — Google's own product-logo CDN, the same source `google-maps` and
`google-business-profile` use in this pack. It is the **Google Cloud** mark
rather than the Cloud Storage bucket glyph: Google publishes no vector of the
product icon at any stable public URL, and the platform mark is the vendor's own
current artwork. Checked with `_tools/icon-legibility.ts`.

## Tests

480 assertions across 23 files: one per action, one per auth method, one per
health check, the client, the crypto helpers, the V4 signer, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no action touching
a credential **or a private key** — plus three specific to this app: **every
irreversible or exposure-widening path still has its gate**, **creating a bucket
still defaults closed**, and **nothing logs a signed URL, an object's contents
or a key**, checked on the log call's values rather than its keys.
