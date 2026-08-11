import { assert, assertEquals } from "@std/assert";
import orderProductList from "../../actions/order-product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-product-list: GETs the order's line items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 194, product_id: 77, quantity: 1 }] }]);
  const out = await orderProductList.execute({ orderId: 100, limit: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/orders/100/products");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.products.length, 1);
});

Deno.test("order-product-list: an empty 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await orderProductList.execute({ orderId: 1 }, ctx), { products: [] });
});

Deno.test("order-product-list: says the line `id` is NOT the catalog product id", () => {
  // Using product_id to build a shipment silently ships the wrong line.
  assert(orderProductList.description?.includes("order_product_id"), orderProductList.description);
});
