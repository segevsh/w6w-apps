import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-products.ts";

test("list-products: GETs /v2/sites/{id}/products with paging", async () => {
  const body = { items: [], pagination: { total: 0 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ siteId: "s1", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/sites/s1/products");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(result, body);
});
