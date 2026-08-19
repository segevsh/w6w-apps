import type { ActionDefinition } from "@w6w/types";
import { json } from "../lib/client.ts";
import { QueryClient } from "../lib/query.ts";

/**
 * Insert rows — `INSERT INTO … FORMAT JSONEachRow` with the data as the body.
 *
 * ## Rows go in the body, not in the SQL
 *
 * ClickHouse's HTTP interface takes `INSERT INTO t FORMAT JSONEachRow` followed
 * by the rows themselves, one JSON object per line. So values never get
 * concatenated into a statement, and the whole class of quoting and injection
 * problems does not arise — which is a better reason to use this shape than the
 * performance one usually given for it.
 *
 * ## ClickHouse wants batches, and small inserts are the classic mistake
 *
 * Every insert creates a **part** on disk, which a background merge later
 * combines. Thousands of single-row inserts create thousands of parts, and a
 * service can hit `TOO_MANY_PARTS` and start refusing writes — from load that
 * a single batched insert would not have noticed.
 *
 * So this action takes an array and warns when it is given a very small one,
 * because the fix is upstream in the workflow rather than here.
 *
 * ## There are no transactions, and a failed insert may be half-applied
 *
 * ClickHouse has no transactional insert across parts. A batch that fails
 * partway can leave some rows written. `async_insert` with deduplication is the
 * usual answer for at-least-once pipelines, and this exposes it rather than
 * pretending the problem is absent.
 *
 * ## An insert returns no rows, and success is the absence of an error
 *
 * The written-row count comes from `X-ClickHouse-Summary`, not from a result
 * set.
 */
const action: ActionDefinition = {
  key: "query-insert",
  type: "perform",
  resource: "query",
  title: "Insert rows",
  description:
    "Insert rows into a table. The data goes in the request BODY rather than in the SQL, so " +
    "nothing is concatenated into a statement. ClickHouse wants BATCHES — many tiny inserts " +
    "create parts faster than merges remove them.",
  idempotent: false,
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      default: "",
      placeholder: "events",
      hint: "Optionally `database.table`.",
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      default: "",
      hint: "An array of objects, whose keys are column names. Sent as JSONEachRow — never " +
        "interpolated into SQL.",
    },
    {
      key: "database",
      label: "Database",
      type: "string",
      default: "",
    },
    {
      key: "asyncInsert",
      label: "Async Insert",
      type: "boolean",
      default: false,
      hint: "ClickHouse buffers small inserts server-side and flushes them in batches — the " +
        "supported answer to a workflow that cannot batch on its own side.",
    },
    {
      key: "deduplicate",
      label: "Deduplicate",
      type: "boolean",
      default: true,
      showIf: { "==": [{ var: "asyncInsert" }, true] },
      hint: "With async inserts, drops an identical block that arrives twice — which is what " +
        "makes a retry safe.",
    },
    {
      key: "settings",
      label: "Extra Settings",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "inserted", type: "boolean", label: "Whether the insert was accepted" },
    { key: "rowsSent", type: "number", label: "Rows this call submitted" },
    { key: "rowsWritten", type: "number", label: "Rows ClickHouse reported writing" },
    { key: "bytesWritten", type: "number", label: "Bytes written" },
    { key: "elapsedMs", type: "number", label: "How long it took" },
    { key: "queryId", type: "string", label: "For correlating with system.query_log" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const table = String(p.table ?? "").trim();
    if (!table) throw new Error("`table` is required");
    if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(table)) {
      throw new Error(
        `\`table\` must be an identifier, optionally qualified — got "${table}". It is the one ` +
          "part of this action that goes into the SQL, so it is checked rather than quoted",
      );
    }

    const rows = json(p.rows, "rows");
    if (!Array.isArray(rows)) throw new Error("`rows` must be an array of objects");
    if (!rows.length) throw new Error("`rows` is empty — there is nothing to insert");

    const asyncInsert = p.asyncInsert === true;
    const settings: Record<string, string | number> = {};
    if (asyncInsert) {
      settings["async_insert"] = 1;
      // What makes a retry safe rather than duplicating.
      settings["async_insert_deduplicate"] = p.deduplicate === false ? 0 : 1;
    }
    const extra = json(p.settings, "settings") as Record<string, unknown> | undefined;
    for (const [name, value] of Object.entries(extra ?? {})) settings[name] = String(value);

    // Many small inserts create parts faster than merges remove them.
    if (rows.length < 10 && !asyncInsert) {
      ctx.log(
        "warn",
        "inserting very few rows without async inserts — ClickHouse creates a part per insert, " +
          "and a workflow doing this in a loop can reach TOO_MANY_PARTS and be refused writes",
        { rowsSent: rows.length },
      );
    }

    // The rows are the body; nothing is interpolated into the statement.
    const body = `INSERT INTO ${table} FORMAT JSONEachRow\n` +
      rows.map((row) => JSON.stringify(row)).join("\n");

    const result = await new QueryClient(ctx).run(body, {
      database: String(p.database ?? "").trim() || undefined,
      settings,
      // An insert produces no result set.
      raw: true,
    });

    // Counts only — the rows are the caller's data.
    ctx.log("info", "inserted rows into ClickHouse", {
      rowsSent: rows.length,
      rowsWritten: result.summary.writtenRows,
    });

    return {
      inserted: true,
      rowsSent: rows.length,
      rowsWritten: result.summary.writtenRows,
      bytesWritten: result.summary.writtenBytes,
      elapsedMs: result.summary.elapsedMs,
      queryId: result.queryId,
    };
  },
};

export default action;
