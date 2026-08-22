import type { ActionDefinition } from "@w6w/types";
import { bucketName, objectName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /b/{bucket}/o/{object}` — remove an object.
 *
 * ## What "delete" means depends on the bucket, and the difference is total
 *
 * - **Versioning on** — the current version becomes non-current. The data is
 *   still there, still billed, and still restorable by generation.
 * - **Soft delete on** (the modern default) — the object is retained for the
 *   bucket's window and `object-restore` brings it back. It is invisible to an
 *   ordinary listing and still counts as bucket contents.
 * - **Neither** — it is gone.
 *
 * Nothing in the response says which of the three happened, so this action
 * reads the bucket first and reports it. "I deleted it and it is still costing
 * money" and "I deleted it and there is no way back" are both normal, and
 * which one you are in is a bucket setting nobody looked at.
 *
 * ## The early-deletion charge survives the object
 *
 * An object in NEARLINE, COLDLINE or ARCHIVE bills a minimum of 30, 90 or 365
 * days **whether or not it still exists**. Deleting an archived object after a
 * week does not save anything; it costs the same as leaving it for a year.
 *
 * ## A precondition is what makes this safe under concurrency
 *
 * `ifGenerationMatch` deletes only the version that was read. Without it, a
 * delete issued after somebody else replaced the object removes *their* new
 * version.
 */
const action: ActionDefinition = {
  key: "object-delete",
  type: "perform",
  resource: "object",
  title: "Delete an object",
  description:
    "Remove an object. Whether that is reversible depends entirely on the bucket's versioning " +
    "and soft-delete settings — this reads them and says which case you are in.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "ifGenerationMatch",
      label: "Only this version",
      type: "string",
      default: "",
      hint: "A generation from `object-get`. Without it, a delete racing an overwrite removes " +
        "the other writer's new version.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "name", type: "string", label: "What was removed" },
    { key: "recoverable", type: "boolean", label: "Whether it can be brought back" },
    { key: "recoveryMethod", type: "string", label: "How, if it can" },
    { key: "earlyDeletionNote", type: "string", label: "What it is still billed for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);

    const client = new StorageClient(ctx);

    // Which of the three deletes this is, is a bucket setting.
    const config = await client.request<{
      versioning?: { enabled?: boolean };
      softDeletePolicy?: { retentionDurationSeconds?: string };
    }>(`/b/${encodeURIComponent(bucket)}`);
    const versioned = config?.versioning?.enabled === true;
    const softDeleteSeconds = Number(config?.softDeletePolicy?.retentionDurationSeconds ?? 0);

    // The object's own class, which need not be the bucket's default.
    const before = await client.request<{ storageClass?: string; timeCreated?: string }>(
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
    ).catch(() => undefined);

    await client.request(
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
      { method: "DELETE", query: query({ ifGenerationMatch: p.ifGenerationMatch }) },
    );

    const recoverable = versioned || softDeleteSeconds > 0;
    const recoveryMethod = versioned
      ? "the previous generation is retained — `object-list` with versions on shows it"
      : softDeleteSeconds > 0
      ? `soft delete retains it for ${softDeleteSeconds} seconds — \`object-restore\` brings it back`
      : undefined;

    ctx.log(
      recoverable ? "info" : "warn",
      recoverable
        ? "deleted a Cloud Storage object, which is still recoverable"
        : "deleted a Cloud Storage object — this bucket has neither versioning nor soft delete, " +
          "so it is gone",
      { name, recoverable },
    );

    return {
      deleted: true,
      name,
      recoverable,
      recoveryMethod,
      earlyDeletionNote: earlyNote(before?.storageClass),
    };
  },
};

/** Kept local so the import list stays honest about what this action reads. */
function earlyNote(storageClass: unknown): string | undefined {
  const name = String(storageClass ?? "").toUpperCase();
  const days: Record<string, number> = { NEARLINE: 30, COLDLINE: 90, ARCHIVE: 365 };
  if (!days[name]) return undefined;
  return `${name} bills a minimum of ${days[name]} days per object — deleting it does not stop ` +
    "that charge, so this saves nothing until the minimum has elapsed";
}

export default action;
