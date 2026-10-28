import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{p}/datasets/{d}/tables/{t}` — verified against BigQuery's
 * discovery document (`tables.get`).
 *
 * This is where the **schema** lives — `table-list` does not return it. It also
 * carries `numRows` and `numBytes`, which is how a workflow sizes a table
 * before deciding whether to query it.
 */
const action: ActionDefinition = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get a table",
  description: "Retrieve a table's schema, size and partitioning.",
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Qualified ID" },
    { key: "tableReference", type: "object", label: "Table reference" },
    { key: "schema", type: "object", label: "Schema" },
    { key: "numRows", type: "string", label: "Row count" },
    { key: "numBytes", type: "string", label: "Size in bytes" },
    { key: "type", type: "string", label: "TABLE, VIEW or EXTERNAL" },
    { key: "timePartitioning", type: "object", label: "Time partitioning" },
    { key: "clustering", type: "object", label: "Clustering" },
    { key: "creationTime", type: "string", label: "Created (ms since epoch)" },
    { key: "lastModifiedTime", type: "string", label: "Last modified (ms since epoch)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    ctx.log("info", "getting a BigQuery table", { project, dataset, tableId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables/${
        encodeURIComponent(tableId)
      }`,
    );
  },
};

export default action;
