import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `PUT /1/indexes/{indexName}/{objectID}` — verified against Algolia's OpenAPI
 * document (`addOrUpdateObject`; ACL `addObject`).
 *
 * A **full replace** keyed on the objectID: attributes absent from the body are
 * removed from the record. `object-update` is the partial one.
 *
 * **Writes are asynchronous.** Algolia answers immediately with a `taskID`, and
 * the record is not searchable until that task finishes — which is what
 * `task-get` is for. A workflow that writes and then immediately searches will
 * miss its own write; this is the single most common surprise with this API.
 */
const action: ActionDefinition = {
  key: "object-save",
  type: "perform",
  resource: "object",
  title: "Save a record",
  description: "Create or fully replace one record, keyed on its objectID.",
  // Replaying the same body lands the same record — the objectID is the key.
  idempotent: true,
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Object ID", type: "string", required: true, default: "" },
    {
      key: "record",
      label: "Record",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"name":"Running shoe","price":95}',
      hint: "The whole record. Anything omitted is removed — use Update for a partial change.",
    },
  ],
  output: [
    { key: "objectID", type: "string", label: "Object ID" },
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const objectID = String(p.objectID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!objectID) throw new Error("`objectID` is required");
    const record = jsonObject(p.record, "record");
    if (!record) throw new Error("`record` is required");

    ctx.log("info", "saving Algolia record", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectID)}`,
      // The objectID lives in the path; sending it in the body too is harmless
      // but redundant, so the caller's record is passed through as given.
      { method: "PUT", body: record },
    );
  },
};

export default action;
