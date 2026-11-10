import type { TriggerDefinition } from "@w6w/types";
import listPipelines from "../actions/list-pipelines.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Deal pipelines are a handful of account settings and `GET /pipelines` takes only `name` (no
 * paging or sort), so every check reads the whole list through `list-pipelines` and diffs the ids
 * (`pollSnapshot`, added only). https://docs.followupboss.com/reference/pipelines-get (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-pipeline",
  title: "New Deal Pipeline",
  description: "The run gets each deal pipeline newly created in your Follow Up Boss account.",
  output: [
    { key: "id", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stages", type: "array", label: "Stages" },
  ],
  sample: { id: 2, name: "Sellers", stages: [{ id: 5, name: "Listing signed" }] },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(listPipelines, {}, ctx) });
  },
};

export default trigger;
