import type { ActionDefinition } from "@w6w/types";
import { QueryClient } from "../lib/query.ts";

/**
 * A table's columns, and — more usefully — its sorting key.
 *
 * ## The ORDER BY key is what decides whether a query is fast
 *
 * ClickHouse has no secondary indexes in the usual sense. A `MergeTree` table's
 * **sorting key** determines which queries can skip data and which have to read
 * everything. A filter on the leading column of the key reads a fraction of the
 * table; the same filter on a column that is not in the key reads all of it,
 * and produces exactly the same answer.
 *
 * That is the single most important fact about a ClickHouse table and it does
 * not appear in a column list, so this returns it alongside — and returns the
 * partition key too, which is the other thing that lets whole chunks be
 * skipped.
 *
 * ## `compression_ratio` per column is where the size actually is
 *
 * On a columnar store one badly-typed column can dominate a table's size — a
 * `String` holding what should be a `LowCardinality(String)` or an enum, most
 * often. Per-column compressed and uncompressed bytes make that visible, and
 * nothing else does.
 *
 * ## The types carry the nullability, and `Nullable` is not free
 *
 * A `Nullable(UInt64)` stores a separate null map and cannot be used in a
 * sorting key in the same way. The declared type string is returned verbatim
 * rather than being decomposed, because in ClickHouse the type *is* the
 * information.
 */
const action: ActionDefinition = {
  key: "table-describe",
  type: "read",
  resource: "table",
  title: "Describe a table",
  description:
    "A table's columns with per-column sizes, plus its SORTING KEY — which decides whether a " +
    "filter reads a fraction of the table or all of it, and which no column list shows.",
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      default: "",
      placeholder: "events",
    },
    {
      key: "database",
      label: "Database",
      type: "string",
      default: "default",
    },
  ],
  output: [
    { key: "columns", type: "array", label: "Each column with its type and size" },
    { key: "columnCount", type: "number", label: "How many" },
    { key: "sortingKey", type: "string", label: "What makes a filter fast — or not" },
    { key: "partitionKey", type: "string", label: "What lets whole partitions be skipped" },
    { key: "primaryKey", type: "string", label: "The primary key expression" },
    { key: "engine", type: "string", label: "The table engine" },
    { key: "totalRows", type: "number", label: "Rows in the table" },
    { key: "largestColumn", type: "string", label: "The column occupying the most disk" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const table = String(p.table ?? "").trim();
    if (!table) throw new Error("`table` is required");
    const database = String(p.database ?? "default").trim() || "default";

    const client = new QueryClient(ctx);
    const settings = {
      readonly: 1,
      max_execution_time: 30,
      param_db: database,
      param_tbl: table,
    };

    // The keys are on system.tables; the per-column sizes are on
    // system.columns. Neither has both.
    const meta = await client.run(
      `SELECT engine, sorting_key, partition_key, primary_key, total_rows
       FROM system.tables
       WHERE database = {db:String} AND name = {tbl:String}`,
      { settings },
    );
    const info = (meta.rows[0] ?? {}) as Record<string, unknown>;
    if (!meta.rows.length) {
      throw new Error(
        `no table \`${database}.${table}\` is visible to this user. ClickHouse would have ` +
          "answered a query against it with a 404, which is a SQL error rather than a wrong URL",
      );
    }

    const columns = await client.run(
      `SELECT name, type, data_compressed_bytes AS compressed,
              data_uncompressed_bytes AS uncompressed, is_in_sorting_key, is_in_partition_key
       FROM system.columns
       WHERE database = {db:String} AND table = {tbl:String}
       ORDER BY compressed DESC`,
      { settings },
    );

    const rows = columns.rows as Array<Record<string, unknown>>;
    const largest = rows[0];

    return {
      columns: rows,
      columnCount: rows.length,
      // The thing that decides whether a filter reads a fraction or the lot.
      sortingKey: info.sorting_key,
      partitionKey: info.partition_key,
      primaryKey: info.primary_key,
      engine: info.engine,
      totalRows: Number(info.total_rows ?? 0) || 0,
      largestColumn: largest ? String(largest.name ?? "") : undefined,
    };
  },
};

export default action;
