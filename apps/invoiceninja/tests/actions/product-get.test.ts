import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/product-get.ts";

test("product-get: GETs /products/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "prod1" } }]);
  await action.execute({ productId: "prod1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/products/prod1");
});
