import type { TriggerDefinition } from "@w6w/types";
import listPipelines from "../actions/list-pipelines.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /opportunities/pipelines` takes only the location id and returns every pipeline of it in
 * one response, with no paging and no sort key
 * (https://marketplace.gohighlevel.com/docs/ghl/opportunities/get-pipelines, verified 2026-11-10):
 * a small bounded collection. Every check reads it through `list-pipelines` and diffs the ids
 * (`pollSnapshot`, added only).
 */
const newPipeline: TriggerDefinition = {
  key: "new-pipeline",
  title: "New Pipeline",
  description:
    "Checks the connected HighLevel location for pipelines created since the last check. The run gets each new pipeline (id, name, stages).",
  output: [
    { key: "id", type: "string", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stages", type: "array", label: "Stages" },
    { key: "locationId", type: "string", label: "Location ID" },
  ],
  sample: {
    id: "sample-pipeline-id",
    name: "Sales pipeline",
    stages: [{ id: "sample-stage-id", name: "New lead", position: 0 }],
    locationId: "sample-location-id",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await listPipelines.execute({}, ctx) as { pipelines?: unknown[] };
    return newRecords({ state, items: res.pipelines ?? [], what: "pipeline" });
  },
};

export default newPipeline;
