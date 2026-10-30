import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

test("product-create: POSTs /products with the product key", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "prod1" } }]);
  await action.execute({ productKey: "consulting", price: 150 }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/products");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.product_key, "consulting");
  assertEquals(body.price, 150);
});
