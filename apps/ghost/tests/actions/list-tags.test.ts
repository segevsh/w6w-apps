import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tags.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("list-tags: GETs /tags/ with default paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [{ id: "1", name: "news" }] } }], { display });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/ghost/api/admin/tags/");
  assertEquals(url.searchParams.get("limit"), "15");
  assertEquals(result.items, [{ id: "1", name: "news" }]);
});

Deno.test("list-tags: forwards an explicit order", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [] } }], { display });
  await action.execute({ order: "count.posts desc" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("order"), "count.posts desc");
});
