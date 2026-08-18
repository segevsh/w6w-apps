import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/{objectID}/partial` — verified against
 * Algolia's OpenAPI document (`partialUpdateObject`; ACL `addObject`).
 *
 * A partial update: only the attributes in the body change, and the rest of the
 * record survives. It also supports Algolia's built-in operations — increment,
 * decrement, add/remove from an array — expressed as
 * `{"_operation":"Increment","value":1}` in place of a plain value.
 */
const action: ActionDefinition = {
  key: "object-update",
  type: "perform",
  resource: "object",
  title: "Update a record",
  description: "Change some attributes of a record, leaving the rest alone.",
  // NOT idempotent in general: an Increment operation compounds on a retry.
  idempotent: false,
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Object ID", type: "string", required: true, default: "" },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"price":89,"stock":{"_operation":"Decrement","value":1}}',
      hint: 'Only these change. Built-in operations use {"_operation":…,"value":…}.',
    },
    {
      key: "createIfNotExists",
      label: "Create If Missing",
      type: "boolean",
      default: true,
      hint: "Off means an unknown objectID is a no-op rather than a new record.",
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
    const attributes = jsonObject(p.attributes, "attributes");
    if (!attributes) throw new Error("`attributes` is required");

    ctx.log("info", "updating Algolia record", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectID)}/partial`,
      {
        method: "POST",
        body: attributes,
        // Algolia reads this as the string "true"/"false".
        query: { createIfNotExists: p.createIfNotExists === false ? "false" : "true" },
      },
    );
  },
};

export default action;
