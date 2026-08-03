import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

interface Input {
  pipelineId?: number | string;
}

/**
 * `GET /pipeline_stages` — every Pipeline Stage on the account, or
 * `GET /pipeline_stages/pipeline/{pipeline_id}` for one pipeline's stages.
 *
 * Two documented endpoints, one action, because the only difference is whether a
 * pipeline id is supplied. Copper documents them separately ("List Pipeline
 * Stages" and "List Stages in a Pipeline"); splitting them into two w6w actions
 * would surface the same fields twice for no gain.
 *
 * Each stage carries `pipeline_id` and a `win_probability` (0–100), which is
 * what makes a flat listing useful: you can build a stage→probability map for
 * forecasting in one call.
 */
const listPipelineStages: ActionDefinition<Input> = {
  key: "list-pipeline-stages",
  type: "search",
  resource: "pipeline",
  title: "List Pipeline Stages",
  description:
    "List Pipeline Stages — all of them, or just one pipeline's. Each carries its `pipeline_id` " +
    "and win probability.",
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      hint:
        "Optional. Supplied, this calls `GET /pipeline_stages/pipeline/{id}`; omitted, it lists " +
        "every stage on the account.",
    },
  ],
  output: [{ key: "stages", type: "array", label: "Pipeline stages" }],

  async execute(input, ctx) {
    const path = input.pipelineId === undefined || input.pipelineId === ""
      ? "/pipeline_stages"
      : `/pipeline_stages/pipeline/${encodeURIComponent(String(input.pipelineId))}`;
    const stages = await new CopperClient(ctx).request<unknown[]>(path);
    return { stages: stages ?? [] };
  },
};

export default listPipelineStages;
