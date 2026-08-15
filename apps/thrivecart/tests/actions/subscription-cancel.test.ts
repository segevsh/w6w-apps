import { assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: calls POST /cancelSubscription with order and subscription ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await subscriptionCancel.execute({ orderId: "851411", subscriptionId: "253" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/cancelSubscription");
  assertEquals(formOf(calls[0]), { order_id: "851411", subscription_id: "253" });
});

Deno.test("subscription-cancel: is idempotent", () => {
  assertEquals(subscriptionCancel.idempotent, true);
});
