import type { ActionDefinition } from "@w6w/types";
import { resolveResource, VertexClient } from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/…/batchPredictionJobs/{id}:cancel` — verified against the discovery
 * document (`projects.locations.batchPredictionJobs.cancel`). Empty request body,
 * empty response. Cancellation is asynchronous: the job moves to
 * `JOB_STATE_CANCELLING` and later `JOB_STATE_CANCELLED`.
 */
const action: ActionDefinition = {
  key: "batch-prediction-job-cancel",
  type: "perform",
  resource: "batch-prediction-job",
  title: "Cancel batch prediction job",
  description: "Ask Vertex AI to stop a running batch prediction job.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    LOCATION_PARAM,
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [{ key: "cancelled", type: "boolean", label: "Cancellation requested" }],

  async execute(input, ctx) {
    const target = resolveResource(
      ctx.connection,
      input as Record<string, unknown>,
      "batchPredictionJobs",
      "jobId",
    );
    await new VertexClient(ctx).request(target.location, `${target.name}:cancel`, {
      method: "POST",
      body: {},
    });
    return { cancelled: true, name: target.name };
  },
};

export default action;
