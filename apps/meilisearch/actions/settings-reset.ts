import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `DELETE /indexes/{indexUid}/settings` — verified against Meilisearch's
 * OpenAPI document (`delete_all`).
 *
 * **Resets every setting to its default at once** — searchable attributes,
 * filterable attributes, ranking rules, synonyms, stop words, embedders. It is
 * not a way to clear one setting; it clears all of them, and the index then
 * re-indexes against the defaults.
 *
 * That is a legitimate thing to want and an easy thing to reach for by mistake,
 * so it requires an explicit confirmation and does not take the connection's
 * default index.
 */
const action: ActionDefinition = {
  key: "settings-reset",
  type: "perform",
  resource: "settings",
  title: "Reset index settings",
  description: "Enqueue a reset of EVERY setting on an index back to its default.",
  idempotent: true,
  params: [
    {
      ...INDEX_PARAM,
      required: true,
      hint: "Named explicitly — this action does not fall back to the connection's default.",
    },
    {
      key: "confirm",
      label: "I understand every setting on this index is reset",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Filterable attributes, synonyms, ranking rules and embedders all go.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = String(p.indexUid ?? "").trim();
    if (!index) throw new Error("`indexUid` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — this resets every setting, not one");
    }

    ctx.log("warn", "enqueueing a Meilisearch settings reset", { index });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/settings`,
      { method: "DELETE" },
    );
  },
};

export default action;
