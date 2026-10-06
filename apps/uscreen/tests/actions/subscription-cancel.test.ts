import { assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: sends DELETE /customers/${seg(input.customerId)}/subscription and returns the subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 4, "canceled_at": 1 } }]);
  const out = await subscriptionCancel.execute({ "customerId": "5" } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/subscription");
  assertEquals(out, { active: true, subscription: { "id": 4, "canceled_at": 1 } });
});

Deno.test("subscription-cancel: 204 means no active subscription", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await subscriptionCancel.execute({ "customerId": "5" } as never, ctx), {
    active: false,
    subscription: null,
  });
});
