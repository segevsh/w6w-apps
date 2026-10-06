import { assertEquals } from "@std/assert";
import columnList from "../../actions/column-list.ts";
import { BASE_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("column-list: GETs /columns/ for a table", async () => {
  const { ctx, calls } = mockCtx([{ body: { columns: [{ key: "0000", name: "Name" }] } }]);
  const out = await columnList.execute({ tableName: "Table1" }, ctx) as { columns: unknown[] };
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/columns/`);
  assertEquals(queryOf(calls[0].url), { table_name: "Table1" });
  assertEquals(out.columns.length, 1);
});

Deno.test("column-list: a view name narrows the columns", async () => {
  const { ctx, calls } = mockCtx([{ body: { columns: [] } }]);
  await columnList.execute({ tableName: "T", viewName: "Open" }, ctx);
  assertEquals(queryOf(calls[0].url), { table_name: "T", view_name: "Open" });
});
