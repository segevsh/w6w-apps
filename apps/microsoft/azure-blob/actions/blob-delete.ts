import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { child, text } from "../lib/xml.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `DELETE /{container}/{blob}` — remove a blob.
 *
 * ## Snapshots make a delete fail rather than cascade
 *
 * A blob with snapshots cannot be deleted without saying what to do with them.
 * The plain call is a **409**, and `x-ms-delete-snapshots` decides:
 *
 * - **`include`** — delete the blob and its snapshots.
 * - **`only`** — delete the snapshots and keep the blob.
 *
 * There is no default, which is the right way round: the alternative would be
 * a delete that silently destroys point-in-time copies somebody made
 * deliberately.
 *
 * ## Whether this is reversible is a container setting nobody looked at
 *
 * With soft delete on, the blob is retained for the policy's window and
 * `blob-undelete` brings it back. Without it, the blob is gone. The response
 * is identical either way, so this action reads the policy first and says
 * which case you are in.
 *
 * ## The early-deletion charge survives the blob
 *
 * Cool bills a minimum of 30 days per blob, Cold 90, Archive 180 — whether or
 * not it still exists. Deleting an archived blob after a week costs the same as
 * keeping it for six months.
 */
const action: ActionDefinition = {
  key: "blob-delete",
  type: "perform",
  resource: "blob",
  title: "Delete a blob",
  description:
    "Remove a blob. A blob with SNAPSHOTS refuses to be deleted until you say what happens to " +
    "them. Whether the delete is reversible depends on the container's soft-delete policy — " +
    "this reads it and says which.",
  idempotent: true,
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "snapshots",
      label: "Snapshots",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Fail if there are any" },
        { value: "include", label: "Delete them with the blob" },
        { value: "only", label: "Delete the snapshots, keep the blob" },
      ],
      hint: "Azure has no default here, and a blob with snapshots is a 409 without one.",
    },
    {
      key: "ifMatch",
      label: "Only this version",
      type: "string",
      default: "",
      hint: "An ETag from `blob-get`. Without it, a delete racing an overwrite removes the other " +
        "writer's new blob.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "name", type: "string", label: "What was removed" },
    { key: "recoverable", type: "boolean", label: "Whether soft delete can bring it back" },
    { key: "retentionDays", type: "number", label: "How long it stays recoverable" },
    { key: "snapshots", type: "string", label: "What happened to the snapshots" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);

    const client = new BlobClient(ctx);

    // Soft delete is an account-level policy, and it decides whether this is
    // reversible. Nothing in the delete's own response says so.
    let retentionDays = 0;
    try {
      const properties = await client.request("/", {
        query: query({ restype: "service", comp: "properties" }),
      });
      const policy = child(child(properties, "StorageServiceProperties"), "DeleteRetentionPolicy");
      if (text(policy, "Enabled") === "true") {
        retentionDays = Number(text(policy, "Days") ?? 0);
      }
    } catch {
      // Reading service properties needs an account-level permission a scoped
      // credential may not have. Not knowing is reported, not guessed.
      retentionDays = -1;
    }

    const headers: Record<string, string> = {};
    const snapshots = String(p.snapshots ?? "").trim();
    if (snapshots) headers["x-ms-delete-snapshots"] = snapshots;
    const ifMatch = String(p.ifMatch ?? "").trim();
    if (ifMatch) headers["if-match"] = ifMatch;

    await client.request(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      { method: "DELETE", headers },
    );

    const recoverable = retentionDays > 0;
    ctx.log(
      recoverable ? "info" : "warn",
      recoverable
        ? "deleted an Azure blob, which soft delete keeps recoverable"
        : retentionDays === 0
        ? "deleted an Azure blob — soft delete is off on this account, so it is gone"
        : "deleted an Azure blob — whether soft delete can recover it could not be read",
      { name: blob, recoverable },
    );

    return {
      deleted: true,
      name: blob,
      recoverable,
      retentionDays: retentionDays > 0 ? retentionDays : undefined,
      snapshots: snapshots || undefined,
    };
  },
};

export default action;
