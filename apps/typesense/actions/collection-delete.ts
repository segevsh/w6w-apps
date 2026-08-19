import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `DELETE /collections/{name}` — drop a collection and everything in it.
 *
 * ## Typesense is a search index, not a database, and this is where that bites
 *
 * The documents in a collection are a *copy* of data that lives somewhere
 * else — that is the whole idea. Dropping one is therefore usually
 * recoverable by re-indexing from the source, and occasionally not: if the
 * pipeline that filled it is gone, or the source has moved on, the index was
 * the last copy of that shape of the data.
 *
 * There is no soft delete and no snapshot. `POST /operations/snapshot` exists
 * for backing up a whole node, and nothing at collection granularity.
 *
 * ## An alias pointing here keeps pointing here
 *
 * Deleting a collection does not clear an alias that names it. The alias
 * survives, resolves to nothing, and every search through it 404s — so this
 * action checks and reports which aliases are about to break.
 */
const action: ActionDefinition = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete a collection",
  description:
    "Drop a collection and every document in it. No soft delete, no snapshot. An ALIAS naming it " +
    "survives the deletion and resolves to nothing, so this reports which aliases are about to " +
    "start returning 404.",
  idempotent: false,
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "There is no undelete. Re-indexing from the source is the only way back.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "What was dropped" },
    { key: "numDocuments", type: "number", label: "How many documents went with it" },
    { key: "deleted", type: "boolean", label: "Whether it was dropped" },
    { key: "brokenAliases", type: "array", label: "Aliases now pointing at nothing" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    if (p.confirm !== true) {
      throw new Error(
        `set \`confirm\` to drop ${collection}. Every document goes with it, there is no soft ` +
          "delete and no per-collection snapshot, and re-indexing from the source is the only " +
          "way back",
      );
    }

    const client = new TypesenseClient(ctx);

    // An alias naming this collection survives and resolves to nothing.
    let brokenAliases: string[] = [];
    try {
      const aliases = await client.request<{
        aliases?: Array<{ name?: string; collection_name?: string }>;
      }>("/aliases");
      brokenAliases = (aliases?.aliases ?? [])
        .filter((alias) => alias?.collection_name === collection)
        .map((alias) => alias?.name)
        .filter(Boolean) as string[];
    } catch {
      // A search-only key cannot list aliases; that is not a reason to refuse.
    }

    const dropped = await client.request<{ name?: string; num_documents?: number }>(
      `/collections/${encodeURIComponent(collection)}`,
      { method: "DELETE" },
    );

    if (brokenAliases.length) {
      ctx.log(
        "warn",
        "these aliases still name the collection that was just dropped, and every search through " +
          "them will 404 until they are repointed",
        { aliases: brokenAliases },
      );
    }

    return {
      name: dropped?.name ?? collection,
      numDocuments: dropped?.num_documents,
      deleted: true,
      brokenAliases,
    };
  },
};

export default action;
