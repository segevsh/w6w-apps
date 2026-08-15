import { assertEquals } from "@std/assert";
import subscriptionResume from "../../actions/subscription-resume.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-resume: calls POST /resumeSubscription with order and subscription ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, subscription_id: "sub_1" } }]);
  const out = await subscriptionResume.execute({ orderId: "1", subscriptionId: "2" }, ctx) as {
    subscription_id: string;
  };
  assertEquals(pathOf(calls[0].url), "/api/external/resumeSubscription");
  assertEquals(formOf(calls[0]), { order_id: "1", subscription_id: "2" });
  assertEquals(out.subscription_id, "sub_1");
});
