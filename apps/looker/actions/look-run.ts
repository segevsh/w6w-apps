import type { ActionDefinition } from "@w6w/types";
import { LookerClient, query } from "../lib/client.ts";

/**
 * `GET /api/4.0/looks/{id}/run/{format}` — run a saved Look.
 *
 * ## A Look is a saved query, and running it queries the warehouse now
 *
 * Not a stored result. The Look holds a model, an Explore, fields and filters;
 * running it compiles them to SQL and executes against the warehouse, exactly
 * as `query-run` does. The advantage is that somebody who understands the data
 * defined it, and a workflow does not have to know the field names.
 *
 * That is usually the right shape: **let an analyst own the query in Looker and
 * let the workflow run it by id**, rather than encoding field names in a
 * workflow where nobody will maintain them.
 *
 * ## The Look's own limit applies unless this one overrides it
 *
 * A Look saved with no row limit runs unbounded. Passing `limit` here caps it
 * regardless of what the Look says, which is the safe default for something a
 * workflow runs on a schedule — so this requires one.
 *
 * ## What the Look returns can change without the workflow changing
 *
 * Its definition lives in Looker and anyone with edit rights can alter the
 * fields, the filters or the model it points at. A workflow reading
 * `rows[0].total` is depending on a definition it does not control, and there
 * is no version pinning. The Look's `updated_at` is the only signal, and it is
 * returned.
 */
const action: ActionDefinition = {
  key: "look-run",
  type: "read",
  resource: "look",
  title: "Run a Look",
  description:
    "Run a saved Look — a saved QUERY, not a saved result, so this hits the warehouse now. Its " +
    "definition lives in Looker and can change without the workflow changing, so the Look's " +
    "`updated_at` comes back with the rows.",
  params: [
    {
      key: "lookId",
      label: "Look ID",
      type: "string",
      required: true,
      default: "",
      hint: "`look-list` reports them.",
    },
    {
      key: "limit",
      label: "Row Limit",
      type: "number",
      default: 500,
      hint: "Overrides whatever the Look was saved with — including no limit at all, which runs " +
        "unbounded.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "json_detail", label: "JSON detail — rows plus the SQL" },
        { value: "csv", label: "CSV" },
        { value: "txt", label: "Plain text" },
      ],
    },
    {
      key: "cache",
      label: "Allow cached results",
      type: "boolean",
      default: true,
    },
    {
      key: "applyFormatting",
      label: "Apply Looker formatting",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "rows", type: "array", label: "The result rows, for a JSON format" },
    { key: "rowCount", type: "number", label: "How many came back" },
    { key: "raw", type: "string", label: "The body verbatim, for CSV or text" },
    { key: "hitLimit", type: "boolean", label: "True when the row count equals the limit" },
    { key: "title", type: "string", label: "What the Look is called" },
    { key: "updatedAt", type: "string", label: "When its definition last changed" },
    { key: "sql", type: "string", label: "The SQL Looker generated — json_detail only" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const lookId = String(p.lookId ?? "").trim();
    if (!lookId) throw new Error("`lookId` is required");

    const limit = Number(p.limit ?? 500);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error(
        `\`limit\` must be a positive number of rows — got ${limit}. A Look saved without a ` +
          "limit runs unbounded against the warehouse, and this is what caps it",
      );
    }

    const format = String(p.format ?? "json");
    const isJson = format === "json" || format === "json_detail";
    const client = new LookerClient(ctx);

    // The definition can change under a workflow, and this is the only signal.
    const look = await client.request<{ title?: string; updated_at?: string }>(
      `/looks/${encodeURIComponent(lookId)}`,
      { query: { fields: "title,updated_at" } },
    );

    const result = await client.request<unknown>(
      `/looks/${encodeURIComponent(lookId)}/run/${encodeURIComponent(format)}`,
      {
        text: !isJson,
        query: query({
          limit: Math.trunc(limit),
          cache: p.cache !== false,
          apply_formatting: p.applyFormatting === true,
        }),
      },
    );

    let rows: unknown[] = [];
    let sql: string | undefined;
    if (format === "json" && Array.isArray(result)) {
      rows = result;
    } else if (format === "json_detail" && result && typeof result === "object") {
      const detail = result as { data?: unknown[]; sql?: string };
      rows = Array.isArray(detail.data) ? detail.data : [];
      sql = detail.sql;
    }

    // Counts only. The rows are business data.
    ctx.log("info", "ran a Looker Look", { lookId, rowCount: rows.length });

    return {
      rows,
      rowCount: rows.length,
      raw: isJson ? undefined : String(result ?? ""),
      hitLimit: rows.length === Math.trunc(limit),
      title: look?.title,
      updatedAt: look?.updated_at,
      sql,
    };
  },
};

export default action;
