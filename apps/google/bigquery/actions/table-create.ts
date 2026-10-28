import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, json, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{p}/datasets/{d}/tables` — verified against BigQuery's
 * discovery document (`tables.insert`).
 *
 * The schema is passed as JSON: it is a recursive structure (a RECORD field
 * has its own `fields`), and flattening it into form rows would make nested
 * schemas unreachable.
 *
 * `timePartitioning` is worth setting deliberately. On a large table it is the
 * difference between a query scanning one day and scanning everything — which
 * is what BigQuery bills for.
 */
const action: ActionDefinition = {
  key: "table-create",
  type: "perform",
  resource: "table",
  title: "Create a table",
  description: "Create a table with a schema, optionally partitioned.",
  // BigQuery rejects a duplicate table id rather than deduping.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "schema",
      label: "Schema Fields",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"name":"id","type":"STRING","mode":"REQUIRED"},' +
        '{"name":"created_at","type":"TIMESTAMP"}]',
      hint: "An array of field objects. A RECORD field carries its own nested `fields`.",
    },
    {
      key: "timePartitioning",
      label: "Time Partitioning",
      type: "json",
      default: "",
      placeholder: '{"type":"DAY","field":"created_at"}',
      hint: "Partitioning decides how much a query has to scan — and therefore what it costs.",
    },
    {
      key: "clustering",
      label: "Clustering",
      type: "json",
      default: "",
      placeholder: '{"fields":["customer_id"]}',
    },
    { key: "friendlyName", label: "Friendly Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "expirationTime",
      label: "Expiration Time (ms)",
      type: "string",
      default: "",
      hint: "Milliseconds since the epoch. The table is deleted then.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Qualified ID" },
    { key: "tableReference", type: "object", label: "Table reference" },
    { key: "schema", type: "object", label: "Schema as accepted" },
    { key: "creationTime", type: "string", label: "Created (ms since epoch)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const fields = json(p.schema, "schema");
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error("`schema` is required — a non-empty array of field objects");
    }

    const body = compact({
      tableReference: { projectId: project, datasetId: dataset, tableId },
      schema: { fields },
      timePartitioning: json(p.timePartitioning, "timePartitioning"),
      clustering: json(p.clustering, "clustering"),
      friendlyName: p.friendlyName,
      description: p.description,
      expirationTime: p.expirationTime,
    });

    ctx.log("info", "creating a BigQuery table", { project, dataset, tableId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables`,
      { method: "POST", body },
    );
  },
};

export default action;
