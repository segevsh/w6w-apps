import type { ActionDefinition } from "@w6w/types";
import { QueryClient } from "../lib/query.ts";

/**
 * What tables exist, and what they cost — from `system.tables` and
 * `system.parts`.
 *
 * ## The engine decides what a table is
 *
 * A ClickHouse "table" may be a `MergeTree` holding data, a `Distributed` view
 * over a cluster, a `MaterializedView` that writes on insert, a `Dictionary`,
 * or a `Kafka` engine consuming a topic. They behave completely differently and
 * a plain listing does not distinguish them, so this returns the engine and
 * counts the ones that actually hold rows.
 *
 * ## Parts are the number that predicts trouble
 *
 * Every insert writes a part and background merges combine them. A table with
 * thousands of parts is one where inserts have outrun merges, and it is the
 * leading indicator of a service that will start refusing writes with
 * `TOO_MANY_PARTS`. Nothing else in the API surfaces it.
 *
 * ## Compression is the reason the numbers look wrong
 *
 * `bytes_on_disk` against uncompressed size routinely differs by ten times or
 * more. A table that "should" be 100 GB occupying 8 GB is normal and not an
 * error, and both figures come back so the ratio is visible rather than
 * surprising.
 */
const action: ActionDefinition = {
  key: "table-list",
  type: "search",
  resource: "table",
  title: "List tables",
  description:
    "Tables with their engines, row counts, disk size and PART COUNT — the number that predicts " +
    "a service refusing writes with TOO_MANY_PARTS, and which nothing else surfaces.",
  params: [
    {
      key: "database",
      label: "Database",
      type: "string",
      default: "default",
      hint: "Blank lists every database the user can see, system tables excluded.",
    },
    {
      key: "includeSystem",
      label: "Include system databases",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "tables", type: "array", label: "The tables" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "totalRows", type: "number", label: "Rows across them" },
    { key: "totalBytes", type: "number", label: "Bytes on disk, compressed" },
    { key: "engines", type: "array", label: "The distinct engines in use" },
    { key: "highPartTables", type: "array", label: "Tables with more than 300 parts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const database = String(p.database ?? "").trim();

    const filters: string[] = [];
    if (database) filters.push("database = {db:String}");
    else if (p.includeSystem !== true) {
      filters.push("database NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema')");
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // system.parts is where the part count lives; system.tables alone does not
    // have it.
    const sql = `
      SELECT
        t.database AS database,
        t.name AS name,
        t.engine AS engine,
        t.total_rows AS rows,
        t.total_bytes AS bytes,
        countIf(p.active) AS parts
      FROM system.tables AS t
      LEFT JOIN system.parts AS p
        ON p.database = t.database AND p.table = t.name
      ${where}
      GROUP BY database, name, engine, rows, bytes
      ORDER BY bytes DESC
      LIMIT 500
    `;

    const result = await new QueryClient(ctx).run(sql, {
      settings: {
        readonly: 1,
        max_execution_time: 30,
        ...(database ? { param_db: database } : {}),
      },
    });

    const tables = result.rows as Array<Record<string, unknown>>;
    const num = (value: unknown) => Number(value ?? 0) || 0;
    // Inserts outrunning merges is what this number means.
    const highPartTables = tables
      .filter((table) => num(table.parts) > 300)
      .map((table) => `${table.database}.${table.name}`);

    if (highPartTables.length) {
      ctx.log(
        "warn",
        "some ClickHouse tables have a high active part count — inserts are outrunning merges, " +
          "which ends in TOO_MANY_PARTS",
        { count: highPartTables.length },
      );
    }

    return {
      tables,
      count: tables.length,
      names: tables.map((table) => `${table.database}.${table.name}`),
      totalRows: tables.reduce((sum, table) => sum + num(table.rows), 0),
      totalBytes: tables.reduce((sum, table) => sum + num(table.bytes), 0),
      engines: [...new Set(tables.map((table) => String(table.engine ?? "")))].filter(Boolean)
        .sort(),
      highPartTables,
    };
  },
};

export default action;
