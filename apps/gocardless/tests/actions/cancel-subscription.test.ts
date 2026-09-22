import { assertEquals } from "@std/assert";
import cancelSubscription from "../../actions/cancel-subscription.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("cancel-subscription: POST …/actions/cancel with the empty envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscriptions", { id: "SB1", status: "cancelled" }) },
  ]);
  const out = await cancelSubscription.execute!({ subscriptionId: "SB1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/subscriptions/SB1/actions/cancel");
  assertEquals(JSON.parse(calls[0].body!), { subscriptions: {} });
  assertEquals((out as { status: string }).status, "cancelled");
});
