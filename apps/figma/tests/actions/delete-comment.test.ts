import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-comment.ts";

test("delete-comment: DELETEs /v1/files/{key}/comments/{commentId} and normalizes 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute({ fileKey: "abc123", commentId: "c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/files/abc123/comments/c1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
