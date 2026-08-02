import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-post.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("create-post: POSTs /posts/ wrapping the body, with only the required title", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { posts: [{ id: "1" }] } }], { display });
  const result = await action.execute!({ title: "Hello" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/");
  assertEquals(JSON.parse(calls[0].body!), { posts: [{ title: "Hello" }] });
  assertEquals(result, { id: "1" });
});

Deno.test("create-post: maps optional fields, sets ?source=html only when html is present", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { posts: [{ id: "2" }] } }], { display });
  await action.execute!({
    title: "T",
    html: "<p>hi</p>",
    status: "published",
    publishedAt: "2026-01-01T00:00:00Z",
    tags: ["news", "updates"],
    featureImage: "https://example.com/img.png",
    excerpt: "short",
    visibility: "members",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("source"), "html");
  assertEquals(JSON.parse(calls[0].body!), {
    posts: [{
      title: "T",
      html: "<p>hi</p>",
      status: "published",
      published_at: "2026-01-01T00:00:00Z",
      tags: [{ name: "news" }, { name: "updates" }],
      feature_image: "https://example.com/img.png",
      custom_excerpt: "short",
      visibility: "members",
    }],
  });
});

Deno.test("create-post: omits ?source=html when no html is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { posts: [{ id: "3" }] } }], { display });
  await action.execute!({ title: "No body" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("source"), false);
});
