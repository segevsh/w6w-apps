import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-get.ts";

test("product-get: GETs /products/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "p1" } } }]);
  await action.execute({ productId: "p1", include: "product_group" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/products/p1");
  assertEquals(url.searchParams.get("include"), "product_group");
});
