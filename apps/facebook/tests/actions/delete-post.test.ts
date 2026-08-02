import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-post.ts";

Deno.test("delete-post: DELETEs /{postId} and reports deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute!({ postId: "post-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v23.0/post-1");
  assertEquals(result, { deleted: true });
});

Deno.test("delete-post: declares idempotent: false", () => {
  assertEquals(action.idempotent, false);
});
