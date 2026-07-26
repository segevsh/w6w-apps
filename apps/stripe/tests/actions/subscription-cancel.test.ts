import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-cancel.ts";

Deno.test("subscription-cancel: at period end is a POST, and is reversible", async () => {
  const { ctx, calls } = mockCtx([{ body: { cancel_at_period_end: true } }]);
  await action.execute({ subscriptionId: "sub_1", atPeriodEnd: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.stripe.com/v1/subscriptions/sub_1");
  assertEquals(calls[0].body, "cancel_at_period_end=true");
});

Deno.test("subscription-cancel: immediate cancellation is a DELETE", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "canceled" } }]);
  await action.execute({ subscriptionId: "sub_1", atPeriodEnd: false }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.stripe.com/v1/subscriptions/sub_1");
});

Deno.test("subscription-cancel: defaults to the reversible path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ subscriptionId: "sub_1" }, ctx);
  assertEquals(calls[0].method, "POST");
});
