import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-post.ts";

test("get-post: GETs /posts/{id}", async () => {
  const body = { data: { id: "p1", type: "post", attributes: { title: "Hello" } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ postId: "p1", include: "campaign" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/posts/p1");
  assertEquals(url.searchParams.get("include"), "campaign");
  assertEquals(out, body);
});
