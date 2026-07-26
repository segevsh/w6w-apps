import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: GETs /orders/{id}.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { order: { id: 9 } } }]);
  await action.execute({ orderId: 9 }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/orders/9.json");
});
