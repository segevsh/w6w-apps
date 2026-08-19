import type { ActionDefinition } from "@w6w/types";
import { bucketName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `DELETE /b/{bucket}` — remove a bucket.
 *
 * ## It must be empty, and "empty" includes what you cannot see
 *
 * Cloud Storage refuses with a **409** while the bucket holds anything. That
 * includes **non-current versions** in a versioned bucket and
 * **soft-deleted** objects still inside their retention window — neither of
 * which an ordinary listing shows. So "I deleted everything and it still says
 * not empty" is the normal experience, and this action checks for both and
 * says which.
 *
 * ## The name does not come back
 *
 * Bucket names are globally unique and are **not immediately reusable** after
 * deletion. Deleting `acme-uploads` does not free the name for you to recreate
 * straight away, and it never guarantees you get it back — somebody else can
 * take it.
 *
 * The confirmation asks for the bucket name typed again, because a wrong value
 * destroys a different bucket and there is no undo at this level.
 */
const action: ActionDefinition = {
  key: "bucket-delete",
  type: "perform",
  resource: "bucket",
  title: "Delete a bucket",
  description:
    "Remove an empty bucket. 'Empty' includes non-current VERSIONS and SOFT-DELETED objects, " +
    "which an ordinary listing does not show — the usual reason a delete keeps failing.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    {
      key: "confirmName",
      label: "Type the bucket name again",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "name", type: "string", label: "What was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = bucketName(p.bucket);
    if (String(p.confirmName ?? "").trim() !== name) {
      throw new Error(
        `\`confirmName\` must match the bucket name exactly — got ` +
          `"${String(p.confirmName ?? "").trim()}" for "${name}"`,
      );
    }

    const client = new StorageClient(ctx);

    // The two categories a plain listing hides, checked so the refusal can say
    // which one is in the way.
    const hidden = await client.request<{ items?: unknown[] }>(
      `/b/${encodeURIComponent(name)}/o`,
      { query: query({ versions: true, maxResults: 1 }) },
    );
    if ((hidden?.items ?? []).length) {
      throw new Error(
        `"${name}" still contains objects — including non-current versions, which an ordinary ` +
          "listing does not show. Every version has to go before the bucket can be deleted, and " +
          "`object-list` with `versions` on is what shows them",
      );
    }

    const softDeleted = await client.request<{ items?: unknown[] }>(
      `/b/${encodeURIComponent(name)}/o`,
      { query: query({ softDeleted: true, maxResults: 1 }) },
    );
    if ((softDeleted?.items ?? []).length) {
      throw new Error(
        `"${name}" still holds soft-deleted objects, which are invisible to an ordinary listing ` +
          "and count as contents. They disappear when the bucket's soft-delete retention window " +
          "elapses; until then the bucket cannot be deleted",
      );
    }

    await client.request(`/b/${encodeURIComponent(name)}`, { method: "DELETE" });

    ctx.log(
      "warn",
      "deleted a Cloud Storage bucket — the name is not immediately reusable, and never " +
        "guaranteed to come back",
      { name },
    );

    return { deleted: true, name };
  },
};

export default action;
