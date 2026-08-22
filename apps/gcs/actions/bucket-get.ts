import type { ActionDefinition } from "@w6w/types";
import { bucketName, earlyDeletionNote, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `GET /b/{bucket}` — one bucket's configuration.
 *
 * ## The four settings that decide what everything else does
 *
 * - **`storageClass`** — the default class for new objects, and every class
 *   except STANDARD has a **minimum billed duration**: NEARLINE 30 days,
 *   COLDLINE 90, ARCHIVE 365. An object deleted before then is still charged
 *   for the whole period, which makes a lifecycle rule that archives and then
 *   deletes cost *more* than doing nothing.
 * - **`iamConfiguration.uniformBucketLevelAccess`** — when enabled, per-object
 *   ACLs do not exist. Anything trying to make a single object public fails,
 *   and the error names ACLs rather than the setting that turned them off.
 * - **`iamConfiguration.publicAccessPrevention`** — `enforced` means the bucket
 *   cannot be made public at all, by anyone, whatever the IAM policy says.
 * - **`versioning`** — off by default. With it off, an overwrite destroys the
 *   previous version and a delete is final; with it on, both keep the old one
 *   and it keeps costing storage until a lifecycle rule removes it.
 *
 * ## `softDeletePolicy` is the newer safety net
 *
 * Buckets now carry one by default, which retains deleted objects for a window
 * — `object-restore` is what brings one back. A bucket with the policy
 * disabled has no recovery at all.
 */
const action: ActionDefinition = {
  key: "bucket-get",
  type: "read",
  resource: "bucket",
  title: "Get a bucket",
  description:
    "One bucket's configuration: storage class and its minimum billed duration, whether " +
    "per-object ACLs exist at all, whether it can be made public, and what happens to " +
    "overwrites.",
  params: [BUCKET_PARAM],
  output: [
    { key: "bucket", type: "object", label: "The bucket" },
    { key: "name", type: "string", label: "Its name" },
    { key: "location", type: "string", label: "Where it lives" },
    { key: "storageClass", type: "string", label: "The default class for new objects" },
    { key: "minimumDurationNote", type: "string", label: "What early deletion costs, if anything" },
    { key: "versioning", type: "boolean", label: "Whether overwrites keep the old version" },
    { key: "uniformAccess", type: "boolean", label: "True when per-object ACLs do not exist" },
    { key: "publicAccessPrevention", type: "string", label: "enforced blocks all public access" },
    {
      key: "softDeleteRetention",
      type: "string",
      label: "How long a deleted object is restorable",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = bucketName(p.bucket);

    const bucket = await new StorageClient(ctx).request<{
      name?: string;
      location?: string;
      storageClass?: string;
      versioning?: { enabled?: boolean };
      iamConfiguration?: {
        uniformBucketLevelAccess?: { enabled?: boolean };
        publicAccessPrevention?: string;
      };
      softDeletePolicy?: { retentionDurationSeconds?: string };
    }>(`/b/${encodeURIComponent(name)}`);

    const uniformAccess = bucket?.iamConfiguration?.uniformBucketLevelAccess?.enabled === true;

    return {
      bucket,
      name: bucket?.name,
      location: bucket?.location,
      storageClass: bucket?.storageClass,
      minimumDurationNote: earlyDeletionNote(bucket?.storageClass),
      versioning: bucket?.versioning?.enabled === true,
      uniformAccess,
      publicAccessPrevention: bucket?.iamConfiguration?.publicAccessPrevention,
      softDeleteRetention: bucket?.softDeletePolicy?.retentionDurationSeconds,
    };
  },
};

export default action;
