import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS } from "../lib/params.ts";

/**
 * `DELETE /namespaces/{namespace}` on the index's own host — verified against
 * Pinecone's own `db_data` OpenAPI document (`delete_namespace`).
 *
 * Removes the namespace **and every record in it**, in one call. Where a
 * namespace holds one customer's data — which is the usual design — this is the
 * delete-the-customer operation, and it is exactly as final as that sounds:
 * there is no undo and no export step.
 *
 * It differs from `record-delete` with **Delete Everything** in what survives:
 * that empties the namespace and leaves it in place, this removes the container
 * too. Queries cannot tell the difference; `namespace-list` can.
 *
 * A confirmation flag is required for the same reason as `index-delete`: an
 * irreversible call reached by a mis-set variable should not succeed on the
 * strength of a name alone.
 */
const action: ActionDefinition = {
  key: "namespace-delete",
  type: "perform",
  resource: "namespace",
  title: "Delete namespace",
  description:
    "Delete a namespace and everything in it — in a namespace-per-tenant design, that is one " +
    "customer's entire data. No undo.",
  idempotent: true,
  params: [
    ...INDEX_PARAMS,
    {
      key: "namespace",
      label: "Namespace",
      type: "string",
      required: true,
      default: "",
      hint: "The namespace to remove entirely.",
    },
    {
      key: "confirm",
      label: "Yes, delete the namespace and every record in it",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "namespace", type: "string", label: "Namespace" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const namespace = String(p.namespace ?? "").trim();
    if (!namespace) {
      throw new Error(
        "`namespace` is required — to empty the DEFAULT namespace use `record-delete` with " +
          "Delete Everything, which is a different operation",
      );
    }
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete namespace "${namespace}" without \`confirm\` — every record in it ` +
          "goes with it",
      );
    }

    ctx.log("warn", "deleting Pinecone namespace", { namespace });
    await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      `/namespaces/${encodeURIComponent(namespace)}`,
      { method: "DELETE" },
    );
    return { ok: true, namespace };
  },
};

export default action;
