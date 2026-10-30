import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-category.ts";

test("get-category: GETs /categories/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "103" } }]);
  await action.execute!({ categoryId: "103" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/categories/103/");
});
