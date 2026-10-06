import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-get.ts";

Deno.test("article-get: GET /3/articles/{articleNumber} with its query", async () => {
  const reply = { "Article": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "articleNumber": "articleNumber-v" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/articles/articleNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
