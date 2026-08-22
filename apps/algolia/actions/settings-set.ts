import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, jsonObject } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `PUT /1/indexes/{indexName}/settings` — verified against Algolia's OpenAPI
 * document (`setSettings`; ACL **`editSettings`**, which is a different ACL
 * from the `settings` one that reads them).
 *
 * Settings are passed as JSON because the surface is large and versioned by
 * Algolia (searchableAttributes, customRanking, attributesForFaceting,
 * ranking, typoTolerance, and dozens more), and a form that enumerated a subset
 * would quietly prevent the rest.
 *
 * `forwardToReplicas` is the flag that matters on an index with replicas:
 * without it, a settings change lands on the primary only and the replicas
 * silently keep serving the old configuration.
 */
const action: ActionDefinition = {
  key: "settings-set",
  type: "perform",
  resource: "index",
  title: "Set index settings",
  description: "Update an index's settings.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "settings",
      label: "Settings",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"searchableAttributes":["name","description"]}',
      hint: "Only the keys present are changed.",
    },
    {
      key: "forwardToReplicas",
      label: "Forward To Replicas",
      type: "boolean",
      default: false,
      hint: "Without this, replicas keep the old settings.",
    },
  ],
  output: [
    { key: "taskID", type: "number", label: "Task ID — pass to Get a task" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    const settings = jsonObject(p.settings, "settings");
    if (!settings) throw new Error("`settings` is required");

    ctx.log("info", "setting Algolia index settings", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/settings`,
      {
        method: "PUT",
        body: settings,
        // Algolia reads this as the string "true".
        query: { forwardToReplicas: p.forwardToReplicas === true ? "true" : undefined },
      },
    );
  },
};

export default action;
