/**
 * Azure Blob Storage — containers and blobs, uploads and downloads, tiers,
 * leases and metadata.
 *
 * See `lib/client.ts` for what shapes the app: the API answers XML rather than
 * JSON, the storage account is the hostname, and much of the data arrives in
 * response headers rather than bodies. `lib/signing.ts` is Shared Key, the one
 * signing scheme in this pack that can be computed entirely inside the auth
 * hook, and `lib/xml.ts` is the deliberately small reader that makes the rest
 * possible.
 */
import type { AppDefinition } from "@w6w/types";

import sharedKey from "./auth/shared-key.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";

import containerList from "./actions/container-list.ts";
import containerGet from "./actions/container-get.ts";
import containerCreate from "./actions/container-create.ts";
import containerDelete from "./actions/container-delete.ts";
import blobList from "./actions/blob-list.ts";
import blobGet from "./actions/blob-get.ts";
import blobDownload from "./actions/blob-download.ts";
import blobUpload from "./actions/blob-upload.ts";
import blobCopy from "./actions/blob-copy.ts";
import blobDelete from "./actions/blob-delete.ts";
import blobUndelete from "./actions/blob-undelete.ts";
import blobSetTier from "./actions/blob-set-tier.ts";
import blobMetadataSet from "./actions/blob-metadata-set.ts";
import blobLease from "./actions/blob-lease.ts";

const app: AppDefinition = {
  actions: [
    containerList,
    containerGet,
    containerCreate,
    containerDelete,
    blobList,
    blobGet,
    blobDownload,
    blobUpload,
    blobCopy,
    blobDelete,
    blobUndelete,
    blobSetTier,
    blobMetadataSet,
    blobLease,
  ],
  auth: [sharedKey],
  healthChecks: [service, account],
};

export default app;
