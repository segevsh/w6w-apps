import { assertEquals } from "@std/assert";
import { mockSnowflakeCtx } from "../_helpers.ts";
import action from "../../actions/warehouse-list.ts";

Deno.test("warehouse-list: runs bare SHOW WAREHOUSES with no filter", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{
    status: 200,
    body: { resultSetMetaData: { rowType: [{ name: "name" }] }, data: [["ETL_WH"]] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW WAREHOUSES");
  assertEquals(out.rows, [{ name: "ETL_WH" }]);
});

Deno.test("warehouse-list: appends an escaped LIKE clause", async () => {
  const { ctx, calls } = mockSnowflakeCtx([{ status: 200, body: {} }]);
  await action.execute({ like: "ETL_%" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).statement, "SHOW WAREHOUSES LIKE 'ETL_%'");
});
