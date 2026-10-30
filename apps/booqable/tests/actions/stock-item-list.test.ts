import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/stock-item-list.ts";

test("stock-item-list: GETs /stock_items with filter/include/sort/page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({ filter: JSON.stringify({ product_id: { eq: "p1" } }) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/stock_items");
  assertEquals(url.searchParams.get("filter[product_id][eq]"), "p1");
});
