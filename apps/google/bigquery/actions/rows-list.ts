import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, csv, decodeRows, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{p}/datasets/{d}/tables/{t}/data` — verified against
 * BigQuery's discovery document (`tabledata.list`).
 *
 * Reading a table **without running a query**, which means **without being
 * billed for bytes scanned**. For "give me the last 100 rows of this table"
 * that is strictly better than `SELECT *`, and it is the distinction most
 * people miss.
 *
 * The trade-off is that it cannot filter, sort or join — it is a straight
 * scan from `startIndex`. Anything else needs `query-run`.
 *
 * The rows come back in BigQuery's positional `{f: [{v}]}` form against the
 * table's schema, so this fetches the schema and decodes them, same as
 * `query-run`.
 */
const action: ActionDefinition = {
  key: "rows-list",
  type: "read",
  resource: "table",
  title: "Read a table's rows",
  description: "Read rows straight from a table — no query, no bytes billed.",
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    { key: "maxResults", label: "Max Rows", type: "number", default: 1000 },
    {
      key: "startIndex",
      label: "Start Index",
      type: "string",
      default: "",
      hint: "Zero-based row offset.",
    },
    { key: "pageToken", label: "Page Token", type: "string", default: "" },
    {
      key: "selectedFields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated column names. Leave blank for all.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Decoded rows" },
    { key: "totalRows", type: "string", label: "Total rows in the table" },
    { key: "pageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const client = new BigQueryClient(ctx);
    const base = `/projects/${encodeURIComponent(project)}/datasets/${
      encodeURIComponent(dataset)
    }/tables/${encodeURIComponent(tableId)}`;

    ctx.log("info", "reading BigQuery table rows", { project, dataset, tableId });

    const data = await client.request<{ rows?: Array<{ f?: Array<{ v?: unknown }> }> }>(
      `${base}/data`,
      {
        query: {
          maxResults: typeof p.maxResults === "number" ? p.maxResults : undefined,
          startIndex: (p.startIndex as string) || undefined,
          pageToken: (p.pageToken as string) || undefined,
          selectedFields: csv(p.selectedFields)?.join(","),
        },
      },
    );

    // `tabledata.list` returns rows without a schema, so it is fetched
    // separately to decode them — one extra metadata call, and no bytes
    // scanned.
    const table = await client.request<{ schema?: { fields?: Array<{ name?: string }> } }>(base);
    const decoded = decodeRows(table?.schema, data?.rows);
    return decoded
      ? { ...data, rows: decoded, rawRows: data.rows, schema: table?.schema }
      : { ...data, schema: table?.schema };
  },
};

export default action;
