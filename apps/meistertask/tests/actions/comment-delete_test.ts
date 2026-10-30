import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentDelete from "../../actions/comment-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("comment-delete: DELETE /comments/:id returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await commentDelete.execute({ id: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/comments/2");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
