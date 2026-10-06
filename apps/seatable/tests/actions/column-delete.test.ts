import { assertEquals } from "@std/assert";
import columnDelete from "../../actions/column-delete.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("column-delete: DELETEs /columns/ with table_name and column", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await columnDelete.execute({ tableName: "T", column: "Age" }, ctx) as {
    success: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/columns/`);
  assertEquals(bodyOf(calls[0]), { table_name: "T", column: "Age" });
  assertEquals(out.success, true);
});
