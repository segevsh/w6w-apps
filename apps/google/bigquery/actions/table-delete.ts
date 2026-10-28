import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /projects/{p}/datasets/{d}/tables/{t}` — verified against BigQuery's
 * discovery document (`tables.delete`).
 */
const action: ActionDefinition = {
  key: "table-delete",
  type: "perform",
  resource: "table",
  title: "Delete a table",
  description: "Delete a table and its data.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "tableId", type: "string", label: "Table ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    ctx.log("info", "deleting a BigQuery table", { project, dataset, tableId });

    await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables/${
        encodeURIComponent(tableId)
      }`,
      { method: "DELETE" },
    );
    return { tableId, deleted: true };
  },
};

export default action;
