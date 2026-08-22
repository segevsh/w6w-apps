/**
 * Cloudinary — manage a media library from a workflow: upload from a URL, search
 * and tag assets, organise folders, apply named transformations, and build the
 * delivery URLs that are the point of all of it.
 *
 * Cloudinary publishes no OpenAPI document, so every path, parameter and
 * behaviour here comes from its reference documentation
 * (<https://cloudinary.com/documentation/admin_api>, `upload_images`,
 * `search_api`) and was **verified against the live host on 2026-08-18** — which
 * settled three things the documentation does not.
 *
 * ## 1. The Upload API takes the same Basic credential
 *
 * Cloudinary documents a per-request SHA-1 `signature` over the sorted
 * parameters for the Upload API. An App cannot compute one: the sandbox lets
 * only the auth `sign` hook near a credential, and the signature depends on the
 * request body.
 *
 * Measured: posting to `/v1_1/demo/image/upload` with a **bogus Basic**
 * credential answers `{"error":{"message":"unknown api_key"}}` — Cloudinary
 * evaluated the credential — while the same call with **no** credential answers
 * `"Upload preset must be whitelisted for unsigned uploads"`. Basic auth is
 * therefore sufficient, and uploads work with the same connection as everything
 * else.
 *
 * ## 2. The search endpoint is not where the docs say
 *
 * Cloudinary's Search API page gives the endpoint as
 * `POST /v1_1/{cloud}/search`. Measured, that path answers **404** with an HTML
 * page; `POST /v1_1/{cloud}/resources/search` is the one that routes. A test
 * pins the working path.
 *
 * ## 3. Errors are not always JSON
 *
 * An API error is `{"error":{"message":"…"}}`, repeated in an `X-Cld-Error`
 * response header. An unknown *path* answers a 404 **HTML page** instead. The
 * client reads the header first for that reason, and never assumes the body
 * parses.
 *
 * ## Three hosts, one per datacenter
 *
 * A product environment lives in one datacenter and the API host follows it:
 * `api.cloudinary.com` (US), `api-eu.cloudinary.com`, `api-ap.cloudinary.com`.
 * Calling the wrong one fails authentication rather than redirecting, so the
 * region is part of the credential — and because the Connection therefore knows
 * its region, the `service` health check can watch exactly the third of
 * Cloudinary's region-partitioned status page that applies.
 *
 * ## What replaces, and what merges
 *
 * `asset-update`'s **tags** field replaces an asset's whole tag set; `asset-tag`
 * adds and removes one tag across up to 1000 assets without touching the rest.
 * The same split as this pack's `front` app makes for Front's conversation tags,
 * and for the same reason: the destructive version is the one that looks
 * ordinary.
 *
 * `context` and structured `metadata` both go on the wire as Cloudinary's
 * **pipe-joined `key=value` string**, not as JSON. A JSON object there is
 * accepted and stored as one meaningless value, so this app converts objects to
 * that form and rejects values containing the separator.
 *
 * ## Overwrite is not invalidate
 *
 * Overwriting or deleting an asset does **not** flush the CDN. `invalidate` is a
 * separate flag, and without it the old bytes keep being served from the edge —
 * which reads as "the upload did not work". Upload warns when it is asked to
 * overwrite without invalidating; delete and rename default it on.
 *
 * Deliberately out of scope:
 *   - **Signed delivery URLs** for `private` and `authenticated` assets, and
 *     signed uploads. Both need the API secret to sign a string that is not a
 *     request, and only the auth hook may touch a credential. `asset-url`
 *     refuses those delivery types rather than returning a URL that 401s at the
 *     edge.
 *   - **Multipart uploads of raw bytes** — a sandbox has no local file. Remote
 *     URLs and data URIs cover what a workflow can actually produce.
 *   - **The Provisioning API** (sub-accounts, users, access keys). It
 *     authenticates with separate provisioning credentials, not this key.
 *   - **Add-on configuration and webhook/notification setup** — account-level
 *     settings, changed once in the console.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import assetSearch from "./actions/asset-search.ts";
import assetList from "./actions/asset-list.ts";
import assetGet from "./actions/asset-get.ts";
import assetUpload from "./actions/asset-upload.ts";
import assetUpdate from "./actions/asset-update.ts";
import assetTag from "./actions/asset-tag.ts";
import assetRename from "./actions/asset-rename.ts";
import assetExplicit from "./actions/asset-explicit.ts";
import assetDelete from "./actions/asset-delete.ts";
import assetRestore from "./actions/asset-restore.ts";
import assetUrl from "./actions/asset-url.ts";

import folderList from "./actions/folder-list.ts";
import folderCreate from "./actions/folder-create.ts";
import folderDelete from "./actions/folder-delete.ts";
import tagList from "./actions/tag-list.ts";

import transformationList from "./actions/transformation-list.ts";
import transformationCreate from "./actions/transformation-create.ts";
import transformationDelete from "./actions/transformation-delete.ts";

import usageGet from "./actions/usage-get.ts";
import metadataFieldList from "./actions/metadata-field-list.ts";
import uploadPresetList from "./actions/upload-preset-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // getting media in
    assetUpload,
    // finding it again
    assetSearch,
    assetList,
    assetGet,
    // delivering it
    assetUrl,
    transformationList,
    transformationCreate,
    transformationDelete,
    // changing it
    assetUpdate,
    assetTag,
    assetRename,
    assetExplicit,
    // removing it, and getting it back
    assetDelete,
    assetRestore,
    // organising it
    folderList,
    folderCreate,
    folderDelete,
    tagList,
    // the account
    usageGet,
    metadataFieldList,
    uploadPresetList,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
