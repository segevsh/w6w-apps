import { assertEquals, assertRejects } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import {
  accountFromConnection,
  compact,
  rowsAsObjects,
  SnowflakeApiError,
  SnowflakeClient,
  sqlStringLiteral,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x" }), { a: 1, e: "x" });
});

Deno.test("sqlStringLiteral: quotes and doubles embedded quotes", () => {
  assertEquals(sqlStringLiteral("ANALYTICS_%"), "'ANALYTICS_%'");
  assertEquals(sqlStringLiteral("o'brien"), "'o''brien'");
});

Deno.test("rowsAsObjects: zips rowType names with column-position data", () => {
  const rows = rowsAsObjects(
    { rowType: [{ name: "NAME" }, { name: "SIZE" }] },
    [["ANALYTICS", "X-SMALL"], ["RAW", "SMALL"]],
  );
  assertEquals(rows, [{ NAME: "ANALYTICS", SIZE: "X-SMALL" }, { NAME: "RAW", SIZE: "SMALL" }]);
});

Deno.test("rowsAsObjects: empty without rowType or data", () => {
  assertEquals(rowsAsObjects(undefined, undefined), []);
  assertEquals(rowsAsObjects({ rowType: [{ name: "A" }] }, undefined), []);
});

Deno.test("accountFromConnection: throws a clear message when the connection records no account", () => {
  let threw = false;
  try {
    accountFromConnection(
      { display: {} } as unknown as Parameters<typeof accountFromConnection>[0],
    );
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("reconnect"), true);
  }
  assertEquals(threw, true);
});

Deno.test("SnowflakeClient.submitStatement: POSTs the compacted body to /api/v2/statements", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: { statementHandle: "h1" } }]);
  const result = await new SnowflakeClient(ctx).submitStatement({
    statement: "SELECT 1",
    warehouse: "",
    database: undefined,
  });
  assertEquals(calls[0].url, "https://acme.snowflakecomputing.com/api/v2/statements");
  assertEquals(JSON.parse(calls[0].body!), { statement: "SELECT 1" });
  assertEquals(result.status, "complete");
});

Deno.test("SnowflakeClient.submitStatement: ?async=true when runAsync is set", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 202, body: { statementHandle: "h1" } }]);
  const result = await new SnowflakeClient(ctx).submitStatement(
    { statement: "SELECT 1" },
    { runAsync: true },
  );
  assertEquals(new URL(calls[0].url).searchParams.get("async"), "true");
  assertEquals(result.status, "running");
});

Deno.test("SnowflakeClient.submitStatement: throws SnowflakeApiError on a non-2xx/202 response", async () => {
  const { ctx } = mockSnowflakeCtx([
    { status: 422, body: { code: "100038", message: "SQL compilation error", sqlState: "42000" } },
  ]);
  const err = await assertRejects(
    () => new SnowflakeClient(ctx).submitStatement({ statement: "bogus" }),
    SnowflakeApiError,
  );
  assertEquals((err as SnowflakeApiError).httpStatus, 422);
  assertEquals((err as SnowflakeApiError).body?.code, "100038");
});

Deno.test('SnowflakeClient.getStatement: 429 counts as "running" (this endpoint\'s alternate code)', async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 429, body: { statementHandle: "h1" } }]);
  const result = await new SnowflakeClient(ctx).getStatement("h1", { partition: 2 });
  assertEquals(result.status, "running");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/statements/h1");
  assertEquals(new URL(calls[0].url).searchParams.get("partition"), "2");
});

Deno.test("SnowflakeClient.cancelStatement: POSTs /cancel and returns success/message", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: { success: true } }]);
  const result = await new SnowflakeClient(ctx).cancelStatement("h1");
  assertEquals(calls[0].url, "https://acme.snowflakecomputing.com/api/v2/statements/h1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.success, true);
});
