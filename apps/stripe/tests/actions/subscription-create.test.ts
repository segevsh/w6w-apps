import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-create.ts";

Deno.test("subscription-create: encodes the price as items[0][price]", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1" } }]);
  await action.execute({ customerId: "cus_1", priceId: "price_1", quantity: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/subscriptions");
  assertEquals(
    calls[0].body,
    "customer=cus_1&items%5B0%5D%5Bprice%5D=price_1&items%5B0%5D%5Bquantity%5D=2",
  );
});

Deno.test("subscription-create: passes the trial through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "cus_1", priceId: "price_1", trialPeriodDays: 14 }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("trial_period_days"), "14");
});
