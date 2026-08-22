import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, json, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /projects/{p}/datasets/{d}/tables/{t}` — verified against BigQuery's
 * discovery document (`tables.patch`).
 *
 * PATCH rather than `tables.update` (a PUT), because the PUT **replaces** the
 * table resource: fields left out are cleared, which is a good way to lose a
 * description or a partitioning setting by omission.
 *
 * **Schema changes are additive only.** BigQuery accepts new columns and
 * relaxing REQUIRED to NULLABLE; it refuses to drop a column or narrow a type
 * through this endpoint. A supplied schema must therefore be the *whole*
 * intended schema, not just the new fields — so the hint says so.
 */
const action: ActionDefinition = {
  key: "table-update",
  type: "perform",
  resource: "table",
  title: "Update a table",
  description: "Change a table's description, expiry or schema (additively).",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    { key: "friendlyName", label: "Friendly Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "schema",
      label: "Schema Fields",
      type: "json",
      default: "",
      hint: "The FULL intended schema. BigQuery only allows additions and REQUIRED→NULLABLE " +
        "relaxations here — it will not drop or narrow a column.",
    },
    { key: "expirationTime", label: "Expiration Time (ms)", type: "string", default: "" },
    { key: "labels", label: "Labels", type: "json", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Qualified ID" },
    { key: "schema", type: "object", label: "Schema as accepted" },
    { key: "lastModifiedTime", type: "string", label: "Last modified (ms since epoch)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const fields = json(p.schema, "schema");
    if (fields !== undefined && !Array.isArray(fields)) {
      throw new Error("`schema` must be an array of field objects");
    }

    const body = compact({
      friendlyName: p.friendlyName,
      description: p.description,
      schema: fields ? { fields } : undefined,
      expirationTime: p.expirationTime,
      labels: json(p.labels, "labels"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating a BigQuery table", { project, dataset, tableId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables/${
        encodeURIComponent(tableId)
      }`,
      { method: "PATCH", body },
    );
  },
};

export default action;
