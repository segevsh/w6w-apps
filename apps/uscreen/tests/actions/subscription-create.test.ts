import { assertEquals, assertRejects } from "@std/assert";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-create: sends POST /customers/${seg(input.customerId)}/subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 4 } }]);
  const out = await subscriptionCreate.execute(
    { "customerId": "5", "productId": 8, "currency": "USD" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/subscription");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "product_id": 8, "currency": "USD" });
  assertEquals(out, { "id": 4 });
});

Deno.test("subscription-create: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      subscriptionCreate.execute(
        { "customerId": "5", "productId": 8, "currency": "USD" } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
