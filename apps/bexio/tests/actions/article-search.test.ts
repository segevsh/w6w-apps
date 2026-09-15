import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-search.ts";

Deno.test("article-search: POSTs an array-of-criteria body to /2.0/article/search", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await action.execute!({ field: "intern_code", value: "wh-2019", criteria: "=" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/article/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, [{ field: "intern_code", value: "wh-2019", criteria: "=" }]);
});
