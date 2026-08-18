import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `PUT /1/indexes/{indexName}/synonyms/{objectID}` — verified against
 * Algolia's OpenAPI document (`saveSynonym`; ACL `editSettings`).
 *
 * The synonym body is passed as JSON because its shape depends on `type`:
 * a plain `synonym` takes `synonyms: [...]`, `oneWaySynonym` adds `input`,
 * `altCorrection1`/`2` take `word` + `corrections`, and `placeholder` takes
 * `placeholder` + `replacements`. Flattening those into one form would make
 * four of the five shapes unreachable.
 */
const action: ActionDefinition = {
  key: "synonym-save",
  type: "perform",
  resource: "synonym",
  title: "Save a synonym",
  description: "Create or replace one synonym rule.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Synonym ID", type: "string", required: true, default: "" },
    {
      key: "synonym",
      label: "Synonym",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"type":"synonym","synonyms":["sneaker","trainer","running shoe"]}',
      hint: "Shape depends on `type`: synonym, oneWaySynonym, altCorrection1/2, placeholder.",
    },
    {
      key: "forwardToReplicas",
      label: "Forward To Replicas",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "id", type: "string", label: "Synonym ID" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const objectID = String(p.objectID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!objectID) throw new Error("`objectID` is required");
    const synonym = jsonObject(p.synonym, "synonym");
    if (!synonym) throw new Error("`synonym` is required");

    ctx.log("info", "saving Algolia synonym", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectID)}`,
      {
        method: "PUT",
        body: synonym,
        query: { forwardToReplicas: p.forwardToReplicas === true ? "true" : undefined },
      },
    );
  },
};

export default action;
