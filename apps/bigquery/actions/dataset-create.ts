import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, json, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{projectId}/datasets` — verified against BigQuery's discovery
 * document (`datasets.insert`).
 *
 * **Location is immutable and cannot be changed later** — a dataset created in
 * `US` can never be moved to `EU`, and a query cannot join across locations. It
 * is the one field here worth getting right the first time, which is why it is
 * offered explicitly rather than left to BigQuery's default.
 */
const action: ActionDefinition = {
  key: "dataset-create",
  type: "perform",
  resource: "dataset",
  title: "Create a dataset",
  description: "Create a dataset in a project.",
  // BigQuery rejects a duplicate dataset id rather than deduping.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "datasetId",
      label: "Dataset ID",
      type: "string",
      required: true,
      default: "",
      hint: "Letters, numbers and underscores only.",
      validation: { pattern: "^[A-Za-z0-9_]+$" },
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      placeholder: "US",
      hint: "IMMUTABLE. A dataset cannot be moved between locations, and queries cannot join " +
        "across them.",
    },
    { key: "friendlyName", label: "Friendly Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "defaultTableExpirationMs",
      label: "Default Table Expiry (ms)",
      type: "string",
      default: "",
      hint: "New tables in this dataset are deleted after this long.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      default: "",
      placeholder: '{"team":"analytics"}',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Qualified ID" },
    { key: "datasetReference", type: "object", label: "Dataset reference" },
    { key: "location", type: "string", label: "Location" },
    { key: "creationTime", type: "string", label: "Created (ms since epoch)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const datasetId = String(p.datasetId ?? "").trim();
    if (!datasetId) throw new Error("`datasetId` is required");

    const body = compact({
      datasetReference: { projectId: project, datasetId },
      location: p.location,
      friendlyName: p.friendlyName,
      description: p.description,
      defaultTableExpirationMs: p.defaultTableExpirationMs,
      labels: json(p.labels, "labels"),
    });

    ctx.log("info", "creating a BigQuery dataset", { project, datasetId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets`,
      { method: "POST", body },
    );
  },
};

export default action;
