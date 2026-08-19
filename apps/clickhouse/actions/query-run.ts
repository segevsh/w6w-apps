import type { ActionDefinition } from "@w6w/types";
import { json } from "../lib/client.ts";
import { QueryClient } from "../lib/query.ts";

/**
 * Run SQL and get rows back — the thing no other `databases` app in this pack
 * can do.
 *
 * ## Read-only by default, enforced in SQL rather than in prose
 *
 * `readonly=1` is a ClickHouse **setting**, sent with the query, and the server
 * rejects anything that writes. That is a real guarantee: it does not depend on
 * this app parsing the statement correctly, which is the part that always goes
 * wrong. Turning it off is a parameter, and `query-insert` is the action for
 * writing.
 *
 * A `max_execution_time` and a `max_result_rows` go alongside for the same
 * reason — a workflow should not be the thing that discovers a query scans a
 * billion rows.
 *
 * ## Every number comes back as what ClickHouse declared it
 *
 * `meta` carries each column's ClickHouse type, which matters because a
 * `UInt64` arrives in JSON as a **string** — 64 bits do not fit a double, so
 * serialising it as a number would lose precision. Without the type a caller
 * cannot tell that string from a real one. Both are returned.
 *
 * ## The cost of the query is in the response, and is usually the point
 *
 * `X-ClickHouse-Summary` reports rows read, bytes read and memory used.
 * Scanning a billion rows is normal on a columnar database; scanning a billion
 * rows to answer something that should have touched a thousand is the bug, and
 * the result looks identical either way. So `rowsScanned` comes back with every
 * query, and a query that scanned far more than it returned is worth noticing.
 *
 * ## A 404 here is a typo, not a wrong URL
 *
 * Measured: ClickHouse maps `UNKNOWN_TABLE` and `UNKNOWN_IDENTIFIER` onto HTTP
 * 404, `SYNTAX_ERROR` onto 400 and `ACCESS_DENIED` onto 403. The client reads
 * `X-ClickHouse-Exception-Code` and says so.
 */
const action: ActionDefinition = {
  key: "query-run",
  type: "read",
  resource: "query",
  title: "Run a query",
  description:
    "Run SQL and return rows. READ-ONLY by default, enforced by ClickHouse's own `readonly` " +
    "setting rather than by parsing the statement. Returns what the query cost as well as what " +
    "it produced.",
  params: [
    {
      key: "sql",
      label: "SQL",
      type: "string",
      required: true,
      default: "",
      placeholder: "SELECT count() FROM events WHERE day >= today() - 7",
    },
    {
      key: "database",
      label: "Database",
      type: "string",
      default: "",
      hint: "Blank uses the connection's default.",
    },
    {
      key: "allowWrites",
      label: "Allow writes",
      type: "boolean",
      default: false,
      hint: "Off sends `readonly=1`, and ClickHouse itself refuses anything that writes — this " +
        "does not depend on this app understanding the statement.",
    },
    {
      key: "maxRows",
      label: "Maximum Rows",
      type: "number",
      default: 1000,
      hint: "Sent as `max_result_rows`; the query fails rather than truncating, so a limit that " +
        "is hit is visible.",
    },
    {
      key: "timeoutSeconds",
      label: "Timeout (seconds)",
      type: "number",
      default: 60,
      hint: "Sent as `max_execution_time`. ClickHouse stops the query server-side.",
    },
    {
      key: "parameters",
      label: "Query Parameters",
      type: "json",
      default: "",
      hint: 'Named parameters, e.g. {"since":"2026-08-01"}, referenced in SQL as ' +
        "`{since:String}`. This is how a value gets into a query without string-building it.",
    },
    {
      key: "settings",
      label: "Extra Settings",
      type: "json",
      default: "",
      advanced: true,
      hint: "Any other ClickHouse settings, passed through.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "The result rows" },
    { key: "rowCount", type: "number", label: "How many came back" },
    { key: "columns", type: "array", label: "Each column's name and ClickHouse type" },
    { key: "rowsScanned", type: "number", label: "Rows read to answer — the cost of the query" },
    { key: "bytesScanned", type: "number", label: "Bytes read" },
    { key: "elapsedMs", type: "number", label: "How long ClickHouse took" },
    { key: "memoryUsageBytes", type: "number", label: "Peak memory" },
    { key: "scanRatio", type: "number", label: "Rows scanned per row returned" },
    { key: "queryId", type: "string", label: "For correlating with system.query_log" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sql = String(p.sql ?? "").trim();
    if (!sql) throw new Error("`sql` is required");

    const settings: Record<string, string | number> = {};
    // A real server-side guarantee, not a statement parsed by this app.
    if (p.allowWrites !== true) settings["readonly"] = 1;

    const maxRows = Number(p.maxRows ?? 1000);
    if (Number.isFinite(maxRows) && maxRows > 0) {
      settings["max_result_rows"] = maxRows;
      // Fail rather than truncate, so a limit that is hit is visible.
      settings["result_overflow_mode"] = "throw";
    }
    const timeout = Number(p.timeoutSeconds ?? 60);
    if (Number.isFinite(timeout) && timeout > 0) settings["max_execution_time"] = timeout;

    // Named parameters, so a value never has to be concatenated into SQL.
    const parameters = json(p.parameters, "parameters") as Record<string, unknown> | undefined;
    for (const [name, value] of Object.entries(parameters ?? {})) {
      settings[`param_${name}`] = String(value);
    }

    const extra = json(p.settings, "settings") as Record<string, unknown> | undefined;
    for (const [name, value] of Object.entries(extra ?? {})) {
      settings[name] = String(value);
    }

    const result = await new QueryClient(ctx).run(sql, {
      database: String(p.database ?? "").trim() || undefined,
      settings,
    });

    const rowsScanned = result.summary.readRows ?? 0;
    const scanRatio = result.rowCount > 0 ? rowsScanned / result.rowCount : undefined;

    // Counts and cost. Never the SQL — it can carry values — and never rows.
    ctx.log("info", "ran a ClickHouse query", {
      rowCount: result.rowCount,
      rowsScanned,
      elapsedMs: result.summary.elapsedMs,
    });

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      columns: result.columns,
      rowsScanned,
      bytesScanned: result.summary.readBytes,
      elapsedMs: result.summary.elapsedMs,
      memoryUsageBytes: result.summary.memoryUsageBytes,
      // A big number here is a query touching far more than it needed to.
      scanRatio,
      queryId: result.queryId,
    };
  },
};

export default action;
