import type { ActionDefinition } from "@w6w/types";
import { parentOf, resolveLocation, resolveProject, VertexClient } from "../lib/client.ts";
import { LIST_PARAMS, LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/{parent}/batchPredictionJobs` — verified against the discovery document
 * (`projects.locations.batchPredictionJobs.list`): query `filter`, `pageSize`, `pageToken`, and a
 * response carrying `batchPredictionJobs` plus `nextPageToken`.
 */
const action: ActionDefinition = {
  key: "batch-prediction-job-list",
  type: "read",
  resource: "batch-prediction-job",
  title: "List batch prediction jobs",
  description: "List batch prediction jobs in one location.",
  params: [PROJECT_PARAM, LOCATION_PARAM, ...LIST_PARAMS],
  output: [
    { key: "items", type: "array", label: "Jobs" },
    { key: "nextPageToken", type: "string", label: "Set when more results remain after the limit" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const location = resolveLocation(ctx.connection, p.location);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vertex AI batchPredictionJobs", {
      project,
      location,
      returnAll,
      limit,
    });

    return await new VertexClient(ctx).requestAll(
      location,
      `${parentOf(project, location)}/batchPredictionJobs`,
      "batchPredictionJobs",
      { query: { filter: (p.filter as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
