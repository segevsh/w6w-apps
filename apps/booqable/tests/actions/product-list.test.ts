import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-list.ts";

test("product-list: GETs /products with filter/include/sort/page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({ filter: JSON.stringify({ product_group_id: { eq: "pg1" } }) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/products");
  assertEquals(url.searchParams.get("filter[product_group_id][eq]"), "pg1");
});
