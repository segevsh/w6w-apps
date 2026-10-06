import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: sends GET /customers/${seg(input.customerId)}/subscription and returns the subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 4, "product_id": 8 } }]);
  const out = await subscriptionGet.execute({ "customerId": "a@b.co" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/a%40b.co/subscription");
  assertEquals(out, { active: true, subscription: { "id": 4, "product_id": 8 } });
});

Deno.test("subscription-get: 204 means no active subscription", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await subscriptionGet.execute({ "customerId": "a@b.co" } as never, ctx), {
    active: false,
    subscription: null,
  });
});
