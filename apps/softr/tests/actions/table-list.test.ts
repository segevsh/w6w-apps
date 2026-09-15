import { assertEquals } from "@std/assert";
import tableList from "../../actions/table-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-list: calls GET /databases/{databaseId}/tables", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "tbl1", name: "Contacts" }]) }]);
  const out = await tableList.execute({ databaseId: "db1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables");
  assertEquals(out.data.length, 1);
});
