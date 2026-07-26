import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/order-close.ts";

Deno.test("order-close: closed:true POSTs /close.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { order: {} } }]);
  await action.execute({ orderId: 9, closed: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/orders/9/close.json");
});

Deno.test("order-close: closed:false POSTs /open.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { order: {} } }]);
  await action.execute({ orderId: 9, closed: false }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/orders/9/open.json");
});

Deno.test("order-close: is explicit that closing is not cancelling", () => {
  assert(action.description?.includes("Neither cancels nor refunds"));
});
