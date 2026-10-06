import { assertEquals } from "@std/assert";
import tableDelete from "../../actions/table-delete.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-delete: DELETEs /tables/ with the table name in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await tableDelete.execute({ tableName: "Old" }, ctx) as { success: boolean };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/tables/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Old" });
  assertEquals(out.success, true);
});
