import { assertEquals } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/statement-execute.ts";

Deno.test("statement-execute: POSTs the statement with only the fields the caller set", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: { statementHandle: "h1" } }]);
  await action.execute({ statement: "SELECT 1", warehouse: "WH1" }, ctx);
  assertEquals(calls[0].url, "https://acme.snowflakecomputing.com/api/v2/statements");
  assertEquals(JSON.parse(calls[0].body!), { statement: "SELECT 1", warehouse: "WH1" });
});

Deno.test("statement-execute: ?async=true when runAsync is true", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 202, body: { statementHandle: "h1" } }]);
  const out = await action.execute({ statement: "SELECT 1", runAsync: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("async"), "true");
  assertEquals(out.status, "running");
  assertEquals(out.statementHandle, "h1");
});

Deno.test("statement-execute: parses a JSON-string bindings param and passes it through", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute(
    { statement: "SELECT ?", bindings: '{"1":{"type":"FIXED","value":"42"}}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).bindings, { "1": { type: "FIXED", value: "42" } });
});

Deno.test("statement-execute: reshapes data into rows using resultSetMetaData.rowType", async () => {
  const { ctx } = mockSnowflakeCtx([{
    status: 200,
    body: {
      statementHandle: "h1",
      resultSetMetaData: { rowType: [{ name: "N" }] },
      data: [["1"], ["2"]],
    },
  }]);
  const out = await action.execute({ statement: "SELECT * FROM t" }, ctx);
  assertEquals(out.rows, [{ N: "1" }, { N: "2" }]);
});
