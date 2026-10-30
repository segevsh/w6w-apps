import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("product-get: fetches by id and unwraps the product", async () => {
  const product = { id: "OKMHM2X2OHYV", name: "Amazon.com" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { product } }]);
  const result = await productGet.execute({ id: "OKMHM2X2OHYV" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/products/OKMHM2X2OHYV");
  assertEquals(result, product);
});
