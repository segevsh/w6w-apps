# Cloudinary

Manage a media library from a workflow — upload from a URL, search and tag
assets, organise folders, define named transformations, and build the delivery
URLs that are the point of all of it.

- **Categories** — storage, documents, developer-tools
- **Auth methods** — basic
- **Actions** — 21
- **Egress allowlist** — `api.cloudinary.com`, `api-eu.cloudinary.com`,
  `api-ap.cloudinary.com`
- **Website** — https://cloudinary.com
- **API docs** — https://cloudinary.com/documentation/admin_api ·
  https://cloudinary.com/documentation/upload_images

Cloudinary publishes no OpenAPI document, so everything here comes from its
reference documentation and was **verified against the live host on
2026-08-18** — which settled three things the documentation does not.

## Setup

### API Key & Secret

1. Console → **Settings → API Keys**. Copy the key and secret.
2. The **cloud name** is the product environment name — it is in every
   Cloudinary URL.
3. Pick the **datacenter** your environment lives in.

Getting the datacenter wrong **fails authentication rather than redirecting**,
so "invalid credentials" can really mean "wrong region". The connection test
says so explicitly, naming the datacenter it tried.

| Region | API host |
|---|---|
| US (default) | `api.cloudinary.com` |
| EU | `api-eu.cloudinary.com` |
| AP | `api-ap.cloudinary.com` |

## Three things measured, not documented

### 1. The Upload API accepts the same Basic credential

Cloudinary documents a per-request SHA-1 `signature` over the sorted parameters
for the Upload API. An App cannot compute one: the sandbox lets only the auth
`sign` hook near a credential, and a signature depends on the request body.

Measured against `POST /v1_1/demo/image/upload`:

| Request | Response |
|---|---|
| No credential | `{"error":{"message":"Upload preset must be whitelisted for unsigned uploads"}}` |
| **Bogus Basic credential** | `{"error":{"message":"unknown api_key"}}` |

The second means Cloudinary evaluated the Basic credential rather than looking
for a signature. So `asset-upload`, `asset-rename`, `asset-tag` and
`asset-explicit` all work with this connection, and the secret never leaves the
`sign` hook.

### 2. The search endpoint is not where the docs say

Cloudinary's Search API page gives the endpoint as `POST /v1_1/{cloud}/search`.
That path answers **404** with an HTML page.
`POST /v1_1/{cloud}/resources/search` is the one that routes, and it is what
this app calls — pinned by a test.

### 3. Errors are not always JSON

An API error is `{"error":{"message":"…"}}`, repeated in an **`X-Cld-Error`**
response header. An unknown *path* answers a 404 **HTML page** instead. The
client reads the header first for that reason and never assumes the body parses;
an HTML answer is reported as "the path is probably not an API route" rather
than as a parser error.

## Actions

| Key | Type | Description |
|---|---|---|
| `asset-upload` | perform | Upload from a remote URL or data URI |
| `asset-search` | search | Cloudinary's search expression language |
| `asset-list` | read | Assets by public-id prefix |
| `asset-get` | read | One asset, with derived renditions and EXIF |
| `asset-url` | read | Build a delivery URL — **no API call** |
| `transformation-list` | read | Named and URL-generated transformations |
| `transformation-create` | perform | Define `t_name` once, use it everywhere |
| `transformation-delete` | perform | Delete a definition and its renditions |
| `asset-update` | perform | Tags, context, structured metadata, moderation |
| `asset-tag` | perform | Add/remove one tag across up to 1000 assets |
| `asset-rename` | perform | Change the public id — and so the folder |
| `asset-explicit` | perform | Transform or analyse an existing asset |
| `asset-delete` | perform | By id, by prefix, or all |
| `asset-restore` | perform | Undo a delete — if backups were on |
| `folder-list` | read | Folders directly under a path |
| `folder-create` | perform | Create a folder and its parents |
| `folder-delete` | perform | Delete an empty folder |
| `tag-list` | read | Every tag in use, per resource type |
| `usage-get` | read | Plan usage plus the hourly API allowance |
| `metadata-field-list` | read | The structured metadata schema |
| `upload-preset-list` | read | Stored upload settings |

## Things worth knowing

### Overwrite is not invalidate

Overwriting or deleting an asset does **not** flush the CDN. `invalidate` is a
separate flag, and without it the old bytes keep being served from the edge for
as long as the cache says to — which reads as "the upload did not work".

`asset-upload` logs a warning when asked to overwrite without invalidating;
`asset-delete` and `asset-rename` default it on.

### Which tag operation replaces

| | Scope | Effect on other tags |
|---|---|---|
| `asset-update`'s **Tags** | One asset | **Replaces the whole set** |
| `asset-tag` `add` / `remove` | Up to 1000 assets | Untouched |
| `asset-tag` `replace` | Up to 1000 assets | **Dropped** — needs confirming |
| `asset-tag` `remove_all` | **Every asset in the account** | Needs confirming |

`remove_all` is the one whose scope has nothing to do with what you passed: it
ignores the public-id list entirely.

### Context and metadata are pipe-joined strings

Both go on the wire as `alt=Hero|caption=Hello`, not as JSON. A JSON object
there is accepted and stored as one meaningless value — the kind of failure
nobody notices until the field is read back. This app converts objects to that
form and rejects values containing the `|` separator.

`context` is free-form; **structured metadata** is typed and validated against
fields defined account-wide, keyed by external id — which is what
`metadata-field-list` is for.

### `public_id` decides whether an upload is idempotent

With a public id and **Overwrite** on, uploading the same source twice leaves
one asset. Without a public id, Cloudinary invents a random one and every run
creates another copy — which is how libraries quietly fill with duplicates of
the same image. `asset-upload` therefore declares itself **not** idempotent.

The public id is also the path in a fixed-folder account, which makes
`asset-rename` the way to move an asset between folders — and means **every
delivery URL using the old id breaks**.

### Delivery URLs, and the one this app cannot build

There is no endpoint that returns a delivery URL: it is assembled from the cloud
name, the resource and delivery type, the transformation and the public id.

```
https://res.cloudinary.com/{cloud}/{resource_type}/{type}/{transformation}/{public_id}.{format}
```

`asset-url` assembles it locally — **no API call at all** — using the cloud name
from the Connection. Including the **version** segment (`v1712345678`) makes the
URL immutable: overwriting the asset will not change what that URL serves, which
is what a cached page wants. Omitting it always serves the current asset, at the
cost of the CDN possibly holding old bytes until `invalidate`.

What it deliberately cannot do is a **signed** URL for a `private` or
`authenticated` asset. Those need a signature over the API secret, and only the
auth `sign` hook may touch a credential — a URL is not a request, so there is
nothing to sign. `asset-url` refuses those delivery types rather than returning
a URL that 401s at the edge.

`res.cloudinary.com` is deliberately **not** in the egress allowlist: this app
never fetches it, it only returns URLs pointing at it, and a test asserts that.

### Deleting, and getting it back

`asset-restore` only works if the account had **backups enabled before the
delete**. Cloudinary's backup setting is per product environment and off by
default; without it there is nothing to restore from, and the API answers an
**empty result rather than an error** — the least helpful possible response.
This app logs a warning explaining exactly that when it happens.

Restoring a specific `version` is also how an *overwritten* asset is rolled
back, not just a deleted one.

`folder-delete` needs no confirmation flag because Cloudinary refuses to delete
a folder that still holds assets — the worst case is an error. Emptying it first
is `asset-delete` with a prefix, which *does* require confirming.

### Named transformations are the plug-and-play case for media

A URL saying `t_product_thumb` instead of `w_400,h_400,c_fill,g_auto,q_auto,f_auto`
means the size of a product thumbnail is a setting rather than a string baked
into a template. The catch is the same as the benefit: editing the definition
invalidates every derived asset built from it, so the next request for each one
pays to regenerate — and `transformation-delete` removes those renditions
outright (originals are never touched).

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is **this connection's datacenter** up? |
| `quota` | quota | Hourly API requests, and plan credits |

`service` is **connection-scoped**, which is unusual for a vendor status check
and is the right shape here. Cloudinary's status page is region-partitioned —
`Admin API - US`, `Upload API - EU`, `Media Transformation API - AP` — and a
product environment lives in exactly one datacenter, which the Connection
already knows because the region decides the API host. So this check watches the
three components that actually serve this cloud and ignores the other two
datacenters entirely. An EU outage leaves a US connection green, and a test
asserts both directions.

> Contrast this pack's `pinecone` app: its status page is also
> region-partitioned, but its check is app-scoped and *cannot* know the region,
> so it has to cap region trouble at `degraded`. Here there is no such
> compromise.

`quota` reports **two different ceilings**, because running out of them means
different things:

- **API requests per hour** — 500 on the free plan, from 2,000 on paid ones,
  read from `X-FeatureRateLimit-Limit` / `-Remaining` / `-Reset`. This is what
  stops a batch job mid-run, and it refills on the hour rather than
  continuously.
- **Plan credits** — the monthly budget transformations, storage and bandwidth
  all draw down. Running out changes the bill, not the throughput.

The usage body is read defensively: Cloudinary publishes no schema for it and
the fields differ by plan, so anything recognisable is reported and anything
else is skipped rather than guessed at.

## What this app deliberately does not do

- **Signed delivery URLs and signed uploads.** Both need the API secret to sign
  a string that is not a request, and only the auth hook may touch a credential.
- **Multipart uploads of raw bytes** — a sandbox has no local file. Remote URLs
  and data URIs cover what a workflow can produce.
- **The Provisioning API** (sub-accounts, users, access keys) — separate
  provisioning credentials, not this key.
- **Add-on configuration and webhook setup** — account-level settings, changed
  once in the console.
