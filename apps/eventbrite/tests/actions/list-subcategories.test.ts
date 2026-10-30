import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subcategories.ts";

test("list-subcategories: GETs /subcategories/ with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { subcategories: [] } }]);
  await action.execute!({ page: 2, continuation: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/subcategories/");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("continuation"), "tok");
});
