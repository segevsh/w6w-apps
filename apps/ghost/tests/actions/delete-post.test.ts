import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-post.ts";

const display = { siteUrl: "https://example.com" };

test("delete-post: DELETEs /posts/:id/ and reports deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ postId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/1/");
  assertEquals(result, { id: "1", deleted: true });
});
