import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/query-run.ts";

const D = { display: { host: "https://abc.clickhouse.cloud:8443", plane: "query" } };

const result = (rows: unknown[], readRows = "1000000") => ({
  status: 200,
  body: JSON.stringify({
    meta: [{ name: "n", type: "UInt64" }],
    data: rows,
    rows: rows.length,
  }),
  headers: {
    "content-type": "application/json",
    "x-clickhouse-summary": JSON.stringify({
      read_rows: readRows,
      read_bytes: "8000000",
      elapsed_ns: "1500000",
      memory_usage: "1147327",
    }),
    "x-clickhouse-query-id": "q-1",
  },
});

/** A real server-side guarantee, not a statement this app parsed. */
Deno.test("query-run: sends readonly=1 by default", async () => {
  const { ctx, calls } = mockCtx([result([{ n: "1" }])], D);
  await action.execute({ sql: "SELECT count() FROM events" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("readonly"), "1");
  assertEquals(calls[0].body, "SELECT count() FROM events");
});

Deno.test("query-run: allowing writes drops the readonly setting", async () => {
  const { ctx, calls } = mockCtx([result([])], D);
  await action.execute({ sql: "ALTER TABLE t DELETE WHERE 1", allowWrites: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("readonly"), null);
});

/** Fail rather than truncate, so a limit that is hit is visible. */
Deno.test("query-run: the row limit throws rather than truncating", async () => {
  const { ctx, calls } = mockCtx([result([])], D);
  await action.execute({ sql: "SELECT 1", maxRows: 500, timeoutSeconds: 30 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("max_result_rows"), "500");
  assertEquals(url.searchParams.get("result_overflow_mode"), "throw");
  assertEquals(url.searchParams.get("max_execution_time"), "30");
});

/** A value never has to be concatenated into SQL. */
Deno.test("query-run: named parameters become param_ settings", async () => {
  const { ctx, calls } = mockCtx([result([])], D);
  await action.execute({
    sql: "SELECT * FROM t WHERE day >= {since:Date}",
    parameters: '{"since":"2026-08-01"}',
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("param_since"), "2026-08-01");
});

/** meta carries the declared type, which is how a caller reads a UInt64. */
Deno.test("query-run: returns the columns with their ClickHouse types", async () => {
  const { ctx } = mockCtx([result([{ n: "18446744073709551615" }])], D);
  const out = await action.execute({ sql: "SELECT n FROM t" }, ctx) as Record<string, unknown>;
  assertEquals(out.columns, [{ name: "n", type: "UInt64" }]);
  assertEquals(out.rowCount, 1);
});

/**
 * Scanning a billion rows is normal; scanning a billion to return one is the
 * bug, and the result looks the same either way.
 */
Deno.test("query-run: returns what the query cost, and the scan ratio", async () => {
  const { ctx, logs } = mockCtx([result([{ n: "1" }], "1000000")], D);
  const out = await action.execute({ sql: "SELECT count() FROM t" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.rowsScanned, 1_000_000);
  assertEquals(out.bytesScanned, 8_000_000);
  assertEquals(out.elapsedMs, 1.5);
  assertEquals(out.memoryUsageBytes, 1_147_327);
  assertEquals(out.scanRatio, 1_000_000);
  assertEquals(logs[0].data, { rowCount: 1, rowsScanned: 1_000_000, elapsedMs: 1.5 });
});

Deno.test("query-run: an empty result has no scan ratio rather than a division by zero", async () => {
  const { ctx } = mockCtx([result([])], D);
  const out = await action.execute({ sql: "SELECT 1 WHERE 0" }, ctx) as Record<string, unknown>;
  assertEquals(out.rowCount, 0);
  assertEquals(out.scanRatio, undefined);
});

/** The SQL can carry values, and rows are the caller's data. */
Deno.test("query-run: logs counts only, never the SQL or the rows", async () => {
  const { ctx, logs } = mockCtx([result([{ n: "secret-value" }])], D);
  await action.execute({ sql: "SELECT secret FROM vault" }, ctx);
  const line = JSON.stringify(logs[0]);
  assertEquals(line.includes("secret-value"), false);
  assertEquals(line.includes("vault"), false);
});

/** Measured: UNKNOWN_TABLE maps onto 404. */
Deno.test("query-run: a typo'd table explains that the 404 is a SQL error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "Code: 60. DB::Exception: Unknown table expression identifier 'evnts'. (UNKNOWN_TABLE)",
    headers: { "x-clickhouse-exception-code": "60" },
  }], D);
  let message = "";
  try {
    await action.execute({ sql: "SELECT * FROM evnts" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/UNKNOWN_TABLE/.test(message), message);
  assert(/not a wrong URL/.test(message), message);
});

Deno.test("query-run: sql is required, and a control connection is refused", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`sql` is required/.test(message), message);
  assertEquals(calls.length, 0);

  const control = mockCtx([], { display: { organizationId: "org", plane: "control" } });
  let controlMessage = "";
  try {
    await action.execute({ sql: "SELECT 1" }, control.ctx);
  } catch (err) {
    controlMessage = String(err);
  }
  assert(/organisation API KEY connection/.test(controlMessage), controlMessage);
});
