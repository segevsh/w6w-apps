import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `DELETE /1/indexes/{indexName}/{objectID}` — verified against Algolia's
 * OpenAPI document (`deleteObject`; ACL `deleteObject`).
 */
const action: ActionDefinition = {
  key: "object-delete",
  type: "perform",
  resource: "object",
  title: "Delete a record",
  description: "Remove one record by its objectID.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Object ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "deletedAt", type: "string", label: "Deleted at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const objectID = String(p.objectID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!objectID) throw new Error("`objectID` is required");

    ctx.log("info", "deleting Algolia record", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectID)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
