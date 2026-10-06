import { assertEquals } from "@std/assert";
import viewList from "../../actions/view-list.ts";
import { BASE_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("view-list: GETs /views/ for a table", async () => {
  const { ctx, calls } = mockCtx([{ body: { views: [{ _id: "0000", name: "Default View" }] } }]);
  const out = await viewList.execute({ tableName: "Table1" }, ctx) as { views: unknown[] };
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/views/`);
  assertEquals(queryOf(calls[0].url), { table_name: "Table1" });
  assertEquals(out.views.length, 1);
});
