import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-get.ts";

Deno.test("subscription-get: GETs /subscriptions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1" } }]);
  await action.execute({ subscriptionId: "sub_1" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/subscriptions/sub_1");
});
