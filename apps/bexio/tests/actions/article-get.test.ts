import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-get.ts";

Deno.test("article-get: GETs /2.0/article/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, intern_name: "Consulting" } }]);
  const result = await action.execute!({ articleId: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/article/2");
  assertEquals(result, { id: 2, intern_name: "Consulting" });
});
