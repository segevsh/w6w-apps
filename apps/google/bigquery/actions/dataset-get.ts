import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectId}/datasets/{datasetId}` — verified against
 * BigQuery's discovery document (`datasets.get`).
 */
const action: ActionDefinition = {
  key: "dataset-get",
  type: "read",
  resource: "dataset",
  title: "Get a dataset",
  description: "Retrieve one dataset's settings, location and access list.",
  params: [PROJECT_PARAM, DATASET_PARAM],
  output: [
    { key: "id", type: "string", label: "Qualified ID" },
    { key: "datasetReference", type: "object", label: "Dataset reference" },
    { key: "friendlyName", type: "string", label: "Friendly name" },
    { key: "description", type: "string", label: "Description" },
    { key: "location", type: "string", label: "Location" },
    { key: "labels", type: "object", label: "Labels" },
    { key: "access", type: "array", label: "Access entries" },
    { key: "defaultTableExpirationMs", type: "string", label: "Default table expiry (ms)" },
    { key: "creationTime", type: "string", label: "Created (ms since epoch)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);

    ctx.log("info", "getting a BigQuery dataset", { project, dataset });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}`,
    );
  },
};

export default action;
