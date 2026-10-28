import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{p}/datasets/{d}/tables` — verified against BigQuery's
 * discovery document (`tables.list`).
 *
 * Note what this does **not** return: the list entries carry ids, types and
 * time-partitioning, but **not the schema**. `table-get` is what returns
 * columns.
 */
const action: ActionDefinition = {
  key: "table-list",
  type: "read",
  resource: "table",
  title: "List tables",
  description: "List the tables and views in a dataset.",
  params: [PROJECT_PARAM, DATASET_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing BigQuery tables", { project, dataset, returnAll, limit });

    return await new BigQueryClient(ctx).requestAll(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables`,
      "tables",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
