import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-account.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-account: maps identity, plan, usage, subscription and billing", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        user_id: 12345,
        name: "Jane",
        email: "j@x.com",
        current_plan: { id: 3, name: "Pro", quantity: 100000 },
        usage: [{ name: "Hourly Outbound Usage", quantity: 1000, used: 42, available: 958 }],
        subscription: { status: "active" },
        billing_information: { country_code: "US" },
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/account");
  assertEquals(out.userId, 12345);
  assertEquals(out.currentPlan, { id: 3, name: "Pro", quantity: 100000 });
  assertEquals(out.usage.length, 1);
  assertEquals(out.billingInformation, { country_code: "US" });
});

Deno.test("get-account: a 403 for a missing scope throws with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { message: "does not have the required scope" } },
  }]);
  await assertRejects(() => run(action, {}, ctx), Error, "required scope");
});
