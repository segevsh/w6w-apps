import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `PUT /1/indexes/{indexName}/rules/{objectID}` — verified against Algolia's
 * OpenAPI document (`saveRule`; ACL `editSettings`).
 *
 * A rule is `{objectID, conditions, consequence, enabled?, validity?}`, where
 * the consequence can promote records, hide them, add query parameters or
 * inject custom data. It is passed as JSON: this is a small DSL, and a form
 * that modelled one shape of it would exclude the rest.
 */
const action: ActionDefinition = {
  key: "rule-save",
  type: "perform",
  resource: "rule",
  title: "Save a rule",
  description: "Create or replace one query rule.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Rule ID", type: "string", required: true, default: "" },
    {
      key: "rule",
      label: "Rule",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"conditions":[{"pattern":"shoes","anchoring":"contains"}],' +
        '"consequence":{"promote":[{"objectID":"1","position":0}]}}',
      hint: "Conditions plus a consequence. The objectID is taken from the field above.",
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
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const objectID = String(p.objectID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!objectID) throw new Error("`objectID` is required");
    const rule = jsonObject(p.rule, "rule");
    if (!rule) throw new Error("`rule` is required");

    ctx.log("info", "saving Algolia rule", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/${encodeURIComponent(objectID)}`,
      {
        method: "PUT",
        // Algolia takes the objectID in the body as well as the path; setting
        // it from the field keeps the two from disagreeing.
        body: { ...rule, objectID },
        query: { forwardToReplicas: p.forwardToReplicas === true ? "true" : undefined },
      },
    );
  },
};

export default action;
