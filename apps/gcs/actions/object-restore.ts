import type { ActionDefinition } from "@w6w/types";
import { bucketName, objectName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /b/{bucket}/o/{object}/restore?generation={g}` — bring back a deleted
 * object.
 *
 * ## Two different things are called restoring, and they need different inputs
 *
 * - **Soft delete.** The bucket has a retention policy and the object is
 *   inside its window. It is invisible to an ordinary listing; `object-list`
 *   with `softDeleted` on is what finds it, along with the generation this
 *   call needs.
 * - **Object versioning.** The object was overwritten rather than deleted, and
 *   a previous generation is still there. `object-list` with `versions` on
 *   shows those.
 *
 * Either way the **generation is required**, and it is not optional in the way
 * most parameters are: there is nothing to restore without naming which
 * version. This action says which listing to use rather than returning the
 * API's message about a missing parameter.
 *
 * ## Restoring makes a new current version
 *
 * It does not move the old one back. The restored object gets a **new
 * generation**, and if versioning is on, whatever was current before is
 * retained as non-current. So a restore is additive, and nothing is displaced.
 *
 * ## The window is not a backup
 *
 * Soft delete retains for a configured duration — days, not years — and it
 * covers deletion, not corruption. An object overwritten with bad content and
 * then left alone is not recoverable this way unless versioning was also on.
 */
const action: ActionDefinition = {
  key: "object-restore",
  type: "perform",
  resource: "object",
  title: "Restore a deleted object",
  description:
    "Bring back a soft-deleted object, or a previous version. The GENERATION is required — " +
    "`object-list` with `softDeleted` or `versions` on is where it comes from. The restored copy " +
    "becomes a new current version rather than replacing anything.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "generation",
      label: "Generation",
      type: "string",
      required: true,
      default: "",
      hint: "Which version to bring back. `object-list` with `softDeleted` on lists deleted " +
        "objects and their generations; with `versions` on it lists overwritten ones.",
    },
    {
      key: "copySourceAcl",
      label: "Keep the original ACL",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Off, the restored object takes the bucket's default. Meaningless on a bucket with " +
        "uniform access, where per-object ACLs do not exist.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The restored object" },
    { key: "name", type: "string", label: "Its name" },
    { key: "generation", type: "string", label: "The NEW generation — not the one restored from" },
    { key: "restoredFrom", type: "string", label: "The generation that was restored" },
    { key: "size", type: "number", label: "Bytes" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);
    const generation = String(p.generation ?? "").trim();
    if (!generation) {
      throw new Error(
        "`generation` is required — a restore has to name which version to bring back. " +
          "`object-list` with `softDeleted` on lists deleted objects with their generations, and " +
          "with `versions` on lists overwritten ones",
      );
    }

    const object = await new StorageClient(ctx).request<{
      name?: string;
      generation?: string;
      size?: string;
    }>(
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}/restore`,
      {
        method: "POST",
        query: query({
          generation,
          copySourceAcl: p.copySourceAcl === true ? true : undefined,
        }),
      },
    );

    ctx.log("info", "restored a Cloud Storage object", { name, restoredFrom: generation });

    return {
      object,
      name: object?.name ?? name,
      // A restore creates a new version rather than reviving the old one.
      generation: object?.generation,
      restoredFrom: generation,
      size: Number(object?.size ?? 0),
    };
  },
};

export default action;
