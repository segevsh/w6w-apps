import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-order.ts";

Deno.test("update-order: PATCHes /v2/sites/{id}/orders/{orderId} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { orderId: "o1" } }]);
  await action.execute!(
    { siteId: "s1", orderId: "o1", shippingTracking: "1Z999", shippingProvider: "UPS" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v2/sites/s1/orders/o1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { shippingProvider: "UPS", shippingTracking: "1Z999" });
});
