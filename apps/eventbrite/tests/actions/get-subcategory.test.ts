import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-subcategory.ts";

test("get-subcategory: GETs /subcategories/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ subcategoryId: "3003" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/subcategories/3003/");
});
