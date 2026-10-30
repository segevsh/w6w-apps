import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/statement-get.ts";

test("statement-get: GETs /api/v2/statements/{handle} with the partition param", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{
    status: 200,
    body: { statementHandle: "h1", data: [] },
  }]);
  await action.execute({ statementHandle: "h1", partition: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/statements/h1");
  assertEquals(url.searchParams.get("partition"), "1");
  assertEquals(calls[0].method, "GET");
});

test('statement-get: status is "running" on 202', async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 202, body: { statementHandle: "h1" } }]);
  const out = await action.execute({ statementHandle: "h1" }, ctx);
  assertEquals(out.status, "running");
});

test("statement-get: falls back to the input handle if the body omits it", async () => {
  const { ctx } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ statementHandle: "h1" }, ctx);
  assertEquals(out.statementHandle, "h1");
});
