import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tableRename from "../../actions/table-rename.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("table-rename: PUTs table_name and new_table_name to /tables/", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await tableRename.execute({ tableName: "Old", newTableName: "New" }, ctx) as {
    success: boolean;
  };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/tables/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Old", new_table_name: "New" });
  assertEquals(out.success, true);
});

test("table-rename: is not declared idempotent (the old name is gone after one call)", () => {
  assertEquals(tableRename.idempotent, false);
});
