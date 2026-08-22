import type { ActionDefinition } from "@w6w/types";
import { csv, json, MAX_DELETE_IDS, PineconeClient } from "../lib/client.ts";
import { FILTER_PARAM, INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `POST /vectors/delete` on the index's own host — verified against Pinecone's
 * own `db_data` OpenAPI document (`delete_vectors`).
 *
 * Three mutually exclusive ways to say what to delete, and Pinecone rejects any
 * two together:
 *
 *   - **by id** — up to 1000 per call, the ordinary case;
 *   - **by metadata filter** — everything matching, count unknown in advance;
 *   - **everything in the namespace** — `deleteAll`.
 *
 * The last two are the dangerous ones, because neither says how much it will
 * remove and there is no dry run and no undo. So both require the explicit
 * confirmation flag, while deleting a named list of ids does not: naming ids is
 * itself a statement of intent, and re-deleting them is harmless.
 *
 * **`deleteAll` empties the namespace but does not remove it.** For serverless
 * indexes an empty namespace still exists as a container; `namespace-delete` is
 * what removes it. The two look identical from a query's point of view and
 * differ in `namespace-list`.
 */
const action: ActionDefinition = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete records",
  description:
    "Delete by id, by metadata filter, or empty a whole namespace. The last two need an " +
    "explicit confirmation — neither can say in advance how much it will remove.",
  idempotent: true,
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      default: "",
      hint: `Comma-separated, up to ${MAX_DELETE_IDS} per call. Deleting an id that is already ` +
        "gone is not an error.",
    },
    FILTER_PARAM,
    {
      key: "deleteAll",
      label: "Delete Everything In The Namespace",
      type: "boolean",
      default: false,
      hint: "Empties the namespace. The namespace itself survives — `namespace-delete` removes " +
        "that.",
    },
    {
      key: "confirm",
      label: "Yes, I know how much this deletes",
      type: "boolean",
      default: false,
      hint: "Required for a filter delete or Delete Everything. Neither can be undone, and " +
        "neither reports a count first.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "mode", type: "string", label: "How the target was chosen" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.ids);
    const filter = json(p.filter, "filter");
    const deleteAll = p.deleteAll === true;

    const chosen = [ids && "ids", filter !== undefined && "filter", deleteAll && "deleteAll"]
      .filter(Boolean) as string[];
    if (chosen.length === 0) {
      throw new Error("give `ids`, a `filter`, or `deleteAll` — nothing was selected to delete");
    }
    if (chosen.length > 1) {
      throw new Error(
        `give exactly one of \`ids\`, \`filter\` or \`deleteAll\` — Pinecone rejects the ` +
          `combination (got ${chosen.join(" + ")})`,
      );
    }
    if (ids && ids.length > MAX_DELETE_IDS) {
      throw new Error(
        `Pinecone accepts at most ${MAX_DELETE_IDS} ids per delete; got ${ids.length}`,
      );
    }
    // A named list of ids is its own statement of intent. A filter or a
    // namespace wipe is not.
    if (!ids && p.confirm !== true) {
      throw new Error(
        `refusing a ${deleteAll ? "delete-everything" : "filter"} delete without \`confirm\` — ` +
          "it cannot say how many records it will remove, and there is no undo",
      );
    }

    const namespace = String(p.namespace ?? "");
    ctx.log(ids ? "info" : "warn", "deleting Pinecone records", {
      mode: chosen[0],
      count: ids?.length,
      namespace,
    });

    await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/vectors/delete",
      {
        method: "POST",
        // camelCase: deleteAll, not delete_all.
        body: {
          namespace,
          ...(ids ? { ids } : {}),
          ...(filter !== undefined ? { filter } : {}),
          ...(deleteAll ? { deleteAll: true } : {}),
        },
      },
    );
    return { ok: true, mode: chosen[0] };
  },
};

export default action;
