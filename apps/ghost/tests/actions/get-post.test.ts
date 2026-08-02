import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-post.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("get-post: GETs /posts/:id/ (trailing slash)", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "42", title: "Hi" }] } }], { display });
  const result = await action.execute({ postId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/42/");
  assertEquals(result, { id: "42", title: "Hi" });
});

Deno.test("get-post: builds include from includeTags/includeAuthors", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "1" }] } }], { display });
  await action.execute({ postId: "1", includeTags: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "tags");
});
