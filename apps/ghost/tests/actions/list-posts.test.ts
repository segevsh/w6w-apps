import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-posts.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("list-posts: GETs /posts/ with default paging and no include", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "1" }], meta: {} } }], { display });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/ghost/api/admin/posts/");
  assertEquals(url.searchParams.get("limit"), "15");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.has("include"), false);
  assertEquals(result.items, [{ id: "1" }]);
});

Deno.test("list-posts: forwards filter/order/paging and builds include from booleans", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [] } }], { display });
  await action.execute({
    filter: "status:draft",
    order: "title asc",
    limit: 5,
    page: 2,
    includeTags: true,
    includeAuthors: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), "status:draft");
  assertEquals(url.searchParams.get("order"), "title asc");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("include"), "tags,authors");
});
