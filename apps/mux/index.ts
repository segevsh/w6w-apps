/**
 * Mux — manage video from a workflow: create assets from a URL, run live
 * streams, mint playback IDs, build delivery URLs and read how it all performed
 * for viewers.
 *
 * Paths come from Mux's reference (`docs.mux.com/api-reference`) and every one
 * this app calls was verified to route against `api.mux.com` on 2026-08-18. Its
 * error shape was measured the same day:
 * `{"error":{"type":"unauthorized","messages":["Unauthorized request"]}}`.
 *
 * ## Ingestion a sandbox can actually do
 *
 * Most video APIs need the bytes. Mux takes an **input URL** and fetches the
 * file itself, which is what makes `asset-create` usable from a workflow at all:
 * a sandbox with no local file can hand Mux a signed S3 link or a recording URL
 * from another service, and the transfer happens between two datacentres.
 *
 * `upload-create` is the other route — a single-use URL a *browser* can PUT to,
 * for when a person is uploading from their device.
 *
 * ## Nothing is ready when it is created
 *
 * An asset arrives `preparing` and becomes `ready` — or `errored` — later. A
 * direct upload becomes an asset later still. A workflow that creates an asset
 * and immediately publishes its playback URL has published a video that does
 * not play yet, so both actions say so and `asset-get` is the polling half for
 * anywhere a webhook cannot reach.
 *
 * ## A playback ID is the access grant
 *
 * An asset with no playback id cannot be watched by anybody; one with a public
 * id can be watched by anybody holding it. So access is controlled by minting
 * and revoking ids rather than by editing the asset — one per audience means a
 * leaked embed can be revoked without breaking the marketing page.
 *
 * **Signed playback ids are created but not usable from here.** A viewer must
 * present a JWT signed with the account's private signing key, and only the
 * auth hook may hold a credential — so `playback-url-build` refuses them rather
 * than returning a link that 403s at the edge, the same call this pack's
 * `cloudinary` app makes about signed delivery URLs.
 *
 * ## The delivery hosts are assembled, never called
 *
 * `stream.mux.com` and `image.mux.com` are where viewers go, not where this app
 * goes. Their URLs are built locally and returned as values, and both are
 * deliberately absent from the egress allowlist — a test asserts nothing
 * fetches them.
 *
 * ## Credentials that are not the connection's
 *
 * A live stream's **`stream_key`** is what an encoder authenticates with:
 * anyone holding it can broadcast as that stream. `live-stream-create` logs the
 * stream id and never the key, and `live-stream-list` warns that its response
 * contains every broadcaster's.
 *
 * ## Two products, one token
 *
 * `/video/v1/*` and `/data/v1/*` share a host and a credential but are scoped
 * separately when the token is created: a Video-only token authenticates
 * perfectly and then `403`s on every Data call. The connection test proves
 * identity rather than capability, and says which product is missing when it
 * can tell.
 *
 * Deliberately out of scope:
 *   - **Signing keys and signed URLs.** Minting a viewer JWT needs a private
 *     key, and only the auth hook may hold one.
 *   - **Webhook configuration and signature verification.** Verifying Mux's
 *     signature belongs to whatever serves the endpoint.
 *   - **Simulcast targets.** Restreaming to YouTube or Twitch means holding
 *     those platforms' stream keys, which is a credential decision of its own.
 *   - **Real-time (spaces) and Mux Player configuration** — a front-end
 *     concern, not a workflow step.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import assetCreate from "./actions/asset-create.ts";
import assetGet from "./actions/asset-get.ts";
import assetList from "./actions/asset-list.ts";
import assetDelete from "./actions/asset-delete.ts";
import uploadCreate from "./actions/upload-create.ts";

import playbackIdCreate from "./actions/playback-id-create.ts";
import playbackIdDelete from "./actions/playback-id-delete.ts";
import playbackUrlBuild from "./actions/playback-url-build.ts";

import liveStreamCreate from "./actions/live-stream-create.ts";
import liveStreamList from "./actions/live-stream-list.ts";
import liveStreamComplete from "./actions/live-stream-complete.ts";
import liveStreamDelete from "./actions/live-stream-delete.ts";

import metricGet from "./actions/metric-get.ts";
import videoViewList from "./actions/video-view-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // getting video in
    assetCreate,
    uploadCreate,
    // finding out whether it worked
    assetGet,
    assetList,
    // letting people watch it
    playbackIdCreate,
    playbackUrlBuild,
    playbackIdDelete,
    // live
    liveStreamCreate,
    liveStreamList,
    liveStreamComplete,
    liveStreamDelete,
    // how it went
    metricGet,
    videoViewList,
    // clearing up
    assetDelete,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
