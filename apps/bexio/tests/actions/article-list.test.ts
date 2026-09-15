import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-list.ts";

Deno.test("article-list: GETs /2.0/article with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, intern_name: "Webhosting" }] }]);
  const result = await action.execute!({ orderBy: "intern_name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/article");
  assertEquals(url.searchParams.get("order_by"), "intern_name");
  assertEquals(result, [{ id: 1, intern_name: "Webhosting" }]);
});
