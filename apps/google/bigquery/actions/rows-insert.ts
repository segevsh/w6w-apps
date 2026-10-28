import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, compact, json, resolveDataset, resolveProject } from "../lib/client.ts";
import { DATASET_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{p}/datasets/{d}/tables/{t}/insertAll` — verified against
 * BigQuery's discovery document (`tabledata.insertAll`, request
 * `TableDataInsertAllRequest`).
 *
 * Streaming insert: rows land in the table in seconds without a load job. It is
 * the action that makes BigQuery a workflow destination rather than only a
 * source.
 *
 * **The response lies about success if you only check the status code.**
 * `insertAll` answers `200` even when individual rows were rejected, listing
 * them under `insertErrors` with their row index. So this action returns that
 * array and an explicit `insertedRows` count — a workflow that checks only for
 * an exception will silently drop bad rows.
 *
 * `insertId` is BigQuery's own de-duplication key: rows carrying the same
 * `insertId` within the de-dup window are inserted once. Supplying one is how a
 * retried step avoids double-writing, which is why this action is honest about
 * being idempotent **only** when they are present.
 */
const action: ActionDefinition = {
  key: "rows-insert",
  type: "perform",
  resource: "table",
  title: "Stream rows into a table",
  description: "Insert rows directly, without a load job.",
  // Only with insertIds; without them a retry duplicates, and the caller
  // controls that.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    DATASET_PARAM,
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"name":"ada","count":3}]',
      hint: "An array of plain objects, or of BigQuery's {insertId, json} form.",
    },
    {
      key: "useInvocationInsertId",
      label: "De-duplicate On Retry",
      type: "boolean",
      default: false,
      hint: "Derive an insertId per row from this step's invocation id, so a retry does not " +
        "double-write. Ignored for rows that already carry one.",
    },
    {
      key: "skipInvalidRows",
      label: "Skip Invalid Rows",
      type: "boolean",
      default: false,
      hint: "Insert the valid rows instead of failing the whole request.",
    },
    {
      key: "ignoreUnknownValues",
      label: "Ignore Unknown Fields",
      type: "boolean",
      default: false,
      hint: "Accept rows with fields the table's schema does not have.",
    },
    {
      key: "templateSuffix",
      label: "Template Suffix",
      type: "string",
      default: "",
      hint: "Append to the table name to insert into a template-derived table.",
    },
  ],
  output: [
    { key: "insertedRows", type: "number", label: "Rows accepted" },
    { key: "insertErrors", type: "array", label: "Per-row errors — CHECK THIS" },
    { key: "kind", type: "string", label: "Kind" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const dataset = resolveDataset(ctx.connection, p.datasetId);
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const parsed = json(p.rows, "rows");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("`rows` is required — a non-empty array");
    }

    // Accept either plain objects or BigQuery's own {insertId, json} envelope,
    // so a caller can mix hand-built rows with data from an upstream step.
    const invocation = ctx.invocation?.invocationId;
    const rows = parsed.map((row, i) => {
      const r = row as Record<string, unknown>;
      const wrapped = r && typeof r === "object" && "json" in r
        ? { insertId: r.insertId as string | undefined, json: r.json }
        : { insertId: undefined as string | undefined, json: r };
      if (!wrapped.insertId && p.useInvocationInsertId === true && invocation) {
        // Stable across retries of the same step, distinct per row.
        wrapped.insertId = `${invocation}:${i}`;
      }
      return compact(wrapped as unknown as Record<string, unknown>);
    });

    const body = compact({
      rows,
      skipInvalidRows: p.skipInvalidRows === true ? true : undefined,
      ignoreUnknownValues: p.ignoreUnknownValues === true ? true : undefined,
      templateSuffix: p.templateSuffix,
    });

    ctx.log("info", "streaming rows into BigQuery", {
      project,
      dataset,
      tableId,
      rows: rows.length,
    });

    const res = await new BigQueryClient(ctx).request<{
      insertErrors?: Array<{ index?: number }>;
    }>(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(dataset)}/tables/${
        encodeURIComponent(tableId)
      }/insertAll`,
      { method: "POST", body },
    );

    // A 200 with insertErrors is a partial failure, so the count is reported
    // rather than left for the caller to infer.
    const failed = res?.insertErrors?.length ?? 0;
    return { ...res, insertedRows: rows.length - failed };
  },
};

export default action;
