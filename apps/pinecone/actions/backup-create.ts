import type { ActionDefinition } from "@w6w/types";
import { compact, PineconeClient } from "../lib/client.ts";

/**
 * `POST /indexes/{index_name}/backups` — verified against Pinecone's own
 * `db_control` OpenAPI document (`create_backup`).
 *
 * A point-in-time copy of a serverless index, taken without stopping it. This
 * is the safety net worth having before anything destructive: a filter delete
 * whose scope was guessed, a re-ingest that rewrites every record, a schema
 * change that turns out to mean a new index.
 *
 * Backups are **not** the same as the older *collections*, which this app does
 * not touch at all: collections only work with pod-based indexes, the legacy
 * deployment model. Backups are the serverless equivalent, and restoring one
 * creates a **new** index (`index-restore`) rather than overwriting the
 * original — so a restore is always additive, and never destroys what it is
 * recovering from.
 *
 * Taking a backup is asynchronous: the response is a backup record whose
 * `status` moves to `Ready` in its own time. Nothing has been copied at the
 * moment the call returns.
 */
const action: ActionDefinition = {
  key: "backup-create",
  type: "perform",
  resource: "backup",
  title: "Back up an index",
  description:
    "Take a point-in-time backup of a serverless index. Asynchronous — the response comes back " +
    "before the copy is Ready. Restoring makes a NEW index, never an overwrite.",
  idempotent: false,
  params: [
    {
      key: "indexName",
      label: "Index",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "name",
      label: "Backup Name",
      type: "string",
      default: "",
      hint: "How you will recognise it in `backup-list` — dated names age better than " +
        "descriptive ones.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
      hint: "Why it was taken. The thing you want when choosing between four backups later.",
    },
  ],
  output: [
    { key: "backup_id", type: "string", label: "Backup ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "source_index_name", type: "string", label: "Source index" },
    { key: "record_count", type: "number", label: "Records" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    ctx.log("info", "backing up Pinecone index", { indexName });
    return await new PineconeClient(ctx).request(
      `/indexes/${encodeURIComponent(indexName)}/backups`,
      { method: "POST", body: compact({ name: p.name, description: p.description }) },
    );
  },
};

export default action;
