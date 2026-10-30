import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/subscription-get.ts";

test("subscription-get: retrieves a subscription by key", async () => {
  const { ctx, calls } = mockCtx([one({ id: "sub1", status: "Active" })], { display });
  const result = await action.execute!({ subscriptionKey: "S-00000001" }, ctx) as {
    subscription: { status: string };
  };
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/subscriptions/S-00000001");
  assertEquals(result.subscription.status, "Active");
});
