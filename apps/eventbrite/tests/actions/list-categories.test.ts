import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-categories.ts";

Deno.test("list-categories: GETs /categories/ with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  await action.execute!({ page: 2, continuation: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/categories/");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("continuation"), "tok");
});
