import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("file-delete: calls DELETE /file/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1" } }]);
  const out = await fileDelete.execute({ id: "f1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/file/f1");
  assertEquals(out, { id: "f1" });
});
