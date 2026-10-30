import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("tag-delete: DELETEs /api/tags/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await tagDelete.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/tags/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
