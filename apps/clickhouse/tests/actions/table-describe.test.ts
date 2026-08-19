import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-describe.ts";

const D = { display: { host: "https://abc.clickhouse.cloud:8443", plane: "query" } };

const result = (rows: unknown[]) => ({
  status: 200,
  body: JSON.stringify({ meta: [], data: rows, rows: rows.length }),
  headers: { "content-type": "application/json", "x-clickhouse-summary": "{}" },
});

const meta = result([{
  engine: "MergeTree",
  sorting_key: "day, user_id",
  partition_key: "toYYYYMM(day)",
  primary_key: "day, user_id",
  total_rows: 5_000_000,
}]);

const columns = result([
  { name: "payload", type: "String", compressed: 900_000, uncompressed: 9_000_000 },
  { name: "day", type: "Date", compressed: 1_000, uncompressed: 10_000 },
]);

/** The sorting key is what decides whether a filter is fast. */
Deno.test("table-describe: returns the sorting and partition keys alongside the columns", async () => {
  const { ctx, calls } = mockCtx([meta, columns], D);
  const out = await action.execute(
    { database: "default", table: "events" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 2, "keys and per-column sizes live on different tables");
  assertEquals(out.sortingKey, "day, user_id");
  assertEquals(out.partitionKey, "toYYYYMM(day)");
  assertEquals(out.engine, "MergeTree");
  assertEquals(out.totalRows, 5_000_000);
  assert(/SORTING KEY/.test(action.description!), action.description);
});

/** One badly-typed column can dominate a table's size. */
Deno.test("table-describe: orders columns by size and names the largest", async () => {
  const { ctx } = mockCtx([meta, columns], D);
  const out = await action.execute(
    { database: "default", table: "events" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.largestColumn, "payload");
  assertEquals(out.columnCount, 2);
});

/** The type string is the information, so it is returned verbatim. */
Deno.test("table-describe: keeps the declared type strings", async () => {
  const { ctx } = mockCtx([meta, result([{ name: "x", type: "Nullable(UInt64)" }])], D);
  const out = await action.execute(
    { database: "default", table: "events" },
    ctx,
  ) as Record<string, unknown>;
  const cols = out.columns as Array<Record<string, unknown>>;
  assertEquals(cols[0].type, "Nullable(UInt64)");
});

Deno.test("table-describe: the table name is passed as a query parameter, not interpolated", async () => {
  const { ctx, calls } = mockCtx([meta, columns], D);
  await action.execute({ database: "analytics", table: "events" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("param_db"), "analytics");
  assertEquals(url.searchParams.get("param_tbl"), "events");
  assertEquals(/events/.test(calls[0].body!), false, "the name is not in the SQL");
});

/** A missing table would otherwise be a 404 that reads as a wrong URL. */
Deno.test("table-describe: a table the user cannot see explains itself", async () => {
  const { ctx, calls } = mockCtx([result([])], D);
  let message = "";
  try {
    await action.execute({ database: "default", table: "nope" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/no table `default\.nope` is visible/.test(message), message);
  assert(/a SQL error rather than a wrong URL/.test(message), message);
  assertEquals(calls.length, 1, "the column query was not run");
});

Deno.test("table-describe: a table name is required", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`table` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
