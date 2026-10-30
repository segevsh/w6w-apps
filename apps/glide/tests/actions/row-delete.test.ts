import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rowDelete from "../../actions/row-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("row-delete: DELETEs by table and row id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowDelete.execute({ tableId: "t1", rowId: "r1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/tables/t1/rows/r1");
  assertEquals(calls[0].method, "DELETE");
});

test("row-delete: marked idempotent — deleting a missing row is not an error", () => {
  assertEquals(rowDelete.idempotent, true);
});
