import { assert, assertEquals } from "@std/assert";
import purchaseCancelSubscription from "../../actions/purchase-cancel-subscription.ts";
import { doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("purchase-cancel-subscription: POSTs to the action route with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7", "purchases") }]);
  await purchaseCancelSubscription.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/purchases/7/cancel_subscription");
  assertEquals(calls[0].body, null);
});

Deno.test("purchase-cancel-subscription: an id with a slash is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await purchaseCancelSubscription.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/purchases/a%2Fb/cancel_subscription");
});

Deno.test("purchase-cancel-subscription: is idempotent", () => {
  assertEquals(purchaseCancelSubscription.idempotent, true);
});

/**
 * This reaches into Stripe/PayPal/Kajabi Payments and there is no undo in this
 * API, so the description has to say both things.
 */
Deno.test("purchase-cancel-subscription: states that it is irreversible", () => {
  const d = purchaseCancelSubscription.description!;
  assert(/not reversible|no undo/i.test(d));
});

/** It also deactivates the purchase, so a follow-up deactivate is redundant. */
Deno.test("purchase-cancel-subscription: states that it is the complete cancellation", () => {
  assert(purchaseCancelSubscription.description!.includes("complete cancellation"));
});
