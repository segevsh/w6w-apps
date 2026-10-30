import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/database-list.ts";

test("database-list: runs bare SHOW DATABASES with no filter", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{
    status: 200,
    body: { resultSetMetaData: { rowType: [{ name: "name" }] }, data: [["ANALYTICS"]] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW DATABASES");
  assertEquals(out.rows, [{ name: "ANALYTICS" }]);
});

test("database-list: appends an escaped LIKE clause", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute({ like: "o'brien_%" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW DATABASES LIKE 'o''brien_%'");
});

test("database-list: passes role through when given", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute({ role: "SYSADMIN" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).role, "SYSADMIN");
});
