import type { ActionDefinition } from "@w6w/types";
import { resolveResource, VertexClient } from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/projects/{p}/locations/{l}/batchPredictionJobs/{id}` — verified against the discovery
 * document (`projects.locations.batchPredictionJobs.get`). Accepts a bare id or the full resource
 * name a list result carries; a full name's own location picks the host.
 */
const action: ActionDefinition = {
  key: "batch-prediction-job-get",
  type: "read",
  resource: "batch-prediction-job",
  title: "Get batch prediction job",
  description: "Get a batch prediction job's state, completion stats and output location.",
  params: [
    PROJECT_PARAM,
    LOCATION_PARAM,
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      hint: "The id, or the full resource name.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "state", type: "string", label: "Job state" },
    { key: "completionStats", type: "object", label: "Completion stats" },
    { key: "outputInfo", type: "object", label: "Output location" },
    { key: "error", type: "object", label: "Error" },
  ],

  async execute(input, ctx) {
    const target = resolveResource(
      ctx.connection,
      input as Record<string, unknown>,
      "batchPredictionJobs",
      "jobId",
    );
    return await new VertexClient(ctx).request(target.location, target.name);
  },
};

export default action;
