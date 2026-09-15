import { assertEquals } from "@std/assert";
import tableViewsList from "../../actions/table-views-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-views-list: calls GET .../tables/{tableId}/views", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "view1", name: "Grid view" }]) }]);
  const out = await tableViewsList.execute({ databaseId: "db1", tableId: "tbl1" }, ctx) as {
    data: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/views");
  assertEquals(out.data.length, 1);
});
