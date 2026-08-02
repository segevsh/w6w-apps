import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-post.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("update-post: PUTs /posts/:id/ with updatedAt always present (collision guard)", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "1", title: "New" }] } }], { display });
  const result = await action.execute!(
    { postId: "1", updatedAt: "2026-01-01T00:00:00Z", title: "New" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/1/");
  assertEquals(JSON.parse(calls[0].body!), {
    posts: [{ updated_at: "2026-01-01T00:00:00Z", title: "New" }],
  });
  assertEquals(result, { id: "1", title: "New" });
});

Deno.test("update-post: sets ?source=html only when html is present", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "1" }] } }], { display });
  await action.execute!(
    { postId: "1", updatedAt: "2026-01-01T00:00:00Z", html: "<p>x</p>" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("source"), "html");
});
