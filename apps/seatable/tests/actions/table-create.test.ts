import { assertEquals } from "@std/assert";
import tableCreate from "../../actions/table-create.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-create: POSTs table_name only when no columns are given", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "abcd", name: "Orders", columns: [] } }]);
  const out = await tableCreate.execute({ tableName: "Orders" }, ctx) as { _id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/tables/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Orders" });
  assertEquals(out._id, "abcd");
});

Deno.test("table-create: columns are forwarded, from an array or JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const columns = [{ column_name: "Name", column_type: "text" }];
  await tableCreate.execute({ tableName: "T", columns }, ctx);
  await tableCreate.execute({ tableName: "T", columns: JSON.stringify(columns) }, ctx);
  assertEquals(bodyOf(calls[0]).columns, columns);
  assertEquals(bodyOf(calls[1]).columns, columns);
});
