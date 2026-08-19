import type { ActionDefinition } from "@w6w/types";
import { assertQualifiedFields, compact, csv, json, LookerClient, query } from "../lib/client.ts";

/**
 * `POST /api/4.0/queries/run/{format}` — run an ad-hoc query against the
 * modelled data.
 *
 * ## This compiles to SQL and runs on the warehouse
 *
 * Looker holds no data. This turns a model, an Explore and a field list into
 * SQL and executes it against BigQuery, Snowflake, Redshift or whatever is
 * underneath — so the latency is the warehouse's, and so is the bill. On a
 * usage-priced warehouse an unbounded query from a workflow is a real cost, and
 * nothing in the response says what it cost.
 *
 * ## `-1` means unlimited, and Looker's own documentation says so
 *
 * `Query.limit` is a **string**, and the spec's own words are: "To download
 * unlimited results, set the limit to -1 (negative one)." That is a scan of the
 * whole Explore with no ceiling. So this action requires a positive limit,
 * refuses `-1` outright, and says why — the escape hatch exists in Looker and
 * does not need to exist in a workflow.
 *
 * ## `view` is the Explore name, not a LookML view
 *
 * Looker's spec documents `Query.view` as "Explore Name". The API's word and
 * the interface's word disagree, and somebody reading the LookML fills in the
 * wrong one — producing a 404 for an Explore that does not exist.
 *
 * ## Fields are always `view_name.field_name`
 *
 * `orders.count`, never `count`. A bare name is rejected with a message naming
 * the field, which reads as though the field is missing rather than as though
 * the reference is malformed — so this checks the form first.
 *
 * ## `cache` decides whether this touches the warehouse at all
 *
 * Left on, Looker may answer from its cache and the query costs nothing. Turned
 * off, every run is a fresh warehouse query. For a scheduled workflow that is
 * the difference between one query a day and one every run.
 */
const action: ActionDefinition = {
  key: "query-run",
  type: "read",
  resource: "query",
  title: "Run a query",
  description:
    "Run an ad-hoc query against a model and Explore. It compiles to SQL and runs on the " +
    "WAREHOUSE, so the cost is somebody else's budget — a positive `limit` is required and " +
    "Looker's unlimited `-1` is refused.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      hint: "The LookML model — `model-list` reports them.",
    },
    {
      key: "explore",
      label: "Explore",
      type: "string",
      required: true,
      default: "",
      hint: "The Explore name. Looker's API calls this `view`, which is NOT the LookML view — " +
        "taking the view name from the LookML gives a 404.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      required: true,
      default: "",
      placeholder: "orders.count, users.created_month",
      hint: "Comma-separated, each qualified as `view_name.field_name`. A bare name is rejected " +
        "with a message that reads as a missing field.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      default: "",
      hint: 'e.g. {"orders.created_date":"last 7 days"} — Looker filter expressions, keyed by ' +
        "qualified field name.",
    },
    {
      key: "sorts",
      label: "Sorts",
      type: "string",
      default: "",
      placeholder: "orders.count desc",
    },
    {
      key: "limit",
      label: "Row Limit",
      type: "number",
      default: 500,
      hint: "Must be positive. Looker accepts -1 for unlimited; this does not, because an " +
        "unbounded scan from a workflow is a warehouse bill nobody chose.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON — rows keyed by field name" },
        { value: "json_detail", label: "JSON detail — rows plus the SQL and metadata" },
        { value: "csv", label: "CSV" },
        { value: "txt", label: "Plain text" },
      ],
    },
    {
      key: "cache",
      label: "Allow cached results",
      type: "boolean",
      default: true,
      hint: "On, Looker may answer without touching the warehouse. Off, every run is a fresh " +
        "query — for a scheduled workflow that is the whole difference in cost.",
    },
    {
      key: "applyFormatting",
      label: "Apply Looker formatting",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "On, numbers come back as display strings like `$1,234.00` rather than as numbers.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "The result rows, for a JSON format" },
    { key: "rowCount", type: "number", label: "How many came back" },
    { key: "raw", type: "string", label: "The body verbatim, for CSV or text" },
    { key: "hitLimit", type: "boolean", label: "True when the row count equals the limit" },
    { key: "sql", type: "string", label: "The SQL Looker generated — json_detail only" },
    { key: "format", type: "string", label: "What was requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = String(p.model ?? "").trim();
    const explore = String(p.explore ?? "").trim();
    if (!model) throw new Error("`model` is required");
    if (!explore) {
      throw new Error(
        "`explore` is required — this is the Explore name, which Looker's API calls `view` and " +
          "which is not the LookML view of the same data",
      );
    }

    const fields = csv(p.fields);
    if (!fields?.length) throw new Error("`fields` must name at least one field");
    assertQualifiedFields(fields, "fields");

    const limit = Number(p.limit ?? 500);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error(
        `\`limit\` must be a positive number of rows — got ${limit}. Looker accepts -1 for ` +
          "unlimited, which is a scan of the whole Explore with no ceiling; that escape hatch " +
          "exists in Looker and does not need to exist in a workflow",
      );
    }

    const format = String(p.format ?? "json");
    const body = compact({
      model,
      // Looker's spec documents this field as the Explore name.
      view: explore,
      fields,
      filters: json(p.filters, "filters"),
      sorts: csv(p.sorts),
      limit: String(Math.trunc(limit)),
    });

    const client = new LookerClient(ctx);
    const isJson = format === "json" || format === "json_detail";
    const result = await client.request<unknown>(`/queries/run/${encodeURIComponent(format)}`, {
      method: "POST",
      text: !isJson,
      query: query({
        limit: Math.trunc(limit),
        cache: p.cache !== false,
        apply_formatting: p.applyFormatting === true,
      }),
      body,
    });

    let rows: unknown[] = [];
    let sql: string | undefined;
    if (format === "json" && Array.isArray(result)) {
      rows = result;
    } else if (format === "json_detail" && result && typeof result === "object") {
      const detail = result as { data?: unknown[]; sql?: string };
      rows = Array.isArray(detail.data) ? detail.data : [];
      // Only json_detail carries the generated SQL.
      sql = detail.sql;
    }

    // Counts only. The rows are the caller's data, and this is business data.
    ctx.log("info", "ran a Looker query", { model, explore, rowCount: rows.length });

    return {
      rows,
      rowCount: rows.length,
      raw: isJson ? undefined : String(result ?? ""),
      // Worth knowing: a result exactly at the limit is probably truncated.
      hitLimit: rows.length === Math.trunc(limit),
      sql,
      format,
    };
  },
};

export default action;
