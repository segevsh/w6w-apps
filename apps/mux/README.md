# Mux

Manage video from a workflow — create assets from a URL, run live streams, mint
playback IDs, build delivery URLs and read how it all performed for viewers.

- **Categories** — video, developer-tools, analytics
- **Auth methods** — basic
- **Actions** — 14
- **Egress allowlist** — `api.mux.com`
- **Website** — https://www.mux.com
- **API docs** — https://docs.mux.com/api-reference

Paths come from Mux's reference and every one this app calls was verified to
route against `api.mux.com` on 2026-08-18. Its error shape was measured the same
day: `{"error":{"type":"unauthorized","messages":["Unauthorized request"]}}`.

## Setup

Mux Dashboard → **Settings → Access Tokens**. The **secret key is shown once**;
if it is lost the fix is a new token, not a lookup.

Tokens are scoped **per product** when created — Mux Video, Mux Data, System.
A Video-only token authenticates perfectly and then `403`s on every `/data/v1/*`
call, so the connection test proves identity rather than capability and names
the missing product when it can tell.

| Actions | Product needed |
|---|---|
| Everything under assets, uploads, playback, live | Mux Video |
| `metric-get`, `video-view-list` | Mux Data |

## Ingestion a sandbox can actually do

Most video APIs need the bytes. Mux takes an **input URL** and fetches the file
itself — which is what makes `asset-create` usable from a workflow at all. A
sandbox with no local file can hand Mux a signed S3 link or a recording URL from
another service, and the transfer happens between two datacentres.

`upload-create` is the other route: a single-use URL a **browser** can `PUT` to,
for when a person is uploading from their device. The bytes never touch the
workflow either way.

Its `cors_origin` is required and is the commonest reason a direct upload works
in a terminal and not on a page — without the uploading page's origin, the
browser's preflight fails and the upload never starts.

## Nothing is ready when it is created

| Step | State |
|---|---|
| `asset-create` returns | `preparing` |
| Mux finishes encoding | `ready` — or `errored`, permanently |
| `upload-create` → browser PUTs → Mux creates an asset | then the above |

A workflow that creates an asset and immediately publishes its playback URL has
published a video that does not play yet. The honest sequence is to wait for the
`video.asset.ready` webhook, or poll `asset-get` — whose `status` and `errors`
say whether it will ever be ready and why not (almost always an unreachable
input URL or a file Mux could not decode).

## A playback ID is the access grant

An asset with **no** playback id cannot be watched by anybody. One with a public
id can be watched by anybody holding it. So access is controlled by minting and
revoking ids, not by editing the asset.

That makes one-id-per-audience worth doing: a leaked embed can be revoked with
`playback-id-delete` without breaking the marketing page, and a customer's
access can end without deleting content the business still owns.

### Signed playback IDs are created but not usable from here

A signed id requires each viewer to present a **JWT signed with one of the
account's private signing keys**. Signing needs that key, and only the auth hook
may hold a credential — so this app can create such an id and cannot build a
working URL for it.

`playback-id-create` returns the id with no URL and says why;
`playback-url-build` refuses signed ids outright rather than returning a link
that 403s at the edge. That is the same call this pack's `cloudinary` app makes
about its signed delivery URLs.

## The delivery hosts are assembled, never called

A Mux video is watched at `stream.mux.com/{playbackId}.m3u8` and its thumbnails
come from `image.mux.com`. Neither is an API host: `playback-url-build`
assembles those URLs **locally, with no request at all**, and returns them for a
player, an email or a downstream step to fetch.

Both are deliberately absent from the egress allowlist, and tests assert the
builder makes no request.

The thumbnail's `time` is the parameter worth setting: it is seconds into the
video, and picking a frame a few seconds in avoids the black first frame most
videos start with — the difference between a poster image and an empty
rectangle.

## Actions

| Key | Type | Description |
|---|---|---|
| `asset-create` | perform | Ingest a video by giving Mux a URL |
| `upload-create` | perform | A single-use URL a browser can PUT to |
| `asset-get` | read | One asset — `preparing`, `ready` or `errored` |
| `asset-list` | read | The account's assets (no search) |
| `playback-id-create` | perform | Mint a way to watch, and its URLs |
| `playback-url-build` | read | Assemble URLs locally — **no API call** |
| `playback-id-delete` | perform | Revoke one id without touching the video |
| `live-stream-create` | perform | A destination for an encoder |
| `live-stream-list` | read | Streams and whether each is live |
| `live-stream-complete` | perform | End a broadcast now |
| `live-stream-delete` | perform | Retire a stream, keeping its recordings |
| `metric-get` | read | How the video performed for viewers |
| `video-view-list` | read | Individual viewing sessions |
| `asset-delete` | perform | Delete a video permanently |

## Things worth knowing

### `passthrough` is the join key

Whatever goes in it comes back on the asset, on **every webhook about it**, and
in Mux Data's views. It is the difference between correlating a webhook to your
own record instantly and keeping a separate map of Mux ids.

That matters more than usual here because **`asset-list` has no search**: Mux
filters by `live_stream_id` and `upload_id` and nothing else — no title, no tag,
not even by passthrough. Finding "the asset for order 4417" has to be a lookup in
your own index, so the id has to be in both places.

### A stream key is a credential

`live-stream-create`'s response carries a `stream_key`, and anyone holding it can
broadcast **as that stream** to its audience. It should be handed to the
broadcaster over a channel acceptable for a password.

This action logs the stream id and never the key, `live-stream-list` warns that
its response contains every broadcaster's, and a test asserts no action reads the
field out of a response.

### Complete versus delete

| | `live-stream-complete` | `live-stream-delete` |
|---|---|---|
| Ends the current broadcast | Yes, immediately | — |
| Stream key | Still works | **Dead immediately** |
| Recordings | Become an asset | Survive as assets |
| Next broadcast | Possible | Impossible |

Without `complete`, Mux waits out the whole `reconnect_window` after the encoder
stops before deciding the stream ended — correct when a connection drops
mid-broadcast, needlessly slow when the broadcaster simply finished. At the end
of a scheduled event the workflow knows and Mux does not, so calling it makes the
recording appear in seconds rather than a minute later.

`reconnect_window` itself is a real trade: too short and a flaky connection ends
the broadcast; too long and viewers stare at a frozen frame.

### Deleting is also cost control

Mux meters storage per minute of video stored, so deleting old assets is a
routine scheduled operation — which is exactly why `asset-delete` takes a
confirmation. A retention job pointed at the wrong list deletes real content
quietly and quickly, and there is no recycle bin: the renditions **and the stored
master** go, so if the source file is not elsewhere the video is lost.

### Mux Data answers a different question

`/video/v1/*` says whether the file exists. `/data/v1/*` says whether people
managed to watch it — `video_startup_time`, `rebuffer_percentage`,
`playback_failure_percentage`, `exits_before_video_start`.

An overall number is nearly useless; the same figure filtered by `browser`,
`country` or `asset_id` is what identifies the problem, which is why filters are
front and centre on `metric-get`. And `video-view-list` gives the individual
sessions behind the aggregate — the record of what actually happened to the
person who said "the video would not play for me", where an average says most
people were fine.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Mux up — for ingesting, or for watching? |
| `quota` | quota | Whatever rate-limit headers Mux returns |

`service` splits Mux's Statuspage in two, because the halves fail independently
with opposite consequences:

- **the API down** stops a workflow creating or reading assets, while every
  published video keeps playing;
- **delivery down** stops viewers watching, while the workflow carries on
  happily creating assets nobody can see.

Neither is "Mux is down" on its own, so one failing is `degraded` and only
trouble in both is `down`. A workflow that only ingests is genuinely unaffected
by a playback incident, and reporting otherwise would make the check useless to
it.

`quota` reads `x-ratelimit-*` if Mux sends them and reports `unknown` when it
does not — which is the correct answer rather than a fault. Measured 2026-08-18,
an unauthenticated response carries only `x-request-id`, and Mux meters per
endpoint group with no usage endpoint to consult.

## What this app deliberately does not do

- **Signing keys and signed URLs.** Minting a viewer JWT needs a private key, and
  only the auth hook may hold one.
- **Webhook configuration and signature verification.** Verifying Mux's
  signature belongs to whatever serves the endpoint.
- **Simulcast targets.** Restreaming to YouTube or Twitch means holding those
  platforms' stream keys — a credential decision of its own.
- **Real-time (spaces) and Mux Player configuration.** A front-end concern, not a
  workflow step.
