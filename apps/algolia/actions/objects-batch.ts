import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, json } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/batch` — verified against Algolia's OpenAPI
 * document (`batch`; ACL `addObject`; body requires `requests`).
 *
 * The bulk write path, and the one an index-sync workflow should use: each
 * entry is `{action, body}` where `action` is `addObject`, `updateObject`,
 * `partialUpdateObject`, `partialUpdateObjectNoCreate`, `deleteObject`,
 * `delete` or `clear`. Mixed actions in one batch are fine.
 *
 * Algolia's own clients chunk large batches at 1,000 objects per request; this
 * action sends what it is given in one call, so chunk upstream if the payload
 * is large. The response's `objectIDs` and `taskID` cover the whole batch.
 */
const action: ActionDefinition = {
  key: "objects-batch",
  type: "perform",
  resource: "object",
  title: "Batch write records",
  description: "Add, update or delete many records in one request.",
  idempotent: false,
  params: [
    INDEX_PARAM,
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"action":"addObject","body":{"objectID":"1","name":"Shoe"}}]',
      hint: "Array of {action, body}. Algolia's clients chunk at 1,000 per request.",
    },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "objectIDs", type: "array", label: "Affected object IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    const requests = json(p.requests, "requests");
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error("`requests` is required — a non-empty array of {action, body} objects");
    }

    ctx.log("info", "batch-writing Algolia records", { indexName, count: requests.length });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/batch`,
      { method: "POST", body: { requests } },
    );
  },
};

export default action;
