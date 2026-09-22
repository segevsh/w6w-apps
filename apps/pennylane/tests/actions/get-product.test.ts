import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-product.ts";

Deno.test("get-product: GETs /products/{id}", async () => {
  const product = { id: 1, label: "Product 1", price_before_tax: "12.5", vat_rate: "FR_200" };
  const { ctx, calls } = mockCtx([{ body: product }]);
  const res = await action.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/products/1");
  assertEquals(res, product);
});
