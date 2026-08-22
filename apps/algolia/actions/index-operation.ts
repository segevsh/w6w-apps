import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact, csv } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/operation` — verified against Algolia's OpenAPI
 * document (`operationIndex`; ACL `addObject`; body requires `operation` and
 * `destination`).
 *
 * Copy or move an index. **Move is how a zero-downtime re-index finishes**:
 * build `products_tmp`, then move it onto `products` in one atomic step, which
 * replaces the records without the index ever being empty for searchers.
 *
 * `scope` narrows a **copy** to just settings, synonyms or rules — the way you
 * clone configuration onto a new index without its records. It does not apply
 * to a move, which always takes everything.
 */
const action: ActionDefinition = {
  key: "index-operation",
  type: "perform",
  resource: "index",
  title: "Copy or move an index",
  description: "Copy an index (optionally just its configuration), or move it atomically.",
  // Re-running lands the same destination state.
  idempotent: true,
  params: [
    { ...INDEX_PARAM, label: "Source Index" },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      default: "copy",
      options: [
        { value: "copy", label: "Copy" },
        { value: "move", label: "Move — atomic replace" },
      ],
    },
    {
      key: "destination",
      label: "Destination Index",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "scope",
      label: "Copy Scope",
      type: "string",
      default: "",
      placeholder: "settings,synonyms,rules",
      hint: "Copy only. Comma-separated; blank copies the records too.",
    },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const destination = String(p.destination ?? "").trim();
    const operation = (p.operation as string) || "copy";
    if (!indexName) throw new Error("`indexName` is required");
    if (!destination) throw new Error("`destination` is required");
    const scope = csv(p.scope);
    if (scope && operation === "move") {
      // Algolia ignores it; saying so beats a silently different result.
      throw new Error("`scope` applies to a copy only — a move always takes everything");
    }

    ctx.log("info", "running Algolia index operation", { indexName, operation, destination });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/operation`,
      { method: "POST", body: compact({ operation, destination, scope }) },
    );
  },
};

export default action;
