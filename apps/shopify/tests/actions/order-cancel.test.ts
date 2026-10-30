import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/order-cancel.ts";

test("order-cancel: POSTs /cancel.json with the reason and flags", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { order: {} } }]);
  await action.execute({ orderId: 9, reason: "customer", restock: true, email: false }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/orders/9/cancel.json");
  assertEquals(JSON.parse(calls[0].body!), { reason: "customer", email: false, restock: true });
});
