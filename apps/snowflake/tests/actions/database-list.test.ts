import { assertEquals } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/database-list.ts";

Deno.test("database-list: runs bare SHOW DATABASES with no filter", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{
    status: 200,
    body: { resultSetMetaData: { rowType: [{ name: "name" }] }, data: [["ANALYTICS"]] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW DATABASES");
  assertEquals(out.rows, [{ name: "ANALYTICS" }]);
});

Deno.test("database-list: appends an escaped LIKE clause", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute({ like: "o'brien_%" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW DATABASES LIKE 'o''brien_%'");
});

Deno.test("database-list: passes role through when given", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute({ role: "SYSADMIN" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).role, "SYSADMIN");
});
