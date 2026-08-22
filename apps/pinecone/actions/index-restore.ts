import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";

/**
 * `POST /backups/{backup_id}/create-index` — verified against Pinecone's own
 * `db_control` OpenAPI document (`create_index_from_backup_operation`).
 *
 * A restore **creates a new index** from a backup. It never overwrites the
 * original, and it cannot: the new index needs its own name, and Pinecone
 * refuses a name that is already taken. That is a deliberate design and a good
 * one — recovering from a bad ingest means standing the old data up beside the
 * damaged index and cutting over, rather than a destructive operation that can
 * itself go wrong.
 *
 * What the restored index inherits from the backup is everything structural:
 * dimension, metric, vector type and the embedding configuration. What it does
 * **not** inherit is where it lives — a backup can be restored to a different
 * region in the same cloud, but *not* to a different cloud.
 *
 * Like creation, this is asynchronous: the index comes back `Initializing` and
 * is not queryable until `index-get` says `Ready`.
 */
const action: ActionDefinition = {
  key: "index-restore",
  type: "perform",
  resource: "backup",
  title: "Restore an index from a backup",
  description: "Create a NEW index from a backup — never an overwrite, so recovery is additive. " +
    "Asynchronous: the index arrives Initializing.",
  idempotent: false,
  params: [
    {
      key: "backupId",
      label: "Backup ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `backup-list`. The backup must be `Ready`.",
    },
    {
      key: "name",
      label: "New Index Name",
      type: "string",
      required: true,
      default: "",
      hint: "Must not already exist. The restore creates this index; it does not replace the " +
        "one the backup came from.",
    },
    {
      key: "deletionProtection",
      label: "Deletion Protection",
      type: "boolean",
      default: false,
      advanced: true,
    },
    { key: "tags", label: "Tags", type: "json", default: "", advanced: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "host", type: "string", label: "Data-plane host" },
    { key: "status", type: "object", label: "Status" },
    { key: "spec", type: "object", label: "Spec" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const backupId = String(p.backupId ?? "").trim();
    if (!backupId) throw new Error("`backupId` is required");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required — a restore creates a new index");

    ctx.log("info", "restoring Pinecone index from backup", { backupId, name });
    return await new PineconeClient(ctx).request(
      `/backups/${encodeURIComponent(backupId)}/create-index`,
      {
        method: "POST",
        body: compact({
          name,
          deletion_protection: p.deletionProtection === true ? "enabled" : undefined,
          tags: json(p.tags, "tags"),
        }),
      },
    );
  },
};

export default action;
