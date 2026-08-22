import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}` — verified against Algolia's OpenAPI document
 * (`saveObject`; ACL `addObject`; answers `{ createdAt, taskID, objectID }`).
 *
 * The difference from `object-save`: this one lets **Algolia generate the
 * objectID**, so calling it twice with the same body creates two records. When
 * the record already carries an `objectID`, Algolia uses it — and then this
 * behaves as an upsert. That is why it is honestly marked non-idempotent:
 * whether a retry duplicates depends on the caller's own data.
 */
const action: ActionDefinition = {
  key: "object-add",
  type: "perform",
  resource: "object",
  title: "Add a record",
  description: "Add a record, letting Algolia generate its objectID.",
  idempotent: false,
  params: [
    INDEX_PARAM,
    {
      key: "record",
      label: "Record",
      type: "json",
      required: true,
      default: "",
      hint: "Include an `objectID` to make this an upsert; omit it and Algolia assigns one.",
    },
  ],
  output: [
    { key: "objectID", type: "string", label: "Object ID" },
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    const record = jsonObject(p.record, "record");
    if (!record) throw new Error("`record` is required");

    ctx.log("info", "adding Algolia record", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}`,
      { method: "POST", body: record },
    );
  },
};

export default action;
