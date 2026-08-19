/**
 * Google Cloud Storage — buckets and objects, uploads and downloads, lifecycle
 * and access, plus V4 signed URLs.
 *
 * See `lib/client.ts` for what shapes the app: folders do not exist, uploads
 * live at a different path, preconditions are what make a write safe, and a
 * cold storage class bills a minimum duration whether or not the object
 * survives. `lib/signing.ts` covers signed URLs, which are built here and
 * signed by IAM Credentials rather than with a key this code ever holds.
 */
import type { AppDefinition } from "@w6w/types";

import serviceAccount from "./auth/service-account.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import bucketList from "./actions/bucket-list.ts";
import bucketGet from "./actions/bucket-get.ts";
import bucketCreate from "./actions/bucket-create.ts";
import bucketUpdate from "./actions/bucket-update.ts";
import bucketDelete from "./actions/bucket-delete.ts";
import bucketIamGet from "./actions/bucket-iam-get.ts";
import objectList from "./actions/object-list.ts";
import objectGet from "./actions/object-get.ts";
import objectDownload from "./actions/object-download.ts";
import objectUpload from "./actions/object-upload.ts";
import objectUpdate from "./actions/object-update.ts";
import objectCopy from "./actions/object-copy.ts";
import objectCompose from "./actions/object-compose.ts";
import objectDelete from "./actions/object-delete.ts";
import objectRestore from "./actions/object-restore.ts";
import objectSignedUrl from "./actions/object-signed-url.ts";

const app: AppDefinition = {
  actions: [
    bucketList,
    bucketGet,
    bucketCreate,
    bucketUpdate,
    bucketDelete,
    bucketIamGet,
    objectList,
    objectGet,
    objectDownload,
    objectUpload,
    objectUpdate,
    objectCopy,
    objectCompose,
    objectDelete,
    objectRestore,
    objectSignedUrl,
  ],
  auth: [serviceAccount],
  healthChecks: [service, quota],
};

export default app;
