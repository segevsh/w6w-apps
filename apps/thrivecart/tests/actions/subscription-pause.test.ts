import { assertEquals } from "@std/assert";
import subscriptionPause from "../../actions/subscription-pause.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-pause: calls POST /pauseSubscription with the optional auto_resume", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await subscriptionPause.execute(
    { orderId: "1", subscriptionId: "2", autoResume: 1700000000 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/external/pauseSubscription");
  assertEquals(formOf(calls[0]), {
    order_id: "1",
    subscription_id: "2",
    auto_resume: "1700000000",
  });
});

Deno.test("subscription-pause: auto_resume is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await subscriptionPause.execute({ orderId: "1", subscriptionId: "2" }, ctx);
  assertEquals(formOf(calls[0]), { order_id: "1", subscription_id: "2" });
});
