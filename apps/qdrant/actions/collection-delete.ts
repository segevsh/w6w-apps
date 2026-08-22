import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";

/**
 * `DELETE /collections/{name}` — destroy a collection and everything in it.
 *
 * Every point, every vector, every payload, immediately and permanently. There
 * is no recycle bin and no soft delete at this level; the only recovery is a
 * snapshot taken beforehand, and a snapshot restores to the moment it was
 * taken rather than to the moment before the delete.
 *
 * The cost is not only the data. Re-creating the collection means re-embedding
 * every document, which is real money at an embedding provider and real time —
 * a large corpus is hours, and the vectors cannot be recovered from the
 * warehouse the documents came from without paying for the embeddings again.
 *
 * So it is gated behind naming the collection a second time. That is
 * deliberately more friction than a boolean: a typo'd name in a workflow
 * parameter is exactly how the wrong collection gets deleted, and a
 * confirmation that repeats the name catches it.
 */
const action: ActionDefinition = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete a collection",
  description:
    "Destroy a collection and every point in it, permanently. Recovery means re-embedding the " +
    "whole corpus — real money and hours — so this asks for the name twice.",
  idempotent: true,
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "confirmName",
      label: "Type the collection name again",
      type: "string",
      required: true,
      default: "",
      hint: "Must match exactly. A typo'd name in a workflow parameter is how the wrong " +
        "collection gets deleted, and repeating it is what catches that.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const confirm = String(p.confirmName ?? "").trim();
    if (confirm !== collection) {
      throw new Error(
        `\`confirmName\` must match the collection name exactly — got "${confirm}" for ` +
          `"${collection}". Deleting a collection destroys every vector in it, and recovery ` +
          "means re-embedding the corpus",
      );
    }

    ctx.log("warn", "deleting a Qdrant collection and every point in it", { collection });
    await new QdrantClient(ctx).request(`/collections/${encodeURIComponent(collection)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default action;
